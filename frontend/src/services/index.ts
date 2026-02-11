import apiClient from './api';
import type {
  LoginCredentials,
  LoginResponse,
  SessionCheckResponse,
  User,
  Project,
  ProjectInput,
  ProjectStatistics,
  ProjectFilters,
  UserFilters,
  Order,
  OrderInput,
  OrderFilters,
  Invoice,
  InvoiceInput,
  InvoiceFilters,
  Team,
  PaginatedResponse,
  ApiResponse,
  DashboardStats,
  CountryStats,
  DepartmentStats,
  ProjectDashboardStats,
  WorkerStats,
  LayerStats,
} from '../types';

export type { LoginCredentials, LoginResponse };

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  checkSession: async (): Promise<SessionCheckResponse> => {
    const response = await apiClient.get('/auth/session-check');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

export const projectService = {
  getAll: async (params?: ProjectFilters): Promise<PaginatedResponse<Project>> => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: ProjectInput): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProjectInput>): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  getStatistics: async (id: number): Promise<ProjectStatistics> => {
    const response = await apiClient.get(`/projects/${id}/statistics`);
    return response.data;
  },

  getTeams: async (id: number): Promise<Team[]> => {
    const response = await apiClient.get(`/projects/${id}/teams`);
    return response.data;
  },
};

export const userService = {
  getAll: async (params?: UserFilters): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<User>> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: Partial<User> & { password: string }): Promise<ApiResponse<User>> => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  updateActivity: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post(`/users/${id}/activity`);
    return response.data;
  },

  getInactiveUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/users/inactive');
    return response.data;
  },

  reassignWork: async (fromUserId: number, toUserId: number): Promise<ApiResponse<{ message: string; count: number }>> => {
    const response = await apiClient.post('/workflow/reassign', {
      from_user_id: fromUserId,
      to_user_id: toUserId,
    });
    return response.data;
  },
};

export const dashboardService = {
  getCEO: async (): Promise<{ countries: CountryStats[]; overview: DashboardStats; recent_activities: any[] }> => {
    const response = await apiClient.get('/dashboard/ceo');
    return response.data;
  },

  getOperations: async (country?: string, department?: string): Promise<{ 
    country: string; 
    department: string; 
    projects: any[]; 
    layers: Record<string, LayerStats> 
  }> => {
    const response = await apiClient.get('/dashboard/operations', {
      params: { country, department },
    });
    return response.data;
  },

  getWorker: async (): Promise<WorkerStats> => {
    const response = await apiClient.get('/dashboard/worker');
    return response.data;
  },

  getDepartment: async (country: string, department: string): Promise<DepartmentStats> => {
    const response = await apiClient.get('/dashboard/department', {
      params: { country, department },
    });
    return response.data;
  },

  getProject: async (projectId: number): Promise<ProjectDashboardStats> => {
    const response = await apiClient.get(`/dashboard/project/${projectId}`);
    return response.data;
  },
};

