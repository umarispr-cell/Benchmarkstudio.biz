import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService, projectService } from '../../services';
import type { Order } from '../../types';
import { AnimatedPage, PageHeader, StatusBadge, Modal, Button, DataTable, FilterBar } from '../../components/ui';
import { Package, RefreshCw, Eye } from 'lucide-react';

export default function WorkQueue() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState<Order | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const isManager = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  useEffect(() => {
    if (isManager) {
      projectService.list().then(res => {
        const d = res.data?.data || res.data;
        const list = Array.isArray(d) ? d : [];
        setProjects(list);
        if (list.length > 0) setSelectedProject(list[0].id);
      }).catch(() => {});
    } else if (user?.project_id) {
      setSelectedProject(user.project_id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) loadOrders();
  }, [selectedProject, selectedState, selectedPriority]);

  const loadOrders = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const params: any = {};
      if (selectedState !== 'all') params.state = selectedState;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      const res = await workflowService.projectOrders(selectedProject, params);
      const d = res.data?.data || res.data;
      setOrders(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!selectedProject && !isManager) {
    return (
      <AnimatedPage>
        <PageHeader title="Work Queue" subtitle="View project orders and workflow states" />
        <div className="bg-white rounded-xl border border-slate-200/60 p-12 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No project assigned to your account.</p>
        </div>
      </AnimatedPage>
    );
  }

  // State summary
  const stateCounts: Record<string, number> = {};
  orders.forEach(o => { stateCounts[o.workflow_state] = (stateCounts[o.workflow_state] || 0) + 1; });

  const filtered = orders.filter(o =>
    !searchTerm || o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || o.client_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatedPage>
      <PageHeader title="Work Queue" subtitle="Orders and workflow state tracking"
        actions={<Button variant="secondary" icon={RefreshCw} onClick={loadOrders}>Refresh</Button>}
      />

      {/* State summary bar */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-3 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button onClick={() => setSelectedState('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedState === 'all' ? 'bg-[#2AA7A0] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
            All ({orders.length})
          </button>
          {Object.entries(stateCounts).sort(([a], [b]) => a.localeCompare(b)).map(([state, count]) => (
            <button key={state} onClick={() => setSelectedState(selectedState === state ? 'all' : state)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedState === state ? 'bg-[#2AA7A0] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              {state.replace(/_/g, ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <FilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search orders..."
        filters={<>
          {isManager && projects.length > 1 && (
            <select value={selectedProject || ''} onChange={e => setSelectedProject(Number(e.target.value))} className="select text-sm">
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="select text-sm">
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option><option value="high">High</option>
            <option value="normal">Normal</option><option value="low">Low</option>
          </select>
        </>}
      />

      {/* Orders table */}
      <div className="mt-4">
        <DataTable
          data={filtered} loading={loading}
          columns={[
            { key: 'order_number', label: 'Order #', sortable: true, render: (o) => (
              <div>
                <div className="font-semibold text-slate-900">{o.order_number}</div>
                <div className="text-xs text-slate-400">{o.client_reference}</div>
              </div>
            )},
            { key: 'workflow_state', label: 'State', render: (o) => <StatusBadge status={o.workflow_state} /> },
            { key: 'priority', label: 'Priority', render: (o) => <StatusBadge status={o.priority} size="xs" /> },
            { key: 'assigned', label: 'Assigned To', render: (o) => (
              <span className="text-sm text-slate-500">{o.assignedUser?.name || <span className="text-slate-300">Unassigned</span>}</span>
            )},
            { key: 'recheck', label: 'Rechecks', sortable: true, render: (o) => (
              o.recheck_count > 0 ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{o.recheck_count}</span> : <span className="text-slate-300">0</span>
            )},
            { key: 'hold', label: 'Hold', render: (o) => o.is_on_hold ? <StatusBadge status="on_hold" size="xs" /> : null },
            { key: 'received', label: 'Received', sortable: true, render: (o) => (
              <span className="text-xs text-slate-400">{new Date(o.received_at || o.created_at).toLocaleDateString()}</span>
            )},
            { key: 'actions', label: '', render: (o) => (
              <Button variant="ghost" size="xs" onClick={() => setShowDetail(o)}><Eye className="w-3.5 h-3.5" /></Button>
            )},
          ]}
          emptyIcon={Package}
          emptyTitle="No orders found"
          emptyDescription="No orders match the current filters."
        />
      </div>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`Order ${showDetail?.order_number}`} size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'State', value: <StatusBadge status={showDetail.workflow_state} /> },
                { label: 'Priority', value: <StatusBadge status={showDetail.priority} size="xs" /> },
                { label: 'Client Ref', value: showDetail.client_reference },
                { label: 'Assigned To', value: showDetail.assignedUser?.name || 'Unassigned' },
                { label: 'Rechecks', value: showDetail.recheck_count },
                { label: 'Draw Attempts', value: showDetail.attempt_draw },
                { label: 'Check Attempts', value: showDetail.attempt_check },
                { label: 'QA Attempts', value: showDetail.attempt_qa },
                { label: 'On Hold', value: showDetail.is_on_hold ? 'Yes' : 'No' },
                { label: 'Hold Reason', value: showDetail.hold_reason || '—' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>

            {showDetail.rejection_reason && (
              <div className="bg-rose-50 rounded-lg p-3">
                <div className="text-xs font-medium text-rose-600 mb-1">Last Rejection</div>
                <div className="text-sm text-rose-700">{showDetail.rejection_reason}</div>
                <div className="text-xs text-rose-400 mt-1">Type: {showDetail.rejection_type} &middot; {showDetail.rejected_at ? new Date(showDetail.rejected_at).toLocaleString() : ''}</div>
              </div>
            )}

            <Button variant="secondary" className="w-full" onClick={() => setShowDetail(null)}>Close</Button>
          </div>
        )}
      </Modal>
    </AnimatedPage>
  );
}
