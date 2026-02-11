import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { workflowService, userService, projectService } from '../../services';
import type { Order, User, Project } from '../../types';
import { 
  UserPlus, Clock, CheckCircle, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, Zap
} from 'lucide-react';

interface Assignment {
  order_id: number;
  user_id: number;
}

const SupervisorAssignment = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Map<number, number>>(new Map());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  const canAssign = ['ceo', 'director', 'operations_manager', 'supervisor'].includes(user?.role || '');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadOrders();
    }
  }, [selectedProject]);

  const loadInitialData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectService.getAll(),
        userService.getAll({ role: 'worker,designer,drawer' }),
      ]);
      setProjects(projectsRes.data);
      setTeamMembers(usersRes.data);
      if (projectsRes.data.length > 0) {
        setSelectedProject(projectsRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const response = await workflowService.getRecentlyImported({ 
        project_id: selectedProject 
      });
      setOrders(response.data);
      setAssignments(new Map());
      setSelectedOrders(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (orderId: number, userId: number) => {
    const newAssignments = new Map(assignments);
    if (userId === 0) {
      newAssignments.delete(orderId);
    } else {
      newAssignments.set(orderId, userId);
    }
    setAssignments(newAssignments);
  };

  const handleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
    setSelectAll(newSelected.size === orders.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders(new Set());
      setSelectAll(false);
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
      setSelectAll(true);
    }
  };

  const handleBulkAssignToUser = (userId: number) => {
    const newAssignments = new Map(assignments);
    selectedOrders.forEach(orderId => {
      newAssignments.set(orderId, userId);
    });
    setAssignments(newAssignments);
  };

  const handleSubmitAssignments = async () => {
    if (assignments.size === 0) return;

    try {
      setAssigning(true);
      const assignmentData: Assignment[] = Array.from(assignments.entries()).map(
        ([order_id, user_id]) => ({ order_id, user_id })
      );
      
      await workflowService.bulkAssign(assignmentData);
      loadOrders();
    } catch (error) {
      console.error('Failed to assign orders:', error);
    } finally {
      setAssigning(false);
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600' };
      case 'high': return { color: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', text: 'text-orange-600' };
      case 'medium': return { color: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50', text: 'text-yellow-600' };
      case 'low': return { color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600' };
      default: return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  if (!canAssign) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibull text-slate-900">Access Restricted</h2>
          <p className="text-slate-500 mt-2">You don't have permissions to assign orders.</p>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-violet-600 uppercase tracking-wider">Assign</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Supervisor Assignment</h1>
          <p className="text-slate-500 mt-2">Assign imported orders to team members</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-violet-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {assignments.size > 0 && (
            <button
              onClick={handleSubmitAssignments}
              disabled={assigning}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Assign {assignments.size} Orders
            </button>
          )}
        </div>
      </div>

      {/* Project Selector & Bulk Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Project</label>
            <div className="relative">
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(Number(e.target.value))}
                className="w-full lg:w-64 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 appearance-none cursor-pointer"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedOrders.size > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign {selectedOrders.size} selected to:
              </label>
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAssignToUser(Number(e.target.value));
                    }
                  }}
                  className="w-full lg:w-64 pl-4 pr-10 py-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 appearance-none cursor-pointer"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Unassigned', value: orders.length, color: 'from-amber-500 to-orange-600', icon: Clock },
          { label: 'Urgent', value: orders.filter(o => o.priority === 'urgent').length, color: 'from-rose-500 to-red-600', icon: Zap },
          { label: 'High Priority', value: orders.filter(o => o.priority === 'high').length, color: 'from-orange-500 to-amber-600', icon: AlertTriangle },
          { label: 'To Assign', value: assignments.size, color: 'from-violet-500 to-purple-600', icon: UserPlus },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">All Assigned!</h2>
          <p className="text-slate-500 mt-2">No unassigned orders in this project.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Imported</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const priorityConfig = getPriorityConfig(order.priority);
                  const isSelected = selectedOrders.has(order.id);
                  const assignedTo = assignments.get(order.id);

                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${isSelected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOrder(order.id)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{order.order_number}</p>
                          <p className="text-sm text-slate-500 truncate max-w-xs">{order.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-lg capitalize ${priorityConfig.bg} ${priorityConfig.text}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {order.due_date 
                          ? new Date(order.due_date).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <select
                            value={assignedTo || ''}
                            onChange={(e) => handleAssignmentChange(order.id, Number(e.target.value))}
                            className={`w-48 pl-3 pr-8 py-2 border rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
                              assignedTo 
                                ? 'bg-violet-50 border-violet-200 text-violet-700' 
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="">Select...</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorAssignment;
