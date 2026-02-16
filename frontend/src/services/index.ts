import api from './api';
import type {
  User, LoginCredentials, LoginResponse, SessionCheckResponse,
  Project, ProjectInput, Team,
  Order, WorkItem, MonthLock, Invoice, InvoiceInput,
  MasterDashboard, ProjectDashboard, WorkerDashboardData, OpsDashboardData, QueueHealth,
  DailyOperationsData,
  PaginatedResponse, Notification,
  OrderImportSource, OrderImportLog, ChecklistTemplate, OrderChecklist,
  WorkflowState, InvoiceStatus,
} from '../types';

// ═══════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════
export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get<User>('/auth/profile'),
  sessionCheck: () => api.get<SessionCheckResponse>('/auth/session-check'),
  forceLogout: (userId: number) => api.post(`/auth/force-logout/${userId}`),
};

// ═══════════════════════════════════════════
// WORKFLOW SERVICE (State Machine)
// ═══════════════════════════════════════════
export const workflowService = {
  // Worker: Start Next (auto-assignment — NO manual picking)
  startNext: () => api.post<{ order: Order; message: string }>('/workflow/start-next'),

  // Worker: Get current assigned order
  myCurrent: () => api.get<{ order: Order | null }>('/workflow/my-current'),
  
  // Worker: Get queue of orders assigned to worker
  getQueue: () => api.get<{ orders: Order[] }>('/workflow/my-queue'),
  
  // Worker: Get completed orders today
  getCompleted: () => api.get<{ orders: Order[] }>('/workflow/my-completed'),
  
  // Worker: Get order history (all time)
  getHistory: (page?: number) => api.get<{ data: Order[]; current_page: number; last_page: number }>('/workflow/my-history', { params: { page } }),
  
  // Worker: Get performance stats
  getPerformance: () => api.get<{
    today_completed: number;
    week_completed: number;
    month_completed: number;
    daily_target: number;
    weekly_target: number;
    weekly_rate: number;
    avg_time_minutes: number;
    daily_stats: Array<{ date: string; day: string; count: number }>;
  }>('/workflow/my-performance'),

  // Worker: Submit completed work
  submitWork: (orderId: number, comments?: string) =>
    api.post<{ order: Order; message: string }>(`/workflow/orders/${orderId}/submit`, { comments }),

  // Worker: My daily stats
  myStats: () => api.get<{ today_completed: number; daily_target: number; wip_count: number; queue_count: number; is_absent: boolean }>('/workflow/my-stats'),
  
  // Worker: Reassign order back to queue
  reassignToQueue: (orderId: number, reason?: string) =>
    api.post<{ order: Order; message: string }>(`/workflow/orders/${orderId}/reassign-queue`, { reason }),
  
  // Worker: Flag issue on order
  flagIssue: (orderId: number, flagType: string, description: string, severity?: string) =>
    api.post<{ flag: any; message: string }>(`/workflow/orders/${orderId}/flag-issue`, { flag_type: flagType, description, severity }),
  
  // Worker: Request help/clarification
  requestHelp: (orderId: number, question: string) =>
    api.post<{ help_request: any; message: string }>(`/workflow/orders/${orderId}/request-help`, { question }),
  
  // Worker: Timer controls
  startTimer: (orderId: number) =>
    api.post<{ work_item: WorkItem; message: string }>(`/workflow/orders/${orderId}/timer/start`),
  stopTimer: (orderId: number) =>
    api.post<{ work_item: WorkItem; time_added_seconds: number; total_time_seconds: number; message: string }>(`/workflow/orders/${orderId}/timer/stop`),
  
  // Worker: Full order details
  orderFullDetails: (orderId: number) =>
    api.get<{
      order: Order;
      supervisor_notes: string | null;
      attachments: Array<{ name: string; url: string; type: string }>;
      help_requests: any[];
      issue_flags: any[];
      current_time_seconds: number;
      timer_running: boolean;
    }>(`/workflow/orders/${orderId}/full-details`),

  // Checker/QA: Reject order (mandatory reason)
  rejectOrder: (orderId: number, reason: string, rejectionCode: string, routeTo?: string) =>
    api.post<{ order: Order }>(`/workflow/orders/${orderId}/reject`, { reason, rejection_code: rejectionCode, route_to: routeTo }),

  // Hold/Resume
  holdOrder: (orderId: number, holdReason: string) =>
    api.post<{ order: Order }>(`/workflow/orders/${orderId}/hold`, { hold_reason: holdReason }),
  resumeOrder: (orderId: number) =>
    api.post<{ order: Order }>(`/workflow/orders/${orderId}/resume`),

  // Order details (role-filtered by backend)
  orderDetails: (orderId: number) =>
    api.get<{ order: Order }>(`/workflow/orders/${orderId}`),

  // Work item history
  workItemHistory: (orderId: number) =>
    api.get<{ work_items: WorkItem[] }>(`/workflow/work-items/${orderId}`),

  // Management: Receive new order
  receiveOrder: (data: { project_id: number; client_reference: string; priority?: string; due_date?: string; metadata?: Record<string, unknown> }) =>
    api.post<{ order: Order }>('/workflow/receive', data),

  // Management: Reassign order
  reassignOrder: (orderId: number, userId: number | null, reason: string) =>
    api.post<{ order: Order }>(`/workflow/orders/${orderId}/reassign`, { user_id: userId, reason }),

  // Management: Queue health
  queueHealth: (projectId: number) =>
    api.get<QueueHealth>(`/workflow/${projectId}/queue-health`),

  // Management: Staffing
  staffing: (projectId: number) =>
    api.get<{ project_id: number; staffing: Record<string, { role: string; total: number; active: number; absent: number; users: User[] }> }>(`/workflow/${projectId}/staffing`),

  // Management: Project orders
  projectOrders: (projectId: number, filters?: { state?: WorkflowState; priority?: string }) =>
    api.get<PaginatedResponse<Order>>(`/workflow/${projectId}/orders`, { params: filters }),
};

