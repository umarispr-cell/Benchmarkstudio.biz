import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { MasterDashboard } from '../../types';
import { AnimatedPage, PageHeader, StatCard } from '../../components/ui';
import { Users, Package, TrendingUp, AlertTriangle, Layers, Globe, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function CEODashboard() {
  const [data, setData] = useState<MasterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await dashboardService.master();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 loading-skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 loading-skeleton" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 loading-skeleton" />
        <div className="h-72 loading-skeleton" />
      </div>
    </div>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Failed to load dashboard data.</div>;

  const org = data.org_totals;

  // Chart data
  const countryChartData = data.countries.map(c => ({
    name: c.country,
    received: c.received_today,
    delivered: c.delivered_today,
    pending: c.total_pending,
    staff: c.active_staff,
  }));

  const pendingByCountry = data.countries.map((c, i) => ({
    name: c.country,
    value: c.total_pending,
    fill: COLORS[i % COLORS.length],
  })).filter(c => c.value > 0);

  const efficiency = org.orders_received_month > 0
    ? Math.round((org.orders_delivered_month / org.orders_received_month) * 100) : 0;

  return (
    <AnimatedPage>
      <PageHeader
        title="Master Dashboard"
        subtitle="Organization overview across all countries and departments"
        badge={
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <span className="live-dot" /> Live
          </span>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active Staff" value={org.active_staff} subtitle={`of ${org.total_staff} total`} icon={Users} color="teal" />
        <StatCard label="Absentees" value={org.absentees} icon={AlertTriangle} color={org.absentees > 0 ? 'rose' : 'slate'} />
        <StatCard label="Received Today" value={org.orders_received_today} icon={Package} color="blue" />
        <StatCard label="Delivered Today" value={org.orders_delivered_today} icon={TrendingUp} color="green" />
        <StatCard label="Total Pending" value={org.total_pending} icon={Layers} color={org.total_pending > 20 ? 'amber' : 'slate'} />
        <StatCard label="Efficiency" value={`${efficiency}%`} subtitle="This month" icon={TrendingUp} color="violet" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Bar chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Orders by Country</h3>
          <p className="text-xs text-slate-400 mb-4">Pending vs delivered breakdown</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={countryChartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <ReTooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              />
              <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Pending Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">By country</p>
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
                    {pendingByCountry.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ReTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pendingByCountry.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} />
                    {c.name}: {c.value}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">No pending orders</div>
          )}
        </div>
      </div>

      {/* Period Summary */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Period Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-400 mb-1">This Week Received</div>
            <div className="text-xl font-bold text-slate-900">{org.orders_received_week}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">This Week Delivered</div>
            <div className="text-xl font-bold text-emerald-600">{org.orders_delivered_week}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">This Month Received</div>
            <div className="text-xl font-bold text-slate-900">{org.orders_received_month}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">This Month Delivered</div>
            <div className="text-xl font-bold text-emerald-600">{org.orders_delivered_month}</div>
          </div>
        </div>
      </div>

      {/* Country Drilldown */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Country Breakdown</h3>
        <div className="space-y-2">
          {data.countries.map((country) => (
            <div key={country.country} className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
              <button
                onClick={() => setExpandedCountry(expandedCountry === country.country ? null : country.country)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Globe className="h-[18px] w-[18px] text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{country.country}</div>
                    <div className="text-xs text-slate-400">{country.project_count} projects &middot; {country.active_staff}/{country.total_staff} staff</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="text-blue-600 font-medium">{country.received_today} in</span>
                    <span className="text-emerald-600 font-medium">{country.delivered_today} out</span>
                    {country.total_pending > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium">{country.total_pending} pending</span>
                    )}
                  </div>
                  {expandedCountry === country.country ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {expandedCountry === country.country && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  {country.departments.map((dept) => (
                    <div key={dept.department} className="mt-3">
                      <button
                        onClick={() => setExpandedDept(expandedDept === `${country.country}-${dept.department}` ? null : `${country.country}-${dept.department}`)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{dept.department === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement'}</span>
                          <span className="text-xs text-slate-400">{dept.project_count} projects</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {dept.sla_breaches > 0 && <span className="text-rose-600 font-medium">⚠ {dept.sla_breaches} SLA</span>}
                          <span className="text-slate-500">{dept.pending} pending</span>
                          {expandedDept === `${country.country}-${dept.department}` ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </button>

                      {expandedDept === `${country.country}-${dept.department}` && (
                        <div className="ml-6 mt-2 space-y-1.5">
                          {dept.projects.map((proj) => (
                            <div key={proj.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 text-sm">
                              <div>
                                <span className="font-semibold text-slate-800">{proj.code}</span>
                                <span className="text-slate-400 ml-2">{proj.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-amber-600 font-medium">{proj.pending} pending</span>
                                <span className="text-emerald-600 font-medium">{proj.delivered_today} delivered</span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
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
    </AnimatedPage>
  );
}
