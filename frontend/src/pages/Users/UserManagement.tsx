import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { userService } from '../../services';
import type { User } from '../../types';
import { AnimatedPage, PageHeader, StatusBadge, Modal, Button, DataTable, FilterBar } from '../../components/ui';
import { Users as UsersIcon, Plus, Edit, Trash2, UserCheck, UserX, Shield, Activity } from 'lucide-react';

const emptyForm = { name: '', email: '', password: '', role: 'drawer', country: 'UK', department: 'floor_plan', layer: '' };
const FLAGS: Record<string, string> = { UK: '\u{1F1EC}\u{1F1E7}', Australia: '\u{1F1E6}\u{1F1FA}', Canada: '\u{1F1E8}\u{1F1E6}', USA: '\u{1F1FA}\u{1F1F8}' };

export default function UserManagement() {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadUsers(); }, [selectedRole, selectedCountry]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedRole !== 'all') params.role = selectedRole;
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (searchTerm) params.search = searchTerm;
      const res = await userService.list(params);
      const d = res.data?.data || res.data;
      setUsers(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const canManage = ['ceo', 'director', 'operations_manager'].includes(currentUser?.role || '');

  const openCreate = () => { setEditingUser(null); setFormData(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (u: User) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role, country: u.country || 'UK', department: u.department || 'floor_plan', layer: u.layer || '' });
    setFormError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) { setFormError('Name and email are required.'); return; }
    if (!editingUser && !formData.password) { setFormError('Password is required.'); return; }
    try {
      setSaving(true); setFormError('');
      if (editingUser) {
        const d: any = { ...formData };
        if (!d.password) delete d.password;
        await userService.update(editingUser.id, d);
      } else {
        await userService.create(formData as any);
      }
      setShowModal(false); loadUsers();
    } catch (e: any) { setFormError(e.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try { await userService.delete(id); setDeleteConfirm(null); loadUsers(); } catch (e) { console.error(e); }
  };

  const handleToggleActive = async (u: User) => {
    try { await userService.update(u.id, { is_active: !u.is_active } as any); loadUsers(); } catch (e) { console.error(e); }
  };

  const filtered = users.filter(u =>
    !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatedPage>
      <PageHeader title="Users" subtitle="Manage staff members and permissions"
        actions={canManage ? <Button onClick={openCreate} icon={Plus}>Add User</Button> : undefined}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: users.length, icon: UsersIcon, bg: 'bg-slate-100', color: 'text-slate-600' },
          { label: 'Active', value: users.filter(u => u.is_active).length, icon: UserCheck, bg: 'bg-brand-50', color: 'text-brand-600' },
          { label: 'Managers', value: users.filter(u => ['ceo', 'director', 'operations_manager'].includes(u.role)).length, icon: Shield, bg: 'bg-brand-50', color: 'text-brand-600' },
          { label: 'Production', value: users.filter(u => ['drawer', 'checker', 'qa', 'designer'].includes(u.role)).length, icon: Activity, bg: 'bg-blue-50', color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div><div className="text-2xl font-bold text-slate-900">{s.value}</div><div className="text-xs text-slate-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search users..."
        filters={<>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="select text-sm">
            <option value="all">All Roles</option>
            <option value="ceo">CEO</option><option value="director">Director</option>
            <option value="operations_manager">Ops Manager</option><option value="accounts_manager">Accounts</option>
            <option value="drawer">Drawer</option><option value="checker">Checker</option>
            <option value="qa">QA</option><option value="designer">Designer</option>
          </select>
          <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="select text-sm">
            <option value="all">All Countries</option>
            <option value="UK">UK</option><option value="Australia">Australia</option>
            <option value="Canada">Canada</option><option value="USA">USA</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadUsers}>Search</Button>
        </>}
      />

      {/* Table */}
      <div className="mt-4">
        <DataTable
          data={filtered} loading={loading}
          columns={[
            { key: 'name', label: 'User', sortable: true, render: (u) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2AA7A0] flex items-center justify-center text-white font-bold text-sm">{u.name.charAt(0)}</div>
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {u.name}
                    <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-brand-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
              </div>
            )},
            { key: 'role', label: 'Role', render: (u) => <StatusBadge status={u.role} /> },
            { key: 'country', label: 'Country', render: (u) => <span>{FLAGS[u.country] || ''} {u.country}</span> },
            { key: 'department', label: 'Department', render: (u) => <span className="text-slate-500 capitalize">{u.department?.replace('_', ' ') || '—'}</span> },
            { key: 'activity', label: 'Last Active', render: (u) => (
              <span className="text-xs text-slate-400">{u.last_activity ? new Date(u.last_activity).toLocaleDateString() : 'Never'}</span>
            )},
            { key: 'actions', label: '', render: (u) => canManage ? (
              <div className="flex items-center gap-1 justify-end">
                <Button variant="ghost" size="xs" onClick={() => handleToggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}>
                  {u.is_active ? <UserX className="w-3.5 h-3.5 text-amber-500" /> : <UserCheck className="w-3.5 h-3.5 text-brand-500" />}
                </Button>
                <Button variant="ghost" size="xs" onClick={() => openEdit(u)}><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(u.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
              </div>
            ) : null },
          ]}
          emptyIcon={UsersIcon}
          emptyTitle="No users found"
          emptyDescription="Adjust your filters or add a new user."
        />
      </div>

      {/* Create/Edit */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Add User'} size="lg">
        {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-600">{formError}</div>}
        <div className="space-y-4">
          <div><label className="label">Full Name *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" /></div>
          <div><label className="label">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input" /></div>
          <div><label className="label">Password {editingUser ? '(leave blank to keep)' : '*'}</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Role</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="select">
              <option value="drawer">Drawer</option><option value="checker">Checker</option><option value="qa">QA</option>
              <option value="designer">Designer</option><option value="operations_manager">Ops Manager</option>
              <option value="accounts_manager">Accounts</option><option value="director">Director</option><option value="ceo">CEO</option>
            </select></div>
            <div><label className="label">Country</label><select value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="select">
              <option value="UK">UK</option><option value="Australia">Australia</option><option value="Canada">Canada</option><option value="USA">USA</option>
            </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Department</label><select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="select">
              <option value="floor_plan">Floor Plan</option><option value="photos_enhancement">Photos Enhancement</option>
            </select></div>
            <div><label className="label">Layer</label><select value={formData.layer} onChange={e => setFormData({ ...formData, layer: e.target.value })} className="select">
              <option value="">None</option><option value="drawer">Drawer</option><option value="checker">Checker</option><option value="qa">QA</option><option value="designer">Designer</option>
            </select></div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>{editingUser ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User?" size="sm">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3"><Trash2 className="w-7 h-7 text-rose-500" /></div>
          <p className="text-sm text-slate-500">This will permanently remove this user.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </AnimatedPage>
  );
}
