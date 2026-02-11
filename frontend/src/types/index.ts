// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ceo' | 'director' | 'operations_manager' | 'qa' | 'checker' | 'drawer' | 'designer' | 'accounts_manager';
  country: string;
  department: 'floor_plan' | 'photos_enhancement';
  project_id?: number;
  team_id?: number;
  layer?: 'drawer' | 'checker' | 'qa' | 'designer';
  is_active: boolean;
  last_activity: string;
  inactive_days: number;
  created_at: string;
  updated_at: string;
  project?: Project;
  team?: Team;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SessionCheckResponse {
  valid: boolean;
  user?: User;
}

// Project Types
export interface Project {
  id: number;
  code: string;
  name: string;
  country: string;
  department: 'floor_plan' | 'photos_enhancement';
  client_name: string;
  description?: string;
  status: 'active' | 'inactive' | 'completed';
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_teams: number;
  active_teams: number;
  total_staff: number;
  active_staff: number;
  workflow_layers: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  teams?: Team[];
  users?: User[];
  orders?: Order[];
}

export interface ProjectInput {
  code: string;
  name: string;
  country: string;
  department: 'floor_plan' | 'photos_enhancement';
  client_name: string;
  status?: 'active' | 'inactive' | 'completed';
  workflow_layers: string[];
  metadata?: Record<string, any>;
}

export interface ProjectStatistics {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  total_teams: number;
  active_teams: number;
  total_staff: number;
  active_staff: number;
}

// Team Types
export interface Team {
  id: number;
  project_id: number;
  name: string;
  qa_count: number;
  checker_count: number;
  drawer_count: number;
  designer_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  project?: Project;
  users?: User[];
}

// Order Types
export interface Order {
  id: number;
  order_number: string;
  title?: string;
  project_id: number;
  client_reference?: string;
  current_layer: 'drawer' | 'checker' | 'qa' | 'designer';
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  assigned_to?: number;
  team_id?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  received_at: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  // Import fields
  import_source?: 'api' | 'cron' | 'csv' | 'manual';
  import_log_id?: number;
  // Rejection fields
  recheck_count?: number;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  rejection_type?: 'quality' | 'incomplete' | 'incorrect' | 'rework' | 'other';
  checker_self_corrected?: boolean;
  // Client portal fields
  client_portal_id?: string;
  client_portal_synced_at?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  team?: Team;
  assignedUser?: User;
  rejected_by_user?: User;
  workAssignments?: WorkAssignment[];
  checklists?: OrderChecklist[];
  importLog?: OrderImportLog;
}

export interface OrderInput {
  order_number: string;
  project_id: number;
  client_reference?: string;
  current_layer: 'drawer' | 'checker' | 'qa' | 'designer';
  status?: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  assigned_to?: number;
  team_id?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  received_at: string;
  metadata?: Record<string, any>;
}

// Work Assignment Types
export interface WorkAssignment {
  id: number;
  order_id: number;
  user_id: number;
  layer: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  status: 'assigned' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
  order?: Order;
  user?: User;
}

// Order Import Types
export interface OrderImportSource {
  id: number;
  project_id: number;
  type: 'api' | 'cron' | 'csv' | 'manual';
  name: string;
  api_endpoint?: string;
  cron_schedule?: string;
  last_sync_at?: string;
  orders_synced: number;
  is_active: boolean;
  field_mapping?: Record<string, string>;
  created_at: string;
  updated_at: string;
  latestImport?: OrderImportLog;
}

export interface OrderImportLog {
  id: number;
  import_source_id: number;
  imported_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  orders_imported: number;
  orders_skipped: number;
  error_count: number;
  errors?: Array<{ row?: number; message: string; timestamp?: string }>;
  file_path?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  importSource?: OrderImportSource;
  importedBy?: User;
}

// Checklist Types
export interface ChecklistTemplate {
  id: number;
  project_id: number;
  layer: 'drawer' | 'checker' | 'qa' | 'designer';
  title: string;
  description?: string;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderChecklist {
  id: number;
  order_id: number;
  checklist_template_id: number;
  completed_by: number;
  is_checked: boolean;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  template?: ChecklistTemplate;
  completedBy?: User;
}

export interface ChecklistItem {
  id: number;
  template_id: number;
  title: string;
  description?: string;
  is_required: boolean;
  is_checked: boolean;
  notes?: string;
  completed_at?: string;
}

// Invoice Types
export interface Invoice {
  id: number;
  invoice_number: string;
  project_id: number;
  month: string;
  year: string;
  service_counts: Record<string, number>;
  total_amount?: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'paid';
  prepared_by: number;
  approved_by?: number;
  approved_at?: string;
  invoice_date?: string;
  due_date?: string;
  invoice_category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  preparedBy?: User;
  approvedBy?: User;
}

export interface InvoiceInput {
  invoice_number: string;
  project_id: number;
  month: string;
  year: string;
  service_counts: Record<string, number>;
  total_amount?: number;
  status?: 'draft' | 'pending_approval' | 'approved' | 'sent';
}

// Dashboard Types
export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  total_users: number;
  active_users: number;
}

export interface CountryStats extends DashboardStats {
  country: string;
}

export interface DepartmentStats extends DashboardStats {
  country: string;
  department: string;
}

export interface ProjectDashboardStats {
  project: Project;
  orders: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
  teams: {
    total: number;
    active: number;
  };
  staff: {
    total: number;
    active: number;
    by_layer: Record<string, number>;
  };
}

export interface LayerStats {
  pending: number;
  in_progress: number;
  completed: number;
}

export interface WorkerStats {
  user: User;
  work_queue: Order[];
  statistics: {
    assigned: number;
    in_progress: number;
    completed_today: number;
    completed_this_week: number;
  };
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Query Parameters
export interface ProjectFilters {
  country?: string;
  department?: string;
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface UserFilters {
  role?: string;
  country?: string;
  department?: string;
  project_id?: number;
  team_id?: number;
  is_active?: boolean;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface OrderFilters {
  project_id?: number;
  status?: string;
  layer?: string;
  priority?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface InvoiceFilters {
  project_id?: number;
  status?: string;
  month?: string;
  year?: string;
  search?: string;
  per_page?: number;
  page?: number;
}
