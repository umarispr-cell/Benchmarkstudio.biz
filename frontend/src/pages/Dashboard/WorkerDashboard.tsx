import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { workflowService, dashboardService } from '../../services';
import type { Order, WorkerDashboardData } from '../../types';
import { REJECTION_CODES } from '../../types';
import { AnimatedPage, PageHeader, StatCard, StatusBadge, Modal, Button, Select, Textarea } from '../../components/ui';
import { Play, Send, X, Clock, Target, Inbox, CheckCircle, History, BarChart3, TrendingUp, Loader2, ClipboardList, Pencil, Eye, Palette, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import DrawerWorkForm from '../../components/DrawerWorkForm';
import CheckerWorkForm from '../../components/CheckerWorkForm';

interface PerformanceStats {
  today_completed: number;
  week_completed: number;
  month_completed: number;
  daily_target: number;
  weekly_target: number;
  weekly_rate: number;
  avg_time_minutes: number;
  daily_stats: Array<{ date: string; day: string; count: number }>;
}

// Role-specific labels and icons
const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  drawer: { 
    label: 'Drawing Station', 
    icon: Pencil, 
    color: 'blue',
    description: 'Create floor plans following specifications'
  },
  checker: { 
    label: 'Checking Station', 
    icon: ClipboardList, 
    color: 'violet',
    description: 'Verify accuracy and document corrections'
  },
  qa: { 
    label: 'QA Station', 
    icon: Eye, 
    color: 'emerald',
    description: 'Final quality check against client standards'
  },
  designer: { 
    label: 'Design Station', 
    icon: Palette, 
    color: 'pink',
    description: 'Enhance photos per design specifications'
  },
};

