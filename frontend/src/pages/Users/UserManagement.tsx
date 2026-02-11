import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { userService } from '../../services';
import type { User } from '../../types';
import { Users, Plus, Search, Edit, Trash2, UserCheck, UserX, Activity, Shield, Building, ArrowRight, Crown, Briefcase, Palette, CheckCircle } from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, [selectedRole, selectedCountry]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedRole !== 'all') params.role = selectedRole;
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (searchTerm) params.search = searchTerm;
      
      const response = await userService.getAll(params);
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ceo': return { color: 'from-violet-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Crown };
      case 'director': return { color: 'from-teal-500 to-cyan-600', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: Shield };
      case 'operations_manager': return { color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Briefcase };
      case 'accounts_manager': return { color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Briefcase };
      case 'worker': return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: Users };
      case 'designer': return { color: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: Palette };
      case 'qa': return { color: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: CheckCircle };
      default: return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: Users };
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = { UK: '🇬🇧', Australia: '🇦🇺', Canada: '🇨🇦', USA: '🇺🇸' };
    return flags[country] || '🌍';
  };

  const canManageUsers = ['ceo', 'director', 'operations_manager'].includes(currentUser?.role || '');

  const filteredUsers = users.filter(user => 
    searchTerm === '' || 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Team</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-2">Manage staff members and permissions</p>
        </div>
        {canManageUsers && (
          <button className="btn btn-primary group">
            <Plus className="w-4 h-4" />
            Add User
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'from-slate-500 to-gray-600', icon: Users },
          { label: 'Active', value: users.filter(u => u.is_active).length, color: 'from-emerald-500 to-green-600', icon: UserCheck },
          { label: 'Managers', value: users.filter(u => ['ceo', 'director', 'operations_manager'].includes(u.role)).length, color: 'from-violet-500 to-purple-600', icon: Shield },
          { label: 'Workers', value: users.filter(u => ['worker', 'designer', 'qa'].includes(u.role)).length, color: 'from-teal-500 to-cyan-600', icon: Briefcase },
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-emerald-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input pl-11"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input"
            aria-label="Filter by role"
          >
            <option value="all">👤 All Roles</option>
            <option value="ceo">👑 CEO</option>
            <option value="director">🛡️ Director</option>
            <option value="operations_manager">📋 Operations Manager</option>
            <option value="accounts_manager">💼 Accounts Manager</option>
            <option value="worker">🔧 Worker</option>
            <option value="designer">🎨 Designer</option>
            <option value="qa">✅ QA</option>
          </select>

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

          <button onClick={handleSearch} className="btn btn-secondary">
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading users...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredUsers.map((user) => {
            const roleConfig = getRoleConfig(user.role);
            const RoleIcon = roleConfig.icon;
            
            return (
              <div key={user.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200/50 transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${roleConfig.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <span className="text-white font-bold text-xl">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Status indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">{user.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${roleConfig.bg} ${roleConfig.text} border ${roleConfig.border}`}>
                          <RoleIcon className="w-3 h-3" />
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-slate-500">{user.email}</div>
                      
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {user.country && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{getCountryFlag(user.country)}</span>
                            {user.country}
                          </span>
                        )}
                        {user.department && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {user.department.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>

                      {user.last_activity && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                          <Activity className="w-3.5 h-3.5" />
                          Last active: {new Date(user.last_activity).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {canManageUsers && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110"
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          aria-label={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.is_active ? (
                            <UserX className="w-4 h-4 text-amber-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" aria-label="Edit user">
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button className="p-2.5 hover:bg-rose-100 rounded-xl transition-all hover:scale-110" aria-label="Delete user">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No users found</h3>
                <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search filters or add a new team member.</p>
                {canManageUsers && (
                  <button className="btn btn-primary mt-6">
                    <Plus className="w-4 h-4" />
                    Add First User
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

export default UserManagement;
