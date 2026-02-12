<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\WorkItem;
use App\Models\Project;
use App\Services\StateMachine;
use App\Services\AssignmentEngine;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkflowController extends Controller
{
    // ═══════════════════════════════════════════
    // WORKER ENDPOINTS (Production roles)
    // ═══════════════════════════════════════════

    /**
     * GET /workflow/start-next
     * Auto-assign the next order from the user's queue.
     * No manual picking — this is the ONLY way workers get work.
     */
    public function startNext(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['drawer', 'checker', 'qa', 'designer'])) {
            return response()->json(['message' => 'Only production roles can start work.'], 403);
        }

        if (!$user->project_id) {
            return response()->json(['message' => 'You are not assigned to a project.'], 422);
        }

        // Defense-in-depth: reject if requested project doesn't match user's project
        if ($request->has('project_id') && (int)$request->input('project_id') !== $user->project_id) {
            return response()->json(['message' => 'You can only work on your assigned project.'], 403);
        }

        $order = AssignmentEngine::startNext($user);

        if (!$order) {
            return response()->json([
                'message' => 'No orders available in your queue, or you are at max WIP capacity.',
                'queue_empty' => true,
            ]);
        }

        return response()->json([
            'order' => $order->load(['project', 'team', 'workItems']),
            'message' => 'Order assigned successfully.',
        ]);
    }

    /**
     * GET /workflow/my-current
     * Get the user's currently assigned in-progress order.
     */
    public function myCurrent(Request $request)
    {
        $user = $request->user();

        $order = Order::where('assigned_to', $user->id)
            ->whereIn('workflow_state', ['IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN'])
            ->with(['project', 'team'])
            ->first();

        return response()->json(['order' => $order]);
    }

    /**
     * POST /workflow/orders/{id}/submit
     * Submit completed work to the next stage.
     */
    public function submitWork(Request $request, int $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        // Verify the user is assigned to this order
        if ($order->assigned_to !== $user->id) {
            return response()->json(['message' => 'This order is not assigned to you.'], 403);
        }

        // Verify order is in an IN_ state
        if (!str_starts_with($order->workflow_state, 'IN_')) {
            return response()->json(['message' => 'Order is not in a workable state.'], 422);
        }

        // Check project isolation
        if ($order->project_id !== $user->project_id) {
            return response()->json(['message' => 'Project isolation violation.'], 403);
        }

        $comments = $request->input('comments');
        $order = AssignmentEngine::submitWork($order, $user, $comments);

        return response()->json([
            'order' => $order,
            'message' => 'Work submitted successfully.',
        ]);
    }

    /**
     * POST /workflow/orders/{id}/reject
     * Reject an order (checker/QA only) with mandatory reason.
     */
    public function rejectOrder(Request $request, int $id)
    {
        $request->validate([
            'reason' => 'required|string|min:5',
            'rejection_code' => 'required|string|in:quality,incomplete,wrong_specs,rework,formatting,missing_info',
            'route_to' => 'nullable|string|in:draw,check,design',
        ]);

        $user = $request->user();
        $order = Order::findOrFail($id);

        if ($order->assigned_to !== $user->id) {
            return response()->json(['message' => 'This order is not assigned to you.'], 403);
        }

        if (!in_array($user->role, ['checker', 'qa'])) {
            return response()->json(['message' => 'Only checkers and QA can reject orders.'], 403);
        }

        if (!in_array($order->workflow_state, ['IN_CHECK', 'IN_QA'])) {
            return response()->json(['message' => 'Order is not in a rejectable state.'], 422);
        }

        $order = AssignmentEngine::rejectOrder(
            $order,
            $user,
            $request->input('reason'),
            $request->input('rejection_code'),
            $request->input('route_to')
        );

        return response()->json([
            'order' => $order,
            'message' => 'Order rejected and returned to queue.',
        ]);
    }

    /**
     * POST /workflow/orders/{id}/hold
     * Place an order on hold (checker/QA/ops only).
     */
    public function holdOrder(Request $request, int $id)
    {
        $request->validate([
            'hold_reason' => 'required|string|min:3',
        ]);

        $user = $request->user();
        $order = Order::findOrFail($id);

        if (!in_array($user->role, StateMachine::HOLD_ALLOWED_ROLES)) {
            return response()->json(['message' => 'You are not allowed to place orders on hold.'], 403);
        }

        if (!StateMachine::canTransition($order, 'ON_HOLD')) {
            return response()->json(['message' => 'Cannot put this order on hold from its current state.'], 422);
        }

        // If user had this assigned, release it
        if ($order->assigned_to === $user->id) {
            $user->decrement('wip_count');
        }

        StateMachine::transition($order, 'ON_HOLD', $user->id, [
            'hold_reason' => $request->input('hold_reason'),
        ]);

        return response()->json([
            'order' => $order->fresh(),
            'message' => 'Order placed on hold.',
        ]);
    }

    /**
     * POST /workflow/orders/{id}/resume
     * Resume an order from ON_HOLD.
     */
    public function resumeOrder(Request $request, int $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        if ($order->workflow_state !== 'ON_HOLD') {
            return response()->json(['message' => 'Order is not on hold.'], 422);
        }

        if (!in_array($user->role, ['operations_manager', 'director', 'ceo'])) {
            return response()->json(['message' => 'Only managers can resume held orders.'], 403);
        }

        // Determine which queue to return to based on workflow type
        $queueState = $order->workflow_type === 'PH_2_LAYER' ? 'QUEUED_DESIGN' : 'QUEUED_DRAW';

        StateMachine::transition($order, $queueState, $user->id, ['resumed_from_hold' => true]);

        return response()->json([
            'order' => $order->fresh(),
            'message' => 'Order resumed.',
        ]);
    }

    /**
     * GET /workflow/my-stats
     * Worker's today stats: completed, target, time.
     */
    public function myStats(Request $request)
    {
        $user = $request->user();

        $todayCompleted = WorkItem::where('assigned_user_id', $user->id)
            ->where('status', 'completed')
            ->whereDate('completed_at', today())
            ->count();

        $queueCount = 0;
        if ($user->project_id && in_array($user->role, ['drawer', 'checker', 'qa', 'designer'])) {
            $project = $user->project;
            $queueStates = StateMachine::getQueuedStates($project->workflow_type ?? 'FP_3_LAYER');
            $roleQueueState = collect($queueStates)->first(function ($state) use ($user) {
                $role = StateMachine::getRoleForState($state);
                return $role === $user->role;
            });
            if ($roleQueueState) {
                $queueCount = Order::where('project_id', $user->project_id)
                    ->where('workflow_state', $roleQueueState)
                    ->count();
            }
        }

        return response()->json([
            'today_completed' => $todayCompleted,
            'daily_target' => $user->daily_target ?? 0,
            'wip_count' => $user->wip_count,
            'queue_count' => $queueCount,
            'is_absent' => $user->is_absent,
        ]);
    }

    // ═══════════════════════════════════════════
    // MANAGEMENT ENDPOINTS (Ops/Director/CEO)
    // ═══════════════════════════════════════════

    /**
     * GET /workflow/{projectId}/queue-health
     * Queue health for a project: counts per state, oldest item, SLA breaches.
     */
    public function queueHealth(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);

        $states = $project->workflow_type === 'PH_2_LAYER'
            ? StateMachine::PH_STATES
            : StateMachine::FP_STATES;

        $counts = [];
        foreach ($states as $state) {
            $query = Order::where('project_id', $projectId)->where('workflow_state', $state);
            $counts[$state] = [
                'count' => $query->count(),
                'oldest' => $query->min('received_at'),
            ];
        }

        // SLA breaches (orders past due_date)
        $slaBreaches = Order::where('project_id', $projectId)
            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        return response()->json([
            'project_id' => $projectId,
            'workflow_type' => $project->workflow_type,
            'state_counts' => $counts,
            'sla_breaches' => $slaBreaches,
            'total_pending' => Order::where('project_id', $projectId)
                ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                ->count(),
            'total_delivered' => Order::where('project_id', $projectId)
                ->where('workflow_state', 'DELIVERED')
                ->count(),
        ]);
    }

    /**
     * GET /workflow/{projectId}/staffing
     * Staffing overview for a project.
     */
    public function staffing(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);

        $stages = StateMachine::getStages($project->workflow_type);
        $staffing = [];

        foreach ($stages as $stage) {
            $role = StateMachine::STAGE_TO_ROLE[$stage];
            $users = \App\Models\User::where('project_id', $projectId)
                ->where('role', $role)
                ->get(['id', 'name', 'role', 'team_id', 'is_active', 'is_absent', 'wip_count', 'today_completed', 'last_activity', 'daily_target']);

            $staffing[$stage] = [
                'role' => $role,
                'total' => $users->count(),
                'active' => $users->where('is_active', true)->where('is_absent', false)->count(),
                'absent' => $users->where('is_absent', true)->count(),
                'users' => $users,
            ];
        }

        return response()->json([
            'project_id' => $projectId,
            'staffing' => $staffing,
        ]);
    }

    /**
     * POST /workflow/orders/{id}/reassign
     * Manually reassign an order (management only).
     */
    public function reassignOrder(Request $request, int $id)
    {
        $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'reason' => 'required|string',
        ]);

        $actor = $request->user();
        $order = Order::findOrFail($id);

        $oldAssignee = $order->assigned_to;

        // If reassigning to null, return to queue
        if (!$request->input('user_id')) {
            $queueState = str_replace('IN_', 'QUEUED_', $order->workflow_state);
            if (str_starts_with($order->workflow_state, 'IN_')) {
                // Abandon current work item
                WorkItem::where('order_id', $order->id)
                    ->where('assigned_user_id', $oldAssignee)
                    ->where('status', 'in_progress')
                    ->update(['status' => 'abandoned', 'completed_at' => now()]);

                if ($oldAssignee) {
                    \App\Models\User::where('id', $oldAssignee)->decrement('wip_count');
                }

                StateMachine::transition($order, $queueState, $actor->id, [
                    'reason' => $request->input('reason'),
                ]);
            }
        } else {
            $newUser = \App\Models\User::findOrFail($request->input('user_id'));
            $order->update(['assigned_to' => $newUser->id, 'team_id' => $newUser->team_id]);

            AuditService::logAssignment(
                $order->id,
                $order->project_id,
                $oldAssignee,
                $newUser->id,
                $request->input('reason')
            );
        }

        return response()->json([
            'order' => $order->fresh(),
            'message' => 'Order reassigned.',
        ]);
    }

    /**
     * POST /workflow/receive
     * Receive a new order into the system (creates in RECEIVED state).
     */
    public function receiveOrder(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'client_reference' => 'required|string',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'due_date' => 'nullable|date',
            'metadata' => 'nullable|array',
        ]);

        $project = Project::findOrFail($request->input('project_id'));

        // Idempotency check: client_reference + project
        $existing = Order::where('project_id', $project->id)
            ->where('client_reference', $request->input('client_reference'))
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Duplicate order: this client reference already exists for this project.',
                'existing_order' => $existing,
            ], 409);
        }

        $order = DB::transaction(function () use ($request, $project) {
            $order = Order::create([
                'order_number' => 'ORD-' . strtoupper(uniqid()),
                'project_id' => $project->id,
                'client_reference' => $request->input('client_reference'),
                'workflow_state' => 'RECEIVED',
                'workflow_type' => $project->workflow_type,
                'current_layer' => $project->workflow_type === 'PH_2_LAYER' ? 'designer' : 'drawer',
                'status' => 'pending',
                'priority' => $request->input('priority', 'normal'),
                'due_date' => $request->input('due_date'),
                'received_at' => now(),
                'metadata' => $request->input('metadata'),
            ]);

            // Auto-advance to first queue
            $firstQueue = $project->workflow_type === 'PH_2_LAYER' ? 'QUEUED_DESIGN' : 'QUEUED_DRAW';
            StateMachine::transition($order, $firstQueue, auth()->id());

            return $order;
        });

        return response()->json([
            'order' => $order->fresh(),
            'message' => 'Order received and queued.',
        ], 201);
    }

    /**
     * GET /workflow/orders/{id}
     * Get order details with role-based field visibility.
     */
    public function orderDetails(Request $request, int $id)
    {
        $user = $request->user();
        $order = Order::with(['project', 'team', 'assignedUser', 'workItems.assignedUser'])->findOrFail($id);

        // Project isolation check for production users
        if (in_array($user->role, ['drawer', 'checker', 'qa', 'designer'])) {
            if ($order->project_id !== $user->project_id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            // Workers can only see their own assigned orders
            if ($order->assigned_to !== $user->id) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
        }

        // Role-based field filtering
        $data = $this->filterOrderFieldsByRole($order, $user->role);

        return response()->json(['order' => $data]);
    }

    /**
     * GET /workflow/{projectId}/orders
     * List orders for a project with filters.
     */
    public function projectOrders(Request $request, int $projectId)
    {
        $query = Order::where('project_id', $projectId)
            ->with(['assignedUser:id,name,role', 'team:id,name']);

        $user = $request->user();
        if (!in_array($user->role, ['ceo', 'director'])) {
            if ($user->project_id && $user->project_id != $projectId) {
                return response()->json(['message' => 'Access denied to this project.'], 403);
            }
        }

        if ($request->has('state')) {
            $query->where('workflow_state', $request->input('state'));
        }
        if ($request->has('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }
        if ($request->has('team_id')) {
            $query->where('team_id', $request->input('team_id'));
        }

        $orders = $query->orderBy('received_at', 'desc')->paginate(50);

        return response()->json($orders);
    }

    /**
     * GET /workflow/work-items/{orderId}
     * Get all work items (per-stage history) for an order.
     */
    public function workItemHistory(int $orderId)
    {
        $items = WorkItem::where('order_id', $orderId)
            ->with('assignedUser:id,name,role')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['work_items' => $items]);
    }

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    /**
     * Filter order fields based on user role.
     * Backend enforces role-based data — not just UI hiding.
     */
    private function filterOrderFieldsByRole(Order $order, string $role): array
    {
        $base = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'client_reference' => $order->client_reference,
            'workflow_state' => $order->workflow_state,
            'priority' => $order->priority,
            'due_date' => $order->due_date,
            'received_at' => $order->received_at,
            'project' => $order->project ? ['id' => $order->project->id, 'name' => $order->project->name, 'code' => $order->project->code] : null,
            'team' => $order->team ? ['id' => $order->team->id, 'name' => $order->team->name] : null,
        ];

        // Drawer/Designer: instructions, specs, assets
        if (in_array($role, ['drawer', 'designer'])) {
            $base['metadata'] = $order->metadata; // Contains specs/instructions
            $base['attempt_draw'] = $order->attempt_draw;
            $base['rejection_reason'] = $order->rejection_reason; // So they know what to fix
            $base['rejection_type'] = $order->rejection_type;
            return $base;
        }

        // Checker: expected vs produced, error points, delta checklist
        if ($role === 'checker') {
            $base['metadata'] = $order->metadata;
            $base['attempt_draw'] = $order->attempt_draw;
            $base['attempt_check'] = $order->attempt_check;
            $base['rejection_reason'] = $order->rejection_reason;
            $base['rejection_type'] = $order->rejection_type;
            $base['recheck_count'] = $order->recheck_count;
            $base['work_items'] = $order->workItems->where('stage', 'DRAW')->values();
            return $base;
        }

        // QA: final checklist + rejection history
        if ($role === 'qa') {
            $base['metadata'] = $order->metadata;
            $base['attempt_draw'] = $order->attempt_draw;
            $base['attempt_check'] = $order->attempt_check;
            $base['attempt_qa'] = $order->attempt_qa;
            $base['rejection_reason'] = $order->rejection_reason;
            $base['rejection_type'] = $order->rejection_type;
            $base['recheck_count'] = $order->recheck_count;
            $base['work_items'] = $order->workItems; // Full history for QA
            return $base;
        }

        // Management: everything
        $base = $order->toArray();
        $base['work_items'] = $order->workItems;
        return $base;
    }
}
