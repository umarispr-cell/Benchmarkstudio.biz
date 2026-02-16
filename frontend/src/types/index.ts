// ═══════════════════════════════════════════
// WORKFLOW STATES (must match backend StateMachine)
// ═══════════════════════════════════════════

export const FP_STATES = [
  'RECEIVED', 'QUEUED_DRAW', 'IN_DRAW', 'SUBMITTED_DRAW',
  'QUEUED_CHECK', 'IN_CHECK', 'REJECTED_BY_CHECK', 'SUBMITTED_CHECK',
  'QUEUED_QA', 'IN_QA', 'REJECTED_BY_QA', 'APPROVED_QA',
  'DELIVERED', 'ON_HOLD', 'CANCELLED',
] as const;

export const PH_STATES = [
  'RECEIVED', 'QUEUED_DESIGN', 'IN_DESIGN', 'SUBMITTED_DESIGN',
  'QUEUED_QA', 'IN_QA', 'REJECTED_BY_QA', 'APPROVED_QA',
  'DELIVERED', 'ON_HOLD', 'CANCELLED',
] as const;

export type WorkflowState = typeof FP_STATES[number] | typeof PH_STATES[number];
export type WorkflowType = 'FP_3_LAYER' | 'PH_2_LAYER';

export const INVOICE_STATUSES = ['draft', 'prepared', 'approved', 'issued', 'sent'] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const REJECTION_CODES = ['quality', 'incomplete', 'wrong_specs', 'rework', 'formatting', 'missing_info'] as const;
export type RejectionCode = typeof REJECTION_CODES[number];

export const ROLES = ['ceo', 'director', 'operations_manager', 'qa', 'checker', 'drawer', 'designer', 'admin', 'accounts_manager'] as const;
export type UserRole = typeof ROLES[number];

export const PRODUCTION_ROLES: UserRole[] = ['drawer', 'checker', 'qa', 'designer'];
export const MANAGEMENT_ROLES: UserRole[] = ['ceo', 'director', 'operations_manager', 'admin'];

// ═══════════════════════════════════════════
// CORE ENTITIES
// ═══════════════════════════════════════════

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  country: string;
  department: string;
  project_id: number | null;
  team_id: number | null;
  layer: string | null;
  is_active: boolean;
  is_absent: boolean;
  last_activity: string | null;
  inactive_days: number;
  wip_count: number;
  today_completed: number;
  daily_target: number;
  shift_start: string | null;
  shift_end: string | null;
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
  warning?: string;
}

export interface SessionCheckResponse {
  valid: boolean;
  reason?: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  country: string;
  department: string;
  client_name: string;
  status: string;
  workflow_type: WorkflowType;
  wip_cap: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_teams: number;
  active_teams: number;
  total_staff: number;
  active_staff: number;
  workflow_layers: string[];
  sla_config: Record<string, unknown> | null;
  invoice_categories_config: Record<string, unknown>[] | null;
  client_portal_config: Record<string, unknown> | null;
  target_config: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  description?: string;
}

export interface ProjectInput {
  code: string;
  name: string;
  country: string;
  department: string;
  client_name?: string;
  status?: string;
  workflow_type?: WorkflowType;
  wip_cap?: number;
  workflow_layers?: string[];
  metadata?: Record<string, unknown>;
}

export interface Team {
  id: number;
  project_id: number;
  name: string;
  qa_count: number;
  checker_count: number;
  drawer_count: number;
  designer_count: number;
  is_active: boolean;
  structure_config: Record<string, unknown> | null;
  auto_assignment_rules: Record<string, unknown> | null;
}

export interface Order {
  id: number;
  order_number: string;
  project_id: number;
  client_reference: string;
  current_layer: string;
  status: string;
  workflow_state: WorkflowState;
  workflow_type: WorkflowType;
  assigned_to: number | null;
  team_id: number | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  received_at: string;
  started_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  due_date: string | null;
  metadata: Record<string, unknown> | null;
  recheck_count: number;
  attempt_draw: number;
  attempt_check: number;
  attempt_qa: number;
  is_on_hold: boolean;
  hold_reason: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_type: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  team?: Team;
  assignedUser?: User;
  work_items?: WorkItem[];
}

