import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { projectService } from '../../services';
import type { Project } from '../../types';
import { FolderKanban, Plus, Search, Edit, Trash2, Users, BarChart3, TrendingUp, MapPin, Building, ArrowRight } from 'lucide-react';

const ProjectManagement = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, [selectedCountry, selectedDepartment]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (selectedDepartment !== 'all') params.department = selectedDepartment;
      if (searchTerm) params.search = searchTerm;
      
      const response = await projectService.getAll(params);
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadProjects();
  };

  const canManageProjects = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  const filteredProjects = projects.filter(project => 
    searchTerm === '' || 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = { UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' };
    return flags[country] || '🌍';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Projects</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500 mt-2">Manage and monitor projects across all regions</p>
        </div>
        {canManageProjects && (
          <button className="btn btn-primary group">
            <Plus className="w-4 h-4" />
            New Project
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-teal-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input pl-11"
            />
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="input"
            aria-label="Filter by country"
          >
            <option value="all">🌍 All Countries</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="Australia">🇦🇺 Australia</option>
            <option value="Canada">🇨🇦 Canada</option>
            <option value="USA">🇺🇸 USA</option>
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="input"
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            <option value="floor_plan">Floor Plan</option>
            <option value="photos_enhancement">Photos Enhancement</option>
          </select>

          <button onClick={handleSearch} className="btn btn-secondary">
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, color: 'from-teal-500 to-cyan-600', icon: FolderKanban },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, color: 'from-emerald-500 to-green-600', icon: TrendingUp },
          { label: 'Countries', value: new Set(projects.map(p => p.country)).size, color: 'from-amber-500 to-orange-600', icon: MapPin },
          { label: 'Total Teams', value: projects.reduce((sum, p) => sum + (p.total_teams || 0), 0), color: 'from-violet-500 to-purple-600', icon: Users },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
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

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading projects...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-teal-200/50 transition-all duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                      <FolderKanban className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{project.name}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{project.code}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          project.status === 'active' 
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/30' 
                            : project.status === 'completed' 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm shadow-blue-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/30'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="text-lg">{getCountryFlag(project.country)}</span>
                          {project.country}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1.5">
                          <Building className="w-4 h-4" />
                          {project.department.replace('_', ' ')}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="font-medium text-slate-700">{project.client_name}</span>
                      </div>
                    </div>
                  </div>

                  {canManageProjects && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" aria-label="View statistics">
                        <BarChart3 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" aria-label="Manage teams">
                        <Users className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" aria-label="Edit project">
                        <Edit className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2.5 hover:bg-rose-100 rounded-xl transition-all hover:scale-110" aria-label="Delete project">
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: project.total_orders, color: 'text-slate-900', bg: 'bg-slate-50' },
                    { label: 'Completed', value: project.completed_orders, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Teams', value: project.total_teams, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Staff', value: project.total_staff, color: 'text-violet-600', bg: 'bg-violet-50' },
                  ].map((stat, index) => (
                    <div key={index} className={`${stat.bg} rounded-xl p-4 text-center`}>
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                {project.total_orders > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium text-slate-600">Completion Rate</span>
                      <span className="font-bold text-emerald-600">
                        {Math.round((project.completed_orders / project.total_orders) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${(project.completed_orders / project.total_orders) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                  <FolderKanban className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No projects found</h3>
                <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search filters or create a new project to get started.</p>
                {canManageProjects && (
                  <button className="btn btn-primary mt-6">
                    <Plus className="w-4 h-4" />
                    Create First Project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
