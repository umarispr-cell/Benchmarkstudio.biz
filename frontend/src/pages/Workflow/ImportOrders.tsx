import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { orderImportService, projectService } from '../../services';
import type { Project, OrderImportSource, OrderImportLog } from '../../types';
import { 
  Upload, FileSpreadsheet, Cloud, Clock, CheckCircle, AlertCircle, 
  RefreshCw, History, Settings2, Play, Pause, Database,
  Loader2, X, ChevronDown
} from 'lucide-react';

interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

const ImportOrders = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sources, setSources] = useState<OrderImportSource[]>([]);
  const [importHistory, setImportHistory] = useState<OrderImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const canImport = ['ceo', 'director', 'operations_manager', 'supervisor'].includes(user?.role || '');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const response = await projectService.list();
      const data = response.data?.data || response.data;
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length > 0) {
        setSelectedProject(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    if (!selectedProject) return;
    try {
      const [sourcesRes, historyRes] = await Promise.all([
        orderImportService.sources(selectedProject),
        orderImportService.importHistory(selectedProject),
      ]);
      setSources(sourcesRes.data?.data || sourcesRes.data || []);
      const histData = historyRes.data?.data || historyRes.data;
      setImportHistory(Array.isArray(histData) ? histData : []);
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        alert('Please upload a CSV file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedProject || !selectedFile) return;
    
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await orderImportService.importCsv(selectedProject, formData);
      setImportResult(response.data);
      setSelectedFile(null);
      loadProjectData();
    } catch (error: any) {
      console.error('Import failed:', error);
      setImportResult({
        total_rows: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, error: error.response?.data?.message || 'Import failed' }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleApiSync = async (sourceId: number) => {
    try {
      setSyncing(sourceId);
      await orderImportService.syncFromApi(sourceId);
      loadProjectData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(null);
    }
  };

  const getSourceTypeConfig = (type: string) => {
    switch (type) {
      case 'api':
        return { icon: Cloud, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'cron':
        return { icon: Clock, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' };
      case 'csv':
        return { icon: FileSpreadsheet, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600' };
      default:
        return { icon: Database, color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  if (!canImport) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Access Restricted</h2>
          <p className="text-slate-500 mt-2">You don't have permission to import orders.</p>
        </div>
      </div>
    );
  }

  if (loading) {
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Import</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Import Orders</h1>
          <p className="text-slate-500 mt-2">Import orders via CSV upload or API sync</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              showHistory 
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-300'
            }`}
          >
            <History className="h-4 w-4" />
            Import History
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
        <div className="relative">
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(Number(e.target.value))}
            className="w-full md:w-96 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 appearance-none cursor-pointer"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.country})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Import Sources */}
      {sources.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Import Sources</h2>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings2 className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {sources.map((source) => {
              const config = getSourceTypeConfig(source.type);
              const Icon = config.icon;
              
              return (
                <div key={source.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${config.color} shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{source.name}</h3>
                      <p className="text-sm text-slate-500 capitalize">{source.type} import</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {source.type === 'api' && (
                      <button
                        onClick={() => handleApiSync(source.id)}
                        disabled={syncing === source.id}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {syncing === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Sync Now
                      </button>
                    )}
                    {source.is_active ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium flex items-center gap-1">
                        <Play className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium flex items-center gap-1">
                        <Pause className="h-3 w-3" /> Paused
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CSV Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Upload CSV File</h2>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragActive 
              ? 'border-violet-500 bg-violet-50' 
              : selectedFile 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'border-slate-300 hover:border-violet-400 hover:bg-violet-50/50'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-100">
                <FileSpreadsheet className="h-12 w-12 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-slate-100">
                <Upload className="h-12 w-12 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Drop your CSV file here</p>
                <p className="text-sm text-slate-500">or click to browse</p>
              </div>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {importing ? 'Importing...' : 'Import Orders'}
            </button>
          </div>
        )}
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`rounded-2xl border p-6 ${
          importResult.errors.length > 0 
            ? 'bg-rose-50 border-rose-200' 
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-start gap-4">
            {importResult.errors.length > 0 && importResult.imported === 0 ? (
              <AlertCircle className="h-6 w-6 text-rose-600 mt-0.5" />
            ) : (
              <CheckCircle className="h-6 w-6 text-emerald-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-900">{importResult.total_rows}</p>
                  <p className="text-sm text-slate-600">Total Rows</p>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                  <p className="text-sm text-slate-600">Imported</p>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                  <p className="text-sm text-slate-600">Skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-rose-700 mb-2">Errors:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((err, idx) => (
                      <p key={idx} className="text-sm text-rose-600">
                        {err.row > 0 ? `Row ${err.row}: ` : ''}{err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import History */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Import History</h2>
          </div>
          {importHistory.length === 0 ? (
            <div className="p-12 text-center">
              <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No import history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Imported</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Skipped</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(log.started_at || log.created_at || '').toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {log.file_path ? 'CSV Upload' : 'API Sync'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                          log.status === 'completed' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : log.status === 'failed'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                        {log.orders_imported}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {log.orders_skipped}
                      </td>
                      <td className="px-6 py-4 text-sm text-rose-600">
                        {log.errors?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportOrders;