export interface WorkItem {
  id: number;
  order_id: number;
  project_id: number;
  stage: string;
  assigned_user_id: number | null;
  team_id: number | null;
  status: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  comments: string | null;
  rework_reason: string | null;
  rejection_code: string | null;
  attempt_number: number;
  assignedUser?: User;
}

export interface MonthLock {
  id: number;
  project_id: number;
  month: number;
  year: number;
  is_locked: boolean;
  locked_by: number | null;
  locked_at: string | null;
  unlocked_by: number | null;
  unlocked_at: string | null;
  frozen_counts: ProductionCounts | null;
  lockedByUser?: User;
  unlockedByUser?: User;
}

export interface ProductionCounts {
  received: number;
  delivered: number;
  pending: number;
  stage_completions: Record<string, number>;
  computed_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  project_id: number;
  month: string;
  year: string;
  service_counts: Record<string, number> | null;
  total_amount: number;
  status: InvoiceStatus;
  prepared_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  issued_by: number | null;
  issued_at: string | null;
  sent_at: string | null;
  locked_month_id: number | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  preparedBy?: User;
  approvedBy?: User;
  issuedBy?: User;
}

export interface InvoiceInput {
  invoice_number: string;
  project_id: number;
  month: string;
  year: string;
  service_counts?: Record<string, number>;
  total_amount?: number;
}

// ═══════════════════════════════════════════
// DASHBOARD TYPES
// ═══════════════════════════════════════════

export interface MasterDashboard {
  org_totals: OrgTotals;
  countries: CountryDashboard[];
}

export interface OrgTotals {
  total_projects: number;
  total_staff: number;
  active_staff: number;
  absentees: number;
  inactive_flagged: number; // Users inactive 15+ days per CEO requirements
  orders_received_today: number;
  orders_delivered_today: number;
  orders_received_week: number;
  orders_delivered_week: number;
  orders_received_month: number;
  orders_delivered_month: number;
  total_pending: number;
  // Overtime/Productivity Analysis per CEO requirements
  standard_shift_hours: number;
  staff_with_overtime: number;
  staff_under_target: number;
  target_hit_rate: number;
  staff_achieved_target: number;
  staff_with_targets: number;
}

export interface CountryDashboard {
  country: string;
  project_count: number;
  total_staff: number;
  active_staff: number;
  absent_staff: number;
  received_today: number;
  delivered_today: number;
  total_pending: number;
  departments: DepartmentDashboard[];
}

export interface DepartmentDashboard {
  department: string;
  project_count: number;
  total_orders: number;
  delivered_today: number;
  pending: number;
  sla_breaches: number;
  projects: ProjectSummary[];
}

export interface ProjectSummary {
  id: number;
  code: string;
  name: string;
  workflow_type: WorkflowType;
  pending: number;
  delivered_today: number;
}

export interface ProjectDashboard {
  project: Project;
  state_counts: Record<string, { count: number; oldest: string | null }>;
  staffing: Record<string, StageStaffing>;
  performance: Record<string, StagePerformance>;
  sla_breaches: number;
  on_hold: number;
  received_today: number;
  delivered_today: number;
}

export interface StageStaffing {
  role: string;
  total: number;
  active: number;
  absent: number;
  online: number;
  users?: User[];
}

export interface StagePerformance {
  today_completed: number;
  total_target: number;
  hit_rate: number;
}

export interface WorkerDashboardData {
  current_order: Order | null;
  today_completed: number;
  daily_target: number;
  target_progress: number;
  queue_count: number;
  wip_count: number;
}

export interface OpsDashboardData {
  projects: OpsProjectItem[];
  total_active_staff?: number;
  total_absent?: number;
  total_pending?: number;
  total_delivered_today?: number;
  role_stats?: Record<string, {
    total_staff: number;
    active: number;
    absent: number;
    today_completed: number;
    total_wip: number;
  }>;
  date_stats?: Array<{
    date: string;
    label: string;
    received: number;
    delivered: number;
    by_role: Record<string, number>;
  }>;
  absentees?: Array<{ id: number; name: string; role: string; reassigned_count?: number }>;
  workers?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    is_absent: boolean;
    wip_count: number;
    today_completed: number;
    last_activity: string | null;
  }>;
}

