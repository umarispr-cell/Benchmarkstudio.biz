# Benchmark — Complete Route & Endpoint Reference

> Generated: 21 February 2026

---

## Table of Contents

1. [React Frontend Routes](#1-react-frontend-routes)
2. [API Endpoints (Backend)](#2-api-endpoints-backend)
   - [Public (No Auth)](#21-public-no-auth)
   - [Auth](#22-auth)
   - [Notifications](#23-notifications)
   - [Dashboard](#24-dashboard)
   - [Workflow — Worker](#25-workflow--worker)
   - [Workflow — Management / QA](#26-workflow--management--qa)
   - [Checklists](#27-checklists)
   - [Projects](#28-projects)
   - [Users](#29-users)
   - [Invoices](#210-invoices)
   - [Month Locks](#211-month-locks)
   - [Order Import](#212-order-import)
   - [PM Assignment](#213-pm-project-assignment)
   - [OM Assignment](#214-om-project-assignment)
   - [Audit Logs](#215-audit-logs)
3. [Route → Endpoint Mapping (per page)](#3-route--endpoint-mapping-per-page)

---

## 1. React Frontend Routes

All routes below are wrapped in `<ProtectedRoute>` (requires authentication) unless noted otherwise.

| React Path | Component | Allowed Roles | Description |
|---|---|---|---|
| `/login` | `Login` | Public (unauthenticated) | Login page |
| `/` | Role-based dashboard (see below) | All authenticated | Redirects to role-specific dashboard |
| `/dashboard` | Role-based dashboard (see below) | All authenticated | Same as `/` |
| `/projects/*` | `ProjectManagement` | ceo, director, operations_manager, project_manager | Project CRUD & statistics |
| `/users/*` | `UserManagement` | ceo, director, operations_manager, project_manager | User CRUD & management |
| `/invoices/*` | `InvoiceManagement` | ceo, director | Invoice lifecycle management |
| `/work/*` | `WorkQueue` | drawer, checker, qa, designer | Worker order queue & execution |
| `/import/*` | `ImportOrders` | operations_manager, project_manager | CSV/API import for orders |
| `/rejected/*` | `RejectedOrders` | director, operations_manager, project_manager, drawer, checker, qa, designer | View rejected orders |
| `/assign/*` | `SupervisorAssignment` | ceo, director, operations_manager, project_manager, qa | Order reassignment |
| `/pm-assign/*` | `PMAssignment` | ceo, director, operations_manager, project_manager | Assign orders to QA/drawers |
| `/pm-projects/*` | `PMProjectAssignment` | ceo, director, operations_manager | Assign projects to PMs |
| `/om-projects/*` | `OMProjectAssignment` | ceo, director | Assign projects to OMs |
| `/transfer-log/*` | `TransferLog` | ceo, director, operations_manager | Audit/transfer log viewer |
| `/qa-team/*` | `QATeamAssignment` | qa | QA team member assignment |
| `*` (catch-all) | `Navigate to /` | — | Redirect unknown routes to home |

### Dashboard Resolution by Role

| User Role | Dashboard Component | Primary API Endpoint |
|---|---|---|
| `ceo` | `CEODashboard` | `GET /dashboard/master`, `GET /dashboard/daily-operations` |
| `director` | `CEODashboard` | `GET /dashboard/master`, `GET /dashboard/daily-operations` |
| `operations_manager` | `OperationsManagerDashboard` | `GET /dashboard/operations` |
| `project_manager` | `ProjectManagerDashboard` | `GET /dashboard/project-manager` |
| `drawer` | `WorkerDashboard` | `GET /dashboard/worker` |
| `checker` | `WorkerDashboard` | `GET /dashboard/worker` |
| `qa` | `WorkerDashboard` | `GET /dashboard/worker` |
| `designer` | `WorkerDashboard` | `GET /dashboard/worker` |
| (other/fallback) | `Dashboard` | — |

---

## 2. API Endpoints (Backend)

Base URL: `https://<host>/api`
Authentication: Laravel Sanctum (Bearer token in `Authorization` header)
Rate limiting: `throttle:api` for all authenticated routes; `throttle:login` for login

---

### 2.1 Public (No Auth)

| Method | Endpoint | Controller | Description |
|---|---|---|---|
| `GET` | `/health` | `HealthController@check` | Health check (DB, Redis, Queue) |
| `GET` | `/ping` | `HealthController@ping` | Simple ping/pong |

---

### 2.2 Auth

**Frontend service:** `authService`

| Method | Endpoint | Controller | Roles | Frontend Call | Description |
|---|---|---|---|---|---|
| `POST` | `/auth/login` | `AuthController@login` | Public | `authService.login(credentials)` | Login, returns token + user |
| `POST` | `/auth/logout` | `AuthController@logout` | All | `authService.logout()` | Logout, revoke token |
| `GET` | `/auth/profile` | `AuthController@profile` | All | `authService.profile()` | Get current user profile |
| `GET` | `/auth/session-check` | `AuthController@sessionCheck` | All | `authService.sessionCheck()` | Verify session is still valid |
| `POST` | `/auth/force-logout/{userId}` | `AuthController@forceLogout` | ceo, director, operations_manager, project_manager | `authService.forceLogout(userId)` | Force-logout a user |

---

### 2.3 Notifications

**Frontend service:** `notificationService`

| Method | Endpoint | Controller | Roles | Frontend Call | Description |
|---|---|---|---|---|---|
| `GET` | `/notifications` | `NotificationController@index` | All | `notificationService.list(page, unreadOnly)` | Paginated notification list |
| `GET` | `/notifications/unread-count` | `NotificationController@unreadCount` | All | `notificationService.unreadCount()` | Unread notification count |
| `POST` | `/notifications/{id}/read` | `NotificationController@markRead` | All | `notificationService.markRead(id)` | Mark single notification read |
| `POST` | `/notifications/read-all` | `NotificationController@markAllRead` | All | `notificationService.markAllRead()` | Mark all notifications read |
| `DELETE` | `/notifications/{id}` | `NotificationController@destroy` | All | `notificationService.destroy(id)` | Delete notification |

---

### 2.4 Dashboard

**Frontend service:** `dashboardService`

| Method | Endpoint | Controller | Roles | Frontend Call | Description |
|---|---|---|---|---|---|
| `GET` | `/dashboard/master` | `DashboardController@master` | ceo, director | `dashboardService.master()` | Org-wide dashboard (all projects summary) |
| `GET` | `/dashboard/daily-operations` | `DashboardController@dailyOperations` | ceo, director | `dashboardService.dailyOperations(date?)` | Daily worker activity report (throttled 10/min) |
| `GET` | `/dashboard/project/{id}` | `DashboardController@project` | ceo, director, operations_manager, project_manager | `dashboardService.project(id)` | Single project drilldown |
| `GET` | `/dashboard/operations` | `DashboardController@operations` | ceo, director, operations_manager | `dashboardService.operations()` | Operations manager dashboard |
| `GET` | `/dashboard/project-manager` | `DashboardController@projectManager` | project_manager | `dashboardService.projectManager()` | PM dashboard — their assigned project |
| `GET` | `/dashboard/worker` | `DashboardController@worker` | drawer, checker, qa, designer | `dashboardService.worker()` | Worker personal dashboard |
| `GET` | `/dashboard/absentees` | `DashboardController@absentees` | ceo, director, operations_manager, project_manager | `dashboardService.absentees()` | List absent users |

---

### 2.5 Workflow — Worker

**Frontend service:** `workflowService`

All under prefix `/workflow`. Available to authenticated workers (drawer, checker, qa, designer).

| Method | Endpoint | Frontend Call | Description |
|---|---|---|---|
| `POST` | `/workflow/start-next` | `workflowService.startNext()` | Auto-assign next queued order to worker |
| `GET` | `/workflow/my-current` | `workflowService.myCurrent()` | Get worker's currently assigned order |
| `GET` | `/workflow/my-stats` | `workflowService.myStats()` | Today's stats (completed, WIP, queue, absent) |
| `GET` | `/workflow/my-queue` | `workflowService.getQueue()` | Worker's pending order queue |
| `GET` | `/workflow/my-completed` | `workflowService.getCompleted()` | Orders completed today |
| `GET` | `/workflow/my-history` | `workflowService.getHistory(page?)` | Full order history (paginated) |
| `GET` | `/workflow/my-performance` | `workflowService.getPerformance()` | Performance metrics (daily/weekly/monthly) |
| `POST` | `/workflow/orders/{id}/submit` | `workflowService.submitWork(id, comments?)` | Submit completed work → next state |
| `POST` | `/workflow/orders/{id}/reject` | `workflowService.rejectOrder(id, reason, code, routeTo?)` | Reject order (checker/QA only) |
| `POST` | `/workflow/orders/{id}/hold` | `workflowService.holdOrder(id, reason)` | Place order on hold |
| `POST` | `/workflow/orders/{id}/resume` | `workflowService.resumeOrder(id)` | Resume held order |
| `POST` | `/workflow/orders/{id}/reassign-queue` | `workflowService.reassignToQueue(id, reason?)` | Released order back to queue |
| `POST` | `/workflow/orders/{id}/flag-issue` | `workflowService.flagIssue(id, type, desc, severity?)` | Flag an issue on order |
| `POST` | `/workflow/orders/{id}/request-help` | `workflowService.requestHelp(id, question)` | Request help on order |
| `POST` | `/workflow/orders/{id}/timer/start` | `workflowService.startTimer(id)` | Start work timer |
| `POST` | `/workflow/orders/{id}/timer/stop` | `workflowService.stopTimer(id)` | Stop work timer |
| `GET` | `/workflow/orders/{id}/full-details` | `workflowService.orderFullDetails(id)` | Full order details (notes, attachments, flags) |
| `GET` | `/workflow/orders/{id}` | `workflowService.orderDetails(id)` | Order details (role-filtered) |
| `GET` | `/workflow/work-items/{orderId}` | `workflowService.workItemHistory(id)` | Work item history for order |
| `GET` | `/workflow/qa-orders` | `workflowService.qaOrders()` | QA supervisor: orders for team distribution |
| `GET` | `/workflow/qa-team-members` | `workflowService.qaTeamMembers()` | QA supervisor: team member list |

---

### 2.6 Workflow — Management / QA

**Frontend service:** `workflowService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/projects` | ceo, director, ops_mgr, pm, qa | `projectService.list(filters?)` | List projects |
| `GET` | `/projects/{id}` | ceo, director, ops_mgr, pm, qa | `projectService.get(id)` | Project details |
| `GET` | `/projects/{id}/statistics` | ceo, director, ops_mgr, pm, qa | `projectService.statistics(id)` | Project statistics |
| `GET` | `/projects/{id}/teams` | ceo, director, ops_mgr, pm, qa | `projectService.teams(id)` | Project team list |
| `POST` | `/workflow/orders/{id}/reassign` | ceo, director, ops_mgr, pm, qa | `workflowService.reassignOrder(id, userId, reason)` | Reassign order to different user |
| `POST` | `/workflow/orders/{id}/assign-to-drawer` | ceo, director, ops_mgr, pm, qa | `workflowService.assignToDrawer(id, drawerId)` | QA: assign to specific drawer |
| `GET` | `/workflow/{projectId}/orders` | ceo, director, ops_mgr, pm, qa | `workflowService.projectOrders(projectId, filters?)` | List project orders (paginated) |
| `GET` | `/workflow/{projectId}/staffing` | ceo, director, ops_mgr, pm, qa | `workflowService.staffing(projectId)` | Project staffing breakdown |
| `POST` | `/workflow/receive` | ceo, director, ops_mgr, pm | `workflowService.receiveOrder(data)` | Receive new order into system |
| `POST` | `/workflow/orders/{id}/assign-to-qa` | ceo, director, ops_mgr, pm | `workflowService.assignToQA(id, qaUserId)` | Assign order to QA supervisor |
| `GET` | `/workflow/{projectId}/queue-health` | ceo, director, ops_mgr, pm | `workflowService.queueHealth(projectId)` | Queue health metrics |

---

### 2.7 Checklists

**Frontend service:** `checklistService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/orders/{orderId}/checklist` | All | `checklistService.orderChecklist(orderId)` | Get order checklist items |
| `PUT` | `/orders/{orderId}/checklist/{templateId}` | All | `checklistService.updateOrderChecklist(orderId, templateId, data)` | Update single checklist item |
| `PUT` | `/orders/{orderId}/checklist` | All | `checklistService.bulkUpdate(orderId, items)` | Bulk update checklist items |
| `GET` | `/orders/{orderId}/checklist-status` | All | `checklistService.checklistStatus(orderId)` | Get checklist completion status |
| `GET` | `/projects/{projectId}/checklists` | Management | `checklistService.templates(projectId)` | List checklist templates |
| `POST` | `/projects/{projectId}/checklists` | Management | `checklistService.createTemplate(projectId, data)` | Create template |
| `PUT` | `/checklists/{templateId}` | Management | `checklistService.updateTemplate(templateId, data)` | Update template |
| `DELETE` | `/checklists/{templateId}` | Management | `checklistService.deleteTemplate(templateId)` | Delete template |

---

### 2.8 Projects

**Frontend service:** `projectService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/projects` | ceo, director, ops_mgr, pm, qa | `projectService.list(filters?)` | List all projects |
| `GET` | `/projects/{id}` | ceo, director, ops_mgr, pm, qa | `projectService.get(id)` | Get project details |
| `POST` | `/projects` | ceo, director | `projectService.create(data)` | Create new project |
| `PUT` | `/projects/{id}` | ceo, director | `projectService.update(id, data)` | Update project |
| `DELETE` | `/projects/{id}` | ceo, director | `projectService.delete(id)` | Delete project |
| `GET` | `/projects/{id}/statistics` | ceo, director, ops_mgr, pm, qa | `projectService.statistics(id)` | Project stats |
| `GET` | `/projects/{id}/teams` | ceo, director, ops_mgr, pm, qa | `projectService.teams(id)` | Project teams |

---

### 2.9 Users

**Frontend service:** `userService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/users` | Management | `userService.list(filters?)` | List users (filterable) |
| `GET` | `/users/{id}` | Management | `userService.get(id)` | Get user details |
| `POST` | `/users` | Management | `userService.create(data)` | Create user |
| `PUT` | `/users/{id}` | Management | `userService.update(id, data)` | Update user |
| `DELETE` | `/users/{id}` | Management | `userService.delete(id)` | Delete user |
| `POST` | `/users/{id}/deactivate` | Management | `userService.deactivate(id)` | Deactivate user (reassigns work) |
| `GET` | `/users-inactive` | Management | `userService.inactive()` | List inactive users |
| `POST` | `/users/reassign-work` | Management | `userService.reassignWork(userId)` | Reassign all work from user |

*Management = ceo, director, operations_manager, project_manager*

---

### 2.10 Invoices

**Frontend service:** `invoiceService`

Invoice flow: `Draft → Prepared → Approved → Issued → Sent`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/invoices` | ceo, director | `invoiceService.list(filters?)` | List invoices (filterable) |
| `POST` | `/invoices` | ceo, director | `invoiceService.create(data)` | Create invoice draft |
| `GET` | `/invoices/{id}` | ceo, director | `invoiceService.show(id)` | Get invoice details |
| `POST` | `/invoices/{id}/transition` | ceo, director | `invoiceService.transition(id, toStatus)` | Advance invoice status |
| `DELETE` | `/invoices/{id}` | ceo, director | `invoiceService.delete(id)` | Delete invoice |

---

### 2.11 Month Locks

**Frontend service:** `monthLockService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/month-locks/{projectId}` | Management | `monthLockService.list(projectId)` | List month locks |
| `POST` | `/month-locks/{projectId}/lock` | Management | `monthLockService.lock(projectId, month, year)` | Lock a month |
| `POST` | `/month-locks/{projectId}/unlock` | Management | `monthLockService.unlock(projectId, month, year)` | Unlock a month |
| `GET` | `/month-locks/{projectId}/counts` | Management | `monthLockService.counts(projectId, month, year)` | Order counts for month |
| `POST` | `/month-locks/{projectId}/clear` | Management | `monthLockService.clearPanel(projectId)` | Clear lock panel |
| `POST` | `/month-locks/{projectId}/update-counts` | Management | — | Refresh counts |

---

### 2.12 Order Import

**Frontend service:** `orderImportService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/projects/{projectId}/import-sources` | Management | `orderImportService.sources(projectId)` | List import sources |
| `POST` | `/projects/{projectId}/import-sources` | Management | `orderImportService.createSource(projectId, data)` | Create import source |
| `PUT` | `/import-sources/{sourceId}` | Management | `orderImportService.updateSource(sourceId, data)` | Update import source |
| `POST` | `/projects/{projectId}/import-csv` | Management | `orderImportService.importCsv(projectId, formData)` | Import orders from CSV |
| `POST` | `/import-sources/{sourceId}/sync` | Management | `orderImportService.syncFromApi(sourceId)` | Sync from external API |
| `GET` | `/projects/{projectId}/import-history` | Management | `orderImportService.importHistory(projectId)` | Import job history |
| `GET` | `/import-logs/{importLogId}` | Management | `orderImportService.importDetails(logId)` | Import log details |

---

### 2.13 PM Project Assignment

**Frontend service:** `pmService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/project-managers` | ceo, director, operations_manager | `pmService.list()` | List all project managers (OM sees only their PMs) |
| `POST` | `/project-managers/{userId}/assign-projects` | ceo, director, operations_manager | `pmService.assignProjects(userId, projectIds)` | Assign project to PM (max 1 project per PM) |

---

### 2.14 OM Project Assignment

**Frontend service:** `omService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/operation-managers` | ceo, director | `omService.list()` | List all OMs with their projects |
| `POST` | `/operation-managers/{userId}/assign-projects` | ceo, director | `omService.assignProjects(userId, projectIds)` | Assign multiple projects to OM |

---

### 2.15 Audit Logs

**Frontend service:** `auditLogService`

| Method | Endpoint | Roles | Frontend Call | Description |
|---|---|---|---|---|
| `GET` | `/audit-logs` | Management | `auditLogService.list(params)` | General audit logs (paginated, filterable) |
| `GET` | `/audit-logs` | Management | `auditLogService.transferLogs(params)` | Transfer logs (filtered to assignment actions) |

**Audit log query parameters:**

| Param | Type | Description |
|---|---|---|
| `action` | string | Filter by action (comma-separated for multiple) |
| `user_id` | number | Filter by actor user ID |
| `entity_type` | string | Filter by entity type (User, Order, etc.) |
| `project_id` | number | Filter by project |
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |
| `search` | string | Free-text search in action/values |
| `per_page` | number | Results per page (default 50) |

---

## 3. Route → Endpoint Mapping (per page)

### Login (`/login`)
| Action | Endpoint |
|---|---|
| Submit credentials | `POST /auth/login` |

### CEO/Director Dashboard (`/dashboard`)
| Action | Endpoint |
|---|---|
| Load master stats | `GET /dashboard/master` |
| Load daily operations | `GET /dashboard/daily-operations?date=` |
| Project drilldown | `GET /dashboard/project/{id}` |
| Absentee list | `GET /dashboard/absentees` |

### Operations Manager Dashboard (`/dashboard`)
| Action | Endpoint |
|---|---|
| Load ops stats | `GET /dashboard/operations` |
| Project drilldown | `GET /dashboard/project/{id}` |
| Absentee list | `GET /dashboard/absentees` |

### Project Manager Dashboard (`/dashboard`)
| Action | Endpoint |
|---|---|
| Load PM stats | `GET /dashboard/project-manager` |

### Worker Dashboard (`/dashboard`)
| Action | Endpoint |
|---|---|
| Load worker stats | `GET /dashboard/worker` |
| My daily stats | `GET /workflow/my-stats` |

### Project Management (`/projects`)
| Action | Endpoint |
|---|---|
| List projects | `GET /projects` |
| View project | `GET /projects/{id}` |
| Create project | `POST /projects` |
| Update project | `PUT /projects/{id}` |
| Delete project | `DELETE /projects/{id}` |
| Project stats | `GET /projects/{id}/statistics` |
| Project teams | `GET /projects/{id}/teams` |

### User Management (`/users`)
| Action | Endpoint |
|---|---|
| List users | `GET /users` |
| Create user | `POST /users` |
| Update user | `PUT /users/{id}` |
| Delete user | `DELETE /users/{id}` |
| Deactivate user | `POST /users/{id}/deactivate` |
| View inactive | `GET /users-inactive` |
| Force logout | `POST /auth/force-logout/{userId}` |
| Reassign work | `POST /users/reassign-work` |

### Invoice Management (`/invoices`)
| Action | Endpoint |
|---|---|
| List invoices | `GET /invoices` |
| Create draft | `POST /invoices` |
| View invoice | `GET /invoices/{id}` |
| Advance status | `POST /invoices/{id}/transition` |
| Delete invoice | `DELETE /invoices/{id}` |
| List projects (dropdown) | `GET /projects` |

### Work Queue (`/work`)
| Action | Endpoint |
|---|---|
| Start next order | `POST /workflow/start-next` |
| Current order | `GET /workflow/my-current` |
| My queue | `GET /workflow/my-queue` |
| My completed | `GET /workflow/my-completed` |
| Submit work | `POST /workflow/orders/{id}/submit` |
| Hold order | `POST /workflow/orders/{id}/hold` |
| Resume order | `POST /workflow/orders/{id}/resume` |
| Release to queue | `POST /workflow/orders/{id}/reassign-queue` |
| Flag issue | `POST /workflow/orders/{id}/flag-issue` |
| Request help | `POST /workflow/orders/{id}/request-help` |
| Start timer | `POST /workflow/orders/{id}/timer/start` |
| Stop timer | `POST /workflow/orders/{id}/timer/stop` |
| Full details | `GET /workflow/orders/{id}/full-details` |
| Reject order | `POST /workflow/orders/{id}/reject` |
| Order checklist | `GET /orders/{orderId}/checklist` |
| Update checklist | `PUT /orders/{orderId}/checklist` |
| My stats | `GET /workflow/my-stats` |
| Performance | `GET /workflow/my-performance` |
| Order history | `GET /workflow/my-history` |

### Import Orders (`/import`)
| Action | Endpoint |
|---|---|
| List projects | `GET /projects` |
| List sources | `GET /projects/{id}/import-sources` |
| Create source | `POST /projects/{id}/import-sources` |
| Update source | `PUT /import-sources/{id}` |
| Import CSV | `POST /projects/{id}/import-csv` |
| Sync API source | `POST /import-sources/{id}/sync` |
| Import history | `GET /projects/{id}/import-history` |
| Import details | `GET /import-logs/{id}` |

### Rejected Orders (`/rejected`)
| Action | Endpoint |
|---|---|
| List project orders | `GET /workflow/{projectId}/orders?state=rejected` |
| Order details | `GET /workflow/orders/{id}` |
| Work item history | `GET /workflow/work-items/{orderId}` |

### Supervisor Assignment (`/assign`)
| Action | Endpoint |
|---|---|
| Project orders | `GET /workflow/{projectId}/orders` |
| Staffing list | `GET /workflow/{projectId}/staffing` |
| Reassign order | `POST /workflow/orders/{id}/reassign` |

### PM Assignment (`/pm-assign`)
| Action | Endpoint |
|---|---|
| Project orders | `GET /workflow/{projectId}/orders` |
| Assign to QA | `POST /workflow/orders/{id}/assign-to-qa` |
| Assign to drawer | `POST /workflow/orders/{id}/assign-to-drawer` |

### PM Project Assignment (`/pm-projects`)
| Action | Endpoint |
|---|---|
| List PMs | `GET /project-managers` |
| List projects | `GET /projects` |
| Assign project to PM | `POST /project-managers/{userId}/assign-projects` |

### OM Project Assignment (`/om-projects`)
| Action | Endpoint |
|---|---|
| List OMs | `GET /operation-managers` |
| List projects | `GET /projects` |
| Assign projects to OM | `POST /operation-managers/{userId}/assign-projects` |

### Transfer Log (`/transfer-log`)
| Action | Endpoint |
|---|---|
| Load transfer logs | `GET /audit-logs?action=PM_PROJECT_ASSIGNED,OM_PROJECT_ASSIGNED,...` |
| General audit logs | `GET /audit-logs` |

### QA Team Assignment (`/qa-team`)
| Action | Endpoint |
|---|---|
| QA orders | `GET /workflow/qa-orders` |
| QA team members | `GET /workflow/qa-team-members` |
| Assign to drawer | `POST /workflow/orders/{id}/assign-to-drawer` |

---

## Middleware Stack

All authenticated routes pass through:
1. `auth:sanctum` — Token authentication
2. `single.session` — Single active session per user
3. `throttle:api` — Rate limiting

Additional middleware per group:
- `role:ceo,director,...` — Role-based access control
- `throttle:login` — Login-specific rate limit
- `throttle:10,1` — Special rate limit for daily-operations endpoint
