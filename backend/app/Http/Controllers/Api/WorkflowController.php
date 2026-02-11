<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\User;
use App\Models\WorkAssignment;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    /**
     * Get work queue for a user.
     */
    public function queue(Request $request)
    {
        $user = auth()->user();
        
        $query = Order::with(['project', 'team', 'assignedUser']);

        // For workers, show only their assigned orders
        if (in_array($user->role, ['qa', 'checker', 'drawer', 'designer'])) {
            $query->where('assigned_to', $user->id);
        } else {
            // For managers, show all orders in their scope
            if ($user->country) {
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('country', $user->country);
                });
            }
            
            if ($user->department) {
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('department', $user->department);
                });
            }
            
            if ($user->project_id) {
                $query->where('project_id', $user->project_id);
            }
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by layer
        if ($request->has('layer')) {
            $query->where('current_layer', $request->layer);
        }

        // Filter by priority
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        $orders = $query->orderBy('priority', 'desc')
            ->orderBy('received_at', 'asc')
            ->paginate($request->per_page ?? 20);

        return response()->json($orders);
    }

    /**
     * Create a new order.
     */
    public function createOrder(StoreOrderRequest $request)
    {
        $order = Order::create($request->validated());

        ActivityLog::log('created_order', Order::class, $order->id, null, $order->toArray());

        return response()->json([
            'message' => 'Order created successfully',
            'data' => $order->load(['project', 'team', 'assignedUser']),
        ], 201);
    }

    /**
     * Update an order.
     */
    public function updateOrder(UpdateOrderRequest $request, string $id)
    {
        $order = Order::findOrFail($id);
        $oldValues = $order->toArray();

        $order->update($request->validated());

        ActivityLog::log('updated_order', Order::class, $order->id, $oldValues, $order->toArray());

        return response()->json([
            'message' => 'Order updated successfully',
            'data' => $order->load(['project', 'team', 'assignedUser']),
        ]);
    }

    /**
     * Assign order to a user.
     */
    public function assignOrder(Request $request, string $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $order = Order::findOrFail($id);
        $user = User::findOrFail($request->user_id);

        $oldAssignee = $order->assigned_to;
        
        $order->update([
            'assigned_to' => $user->id,
            'team_id' => $user->team_id,
            'status' => 'in-progress',
            'started_at' => $order->started_at ?? now(),
        ]);

        // Create work assignment
        WorkAssignment::create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'layer' => $order->current_layer,
            'assigned_at' => now(),
            'status' => 'assigned',
        ]);

        ActivityLog::log('assigned_order', Order::class, $order->id, 
            ['assigned_to' => $oldAssignee],
            ['assigned_to' => $user->id]
        );

        return response()->json([
            'message' => 'Order assigned successfully',
            'data' => $order->fresh(['project', 'team', 'assignedUser']),
        ]);
    }

    /**
     * Start working on an order.
     */
    public function startOrder(string $id)
    {
        $order = Order::findOrFail($id);
        $user = auth()->user();

        if ($order->assigned_to !== $user->id) {
            return response()->json([
                'message' => 'You are not assigned to this order',
            ], 403);
        }

        $order->update([
            'status' => 'in-progress',
            'started_at' => now(),
        ]);

        // Update work assignment
        WorkAssignment::where('order_id', $order->id)
            ->where('user_id', $user->id)
            ->where('layer', $order->current_layer)
            ->update([
                'status' => 'in-progress',
                'started_at' => now(),
            ]);

        ActivityLog::log('started_order', Order::class, $order->id);

        return response()->json([
            'message' => 'Order started',
            'data' => $order,
        ]);
    }

    /**
     * Complete an order.
     */
    public function completeOrder(Request $request, string $id)
    {
        $order = Order::findOrFail($id);
        $user = auth()->user();

        if ($order->assigned_to !== $user->id) {
            return response()->json([
                'message' => 'You are not assigned to this order',
            ], 403);
        }

        // Update work assignment
        WorkAssignment::where('order_id', $order->id)
            ->where('user_id', $user->id)
            ->where('layer', $order->current_layer)
            ->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

        // Check if this is the final layer
        $project = $order->project;
        $workflowLayers = $project->workflow_layers;
        $currentLayerIndex = array_search($order->current_layer, $workflowLayers);

        if ($currentLayerIndex === count($workflowLayers) - 1) {
            // Final layer - complete the order
            $order->update([
                'status' => 'completed',
                'completed_at' => now(),
                'assigned_to' => null,
            ]);
        } else {
            // Move to next layer
            $nextLayer = $workflowLayers[$currentLayerIndex + 1];
            $order->update([
                'current_layer' => $nextLayer,
                'status' => 'pending',
                'assigned_to' => null,
            ]);
        }

        ActivityLog::log('completed_order_layer', Order::class, $order->id, 
            ['layer' => $order->current_layer],
            ['layer' => $order->current_layer ?? 'completed']
        );

        return response()->json([
            'message' => 'Order completed successfully',
            'data' => $order->fresh(['project', 'team', 'assignedUser']),
        ]);
    }

    /**
     * Reassign orders from inactive user.
     */
    public function reassignOrders(Request $request)
    {
        $request->validate([
            'from_user_id' => 'required|exists:users,id',
            'to_user_id' => 'required|exists:users,id',
        ]);

        $fromUser = User::findOrFail($request->from_user_id);
        $toUser = User::findOrFail($request->to_user_id);

        $orders = Order::where('assigned_to', $fromUser->id)
            ->where('status', '!=', 'completed')
            ->get();

        foreach ($orders as $order) {
            $order->update([
                'assigned_to' => $toUser->id,
                'team_id' => $toUser->team_id,
            ]);

            WorkAssignment::create([
                'order_id' => $order->id,
                'user_id' => $toUser->id,
                'layer' => $order->current_layer,
                'assigned_at' => now(),
                'status' => 'assigned',
            ]);
        }

        ActivityLog::log('reassigned_orders', null, null,
            ['from_user' => $fromUser->id, 'count' => $orders->count()],
            ['to_user' => $toUser->id]
        );

        return response()->json([
            'message' => "Successfully reassigned {$orders->count()} orders",
            'count' => $orders->count(),
        ]);
    }

    /**
     * Get order details.
     */
    public function getOrder(string $id)
    {
        $order = Order::with([
            'project',
            'team',
            'assignedUser',
            'workAssignments.user'
        ])->findOrFail($id);

        return response()->json([
            'data' => $order,
        ]);
    }

    /**
     * Get order details by id (alias).
     */
    public function orderDetails(string $id)
    {
        return $this->getOrder($id);
    }

    /**
     * Get assigned order for current worker.
     */
    public function assignedOrder()
    {
        $user = auth()->user();
        
        $order = Order::with(['project', 'team'])
            ->where('assigned_to', $user->id)
            ->whereIn('status', ['pending', 'in-progress'])
            ->orderBy('priority', 'desc')
            ->orderBy('received_at', 'asc')
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'No order currently assigned',
                'data' => null,
            ]);
        }

        return response()->json([
            'data' => $order,
        ]);
    }

    /**
     * Submit order for QA review.
     */
    public function submitOrder(Request $request, string $id)
    {
        return $this->completeOrder($request, $id);
    }

    /**
     * Reassign a specific order to another user.
     */
    public function reassignOrder(Request $request, string $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $order = Order::findOrFail($id);
        $toUser = User::findOrFail($request->user_id);

        $oldAssignee = $order->assigned_to;
        
        $order->update([
            'assigned_to' => $toUser->id,
            'team_id' => $toUser->team_id,
        ]);

        WorkAssignment::create([
            'order_id' => $order->id,
            'user_id' => $toUser->id,
            'layer' => $order->current_layer,
            'assigned_at' => now(),
            'status' => 'assigned',
        ]);

        ActivityLog::log('reassigned_order', Order::class, $order->id,
            ['assigned_to' => $oldAssignee],
            ['assigned_to' => $toUser->id]
        );

        return response()->json([
            'message' => 'Order reassigned successfully',
            'data' => $order->fresh(['project', 'team', 'assignedUser']),
        ]);
    }

    /**
     * Get queues for a project.
     */
    public function queues(string $projectId)
    {
        $orders = Order::with(['team', 'assignedUser'])
            ->where('project_id', $projectId)
            ->orderBy('priority', 'desc')
            ->orderBy('received_at', 'asc')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * Reject an order and send back to designer.
     */
    public function rejectOrder(Request $request, string $id)
    {
        $request->validate([
            'reason' => 'required|string|min:10',
            'rejection_type' => 'required|in:quality,incomplete,incorrect,other',
        ]);

        $order = Order::findOrFail($id);
        $user = auth()->user();

        // Only checker, QA, or supervisor can reject
        if (!in_array($user->role, ['checker', 'qa', 'operations_manager', 'director', 'ceo'])) {
            return response()->json([
                'message' => 'You do not have permission to reject orders',
            ], 403);
        }

        $previousLayer = $order->current_layer;
        $previousAssignee = $order->assigned_to;

        $order->reject($user->id, $request->reason, $request->rejection_type);

        ActivityLog::log('rejected_order', Order::class, $order->id, 
            [
                'previous_layer' => $previousLayer,
                'previous_assignee' => $previousAssignee,
            ],
            [
                'rejection_reason' => $request->reason,
                'rejection_type' => $request->rejection_type,
                'recheck_count' => $order->recheck_count,
            ]
        );

        return response()->json([
            'message' => 'Order rejected and sent back to designer',
            'data' => $order->fresh(['project', 'team', 'assignedUser', 'rejectedBy']),
        ]);
    }

    /**
     * Mark order as self-corrected by checker.
     */
    public function selfCorrectOrder(Request $request, string $id)
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $order = Order::findOrFail($id);
        $user = auth()->user();

        // Only checker can self-correct
        if ($user->role !== 'checker') {
            return response()->json([
                'message' => 'Only checkers can self-correct orders',
            ], 403);
        }

        $order->markSelfCorrected();

        ActivityLog::log('self_corrected_order', Order::class, $order->id, 
            null,
            ['notes' => $request->notes]
        );

        return response()->json([
            'message' => 'Order marked as self-corrected',
            'data' => $order,
        ]);
    }

    /**
     * Get rejected orders that need rework.
     */
    public function rejectedOrders(Request $request)
    {
        $user = auth()->user();

        $query = Order::with(['project', 'team', 'assignedUser', 'rejectedBy'])
            ->needsRecheck();

        // Scope by user's access
        if (in_array($user->role, ['drawer', 'designer'])) {
            // Show orders that were rejected and are now pending for this layer
            $query->where('current_layer', $user->layer ?? $user->role);
        } elseif ($user->project_id) {
            $query->where('project_id', $user->project_id);
        } elseif ($user->country) {
            $query->whereHas('project', function ($q) use ($user) {
                $q->where('country', $user->country);
            });
        }

        $orders = $query->orderBy('recheck_count', 'desc')
            ->orderBy('rejected_at', 'desc')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * Get orders pending sync to client portal.
     */
    public function unsyncedOrders(Request $request)
    {
        $user = auth()->user();

        $query = Order::with(['project'])
            ->unsynced();

        if ($user->project_id) {
            $query->where('project_id', $user->project_id);
        } elseif ($user->country) {
            $query->whereHas('project', function ($q) use ($user) {
                $q->where('country', $user->country);
            });
        }

        $orders = $query->orderBy('completed_at', 'asc')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * Mark order as synced to client portal.
     */
    public function markSynced(Request $request, string $id)
    {
        $request->validate([
            'client_portal_id' => 'nullable|string',
        ]);

        $order = Order::findOrFail($id);

        if ($request->client_portal_id) {
            $order->client_portal_id = $request->client_portal_id;
        }

        $order->markSyncedToClientPortal();

        ActivityLog::log('synced_to_client_portal', Order::class, $order->id);

        return response()->json([
            'message' => 'Order marked as synced to client portal',
            'data' => $order,
        ]);
    }

    /**
     * Get recently imported orders (unprocessed).
     */
    public function recentlyImported(Request $request)
    {
        $user = auth()->user();

        $query = Order::with(['project', 'importLog'])
            ->where('status', 'pending')
            ->whereNull('assigned_to')
            ->whereNotNull('import_log_id');

        if ($user->project_id) {
            $query->where('project_id', $user->project_id);
        } elseif ($user->country) {
            $query->whereHas('project', function ($q) use ($user) {
                $q->where('country', $user->country);
            });
        }

        $orders = $query->orderBy('received_at', 'desc')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * Bulk assign orders to users.
     */
    public function bulkAssign(Request $request)
    {
        $request->validate([
            'assignments' => 'required|array',
            'assignments.*.order_id' => 'required|exists:orders,id',
            'assignments.*.user_id' => 'required|exists:users,id',
        ]);

        $results = [];
        foreach ($request->assignments as $assignment) {
            $order = Order::find($assignment['order_id']);
            $user = User::find($assignment['user_id']);

            if ($order && $user) {
                $order->update([
                    'assigned_to' => $user->id,
                    'team_id' => $user->team_id,
                ]);

                WorkAssignment::create([
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'layer' => $order->current_layer,
                    'assigned_at' => now(),
                    'status' => 'assigned',
                ]);

                $results[] = [
                    'order_id' => $order->id,
                    'assigned_to' => $user->id,
                    'success' => true,
                ];
            }
        }

        ActivityLog::log('bulk_assigned_orders', null, null, null, [
            'count' => count($results),
        ]);

        return response()->json([
            'message' => 'Orders assigned successfully',
            'results' => $results,
        ]);
    }
}
