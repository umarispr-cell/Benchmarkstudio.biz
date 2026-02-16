import { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import type { DailyOperationsData, DailyOperationsProject } from '../../types';
import { 
  Calendar, ChevronDown, ChevronRight, ChevronLeft, Users, Package, 
  TrendingUp, AlertCircle, Layers, ClipboardCheck, RefreshCw, Download 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LAYER_LABELS: Record<string, string> = {
  DRAW: 'Drawer',
  CHECK: 'Checker', 
  DESIGN: 'Designer',
  QA: 'QA',
};

const LAYER_COLORS: Record<string, string> = {
  DRAW: 'bg-blue-50 text-blue-700 border-blue-200',
  CHECK: 'bg-amber-50 text-amber-700 border-amber-200',
  DESIGN: 'bg-brand-50 text-brand-700 border-brand-200',
  QA: 'bg-brand-50 text-brand-700 border-brand-200',
};

export default function DailyOperationsView() {
  const [data, setData] = useState<DailyOperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  // Debounce date changes to prevent API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedDate(dateInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [dateInput]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.dailyOperations(selectedDate);
      setData(res.data);
    } catch (e: any) {
      console.error('Failed to load daily operations:', e);
      setError(e.response?.data?.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setExpandedProjects(new Set(data.projects.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
  };

  const exportToCSV = () => {
    if (!data) return;

    // Build CSV content
    const headers = ['Project Code', 'Project Name', 'Country', 'Department', 'Received', 'Delivered', 'Pending', 'Layers', 'Workers', 'QA Compliance %'];
    const rows = filteredProjects.map(p => {
      const layerSummary = Object.entries(p.layers)
        .map(([stage, layer]) => `${LAYER_LABELS[stage]}:${layer.total}`)
        .join('; ');
      const workerCount = Object.values(p.layers)
        .reduce((sum, layer) => sum + layer.workers.length, 0);
      
      return [
        p.code,
        p.name,
        p.country,
        p.department === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement',
        p.received,
        p.delivered,
        p.pending,
        layerSummary,
        workerCount,
        p.qa_checklist.compliance_rate,
      ];
    });

    const csvContent = [
      `Daily Operations Report - ${formatDate(selectedDate)}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Summary:,,,,,,,,,`,
      `Total Projects:,${data.totals.projects},,,,,,,,`,
      `Total Received:,${data.totals.received},,,,,,,,`,
      `Total Delivered:,${data.totals.delivered},,,,,,,,`,
      `Total Pending:,${data.totals.pending},,,,,,,,`,
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `daily-operations-${selectedDate}.csv`;
    link.click();
  };

  const changeDate = (days: number) => {
    const date = new Date(dateInput);
    date.setDate(date.getDate() + days);
    const newDate = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    // Don't allow future dates
    if (newDate > today) return;
    setDateInput(newDate);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const filteredProjects = data?.projects.filter(p => {
    if (filterCountry !== 'all' && p.country !== filterCountry) return false;
    if (filterDept !== 'all' && p.department !== filterDept) return false;
    return true;
  }) || [];

  const countries = data ? [...new Set(data.projects.map(p => p.country))] : [];
  const departments = data ? [...new Set(data.projects.map(p => p.department))] : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-rose-500" />
        <p className="text-slate-900 font-medium mb-2">Failed to load daily operations</p>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button 
          onClick={loadData} 
          className="px-4 py-2 bg-[#2AA7A0] text-white rounded-lg hover:bg-[#238B85] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p>No data available</p>
        <button onClick={loadData} className="mt-4 text-sm text-[#2AA7A0] hover:underline">
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#2AA7A0]" />
          <h2 className="text-lg font-semibold text-slate-900">Daily Operations</h2>
          <span className="text-sm text-slate-500">
            {formatDate(selectedDate)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Previous day"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <label htmlFor="date-picker" className="sr-only">Select date for daily operations</label>
          <input
            id="date-picker"
            type="date"
            value={dateInput}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDateInput(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2AA7A0]/20 focus:border-[#2AA7A0]"
            aria-label="Date picker for daily operations"
          />
          <button
            onClick={() => changeDate(1)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next day"
            aria-label="Next day"
            disabled={dateInput >= new Date().toISOString().split('T')[0]}
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Projects</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.totals.projects}</div>
          <div className="text-xs text-slate-400 mt-1">Active</div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Received</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{data.totals.received}</div>
          <div className="text-xs text-slate-400 mt-1">Orders in</div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <span className="text-xs text-slate-500">Delivered</span>
          </div>
          <div className="text-2xl font-bold text-brand-600">{data.totals.delivered}</div>
          <div className="text-xs text-slate-400 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{data.totals.pending}</div>
          <div className="text-xs text-slate-400 mt-1">In pipeline</div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-black/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#2AA7A0]" />
            <span className="text-xs text-slate-500">Work Items</span>
          </div>
          <div className="text-2xl font-bold text-[#2AA7A0]">{data.totals.total_work_items}</div>
          <div className="text-xs text-slate-400 mt-1">Completed</div>
        </div>
      </div>

      {/* Filters and actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="country-filter" className="sr-only">Filter by country</label>
          <select
            id="country-filter"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2AA7A0]/20 focus:border-[#2AA7A0]"
            aria-label="Filter projects by country"
          >
            <option value="all">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label htmlFor="dept-filter" className="sr-only">Filter by department</label>
          <select
            id="dept-filter"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2AA7A0]/20 focus:border-[#2AA7A0]"
            aria-label="Filter projects by department"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d === 'floor_plan' ? 'Floor Plan' : 'Photos Enhancement'}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={!data || filteredProjects.length === 0}
            className="flex items-center gap-2 text-xs px-3 py-1.5 bg-[#2AA7A0] text-white rounded-lg hover:bg-[#238B85] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={expandAll}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Projects list */}
      <div className="space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl ring-1 ring-black/[0.04]">
            No projects match the selected filters
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectRow 
              key={project.id} 
              project={project} 
              expanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectRow({ 
  project, 
  expanded, 
  onToggle 
}: { 
  project: DailyOperationsProject; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const layers = Object.entries(project.layers);
  const totalWork = layers.reduce((sum, [, layer]) => sum + layer.total, 0);
  const hasWork = totalWork > 0;

  return (
    <div className="bg-white rounded-xl ring-1 ring-black/[0.04] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all duration-150 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasWork ? 'bg-[#2AA7A0]/10' : 'bg-slate-100'}`}>
            <Layers className={`h-4 w-4 ${hasWork ? 'text-[#2AA7A0]' : 'text-slate-400'}`} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{project.code}</span>
              <span className="text-sm text-slate-500 truncate">{project.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{project.country}</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{project.department === 'floor_plan' ? 'Floor Plan' : 'Photos'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Layer badges */}
          <div className="hidden md:flex items-center gap-2">
            {layers.map(([stage, layer]) => (
              <span
                key={stage}
                className={`text-xs px-2 py-1 rounded-md border ${LAYER_COLORS[stage] || 'bg-slate-50 text-slate-600 border-slate-200'} ${layer.total === 0 ? 'opacity-40' : ''}`}
              >
                {LAYER_LABELS[stage] || stage}: {layer.total}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-600 font-medium">{project.received} in</span>
            <span className="text-brand-600 font-medium">{project.delivered} out</span>
            {project.pending > 0 && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-medium ring-1 ring-amber-200">
                {project.pending} pending
              </span>
            )}
          </div>

          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Layer breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {layers.map(([stage, layer]) => (
                  <div
                    key={stage}
                    className={`rounded-lg p-4 border ${LAYER_COLORS[stage] || 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">{LAYER_LABELS[stage] || stage}</span>
                      <span className="text-lg font-bold">{layer.total}</span>
                    </div>
                    {layer.workers.length > 0 ? (
                      <div className="space-y-2">
                        {layer.workers.map(worker => (
                          <div key={worker.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{worker.name}</span>
                            <span className="font-medium">
                              {worker.completed} done{worker.has_more ? '+' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs opacity-60 text-center py-2">No work today</div>
                    )}
                  </div>
                ))}
              </div>

              {/* QA Checklist compliance */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-4 h-4 text-[#2AA7A0]" />
                  <span className="text-sm font-medium text-slate-900">QA Checklist Compliance</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{project.qa_checklist.total_orders}</div>
                    <div className="text-xs text-slate-500">Orders QA'd</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{project.qa_checklist.total_items}</div>
                    <div className="text-xs text-slate-500">Checklist Items</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-brand-600">{project.qa_checklist.completed_items}</div>
                    <div className="text-xs text-slate-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-rose-600">{project.qa_checklist.mistake_count}</div>
                    <div className="text-xs text-slate-500">Mistakes Found</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${project.qa_checklist.compliance_rate >= 95 ? 'text-brand-600' : project.qa_checklist.compliance_rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {project.qa_checklist.compliance_rate}%
                    </div>
                    <div className="text-xs text-slate-500">Compliance</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
