import { useState, useEffect } from 'react';
import { dashboardService, projectService } from '../../services';
import { useSmartPolling } from '../../hooks/useSmartPolling';
import type { PMDashboardData } from '../../types';
import { AnimatedPage, PageHeader, StatCard, PMDashboardSkeleton } from '../../components/ui';
import {
  Package, TrendingUp, Clock, Users, ChevronDown, ChevronRight,
  Pencil, CheckSquare, Eye, Palette, CircleDot, UserCheck, AlertTriangle, Info,
  Plus, Trash2, X,
} from 'lucide-react';

export default function ProjectManagerDashboard() {
  const [data, setData] = useState<PMDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'staff' | 'queue' | 'teams'>('projects');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');

  const loadData = async () => {
    try {
      const res = await dashboardService.projectManager();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Smart Polling: only reload when data actually changes ── */
  useSmartPolling({
    scope: 'all',
    interval: 10_000,
    onDataChanged: loadData,
  });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !data?.projects?.length) return;
    const projectId = data.projects[0]?.project?.id;
    if (!projectId) return;
    try {
      setCreatingTeam(true);
      setTeamError('');
      await projectService.createTeam(projectId, newTeamName.trim());
      setNewTeamName('');
      setShowCreateTeam(false);
      loadData();
    } catch (e: any) {
      setTeamError(e?.response?.data?.message || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!data?.projects?.length) return;
    const projectId = data.projects[0]?.project?.id;
    if (!projectId) return;
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await projectService.deleteTeam(projectId, teamId);
      loadData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete team');
    }
  };

  const roleIcons: Record<string, React.ElementType> = {
    drawer: Pencil,
    checker: CheckSquare,
    qa: Eye,
    designer: Palette,
  };

  const roleColors: Record<string, { bg: string; text: string }> = {
    drawer:   { bg: 'bg-blue-50',    text: 'text-blue-700' },
    checker:  { bg: 'bg-violet-50',  text: 'text-violet-700' },
    qa:       { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    designer: { bg: 'bg-pink-50',    text: 'text-pink-700' },
  };

  // Department-based layer labels
  const hasFP = data?.projects?.some(p => p.project.workflow_type !== 'PH_2_LAYER');
  const hasPE = data?.projects?.some(p => p.project.workflow_type === 'PH_2_LAYER');
  const departmentLabel = hasFP && hasPE ? 'Floor Plan + Photos' : hasPE ? 'Photos Enhancement' : 'Floor Plan';
  const departmentLayers = data?.department_roles || [];
  const layerLabel = departmentLayers.length > 0
    ? `${departmentLayers.length} Layers: ${departmentLayers.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' → ')}`
    : '';

  const stateLabels: Record<string, string> = {
    RECEIVED: 'Received',
    PENDING_QA_REVIEW: 'QA Review',
    QUEUED_DRAW: 'Queue (Draw)',
    IN_DRAW: 'In Drawing',
    SUBMITTED_DRAW: 'Submitted (Draw)',
    QUEUED_CHECK: 'Queue (Check)',
    IN_CHECK: 'In Checking',
    SUBMITTED_CHECK: 'Submitted (Check)',
    QUEUED_QA: 'Queue (QA)',
    IN_QA: 'In QA',
    APPROVED_QA: 'Approved',
    QUEUED_DESIGN: 'Queue (Design)',
    IN_DESIGN: 'In Design',
    SUBMITTED_DESIGN: 'Submitted (Design)',
    DELIVERED: 'Delivered',
    ON_HOLD: 'On Hold',
    CANCELLED: 'Cancelled',
    REJECTED_BY_CHECK: 'Rejected (Check)',
    REJECTED_BY_QA: 'Rejected (QA)',
  };

  if (loading) return (
    <AnimatedPage>
      <PMDashboardSkeleton />
    </AnimatedPage>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Failed to load dashboard.</div>;

  const filteredStaff = data.staff_report.filter(
    (s) => departmentLayers.length === 0 || departmentLayers.includes(s.role)
  );

  const tabs = [
    { key: 'projects' as const, label: 'My Projects', count: data.projects.length },
    { key: 'staff' as const, label: 'Staff Report', count: filteredStaff.length },
    { key: 'queue' as const, label: 'Order Queue', count: data.order_queue.length },
    { key: 'teams' as const, label: 'Teams', count: data.team_performance.length },
  ];

  return (
    <AnimatedPage>
      <div className="min-w-0">
        <PageHeader
          title="Project Manager Dashboard"
          subtitle={data.projects.length > 0
            ? `${data.projects.length} project${data.projects.length !== 1 ? 's' : ''} · ${departmentLabel} · ${layerLabel}`
            : 'No projects assigned'}
          badge={
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
              <span className="live-dot" /> Live
            </span>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Received Today" value={data.totals.received_today ?? 0} icon={Package} color="brand" />
          <StatCard label="Pending" value={data.totals.pending} icon={Clock} color="amber" />
          <StatCard label="In Progress" value={data.totals.in_progress} icon={CircleDot} color="blue" />
          <StatCard label="Delivered Today" value={data.totals.delivered_today} icon={TrendingUp} color="green" />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-brand-50 text-brand-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {data.projects.map((item) => {
              const isExpanded = expandedProject === item.project.id;
              return (
                <div key={item.project.id} className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : item.project.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.project.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.project.code} · {item.project.country} · {item.project.workflow_type === 'FP_3_LAYER' ? 'Floor Plan' : 'Photos'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Pending</div>
                        <div className="text-sm font-bold text-amber-600">{item.pending}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">In Progress</div>
                        <div className="text-sm font-bold text-blue-600">{item.in_progress}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Delivered</div>
                        <div className="text-sm font-bold text-emerald-600">{item.delivered_today}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Staff</div>
                        <div className="text-sm font-bold text-slate-700">{item.active_staff}/{item.total_staff}</div>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && Object.keys(item.queue_stages).length > 0 && (
                    <div className="px-5 pb-4 border-t border-slate-100">
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Queue Stages</h4>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {Object.entries(item.queue_stages).map(([state, count]) => (
                            <div key={state} className="bg-slate-50 rounded-lg p-2.5 text-center">
                              <div className="text-lg font-bold text-slate-900">{count}</div>
                              <div className="text-[10px] text-slate-500 uppercase mt-0.5">{stateLabels[state] || state}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {data.projects.length === 0 && (
              <div className="text-center py-12 text-slate-500">No projects assigned to you.</div>
            )}
          </div>
        )}

        {/* Staff Report Tab */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Staff Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Assigned</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Active (WIP)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.staff_report
                    .filter((staff) => departmentLayers.length === 0 || departmentLayers.includes(staff.role))
                    .map((staff) => {
                    const RoleIcon = roleIcons[staff.role] || Users;
                    const colors = roleColors[staff.role] || { bg: 'bg-slate-50', text: 'text-slate-700' };
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${staff.is_online ? 'bg-emerald-500' : staff.is_absent ? 'bg-red-400' : 'bg-slate-300'}`} />
                            <span className="text-sm font-medium text-slate-900">{staff.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            <RoleIcon className="h-3 w-3" />
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {staff.is_absent ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="h-3 w-3" /> Absent
                            </span>
                          ) : staff.is_online ? (
                            <span className="text-xs text-emerald-600 font-medium">Online</span>
                          ) : (
                            <span className="text-xs text-slate-400">Offline</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-blue-600">{staff.assigned_work}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-emerald-600">{staff.completed_today}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-amber-600">{staff.pending_work}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-slate-700">{staff.wip_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            (staff.assignment_score ?? 0) >= 0.7 ? 'bg-emerald-50 text-emerald-700' :
                            (staff.assignment_score ?? 0) >= 0.4 ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {((staff.assignment_score ?? 0) * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredStaff.length === 0 && (
              <div className="text-center py-8 text-slate-500">No staff members found.</div>
            )}
          </div>
        )}

        {/* Order Queue Tab */}
        {activeTab === 'queue' && (
          <div className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Unassigned Orders</h3>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {data.order_queue.length}
              </span>
            </div>
            {data.order_queue.length > 0 && (
              <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Orders are automatically assigned to available staff based on workload and priority.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Received</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">State</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Waiting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...data.order_queue].sort((a, b) => {
                    const pw: Record<string, number> = { rush: 0, urgent: 0, high: 1, normal: 2, low: 3 };
                    return (pw[a.priority] ?? 2) - (pw[b.priority] ?? 2);
                  }).map((order) => {
                    const waitMs = Date.now() - new Date(order.received_at).getTime();
                    const waitH = Math.floor(waitMs / 3600000);
                    const waitM = Math.floor((waitMs % 3600000) / 60000);
                    const waitStr = waitH > 24 ? `${Math.floor(waitH / 24)}d ${waitH % 24}h` : waitH > 0 ? `${waitH}h ${waitM}m` : `${waitM}m`;
                    return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{order.client_reference || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 truncate max-w-[160px]" title={(order as any).address || ''}>{(order as any).address || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                          order.priority === 'high' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500">{new Date(order.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        <div className="text-[10px] text-blue-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(order.received_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {stateLabels[order.workflow_state] || order.workflow_state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${
                          waitH > 24 ? 'text-red-600' : waitH > 4 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {waitStr}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.order_queue.length === 0 && (
              <div className="text-center py-8 text-slate-500">All orders are assigned. Queue is empty.</div>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {/* Add Team Button */}
            <div className="flex justify-end">
              <button
                onClick={() => { setShowCreateTeam(true); setTeamError(''); setNewTeamName(''); }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Team
              </button>
            </div>

            {/* Create Team Modal */}
            {showCreateTeam && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateTeam(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="text-lg font-semibold text-slate-900">Create New Team</h3>
                    <button onClick={() => setShowCreateTeam(false)} className="p-1 rounded-lg hover:bg-slate-100" title="Close"><X className="h-5 w-5 text-slate-400" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Team Name</label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder="e.g. Team Eight"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                      />
                    </div>
                    {teamError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{teamError}</div>}
                  </div>
                  <div className="flex justify-end gap-3 p-5 border-t bg-slate-50 rounded-b-2xl">
                    <button onClick={() => setShowCreateTeam(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                    <button
                      onClick={handleCreateTeam}
                      disabled={!newTeamName.trim() || creatingTeam}
                      className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingTeam ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {data.team_performance.map((team) => (
              <div key={team.id} className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{team.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {team.project_code} · QA Lead: {team.qa_lead}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">{team.active_staff}/{team.staff_count}</span>
                    </div>
                    {team.staff_count === 0 && (
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-brand-600">{team.staff_count}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Staff</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-emerald-600">{team.active_staff}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Active</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-600">{team.pending ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Pending</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-600">{team.delivered_today ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Delivered</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-teal-600">{team.today_completed}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-brand-700">{team.efficiency ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Per Person</div>
                  </div>
                </div>
              </div>
            ))}
            {data.team_performance.length === 0 && (
              <div className="text-center py-12 text-slate-500">No teams found.</div>
            )}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
