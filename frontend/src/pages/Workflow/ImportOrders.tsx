import { useEffect, useState, useRef } from 'react';

import { orderImportService, projectService } from '../../services';
import { AnimatedPage, PageHeader, StatusBadge, Button, DataTable } from '../../components/ui';
import { Upload, FileSpreadsheet, Server, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function ImportOrders() {

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    projectService.list().then(res => {
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) loadData();
  }, [selectedProject]);

  const loadData = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const [sourcesRes, historyRes] = await Promise.all([
        orderImportService.sources(selectedProject).catch(() => ({ data: { data: [] } })),
        orderImportService.importHistory(selectedProject).catch(() => ({ data: { data: [] } })),
      ]);
      setSources(sourcesRes.data?.data || sourcesRes.data || []);
      setHistory(historyRes.data?.data || historyRes.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleFile = async (file: File) => {
    if (!selectedProject || !file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploading(true); setImportResult(null);
      const res = await orderImportService.importCsv(selectedProject, formData);
      setImportResult(res.data);
      loadData();
    } catch (e: any) {
      setImportResult({ error: e.response?.data?.message || 'Import failed.' });
    } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSync = async (sourceId: number) => {
    try {
      setSyncing(sourceId);
      await orderImportService.syncFromApi(sourceId);
      loadData();
    } catch (e) { console.error(e); }
    finally { setSyncing(null); }
  };

  return (
    <AnimatedPage>
      <PageHeader title="Import Orders" subtitle="Upload CSV files or sync from API sources" />

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="mb-6">
          <select value={selectedProject || ''} onChange={e => setSelectedProject(Number(e.target.value))} className="select text-sm">
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CSV Upload */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" /> CSV Upload
          </h3>
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? 'text-slate-900' : 'text-slate-300'}`} />
            <p className="text-sm text-slate-500">
              {uploading ? 'Uploading...' : 'Drop CSV file here or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Supports .csv files</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>

        {/* API Sources */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" /> API Sources
          </h3>
          {sources.length > 0 ? (
            <div className="space-y-2">
              {sources.filter((s: any) => s.type === 'api').map((source: any) => (
                <div key={source.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{source.name}</div>
                    <div className="text-xs text-slate-400">{source.url || 'Configured'}</div>
                  </div>
                  <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => handleSync(source.id)} loading={syncing === source.id}>
                    Sync
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No API sources configured.</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`rounded-xl border p-4 mb-6 ${importResult.error ? 'bg-rose-50 border-rose-200' : 'bg-brand-50 border-brand-200'}`}>
          {importResult.error ? (
            <div className="flex items-center gap-2 text-sm text-rose-700">
              <XCircle className="w-4 h-4" /> {importResult.error}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
                <CheckCircle className="w-4 h-4" /> Import Complete
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="font-bold text-slate-900">{importResult.total_rows || 0}</div>
                  <div className="text-xs text-slate-500">Total Rows</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="font-bold text-brand-600">{importResult.imported || 0}</div>
                  <div className="text-xs text-slate-500">Imported</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="font-bold text-amber-600">{importResult.skipped || 0}</div>
                  <div className="text-xs text-slate-500">Skipped</div>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="mt-3 text-xs text-rose-600">
                  {importResult.errors.map((err: any, i: number) => (
                    <div key={i}>Row {err.row}: {err.message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Import History</h3>
      <DataTable
        data={history} loading={loading}
        columns={[
          { key: 'created_at', label: 'Date', sortable: true, render: (h) => <span className="text-sm text-slate-500">{new Date(h.created_at).toLocaleString()}</span> },
          { key: 'source_type', label: 'Source', render: (h) => (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">{h.source_type || 'csv'}</span>
          )},
          { key: 'status', label: 'Status', render: (h) => <StatusBadge status={h.status || 'completed'} size="xs" /> },
          { key: 'total_rows', label: 'Total', render: (h) => <span className="font-medium text-slate-900">{h.total_rows || 0}</span> },
          { key: 'imported_count', label: 'Imported', render: (h) => <span className="text-brand-600 font-medium">{h.imported_count || 0}</span> },
          { key: 'skipped_count', label: 'Skipped', render: (h) => <span className="text-amber-600">{h.skipped_count || 0}</span> },
        ]}
        emptyIcon={FileSpreadsheet}
        emptyTitle="No import history"
        emptyDescription="Import your first batch of orders."
      />
    </AnimatedPage>
  );
}
