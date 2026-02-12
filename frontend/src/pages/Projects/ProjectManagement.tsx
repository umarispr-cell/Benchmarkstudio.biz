import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { projectService } from '../../services';
import type { Project } from '../../types';
import { AnimatedPage, PageHeader, StatusBadge, Modal, Button, DataTable, FilterBar } from '../../components/ui';
import { FolderKanban, Plus, Edit, Trash2, Users, BarChart3, MapPin } from 'lucide-react';

const emptyForm = {
  name: '', code: '', client_name: '', country: 'UK', department: 'floor_plan',
  status: 'active', description: '', workflow_layers: ['drawer', 'checker', 'qa'],
};

const FLAGS: Record<string, string> = { UK: '\u{1F1EC}\u{1F1E7}', Australia: '\u{1F1E6}\u{1F1FA}', Canada: '\u{1F1E8}\u{1F1E6}', USA: '\u{1F1FA}\u{1F1F8}' };

export default function ProjectManagement() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showStats, setShowStats] = useState<Project | null>(null);
  const [showTeams, setShowTeams] = useState<Project | null>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [projectTeams, setProjectTeams] = useState<any[]>([]);

  useEffect(() => { loadProjects(); }, [selectedCountry, selectedDepartment]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (selectedDepartment !== 'all') params.department = selectedDepartment;
      if (searchTerm) params.search = searchTerm;
      const res = await projectService.list(params);
      const d = res.data?.data || res.data;
      setProjects(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const canManage = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  const openCreate = () => { setEditingProject(null); setFormData(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (p: Project) => {
    setEditingProject(p);
    setFormData({ name: p.name, code: p.code, client_name: p.client_name, country: p.country, department: p.department, status: p.status, description: p.description || '', workflow_layers: p.workflow_layers || ['drawer', 'checker', 'qa'] });
    setFormError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.client_name) { setFormError('Name, code, and client are required.'); return; }
    try {
      setSaving(true); setFormError('');
      if (editingProject) await projectService.update(editingProject.id, formData as any);
      else await projectService.create(formData as any);
      setShowModal(false); loadProjects();
    } catch (e: any) { setFormError(e.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await projectService.delete(id); setDeleteConfirm(null); loadProjects(); } catch (e) { console.error(e); }
  };

  const handleViewStats = async (p: Project) => {
    setShowStats(p); setProjectStats(null);
    try { const r = await projectService.statistics(p.id); setProjectStats(r.data); } catch (_) {}
  };

  const handleViewTeams = async (p: Project) => {
    setShowTeams(p); setProjectTeams([]);
    try { const r = await projectService.teams(p.id); const d = r.data?.data || r.data; setProjectTeams(Array.isArray(d) ? d : []); } catch (_) {}
  };

  const filtered = projects.filter(p =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()) || p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatedPage>
      <PageHeader title="Projects" subtitle="Manage projects across all regions"
        actions={canManage ? <Button onClick={openCreate} icon={Plus}>New Project</Button> : undefined}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: projects.length, icon: FolderKanban, bg: 'bg-slate-100', color: 'text-slate-600' },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, icon: FolderKanban, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Countries', value: new Set(projects.map(p => p.country)).size, icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Teams', value: projects.reduce((s, p) => s + (p.total_teams || 0), 0), icon: Users, bg: 'bg-violet-50', color: 'text-violet-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div><div className="text-2xl font-bold text-slate-900">{s.value}</div><div className="text-xs text-slate-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search projects..."
        filters={<>
          <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="select text-sm">
            <option value="all">All Countries</option>
            <option value="UK">UK</option><option value="Australia">Australia</option>
            <option value="Canada">Canada</option><option value="USA">USA</option>
          </select>
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="select text-sm">
            <option value="all">All Departments</option>
            <option value="floor_plan">Floor Plan</option><option value="photos_enhancement">Photos Enhancement</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadProjects}>Search</Button>
        </>}
      />

      {/* Table */}
      <div className="mt-4">
        <DataTable
          data={filtered} loading={loading}
          columns={[
            { key: 'name', label: 'Project', sortable: true, render: (p) => (
              <div>
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-400">{p.code} &middot; {p.client_name}</div>
              </div>
            )},
            { key: 'country', label: 'Country', render: (p) => <span>{FLAGS[p.country] || ''} {p.country}</span> },
            { key: 'department', label: 'Department', render: (p) => <span className="text-slate-600 capitalize">{p.department.replace('_', ' ')}</span> },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'orders', label: 'Orders', sortable: true, render: (p) => (
              <div className="text-right">
                <span className="font-semibold text-slate-900">{p.total_orders}</span>
                {p.total_orders > 0 && (
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((p.completed_orders / p.total_orders) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            )},
            { key: 'actions', label: '', render: (p) => canManage ? (
              <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="xs" onClick={() => handleViewStats(p)}><BarChart3 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="xs" onClick={() => handleViewTeams(p)}><Users className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="xs" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(p.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
              </div>
            ) : null },
          ]}
          emptyIcon={FolderKanban}
          emptyTitle="No projects found"
          emptyDescription="Adjust filters or create a new project."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingProject ? 'Edit Project' : 'New Project'} size="lg">
        {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-600">{formError}</div>}
        <div className="space-y-4">
          <div><label className="label">Name *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="Project name" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Code *</label><input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="input" placeholder="PRJ-001" /></div>
            <div><label className="label">Client *</label><input type="text" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} className="input" placeholder="Client name" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Country</label><select value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="select"><option value="UK">UK</option><option value="Australia">Australia</option><option value="Canada">Canada</option><option value="USA">USA</option></select></div>
            <div><label className="label">Department</label><select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="select"><option value="floor_plan">Floor Plan</option><option value="photos_enhancement">Photos Enhancement</option></select></div>
            <div><label className="label">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="select"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></div>
          </div>
          <div><label className="label">Description</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="textarea" rows={3} placeholder="Optional description" /></div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>{editingProject ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Project?" size="sm">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3"><Trash2 className="w-7 h-7 text-rose-500" /></div>
          <p className="text-sm text-slate-500">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>

      {/* Stats Modal */}
      <Modal open={!!showStats} onClose={() => { setShowStats(null); setProjectStats(null); }} title={`${showStats?.name} — Statistics`}>
        {projectStats ? (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(projectStats.data || projectStats).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{typeof value === 'number' ? value : JSON.stringify(value)}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{key.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-center py-8 text-slate-400">Loading...</div>}
      </Modal>

      {/* Teams Modal */}
      <Modal open={!!showTeams} onClose={() => { setShowTeams(null); setProjectTeams([]); }} title={`${showTeams?.name} — Teams`}>
        {projectTeams.length > 0 ? (
          <div className="space-y-2">
            {projectTeams.map((t: any, i: number) => (
              <div key={i} className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{t.name}</span>
                <span className="text-xs text-slate-500">{t.members_count || t.members?.length || 0} members</span>
              </div>
            ))}
          </div>
        ) : <div className="text-center py-8 text-slate-400">No teams found.</div>}
      </Modal>
    </AnimatedPage>
  );
}