export interface OpsProjectItem {
  project: Pick<Project, 'id' | 'code' | 'name' | 'country' | 'department' | 'workflow_type'>;
  pending: number;
  delivered_today: number;
  total_staff: number;
  active_staff: number;
  queue_health?: {
    stages: Record<string, number>;
    staffing: Array<{
      id: number;
      name: string;
      role: string;
      is_online: boolean;
      is_absent: boolean;
      wip_count: number;
      today_completed: number;
    }>;
  };
}

export interface QueueHealth {
  project_id: number;
  workflow_type: WorkflowType;
  state_counts: Record<string, { count: number; oldest: string | null }>;
  stages?: Record<string, { queued: number; in_progress: number }>;
  staffing?: Array<{ user_id: number; name: string; role: string; wip_count: number; is_absent: boolean; is_online: boolean }>;
  sla_breaches: number;
  total_pending: number;
  total_delivered: number;
}

// ═══════════════════════════════════════════
// DAILY OPERATIONS (CEO View)
// ═══════════════════════════════════════════

export interface DailyOperationsWorker {
  id: number;
  name: string;
  completed: number;
  orders: string[];
  has_more?: boolean;
}

export interface DailyOperationsLayer {
  total: number;
  workers: DailyOperationsWorker[];
}

export interface DailyOperationsQAChecklist {
  total_orders: number;
  total_items: number;
  completed_items: number;
  mistake_count: number;
  compliance_rate: number;
}

export interface DailyOperationsProject {
  id: number;
  code: string;
  name: string;
  country: string;
  department: string;
  workflow_type: WorkflowType;
  received: number;
  delivered: number;
  pending: number;
  layers: Record<string, DailyOperationsLayer>;
  qa_checklist: DailyOperationsQAChecklist;
}

export interface DailyOperationsCountry {
  country: string;
  project_count: number;
  total_received: number;
  total_delivered: number;
  total_pending: number;
}

export interface DailyOperationsTotals {
  projects: number;
  received: number;
  delivered: number;
  pending: number;
  total_work_items: number;
}

export interface DailyOperationsData {
  date: string;
  totals: DailyOperationsTotals;
  by_country: DailyOperationsCountry[];
  projects: DailyOperationsProject[];
}

// ═══════════════════════════════════════════
// FILTER / API TYPES
// ═══════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface ProjectFilters {
  country?: string;
  department?: string;
  status?: string;
  search?: string;
}

export interface UserFilters {
  role?: string;
  country?: string;
  project_id?: number;
  is_active?: boolean;
}

export interface OrderFilters {
  state?: WorkflowState;
  priority?: string;
  assigned_to?: number;
  team_id?: number;
}

// ═══════════════════════════════════════════
// IMPORT TYPES (preserved from existing)
// ═══════════════════════════════════════════

export interface OrderImportSource {
  id: number;
  project_id: number;
  type: 'csv' | 'api' | 'cron';
  name: string;
  api_endpoint?: string;
  cron_schedule?: string;
  last_sync_at?: string;
  orders_synced: number;
  is_active: boolean;
  field_mapping?: Record<string, string>;
}

export interface OrderImportLog {
  id: number;
  import_source_id: number;
  imported_by: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  orders_imported?: number;
  orders_skipped?: number;
  errors?: Array<{ row: number; message: string; timestamp: string }>;
  file_path?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface ChecklistItem {
  id: number;
  template_id: number;
  title: string;
  is_checked: boolean;
  is_required?: boolean;
  description?: string;
  mistake_count?: number;
  notes?: string;
  completed_at?: string;
  completed_by?: number;
}

export interface ChecklistTemplate {
  id: number;
  project_id: number;
  layer: string;
  title: string;
  description: string;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
}

export interface OrderChecklist {
  id: number;
  order_id: number;
  checklist_template_id: number;
  completed_by: number | null;
  is_checked: boolean;
  mistake_count: number;
  notes: string;
  completed_at: string | null;
}

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════
export type NotificationType =
  | 'order_assigned'
  | 'work_submitted'
  | 'order_rejected'
  | 'order_received'
  | 'order_on_hold'
  | 'order_resumed'
  | 'order_delivered'
  | 'user_deactivated'
  | 'force_logout'
  | 'invoice_transition'
  | 'month_locked';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
