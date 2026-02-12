import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { workflowService, dashboardService } from '../../services';
import type { Order, WorkerDashboardData, WorkItem } from '../../types';
import { REJECTION_CODES } from '../../types';
import { Play, Send, X, AlertTriangle, Clock, Target, Inbox, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStartNext = async () => {
    setSubmitting(true);
    try {
      const res = await workflowService.startNext();
      if (res.data.order) {
        setCurrentOrder(res.data.order);
        loadData();
      }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    try {
      await workflowService.submitWork(currentOrder.id, submitComment);
      setSubmitComment('');
      setCurrentOrder(null);
      loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!currentOrder || !rejectReason || !rejectCode) return;
    setSubmitting(true);
    try {
      await workflowService.rejectOrder(currentOrder.id, rejectReason, rejectCode, routeTo || undefined);
      setShowReject(false);
      setRejectReason('');
      setRejectCode('');
      setRouteTo('');
      setCurrentOrder(null);
      loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleHold = async () => {
    if (!currentOrder || !holdReason) return;
    setSubmitting(true);
    try {
      await workflowService.holdOrder(currentOrder.id, holdReason);
      setShowHold(false);
      setHoldReason('');
      setCurrentOrder(null);
      loadData();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const canReject = user?.role === 'checker' || user?.role === 'qa';
  const canHold = ['checker', 'qa', 'operations_manager'].includes(user?.role);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loading-shimmer w-full max-w-lg h-48 rounded-xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">My Queue</h1>
          <p className="text-xs text-slate-500">{user?.role?.replace('_', ' ')} · {user?.project?.name || 'No project'}</p>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Completed', value: data?.today_completed ?? 0, icon: Target, color: 'text-green-600 bg-green-50' },
          { label: 'Target', value: data?.daily_target ?? 0, icon: Target, color: 'text-blue-600 bg-blue-50' },
          { label: 'Queue', value: data?.queue_count ?? 0, icon: Inbox, color: 'text-amber-600 bg-amber-50' },
          { label: 'Progress', value: `${data?.target_progress ?? 0}%`, icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.color}`}>
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {data && data.daily_target > 0 && (
        <div className="bg-white rounded-xl p-3 border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Daily Progress</span>
            <span className="text-xs font-medium text-slate-700">{data.today_completed}/{data.daily_target}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(data.target_progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Order or Start Next */}
      {currentOrder ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-1" />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-slate-500">Current Order</span>
                <h3 className="font-semibold text-slate-900">{currentOrder.order_number}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  currentOrder.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  currentOrder.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{currentOrder.priority}</span>
                <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">{currentOrder.workflow_state}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Client Ref', value: currentOrder.client_reference },
                { label: 'Due Date', value: currentOrder.due_date || 'N/A' },
                { label: 'Attempts', value: `D:${currentOrder.attempt_draw} C:${currentOrder.attempt_check} Q:${currentOrder.attempt_qa}` },
                { label: 'Rejections', value: currentOrder.recheck_count },
              ].map((f, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400">{f.label}</div>
                  <div className="text-xs font-medium text-slate-700">{f.value}</div>
                </div>
              ))}
            </div>

            {/* Previous rejection info */}
            {currentOrder.rejection_reason && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
                <div className="text-[10px] font-medium text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Previous Rejection
                </div>
                <div className="text-xs text-red-600 mt-0.5">{currentOrder.rejection_reason}</div>
              </div>
            )}

            {/* Work history */}
            {workItems.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 uppercase mb-1">History</div>
                <div className="space-y-1">
                  {workItems.slice(-3).map((wi) => (
                    <div key={wi.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-medium">{wi.stage}</span>
                      <ChevronRight className="h-2.5 w-2.5" />
                      <span>{wi.status}</span>
                      {wi.rework_reason && <span className="text-red-500">— {wi.rework_reason}</span>}
                      <span className="ml-auto">{wi.assignedUser?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit comment */}
            <div className="mb-3">
              <textarea
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
                placeholder="Notes (optional)..."
                className="w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-16"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Submit to Next Stage
              </button>
              {canReject && (
                <button
                  onClick={() => setShowReject(true)}
                  className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-medium py-2 px-3 rounded-lg hover:bg-red-100"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              )}
              {canHold && (
                <button
                  onClick={() => setShowHold(true)}
                  className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-medium py-2 px-3 rounded-lg hover:bg-amber-100"
                >
                  <Clock className="h-3.5 w-3.5" /> Hold
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
          <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-3">No order currently assigned.</p>
          <button
            onClick={handleStartNext}
            disabled={submitting || (data?.queue_count === 0)}
            className="inline-flex items-center gap-2 bg-teal-600 text-white text-sm font-medium py-2.5 px-6 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" /> Start Next
          </button>
          {data?.queue_count === 0 && (
            <p className="text-[10px] text-slate-400 mt-2">Queue is empty</p>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Reject Order</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Reason Code *</label>
                <select value={rejectCode} onChange={(e) => setRejectCode(e.target.value)} className="w-full text-xs p-2 border rounded-lg mt-1">
                  <option value="">Select reason code...</option>
                  {REJECTION_CODES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              {user?.role === 'qa' && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Route To</label>
                  <select value={routeTo} onChange={(e) => setRouteTo(e.target.value)} className="w-full text-xs p-2 border rounded-lg mt-1">
                    <option value="">Default (Checker)</option>
                    <option value="check">Back to Checker</option>
                    <option value="draw">Back to Drawer</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-500 uppercase">Reason (detailed) *</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full text-xs p-2 border rounded-lg mt-1 h-20 resize-none" placeholder="Mandatory: describe the issue..." />
              </div>
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={!rejectCode || rejectReason.length < 5 || submitting} className="flex-1 bg-red-600 text-white text-xs py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
                <button onClick={() => setShowReject(false)} className="flex-1 bg-slate-100 text-slate-700 text-xs py-2 rounded-lg hover:bg-slate-200">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHold && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Place on Hold</h3>
            <div className="space-y-3">
              <textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="w-full text-xs p-2 border rounded-lg h-20 resize-none" placeholder="Reason for hold..." />
              <div className="flex gap-2">
                <button onClick={handleHold} disabled={holdReason.length < 3 || submitting} className="flex-1 bg-amber-600 text-white text-xs py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50">Hold</button>
                <button onClick={() => setShowHold(false)} className="flex-1 bg-slate-100 text-slate-700 text-xs py-2 rounded-lg hover:bg-slate-200">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingUp(props: any) {
  return <Target {...props} />;
}
