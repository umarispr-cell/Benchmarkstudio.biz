import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { MasterDashboard } from '../../types';
import { AnimatedPage, PageHeader, StatCard } from '../../components/ui';
import { Users, Package, TrendingUp, AlertTriangle, Layers, Globe, ChevronRight, ChevronDown, ArrowRight, Calendar, LayoutDashboard, Clock, Target, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DailyOperationsView from './DailyOperationsView';

const COLORS = ['#2AA7A0', '#C45C26', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

type TabType = 'overview' | 'daily-operations';

export default function CEODashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'daily-operations' as TabType, label: 'Daily Operations', icon: Calendar },
  ];

  if (loading && activeTab === 'overview') return (
    <AnimatedPage>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 h-72 bg-slate-100 animate-pulse rounded-xl" />
          <div className="lg:col-span-2 h-72 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    </AnimatedPage>
  );

  if (!data && activeTab === 'overview') return <div className="text-center py-20 text-slate-500">Failed to load dashboard data.</div>;

  const org = data?.org_totals;

  // Chart data
  const countryChartData = data?.countries.map(c => ({
    name: c.country,
    received: c.received_today,
    delivered: c.delivered_today,
    pending: c.total_pending,
    staff: c.active_staff,
  })) || [];

  const pendingByCountry = data?.countries.map((c, i) => ({
    name: c.country,
    value: c.total_pending,
    fill: COLORS[i % COLORS.length],
  })).filter(c => c.value > 0) || [];

  const efficiency = org && org.orders_received_month > 0
    ? Math.round((org.orders_delivered_month / org.orders_received_month) * 100) : 0;

  return (
    <AnimatedPage>
      <PageHeader
        title="Master Dashboard"
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
      ) : org && (
        <>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active Staff" value={org.active_staff} subtitle={`of ${org.total_staff} total`} icon={Users} color="blue" />
        <StatCard label="Absentees" value={org.absentees} icon={AlertTriangle} color={org.absentees > 0 ? 'rose' : 'slate'} />
        <StatCard label="Received Today" value={org.orders_received_today} icon={Package} color="blue" />
        <StatCard label="Delivered Today" value={org.orders_delivered_today} icon={TrendingUp} color="green" />
        <StatCard label="Total Pending" value={org.total_pending} icon={Layers} color={org.total_pending > 20 ? 'amber' : 'slate'} />
        <StatCard label="Efficiency" value={`${efficiency}%`} subtitle="This month" icon={TrendingUp} color="brand" />
      </div>

      {/* Overtime & Productivity Analysis - Per CEO Requirements */}
      <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Overtime & Productivity Analysis</h3>
            <p className="text-xs text-slate-500">{org.standard_shift_hours || 9}-hour standard shift · Today's performance</p>
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
            <div className="text-2xl font-bold text-brand-700">{org.target_hit_rate || 0}%</div>
            <div className="text-xs text-brand-600 mt-1">{org.staff_achieved_target || 0} of {org.staff_with_targets || 0} staff</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 ring-1 ring-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Overtime Workers</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{org.staff_with_overtime || 0}</div>
            <div className="text-xs text-amber-600 mt-1">Exceeding 120% of target</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 ring-1 ring-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-medium text-rose-700">Under Target</span>
            </div>
            <div className="text-2xl font-bold text-rose-700">{org.staff_under_target || 0}</div>
            <div className="text-xs text-rose-600 mt-1">Below 80% of target</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 ring-1 ring-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Shift Duration</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{org.standard_shift_hours || 9}h</div>
            <div className="text-xs text-blue-600 mt-1">Standard working hours</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
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
                    {pendingByCountry.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ReTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-3">
                {pendingByCountry.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} />
                    <span className="font-medium">{c.name}:</span> {c.value}
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
      <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Period Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-500 mb-1">This Week Received</div>
            <div className="text-xl font-bold text-slate-900">{org.orders_received_week}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Week Delivered</div>
            <div className="text-xl font-bold text-brand-600">{org.orders_delivered_week}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Month Received</div>
            <div className="text-xl font-bold text-slate-900">{org.orders_received_month}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">This Month Delivered</div>
            <div className="text-xl font-bold text-brand-600">{org.orders_delivered_month}</div>
          </div>
        </div>
      </div>

      {/* Country Drilldown */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Country Breakdown</h3>
        <div className="space-y-2">
          {data.countries.map((country) => (
            <div key={country.country} className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
              <button
                onClick={() => setExpandedCountry(expandedCountry === country.country ? null : country.country)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all duration-150 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-teal-600" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{country.country}</div>
                    <div className="text-xs text-slate-500">{country.project_count} projects · {country.active_staff}/{country.total_staff} staff</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="text-blue-600 font-medium">{country.received_today} in</span>
                    <span className="text-brand-600 font-medium">{country.delivered_today} out</span>
                    {country.total_pending > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-medium ring-1 ring-amber-200">{country.total_pending} pending</span>
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
                        className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-400" strokeWidth={2} />
                          <span className="text-sm font-medium text-slate-700">{dept.department === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement'}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{dept.project_count} projects</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {dept.sla_breaches > 0 && <span className="text-rose-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{dept.sla_breaches} SLA</span>}
                          <span className="text-slate-600 font-medium">{dept.pending} pending</span>
                          {expandedDept === `${country.country}-${dept.department}` ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </div>
                      </button>

                      {expandedDept === `${country.country}-${dept.department}` && (
                        <div className="ml-6 mt-2 space-y-1.5">
                          {dept.projects.map((proj) => (
                            <div key={proj.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-xs hover:ring-slate-200 transition-all duration-150">
                              <div>
                                <span className="font-semibold text-slate-900">{proj.code}</span>
                                <span className="text-slate-500 ml-2">{proj.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-amber-600 font-medium">{proj.pending} pending</span>
                                <span className="text-brand-600 font-medium">{proj.delivered_today} delivered</span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
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
      </>
      )}
    </AnimatedPage>
  );
}
