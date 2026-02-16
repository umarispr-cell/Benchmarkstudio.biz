import { useEffect, useState } from 'react';

import { workflowService, projectService, dashboardService } from '../../services';
import type { Order, User } from '../../types';
import { AnimatedPage, PageHeader, StatusBadge, Modal, Button, DataTable, Textarea } from '../../components/ui';
import WorkerSidebar from '../../components/WorkerSidebar';
import ChecklistModal from '../../components/ChecklistModal';
import { Users, RefreshCw, RotateCcw, Info, FileCheck, Eye, Calendar, Pencil, CheckSquare, Palette } from 'lucide-react';

export default function SupervisorAssignment() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showReassign, setShowReassign] = useState<Order | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  
  // New state for enhanced features
  const [workers, setWorkers] = useState<User[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [showChecklist, setShowChecklist] = useState<Order | null>(null);
  const [roleStats, setRoleStats] = useState<any>(null);
  const [dateStats, setDateStats] = useState<any[]>([]);
  const [showWorkerSidebar, setShowWorkerSidebar] = useState(true);
  const [showStatsSidebar, setShowStatsSidebar] = useState(true);

  useEffect(() => {
    projectService.list().then(res => {
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadOrders();
      loadDashboardData();
    }
  }, [selectedProject]);

  const loadOrders = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await workflowService.projectOrders(selectedProject);
      const d = res.data?.data || res.data;
      setOrders(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDashboardData = async () => {
    try {
      const res = await dashboardService.operations();
      if (res.data) {
        // Extract workers from dashboard data
        const workerData = (res.data.workers || []).map((w: any) => ({
          ...w,
          country: '',
          department: '',
          project_id: selectedProject,
          team_id: null,
          layer: null,
          inactive_days: 0,
          daily_target: 0,
          shift_start: null,
          shift_end: null,
        }));
        setWorkers(workerData);
        setRoleStats(res.data.role_stats || null);
        setDateStats(res.data.date_stats || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleReassign = async () => {
    if (!showReassign || reassignReason.length < 3) return;
    try {
      setReassigning(true);
      await workflowService.reassignOrder(showReassign.id, null, reassignReason);
      setShowReassign(null); setReassignReason('');
      loadOrders();
    } catch (e) { console.error(e); }
    finally { setReassigning(false); }
  };

  const handleChecklistComplete = () => {
    setShowChecklist(null);
    loadOrders();
  };

  // Filter orders by selected worker
  const filteredOrders = selectedWorker 
    ? orders.filter(o => o.assigned_to === selectedWorker)
    : orders;

  const assigned = orders.filter(o => o.assigned_to !== null).length;
  const unassigned = orders.filter(o => o.assigned_to === null).length;
  const inProgress = orders.filter(o => o.workflow_state.startsWith('IN_')).length;

  const roleIcons: Record<string, any> = {
    drawer: Pencil,
    checker: CheckSquare,
    qa: Eye,
    designer: Palette,
  };

  return (
    <AnimatedPage>
      <div className="flex gap-4">
        {/* Left Sidebar - Workers */}
        {showWorkerSidebar && (
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4">
              <WorkerSidebar
                workers={workers}
                selectedWorker={selectedWorker}
                onSelectWorker={setSelectedWorker}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Main Content - Orders Table */}
        <div className="flex-1 min-w-0">
          <PageHeader title="Assignment Dashboard" subtitle="Monitor and manage order assignments"
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWorkerSidebar(!showWorkerSidebar)}
                  className={`lg:hidden p-2 rounded-lg transition-colors ${showWorkerSidebar ? 'bg-[#2AA7A0] text-white' : 'bg-slate-100 text-slate-600'}`}
                  title="Toggle workers"
                  aria-label="Toggle workers sidebar"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowStatsSidebar(!showStatsSidebar)}
                  className={`p-2 rounded-lg transition-colors ${showStatsSidebar ? 'bg-[#2AA7A0] text-white' : 'bg-slate-100 text-slate-600'}`}
                  title="Toggle statistics"
                  aria-label="Toggle statistics sidebar"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <Button variant="secondary" icon={RefreshCw} onClick={() => { loadOrders(); loadDashboardData(); }}>Refresh</Button>
              </div>
            }
          />

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Auto-assignment is active</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Orders are automatically assigned based on WIP capacity. Click on any order to view/edit checklist.
                {selectedWorker && <span className="font-medium"> Showing orders for selected worker only.</span>}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-slate-200/60 p-3">
              <div className="text-xl font-bold text-slate-900">{orders.length}</div>
              <div className="text-xs text-slate-500">Total Orders</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3">
              <div className="text-xl font-bold text-brand-600">{assigned}</div>
              <div className="text-xs text-slate-500">Assigned</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3">
              <div className="text-xl font-bold text-amber-600">{unassigned}</div>
              <div className="text-xs text-slate-500">Unassigned</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3">
              <div className="text-xl font-bold text-blue-600">{inProgress}</div>
              <div className="text-xs text-slate-500">In Progress</div>
            </div>
          </div>

          {/* Project selector */}
          {projects.length > 1 && (
            <div className="mb-4">
              <select 
                value={selectedProject || ''} 
                onChange={e => setSelectedProject(Number(e.target.value))} 
                className="select text-sm"
                title="Select project"
                aria-label="Select project"
              >
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Orders Table - Enhanced columns matching old system */}
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <DataTable
              data={filteredOrders} loading={loading}
              columns={[
                { key: 'received_at', label: 'Date', sortable: true, render: (o) => (
                  <div className="text-xs text-slate-600">
                    {new Date(o.received_at || o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                )},
                { key: 'order_number', label: 'Order', sortable: true, render: (o) => (
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{o.order_number}</div>
                  </div>
                )},
                { key: 'client_reference', label: 'Client / Address', render: (o) => (
                  <div className="max-w-[200px]">
                    <div className="text-sm text-slate-700 truncate">{o.client_reference || '—'}</div>
                    <div className="text-xs text-slate-400 truncate">{(o.metadata as any)?.address || '—'}</div>
                  </div>
                )},
                { key: 'priority', label: 'Priority', render: (o) => <StatusBadge status={o.priority} size="xs" /> },
                { key: 'workflow_state', label: 'Status', render: (o) => <StatusBadge status={o.workflow_state} size="xs" /> },
                { key: 'assigned', label: 'Assigned To', render: (o) => (
                  o.assignedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#2AA7A0] flex items-center justify-center text-white text-xs font-bold">{o.assignedUser.name.charAt(0)}</div>
                      <span className="text-xs text-slate-700">{o.assignedUser.name}</span>
                    </div>
                  ) : <span className="text-xs text-amber-500 font-medium">Unassigned</span>
                )},
                { key: 'actions', label: 'Actions', render: (o) => (
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="xs" 
                      onClick={() => setShowChecklist(o)}
                      title="View Checklist"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-brand-600" />
                    </Button>
                    {o.assigned_to && (
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => { setShowReassign(o); setReassignReason(''); }}
                        title="Reassign"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    )}
                  </div>
                )},
              ]}
              emptyIcon={Users}
              emptyTitle="No orders"
              emptyDescription={selectedWorker ? "No orders assigned to this worker." : "No orders in this project."}
            />
          </div>
        </div>

        {/* Right Sidebar - Statistics */}
        {showStatsSidebar && (
          <div className="w-64 flex-shrink-0 hidden xl:block">
            <div className="sticky top-4 space-y-4">
              {/* Role-wise Stats */}
              {roleStats && (
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" /> Today's Progress
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(roleStats).map(([role, stats]: [string, any]) => {
                      const Icon = roleIcons[role] || Users;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600 capitalize">{role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brand-600">{stats.today_completed}</span>
                            <span className="text-xs text-slate-400">done</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date-wise Stats */}
              {dateStats.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" /> Last 7 Days
                  </h3>
                  <div className="space-y-2">
                    {dateStats.slice(-5).reverse().map((day) => (
                      <div key={day.date} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <div className="text-xs text-slate-500">{day.label} {day.date.slice(5)}</div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-brand-600 font-medium">{day.delivered}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-blue-600">{day.received}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Delivered / Received</span>
                  </div>

                  {/* Role breakdown for last day */}
                  {dateStats.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs font-medium text-slate-500 mb-2">Today by Role</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(dateStats[dateStats.length - 1]?.by_role || {}).map(([role, count]) => (
                          <div key={role} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 capitalize">{role}</span>
                            <span className="font-semibold text-slate-700">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      <Modal 
        open={!!showReassign} 
        onClose={() => setShowReassign(null)} 
        title="Re-queue Order" 
        subtitle={`Unassign from ${showReassign?.assignedUser?.name} and return to queue`}
        variant="warning"
        size="md"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowReassign(null)}>Cancel</Button>
            <Button 
              className="flex-1 bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500/30" 
              onClick={handleReassign} 
              loading={reassigning} 
              disabled={reassignReason.length < 3}
            >
              Confirm Re-queue
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
            <p className="text-sm text-amber-800">
              Order <span className="font-bold">{showReassign?.order_number}</span> will be unassigned and automatically reassigned to the next available worker.
            </p>
          </div>

          <Textarea
            id="reassign-reason"
            label="Reason for Reassignment"
            required
            value={reassignReason}
            onChange={e => setReassignReason(e.target.value)}
            placeholder="Explain why this order needs to be reassigned (minimum 3 characters)..."
            rows={4}
            showCharCount
            maxLength={300}
            currentLength={reassignReason.length}
            error={reassignReason.length > 0 && reassignReason.length < 3 ? 'Please provide at least 3 characters' : undefined}
            hint="This will be logged for audit purposes"
          />
        </div>
      </Modal>

      {/* Checklist Modal */}
      {showChecklist && (
        <ChecklistModal
          orderId={showChecklist.id}
          orderNumber={showChecklist.order_number}
          onComplete={handleChecklistComplete}
          onClose={() => setShowChecklist(null)}
        />
      )}
    </AnimatedPage>
  );
}
