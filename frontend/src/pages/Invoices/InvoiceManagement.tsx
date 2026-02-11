import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { invoiceService, projectService } from '../../services';
import type { Invoice } from '../../types';
import { FileText, Plus, Search, Eye, CheckCircle, Send, DollarSign, Clock, XCircle, TrendingUp, ArrowRight, Calendar, Tag, Receipt, X } from 'lucide-react';

const emptyInvoiceForm = {
  invoice_number: '',
  project_id: '',
  invoice_category: 'general',
  total_amount: '',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: '',
  notes: '',
};

const InvoiceManagement = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyInvoiceForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState<Invoice | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [selectedStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchTerm) params.search = searchTerm;
      
      const response = await invoiceService.getAll(params);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadInvoices();
  };

  const handleApprove = async (invoiceId: number) => {
    try {
      await invoiceService.approve(invoiceId);
      loadInvoices();
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleMarkAsSent = async (invoiceId: number) => {
    try {
      await invoiceService.markAsSent(invoiceId);
      loadInvoices();
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
    }
  };

  const openCreateModal = async () => {
    setFormData(emptyInvoiceForm);
    setFormError('');
    try {
      const res = await projectService.getAll();
      setProjects(res.data);
    } catch (e) { /* ignore */ }
    setShowModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!formData.invoice_number || !formData.total_amount) {
      setFormError('Invoice number and amount are required.');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      await invoiceService.create({
        ...formData,
        project_id: formData.project_id ? Number(formData.project_id) : undefined,
        total_amount: Number(formData.total_amount),
      } as any);
      setShowModal(false);
      loadInvoices();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: FileText };
      case 'pending_approval': return { color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Clock };
      case 'approved': return { color: 'from-teal-500 to-cyan-600', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', icon: CheckCircle };
      case 'sent': return { color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', icon: Send };
      case 'paid': return { color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: CheckCircle };
      case 'cancelled': return { color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', icon: XCircle };
      default: return { color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: FileText };
    }
  };

  const canManageInvoices = ['ceo', 'director', 'accounts_manager'].includes(user?.role || '');
  const canApprove = ['ceo', 'director'].includes(user?.role || '');

  const filteredInvoices = invoices.filter(invoice => 
    searchTerm === '' || 
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
  const paidAmount = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Billing</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Invoice Management</h1>
          <p className="text-slate-500 mt-2">Manage invoices and billing</p>
        </div>
        {canManageInvoices && (
          <button onClick={openCreateModal} className="btn btn-primary group">
            <Plus className="w-4 h-4" />
            New Invoice
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: filteredInvoices.length, prefix: '', color: 'from-slate-500 to-gray-600', icon: FileText },
          { label: 'Total Amount', value: totalAmount.toFixed(2), prefix: '$', color: 'from-teal-500 to-cyan-600', icon: DollarSign },
          { label: 'Paid Amount', value: paidAmount.toFixed(2), prefix: '$', color: 'from-emerald-500 to-green-600', icon: CheckCircle },
          { label: 'Pending', value: pendingAmount.toFixed(2), prefix: '$', color: 'from-amber-500 to-orange-600', icon: Clock },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.prefix}{stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">Updated now</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-amber-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input pl-11"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
            aria-label="Filter by status"
          >
            <option value="all">📋 All Status</option>
            <option value="draft">📝 Draft</option>
            <option value="pending_approval">⏳ Pending Approval</option>
            <option value="approved">✅ Approved</option>
            <option value="sent">📤 Sent</option>
            <option value="paid">💰 Paid</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>

          <button onClick={handleSearch} className="btn btn-secondary">
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-slate-500 font-medium">Loading invoices...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const statusConfig = getStatusConfig(invoice.status);
            const StatusIcon = statusConfig.icon;
            const amount = invoice.total_amount ?? 0;
            
            return (
              <div key={invoice.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200/50 transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${statusConfig.color} shadow-lg group-hover:scale-110 transition-transform`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{invoice.invoice_number}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              Amount
                            </div>
                            <div className="text-lg font-bold text-slate-900">
                              ${amount.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Issue Date
                            </div>
                            <div className="font-semibold text-slate-700">
                              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : new Date(invoice.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <Clock className="w-3.5 h-3.5" />
                              Due Date
                            </div>
                            <div className="font-semibold text-slate-700">
                              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <Tag className="w-3.5 h-3.5" />
                              Category
                            </div>
                            <div className="font-semibold text-slate-700">
                              {invoice.invoice_category?.replace('_', ' ') || 'General'}
                            </div>
                          </div>
                        </div>

                        {invoice.notes && (
                          <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{invoice.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setShowDetailModal(invoice)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" aria-label="View invoice details">
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                      
                      {canApprove && invoice.status === 'pending_approval' && (
                        <button
                          onClick={() => handleApprove(invoice.id)}
                          className="btn btn-success"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                      )}
                      
                      {canManageInvoices && invoice.status === 'approved' && (
                        <button
                          onClick={() => handleMarkAsSent(invoice.id)}
                          className="btn btn-primary"
                        >
                          <Send className="w-4 h-4" />
                          Mark Sent
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No invoices found</h3>
                <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search filters or create a new invoice.</p>
                {canManageInvoices && (
                  <button onClick={openCreateModal} className="btn btn-primary mt-6">
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg">
              <X className="h-5 w-5 text-slate-400" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Invoice</h2>
            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number *</label>
                <input type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} className="input" placeholder="INV-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className="input">
                  <option value="">Select project...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={formData.invoice_category} onChange={e => setFormData({...formData, invoice_category: e.target.value})} className="input">
                    <option value="general">General</option>
                    <option value="floor_plan">Floor Plan</option>
                    <option value="photos">Photos</option>
                    <option value="enhancement">Enhancement</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                  <input type="date" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input" rows={3} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary">Cancel</button>
              <button onClick={handleCreateInvoice} disabled={saving} className="flex-1 btn btn-primary">
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
            <button onClick={() => setShowDetailModal(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg">
              <X className="h-5 w-5 text-slate-400" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Invoice Details</h2>
            <div className="space-y-3">
              {[
                { label: 'Invoice Number', value: showDetailModal.invoice_number },
                { label: 'Status', value: showDetailModal.status?.replace('_', ' ') },
                { label: 'Amount', value: `$${(showDetailModal.total_amount ?? 0).toFixed(2)}` },
                { label: 'Category', value: showDetailModal.invoice_category?.replace('_', ' ') || 'General' },
                { label: 'Invoice Date', value: showDetailModal.invoice_date ? new Date(showDetailModal.invoice_date).toLocaleDateString() : 'N/A' },
                { label: 'Due Date', value: showDetailModal.due_date ? new Date(showDetailModal.due_date).toLocaleDateString() : 'N/A' },
                { label: 'Created', value: new Date(showDetailModal.created_at).toLocaleString() },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900 capitalize">{item.value}</span>
                </div>
              ))}
              {showDetailModal.notes && (
                <div className="p-3 bg-slate-50 rounded-xl mt-4">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{showDetailModal.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDetailModal(null)} className="flex-1 btn btn-secondary">Close</button>
              {canApprove && showDetailModal.status === 'pending_approval' && (
                <button onClick={() => { handleApprove(showDetailModal.id); setShowDetailModal(null); }} className="flex-1 btn btn-success">
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
              {canManageInvoices && showDetailModal.status === 'approved' && (
                <button onClick={() => { handleMarkAsSent(showDetailModal.id); setShowDetailModal(null); }} className="flex-1 btn btn-primary">
                  <Send className="w-4 h-4" />
                  Mark Sent
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;