// ═══════════════════════════════════════════
// DASHBOARD SERVICE
// ═══════════════════════════════════════════
export const dashboardService = {
  // CEO/Director: Master drilldown
  master: () => api.get<MasterDashboard>('/dashboard/master'),

  // Project-level dashboard
  project: (projectId: number) => api.get<ProjectDashboard>(`/dashboard/project/${projectId}`),

  // Ops Manager
  operations: () => api.get<OpsDashboardData>('/dashboard/operations'),

  // Worker personal
  worker: () => api.get<WorkerDashboardData>('/dashboard/worker'),

  // Absentees
  absentees: () => api.get<{ absentees: User[] }>('/dashboard/absentees'),

  // CEO: Daily Operations - All projects with layer-wise worker activity
  dailyOperations: (date?: string) =>
    api.get<DailyOperationsData>('/dashboard/daily-operations', { params: date ? { date } : {} }),
};

// ═══════════════════════════════════════════
// MONTH LOCK SERVICE
// ═══════════════════════════════════════════
export const monthLockService = {
  list: (projectId: number) =>
    api.get<{ locks: MonthLock[] }>(`/month-locks/${projectId}`),

  lock: (projectId: number, month: number, year: number) =>
    api.post<{ lock: MonthLock }>(`/month-locks/${projectId}/lock`, { month, year }),

  unlock: (projectId: number, month: number, year: number) =>
    api.post<{ lock: MonthLock }>(`/month-locks/${projectId}/unlock`, { month, year }),

  counts: (projectId: number, month: number, year: number) =>
    api.get<{ counts: Record<string, unknown>; is_locked: boolean }>(`/month-locks/${projectId}/counts`, { params: { month, year } }),

  clearPanel: (projectId: number) =>
    api.post(`/month-locks/${projectId}/clear`),
};

// ═══════════════════════════════════════════
// INVOICE SERVICE (Draft → Prepared → Approved → Issued → Sent)
// ═══════════════════════════════════════════
export const invoiceService = {
  list: (filters?: { project_id?: number; status?: InvoiceStatus; month?: number; year?: number }) =>
    api.get<PaginatedResponse<Invoice>>('/invoices', { params: filters }),

  create: (data: InvoiceInput) =>
    api.post<{ invoice: Invoice }>('/invoices', data),

  show: (id: number) =>
    api.get<{ invoice: Invoice }>(`/invoices/${id}`),

  transition: (id: number, toStatus: InvoiceStatus) =>
    api.post<{ invoice: Invoice }>(`/invoices/${id}/transition`, { to_status: toStatus }),

  delete: (id: number) =>
    api.delete(`/invoices/${id}`),
};

