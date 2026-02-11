import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService } from '../../services';
import type { Order } from '../../types';
import { 
  AlertTriangle, RotateCcw, User, FileText, 
  Loader2, CheckCircle, MessageSquare,
  ArrowLeft, RefreshCw, Eye
} from 'lucide-react';

const RejectedOrders = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reassigning, setReassigning] = useState<number | null>(null);

  const canManage = ['ceo', 'director', 'operations_manager', 'supervisor'].includes(user?.role || '');
  const isWorker = ['worker', 'designer', 'drawer'].includes(user?.role || '');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await workflowService.getRejectedOrders({});
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load rejected orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (orderId: number) => {
    try {
      setReassigning(orderId);
      await workflowService.startOrder(orderId);
      loadOrders();
    } catch (error) {
      console.error('Failed to restart order:', error);
    } finally {
      setReassigning(null);
    }
  };

  const getRejectionTypeConfig = (type?: string) => {
    switch (type) {
      case 'quality':
        return { color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600', label: 'Quality Issue' };
      case 'incomplete':
        return { color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600', label: 'Incomplete' };
      case 'wrong_specs':
        return { color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', label: 'Wrong Specs' };
      case 'rework':
        return { color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Needs Rework' };
      default:
        return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-600', label: 'Returned' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-rose-600 uppercase tracking-wider">Review</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Rejected Orders</h1>
          <p className="text-slate-500 mt-2">Orders returned for corrections or rework</p>
        </div>

        <button
          onClick={loadOrders}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-violet-300 transition-all flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Rejected', 
            value: orders.length, 
            color: 'from-rose-500 to-red-600',
            icon: AlertTriangle 
          },
          { 
            label: 'Quality Issues', 
            value: orders.filter(o => o.rejection_type === 'quality').length, 
            color: 'from-amber-500 to-orange-600',
            icon: Eye 
          },
          { 
            label: 'Incomplete', 
            value: orders.filter(o => o.rejection_type === 'incomplete').length, 
            color: 'from-violet-500 to-purple-600',
            icon: FileText 
          },
          { 
            label: 'Needs Rework', 
            value: orders.filter(o => o.rejection_type === 'rework').length, 
            color: 'from-blue-500 to-indigo-600',
            icon: RotateCcw 
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">All Clear!</h2>
          <p className="text-slate-500 mt-2">No rejected orders requiring attention.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected By</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recheck #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const typeConfig = getRejectionTypeConfig(order.rejection_type);
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{order.order_number}</p>
                          <p className="text-sm text-slate-500">{order.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-lg ${typeConfig.bg} ${typeConfig.text}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm text-slate-700">
                            {order.rejected_by_user?.name || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 max-w-xs truncate">
                          {order.rejection_reason || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          (order.recheck_count || 0) > 2 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{order.recheck_count || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {order.rejected_at 
                          ? new Date(order.rejected_at).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-violet-600"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(canManage || (isWorker && order.assigned_to === user?.id)) && (
                            <button
                              onClick={() => handleRestart(order.id)}
                              disabled={reassigning === order.id}
                              className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {reassigning === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                              Restart
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{selectedOrder.order_number}</h2>
              <p className="text-slate-500">{selectedOrder.title}</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <span className="font-semibold text-rose-700">Rejection Details</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Type:</dt>
                    <dd className="font-medium text-slate-900 capitalize">
                      {selectedOrder.rejection_type?.replace('_', ' ') || 'Not specified'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Rejected By:</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedOrder.rejected_by_user?.name || 'System'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Date:</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedOrder.rejected_at 
                        ? new Date(selectedOrder.rejected_at).toLocaleString()
                        : '-'
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Recheck Count:</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedOrder.recheck_count || 1}
                    </dd>
                  </div>
                </dl>
              </div>

              {selectedOrder.rejection_reason && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-slate-600" />
                    <span className="font-semibold text-slate-700">Reason</span>
                  </div>
                  <p className="text-sm text-slate-600">{selectedOrder.rejection_reason}</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                {(canManage || (isWorker && selectedOrder.assigned_to === user?.id)) && (
                  <button
                    onClick={() => {
                      handleRestart(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restart Work
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedOrders;
