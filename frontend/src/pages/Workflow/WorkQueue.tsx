import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService } from '../../services';
import type { Order, WorkflowState } from '../../types';
import { RefreshCw, Package, Eye, X, Inbox } from 'lucide-react';

const WORKFLOW_STATES: WorkflowState[] = [
  'RECEIVED', 'QUEUED_DRAW', 'IN_DRAW', 'SUBMITTED_DRAW',
  'QUEUED_CHECK', 'IN_CHECK', 'REJECTED_BY_CHECK', 'SUBMITTED_CHECK',
  'QUEUED_QA', 'IN_QA', 'REJECTED_BY_QA', 'APPROVED_QA',
  'DELIVERED', 'ON_HOLD', 'CANCELLED',
];

const STATE_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-600',
  QUEUED_DRAW: 'bg-amber-100 text-amber-700',
  IN_DRAW: 'bg-blue-100 text-blue-700',
  SUBMITTED_DRAW: 'bg-blue-50 text-blue-600',
  QUEUED_CHECK: 'bg-amber-100 text-amber-700',
  IN_CHECK: 'bg-teal-100 text-teal-700',
  REJECTED_BY_CHECK: 'bg-red-100 text-red-700',
  SUBMITTED_CHECK: 'bg-teal-50 text-teal-600',
  QUEUED_QA: 'bg-amber-100 text-amber-700',
  IN_QA: 'bg-violet-100 text-violet-700',
  REJECTED_BY_QA: 'bg-red-100 text-red-700',
  APPROVED_QA: 'bg-green-100 text-green-700',
  QUEUED_DESIGN: 'bg-amber-100 text-amber-700',
  IN_DESIGN: 'bg-blue-100 text-blue-700',
  SUBMITTED_DESIGN: 'bg-blue-50 text-blue-600',
  DELIVERED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const WorkQueue = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const projectId = user?.project_id;

  useEffect(() => { if (projectId) loadOrders(); }, [selectedState, selectedPriority, projectId]);

  const loadOrders = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const params: any = {};
      if (selectedState !== 'all') params.state = selectedState;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      const response = await workflowService.projectOrders(projectId, params);
      setOrders(response.data?.data || response.data || []);
    } catch (error) { console.error('Error loading orders:', error); }
    finally { setLoading(false); }
  };

  const canManage = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  // Count by state
  const stateCounts = orders.reduce((acc: Record<string, number>, o) => {
    const state = o.workflow_state || 'RECEIVED';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  if (!projectId) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No project assigned. Contact your manager.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Project Orders</h1>
          <p className="text-xs text-slate-500">Workflow state tracking — no manual picking</p>
        </div>
        <button onClick={() => { setLoading(true); loadOrders(); }} className="text-xs text-teal-600 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* State summary */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setSelectedState('all')}
            className={`text-[10px] px-2 py-1 rounded ${selectedState === 'all' ? 'bg-teal-100 text-teal-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
          >All ({orders.length})</button>
          {WORKFLOW_STATES.filter(s => stateCounts[s]).map(state => (
            <button
              key={state}
              onClick={() => setSelectedState(selectedState === state ? 'all' : state)}
              className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                selectedState === state ? 'ring-1 ring-teal-400' : ''
              } ${STATE_COLORS[state] || 'bg-slate-100 text-slate-600'}`}
            >
              {state.replace(/_/g, ' ')} ({stateCounts[state]})
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 flex gap-2">
        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 flex-1">
          <option value="all">All States</option>
          {WORKFLOW_STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="loading-shimmer h-16 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No orders match your filters</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {orders.map((order) => {
            const stateColor = STATE_COLORS[order.workflow_state] || 'bg-slate-100 text-slate-600';
            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{order.order_number || `#${order.id}`}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${stateColor}`}>
                          {(order.workflow_state || 'RECEIVED').replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          order.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          order.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{order.priority}</span>
                        {order.is_on_hold && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">HOLD</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        {order.client_reference && <span>Ref: {order.client_reference}</span>}
                        {order.assigned_to && <span>Assigned: User #{order.assigned_to}</span>}
                        {order.due_date && <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>}
                        <span>Rechk: {order.recheck_count}</span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => setSelectedOrder(order)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Order Details</h2>
            <div className="space-y-2">
              {[
                { label: 'Order #', value: selectedOrder.order_number || `#${selectedOrder.id}` },
                { label: 'Workflow State', value: selectedOrder.workflow_state?.replace(/_/g, ' ') },
                { label: 'Priority', value: selectedOrder.priority },
                { label: 'Client Ref', value: selectedOrder.client_reference || 'N/A' },
                { label: 'Due Date', value: selectedOrder.due_date ? new Date(selectedOrder.due_date).toLocaleDateString() : 'N/A' },
                { label: 'On Hold', value: selectedOrder.is_on_hold ? `Yes — ${selectedOrder.hold_reason}` : 'No' },
                { label: 'Draw Attempts', value: selectedOrder.attempt_draw },
                { label: 'Check Attempts', value: selectedOrder.attempt_check },
                { label: 'QA Attempts', value: selectedOrder.attempt_qa },
                { label: 'Recheck Count', value: selectedOrder.recheck_count },
                { label: 'Created', value: new Date(selectedOrder.created_at).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                  <span className="text-xs font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedOrder(null)} className="w-full mt-4 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkQueue;