// ═══════════════════════════════════════════
// PROJECT SERVICE
// ═══════════════════════════════════════════
export const projectService = {
  list: (filters?: { country?: string; department?: string; status?: string }) =>
    api.get<PaginatedResponse<Project>>('/projects', { params: filters }),
  get: (id: number) => api.get<{ data: Project }>(`/projects/${id}`),
  create: (data: ProjectInput) => api.post<{ data: Project }>('/projects', data),
  update: (id: number, data: Partial<ProjectInput>) => api.put<{ data: Project }>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  statistics: (id: number) => api.get(`/projects/${id}/statistics`),
  teams: (id: number) => api.get<{ data: Team[] }>(`/projects/${id}/teams`),
};

// ═══════════════════════════════════════════
// USER SERVICE
// ═══════════════════════════════════════════
export const userService = {
  list: (filters?: { role?: string; country?: string; project_id?: number }) =>
    api.get<PaginatedResponse<User>>('/users', { params: filters }),
  get: (id: number) => api.get<{ data: User }>(`/users/${id}`),
  create: (data: Partial<User> & { password: string; password_confirmation: string }) =>
    api.post<{ data: User }>('/users', data),
  update: (id: number, data: Partial<User>) =>
    api.put<{ data: User }>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  deactivate: (id: number) => api.post(`/users/${id}/deactivate`),
  inactive: () => api.get<{ data: User[] }>('/users-inactive'),
  reassignWork: (userId: number) =>
    api.post('/users/reassign-work', { user_id: userId }),
};

// ═══════════════════════════════════════════
// IMPORT SERVICE
// ═══════════════════════════════════════════
export const orderImportService = {
  sources: (projectId: number) =>
    api.get<{ data: OrderImportSource[] }>(`/projects/${projectId}/import-sources`),
  createSource: (projectId: number, data: Partial<OrderImportSource>) =>
    api.post(`/projects/${projectId}/import-sources`, data),
  updateSource: (sourceId: number, data: Partial<OrderImportSource>) =>
    api.put(`/import-sources/${sourceId}`, data),
  importCsv: (projectId: number, formData: FormData) =>
    api.post(`/projects/${projectId}/import-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  syncFromApi: (sourceId: number) =>
    api.post(`/import-sources/${sourceId}/sync`),
  importHistory: (projectId: number) =>
    api.get<{ data: OrderImportLog[] }>(`/projects/${projectId}/import-history`),
  importDetails: (logId: number) =>
    api.get<{ data: OrderImportLog }>(`/import-logs/${logId}`),
};

// ═══════════════════════════════════════════
// CHECKLIST SERVICE
// ═══════════════════════════════════════════
export const checklistService = {
  templates: (projectId: number) =>
    api.get<{ data: ChecklistTemplate[] }>(`/projects/${projectId}/checklists`),
  createTemplate: (projectId: number, data: Partial<ChecklistTemplate>) =>
    api.post(`/projects/${projectId}/checklists`, data),
  updateTemplate: (templateId: number, data: Partial<ChecklistTemplate>) =>
    api.put(`/checklists/${templateId}`, data),
  deleteTemplate: (templateId: number) =>
    api.delete(`/checklists/${templateId}`),
  orderChecklist: (orderId: number) =>
    api.get<{ data: OrderChecklist[] }>(`/orders/${orderId}/checklist`),
  updateOrderChecklist: (orderId: number, templateId: number, data: Partial<OrderChecklist>) =>
    api.put(`/orders/${orderId}/checklist/${templateId}`, data),
  bulkUpdate: (orderId: number, items: Partial<OrderChecklist>[]) =>
    api.put(`/orders/${orderId}/checklist`, { items }),
  checklistStatus: (orderId: number) =>
    api.get(`/orders/${orderId}/checklist-status`),
};

// ═══════════════════════════════════════════
// NOTIFICATION SERVICE
// ═══════════════════════════════════════════
export const notificationService = {
  list: (page = 1, unreadOnly = false) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params: { page, unread_only: unreadOnly ? 1 : 0 } }),
  unreadCount: () =>
    api.get<{ unread_count: number }>('/notifications/unread-count'),
  markRead: (id: number) =>
    api.post(`/notifications/${id}/read`),
  markAllRead: () =>
    api.post('/notifications/read-all'),
  destroy: (id: number) =>
    api.delete(`/notifications/${id}`),
};
