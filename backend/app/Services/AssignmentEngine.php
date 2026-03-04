<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssignmentEngine
{
    /**
     * Start next: find the next order in the user's queue and assign it.
     * Returns the assigned order or null if queue is empty.
     * Uses per-user wip_limit and complexity-weighted load check.
     */
    public static function startNext(User $user): ?Order
    {
        $project = $user->project;
        if (!$project) return null;

        $role = $user->role;
        $queueState = self::getQueueStateForRole($role, $project->workflow_type);
        if (!$queueState) return null;

        // Check per-user WIP limit (using weighted complexity load)
        $wipLimit = $user->wip_limit ?: 5;
        $currentWip = Order::forProject($project->id)
            ->where('assigned_to', $user->id)
            ->whereIn('workflow_state', self::getInProgressStatesForRole($role, $project->workflow_type))
            ->count();

        if ($currentWip >= $wipLimit) {
            return null; // Already at max WIP
        }

        // Find next order: priority first, then oldest received
        // Phase 3: if worker has skills, prefer matching order_types
        $query = Order::forProject($project->id)
            ->where('workflow_state', $queueState)
            ->whereNull('assigned_to');

        $skills = $user->skills ?? [];
        if (!empty($skills)) {
            // Boost orders matching worker's skills to top, then normal priority ordering
            $placeholders = implode(',', array_fill(0, count($skills), '?'));
            $query->orderByRaw("CASE WHEN order_type IN ({$placeholders}) THEN 0 ELSE 1 END ASC", $skills);
        }

        $order = $query
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 ELSE 5 END")
            ->orderBy('received_at', 'asc')
            ->lockForUpdate()
            ->first();

        if (!$order) return null;

        $inState = StateMachine::getInProgressState($queueState);
        if (!$inState) return null;

        return DB::transaction(function () use ($order, $user, $inState, $queueState, $role) {
            // Assign + transition — also set role-specific columns on the Order model
            $assignData = ['assigned_to' => $user->id, 'team_id' => $user->team_id];
            if ($role === 'drawer' || $role === 'designer') {
                $assignData['drawer_id']   = $user->id;
                $assignData['drawer_name'] = $user->name;
                $assignData['dassign_time'] = now();
            } elseif ($role === 'checker') {
                $assignData['checker_id']   = $user->id;
                $assignData['checker_name'] = $user->name;
                $assignData['cassign_time'] = now();
            } elseif ($role === 'qa') {
                $assignData['qa_id']   = $user->id;
                $assignData['qa_name'] = $user->name;
            }
            $order->update($assignData);

            StateMachine::transition($order, $inState, $user->id);

            // Create work item
            $stage = StateMachine::STATE_TO_STAGE[$inState] ?? null;
            WorkItem::create([
                'order_id'         => $order->id,
                'project_id'       => $order->project_id,
                'stage'            => $stage,
                'assigned_user_id' => $user->id,
                'team_id'          => $user->team_id,
                'status'           => 'in_progress',
                'assigned_at'      => now(),
                'started_at'       => now(),
                'attempt_number'   => self::getAttemptNumber($order, $stage),
            ]);

            // Update user WIP
            $user->increment('wip_count');

            // Sync to project table for Live QA visibility
            self::syncToProjectTable($order->fresh(), $user, 'start');

            return $order->fresh();
        });
    }

    /**
     * Submit work: transition order to next stage.
     */
    public static function submitWork(Order $order, User $user, ?string $comments = null): Order
    {
        $submittedState = StateMachine::getSubmittedState($order->workflow_state);
        if (!$submittedState) {
            throw new \InvalidArgumentException("Cannot submit from state: {$order->workflow_state}");
        }

        return DB::transaction(function () use ($order, $user, $submittedState, $comments) {
            // Complete the work item (try with stage first, fallback to any matching in-progress)
            $stage = StateMachine::STATE_TO_STAGE[$order->workflow_state] ?? null;
            $workItem = WorkItem::where('order_id', $order->id)
                ->where('stage', $stage)
                ->where('assigned_user_id', $user->id)
                ->where('status', 'in_progress')
                ->latest()
                ->first();

            // Fallback: find by order + user without stage filter (auto-created items)
            if (!$workItem) {
                $workItem = WorkItem::where('order_id', $order->id)
                    ->where('assigned_user_id', $user->id)
                    ->where('status', 'in_progress')
                    ->latest()
                    ->first();
            }

            if ($workItem) {
                $workItem->update([
                    'status'       => 'completed',
                    'completed_at' => now(),
                    'comments'     => $comments,
                ]);
            }

            // Transition to submitted state
            StateMachine::transition($order, $submittedState, $user->id);

            // Auto-advance to next queue
            $nextQueue = StateMachine::getNextQueueState($submittedState, $order->workflow_type);
            if ($nextQueue) {
                StateMachine::transition($order, $nextQueue, $user->id);
            }

            // Update user stats (safely prevent negative values)
            if ($user->wip_count > 0) {
                $user->decrement('wip_count');
            }
            $user->increment('today_completed');

            // Sync to project table for Live QA visibility
            self::syncToProjectTable($order->fresh(), $user, 'submit');

            return $order->fresh();
        });
    }

    /**
     * Reject an order (by checker or QA).
     */
    public static function rejectOrder(
        Order $order,
        User $actor,
        string $reason,
        string $rejectionCode,
        ?string $routeTo = null
    ): Order {
        $currentState = $order->workflow_state;

        // Determine rejection target state
        if ($currentState === 'IN_CHECK') {
            $targetState = 'REJECTED_BY_CHECK';
        } elseif ($currentState === 'IN_QA') {
            $targetState = 'REJECTED_BY_QA';
        } else {
            throw new \InvalidArgumentException("Cannot reject from state: {$currentState}");
        }

        return DB::transaction(function () use ($order, $actor, $reason, $rejectionCode, $targetState, $routeTo) {
            // Complete current work item as rejected
            $stage = StateMachine::STATE_TO_STAGE[$order->workflow_state] ?? null;
            $workItem = WorkItem::where('order_id', $order->id)
                ->where('stage', $stage)
                ->where('assigned_user_id', $actor->id)
                ->where('status', 'in_progress')
                ->latest()
                ->first();

            if ($workItem) {
                $workItem->update([
                    'status'         => 'completed',
                    'completed_at'   => now(),
                    'rework_reason'  => $reason,
                    'rejection_code' => $rejectionCode,
                ]);
            }

            // Update order rejection fields
            $order->update([
                'rejected_by'      => $actor->id,
                'rejected_at'      => now(),
                'rejection_reason' => $reason,
                'rejection_type'   => $rejectionCode,
                'recheck_count'    => $order->recheck_count + 1,
            ]);

            // Transition to rejected state
            StateMachine::transition($order, $targetState, $actor->id, [
                'rejection_reason' => $reason,
                'rejection_code'   => $rejectionCode,
            ]);

            // Route to the appropriate queue
            if ($targetState === 'REJECTED_BY_CHECK') {
                StateMachine::transition($order, 'QUEUED_DRAW', $actor->id);
            } elseif ($targetState === 'REJECTED_BY_QA') {
                $target = ($routeTo === 'draw') ? 'QUEUED_DRAW' : 'QUEUED_CHECK';
                if ($order->workflow_type === 'PH_2_LAYER') {
                    $target = 'QUEUED_DESIGN';
                }
                StateMachine::transition($order, $target, $actor->id);
            }

            // Update actor stats (safely prevent negative values)
            if ($actor->wip_count > 0) {
                $actor->decrement('wip_count');
            }
            $actor->increment('today_completed');

            return $order->fresh();
        });
    }

    /**
     * Reassign work from an inactive/terminated user.
     */
    public static function reassignFromUser(User $user, ?int $actorId = null): int
    {
        $orders = collect();
        if ($user->project_id) {
            $orders = Order::forProject($user->project_id)
                ->where('assigned_to', $user->id)
                ->whereIn('workflow_state', [
                    'IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN',
                ])
                ->get();
        }

        $count = 0;
        foreach ($orders as $order) {
            DB::transaction(function () use ($order, $user, $actorId) {
                $currentState = $order->workflow_state;
                $queueState = str_replace('IN_', 'QUEUED_', $currentState);

                // Revert work item
                $stage = StateMachine::STATE_TO_STAGE[$currentState] ?? null;
                WorkItem::where('order_id', $order->id)
                    ->where('stage', $stage)
                    ->where('assigned_user_id', $user->id)
                    ->where('status', 'in_progress')
                    ->update(['status' => 'abandoned', 'completed_at' => now()]);

                // Directly update state (admin override — bypasses state machine validation)
                $oldState = $order->workflow_state;
                $order->update([
                    'workflow_state' => $queueState,
                    'assigned_to' => null,
                ]);

                // Create audit log
                \App\Services\AuditService::log(
                    null,
                    'admin_reassign',
                    'Order',
                    $order->id,
                    $order->project_id,
                    ['workflow_state' => $oldState, 'assigned_to' => $user->id],
                    ['workflow_state' => $queueState, 'assigned_to' => null]
                );
            });
            $count++;
        }

        $user->update(['wip_count' => 0]);
        return $count;
    }

    /**
     * Find the best user for auto-assignment in a project queue.
     * Uses pre-computed assignment_score for intelligent selection.
     * Team constraint: for checker/QA roles, filters by team_id to ensure
     * all 3 layers (drawer → checker → QA) stay within the same team.
     * Minimum-2: prioritises workers who have fewer than 2 orders.
     */
    public static function findBestUser(int $projectId, string $role, ?string $orderType = null, ?int $teamId = null): ?User
    {
        $query = User::where('project_id', $projectId)
            ->where('role', $role)
            ->where('is_active', true)
            ->where('is_absent', false)
            ->where('last_activity', '>', now()->subMinutes(15))
            ->whereRaw('wip_count < wip_limit');

        // Team constraint: checker and QA must be from the same team as the order
        if ($teamId && in_array($role, ['checker', 'qa'])) {
            $query->where('team_id', $teamId);
        }

        // Minimum-2 prioritisation: workers with <2 orders get priority
        $query->orderByRaw('CASE WHEN wip_count < 2 THEN 0 ELSE 1 END ASC');

        // Phase 3: Skill matching
        if ($orderType && $orderType !== 'standard') {
            $query->orderByRaw("
                CASE WHEN skills IS NOT NULL AND JSON_CONTAINS(skills, ?, '$')
                THEN 0 ELSE 1 END ASC
            ", [json_encode($orderType)]);
        }

        return $query
            ->orderBy('assignment_score', 'desc')  // Weighted composite score
            ->orderBy('wip_count', 'asc')           // Tiebreak: least loaded
            ->orderBy('today_completed', 'asc')     // Tiebreak: fairness
            ->orderBy('last_activity', 'desc')      // Tiebreak: most recently active
            ->first();
    }

    // ── Private helpers ──

    private static function getQueueStateForRole(string $role, string $workflowType): ?string
    {
        if ($workflowType === 'PH_2_LAYER') {
            return match ($role) {
                'designer' => 'QUEUED_DESIGN',
                'qa'       => 'QUEUED_QA',
                default    => null,
            };
        }
        return match ($role) {
            'drawer'  => 'QUEUED_DRAW',
            'checker' => 'QUEUED_CHECK',
            'qa'      => 'QUEUED_QA',
            default   => null,
        };
    }

    private static function getInProgressStatesForRole(string $role, string $workflowType): array
    {
        if ($workflowType === 'PH_2_LAYER') {
            return match ($role) {
                'designer' => ['IN_DESIGN'],
                'qa'       => ['IN_QA'],
                default    => [],
            };
        }
        return match ($role) {
            'drawer'  => ['IN_DRAW'],
            'checker' => ['IN_CHECK'],
            'qa'      => ['IN_QA'],
            default   => [],
        };
    }

    private static function getAttemptNumber(Order $order, ?string $stage): int
    {
        return match ($stage) {
            'DRAW'   => $order->attempt_draw + 1,
            'CHECK'  => $order->attempt_check + 1,
            'DESIGN' => $order->attempt_draw + 1,
            'QA'     => $order->attempt_qa + 1,
            default  => 1,
        };
    }

    /**
     * Sync order state to the per-project dynamic table (project_{id}_orders).
     * This keeps the Live QA dashboard in sync when orders are processed
     * through the new system's workflow.
     *
     * @param Order  $order  The freshly-updated order
     * @param User   $user   The worker performing the action
     * @param string $action 'start' or 'submit'
     */
    public static function syncToProjectTable(Order $order, User $user, string $action): void
    {
        try {
            $projectTable = ProjectOrderService::getTableName($order->project_id);
            if (!Schema::hasTable($projectTable)) {
                return;
            }

            $projectOrder = DB::table($projectTable)
                ->where('order_number', $order->order_number)
                ->first();

            if (!$projectOrder) {
                return;
            }

            $updates = [
                'workflow_state' => $order->workflow_state,
                'status'         => $order->status,
                'current_layer'  => $order->current_layer,
                'assigned_to'    => $order->assigned_to,
                'updated_at'     => now(),
            ];

            $state = $order->workflow_state;
            $role = $user->role;

            if ($action === 'start') {
                // Worker picked up the order
                if ($role === 'drawer' || $role === 'designer') {
                    $updates['drawer_name'] = $user->name;
                    $updates['drawer_id']   = $user->id;
                    $updates['dassign_time'] = now()->toDateTimeString();
                } elseif ($role === 'checker') {
                    $updates['checker_name'] = $user->name;
                    $updates['checker_id']   = $user->id;
                    $updates['cassign_time'] = now()->toDateTimeString();
                } elseif ($role === 'qa') {
                    $updates['qa_name'] = $user->name;
                    $updates['qa_id']   = $user->id;
                }
            } elseif ($action === 'submit') {
                // Worker completed their stage
                if (in_array($state, ['SUBMITTED_DRAW', 'QUEUED_CHECK'])) {
                    $updates['drawer_done'] = 'yes';
                    $updates['drawer_date'] = now()->toDateTimeString();
                } elseif (in_array($state, ['SUBMITTED_CHECK', 'QUEUED_QA'])) {
                    $updates['checker_done'] = 'yes';
                    $updates['checker_date'] = now()->toDateTimeString();
                } elseif (in_array($state, ['APPROVED_QA', 'DELIVERED'])) {
                    $updates['final_upload']  = 'yes';
                    $updates['ausFinaldate']  = now()->toDateTimeString();
                } elseif (in_array($state, ['SUBMITTED_DESIGN', 'QUEUED_QA'])) {
                    // Photos 2-layer: designer done
                    $updates['drawer_done'] = 'yes';
                    $updates['drawer_date'] = now()->toDateTimeString();
                }
            }

            DB::table($projectTable)
                ->where('order_number', $order->order_number)
                ->update($updates);

            // ── Also persist to crm_order_assignments (survives cron sync) ──
            // Merge $updates into crmData so role columns written to project table
            // are also captured in CRM (the Order model may not have them yet).
            $crmData = [
                'workflow_state' => $order->workflow_state,
                'assigned_to'    => $updates['assigned_to'] ?? $order->assigned_to,
                'drawer_id'      => $updates['drawer_id'] ?? $order->drawer_id,
                'drawer_name'    => $updates['drawer_name'] ?? $order->drawer_name,
                'checker_id'     => $updates['checker_id'] ?? $order->checker_id,
                'checker_name'   => $updates['checker_name'] ?? $order->checker_name,
                'qa_id'          => $updates['qa_id'] ?? $order->qa_id,
                'qa_name'        => $updates['qa_name'] ?? $order->qa_name,
                'dassign_time'   => $updates['dassign_time'] ?? $order->dassign_time,
                'cassign_time'   => $updates['cassign_time'] ?? $order->cassign_time,
                'updated_at'     => now(),
            ];

            // Include done-flags so dashboard COALESCE picks them up
            if (isset($updates['drawer_done']))  $crmData['drawer_done']  = $updates['drawer_done'];
            if (isset($updates['drawer_date']))  $crmData['drawer_date']  = $updates['drawer_date'];
            if (isset($updates['checker_done'])) $crmData['checker_done'] = $updates['checker_done'];
            if (isset($updates['checker_date'])) $crmData['checker_date'] = $updates['checker_date'];
            if (isset($updates['final_upload'])) $crmData['final_upload'] = $updates['final_upload'];
            if (isset($updates['ausFinaldate'])) $crmData['ausFinaldate'] = $updates['ausFinaldate'];

            $existingCrm = DB::table('crm_order_assignments')
                ->where('project_id', $order->project_id)
                ->where('order_number', $order->order_number)
                ->first();

            if ($existingCrm) {
                DB::table('crm_order_assignments')
                    ->where('id', $existingCrm->id)
                    ->update($crmData);
            } else {
                $crmData['project_id']   = $order->project_id;
                $crmData['order_number'] = $order->order_number;
                $crmData['created_at']   = now();
                DB::table('crm_order_assignments')->insert($crmData);
            }

        } catch (\Throwable $e) {
            // Log but don't break the workflow
            \Log::warning('syncToProjectTable failed', [
                'order_id'   => $order->id,
                'project_id' => $order->project_id,
                'action'     => $action,
                'error'      => $e->getMessage(),
            ]);
        }
    }
}