export default function WorkerDashboard() {
  const user = useSelector((state: any) => state.auth.user);
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCode, setRejectCode] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [showHold, setShowHold] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  
  // Stats view state
  const [viewMode, setViewMode] = useState<'work' | 'done' | 'history' | 'stats'>('work');
  const [doneOrders, setDoneOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  
  // Auto-assignment state
  const [autoAssigning, setAutoAssigning] = useState(false);
  
  // Forms
  const [showDrawerForm, setShowDrawerForm] = useState(false);
  const [showCheckerForm, setShowCheckerForm] = useState(false);
  
  // Role helpers
  const roleConfig = ROLE_CONFIG[user?.role] || ROLE_CONFIG.drawer;
  const isDrawer = user?.role === 'drawer' || user?.role === 'designer';
  const isChecker = user?.role === 'checker';
  const isQA = user?.role === 'qa';

  const loadData = useCallback(async () => {
    try {
      const [dashRes, currentRes] = await Promise.all([
        dashboardService.worker(),
        workflowService.myCurrent(),
      ]);
      setData(dashRes.data);
      setCurrentOrder(currentRes.data.order);
      
      // Load completed orders and performance stats (no manual queue!)
      try {
        const [doneRes, perfRes] = await Promise.all([
          workflowService.getCompleted(),
          workflowService.getPerformance(),
        ]);
        setDoneOrders(doneRes.data.orders || []);
        setPerformanceStats(perfRes.data);
      } catch {
        // Endpoints may not exist yet
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (page: number = 1) => {
    try {
      const res = await workflowService.getHistory(page);
      setHistoryOrders(res.data.data || []);
      setHistoryPage(res.data.current_page);
      setHistoryLastPage(res.data.last_page);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, [loadData]);
  
  useEffect(() => {
    if (viewMode === 'history' && historyOrders.length === 0) {
      loadHistory(1);
    }
  }, [viewMode, loadHistory, historyOrders.length]);

  // Auto-assignment: Get next order from queue (no manual picking)
  const handleGetNextOrder = async () => {
    setAutoAssigning(true);
    try {
      const res = await workflowService.startNext();
      if (res.data.order) { 
        setCurrentOrder(res.data.order);
        // Open the appropriate work form immediately
        if (isDrawer) {
          setShowDrawerForm(true);
        } else if (isChecker) {
          setShowCheckerForm(true);
        }
        loadData();
      }
    } catch (e) { console.error(e); }
    finally { setAutoAssigning(false); }
  };

  const handleSubmit = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    try {
      await workflowService.submitWork(currentOrder.id, submitComment);
      setSubmitComment(''); setCurrentOrder(null); setShowDrawerForm(false); setShowCheckerForm(false); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!currentOrder || !rejectReason || !rejectCode) return;
    setSubmitting(true);
    try {
      await workflowService.rejectOrder(currentOrder.id, rejectReason, rejectCode, routeTo || undefined);
      setShowReject(false); setRejectReason(''); setRejectCode(''); setRouteTo('');
      setCurrentOrder(null); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleHold = async () => {
    if (!currentOrder || !holdReason) return;
    setSubmitting(true);
    try {
      await workflowService.holdOrder(currentOrder.id, holdReason);
      setShowHold(false); setHoldReason(''); setCurrentOrder(null); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const canReject = user?.role === 'checker' || user?.role === 'qa';
  const canHold = ['checker', 'qa', 'operations_manager'].includes(user?.role);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}</div>
      <div className="h-56 bg-slate-100 animate-pulse rounded-xl" />
    </div>
  );

  const progress = data?.daily_target ? Math.min(100, Math.round(((data?.today_completed ?? 0) / data.daily_target) * 100)) : 0;
  const RoleIcon = roleConfig.icon;

  // Role-specific instruction panels
  const renderRoleInstructions = () => {
    if (!currentOrder) return null;
    const metadata = (currentOrder.metadata || {}) as Record<string, string>;
    
    if (isDrawer) {
      // Drawer: Show ONLY drawing instructions and specifications per CEO requirements
      return (
        <div className="bg-brand-50/50 rounded-xl p-5 mb-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-600" /> Drawing Instructions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 font-medium">Template:</span>
              <span className="ml-2 text-slate-900">{metadata.template || 'Standard'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Plan Type:</span>
              <span className="ml-2 text-slate-900">{metadata.plan_type || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Wall Thickness:</span>
              <span className="ml-2 text-slate-900">{metadata.wall_thickness || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Structure:</span>
              <span className="ml-2 text-slate-900">{metadata.structure || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Dimensions:</span>
              <span className="ml-2 text-slate-900">{metadata.label_dimension || 'Imperial'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">North:</span>
              <span className="ml-2 text-slate-900">{metadata.north || '—'}</span>
            </div>
          </div>
          {metadata.instruction && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-brand-600 font-medium">Special Instructions:</span>
              <p className="mt-1 text-slate-900">{metadata.instruction}</p>
            </div>
          )}
        </div>
      );
    }
    
    if (isChecker) {
      // Checker: Show comparison data and error points per CEO requirements
      return (
        <div className="bg-brand-50/50 rounded-xl p-5 mb-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-brand-600" /> Comparison Data
          </h4>
          <div className="text-sm text-slate-600 mb-3">
            <p>Compare drawer's output against source data. Document any errors found.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Previous Stage</div>
              <div className="font-medium text-slate-900">Drawing</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">Check Required</div>
              <div className="font-medium text-slate-900">Full Verification</div>
            </div>
          </div>
          {currentOrder.rejection_reason && (
            <div className="mt-3 p-3 bg-rose-50 rounded-lg">
              <div className="text-xs font-medium text-rose-700 mb-1">Previous Error:</div>
              <p className="text-sm text-rose-600">{currentOrder.rejection_reason}</p>
            </div>
          )}
        </div>
      );
    }
    
    if (isQA) {
      // QA: Show final checklists and client standards per CEO requirements
      return (
        <div className="bg-brand-50/50 rounded-xl p-5 mb-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand-600" /> QA Checklist
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-brand-500" /> Verify all specifications match client standards
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-brand-500" /> Check dimensions and measurements
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-brand-500" /> Validate file format and quality
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-brand-500" /> Confirm all corrections from previous stages applied
            </div>
          </div>
          {metadata.client_standards && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-brand-600 font-medium">Client Standards:</span>
              <p className="mt-1 text-slate-900">{metadata.client_standards}</p>
            </div>
          )}
        </div>
      );
    }
    
    // Designer: Show design-specific content
    return (
      <div className="bg-brand-50/50 rounded-xl p-5 mb-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4 text-brand-600" /> Design Specifications
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 font-medium">Enhancement Type:</span>
            <span className="ml-2 text-slate-900">{metadata.enhancement_type || 'Standard'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Style:</span>
            <span className="ml-2 text-slate-900">{metadata.style || '—'}</span>
          </div>
        </div>
        {metadata.design_notes && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-brand-600 font-medium">Design Notes:</span>
            <p className="mt-1 text-slate-900">{metadata.design_notes}</p>
          </div>
        )}
      </div>
    );
  };

  // UNIFIED AUTO-ASSIGNMENT VIEW - No manual order picking per CEO requirements
  return (
    <AnimatedPage>
      <PageHeader
        title={roleConfig.label}
        subtitle={`${user?.project?.name || ''} ${roleConfig.description ? `· ${roleConfig.description}` : ''}`}
        badge={
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
            <RoleIcon className="h-3.5 w-3.5" /> {user?.role?.replace('_', ' ').toUpperCase()}
          </span>
        }
      />

      {/* View Mode Tabs - No Queue tab (auto-assignment only) */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('work')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'work'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <RoleIcon className="h-4 w-4" />
          Work Area
        </button>
        <button
          onClick={() => setViewMode('done')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'done'
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          Done ({doneOrders.length})
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'history'
              ? 'bg-brand-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          History
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'stats'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          My Stats
        </button>
      </div>

      {/* Performance Stats View */}
      {viewMode === 'stats' && performanceStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Today" value={performanceStats.today_completed} icon={Target} color="green" />
            <StatCard label="This Week" value={performanceStats.week_completed} icon={TrendingUp} color="blue" />
            <StatCard label="This Month" value={performanceStats.month_completed} icon={BarChart3} color="brand" />
            <StatCard label="Avg Time" value={`${performanceStats.avg_time_minutes}m`} icon={Clock} color="amber" />
          </div>
          <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Weekly Progress</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Target: {performanceStats.weekly_target}</span>
                  <span className="font-medium text-slate-900">{performanceStats.weekly_rate}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, performanceStats.weekly_rate)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${performanceStats.weekly_rate >= 100 ? 'bg-brand-500' : performanceStats.weekly_rate >= 80 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Last 7 Days</h3>
            <div className="flex items-end justify-between gap-2 h-32">
              {performanceStats.daily_stats.map((day, i) => {
                const maxCount = Math.max(...performanceStats.daily_stats.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-slate-700">{day.count}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="w-full bg-blue-500 rounded-t-md min-h-[4px]"
                    />
                    <span className="text-xs text-slate-500">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Done Orders View */}
      {viewMode === 'done' && (
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Completed Today</h3>
            <p className="text-xs text-slate-400 mt-0.5">Orders you completed today</p>
          </div>
          {doneOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-700 mb-1">No completed orders today</h3>
              <p className="text-sm text-slate-400">Complete orders to see them here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {doneOrders.map((order) => {
                const metadata = (order.metadata || {}) as Record<string, string>;
                return (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{order.order_number}</div>
                      <div className="text-xs text-slate-500">{metadata.address || order.client_reference || '—'}</div>
                    </div>
                    <StatusBadge status="DELIVERED" size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Order History</h3>
            <p className="text-xs text-slate-400 mt-0.5">All orders you have worked on</p>
          </div>
          {historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <History className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-700 mb-1">No order history yet</h3>
              <p className="text-sm text-slate-400">Complete orders to build your history</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyOrders.map((order) => {
                const metadata = (order.metadata || {}) as Record<string, string>;
                return (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{order.order_number}</div>
                      <div className="text-xs text-slate-500">{metadata.address || order.client_reference || '—'}</div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {historyLastPage > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">Page {historyPage} of {historyLastPage}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={historyPage === 1} onClick={() => loadHistory(historyPage - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={historyPage === historyLastPage} onClick={() => loadHistory(historyPage + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Work Area - Main auto-assignment view */}
      {viewMode === 'work' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Completed Today" value={data?.today_completed ?? 0} icon={Target} color="green" />
            <StatCard label="Daily Target" value={data?.daily_target ?? 0} icon={Target} color="blue" />
            <StatCard label="Queue Size" value={data?.queue_count ?? 0} icon={Inbox} color="amber" />
            <StatCard label="Progress" value={`${progress}%`} icon={Target} color="brand">
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-brand-500 rounded-full"
                />
              </div>
            </StatCard>
          </div>

          {/* Current Order or Get Next */}
          {currentOrder ? (
            <>
              {/* Role-specific instructions panel */}
              {renderRoleInstructions()}
              
              {/* Current Order Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Current Order</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Complete this before getting a new one</p>
                  </div>
                  <StatusBadge status={currentOrder.workflow_state} />
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Order #</div>
                      <div className="text-sm font-semibold text-slate-900">{currentOrder.order_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Priority</div>
                      <StatusBadge status={currentOrder.priority} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Client Ref</div>
                      <div className="text-sm font-medium text-slate-700">{currentOrder.client_reference || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Due</div>
                      <div className="text-sm font-medium text-slate-700">{currentOrder.due_date ? new Date(currentOrder.due_date).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>

                  {/* Open work form button */}
                  <div className="flex items-center gap-2">
                    {isDrawer && (
                      <Button onClick={() => setShowDrawerForm(true)} icon={<Pencil className="h-4 w-4" />}>
                        Open Work Form
                      </Button>
                    )}
                    {isChecker && (
                      <Button onClick={() => setShowCheckerForm(true)} icon={<ClipboardList className="h-4 w-4" />} className="bg-brand-500 hover:bg-brand-600">
                        Open Check Form
                      </Button>
                    )}
                    {isQA && (
                      <Button onClick={handleSubmit} loading={submitting} icon={<Send className="h-4 w-4" />} className="bg-brand-500 hover:bg-brand-600">
                        Approve & Deliver
                      </Button>
                    )}
                    {canReject && (
                      <Button variant="danger" onClick={() => setShowReject(true)} icon={<X className="h-4 w-4" />}>
                        Reject
                      </Button>
                    )}
                    {canHold && (
                      <Button variant="secondary" onClick={() => setShowHold(true)} icon={<Clock className="h-4 w-4" />}>
                        Hold
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl ring-1 ring-black/[0.04] flex flex-col items-center justify-center py-16"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                {autoAssigning ? (
                  <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
                ) : (
                  <RoleIcon className="h-6 w-6 text-brand-500" />
                )}
              </div>
              <h3 className="text-[15px] font-semibold text-slate-700 mb-1">Ready for next order</h3>
              <p className="text-sm text-slate-400 mb-5">System will assign the next order from your queue</p>
              <Button 
                size="lg" 
                onClick={handleGetNextOrder} 
                loading={autoAssigning} 
                icon={<Play className="h-4 w-4" />}
                className="bg-brand-500 hover:bg-brand-600"
                disabled={data?.queue_count === 0}
              >
                {data?.queue_count === 0 ? 'Queue Empty' : 'Get Next Order'}
              </Button>
              {data?.queue_count === 0 && (
                <p className="text-xs text-slate-400 mt-3">No orders available in your queue right now</p>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Drawer Work Form Modal */}
      {currentOrder && showDrawerForm && (
        <DrawerWorkForm
          order={currentOrder}
          onClose={() => setShowDrawerForm(false)}
          onComplete={() => {
            setShowDrawerForm(false);
            setCurrentOrder(null);
            loadData();
          }}
        />
      )}

      {/* Checker Work Form Modal */}
      {currentOrder && showCheckerForm && (
        <CheckerWorkForm
          order={currentOrder}
          onClose={() => setShowCheckerForm(false)}
          onComplete={() => {
            setShowCheckerForm(false);
            setCurrentOrder(null);
            loadData();
          }}
        />
      )}

      {/* Reject Modal */}
      <Modal 
        open={showReject} 
        onClose={() => setShowReject(false)} 
        title="Reject Order" 
        subtitle="Document the issue and route back for corrections"
        variant="danger"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReject(false)} className="flex-1">Cancel</Button>
            <Button 
              variant="danger" 
              onClick={handleReject} 
              loading={submitting} 
              disabled={!rejectCode || !rejectReason || rejectReason.length < 10}
              className="flex-1"
            >
              Reject & Route Back
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            id="reject-code-select"
            label="Rejection Code"
            required
            value={rejectCode}
            onChange={e => setRejectCode(e.target.value)}
            error={rejectCode === '' && rejectReason ? 'Please select a rejection code' : undefined}
          >
            <option value="">Select reason code...</option>
            {REJECTION_CODES.map(c => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </Select>

          <Textarea
            id="reject-details"
            label="Issue Details"
            required
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Describe the issue in detail (minimum 10 characters)..."
            rows={4}
            showCharCount
            maxLength={500}
            currentLength={rejectReason.length}
            error={rejectReason.length > 0 && rejectReason.length < 10 ? 'Please provide at least 10 characters' : undefined}
            hint="Be specific about what needs to be fixed"
          />

          {user?.role === 'qa' && (
            <Select
              id="route-to-select"
              label="Route to"
              value={routeTo}
              onChange={e => setRouteTo(e.target.value)}
              hint="Leave as Auto to route to the previous stage"
            >
              <option value="">Auto (previous stage)</option>
              <option value="draw">Drawing Stage</option>
              <option value="check">Checking Stage</option>
            </Select>
          )}
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal 
        open={showHold} 
        onClose={() => setShowHold(false)} 
        title="Put Order On Hold" 
        subtitle="Temporarily pause this order until issues are resolved"
        variant="warning"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowHold(false)} className="flex-1">Cancel</Button>
            <Button 
              onClick={handleHold} 
              loading={submitting} 
              disabled={!holdReason || holdReason.length < 10}
              className="flex-1 bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500/30"
            >
              Confirm Hold
            </Button>
          </>
        }
      >
        <Textarea
          id="hold-reason"
          label="Reason for Hold"
          required
          value={holdReason}
          onChange={e => setHoldReason(e.target.value)}
          placeholder="Explain why this order needs to be held (minimum 10 characters)..."
          rows={4}
          showCharCount
          maxLength={300}
          currentLength={holdReason.length}
          error={holdReason.length > 0 && holdReason.length < 10 ? 'Please provide at least 10 characters' : undefined}
          hint="This will pause the order and notify supervisors"
        />
      </Modal>
    </AnimatedPage>
  );
}
