# Benchmark Internal Management System

🚀 **Production-Ready Full-Stack Enterprise Management System**

## 📋 Overview

A comprehensive, production-ready internal management system designed for high-volume project workflows across multiple countries. The system handles complex team structures, automated workflow management, role-based access control, and real-time dashboard analytics.

### Key Features

- ✅ **Multi-Tenant Architecture**: Country-based operations (UK, Australia, Canada, USA)
- ✅ **Department Management**: Floor Plan & Photos Enhancement workflows
- ✅ **Smart Work Queue**: Automated order assignment and tracking
- ✅ **Team Hierarchy**: Flexible project-based team structures
- ✅ **RBAC Security**: Role-based access with 7 distinct roles
- ✅ **Real-Time Dashboards**: CEO, Operations Manager, and Worker views
- ✅ **Invoice System**: Multi-category billing with approval workflows
- ✅ **Activity Logging**: Complete audit trail for all actions
- ✅ **Session Management**: Secure token-based authentication with auto-refresh

## 🛠 Tech Stack

### Backend
- **Framework**: Laravel 11 (PHP 8.2+)
- **Database**: SQLite (Development) / MySQL (Production)
- **Authentication**: Laravel Sanctum (Token-based)
- **API**: RESTful API with 41 routes
- **Validation**: FormRequest classes with authorization
- **Middleware**: Custom RBAC middleware

### Frontend
- **Framework**: React 18.3 with TypeScript 5.3
- **Build Tool**: Vite 7.3
- **Styling**: TailwindCSS v4
- **State Management**: Redux Toolkit
- **Icons**: Lucide React
- **HTTP Client**: Axios

## 📁 Project Structure

```
Benchmark/
├── backend/                    # Laravel 11 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── InvoiceController.php
│   │   │   │   ├── ProjectController.php
│   │   │   │   ├── UserController.php
│   │   │   │   └── WorkflowController.php
│   │   │   ├── Middleware/
│   │   │   │   └── CheckRole.php
│   │   │   └── Requests/           # 10 FormRequest classes
│   │   ├── Models/                 # 7 Eloquent models
│   │   │   ├── User.php
│   │   │   ├── Project.php
│   │   │   ├── Team.php
│   │   │   ├── Order.php
│   │   │   ├── WorkAssignment.php
│   │   │   ├── Invoice.php
│   │   │   └── ActivityLog.php
│   │   └── ...
│   ├── database/
│   │   ├── migrations/             # 14 migration files
│   │   └── seeders/                # 4 seeders
│   ├── routes/
│   │   └── api.php                 # 41 API routes
│   └── config/
│       ├── cors.php                # CORS configuration
│       └── sanctum.php             # Token settings
│
└── frontend/                       # React + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── Auth/
    │   │   ├── Layout/
    │   │   └── ErrorBoundary.tsx   # Error handling
    │   ├── pages/
    │   │   ├── Auth/
    │   │   ├── Dashboard/
    │   │   ├── Projects/
    │   │   ├── Users/
    │   │   ├── Invoices/
    │   │   └── Workflow/
    │   ├── services/               # API service layer
    │   ├── store/                  # Redux store
    │   ├── types/                  # TypeScript types (300+ lines)
    │   └── styles/                 # TailwindCSS
    └── ...
```

## 🚀 Quick Start

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Benchmark
   ```

2. **Backend Setup**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   ```

3. **Configure Environment**
   
   Edit `backend/.env`:
   ```env
   DB_CONNECTION=sqlite
   
   # CORS Settings
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   
   # Session Settings
   SESSION_LIFETIME=480
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
   ```

4. **Database Setup**
   ```bash
   php artisan migrate --seed
   ```
   
   This will create:
   - 11 test users (CEO, Director, Managers, Workers, QA, Designer)
   - 7 projects across 4 countries
   - 7 teams
   - 10 orders with various statuses

5. **Start Backend Server**
   ```bash
   php artisan serve
   ```
   Backend runs at: `http://localhost:8000`

6. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173`

## 👥 Test User Credentials

After seeding, use these credentials to test different roles:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| CEO | ceo@benchmark.com | password | Full system access |
| Director (UK) | director@benchmark.com | password | Country-level management |
| Operations Manager | manager.uk@benchmark.com | password | Department operations |
| Accounts Manager | accounts@benchmark.com | password | Invoice management |
| Worker | worker1@benchmark.com | password | Order execution |
| Designer | designer@benchmark.com | password | Design tasks |
| QA | qa1@benchmark.com | password | Quality assurance |

## 🔒 Security Features

### Authentication & Authorization
- ✅ Token-based authentication with Laravel Sanctum
- ✅ 8-hour token expiration with auto-refresh
- ✅ Role-based access control (RBAC) middleware
- ✅ Session monitoring and concurrent login handling
- ✅ Activity logging for all user actions

### CORS Configuration
- ✅ Whitelist-based origin control (no wildcards)
- ✅ Configurable via environment variables
- ✅ Proper credentials support

### Request Validation
- ✅ 10 FormRequest classes with authorization
- ✅ Input sanitization and validation
- ✅ Type-safe data handling

## 📊 System Architecture

### User Roles & Permissions

```
┌─────────────────────────────────────────────────────┐
│                        CEO                          │
│  - Full system access                               │
│  - All dashboards & reports                         │
│  - Invoice approval                                 │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼────┐         ┌────▼────┐
    │Director │         │Accounts │
    │         │         │Manager  │
    └────┬────┘         └────┬────┘
         │                   │
         │              Invoice Management
         │
    ┌────▼────────────┐
    │Operations       │
    │Manager          │
    └────┬────────────┘
         │
         ├── Project Management
         ├── User Management
         └── Workflow Control
              │
         ┌────┴────────────────────┐
         │                         │
    ┌────▼────┐            ┌───────▼──────┐
    │Workers  │            │Designer/QA   │
    │         │            │              │
    └─────────┘            └──────────────┘
     Order Execution        Specialized Tasks
```

### Workflow Management

```
Order Lifecycle:
1. Created → 2. Assigned → 3. In Progress → 4. Completed
                    ↓
                (On Hold)
```

### Dashboard System

- **CEO Dashboard**: Global overview, all countries, completion rates
- **Operations Manager**: Department-level stats, team performance, order queues
- **Worker Dashboard**: Personal queue, assigned orders, productivity metrics

## 🔄 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/user` - Get authenticated user

### Project Management
- `GET /projects` - List all projects (with filters)
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project details
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `GET /projects/{id}/statistics` - Get project stats

### User Management
- `GET /users` - List users (with filters)
- `POST /users` - Create user
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `POST /users/{id}/update-activity` - Update last activity
- `GET /users/inactive` - Get inactive users

### Workflow Management
- `GET /workflow/queue` - Get work queue (with filters)
- `POST /workflow/orders` - Create order
- `PUT /workflow/orders/{id}` - Update order
- `POST /workflow/orders/{id}/assign` - Assign order
- `POST /workflow/orders/{id}/start` - Start order
- `POST /workflow/orders/{id}/complete` - Complete order
- `POST /workflow/reassign` - Bulk reassign orders
- `GET /workflow/orders/{id}` - Get order details

### Invoice Management
- `GET /invoices` - List invoices (with filters)
- `POST /invoices` - Create invoice
- `GET /invoices/{id}` - Get invoice details
- `PUT /invoices/{id}` - Update invoice
- `DELETE /invoices/{id}` - Delete invoice
- `POST /invoices/{id}/approve` - Approve invoice
- `POST /invoices/{id}/submit` - Submit for approval
- `POST /invoices/{id}/mark-sent` - Mark as sent

### Dashboard Endpoints
- `GET /dashboard/ceo` - CEO dashboard data
- `GET /dashboard/operations` - Operations dashboard data
- `GET /dashboard/worker` - Worker dashboard data
- `GET /dashboard/department/{dept}` - Department dashboard
- `GET /dashboard/project/{id}` - Project dashboard

