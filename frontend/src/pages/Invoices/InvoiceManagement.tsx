import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { invoiceService, projectService } from '../../services';
import type { Invoice, InvoiceStatus } from '../../types';
import { FileText, Plus, Search, Eye, CheckCircle, Send, XCircle, ChevronRight, X } from 'lucide-react';

const INVOICE_FLOW: InvoiceStatus[] = ['draft', 'prepared', 'approved', 'issued', 'sent'];

const STATUS_ACTIONS: Record<string, { next: InvoiceStatus; label: string; roles: string[]; color: string }> = {
  draft: { next: 'prepared', label: 'Mark Prepared', roles: ['ceo', 'director', 'operations_manager'], color: 'bg-blue-600 hover:bg-blue-700' },
  prepared: { next: 'approved', label: 'Approve', roles: ['ceo', 'director'], color: 'bg-teal-600 hover:bg-teal-700' },
  approved: { next: 'issued', label: 'Issue', roles: ['ceo', 'director'], color: 'bg-violet-600 hover:bg-violet-700' },
  issued: { next: 'sent', label: 'Mark Sent', roles: ['ceo', 'director'], color: 'bg-green-600 hover:bg-green-700' },
};

const now = new Date();

const InvoiceManagement = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    project_id: '',
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    total_amount: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState<Invoice | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => { loadInvoices(); }, [selectedStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const response = await invoiceService.list(params);
      const list = response.data?.data || response.data;
      setInvoices(Array.isArray(list) ? list : []);
    } catch (error) { console.error('Error loading invoices:', error); }
    finally { setLoading(false); }
  };

  const handleTransition = async (invoiceId: number, toStatus: InvoiceStatus) => {
    try {
      await invoiceService.transition(invoiceId, toStatus);
      loadInvoices();
      if (showDetailModal?.id === invoiceId) setShowDetailModal(null);
    } catch (error) { console.error('Error transitioning invoice:', error); }
  };

  const handleDelete = async (invoiceId: number) => {
    if (!confirm('Delete this draft invoice?')) return;
    try {
      await invoiceService.delete(invoiceId);
      loadInvoices();
      if (showDetailModal?.id === invoiceId) setShowDetailModal(null);
    } catch (error) { console.error('Error deleting invoice:', error); }
  };

  const openCreateModal = async () => {
    setFormData({ invoice_number: '', project_id: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), total_amount: '' });
    setFormError('');
    try {
      const res = await projectService.list();
      const data = res.data?.data || res.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (_e) { /* ignore */ }
    setShowModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!formData.invoice_number || !formData.project_id) {
      setFormError('Invoice number and project are required.');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      await invoiceService.create({
        invoice_number: formData.invoice_number,
        project_id: Number(formData.project_id),
        month: formData.month,
        year: formData.year,
        total_amount: formData.total_amount ? Number(formData.total_amount) : undefined,
      });
      setShowModal(false);
      loadInvoices();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to create invoice.');
    } finally { setSaving(false); }
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText },
      prepared: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      approved: { bg: 'bg-teal-100', text: 'text-teal-700', icon: CheckCircle },
      issued: { bg: 'bg-violet-100', text: 'text-violet-700', icon: Send },
      sent: { bg: 'bg-green-100', text: 'text-green-700', icon: Send },
    };
    return map[status] || map.draft;
  };

  const canCreate = ['ceo', 'director', 'operations_manager'].includes(user?.role || '');

  const filteredInvoices = invoices.filter(inv =>
    searchTerm === '' || inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Invoices</h1>
          <p className="text-xs text-slate-500">Draft → Prepared → Approved → Issued → Sent</p>
        </div>
        {canCreate && (
          <button onClick={openCreateModal} className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-teal-700">
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </button>
        )}
      </div>

      {/* Workflow Pipeline */}
      <div className="bg-white rounded-xl border border-slate-100 p-3">
        <div className="flex items-center justify-between">
          {INVOICE_FLOW.map((status, i) => {
            const count = invoices.filter(inv => inv.status === status).length;
            const cfg = getStatusConfig(status);
            return (
              <div key={status} className="flex items-center">
                <button
                  onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all ${selectedStatus === status ? 'ring-2 ring-teal-400' : ''}`}
                >
                  <span className={`text-[10px] uppercase font-medium ${cfg.text}`}>{status}</span>
                  <span className="text-lg font-bold text-slate-900">{count}</span>
                </button>
                {i < INVOICE_FLOW.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-[10px] text-slate-500 uppercase">Total Invoices</div>
          <div className="text-lg font-bold text-slate-900">{filteredInvoices.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-[10px] text-slate-500 uppercase">Total Amount</div>
          <div className="text-lg font-bold text-slate-900">${totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="text-[10px] text-slate-500 uppercase">Filter</div>
          <div className="text-sm font-medium text-teal-600 capitalize">{selectedStatus === 'all' ? 'All' : selectedStatus}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg" />
        </div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2">
          <option value="all">All Status</option>
          {INVOICE_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="loading-shimmer h-16 rounded-xl" />)}</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((invoice) => {
            const cfg = getStatusConfig(invoice.status);
            const StatusIcon = cfg.icon;
            const action = STATUS_ACTIONS[invoice.status];
            const canAct = action && action.roles.includes(user?.role || '');

            return (
              <div key={invoice.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.text}`}>{invoice.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span>${(Number(invoice.total_amount) || 0).toFixed(2)}</span>
                        <span>{invoice.month}/{invoice.year}</span>
                        {invoice.project && <span>{invoice.project.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowDetailModal(invoice)} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="View details">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {canAct && (
                      <button onClick={() => handleTransition(invoice.id, action.next)} className={`text-[10px] text-white font-medium px-2.5 py-1.5 rounded-lg ${action.color}`}>
                        {action.label}
                      </button>
                    )}
                    {invoice.status === 'draft' && canCreate && (
                      <button onClick={() => handleDelete(invoice.id)} className="p-1.5 hover:bg-red-50 rounded-lg" aria-label="Delete">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
            <button onClick={() => setShowModal(false)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Create Invoice (Draft)</h2>
            {formError && <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{formError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Invoice # *</label>
                <input type="text" value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-lg mt-1" placeholder="INV-001" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Project *</label>
                <select value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-lg mt-1">
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Month</label>
                  <select value={formData.month} onChange={e => setFormData({ ...formData, month: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-lg mt-1">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Year</label>
                  <input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Amount</label>
                  <input type="number" step="0.01" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-lg mt-1" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={handleCreateInvoice} disabled={saving} className="flex-1 text-xs py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDetailModal(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
            <button onClick={() => setShowDetailModal(null)} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="h-4 w-4 text-slate-400" />
            </button>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Invoice Details</h2>

            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-4">
              {INVOICE_FLOW.map((s, i) => {
                const idx = INVOICE_FLOW.indexOf(showDetailModal.status as InvoiceStatus);
                const isCurrent = s === showDetailModal.status;
                const isDone = i <= idx;
                return (
                  <div key={s} className="flex-1 flex flex-col items-center">
                    <div className={`w-full h-1 rounded ${isDone ? 'bg-teal-500' : 'bg-slate-200'}`} />
                    <span className={`text-[8px] mt-0.5 ${isCurrent ? 'font-bold text-teal-600' : 'text-slate-400'}`}>{s}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              {[
                { label: 'Invoice #', value: showDetailModal.invoice_number },
                { label: 'Status', value: showDetailModal.status },
                { label: 'Amount', value: `$${(Number(showDetailModal.total_amount) || 0).toFixed(2)}` },
                { label: 'Period', value: `${showDetailModal.month}/${showDetailModal.year}` },
                { label: 'Approved By', value: showDetailModal.approvedBy?.name || 'N/A' },
                { label: 'Issued By', value: showDetailModal.issuedBy?.name || 'N/A' },
                { label: 'Sent At', value: showDetailModal.sent_at ? new Date(showDetailModal.sent_at).toLocaleString() : 'N/A' },
                { label: 'Created', value: new Date(showDetailModal.created_at).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] text-slate-500">{item.label}</span>
                  <span className="text-xs font-medium text-slate-900 capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowDetailModal(null)} className="flex-1 text-xs py-2 bg-slate-100 text-slate-700 rounded-lg">Close</button>
              {(() => {
                const action = STATUS_ACTIONS[showDetailModal.status];
                if (!action || !action.roles.includes(user?.role || '')) return null;
                return (
                  <button onClick={() => handleTransition(showDetailModal.id, action.next)} className={`flex-1 text-xs py-2 text-white rounded-lg ${action.color}`}>
                    {action.label}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