export const workflowService = {
  getQueue: async (params?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/workflow/queue', { params });
    return response.data;
  },

  getOrder: async (orderId: number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.get(`/workflow/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: OrderInput): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post('/workflow/orders', data);
    return response.data;
  },

  updateOrder: async (orderId: number, data: Partial<OrderInput>): Promise<ApiResponse<Order>> => {
    const response = await apiClient.put(`/workflow/orders/${orderId}`, data);
    return response.data;
  },

  assignOrder: async (orderId: number, userId: number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/assign`, {
      user_id: userId,
    });
    return response.data;
  },

  startOrder: async (orderId: number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/start`);
    return response.data;
  },

  completeOrder: async (orderId: number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/complete`);
    return response.data;
  },

  // Rejection & Recheck
  rejectOrder: async (orderId: number, reason: string, rejectionType: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/reject`, {
      reason,
      rejection_type: rejectionType,
    });
    return response.data;
  },

  selfCorrectOrder: async (orderId: number, notes?: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/self-correct`, { notes });
    return response.data;
  },

  getRejectedOrders: async (params?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/workflow/rejected', { params });
    return response.data;
  },

  getRecentlyImported: async (params?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/workflow/recently-imported', { params });
    return response.data;
  },

  bulkAssign: async (assignments: Array<{ order_id: number; user_id: number }>): Promise<ApiResponse<{ results: any[] }>> => {
    const response = await apiClient.post('/workflow/bulk-assign', { assignments });
    return response.data;
  },

  // Client Portal Sync
  getUnsyncedOrders: async (params?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/workflow/unsynced', { params });
    return response.data;
  },

  markSynced: async (orderId: number, clientPortalId?: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/workflow/orders/${orderId}/mark-synced`, {
      client_portal_id: clientPortalId,
    });
    return response.data;
  },
};

// Order Import Service
export const orderImportService = {
  getSources: async (projectId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/import-sources`);
    return response.data;
  },

  createSource: async (projectId: number, data: {
    type: 'api' | 'cron' | 'csv' | 'manual';
    name: string;
    api_endpoint?: string;
    api_credentials?: Record<string, any>;
    cron_schedule?: string;
    field_mapping?: Record<string, string>;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/projects/${projectId}/import-sources`, data);
    return response.data;
  },

  updateSource: async (sourceId: number, data: Partial<{
    name: string;
    api_endpoint?: string;
    api_credentials?: Record<string, any>;
    cron_schedule?: string;
    field_mapping?: Record<string, string>;
    is_active: boolean;
  }>): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/import-sources/${sourceId}`, data);
    return response.data;
  },

  importCsv: async (projectId: number, file: File, sourceId?: number): Promise<ApiResponse<{
    import_log_id: number;
    total_rows: number;
    imported: number;
    skipped: number;
    errors: any[];
  }>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceId) {
      formData.append('source_id', sourceId.toString());
    }
    const response = await apiClient.post(`/projects/${projectId}/import-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  syncFromApi: async (sourceId: number): Promise<ApiResponse<{
    total: number;
    imported: number;
    skipped: number;
    errors: any[];
  }>> => {
    const response = await apiClient.post(`/import-sources/${sourceId}/sync`);
    return response.data;
  },

  getImportHistory: async (projectId: number): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get(`/projects/${projectId}/import-history`);
    return response.data;
  },

  getImportDetails: async (importLogId: number): Promise<any> => {
    const response = await apiClient.get(`/import-logs/${importLogId}`);
    return response.data;
  },
};

// Checklist Service
export const checklistService = {
  getTemplates: async (projectId: number, layer?: string): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/checklists`, {
      params: layer ? { layer } : undefined,
    });
    return response.data;
  },

  createTemplate: async (projectId: number, data: {
    layer: 'drawer' | 'checker' | 'qa' | 'designer';
    title: string;
    description?: string;
    sort_order?: number;
    is_required?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/projects/${projectId}/checklists`, data);
    return response.data;
  },

  updateTemplate: async (templateId: number, data: Partial<{
    title: string;
    description?: string;
    sort_order?: number;
    is_required?: boolean;
    is_active?: boolean;
  }>): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/checklists/${templateId}`, data);
    return response.data;
  },

  deleteTemplate: async (templateId: number): Promise<void> => {
    await apiClient.delete(`/checklists/${templateId}`);
  },

  getOrderChecklist: async (orderId: number): Promise<{
    order_id: number;
    layer: string;
    items: any[];
    all_required_completed: boolean;
  }> => {
    const response = await apiClient.get(`/orders/${orderId}/checklist`);
    return response.data;
  },

  updateOrderChecklist: async (orderId: number, templateId: number, data: {
    is_checked: boolean;
    notes?: string;
  }): Promise<ApiResponse<{ all_required_completed: boolean }>> => {
    const response = await apiClient.put(`/orders/${orderId}/checklist/${templateId}`, data);
    return response.data;
  },

  bulkUpdateOrderChecklist: async (orderId: number, items: Array<{
    template_id: number;
    is_checked: boolean;
    notes?: string;
  }>): Promise<ApiResponse<{ all_required_completed: boolean }>> => {
    const response = await apiClient.put(`/orders/${orderId}/checklist`, { items });
    return response.data;
  },

  getChecklistStatus: async (orderId: number): Promise<{
    order_id: number;
    layer: string;
    required_items: number;
    completed_required: number;
    total_items: number;
    completed_total: number;
    can_complete: boolean;
    percentage: number;
  }> => {
    const response = await apiClient.get(`/orders/${orderId}/checklist-status`);
    return response.data;
  },
};

export const invoiceService = {
  getAll: async (params?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get('/invoices', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: InvoiceInput): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post('/invoices', data);
    return response.data;
  },

  update: async (id: number, data: Partial<InvoiceInput>): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.put(`/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },

  submitForApproval: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post(`/invoices/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post(`/invoices/${id}/approve`);
    return response.data;
  },

  markAsSent: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post(`/invoices/${id}/sent`);
    return response.data;
  },
};
