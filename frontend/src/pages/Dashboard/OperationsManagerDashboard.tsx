import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { OpsDashboardData, User } from '../../types';
import { AnimatedPage, PageHeader, StatCard, StatusBadge } from '../../components/ui';
import WorkerSidebar from '../../components/WorkerSidebar';
import { Users, AlertTriangle, Package, TrendingUp, ChevronRight, ChevronDown, Pencil, CheckSquare, Eye, Palette, Calendar } from 'lucide-react';


export default function OperationsManagerDashboard() {
  const [data, setData] = useState<OpsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [showWorkerSidebar, setShowWorkerSidebar] = useState(true);

  useEffect(() => {
    loadData();
    const i = setInterval(loadData, 30000);
    return () => clearInterval(i);
  }, []);

  const loadData = async () => {
    try {
      const res = await dashboardService.operations();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const roleIcons: Record<string, any> = {
    drawer: Pencil,
    checker: CheckSquare,
    qa: Eye,
    designer: Palette,
  };

  const roleColors: Record<string, string> = {
    drawer: 'blue',
    checker: 'violet',
    qa: 'emerald',
    designer: 'pink',
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}</div>
      <div className="h-56 bg-slate-100 animate-pulse rounded-xl" />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Failed to load dashboard.</div>;

  // Convert workers to User type for sidebar
  const workers: User[] = (data.workers || []).map((w: any) => ({
    ...w,
    country: '',
    department: '',
    project_id: null,
    team_id: null,
    layer: null,
    inactive_days: 0,
    daily_target: 0,
    shift_start: null,
    shift_end: null,
  }));

  return (
    <AnimatedPage>
      <div className="flex gap-6">
        {/* Worker Sidebar */}
        {showWorkerSidebar && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4">
              <WorkerSidebar
                workers={workers}
                selectedWorker={selectedWorker}
                onSelectWorker={setSelectedWorker}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Operations Dashboard"
            subtitle="Team performance and queue management"
            badge={
              <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                <span className="live-dot" /> Live
              </span>
            }
            actions={
              <button
                onClick={() => setShowWorkerSidebar(!showWorkerSidebar)}
                className="lg:hidden px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Toggle worker sidebar"
                aria-label="Toggle worker sidebar"
              >
                <Users className="h-4 w-4" />
              </button>
            }
          />

          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active Staff" value={data.total_active_staff ?? 0} icon={Users} color="brand" />
            <StatCard label="Absent" value={data.total_absent ?? 0} icon={AlertTriangle} color={(data.total_absent ?? 0) > 0 ? 'rose' : 'slate'} />
            <StatCard label="Pending Orders" value={data.total_pending ?? 0} icon={Package} color="amber" />
            <StatCard label="Delivered Today" value={data.total_delivered_today ?? 0} icon={TrendingUp} color="green" />
          </div>

          {/* Role-wise Statistics */}
          {data.role_stats && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" /> Role-wise Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.role_stats).map(([role, stats]) => {
                  const Icon = roleIcons[role] || Users;
                  const color = roleColors[role] || 'slate';
                  return (
                    <div key={role} className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg bg-${color}-50`}>
                          <Icon className={`h-4 w-4 text-${color}-600`} />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 capitalize">{role}s</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-brand-600">{stats.today_completed}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Done</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-amber-600">{stats.total_wip}</div>
                          <div className="text-[10px] text-slate-500 uppercase">WIP</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-teal-600">{stats.active}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Active</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-rose-600">{stats.absent}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Absent</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date-wise Statistics */}
          {data.date_stats && data.date_stats.length > 0 && (
            <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Last 7 Days Performance
              </h3>
              
              {/* Summary Chart */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {data.date_stats.map((day) => {
                  const maxVal = Math.max(...data.date_stats!.map(d => Math.max(d.received, d.delivered)));
                  const receivedHeight = maxVal > 0 ? (day.received / maxVal) * 60 : 0;
                  const deliveredHeight = maxVal > 0 ? (day.delivered / maxVal) * 60 : 0;
                  return (
                    <div key={day.date} className="text-center">
                      <div className="flex items-end justify-center gap-1 h-16 mb-1">
                        <div 
                          className="w-3 bg-blue-200 rounded-t" 
                          style={{ height: `${receivedHeight}px` }}
                          title={`Received: ${day.received}`}
                        />
                        <div 
                          className="w-3 bg-brand-400 rounded-t" 
                          style={{ height: `${deliveredHeight}px` }}
                          title={`Delivered: ${day.delivered}`}
                        />
                      </div>
                      <div className="text-xs font-medium text-slate-600">{day.label}</div>
                      <div className="text-[10px] text-slate-400">{day.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Role breakdown */}
              <div className="border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Completions by Role</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="text-left py-1 pr-4">Role</th>
                        {data.date_stats.map(day => (
                          <th key={day.date} className="text-center px-2 py-1">{day.label}</th>
                        ))}
                        <th className="text-center px-2 py-1 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['drawer', 'checker', 'qa', 'designer'].map(role => {
                        const total = data.date_stats!.reduce((sum, d) => sum + (d.by_role[role] || 0), 0);
                        if (total === 0 && !data.role_stats?.[role]) return null;
                        return (
                          <tr key={role} className="border-t border-slate-50">
                            <td className="py-2 pr-4 font-medium text-slate-700 capitalize">{role}</td>
                            {data.date_stats!.map(day => (
                              <td key={day.date} className="text-center px-2 py-2 text-slate-600">
                                {day.by_role[role] || 0}
                              </td>
                            ))}
                            <td className="text-center px-2 py-2 font-bold text-slate-900">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 bg-blue-200 rounded" /> Received
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3 h-3 bg-brand-400 rounded" /> Delivered
                </div>
              </div>
            </div>
          )}

          {/* Projects with queue health */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
            {(data.projects || []).map((item: any) => {
              const proj = item.project || item;
              const projId = proj.id || item.id;
              return (
              <div key={projId} className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
                <button
                  onClick={() => setExpandedProject(expandedProject === projId ? null : projId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{proj.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{proj.code} &middot; {proj.workflow_type}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-teal-600 font-medium">{item.active_staff ?? 0}/{item.total_staff ?? 0} staff</span>
                      <span className="text-amber-600 font-medium">{item.pending ?? 0} pending</span>
                      <span className="text-brand-600 font-medium">{item.delivered_today ?? 0} delivered</span>
                    </div>
                    {expandedProject === projId ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {expandedProject === projId && item.queue_health && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {/* Stage breakdown */}
                    {item.queue_health.stages && Object.keys(item.queue_health.stages).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Queue by Stage</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(item.queue_health.stages).map(([stage, count]) => (
                            <div key={stage} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                              <StatusBadge status={stage} size="xs" />
                              <span className="text-sm font-semibold text-slate-700">{count as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff */}
                    {item.queue_health.staffing && item.queue_health.staffing.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Staff</h4>
                        <div className="space-y-1.5">
                          {(item.queue_health.staffing as any[]).map((s: any) => (
                            <div key={s.id} className={`flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm ${selectedWorker === s.id ? 'ring-2 ring-[#2AA7A0]' : ''}`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${s.is_absent ? 'bg-rose-500' : s.is_online ? 'bg-brand-500' : 'bg-slate-300'}`} />
                                <span className="font-medium text-slate-700">{s.name}</span>
                                <span className="text-xs text-slate-400 capitalize">{s.role}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>WIP: {s.wip_count}</span>
                                <span className="text-brand-600 font-medium">Done: {s.today_completed}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Absentees */}
          {(data.absentees?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Absent Staff</h3>
              <div className="space-y-2">
                {data.absentees!.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{a.name}</span>
                      <span className="text-xs text-slate-400 capitalize">{a.role}</span>
                    </div>
                    {a.reassigned_count > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">{a.reassigned_count} reassigned</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
