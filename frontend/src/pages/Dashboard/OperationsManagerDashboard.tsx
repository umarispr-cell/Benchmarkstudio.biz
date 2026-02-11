import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { projectService } from '../../services';
import { FolderKanban, Users, Clock, CheckCircle, ArrowRight, Building, Eye, Sparkles } from 'lucide-react';

const OperationsManagerDashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await projectService.getAll();
      setProjects(projectsData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = { UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' };
    return flags[country] || '🌍';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Operations</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 mt-2">Manage your assigned projects and teams</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/30' },
              { label: 'Active Staff', value: projects.reduce((sum, p) => sum + (p.total_staff || 0), 0), icon: Users, color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
              { label: 'Pending Orders', value: projects.reduce((sum, p) => sum + (p.pending_orders || 0), 0), icon: Clock, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
              { label: 'Completed Today', value: projects.reduce((sum, p) => sum + (p.completed_today || 0), 0), icon: CheckCircle, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30' },
            ].map((stat, index) => (
              <div key={index} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Projects Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">My Projects</h3>
                  <p className="text-slate-500 text-sm mt-1">Projects assigned to your region</p>
                </div>
                <button className="btn btn-secondary">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                          <FolderKanban className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-900 font-semibold">No projects assigned</p>
                        <p className="text-slate-500 text-sm mt-1">Projects will appear here once assigned</p>
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30">
                              {project.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{project.name}</p>
                              <p className="text-xs text-slate-500">{project.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(project.country)}</span>
                            <span className="text-slate-700">{project.country}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            <Building className="w-3.5 h-3.5" />
                            {project.department?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-slate-600">{project.pending_orders || 0} pending</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-slate-600">{project.completed_orders || 0} completed</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button className="btn btn-ghost opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OperationsManagerDashboard;
