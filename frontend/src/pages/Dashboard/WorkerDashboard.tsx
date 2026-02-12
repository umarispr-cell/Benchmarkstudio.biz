import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { workflowService, dashboardService } from '../../services';
import type { Order, WorkerDashboardData, WorkItem } from '../../types';
import { REJECTION_CODES } from '../../types';
import { AnimatedPage, PageHeader, StatCard, StatusBadge, Modal, Button } from '../../components/ui';
import { Play, Send, X, AlertTriangle, Clock, Target, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WorkerDashboard() {
  const user = useSelector((state: any) => state.auth.user);
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCode, setRejectCode] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [showHold, setShowHold] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [dashRes, currentRes] = await Promise.all([
        dashboardService.worker(),
        workflowService.myCurrent(),
      ]);
      setData(dashRes.data);
      setCurrentOrder(currentRes.data.order);
      if (currentRes.data.order) {
        const itemsRes = await workflowService.workItemHistory(currentRes.data.order.id);
        setWorkItems(itemsRes.data.work_items);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, [loadData]);

  const handleStartNext = async () => {
    setSubmitting(true);
    try {
      const res = await workflowService.startNext();
      if (res.data.order) { setCurrentOrder(res.data.order); loadData(); }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    try {
      await workflowService.submitWork(currentOrder.id, submitComment);
      setSubmitComment(''); setCurrentOrder(null); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!currentOrder || !rejectReason || !rejectCode) return;
    setSubmitting(true);
    try {
      await workflowService.rejectOrder(currentOrder.id, rejectReason, rejectCode, routeTo || undefined);
      setShowReject(false); setRejectReason(''); setRejectCode(''); setRouteTo('');
      setCurrentOrder(null); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleHold = async () => {
    if (!currentOrder || !holdReason) return;
    setSubmitting(true);
    try {
      await workflowService.holdOrder(currentOrder.id, holdReason);
      setShowHold(false); setHoldReason(''); setCurrentOrder(null); loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const canReject = user?.role === 'checker' || user?.role === 'qa';
  const canHold = ['checker', 'qa', 'operations_manager'].includes(user?.role);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 loading-skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 loading-skeleton" />)}</div>
      <div className="h-64 loading-skeleton" />
    </div>
  );

  const progress = data?.daily_target ? Math.min(100, Math.round(((data?.today_completed ?? 0) / data.daily_target) * 100)) : 0;

  return (
    <AnimatedPage>
      <PageHeader
        title="My Queue"
        subtitle={`${user?.role?.replace('_', ' ')} ${user?.project?.name ? `· ${user.project.name}` : ''}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Completed Today" value={data?.today_completed ?? 0} icon={Target} color="green" />
        <StatCard label="Daily Target" value={data?.daily_target ?? 0} icon={Target} color="blue" />
        <StatCard label="Queue Size" value={data?.queue_count ?? 0} icon={Inbox} color="amber" />
        <StatCard label="Progress" value={`${progress}%`} icon={Target} color="teal">
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </StatCard>
      </div>

      {/* Current Order */}
      {currentOrder ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Current Order</h3>
              <p className="text-xs text-slate-400 mt-0.5">Complete this before starting a new one</p>
            </div>
            <StatusBadge status={currentOrder.workflow_state} />
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div>
                <div className="text-xs text-slate-400 mb-1">Order #</div>
                <div className="text-sm font-semibold text-slate-900">{currentOrder.order_number}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Priority</div>
                <StatusBadge status={currentOrder.priority} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Attempt</div>
                <div className="text-sm font-medium text-slate-700">#{(currentOrder.attempt_draw || 0) + (currentOrder.attempt_check || 0) + (currentOrder.attempt_qa || 0) || 1}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Client Ref</div>
                <div className="text-sm font-medium text-slate-700">{currentOrder.client_reference || '—'}</div>
              </div>
            </div>

            {/* Rejection info */}
            {currentOrder.rejection_reason && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-rose-700 mb-1">
                  <AlertTriangle className="h-4 w-4" /> Previous Rejection
                </div>
                <p className="text-sm text-rose-600">{currentOrder.rejection_reason}</p>
              </div>
            )}

            {/* Work History */}
            {workItems.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Work History</h4>
                <div className="space-y-1.5">
                  {workItems.slice(0, 5).map((wi) => (
                    <div key={wi.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={wi.stage} size="xs" dot={false} />
                        <span className="text-slate-500">{wi.status}</span>
                      </div>
                      {wi.comments && <span className="text-xs text-slate-400 truncate max-w-[200px]">{wi.comments}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit form */}
            <div className="space-y-3">
              <textarea
                value={submitComment}
                onChange={e => setSubmitComment(e.target.value)}
                placeholder="Add a comment (optional)..."
                className="textarea"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleSubmit} loading={submitting} icon={<Send className="h-4 w-4" />}>
                  Submit Work
                </Button>
                {canReject && (
                  <Button variant="danger" onClick={() => setShowReject(true)} icon={<X className="h-4 w-4" />}>
                    Reject
                  </Button>
                )}
                {canHold && (
                  <Button variant="secondary" onClick={() => setShowHold(true)} icon={<Clock className="h-4 w-4" />}>
                    Hold
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200/60 flex flex-col items-center justify-center py-16"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-700 mb-1">No active order</h3>
          <p className="text-sm text-slate-400 mb-5">Click below to pull the next order from your queue</p>
          <Button size="lg" onClick={handleStartNext} loading={submitting} icon={<Play className="h-4 w-4" />}>
            Start Next Order
          </Button>
        </motion.div>
      )}

      {/* Reject Modal */}
      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Order" subtitle="Provide reason for rejection">
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Code</label>
            <select value={rejectCode} onChange={e => setRejectCode(e.target.value)} className="select">
              <option value="">Select reason code...</option>
              {REJECTION_CODES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Details</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="textarea" placeholder="Describe the issue..." />
          </div>
          {user?.role === 'qa' && (
            <div>
              <label className="label">Route to (optional)</label>
              <select value={routeTo} onChange={e => setRouteTo(e.target.value)} className="select">
                <option value="">Auto (previous stage)</option>
                <option value="draw">Drawing</option>
                <option value="check">Checking</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} loading={submitting} disabled={!rejectCode || !rejectReason}>Reject Order</Button>
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal open={showHold} onClose={() => setShowHold(false)} title="Put Order On Hold" subtitle="This order will be paused">
        <div>
          <label className="label">Reason for hold</label>
          <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)} className="textarea" placeholder="Why is this order on hold?" />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowHold(false)}>Cancel</Button>
          <Button onClick={handleHold} loading={submitting} disabled={!holdReason}>Put On Hold</Button>
        </div>
      </Modal>
    </AnimatedPage>
  );
}
