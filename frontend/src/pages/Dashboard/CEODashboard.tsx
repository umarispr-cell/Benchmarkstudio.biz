import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { dashboardService } from '../../services';
import {
  Users,
  FolderKanban,
  ClipboardCheck,
  BarChart3,
  Activity,
  Globe,
  Sparkles,
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

  const completionRate = stats ? Math.round((stats.overview.completed_orders / Math.max(stats.overview.total_orders, 1)) * 100) : 0;

  const statCards = [
    {
      title: 'Total Projects',
      value: stats?.overview.total_projects || 0,
      subtitle: `${stats?.overview.active_projects || 0} active projects`,
      icon: FolderKanban,
      gradient: 'from-teal-500 to-cyan-600',
      bgLight: 'bg-teal-50',
    },
    {
      title: 'Total Orders',
      value: stats?.overview.total_orders || 0,
      subtitle: 'Across all countries',
      icon: Activity,
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
    },
    {
      title: 'Completed',
      value: stats?.overview.completed_orders || 0,
      subtitle: 'Orders delivered',
      icon: ClipboardCheck,
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
    },
    {
      title: 'Team Members',
      value: stats?.overview.total_users || 0,
      subtitle: `${stats?.overview.active_users || 0} currently active`,
      icon: Users,
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Overview</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Here's what's happening across your organization today.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="input py-3 px-4 min-w-[180px] bg-white"
            aria-label="Select country filter"
          >
            <option value="all">🌍 All Countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-20"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.title} 
                  className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background Gradient on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                      <p className="text-sm text-slate-400">{stat.subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Completion Rate Card */}
            <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl shadow-teal-500/20 relative overflow-hidden">
              {/* Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-teal-200 text-sm font-medium">Performance Score</p>
                    <h3 className="text-4xl font-bold mt-1">{completionRate}%</h3>
                  </div>
                  <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-teal-200">Completion Rate</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Country Performance */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100">
                    <Globe className="h-5 w-5 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Regional Performance</h3>
                </div>
                <button onClick={() => navigate('/projects')} className="text-sm text-teal-600 font-medium hover:text-teal-700">View All</button>
              </div>
              
              <div className="space-y-4">
                {stats?.countries?.map((countryData: any) => {
                  const getCountryFlag = (country: string) => {
                    const flags: Record<string, string> = { UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' };
                    return flags[country] || '🌍';
                  };
                  const progress = countryData.total_orders > 0 
                    ? Math.round((countryData.completed_orders / countryData.total_orders) * 100) 
                    : 0;
                  return (
                    <div key={countryData.country} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getCountryFlag(countryData.country)}</span>
                          <span className="font-medium text-slate-700">{countryData.country}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">{progress}%</span>
                          <span className="text-xs text-slate-500">{countryData.total_orders} orders</span>
                          <span className="badge badge-success">{countryData.active_projects} active</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 group-hover:from-teal-600 group-hover:to-cyan-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!stats?.countries || stats.countries.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No regional data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100">
                  <Activity className="h-5 w-5 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
              </div>
              <button onClick={() => navigate('/projects')} className="text-sm text-teal-600 font-medium hover:text-teal-700">View All</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats?.recent_activities?.slice(0, 6).map((activity: any, i: number) => {
                const getTimeAgo = (date: string) => {
                  const now = new Date();
                  const activityDate = new Date(date);
                  const diffMs = now.getTime() - activityDate.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 60) return `${diffMins} min ago`;
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  const diffDays = Math.floor(diffHours / 24);
                  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                };
                const colors = ['emerald', 'blue', 'violet', 'amber', 'rose', 'cyan'];
                return (
                  <div key={i} className="group p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 bg-${colors[i % colors.length]}-500`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-teal-600 transition-colors">{activity.action}</p>
                        <p className="text-sm text-slate-500 truncate">{activity.description || activity.user_name}</p>
                        <p className="text-xs text-slate-400 mt-1">{getTimeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.recent_activities || stats.recent_activities.length === 0) && (
                <div className="col-span-full text-center py-8 text-slate-500">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CEODashboard;
