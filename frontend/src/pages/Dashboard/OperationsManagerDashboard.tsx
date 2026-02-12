import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { projectService } from '../../services';
import {
  FolderKanban,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Eye,
  Building,
  TrendingUp,
} from 'lucide-react';

const OperationsManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll();
      setProjects(data.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFlag = (c: string) => ({ UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' }[c] || '🌍');

  const totalStaff = projects.reduce((s, p) => s + (p.total_staff || 0), 0);
  const totalPending = projects.reduce((s, p) => s + (p.pending_orders || 0), 0);
  const totalCompleted = projects.reduce((s, p) => s + (p.completed_today || 0), 0);

  const stats = [
    { label: 'Projects', value: projects.length, icon: FolderKanban, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Active Staff', value: totalStaff, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending', value: totalPending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Done Today', value: totalCompleted, icon: CheckCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

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
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your assigned projects and teams</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between mb-2.5">
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
                {i === 3 && s.value > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">My Projects</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Projects in your region</p>
          </div>
          <button onClick={() => navigate('/projects')} className="text-[11px] text-teal-600 font-medium hover:text-teal-700 flex items-center gap-0.5">
            View All <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Country</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orders</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <FolderKanban className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No projects assigned</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Projects will appear here once assigned</p>
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-600 transition-colors truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{getFlag(p.country)}</span>
                        <span className="text-xs text-slate-600">{p.country}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        <Building className="w-3 h-3" />
                        {p.department?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" />{p.pending_orders || 0}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-3 h-3" />{p.completed_orders || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button onClick={() => navigate('/projects')} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationsManagerDashboard;
