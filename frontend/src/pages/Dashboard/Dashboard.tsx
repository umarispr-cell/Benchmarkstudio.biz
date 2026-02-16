import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { dashboardService, projectService } from '../../services';
import { 
  Briefcase, Users, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, TrendingUp,
} from 'lucide-react';
import { DashboardMetric } from './components/DashboardMetric';

interface DashboardData {
  org_totals?: {
    total_projects: number;
    total_staff: number;
    active_staff: number;
    absentees: number;
    orders_received_today: number;
    orders_delivered_today: number;
    total_pending: number;
    target_hit_rate: number;
  };
  countries?: Array<{
    country: string;
    project_count: number;
    total_staff: number;
    active_staff: number;
    received_today: number;
    delivered_today: number;
    total_pending: number;
  }>;
}

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Try master dashboard (for admin/director/ceo)
      // For accounts_manager, load projects summary
      const [dashRes, projRes] = await Promise.allSettled([
        dashboardService.master(),
        projectService.list(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data as any);
      }

      if (projRes.status === 'fulfilled') {
        const d = (projRes.value.data as any)?.data || projRes.value.data;
        setProjects(Array.isArray(d) ? d : []);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const orgTotals = data?.org_totals;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name || 'User'}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            System operational &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-brand-600 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />{error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      )}

      {/* Metrics */}
      {orgTotals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardMetric
            label="Active Projects"
            value={orgTotals.total_projects}
            subValue={`${orgTotals.total_staff} total staff`}
            icon={Briefcase}
            color="brand"
          />
          <DashboardMetric
            label="Pending Orders"
            value={orgTotals.total_pending}
            subValue="Across all projects"
            icon={Clock}
            color="warning"
          />
          <DashboardMetric
            label="Delivered Today"
            value={orgTotals.orders_delivered_today}
            subValue={`${orgTotals.orders_received_today} received today`}
            icon={CheckCircle2}
            color="success"
          />
          <DashboardMetric
            label="Active Staff"
            value={orgTotals.active_staff}
            subValue={`${orgTotals.absentees} absent`}
            icon={Users}
            color="default"
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Countries Overview */}
        <div className="xl:col-span-2 space-y-6">
          {data?.countries && data.countries.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                Regional Overview
              </h3>
              <div className="divide-y divide-slate-100">
                {data.countries.map((c) => (
                  <div key={c.country} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{c.country}</div>
                      <div className="text-xs text-slate-400">{c.project_count} projects &middot; {c.total_staff} staff</div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-brand-600">{c.delivered_today}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Delivered</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-amber-600">{c.total_pending}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-slate-600">{c.active_staff}</div>
                        <div className="text-[10px] text-slate-400 uppercase">Online</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects List */}
          {projects.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-500" />
                  Projects ({projects.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {projects.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                        {p.code?.charAt(0) || p.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.code} &middot; {p.country} &middot; {p.department?.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      p.status === 'active' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Target Performance */}
        <div className="space-y-6">
          {orgTotals && (
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl p-6 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <h4 className="text-brand-100 text-xs font-semibold uppercase tracking-wider mb-1">Target Hit Rate</h4>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold tracking-tight">{orgTotals.target_hit_rate}%</span>
                  <span className="text-sm text-brand-200">of staff on target</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-brand-200">
                    <span>Progress</span>
                    <span>{orgTotals.target_hit_rate}%</span>
                  </div>
                  <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-white h-full rounded-full transition-all" style={{ width: `${Math.min(orgTotals.target_hit_rate, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              {[
                { label: 'Received Today', value: orgTotals?.orders_received_today ?? 0, color: 'text-blue-600' },
                { label: 'Delivered Today', value: orgTotals?.orders_delivered_today ?? 0, color: 'text-brand-600' },
                { label: 'Total Pending', value: orgTotals?.total_pending ?? 0, color: 'text-amber-600' },
                { label: 'Total Staff', value: orgTotals?.total_staff ?? 0, color: 'text-slate-600' },
                { label: 'Active Now', value: orgTotals?.active_staff ?? 0, color: 'text-brand-600' },
                { label: 'Absent', value: orgTotals?.absentees ?? 0, color: 'text-rose-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