## 🎨 Frontend Components

### Pages
- `Login` - Authentication page
- `CEODashboard` - Executive overview
- `OperationsManagerDashboard` - Department management
- `WorkerDashboard` - Personal work queue
- `ProjectManagement` - CRUD for projects
- `UserManagement` - User administration
- `WorkQueue` - Order management interface
- `InvoiceManagement` - Billing and invoicing

### Shared Components
- `Layout` - Main application layout with navigation
- `ProtectedRoute` - Route guard with role checking
- `ErrorBoundary` - Global error handling

## 📦 Database Schema

### Core Tables
- `users` - User accounts and profiles (11 seeded)
- `projects` - Projects across countries (7 seeded)
- `teams` - Project-based teams (7 seeded)
- `orders` - Work orders and tasks (10 seeded)
- `work_assignments` - Order-user assignments
- `invoices` - Billing and invoicing
- `activity_logs` - Audit trail
- `user_sessions` - Session management

### Relationships
- Projects → Teams (1:Many)
- Projects → Orders (1:Many)
- Teams → Users (Many:Many)
- Orders → WorkAssignments (1:Many)
- Users → WorkAssignments (1:Many)
- Projects → Invoices (1:Many)

## 🧪 Testing

### Manual Testing Workflow

1. **Login as CEO**
   - View global dashboard
   - Check all country statistics
   - Review recent activities

2. **Login as Operations Manager**
   - View department-specific data
   - Manage users and projects
   - Review work queue

3. **Login as Worker**
   - View assigned orders
   - Start and complete tasks
   - Track personal productivity

4. **Test Invoice Flow**
   - Login as Accounts Manager
   - Create invoice
   - Login as CEO/Director
   - Approve invoice
   - Mark as sent

## 🔧 Development

### Backend Development
```bash
cd backend

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Create new controller
php artisan make:controller Api/ExampleController

# Create migration
php artisan make:migration create_example_table

# Create model
php artisan make:model Example
```

### Frontend Development
```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Preview production build
npm run preview
```

## 📈 Performance

### Backend Optimizations
- ✅ Eloquent query optimization with eager loading
- ✅ Database indexing on foreign keys
- ✅ Request validation caching
- ✅ API response pagination

### Frontend Optimizations
- ✅ Code splitting with React lazy loading
- ✅ Redux state caching
- ✅ Debounced search inputs
- ✅ Optimized re-renders with React.memo

## 🐛 Troubleshooting

### Backend Issues

**Database connection error**
```bash
php artisan config:clear
php artisan cache:clear
php artisan migrate:fresh --seed
```

**CORS errors**
- Check `CORS_ALLOWED_ORIGINS` in `.env`
- Verify frontend URL matches allowed origins

**Token expiration**
- Adjust `SESSION_LIFETIME` in `.env`
- Implement auto-refresh mechanism

### Frontend Issues

**API connection failed**
- Verify backend is running on port 8000
- Check `VITE_API_URL` in frontend `.env`

**TypeScript errors**
- Run `npm run type-check`
- All types are defined in `src/types/index.ts`

**Login issues**
- Clear browser local storage
- Check network tab for API responses
- Verify user credentials from seeder

## 📝 License

Proprietary - Internal Use Only

## 👨‍💻 Development Status

**Current Version**: 1.0.0 (Production Ready)

### ✅ Completed Features
- Full backend implementation (7 models, 5 controllers, 10 validators)
- Complete frontend UI (8 pages, responsive design)
- Comprehensive type system (300+ lines TypeScript)
- Database seeding with test data
- RBAC security implementation
- Dashboard analytics system
- Error handling and boundary components
- Accessibility compliance (WCAG)

### 🎯 Future Enhancements
- Real-time notifications with WebSockets
- Advanced reporting and analytics
- File upload and attachment system
- Mobile application (React Native)
- Multi-language support (i18n)
- Automated testing suite
- Performance monitoring and analytics

## 📞 Support

For issues or questions, contact the development team.

---

**Built with ❤️ using Laravel 11 & React 18**
