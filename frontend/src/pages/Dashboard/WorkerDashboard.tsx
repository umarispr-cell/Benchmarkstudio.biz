import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { dashboardService, workflowService } from '../../services';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Play,
  ArrowRight,
  Timer,
  Tag,
  Hash,
  Zap,
  Target,
  X,
} from 'lucide-react';

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [stats, setStats] = useState({
    assigned: 0,
    in_progress: 0,
    completed_today: 0,
    completed_this_week: 0,
    daily_target: 10,
  });
  const [workQueue, setWorkQueue] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getWorker();
      setCurrentOrder(data.work_queue?.[0] || null);
      setWorkQueue(data.work_queue || []);
      if (data.statistics) {
        setStats((prev) => ({
          ...prev,
          assigned: data.statistics.assigned || 0,
          in_progress: data.statistics.in_progress || 0,
          completed_today: data.statistics.completed_today || 0,
          completed_this_week: data.statistics.completed_this_week || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!currentOrder) return;
    try {
      setCompleting(true);
      await workflowService.completeOrder(currentOrder.id);
      await loadData();
    } catch (error) {
      console.error('Error completing order:', error);
    } finally {
      setCompleting(false);
    }
  };

  const layerTitle = user?.layer
    ? user.layer.charAt(0).toUpperCase() + user.layer.slice(1)
    : 'Worker';
  const progress =
    stats.daily_target > 0
      ? Math.round((stats.completed_today / stats.daily_target) * 100)
      : 0;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-7 w-48 bg-slate-200 rounded loading-shimmer" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-3 bg-slate-100 rounded w-16" />
                <div className="h-6 bg-slate-100 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Good{' '}
            {new Date().getHours() < 12
              ? 'morning'
              : new Date().getHours() < 18
                ? 'afternoon'
                : 'evening'}
            , {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {layerTitle} · Work queue & performance
          </p>
        </div>
        <button
          onClick={() => navigate('/work')}
          className="text-[11px] text-teal-600 font-medium hover:text-teal-700 flex items-center gap-0.5"
        >
          View Queue <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Progress */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <Target className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            {progress >= 50 && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-slate-900 leading-none">
            {stats.completed_today}
            <span className="text-slate-300 text-sm font-normal">
              /{stats.daily_target}
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Today's progress</p>
          <div className="mt-2.5">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{progress}% of target</p>
          </div>
        </div>

        {/* Queue */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="mb-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 w-fit">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 leading-none">
            {workQueue.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">In queue</p>
          <p className="text-[10px] text-slate-400 mt-2.5">
            {stats.completed_this_week} this week
          </p>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="p-1.5 rounded-lg bg-violet-50">
              <ClipboardList className="h-3.5 w-3.5 text-violet-600" />
            </div>
            {currentOrder && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700">
                <Zap className="w-2.5 h-2.5" /> Active
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {currentOrder ? 'Working' : 'Ready'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {currentOrder ? 'Order in progress' : 'No active order'}
          </p>
        </div>
      </div>

      {/* Current Order */}
      {currentOrder ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500" />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50">
                  <Play className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Current Order
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Focus on completing this
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700">
                <Zap className="w-3 h-3" /> In Progress
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { icon: Hash, label: 'Order', value: currentOrder.order_number },
                {
                  icon: Tag,
                  label: 'Reference',
                  value: currentOrder.client_reference,
                },
                { icon: Zap, label: 'Priority', value: currentOrder.priority },
                {
                  icon: Timer,
                  label: 'Started',
                  value: currentOrder.started_at
                    ? new Date(currentOrder.started_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—',
                },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <item.icon className="w-3 h-3" /> {item.label}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 capitalize truncate">
                    {item.value || '—'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowOrderDetail(true)}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                Details <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={handleCompleteOrder}
                disabled={completing}
                className="btn btn-success text-xs py-1.5 px-3"
              >
                <CheckCircle2 className="w-3 h-3" />
                {completing ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-10">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">
            No Active Order
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
            Orders will be auto-assigned from the queue.
          </p>
          <button
            onClick={() => navigate('/work')}
            className="btn btn-secondary text-xs py-1.5 px-3 mt-3"
          >
            <Clock className="w-3 h-3" /> Check Queue
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowOrderDetail(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Order Details
              </h2>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'Order Number', value: currentOrder.order_number },
                {
                  label: 'Client Reference',
                  value: currentOrder.client_reference,
                },
                { label: 'Priority', value: currentOrder.priority },
                {
                  label: 'Status',
                  value: currentOrder.status?.replace('_', ' '),
                },
                { label: 'Layer', value: currentOrder.current_layer },
                {
                  label: 'Started At',
                  value: currentOrder.started_at
                    ? new Date(currentOrder.started_at).toLocaleString()
                    : 'N/A',
                },
                {
                  label: 'Due Date',
                  value: currentOrder.due_date
                    ? new Date(currentOrder.due_date).toLocaleDateString()
                    : 'N/A',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-xs font-semibold text-slate-700 capitalize">
                    {item.value || 'N/A'}
                  </span>
                </div>
              ))}
              {currentOrder.notes && (
                <div className="p-2.5 bg-slate-50 rounded-lg mt-2">
                  <p className="text-[10px] text-slate-400 mb-0.5">Notes</p>
                  <p className="text-xs text-slate-600">{currentOrder.notes}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowOrderDetail(false)}
                className="flex-1 btn btn-secondary text-xs py-1.5"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCompleteOrder();
                  setShowOrderDetail(false);
                }}
                disabled={completing}
                className="flex-1 btn btn-success text-xs py-1.5"
              >
                <CheckCircle2 className="w-3 h-3" /> Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
