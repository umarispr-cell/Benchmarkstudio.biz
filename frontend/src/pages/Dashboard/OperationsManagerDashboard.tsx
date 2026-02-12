import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { OpsDashboardData } from '../../types';
import { AnimatedPage, PageHeader, StatCard, StatusBadge } from '../../components/ui';
import { Users, AlertTriangle, Package, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';


export default function OperationsManagerDashboard() {
  const [data, setData] = useState<OpsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

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

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 loading-skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 loading-skeleton" />)}</div>
      <div className="h-64 loading-skeleton" />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Failed to load dashboard.</div>;

  return (
    <AnimatedPage>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Team performance and queue management"
        badge={
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <span className="live-dot" /> Live
          </span>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Staff" value={data.total_active_staff ?? 0} icon={Users} color="teal" />
        <StatCard label="Absent" value={data.total_absent ?? 0} icon={AlertTriangle} color={(data.total_absent ?? 0) > 0 ? 'rose' : 'slate'} />
        <StatCard label="Pending Orders" value={data.total_pending ?? 0} icon={Package} color="amber" />
        <StatCard label="Delivered Today" value={data.total_delivered_today ?? 0} icon={TrendingUp} color="green" />
      </div>

      {/* Projects with queue health */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
        {(data.projects || []).map((project: any) => (
          <div key={project.id} className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <button
              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{project.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{project.code} &middot; {project.workflow_type}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-amber-600 font-medium">{project.pending ?? 0} pending</span>
                </div>
                {expandedProject === project.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {expandedProject === project.id && project.queue_health && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                {/* Stage breakdown */}
                {project.queue_health.stages && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Queue by Stage</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(project.queue_health.stages).map(([stage, count]) => (
                        <div key={stage} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                          <StatusBadge status={stage} size="xs" />
                          <span className="text-sm font-semibold text-slate-700">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff */}
                {project.queue_health.staffing && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Staff</h4>
                    <div className="space-y-1.5">
                      {(project.queue_health.staffing as any[]).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${s.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="font-medium text-slate-700">{s.name}</span>
                            <span className="text-xs text-slate-400">{s.role}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>WIP: {s.wip_count}</span>
                            <span>Done: {s.today_completed}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Absentees */}
      {(data.absentees?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
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
    </AnimatedPage>
  );
}
