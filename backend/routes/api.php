<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\OrderImportController;
use App\Http\Controllers\Api\ChecklistController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// Rate limiting configuration
RateLimiter::for('login', function (Request $request) {
    return Limit::perMinute(5)->by($request->ip());
});

// Public routes with rate limiting
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login');

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Authentication (all authenticated users)
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::get('/auth/session-check', [AuthController::class, 'sessionCheck']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    // Dashboard (role-specific access controlled in controller)
    Route::get('/dashboard/ceo', [DashboardController::class, 'ceo']);
    Route::get('/dashboard/operations', [DashboardController::class, 'operations']);
    Route::get('/dashboard/worker', [DashboardController::class, 'worker']);
    Route::get('/dashboard/department', [DashboardController::class, 'department']);
    Route::get('/dashboard/project/{id}', [DashboardController::class, 'project']);
    Route::get('/dashboard/absentees', [DashboardController::class, 'absentees']);

    // Workflow - Worker routes (all authenticated users can access)
    Route::get('/workflow/queue', [WorkflowController::class, 'queue']);
    Route::get('/workflow/assigned-order', [WorkflowController::class, 'assignedOrder']);
    Route::post('/workflow/orders/{id}/start', [WorkflowController::class, 'startOrder']);
    Route::post('/workflow/orders/{id}/complete', [WorkflowController::class, 'completeOrder']);
    Route::post('/workflow/orders/{id}/submit', [WorkflowController::class, 'submitOrder']);
    Route::get('/workflow/orders/{id}', [WorkflowController::class, 'orderDetails']);
    Route::get('/workflow/rejected', [WorkflowController::class, 'rejectedOrders']);
    Route::post('/workflow/orders/{id}/self-correct', [WorkflowController::class, 'selfCorrectOrder']);
    
    // Order checklists (accessible to workers)
    Route::get('/orders/{orderId}/checklist', [ChecklistController::class, 'orderChecklist']);
    Route::put('/orders/{orderId}/checklist/{templateId}', [ChecklistController::class, 'updateOrderChecklist']);
    Route::put('/orders/{orderId}/checklist', [ChecklistController::class, 'bulkUpdateOrderChecklist']);
    Route::get('/orders/{orderId}/checklist-status', [ChecklistController::class, 'checklistStatus']);

    // Management routes - require manager+ roles
    Route::middleware('role:ceo,director,operations_manager')->group(function () {
        // Projects
        Route::apiResource('projects', ProjectController::class);
        Route::get('/projects/{id}/statistics', [ProjectController::class, 'statistics']);
        Route::get('/projects/{id}/teams', [ProjectController::class, 'teams']);

        // Users
        Route::apiResource('users', UserController::class);
        Route::post('/users/{id}/deactivate', [UserController::class, 'deactivate']);
        Route::get('/users/inactive', [UserController::class, 'inactive']);
        Route::post('/users/reassign-work', [UserController::class, 'reassignWork']);

        // Workflow management
        Route::get('/workflow/{projectId}/queues', [WorkflowController::class, 'queues']);
        Route::post('/workflow/orders', [WorkflowController::class, 'createOrder']);
        Route::put('/workflow/orders/{id}', [WorkflowController::class, 'updateOrder']);
        Route::post('/workflow/orders/{id}/assign', [WorkflowController::class, 'assignOrder']);
        Route::post('/workflow/orders/{id}/reassign', [WorkflowController::class, 'reassignOrder']);
        Route::post('/workflow/orders/{id}/reject', [WorkflowController::class, 'rejectOrder']);
        Route::get('/workflow/recently-imported', [WorkflowController::class, 'recentlyImported']);
        Route::post('/workflow/bulk-assign', [WorkflowController::class, 'bulkAssign']);
        Route::get('/workflow/unsynced', [WorkflowController::class, 'unsyncedOrders']);
        Route::post('/workflow/orders/{id}/mark-synced', [WorkflowController::class, 'markSynced']);

        // Order Import
        Route::get('/projects/{projectId}/import-sources', [OrderImportController::class, 'sources']);
        Route::post('/projects/{projectId}/import-sources', [OrderImportController::class, 'createSource']);
        Route::put('/import-sources/{sourceId}', [OrderImportController::class, 'updateSource']);
        Route::post('/projects/{projectId}/import-csv', [OrderImportController::class, 'importCsv']);
        Route::post('/import-sources/{sourceId}/sync', [OrderImportController::class, 'syncFromApi']);
        Route::get('/projects/{projectId}/import-history', [OrderImportController::class, 'importHistory']);
        Route::get('/import-logs/{importLogId}', [OrderImportController::class, 'importDetails']);

        // Checklist templates management
        Route::get('/projects/{projectId}/checklists', [ChecklistController::class, 'templates']);
        Route::post('/projects/{projectId}/checklists', [ChecklistController::class, 'createTemplate']);
        Route::put('/checklists/{templateId}', [ChecklistController::class, 'updateTemplate']);
        Route::delete('/checklists/{templateId}', [ChecklistController::class, 'deleteTemplate']);
    });

    // Finance routes - CEO/Director only
    Route::middleware('role:ceo,director')->group(function () {
        Route::apiResource('invoices', InvoiceController::class);
        Route::post('/invoices/{id}/approve', [InvoiceController::class, 'approve']);
        Route::get('/invoices/prepare/{projectId}', [InvoiceController::class, 'prepare']);
    });
});
