import { useState, useEffect, useCallback } from 'react';
import { dashboardService, monthLockService, workflowService } from '../../services';
import type { OpsDashboardData, QueueHealth } from '../../types';
import { Users, Package, Inbox, CheckCircle, AlertTriangle, Lock, Unlock, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export default function OperationsManagerDashboard() {
  const [data, setData] = useState<OpsDashboardData | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockLoading, setLockLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await dashboardService.operations();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const loadQueueHealth = async (projectId: number) => {
    if (selectedProject === projectId) { setSelectedProject(null); return; }
    setSelectedProject(projectId);
    try {
      const res = await workflowService.queueHealth(projectId);
      setQueueHealth(res.data);
    } catch (e) { console.error(e); }
  };

  const handleLockMonth = async (projectId: number, month: number, year: number) => {
    setLockLoading(true);
    try {
      await monthLockService.lock(projectId, month, year);
      loadData();
    } catch (e) { console.error(e); }
    finally { setLockLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loading-shimmer w-full max-w-lg h-48 rounded-xl" /></div>;
  if (!data) return <div className="text-center text-slate-500 py-8">No data available</div>;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Operations Dashboard</h1>
          <p className="text-xs text-slate-500">{data.projects?.length || 0} project(s) assigned</p>
        </div>
        <button onClick={() => { setLoading(true); loadData(); }} className="text-xs text-teal-600 flex items-center gap-1 hover:text-teal-700">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Staff', value: data.total_active_staff ?? 0, icon: Users, color: 'text-teal-600 bg-teal-50' },
          { label: 'Absent', value: data.total_absent ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Total Pending', value: data.total_pending ?? 0, icon: Inbox, color: 'text-amber-600 bg-amber-50' },
          { label: 'Delivered Today', value: data.total_delivered_today ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.color}`}>
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {(data.projects || []).map((project: any) => (
          <div key={project.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => loadQueueHealth(project.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-teal-600" />
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-900">{project.name}</div>
                  <div className="text-[10px] text-slate-500">{project.country} · {project.department} · {project.workflow_type}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-700">{project.pending_count ?? 0} pending</div>
                  <div className="text-[10px] text-slate-400">{project.staff_count ?? 0} staff</div>
                </div>
                {selectedProject === project.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {selectedProject === project.id && queueHealth && (
              <div className="border-t border-slate-100 p-3 space-y-3">
                {/* Stage breakdown */}
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-2">Queue by Stage</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(queueHealth.stages || {}).map(([stage, counts]: [string, any]) => (
                      <div key={stage} className="bg-slate-50 rounded-lg p-2">
                        <div className="text-[10px] font-medium text-slate-600">{stage}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-amber-600">{counts.queued} queued</span>
                          <span className="text-xs text-teal-600">{counts.in_progress} active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staffing */}
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-2">Staffing</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(queueHealth.staffing || []).map((staff: any) => (
                      <div key={staff.user_id} className="bg-slate-50 rounded-lg p-2 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-medium text-slate-700">{staff.name}</div>
                          <div className="text-[10px] text-slate-400">{staff.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-700">{staff.wip_count} WIP</div>
                          <div className={`w-1.5 h-1.5 rounded-full inline-block ${staff.is_absent ? 'bg-red-400' : staff.is_online ? 'bg-green-400' : 'bg-slate-300'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Month Lock */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    {project.month_locked ? <Lock className="h-3.5 w-3.5 text-red-500" /> : <Unlock className="h-3.5 w-3.5 text-green-500" />}
                    <span className="text-xs text-slate-600">
                      {now.toLocaleString('default', { month: 'short' })} {currentYear} — {project.month_locked ? 'Locked' : 'Open'}
                    </span>
                  </div>
                  {!project.month_locked && (
                    <button
                      onClick={() => handleLockMonth(project.id, currentMonth, currentYear)}
                      disabled={lockLoading}
                      className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      Lock Month
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Absentees */}
      {(data.absentees?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-3">
          <div className="text-[10px] text-slate-500 uppercase mb-2">Absent Staff</div>
          <div className="space-y-1.5">
            {data.absentees!.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-700">{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{a.role}</span>
                  {a.reassigned_count > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{a.reassigned_count} reassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
