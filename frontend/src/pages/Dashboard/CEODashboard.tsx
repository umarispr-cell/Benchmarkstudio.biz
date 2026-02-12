import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { dashboardService } from '../../services';
import {
  Users,
  FolderKanban,
  ClipboardCheck,
  Activity,
  Globe,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  Layers,
} from 'lucide-react';

interface Stats {
  countries: any[];
  overview: {
    total_projects: number;
    active_projects: number;
    total_orders: number;
    completed_orders: number;
    total_users: number;
    active_users: number;
  };
  recent_activities: any[];
}

const CEODashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const countries = ['UK', 'Australia', 'Canada', 'USA'];

  useEffect(() => {
    loadStats();
  }, [selectedCountry]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getCEO();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats
    ? Math.round((stats.overview.completed_orders / Math.max(stats.overview.total_orders, 1)) * 100)
    : 0;

  const statCards = [
    { title: 'Projects', value: stats?.overview.total_projects || 0, sub: `${stats?.overview.active_projects || 0} active`, icon: FolderKanban, color: 'text-teal-600', bg: 'bg-teal-50', trend: '+12%' },
    { title: 'Orders', value: stats?.overview.total_orders || 0, sub: 'All countries', icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50', trend: '+8%' },
    { title: 'Completed', value: stats?.overview.completed_orders || 0, sub: `${completionRate}% rate`, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5%' },
    { title: 'Team', value: stats?.overview.total_users || 0, sub: `${stats?.overview.active_users || 0} online`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', trend: '' },
  ];

  const getFlag = (c: string) => ({ UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' }[c] || '🌍');

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-7 w-48 bg-slate-200 rounded loading-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
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
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Organization overview</p>
        </div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-50 focus:outline-none"
          aria-label="Country filter"
        >
          <option value="all">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{getFlag(c)} {c}</option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between mb-2.5">
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
                {s.trend && (
                  <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                    <ArrowUpRight className="h-3 w-3" />{s.trend}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-slate-900 leading-none">{s.value.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Completion Rate */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium mb-1">
              <BarChart3 className="h-3 w-3" /> Completion Rate
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold tracking-tight">{completionRate}%</span>
              <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-0.5 mb-1">
                <TrendingUp className="h-3 w-3" /> on track
              </span>
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
              <span>{stats?.overview.completed_orders || 0} done</span>
              <span>{stats?.overview.total_orders || 0} total</span>
            </div>
          </div>
        </div>

        {/* Regional */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-900">Regional Performance</h3>
            </div>
            <button onClick={() => navigate('/projects')} className="text-[11px] text-teal-600 font-medium hover:text-teal-700 flex items-center gap-0.5">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {stats?.countries?.map((c: any) => {
              const pct = c.total_orders > 0 ? Math.round((c.completed_orders / c.total_orders) * 100) : 0;
              return (
                <div key={c.country} className="flex items-center gap-2.5">
                  <span className="text-xs w-4 text-center">{getFlag(c.country)}</span>
                  <span className="text-xs font-medium text-slate-600 w-16 truncate">{c.country}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 w-8 text-right">{pct}%</span>
                  <span className="text-[10px] text-slate-400 w-14 text-right">{c.total_orders} orders</span>
                </div>
              );
            })}
            {(!stats?.countries || stats.countries.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-3">No regional data</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <button onClick={() => navigate('/projects')} className="text-[11px] text-teal-600 font-medium hover:text-teal-700 flex items-center gap-0.5">
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {stats?.recent_activities && stats.recent_activities.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {stats.recent_activities.slice(0, 8).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                <p className="text-xs text-slate-600 flex-1 truncate">{a.action}</p>
                {a.user_name && <span className="text-[11px] text-slate-500 font-medium">{a.user_name}</span>}
                <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default CEODashboard;
