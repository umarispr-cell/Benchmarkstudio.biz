import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService } from '../../services';
import type { Order, WorkItem } from '../../types';
import { AlertTriangle, RefreshCw, Eye, X, Inbox, RotateCcw } from 'lucide-react';

const RejectedOrders = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [reassignReason, setReassignReason] = useState('');
  const [showReassign, setShowReassign] = useState<Order | null>(null);

  const projectId = user?.project_id;
  const canManage = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  useEffect(() => { if (projectId) loadOrders(); }, [projectId]);

  const loadOrders = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      // Load rejected orders (both check and QA rejections)
      const [checkRes, qaRes] = await Promise.all([
        workflowService.projectOrders(projectId, { state: 'REJECTED_BY_CHECK' as any }),
        workflowService.projectOrders(projectId, { state: 'REJECTED_BY_QA' as any }),
      ]);
      const checkOrders = checkRes.data?.data || checkRes.data || [];
      const qaOrders = qaRes.data?.data || qaRes.data || [];
      setOrders([...checkOrders, ...qaOrders]);
    } catch (error) { console.error('Failed to load rejected orders:', error); }
    finally { setLoading(false); }
  };

  const viewDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const res = await workflowService.workItemHistory(order.id);
      setWorkItems(res.data.work_items || []);
    } catch (_e) { setWorkItems([]); }
  };

  const handleReassign = async () => {
    if (!showReassign || !reassignReason) return;
    try {
      await workflowService.reassignOrder(showReassign.id, null, reassignReason);
      setShowReassign(null);
      setReassignReason('');
      loadOrders();
    } catch (error) { console.error('Failed to reassign:', error); }
  };

  if (!projectId) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No project assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Rejected Orders</h1>
          <p className="text-xs text-slate-500">Orders rejected by Check or QA stages</p>
        </div>
        <button onClick={() => { setLoading(true); loadOrders(); }} className="text-xs text-teal-600 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-[10px] text-slate-500 uppercase">Rejected by Check</div>
          <div className="text-lg font-bold text-red-600">{orders.filter(o => o.workflow_state === 'REJECTED_BY_CHECK').length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-[10px] text-slate-500 uppercase">Rejected by QA</div>
          <div className="text-lg font-bold text-red-600">{orders.filter(o => o.workflow_state === 'REJECTED_BY_QA').length}</div>
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="loading-shimmer h-16 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No rejected orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{order.order_number || `#${order.id}`}</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                        {order.workflow_state?.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        order.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        order.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{order.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                      {order.rejection_reason && <span className="text-red-500 truncate max-w-[200px]">{order.rejection_reason}</span>}
                      <span>Rechk: {order.recheck_count}</span>
                      {order.client_reference && <span>Ref: {order.client_reference}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => viewDetails(order)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {canManage && (
                    <button onClick={() => setShowReassign(order)} className="text-[10px] text-teal-600 bg-teal-50 px-2 py-1.5 rounded-lg hover:bg-teal-100">
                      <RotateCcw className="w-3 h-3 inline mr-1" />Reassign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4 max-h-[80vh] overflow-y-auto">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Rejection Details</h2>
            <div className="space-y-2 mb-4">
              {[
                { label: 'Order', value: selectedOrder.order_number || `#${selectedOrder.id}` },
                { label: 'State', value: selectedOrder.workflow_state?.replace(/_/g, ' ') },
                { label: 'Reason', value: selectedOrder.rejection_reason || 'N/A' },
                { label: 'Recheck Count', value: selectedOrder.recheck_count },
                { label: 'Draw Attempts', value: selectedOrder.attempt_draw },
                { label: 'Check Attempts', value: selectedOrder.attempt_check },
                { label: 'QA Attempts', value: selectedOrder.attempt_qa },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                  <span className="text-xs font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
            {workItems.length > 0 && (
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-2">Work History</div>
                <div className="space-y-1.5">
                  {workItems.map(wi => (
                    <div key={wi.id} className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-slate-600">{wi.stage}</span>
                        <span className={wi.status === 'rejected' ? 'text-red-500' : 'text-slate-400'}>{wi.status}</span>
                      </div>
                      {wi.rework_reason && <div className="text-[10px] text-red-500 mt-0.5">{wi.rework_reason}</div>}
                      <div className="text-[10px] text-slate-400 mt-0.5">{wi.assignedUser?.name || 'Unassigned'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setSelectedOrder(null)} className="w-full mt-4 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg">Close</button>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReassign(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Reassign Order</h3>
            <p className="text-xs text-slate-500 mb-3">
              This will unassign the order and place it back in the queue for auto-assignment.
            </p>
            <textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="Reason for reassignment..."
              className="w-full text-xs p-2 border border-slate-200 rounded-lg h-16 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowReassign(null)} className="flex-1 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleReassign} disabled={reassignReason.length < 3} className="flex-1 text-xs py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">Reassign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedOrders;
