import { useEffect, useState, useCallback, useMemo } from 'react';
import { dashboardService, workflowService } from '../../services';
import { useSmartPolling } from '../../hooks/useSmartPolling';
import { useNewOrderHighlight } from '../../hooks/useNewOrderHighlight';
import type { AssignmentWorker, AssignmentOrder, AssignmentDateStat, AssignmentRoleCompletion, QueueInfo } from '../../types';
import { AnimatedPage, Modal, Button, Textarea, useToast } from '../../components/ui';
import ChecklistModal from '../../components/ChecklistModal';
import {
  Users, RefreshCw, Info, Search, Clock, AlertTriangle,
  Loader2, X, BarChart3, PanelLeftClose, PanelLeftOpen,
  Pencil, CheckSquare, Eye, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClockDisplay from '../../components/ClockDisplay';

export default function SupervisorAssignment() {
  const { toast } = useToast();

  /* ── Project Time clock ── */
  const [projectTz, setProjectTz] = useState('Australia/Sydney');

  /* ── queues / selection ── */
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ── data from assignment dashboard ── */
  const [workers, setWorkers] = useState<Record<string, AssignmentWorker[]>>({});
  const [orders, setOrders] = useState<AssignmentOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [counts, setCounts] = useState({ today_total: 0, pending: 0, completed: 0, amends: 0, assigned: 0, unassigned: 0 });
  const [dateStats, setDateStats] = useState<AssignmentDateStat[]>([]);
  const [roleCompletions, setRoleCompletions] = useState<Record<string, AssignmentRoleCompletion>>({});
  const [, setQueueInfo] = useState<QueueInfo | null>(null);
  const [projectLabel, setProjectLabel] = useState('');

  /* ── filters ── */
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [workerRoleFilter, setWorkerRoleFilter] = useState<string | null>(null);

  /* ── UI toggles ── */
  const [statsOpen, setStatsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workerSearch, setWorkerSearch] = useState('');

  /* ── modals ── */
  const [showReassign, setShowReassign] = useState<AssignmentOrder | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [showChecklist, setShowChecklist] = useState<AssignmentOrder | null>(null);

  /* ── Highlight newly arrived orders ── */
  const highlightedIds = useNewOrderHighlight(orders);

  /* ── Load queue list on mount ── */
  useEffect(() => {
    dashboardService.queues().then(res => {
      const list = res.data?.queues ?? [];
      setQueues(list);
      if (list.length > 0) setSelectedQueue(list[0].queue_name);
    }).catch(() => {});
  }, []);

  /* ── Main data loader ── */
  const loadData = useCallback(async (_page = 1, isRefresh = false) => {
    if (!selectedQueue) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const params: any = { per_page: 10000 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      if (dateFilter) params.date = dateFilter;
      if (selectedWorker) params.assigned_to = selectedWorker;
      const res = await dashboardService.assignmentDashboard(selectedQueue, params);
      const d = res.data;
      setWorkers(d.workers || {});
      setOrders(d.orders?.data ?? []);
      setTotalOrders(d.orders?.total ?? 0);
      setCounts(d.counts || { today_total: 0, pending: 0, completed: 0, amends: 0, assigned: 0, unassigned: 0 });
      setDateStats(d.date_stats || []);
      setRoleCompletions(d.role_completions || {});
      setQueueInfo(d.queue || null);
      setProjectLabel(d.project ? `${d.project.name} (${d.project.country})` : '');
      if ((d.project as any)?.timezone) setProjectTz((d.project as any).timezone);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedQueue, statusFilter, searchQuery, dateFilter, selectedWorker]);

  useEffect(() => { loadData(1); }, [loadData]);

  /* ── Smart Polling: auto-refresh when data changes ── */
  useSmartPolling({
    scope: 'orders',
    interval: 10_000,
    onDataChanged: () => loadData(1, true),
    enabled: !!selectedQueue,
  });

  const handleReassign = async () => {
    if (!showReassign || reassignReason.length < 3) return;
    try {
      setReassigning(true);
      await workflowService.reassignOrder(showReassign.id, null, reassignReason, showReassign.project_id);
      setShowReassign(null); setReassignReason('');
      loadData(1, true);
    } catch (e) { console.error(e); }
    finally { setReassigning(false); }
  };

  /* ── Derived data ── */
  const allWorkers = useMemo(() => Object.values(workers).flat(), [workers]);
  const filteredWorkers = useMemo(() => workerRoleFilter ? (workers[workerRoleFilter] || []) : allWorkers, [workers, workerRoleFilter, allWorkers]);
  const onlineCount = useMemo(() => allWorkers.filter(w => w.is_online && !w.is_absent).length, [allWorkers]);
  const absentCount = useMemo(() => allWorkers.filter(w => w.is_absent).length, [allWorkers]);
  const wipCount = useMemo(() => allWorkers.reduce((s, w) => s + w.wip_count, 0), [allWorkers]);
  const doneToday = useMemo(() => allWorkers.reduce((s, w) => s + w.today_completed, 0), [allWorkers]);
  const searchedWorkers = useMemo(() => {
    if (!workerSearch) return filteredWorkers;
    const q = workerSearch.toLowerCase();
    return filteredWorkers.filter(w => w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q) || String(w.id).includes(q));
  }, [filteredWorkers, workerSearch]);

  /* ── Sort orders by priority (rush/urgent → high → normal/low) ── */
  const priorityWeight: Record<string, number> = { rush: 0, urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedOrders = useMemo(() =>
    [...orders].sort((a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2)),
    [orders]);

  const roleIcons: Record<string, any> = { drawer: Pencil, checker: CheckSquare, qa: Eye, amender: ShieldCheck };
  const statusButtons = [
    { key: 'all', label: 'All', count: counts.today_total },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'unassigned', label: 'Unassigned', count: counts.unassigned },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'amends', label: 'Amends', count: counts.amends },
  ];

  // fmtTime kept for future use
  // const fmtTime = (t: string | null) => { if (!t) return '—'; const d = new Date(t); return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };

  /* ── Countdown tick (every 30s) ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  /** Parse due_in "MM/DD/YYYY HH:MM:SS" or ISO → ms remaining.
   *  due_in is in PK time; remaining = due_in − current PK time.
   *  Fallback: if due_in is empty, use received_at + 24h as default deadline. */
  const parseDueIn = (raw: string | null, receivedAt?: string | null): number | null => {
    const getPkNow = () => {
      const pkStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
      return new Date(pkStr).getTime();
    };
    if (raw) {
      let d = new Date(raw);
      if (isNaN(d.getTime())) {
        const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
        if (m) d = new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]);
      }
      if (!isNaN(d.getTime())) return d.getTime() - getPkNow();
    }
    // Fallback: received_at + 24 hours
    if (receivedAt) {
      const rd = new Date(receivedAt);
      if (!isNaN(rd.getTime())) return (rd.getTime() + 24 * 3600_000) - getPkNow();
    }
    return null;
  };

  /** Render remaining time badge with colour coding */
  const RemainingBadge = ({ dueIn, receivedAt }: { dueIn: string | null; receivedAt?: string | null }) => {
    const ms = parseDueIn(dueIn, receivedAt);
    if (ms === null) return <span className="text-slate-300">—</span>;
    const totalMin = Math.floor(ms / 60000);
    const overdue = totalMin < 0;
    const absTotalMin = Math.abs(totalMin);
    const hrs = Math.floor(absTotalMin / 60);
    const mins = absTotalMin % 60;
    const label = overdue
      ? (hrs > 0 ? `-${hrs}h ${mins}m` : `-${mins}m`)
      : (hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    const cls = overdue
      ? 'bg-red-100 text-red-700'
      : hrs < 1
        ? 'bg-orange-100 text-orange-700'
        : hrs < 4
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-green-100 text-green-700';
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>
        <Clock className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  };

  /* ── Inline assign dropdown state ── */
  const [assignDropdown, setAssignDropdown] = useState<{ orderId: number; role: 'drawer' | 'checker' | 'qa'; anchorRect?: DOMRect } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  const assignableWorkers = useMemo(() => {
    if (!assignDropdown) return [];
    const role = assignDropdown.role;
    const list = workers[role] || [];
    if (!assignSearch) return list;
    const q = assignSearch.toLowerCase();
    return list.filter(w => w.name.toLowerCase().includes(q) || String(w.id).includes(q));
  }, [assignDropdown, workers, assignSearch]);

  const handleAssignRole = async (orderId: number, role: string, userId: number) => {
    try {
      setAssigning(true);
      // Find the worker being assigned for optimistic update
      const worker = allWorkers.find(w => w.id === userId);
      // Find the order's project_id to avoid cross-project ID collision
      const orderProjectId = orders.find(o => o.id === orderId)?.project_id;
      const res = await workflowService.assignRole(orderId, role, userId, orderProjectId);
      setAssignDropdown(null);
      setAssignSearch('');

      // Optimistic update: immediately show the assigned name in the table
      if (worker) {
        const roleColMap: Record<string, string> = { drawer: 'drawer_name', checker: 'checker_name', qa: 'qa_name' };
        const roleIdMap: Record<string, string> = { drawer: 'drawer_id', checker: 'checker_id', qa: 'qa_id' };
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [roleColMap[role]]: worker.name, [roleIdMap[role]]: worker.id } : o));
      }

      toast({ type: 'success', title: 'Assigned', description: res.data?.message || `${role} assigned successfully` });
      // Also refresh from server to ensure consistency
      loadData(1, true);
    } catch (e: any) {
      console.error(e);
      toast({ type: 'error', title: 'Assignment Failed', description: e?.response?.data?.message || 'Could not assign role' });
    } finally { setAssigning(false); }
  };

  const openAssignDropdown = (e: React.MouseEvent, orderId: number, role: 'drawer' | 'checker' | 'qa') => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAssignDropdown({ orderId, role, anchorRect: rect });
    setAssignSearch('');
  };

  /* ── Duration formatter for role time ── */
  const fmtDuration = (startTime: string | null, endTime: string | null): string | null => {
    if (!startTime) return null;
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const diffMin = Math.floor((end - start) / 60000);
    if (diffMin < 1) return '< 1m';
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  /* ── Reusable cell renderer for role columns ── */
  const RoleCell = ({ order, role, name, userId: _userId, done, color, startTime, endTime }: { order: AssignmentOrder; role: 'drawer' | 'checker' | 'qa'; name: string | null; userId?: number | null; done: string | null; color: string; startTime?: string | null; endTime?: string | null }) => {
    const duration = fmtDuration(startTime || null, endTime || null);
    const isDone = done === 'yes';
    return (
      <td className="px-3 py-2">
        <button onClick={(e) => { if (!isDone) openAssignDropdown(e, order.id, role); }}
          className={`flex flex-col group rounded px-1 -mx-1 py-0.5 transition-colors w-full text-left ${
            isDone ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-slate-50'
          }`}
          title={isDone ? `${role} completed — cannot reassign` : name ? `Click to change ${role}` : `Assign ${role}`}>
          <div className="flex items-center gap-1">
            {name ? (
              <>
                <div className={`w-5 h-5 rounded-full ${isDone ? 'bg-green-500' : color} text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>{isDone ? '✓' : name.charAt(0)}</div>
                <span className={`truncate max-w-[90px] ${isDone ? 'text-green-700 font-medium' : 'text-slate-700'}`}>{name}</span>
                {isDone && <span className="text-green-500 text-[10px] font-bold ml-0.5">✓</span>}
              </>
            ) : (
              <span className="text-slate-300 group-hover:text-brand-500 text-xs">— assign</span>
            )}
          </div>
          {duration && (
            <div className="text-[10px] text-slate-400 ml-6 mt-0.5 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{duration}
            </div>
          )}
        </button>
      </td>
    );
  };

  return (
    <AnimatedPage>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* ══════ LEFT SIDEBAR — Workers (Old Card Design) ══════ */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden hidden lg:block"
            >
              <div className="w-[300px] h-full bg-white rounded-xl ring-1 ring-black/[0.04] flex flex-col mr-4">
                {/* Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-[#2AA7A0]" />
                    <h3 className="font-semibold text-slate-900">Team Members</h3>
                    <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{allWorkers.length}</span>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{onlineCount}</div>
                      <div className="text-[10px] text-green-600">Online</div>
                    </div>
                    <div className="text-center p-2 bg-rose-50 rounded-lg">
                      <div className="text-lg font-bold text-rose-600">{absentCount}</div>
                      <div className="text-[10px] text-rose-600">Absent</div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg">
                      <div className="text-lg font-bold text-amber-600">{wipCount}</div>
                      <div className="text-[10px] text-amber-600">WIP</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{doneToday}</div>
                      <div className="text-[10px] text-blue-600">Done</div>
                    </div>
                  </div>

                  {/* Role Filter Pills */}
                  <div className="flex gap-1 flex-wrap mb-2">
                    <button onClick={() => { setWorkerRoleFilter(null); setSelectedWorker(null); }}
                      className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${!workerRoleFilter ? 'bg-[#2AA7A0] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      All
                    </button>
                    {Object.keys(workers).map(role => (
                      <button key={role} onClick={() => { setWorkerRoleFilter(role); setSelectedWorker(null); }}
                        className={`px-2 py-1 text-xs rounded-md whitespace-nowrap capitalize transition-colors ${workerRoleFilter === role ? 'bg-[#2AA7A0] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {role}s ({(workers[role] || []).length})
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)}
                      placeholder="Search workers..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2AA7A0]/20 focus:border-[#2AA7A0]" />
                  </div>
                </div>

                {/* Workers List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {searchedWorkers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No workers found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchedWorkers.map(w => (
                        <button key={w.id} onClick={() => setSelectedWorker(selectedWorker === w.id ? null : w.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                            selectedWorker === w.id ? 'bg-[#2AA7A0]/10 border border-[#2AA7A0]/30' : 'hover:bg-slate-50 border border-transparent'
                          }`}>
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                              w.is_absent ? 'bg-slate-400' : 'bg-[#2AA7A0]'
                            }`}>
                              {w.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              w.is_absent ? 'bg-rose-500' : w.is_online ? 'bg-green-500' : 'bg-amber-500'
                            }`} />
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium text-sm truncate ${w.is_absent ? 'text-slate-400' : 'text-slate-900'}`}>#{w.id} – {w.name}</span>
                              {w.is_absent && <AlertTriangle className="h-3 w-3 text-rose-500 flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="capitalize">{w.role}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> WIP: {w.wip_count}</span>
                            </div>
                          </div>
                          {/* Done count */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-brand-600">{w.today_completed}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Selection */}
                {selectedWorker && (
                  <div className="p-3 border-t border-slate-100">
                    <button onClick={() => setSelectedWorker(null)}
                      className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle Button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center w-6 flex-shrink-0 group"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
          <div className="w-6 h-12 bg-white hover:bg-brand-50 border border-slate-200 rounded-md flex items-center justify-center transition-colors shadow-sm">
            {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600" />}
          </div>
        </button>

        {/* ══════ MAIN CONTENT ══════ */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Assignment Dashboard</h1>
                <p className="text-xs text-slate-500">{projectLabel || 'Select a queue to view assignments'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <ClockDisplay timezone={projectTz} className="text-sm font-semibold text-slate-800 font-mono" />
                </div>
                <Button variant="secondary" icon={RefreshCw} onClick={() => loadData(1, true)} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Auto-assignment is active. Orders are assigned based on WIP capacity.
                {selectedWorker && <span className="font-bold"> Filtered by selected worker.</span>}
              </p>
            </div>

            {/* Queue selector + controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select value={selectedQueue} onChange={e => { setSelectedQueue(e.target.value); }}
                className="select text-sm min-w-[200px]" aria-label="Select queue">
                {queues.map(q => <option key={q.queue_name} value={q.queue_name}>{q.queue_name} ({q.department} · {q.country})</option>)}
              </select>

              {/* Status filter buttons */}
              <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {statusButtons.map(sb => (
                  <button key={sb.key} onClick={() => { setStatusFilter(sb.key); }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === sb.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    {sb.label} <span className="opacity-70">({sb.count})</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[150px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search order/client..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-8 text-xs h-8" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400" /></button>}
              </div>

              {/* Date filter */}
              <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); }}
                className="input text-xs h-8 w-36" title="Filter by date" />
              {(dateFilter || selectedWorker) && (
                <button onClick={() => { setDateFilter(''); setSelectedWorker(null); setSearchQuery(''); setStatusFilter('all'); }}
                  className="text-xs text-brand-600 hover:underline">Clear filters</button>
              )}
            </div>

            {/* ── Collapsible Stats Strip ── */}
            <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
              <button onClick={() => setStatsOpen(!statsOpen)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 text-xs">
                  <BarChart3 className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-slate-700">{counts.today_total} Today</span>
                  <span className="text-brand-600">{counts.assigned} Assigned</span>
                  <span className="text-amber-600">{counts.unassigned} Unassigned</span>
                  <span className="text-green-600">{counts.completed} Completed</span>
                  {Object.entries(roleCompletions).map(([role, rc]) => (
                    <span key={role} className="text-slate-500 capitalize">{role}: <b className="text-slate-700">{rc.today_completed}</b></span>
                  ))}
                </div>
                {statsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {statsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-3 border-t border-slate-100">
                      <div className="flex gap-3 overflow-x-auto py-2">
                        {dateStats.slice().reverse().map(ds => (
                          <div key={ds.date} className="flex-shrink-0 w-36 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <div className="text-[10px] text-slate-400 font-medium">{ds.day_label} {ds.date.slice(5)}</div>
                            <div className="text-sm font-bold text-slate-800 mt-0.5">{ds.total} orders</div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px]">
                              <span className="text-blue-600">Draw: {ds.drawer_done}</span>
                              <span className="text-green-600">Check: {ds.checker_done}</span>
                              <span className="text-purple-600">QA: {ds.qa_done}</span>
                              <span className="text-amber-600">Amend: {ds.amender_done}</span>
                              <span className="text-brand-600 col-span-2">Delivered: {ds.delivered}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Role completion details */}
                      <div className="flex gap-4 mt-1">
                        {Object.entries(roleCompletions).map(([role, rc]) => {
                          const Icon = roleIcons[role] || Users;
                          return (
                            <div key={role} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="capitalize font-medium">{role}</span>
                              <span className="text-brand-600 font-bold">{rc.today_completed}</span>
                              <span className="text-slate-400">/ {rc.active} active / {rc.total_staff} total</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ══════ ORDERS TABLE (LiveQA-style) ══════ */}
            <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">Loading orders...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '1050px' }}>
                    <colgroup>
                      <col style={{ width: '70px' }} />{/* Date */}
                      <col style={{ width: '90px' }} />{/* Order */}
                      <col style={{ width: '100px' }} />{/* Variant */}
                      <col />{/* Address — takes remaining space */}
                      <col style={{ width: '70px' }} />{/* Priority */}
                      <col style={{ width: '120px' }} />{/* Drawer */}
                      <col style={{ width: '120px' }} />{/* Checker */}
                      <col style={{ width: '120px' }} />{/* QA */}
                      <col style={{ width: '85px' }} />{/* Status */}
                    </colgroup>
                    <thead>
                      <tr className="bg-brand-700 text-white">
                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Order</th>
                        <th className="px-2 py-2 text-left font-semibold">Variant</th>
                        <th className="px-3 py-2 text-left font-semibold">Address</th>
                        <th className="px-2 py-2 text-center font-semibold">Priority</th>
                        <th className="px-3 py-2 text-left font-semibold">Drawer</th>
                        <th className="px-3 py-2 text-left font-semibold">Checker</th>
                        <th className="px-3 py-2 text-left font-semibold">QA</th>
                        <th className="px-2 py-2 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {sortedOrders.map((o, idx) => (
                          <motion.tr key={o.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={`border-b border-slate-100 hover:bg-brand-50/40 transition-colors ${o.is_on_hold ? 'bg-red-50/50' : ''} ${highlightedIds.has(o.id) ? 'new-order-highlight' : ''}`}>
                            {/* Date */}
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                              {o.received_at ? new Date(o.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            {/* Order */}
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-900">{o.order_number}</div>
                              {o.amend && <span className="text-[10px] text-amber-600 font-medium">AMEND</span>}
                            </td>
                            {/* Variant */}
                            <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{(o as any).VARIANT_no || '—'}</td>
                            {/* Address + Remaining Time */}
                            <td className="px-3 py-2 overflow-hidden">
                              <div className="text-xs text-slate-700 truncate" title={o.address || ''}>{o.address || '—'}</div>
                              {!(o.workflow_state?.includes('COMPLETE') || o.workflow_state?.includes('DELIVER')) && (
                                <div className="mt-0.5"><RemainingBadge dueIn={o.due_in} receivedAt={o.received_at} /></div>
                              )}
                            </td>
                            {/* Priority */}
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${o.priority === 'high' ? 'bg-red-100 text-red-700' : o.priority === 'rush' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                {o.priority?.toUpperCase() || 'REG'}
                              </span>
                            </td>
                            {/* Drawer */}
                            <RoleCell order={o} role="drawer" name={o.drawer_name} userId={(o as any).drawer_id} done={o.drawer_done} color="bg-brand-600" startTime={o.dassign_time} endTime={o.drawer_date} />
                            {/* Checker */}
                            <RoleCell order={o} role="checker" name={o.checker_name} userId={(o as any).checker_id} done={o.checker_done} color="bg-blue-600" startTime={o.cassign_time} endTime={o.checker_date} />
                            {/* QA */}
                            <RoleCell order={o} role="qa" name={o.qa_name} userId={(o as any).qa_id} done={o.final_upload} color="bg-purple-600" startTime={o.checker_date} endTime={o.ausFinaldate} />
                            {/* Status */}
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                o.workflow_state?.includes('COMPLETE') || o.workflow_state?.includes('DELIVER') ? 'bg-green-100 text-green-700'
                                : o.workflow_state?.includes('HOLD') ? 'bg-red-100 text-red-700'
                                : o.workflow_state?.includes('CHECK') ? 'bg-blue-100 text-blue-700'
                                : o.workflow_state?.includes('QA') ? 'bg-purple-100 text-purple-700'
                                : o.workflow_state?.includes('DRAW') ? 'bg-brand-100 text-brand-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                                {(o.workflow_state || 'PENDING').replace(/_/g, ' ')}
                              </span>
                            </td>

                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {orders.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Users className="w-10 h-10 mb-2" />
                      <div className="text-sm font-medium">No orders found</div>
                      <div className="text-xs mt-1">{selectedWorker ? 'No orders for this worker' : 'Try changing filters or selecting a different queue'}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Total count */}
              {totalOrders > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-500">{totalOrders} orders</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      <Modal open={!!showReassign} onClose={() => setShowReassign(null)} title="Re-queue Order"
        subtitle={`Unassign from ${showReassign?.drawer_name || showReassign?.checker_name || 'worker'} and return to queue`}
        variant="warning" size="md"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowReassign(null)}>Cancel</Button>
            <Button className="flex-1 bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500/30"
              onClick={handleReassign} loading={reassigning} disabled={reassignReason.length < 3}>
              Confirm Re-queue
            </Button>
          </>
        }>
        <div className="space-y-5">
          <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
            <p className="text-sm text-amber-800">
              Order <span className="font-bold">{showReassign?.order_number}</span> will be unassigned and automatically reassigned to the next available worker.
            </p>
          </div>
          <Textarea id="reassign-reason" label="Reason for Reassignment" required
            value={reassignReason} onChange={e => setReassignReason(e.target.value)}
            placeholder="Explain why this order needs to be reassigned (minimum 3 characters)..."
            rows={4} showCharCount maxLength={300} currentLength={reassignReason.length}
            error={reassignReason.length > 0 && reassignReason.length < 3 ? 'Please provide at least 3 characters' : undefined}
            hint="This will be logged for audit purposes" />
        </div>
      </Modal>

      {/* Checklist Modal */}
      {showChecklist && (
        <ChecklistModal orderId={showChecklist.id} orderNumber={showChecklist.order_number}
          onComplete={() => { setShowChecklist(null); loadData(1, true); }}
          onClose={() => setShowChecklist(null)} />
      )}

      {/* ══════ Assign Role Dropdown (floating) ══════ */}
      {assignDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => { setAssignDropdown(null); setAssignSearch(''); }} />
          {/* Dropdown panel */}
          <div className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-64 max-h-80 flex flex-col overflow-hidden"
            style={{
              top: Math.min((assignDropdown.anchorRect?.bottom ?? 200) + 4, window.innerHeight - 330),
              left: Math.min((assignDropdown.anchorRect?.left ?? 200), window.innerWidth - 280),
            }}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 capitalize">Assign {assignDropdown.role}</span>
                <button onClick={() => { setAssignDropdown(null); setAssignSearch(''); }} className="p-0.5 hover:bg-slate-200 rounded">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input type="text" autoFocus value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
                  placeholder={`Search ${assignDropdown.role}s...`}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500" />
              </div>
            </div>
            {/* Worker list */}
            <div className="flex-1 overflow-y-auto">
              {assigning ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                  <span className="ml-2 text-xs text-slate-500">Assigning...</span>
                </div>
              ) : assignableWorkers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No {assignDropdown.role}s found
                </div>
              ) : (
                <div className="py-1">
                  {assignableWorkers.map(w => (
                    <button key={w.id} onClick={() => handleAssignRole(assignDropdown.orderId, assignDropdown.role, w.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-brand-50 transition-colors text-left">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                        w.is_absent ? 'bg-slate-400' : 'bg-[#2AA7A0]'
                      }`}>{w.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate">#{w.id} – {w.name}</div>
                        <div className="text-[10px] text-slate-400">WIP: {w.wip_count} · Done: {w.today_completed}</div>
                      </div>
                      {w.is_absent && <span className="text-[10px] text-rose-500 font-medium">Absent</span>}
                      {w.is_online && !w.is_absent && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AnimatedPage>
  );
}
