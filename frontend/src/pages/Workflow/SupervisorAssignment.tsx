import { useEffect, useState } from 'react';

import { workflowService, projectService } from '../../services';
import type { Order } from '../../types';
import { AnimatedPage, PageHeader, StatusBadge, Modal, Button, DataTable } from '../../components/ui';
import { Users, RefreshCw, RotateCcw, Info } from 'lucide-react';

export default function SupervisorAssignment() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showReassign, setShowReassign] = useState<Order | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    projectService.list().then(res => {
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) loadOrders();
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

  const assigned = orders.filter(o => o.assigned_to !== null).length;
  const unassigned = orders.filter(o => o.assigned_to === null).length;
  const inProgress = orders.filter(o => o.workflow_state.startsWith('IN_')).length;

  return (
    <AnimatedPage>
      <PageHeader title="Assignment" subtitle="Monitor and manage order assignments"
        actions={<Button variant="secondary" icon={RefreshCw} onClick={loadOrders}>Refresh</Button>}
      />

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900">Auto-assignment is active</p>
          <p className="text-xs text-blue-600 mt-0.5">Orders are automatically assigned based on WIP capacity. Use reassign to manually re-queue orders.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
          <div className="text-xs text-slate-500">Total Orders</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="text-2xl font-bold text-emerald-600">{assigned}</div>
          <div className="text-xs text-slate-500">Assigned</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="text-2xl font-bold text-amber-600">{unassigned}</div>
          <div className="text-xs text-slate-500">Unassigned</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          <div className="text-xs text-slate-500">In Progress</div>
        </div>
      </div>

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="mb-4">
          <select value={selectedProject || ''} onChange={e => setSelectedProject(Number(e.target.value))} className="select text-sm">
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={orders} loading={loading}
        columns={[
          { key: 'order_number', label: 'Order', sortable: true, render: (o) => (
            <div>
              <div className="font-semibold text-slate-900">{o.order_number}</div>
              <div className="text-xs text-slate-400">{o.client_reference}</div>
            </div>
          )},
          { key: 'workflow_state', label: 'State', render: (o) => <StatusBadge status={o.workflow_state} /> },
          { key: 'assigned', label: 'Assigned To', render: (o) => (
            o.assignedUser ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-bold">{o.assignedUser.name.charAt(0)}</div>
                <span className="text-sm text-slate-700">{o.assignedUser.name}</span>
              </div>
            ) : <span className="text-xs text-amber-500 font-medium">Unassigned</span>
          )},
          { key: 'priority', label: 'Priority', render: (o) => <StatusBadge status={o.priority} size="xs" /> },
          { key: 'actions', label: '', render: (o) => o.assigned_to ? (
            <Button variant="ghost" size="xs" onClick={() => { setShowReassign(o); setReassignReason(''); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          ) : null },
        ]}
        emptyIcon={Users}
        emptyTitle="No orders"
        emptyDescription="No orders in this project."
      />

      {/* Reassign Modal */}
      <Modal open={!!showReassign} onClose={() => setShowReassign(null)} title="Re-queue Order" subtitle="Unassign and return to queue" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Order <strong>{showReassign?.order_number}</strong> will be unassigned from <strong>{showReassign?.assignedUser?.name}</strong> and re-queued for auto-assignment.</p>
          <div>
            <label className="label">Reason (min 3 chars) *</label>
            <textarea value={reassignReason} onChange={e => setReassignReason(e.target.value)} className="textarea" rows={3} placeholder="Reason for reassignment" />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowReassign(null)}>Cancel</Button>
          <Button className="flex-1" onClick={handleReassign} loading={reassigning} disabled={reassignReason.length < 3}>Re-queue</Button>
        </div>
      </Modal>
    </AnimatedPage>
  );
}
