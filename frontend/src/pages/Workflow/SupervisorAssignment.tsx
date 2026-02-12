import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService, projectService } from '../../services';
import type { Order, Project } from '../../types';
import { UserPlus, RefreshCw, Inbox, AlertTriangle } from 'lucide-react';

const SupervisorAssignment = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showReassign, setShowReassign] = useState<Order | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManage = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => { if (selectedProject) loadOrders(); }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const res = await projectService.list();
      const data = res.data?.data || res.data;
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadOrders = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const res = await workflowService.projectOrders(selectedProject);
      const data = res.data?.data || res.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReassign = async () => {
    if (!showReassign || !reassignReason) return;
    setSubmitting(true);
    try {
      // null user_id = unassign and put back in queue for auto-assignment
      await workflowService.reassignOrder(showReassign.id, null, reassignReason);
      setShowReassign(null);
      setReassignReason('');
      loadOrders();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const assignedOrders = orders.filter(o => o.assigned_to);
  const unassignedOrders = orders.filter(o => !o.assigned_to);
  const inProgressOrders = orders.filter(o => o.workflow_state?.startsWith('IN_'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Order Management</h1>
          <p className="text-xs text-slate-500">Auto-assignment system — reassign orders when needed</p>
        </div>
        <button onClick={() => { setLoading(true); loadOrders(); }} className="text-xs text-teal-600 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-xl border border-slate-100 p-3">
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(Number(e.target.value))}
          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
        >
          <option value="">Select project...</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.country} — {p.department})</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: orders.length, color: 'text-slate-700' },
          { label: 'Assigned', value: assignedOrders.length, color: 'text-teal-600' },
          { label: 'Unassigned', value: unassignedOrders.length, color: 'text-amber-600' },
          { label: 'In Progress', value: inProgressOrders.length, color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-teal-700">
          <strong>Auto-Assignment Active:</strong> Orders are automatically assigned to available workers based on WIP capacity and workload. Use reassign only when needed (e.g., absent worker, stuck order).
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="loading-shimmer h-16 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No orders found for this project</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{order.order_number || `#${order.id}`}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      order.workflow_state?.startsWith('IN_') ? 'bg-blue-100 text-blue-700' :
                      order.workflow_state?.startsWith('QUEUED_') ? 'bg-amber-100 text-amber-700' :
                      order.workflow_state?.startsWith('REJECTED_') ? 'bg-red-100 text-red-700' :
                      order.workflow_state === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {(order.workflow_state || 'RECEIVED').replace(/_/g, ' ')}
                    </span>
                    {order.assigned_to && (
                      <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded">
                        <UserPlus className="w-2.5 h-2.5 inline mr-0.5" />
                        User #{order.assigned_to}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {order.priority} · {order.client_reference || 'No ref'}
                  </div>
                </div>
                {canManage && order.assigned_to && (
                  <button onClick={() => setShowReassign(order)} className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg hover:bg-amber-100">
                    Reassign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reassign Modal */}
      {showReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReassign(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Reassign Order</h3>
            <p className="text-xs text-slate-500 mb-2">
              Order <b>{showReassign.order_number}</b> will be unassigned and returned to the queue for auto-assignment.
            </p>
            <textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="Reason for reassignment (required)..."
              className="w-full text-xs p-2 border border-slate-200 rounded-lg h-16 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowReassign(null)} className="flex-1 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleReassign} disabled={reassignReason.length < 3 || submitting} className="flex-1 text-xs py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                {submitting ? 'Reassigning...' : 'Reassign to Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorAssignment;
