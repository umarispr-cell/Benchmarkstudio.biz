import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { dashboardService } from '../../services';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, TrendingUp, Play, ArrowRight, Timer, Tag, Hash, Sparkles, Zap, Target } from 'lucide-react';

const WorkerDashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assigned: 0,
    in_progress: 0,
    completed_today: 0,
    completed_this_week: 0,
    daily_target: 10, // This could come from user settings in the future
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
        setStats(prev => ({
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

  const layerTitle = user?.layer ? user.layer.charAt(0).toUpperCase() + user.layer.slice(1) : 'Worker';
  const progressPercent = stats.daily_target > 0 ? (stats.completed_today / stats.daily_target) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-violet-600 uppercase tracking-wider">{layerTitle}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 mt-2">Your work queue and performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-green-50 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                On Track
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Today's Progress</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {stats.completed_today}<span className="text-slate-400">/{stats.daily_target}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Orders completed</p>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{Math.round(progressPercent)}% of daily target</p>
            </div>
          </div>
        </div>

        {/* Queue Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-50 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">In Queue</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{workQueue.length}</p>
            <p className="text-xs text-slate-500 mt-1">Orders waiting</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-purple-50 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              {currentOrder && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                  <Zap className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500">Current Status</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {currentOrder ? 'Working on Order' : 'Ready for Work'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {currentOrder ? 'Order in progress' : 'No active order'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading your work...</p>
          </div>
        </div>
      ) : currentOrder ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Progress indicator */}
          <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Current Order</h3>
                  <p className="text-slate-500 text-sm">Focus on completing this order</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30">
                <Zap className="w-4 h-4" />
                In Progress
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Hash className="w-3.5 h-3.5" />
                  Order Number
                </div>
                <p className="font-bold text-slate-900">{currentOrder.order_number}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  Client Reference
                </div>
                <p className="font-bold text-slate-900">{currentOrder.client_reference}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Zap className="w-3.5 h-3.5" />
                  Priority
                </div>
                <p className="font-bold text-slate-900 capitalize">{currentOrder.priority}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Timer className="w-3.5 h-3.5" />
                  Started At
                </div>
                <p className="font-bold text-slate-900">
                  {new Date(currentOrder.started_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
              <button className="btn btn-primary group">
                View Order Details
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="btn btn-success">
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Order</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You don't have any orders assigned at the moment.
              <br />
              New orders will be automatically assigned from the queue.
            </p>
            <button className="btn btn-secondary mt-6">
              <Clock className="w-4 h-4" />
              Check Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
