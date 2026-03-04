import { useState, useEffect, useCallback, useMemo, Component, type ReactNode, type ErrorInfo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { dashboardService } from '../../services';
import { useSmartPolling } from '../../hooks/useSmartPolling';
import type { MasterDashboard } from '../../types';
import { AnimatedPage, PageHeader, StatCard, CEODashboardSkeleton } from '../../components/ui';
import { Users, Package, TrendingUp, AlertTriangle, Layers, Globe, ChevronRight, ChevronDown, Calendar, LayoutDashboard, Clock, Target, Activity, UsersRound, UserX } from 'lucide-react';
import DailyOperationsView from './DailyOperationsView';

const COLORS = ['#2AA7A0', '#C45C26', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

type TabType = 'overview' | 'daily-operations';

/* ── per-section error boundary — crash is contained, not page-wide ── */
class Safe extends Component<{ id: string; children: ReactNode }, { err: string | null }> {
  state: { err: string | null } = { err: null };
  static getDerivedStateFromError(e: Error) { return { err: e?.message || String(e) }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error(`[CEODashboard:${this.props.id}]`, e, info); }
  render() {
    if (this.state.err) return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 my-2 text-xs text-rose-700">
        <strong>Section &quot;{this.props.id}&quot; error:</strong> {this.state.err}
      </div>
    );
    return this.props.children;
  }
}

/* ── safe value helpers — prevents React #310 ── */
const S = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};
const N = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function CEODashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<MasterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await dashboardService.master();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSmartPolling({ scope: 'all', interval: 60_000, onDataChanged: loadData });

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'daily-operations' as TabType, label: 'Daily Operations', icon: Calendar },
  ];

  if (loading && activeTab === 'overview') return <AnimatedPage><CEODashboardSkeleton /></AnimatedPage>;
  if (!data && activeTab === 'overview') return <div className="text-center py-20 text-slate-500">Failed to load dashboard data.</div>;

  const org = data?.org_totals;

  const rawEfficiency = org && N(org.orders_received_month) > 0
    ? Math.round((N(org.orders_delivered_month) / N(org.orders_received_month)) * 100) : 0;
  const efficiency = Math.min(rawEfficiency, 100);

  return (
    <AnimatedPage>
      <PageHeader
        title={user?.role === 'director' ? 'Director Dashboard' : 'CEO Dashboard'}
        subtitle="Organization overview across all countries and departments"
        badge={
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full ring-1 ring-brand-200">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> Live
          </span>
        }
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={loading && activeTab !== tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'daily-operations' ? (
        <DailyOperationsView />
      ) : org && data && (
        <>

      {/* KPI Cards */}
      <Safe id="KPI">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active Staff" value={N(org.active_staff)} subtitle={`of ${N(org.total_staff)} total`} icon={Users} color="blue" />
        <StatCard label="Absentees" value={N(org.absentees)} icon={AlertTriangle} color={N(org.absentees) > 0 ? 'rose' : 'slate'} />
        <StatCard label="Received Today" value={N(org.orders_received_today)} icon={Package} color="blue" />
        <StatCard label="Delivered Today" value={N(org.orders_delivered_today)} icon={TrendingUp} color="green" />
        <StatCard label="Total Pending" value={N(org.total_pending)} icon={Layers} color={N(org.total_pending) > 20 ? 'amber' : 'slate'} />
        <StatCard label="Efficiency" value={`${efficiency}%`} subtitle={rawEfficiency > 100 ? `${rawEfficiency}% — clearing backlog` : 'This month'} icon={TrendingUp} color="brand" />
      </div>
      </Safe>

      {/* Inactive Staff Alert */}
      {N(org.inactive_flagged) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <UserX className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <span className="text-sm font-medium text-amber-800">{N(org.inactive_flagged)} staff flagged as inactive</span>
            <span className="text-xs text-amber-600 ml-2">(15+ days without activity)</span>
          </div>
        </div>
      )}

      {/* Overtime & Productivity Analysis */}
      <Safe id="Overtime">
      <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Overtime &amp; Productivity Analysis</h3>
            <p className="text-xs text-slate-500">{N(org.standard_shift_hours) || 9}-hour standard shift · Today&apos;s performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">Updated live</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-brand-50 rounded-xl p-4 ring-1 ring-brand-100">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-medium text-brand-700">Target Hit Rate</span>
            </div>
            <div className="text-2xl font-bold text-brand-700">{N(org.target_hit_rate)}%</div>
            <div className="text-xs text-brand-600 mt-1">{N(org.staff_achieved_target)} of {N(org.staff_with_targets)} staff</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 ring-1 ring-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Overtime Workers</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{N(org.staff_with_overtime)}</div>
            <div className="text-xs text-amber-600 mt-1">Exceeding 120% of target</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 ring-1 ring-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-medium text-rose-700">Under Target</span>
            </div>
            <div className="text-2xl font-bold text-rose-700">{N(org.staff_under_target)}</div>
            <div className="text-xs text-rose-600 mt-1">Below 80% of target</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 ring-1 ring-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Shift Duration</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{N(org.standard_shift_hours) || 9}h</div>
            <div className="text-xs text-blue-600 mt-1">Standard working hours</div>
          </div>
        </div>
      </div>
      </Safe>

      {/* Charts — loaded lazily to isolate recharts crashes */}
      <Safe id="Charts">
      <ChartsSection data={data} />
      </Safe>

      {/* Period Summary */}
      <Safe id="PeriodSummary">
      <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Period Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-500 mb-1">This Week Received</div>
            <div className="text-xl font-bold text-slate-900">{N(org.orders_received_week)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Week Delivered</div>
            <div className="text-xl font-bold text-brand-600">{N(org.orders_delivered_week)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Month Received</div>
            <div className="text-xl font-bold text-slate-900">{N(org.orders_received_month)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Month Delivered</div>
            <div className="text-xl font-bold text-brand-600">{N(org.orders_delivered_month)}</div>
          </div>
        </div>
      </div>
      </Safe>

      {/* Team-wise Output */}
      <Safe id="Teams">
      {Array.isArray(data.teams) && data.teams.length > 0 && (
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Team-wise Output</h3>
              <p className="text-xs text-slate-500">Performance by team · Today</p>
            </div>
            <UsersRound className="h-4 w-4 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Team</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Project</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Country</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">Staff</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">Active</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">Delivered</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">Pending</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.slice(0, showAllTeams ? data.teams.length : 10).map((team: any) => (
                  <tr key={S(team.id)} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">{S(team.name)}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-700">{S(team.project_code)}</span>
                      <span className="text-xs text-slate-400 ml-1">{S(team.project_name)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{S(team.country)}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{N(team.staff_count)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={N(team.active_staff) === N(team.staff_count) ? 'text-brand-600 font-medium' : 'text-amber-600'}>
                        {N(team.active_staff)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-semibold text-brand-600">{N(team.delivered_today)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={N(team.pending) > 10 ? 'text-amber-600 font-medium' : 'text-slate-600'}>{N(team.pending)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        N(team.efficiency) >= 3 ? 'bg-brand-50 text-brand-700' :
                        N(team.efficiency) >= 1 ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {N(team.efficiency)}/staff
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.teams.length > 10 && (
              <div className="text-center mt-3">
                <button
                  onClick={() => setShowAllTeams(!showAllTeams)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  {showAllTeams ? 'Show top 10 only' : `Show all ${data.teams.length} teams`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </Safe>

      {/* Country Drilldown */}
      <Safe id="Countries">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Country Breakdown</h3>
        <div className="space-y-2">
          {(Array.isArray(data.countries) ? data.countries : []).map((country: any) => (
            <div key={S(country.country)} className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
              <button
                onClick={() => setExpandedCountry(expandedCountry === country.country ? null : country.country)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all duration-150 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-teal-600" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{S(country.country)}</div>
                    <div className="text-xs text-slate-500">{N(country.project_count)} projects · {N(country.active_staff)}/{N(country.total_staff)} staff</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="text-blue-600 font-medium">{N(country.received_today)} in</span>
                    <span className="text-brand-600 font-medium">{N(country.delivered_today)} out</span>
                    {N(country.total_pending) > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-medium ring-1 ring-amber-200">{N(country.total_pending)} pending</span>
                    )}
                  </div>
                  {expandedCountry === country.country ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedCountry === country.country && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  {(Array.isArray(country.departments) ? country.departments : []).map((dept: any) => (
                    <div key={S(dept.department)} className="mt-3">
                      <button
                        onClick={() => setExpandedDept(expandedDept === `${country.country}-${dept.department}` ? null : `${country.country}-${dept.department}`)}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-400" strokeWidth={2} />
                          <span className="text-sm font-medium text-slate-700">{S(dept.department) === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement'}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{N(dept.project_count)} projects</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {N(dept.sla_breaches) > 0 && <span className="text-rose-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{N(dept.sla_breaches)} SLA</span>}
                          <span className="text-slate-600 font-medium">{N(dept.pending)} pending</span>
                          {expandedDept === `${country.country}-${dept.department}` ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </div>
                      </button>

                      {expandedDept === `${country.country}-${dept.department}` && (
                        <div className="ml-6 mt-2 space-y-1.5">
                          {(Array.isArray(dept.projects) ? dept.projects : []).map((proj: any) => (
                            <div key={S(proj.id)} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-xs hover:ring-slate-200 transition-all duration-150">
                              <div>
                                <span className="font-semibold text-slate-900">{S(proj.code)}</span>
                                <span className="text-slate-500 ml-2">{S(proj.name)}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-amber-600 font-medium">{N(proj.pending)} pending</span>
                                <span className="text-brand-600 font-medium">{N(proj.delivered_today)} delivered</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </Safe>
      </>
      )}
    </AnimatedPage>
  );
}

/* ── Charts in a separate component so recharts errors are caught by Safe boundary ── */
function ChartsSection({ data }: { data: MasterDashboard }) {
  const [chartsLib, setChartsLib] = useState<any>(null);

  useEffect(() => {
    import('recharts').then(mod => setChartsLib(mod)).catch(() => setChartsLib(null));
  }, []);

  const countryChartData = useMemo(() =>
    (Array.isArray(data?.countries) ? data.countries : []).map((c: any) => ({
      name: S(c.country),
      received: N(c.received_today),
      delivered: N(c.delivered_today),
      pending: N(c.total_pending),
      staff: N(c.active_staff),
    }))
  , [data]);

  const pendingByCountry = useMemo(() =>
    (Array.isArray(data?.countries) ? data.countries : []).map((c: any, i: number) => ({
      name: S(c.country),
      value: N(c.total_pending),
      fill: COLORS[i % COLORS.length],
    })).filter((c: any) => c.value > 0)
  , [data]);

  if (!chartsLib) return <div className="text-center py-8 text-slate-400 text-sm">Loading charts...</div>;

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip: ReTooltip, PieChart, Pie, Cell } = chartsLib;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
      {/* Bar chart */}
      <div className="lg:col-span-3 bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Orders by Country</h3>
          <p className="text-xs text-slate-500">Pending vs delivered breakdown</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={countryChartData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#78716c', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 13, fill: '#78716c' }} axisLine={false} tickLine={false} dx={-10} />
            <ReTooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                padding: '12px'
              }}
              cursor={{ fill: '#fafaf9', radius: 8 }}
            />
            <Bar dataKey="pending" name="Pending" fill="#C45C26" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" name="Delivered" fill="#2AA7A0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="lg:col-span-2 bg-white rounded-xl ring-1 ring-black/[0.04] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Pending Distribution</h3>
          <p className="text-xs text-slate-500">By country</p>
        </div>
        {pendingByCountry.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pendingByCountry}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pendingByCountry.map((_entry: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-3">
              {pendingByCountry.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} />
                  <span className="font-medium">{S(c.name)}:</span> {N(c.value)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-slate-400">No pending orders</div>
        )}
      </div>
    </div>
  );
}
