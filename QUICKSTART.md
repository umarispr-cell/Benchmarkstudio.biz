# Quick Start Guide - Benchmark Management System

## 🚀 Getting Started in 5 Minutes

### Step 1: Start Backend Server

```bash
cd backend

# Make sure database is configured in .env
# DB_DATABASE=benchmark
# DB_USERNAME=your_username
# DB_PASSWORD=your_password

# Run migrations
php artisan migrate

# (Optional) Seed demo data
php artisan db:seed

# Start server on port 8000
php artisan serve
```

### Step 2: Start Frontend Development Server

```bash
cd frontend

# Start Vite dev server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api

### Step 3: Configure CORS (if needed)

In `backend/config/cors.php`:

```php
'allowed_origins' => ['http://localhost:5173'],
```

### Step 4: Create Test User

Run in backend directory:

```bash
php artisan tinker
```

Then execute:

```php
User::create([
    'name' => 'CEO User',
    'email' => 'ceo@benchmark.com',
    'password' => Hash::make('password'),
    'role' => 'ceo',
    'country' => 'UK',
    'is_active' => true
]);
```

### Step 5: Login

Open browser to http://localhost:5173/login

**Credentials:**
- Email: ceo@benchmark.com
- Password: password

## 📋 Available User Roles

Create users with these roles:
- `ceo` - CEO Dashboard access
- `director` - Director Dashboard access
- `operations_manager` - Operations Manager Dashboard
- `drawer` - Floor Plan Drawer
- `checker` - Floor Plan Checker
- `qa` - Quality Assurance
- `designer` - Photos Designer

## 🔧 Common Commands

### Frontend

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend

```bash
# Install dependencies
composer install

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate

# Run migrations with seed
php artisan migrate:fresh --seed

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Run tests
php artisan test

# Start development server
php artisan serve

# Start queue worker (if using queues)
php artisan queue:work
```

## 🐛 Troubleshooting

### Backend Issues

**CORS Error:**
- Check `config/cors.php` allows `http://localhost:5173`
- Run `php artisan config:clear`

**Database Connection:**
- Verify `.env` database credentials
- Ensure MySQL is running
- Create database: `mysql -u root -p` then `CREATE DATABASE benchmark;`

**Migration Errors:**
- Run `php artisan migrate:fresh` to reset
- Check all migration files are present

### Frontend Issues

**API Connection:**
- Verify `.env` has `VITE_API_URL=http://localhost:8000/api`
- Restart dev server after changing .env

**Build Errors:**
- Delete `node_modules` and run `npm install`
- Clear cache: `rm -rf node_modules/.vite`

## 📊 Database Seeder (Optional)

Create `database/seeders/DemoSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // CEO
        User::create([
            'name' => 'John CEO',
            'email' => 'ceo@benchmark.com',
            'password' => Hash::make('password'),
            'role' => 'ceo',
            'country' => 'UK',
            'is_active' => true,
        ]);

        // Operations Manager
        User::create([
            'name' => 'Sarah Operations',
            'email' => 'ops@benchmark.com',
            'password' => Hash::make('password'),
            'role' => 'operations_manager',
            'country' => 'UK',
            'department' => 'floor_plan',
            'is_active' => true,
        ]);

        // Drawer
        User::create([
            'name' => 'Mike Drawer',
            'email' => 'drawer@benchmark.com',
            'password' => Hash::make('password'),
            'role' => 'drawer',
            'country' => 'UK',
            'department' => 'floor_plan',
            'layer' => 'drawer',
            'is_active' => true,
        ]);
    }
}
```

Run: `php artisan db:seed --class=DemoSeeder`

## 🎯 Next Development Steps

1. **Complete Controller Logic**: Implement methods in all controllers
2. **Add Middleware**: Create role-based access middleware
3. **Implement Models**: Add relationships and methods to all models
4. **Create Seeders**: Generate demo data for testing
5. **Add Validation**: Request validation classes
6. **Implement Services**: Business logic layer
7. **Add Tests**: Unit and feature tests
8. **API Documentation**: Generate API docs
9. **Error Handling**: Global error handler
10. **Logging**: Activity logging system

## 📚 File Locations

- **Frontend Pages**: `frontend/src/pages/`
- **Frontend Components**: `frontend/src/components/`
- **Redux Store**: `frontend/src/store/`
- **API Services**: `frontend/src/services/`
- **Backend Controllers**: `backend/app/Http/Controllers/Api/`
- **Models**: `backend/app/Models/`
- **Migrations**: `backend/database/migrations/`
- **Routes**: `backend/routes/api.php`

## 🔐 Default Ports

- Frontend (Vite): 5173
- Backend (Laravel): 8000
- MySQL: 3306
- Redis: 6379

---

**Happy Coding! 🚀**
