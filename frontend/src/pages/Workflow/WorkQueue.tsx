import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService } from '../../services';
import type { Order } from '../../types';
import { Clock, Play, CheckCircle, AlertCircle, User, Tag, RefreshCw, Layers, Timer, ArrowRight, Zap, ListChecks } from 'lucide-react';

const WorkQueue = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, selectedPriority]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      
      const response = await workflowService.getQueue(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOrder = async (orderId: number) => {
    try {
      await workflowService.startOrder(orderId);
      loadOrders();
    } catch (error) {
      console.error('Error starting order:', error);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await workflowService.completeOrder(orderId);
      loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': 
        return { icon: Clock, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30', bg: 'bg-amber-50', text: 'text-amber-600' };
      case 'in_progress': 
        return { icon: Play, color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/30', bg: 'bg-teal-50', text: 'text-teal-600' };
      case 'completed': 
        return { icon: CheckCircle, color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30', bg: 'bg-emerald-50', text: 'text-emerald-600' };
      case 'on_hold': 
        return { icon: AlertCircle, color: 'from-rose-500 to-red-600', shadow: 'shadow-rose-500/30', bg: 'bg-rose-50', text: 'text-rose-600' };
      default: 
        return { icon: Clock, color: 'from-slate-500 to-gray-600', shadow: 'shadow-slate-500/30', bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: 'from-rose-500 to-red-600', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
      case 'high': return { color: 'from-orange-500 to-amber-600', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'medium': return { color: 'from-yellow-500 to-amber-500', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
      case 'low': return { color: 'from-emerald-500 to-green-600', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      default: return { color: 'from-slate-500 to-gray-600', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  const canManageOrders = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');
  const isWorker = ['worker', 'designer', 'qa'].includes(user?.role || '');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-violet-600 uppercase tracking-wider">Workflow</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Work Queue</h1>
          <p className="text-slate-500 mt-2">Track and manage order workflow efficiently</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, color: 'from-slate-500 to-gray-600', icon: Layers },
          { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: 'from-amber-500 to-orange-600', icon: Clock },
          { label: 'In Progress', value: orders.filter(o => o.status === 'in-progress').length, color: 'from-teal-500 to-cyan-600', icon: Play },
          { label: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: 'from-emerald-500 to-green-600', icon: CheckCircle },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input flex-1"
            aria-label="Filter by status"
          >
            <option value="all">🎯 All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="in_progress">▶️ In Progress</option>
            <option value="completed">✅ Completed</option>
            <option value="on_hold">⚠️ On Hold</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input flex-1"
            aria-label="Filter by priority"
          >
            <option value="all">🎯 All Priority</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <button onClick={loadOrders} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading orders...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const priorityConfig = getPriorityConfig(order.priority);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={order.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-violet-200/50 transition-all duration-300 overflow-hidden">
                {/* Priority indicator */}
                <div className={`h-1 bg-gradient-to-r ${priorityConfig.color}`}></div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${statusConfig.color} shadow-lg ${statusConfig.shadow} group-hover:scale-110 transition-transform`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-violet-600 transition-colors">Order #{order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityConfig.bg} ${priorityConfig.text} border ${priorityConfig.border}`}>
                            {order.priority === 'urgent' && <Zap className="w-3 h-3 inline mr-1" />}
                            {order.priority.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${statusConfig.color} text-white shadow-sm ${statusConfig.shadow}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{order.current_layer}</span>
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-slate-400" />
                            Priority: {order.priority}
                          </span>
                          {order.assigned_to && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                <User className="w-4 h-4" />
                                Assigned
                              </span>
                            </>
                          )}
                        </div>

                        {order.client_reference && (
                          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">Ref: {order.client_reference}</p>
                        )}

                        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Created: {new Date(order.created_at).toLocaleDateString()}
                          </span>
                          {order.received_at && (
                            <span className="flex items-center gap-1.5 text-teal-500 font-medium">
                              <Timer className="w-3.5 h-3.5" />
                              Received: {new Date(order.received_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isWorker && order.status === 'pending' && (
                        <button
                          onClick={() => handleStartOrder(order.id)}
                          className="btn btn-primary"
                        >
                          <Play className="w-4 h-4" />
                          Start Work
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      
                      {isWorker && order.status === 'in-progress' && order.assigned_to === user?.id && (
                        <button
                          onClick={() => handleCompleteOrder(order.id)}
                          className="btn btn-success"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      
                      {canManageOrders && (
                        <button className="btn btn-secondary">
                          Manage
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No orders in queue</h3>
                <p className="text-slate-500 max-w-md mx-auto">All caught up! Check back later for new orders.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkQueue;
