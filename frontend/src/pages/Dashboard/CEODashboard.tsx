import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { MasterDashboard } from '../../types';
import { Building2, Users, Package, TrendingUp, ChevronRight, ChevronDown, AlertTriangle, Globe, Layers, ArrowRight } from 'lucide-react';

export default function CEODashboard() {
  const [data, setData] = useState<MasterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await dashboardService.master();
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loading-shimmer w-full max-w-2xl h-48 rounded-xl" /></div>;
  if (!data) return <div className="text-center py-12 text-slate-500">Failed to load dashboard data.</div>;

  const org = data.org_totals;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Master Dashboard</h1>
          <p className="text-xs text-slate-500">Org → Country → Department → Project</p>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Live · refreshes every 30s</span>
      </div>

      {/* Org-wide stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Staff', value: org.active_staff, sub: `/ ${org.total_staff}`, icon: Users, color: 'text-teal-600 bg-teal-50' },
          { label: 'Absentees', value: org.absentees, icon: AlertTriangle, color: org.absentees > 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50' },
          { label: 'Received Today', value: org.orders_received_today, icon: Package, color: 'text-blue-600 bg-blue-50' },
          { label: 'Delivered Today', value: org.orders_delivered_today, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'Total Pending', value: org.total_pending, icon: Layers, color: org.total_pending > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50' },
          { label: 'Projects', value: org.total_projects, icon: Building2, color: 'text-violet-600 bg-violet-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.color}`}>
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {s.value}{s.sub && <span className="text-xs font-normal text-slate-400 ml-1">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Period summary */}
      <div className="bg-white rounded-xl border border-slate-100 p-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'This Week', recv: org.orders_received_week, deliv: org.orders_delivered_week },
            { label: 'This Month', recv: org.orders_received_month, deliv: org.orders_delivered_month },
            { label: 'Efficiency', recv: null, deliv: null, rate: org.orders_delivered_month > 0 && org.orders_received_month > 0 ? Math.round((org.orders_delivered_month / org.orders_received_month) * 100) : 0 },
          ].map((p, i) => (
            <div key={i}>
              <div className="text-[10px] text-slate-500 uppercase mb-1">{p.label}</div>
              {p.rate !== undefined ? (
                <div className="text-xl font-bold text-teal-600">{p.rate}%</div>
              ) : (
                <div className="text-sm">
                  <span className="text-blue-600 font-semibold">{p.recv}</span>
                  <span className="text-slate-300 mx-1">→</span>
                  <span className="text-green-600 font-semibold">{p.deliv}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Country drilldown */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Countries</h2>
        {data.countries.map((country) => (
          <div key={country.country} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setExpandedCountry(expandedCountry === country.country ? null : country.country)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-slate-400" />
                <div className="text-left">
                  <div className="font-medium text-sm text-slate-900">{country.country}</div>
                  <div className="text-[10px] text-slate-500">{country.project_count} projects · {country.active_staff}/{country.total_staff} staff</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="text-blue-600">{country.received_today} recv</span>
                  <span className="text-slate-300 mx-1">/</span>
                  <span className="text-green-600">{country.delivered_today} deliv</span>
                </div>
                {country.total_pending > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{country.total_pending} pending</span>}
                {expandedCountry === country.country ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {expandedCountry === country.country && (
              <div className="border-t border-slate-100 px-3 pb-3">
                {country.departments.map((dept) => (
                  <div key={dept.department} className="mt-2">
                    <button
                      onClick={() => setExpandedDept(expandedDept === `${country.country}-${dept.department}` ? null : `${country.country}-${dept.department}`)}
                      className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{dept.department === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement'}</span>
                        <span className="text-[10px] text-slate-400">{dept.project_count} projects</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        {dept.sla_breaches > 0 && <span className="text-red-600 font-medium">⚠ {dept.sla_breaches} SLA</span>}
                        <span className="text-slate-500">{dept.pending} pending</span>
                        {expandedDept === `${country.country}-${dept.department}` ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </div>
                    </button>

                    {expandedDept === `${country.country}-${dept.department}` && (
                      <div className="ml-6 mt-1 space-y-1">
                        {dept.projects.map((proj) => (
                          <div key={proj.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 text-xs">
                            <div>
                              <span className="font-medium text-slate-800">{proj.code}</span>
                              <span className="text-slate-400 ml-2">{proj.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-amber-600">{proj.pending} pending</span>
                              <span className="text-green-600">{proj.delivered_today} delivered</span>
                              <ArrowRight className="h-3 w-3 text-slate-300" />
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
  );
}
