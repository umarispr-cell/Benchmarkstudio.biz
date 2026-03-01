<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkItem;
use App\Services\StateMachine;
use App\Services\ProjectOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /**
     * GET /dashboard/master
     * CEO/Director: Org → Country → Department → Project drilldown.
     */
    public function master(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['ceo', 'director', 'accounts_manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // BULK LOAD all data up front to avoid N+1 queries
        $activeProjects = Project::where('status', 'active')->get();
        $allProjectIds = $activeProjects->pluck('id');
        
        // Bulk load all order counts by project + state (across per-project tables)
        $orderCounts = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->selectRaw('project_id, workflow_state, COUNT(*) as cnt')
              ->groupBy('project_id', 'workflow_state');
        })->groupBy('project_id');

        $deliveredToday = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->where('workflow_state', 'DELIVERED')
              ->where('delivered_at', '>=', today()->startOfDay())
              ->where('delivered_at', '<', today()->addDay()->startOfDay())
              ->selectRaw('project_id, COUNT(*) as cnt')
              ->groupBy('project_id');
        })->pluck('cnt', 'project_id');

        $receivedToday = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->where('received_at', '>=', today()->startOfDay())
              ->where('received_at', '<', today()->addDay()->startOfDay())
              ->selectRaw('project_id, COUNT(*) as cnt')
              ->groupBy('project_id');
        })->pluck('cnt', 'project_id');

        $slaBreaches = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
              ->whereNotNull('due_date')
              ->where('due_date', '<', now())
              ->selectRaw('project_id, COUNT(*) as cnt')
              ->groupBy('project_id');
        })->pluck('cnt', 'project_id');

        // Bulk load all staff
        $allStaff = User::whereIn('project_id', $allProjectIds)->where('is_active', true)->get();
        $staffByProject = $allStaff->groupBy('project_id');

        $countries = $activeProjects->groupBy('country');
        $summary = [];

        foreach ($countries as $country => $countryProjects) {
            $countryProjectIds = $countryProjects->pluck('id');

            $departments = [];
            foreach ($countryProjects->groupBy('department') as $dept => $deptProjects) {
                $deptProjectIds = $deptProjects->pluck('id');

                $deptTotalOrders = 0;
                $deptPending = 0;
                foreach ($deptProjectIds as $pid) {
                    $projectOrders = $orderCounts->get($pid, collect());
                    $deptTotalOrders += $projectOrders->sum('cnt');
                    $deptPending += $projectOrders->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->sum('cnt');
                }

                $deptData = [
                    'department' => $dept,
                    'project_count' => $deptProjects->count(),
                    'total_orders' => $deptTotalOrders,
                    'delivered_today' => $deptProjectIds->sum(fn($pid) => $deliveredToday->get($pid, 0)),
                    'pending' => $deptPending,
                    'sla_breaches' => $deptProjectIds->sum(fn($pid) => $slaBreaches->get($pid, 0)),
                    'projects' => $deptProjects->map(fn($p) => [
                        'id' => $p->id,
                        'code' => $p->code,
                        'name' => $p->name,
                        'workflow_type' => $p->workflow_type,
                        'pending' => $orderCounts->get($p->id, collect())
                            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->sum('cnt'),
                        'delivered_today' => $deliveredToday->get($p->id, 0),
                    ]),
                ];
                $departments[] = $deptData;
            }

            $countryStaff = $staffByProject->filter(fn($v, $k) => $countryProjectIds->contains($k))->flatten();
            $totalStaff = $countryStaff->count();
            $activeStaff = $countryStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count();
            $absentStaff = $countryStaff->where('is_absent', true)->count();

            $summary[] = [
                'country' => $country,
                'project_count' => $countryProjects->count(),
                'total_staff' => $totalStaff,
                'active_staff' => $activeStaff,
                'absent_staff' => $absentStaff,
                'received_today' => $countryProjectIds->sum(fn($pid) => $receivedToday->get($pid, 0)),
                'delivered_today' => $countryProjectIds->sum(fn($pid) => $deliveredToday->get($pid, 0)),
                'total_pending' => $orderCounts->filter(fn($v, $k) => $countryProjectIds->contains($k))
                    ->flatten()->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->sum('cnt'),
                'departments' => $departments,
            ];
        }

        // Productivity & Overtime Analysis (per CEO requirements)
        $standardShiftHours = 9; // 9-hour shift per requirements
        
        // Calculate overtime/undertime based on work items (bulk loaded)
        $todayWorkItems = WorkItem::where('status', 'completed')
            ->whereDate('completed_at', today())
            ->selectRaw('assigned_user_id, COUNT(*) as cnt')
            ->groupBy('assigned_user_id')
            ->pluck('cnt', 'assigned_user_id');
        
        $usersWithOvertime = 0;
        $usersUnderTarget = 0;
        $totalTargetAchieved = 0;
        $totalStaffWithTargets = 0;
        
        foreach ($allStaff as $staff) {
            if ($staff->daily_target > 0) {
                $totalStaffWithTargets++;
                $todayCompleted = $todayWorkItems->get($staff->id, 0);
                if ($todayCompleted >= $staff->daily_target) {
                    $totalTargetAchieved++;
                }
                // Overtime: completed more than 120% of target
                if ($todayCompleted > ($staff->daily_target * 1.2)) {
                    $usersWithOvertime++;
                }
                // Under-target: completed less than 80% of target
                if ($todayCompleted < ($staff->daily_target * 0.8)) {
                    $usersUnderTarget++;
                }
            }
        }
        
        $targetHitRate = $totalStaffWithTargets > 0 
            ? round(($totalTargetAchieved / $totalStaffWithTargets) * 100, 1) 
            : 0;

        // Org-wide totals (reuse already-loaded data)
        $orgTotals = [
            'total_projects' => $activeProjects->count(),
            'total_staff' => $allStaff->count(),
            'active_staff' => $allStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
            'absentees' => $allStaff->where('is_absent', true)->count(),
            // Inactive users flagged (15+ days) per CEO requirements
            'inactive_flagged' => User::where('is_active', true)
                ->where('inactive_days', '>=', 15)->count(),
            'orders_received_today' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('received_at', '>=', today()->startOfDay())
                  ->where('received_at', '<', today()->addDay()->startOfDay());
            }),
            'orders_delivered_today' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('workflow_state', 'DELIVERED')
                  ->where('delivered_at', '>=', today()->startOfDay())
                  ->where('delivered_at', '<', today()->addDay()->startOfDay());
            }),
            'orders_received_week' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('received_at', '>=', now()->startOfWeek());
            }),
            'orders_delivered_week' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('workflow_state', 'DELIVERED')->where('delivered_at', '>=', now()->startOfWeek());
            }),
            'orders_received_month' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('received_at', '>=', now()->startOfMonth());
            }),
            'orders_delivered_month' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->where('workflow_state', 'DELIVERED')->where('delivered_at', '>=', now()->startOfMonth());
            }),
            'total_pending' => Order::countAcrossProjects($allProjectIds->toArray(), function($q) {
                $q->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED']);
            }),
            // Overtime/Productivity Analysis per CEO requirements
            'standard_shift_hours' => $standardShiftHours,
            'staff_with_overtime' => $usersWithOvertime,
            'staff_under_target' => $usersUnderTarget,
            'target_hit_rate' => $targetHitRate,
            'staff_achieved_target' => $totalTargetAchieved,
            'staff_with_targets' => $totalStaffWithTargets,
        ];

        // Team-wise output analysis
        $teams = \App\Models\Team::with(['project:id,name,code,country,department'])
            ->where('is_active', true)
            ->get();
        
        $teamDeliveredToday = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->whereNotNull('team_id')
              ->where('workflow_state', 'DELIVERED')
              ->where('delivered_at', '>=', today()->startOfDay())
              ->where('delivered_at', '<', today()->addDay()->startOfDay())
              ->selectRaw('team_id, COUNT(*) as cnt')
              ->groupBy('team_id');
        })->pluck('cnt', 'team_id');
        
        $teamPending = Order::queryAcrossProjects($allProjectIds->toArray(), function($q) {
            $q->whereNotNull('team_id')
              ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
              ->selectRaw('team_id, COUNT(*) as cnt')
              ->groupBy('team_id');
        })->pluck('cnt', 'team_id');
        
        $teamOutput = $teams->map(function ($team) use ($teamDeliveredToday, $teamPending, $allStaff) {
            $teamStaff = $allStaff->where('team_id', $team->id);
            $activeTeamStaff = $teamStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)));
            $delivered = $teamDeliveredToday->get($team->id, 0);
            $pending = $teamPending->get($team->id, 0);
            
            return [
                'id' => $team->id,
                'name' => $team->name,
                'project_code' => $team->project->code ?? '-',
                'project_name' => $team->project->name ?? '-',
                'country' => $team->project->country ?? '-',
                'department' => $team->project->department ?? '-',
                'staff_count' => $teamStaff->count(),
                'active_staff' => $activeTeamStaff->count(),
                'delivered_today' => $delivered,
                'pending' => $pending,
                'efficiency' => $teamStaff->count() > 0 ? round($delivered / max($teamStaff->count(), 1), 1) : 0,
            ];
        })->sortByDesc('delivered_today')->values();

        return response()->json([
            'org_totals' => $orgTotals,
            'countries' => $summary,
            'teams' => $teamOutput,
        ]);
    }

    /**
     * GET /dashboard/project/{id}
     * Project dashboard: queue health, staffing, performance.
     */
    public function project(Request $request, int $id)
    {
        $user = $request->user();
        $project = Project::findOrFail($id);

        // Access control: verify user can view this project
        if (!in_array($user->role, ['ceo', 'director'])) {
            $allowedProjectIds = $user->getManagedProjectIds();
            if (!in_array($id, $allowedProjectIds)) {
                return response()->json(['message' => 'Access denied: you do not have access to this project.'], 403);
            }
        }

        $workflowType = $project->workflow_type ?? 'FP_3_LAYER';
        $states = $workflowType === 'PH_2_LAYER' ? StateMachine::PH_STATES : StateMachine::FP_STATES;

        // Queue health: counts per state
        $stateCounts = [];
        foreach ($states as $state) {
            $stateCounts[$state] = Order::forProject($id)
                ->where('workflow_state', $state)->count();
        }

        // Staffing
        $stages = StateMachine::getStages($workflowType);
        $staffing = [];
        foreach ($stages as $stage) {
            $role = StateMachine::STAGE_TO_ROLE[$stage];
            $users = User::where('project_id', $id)->where('role', $role)->get();
            $staffing[$stage] = [
                'required' => $users->count(),
                'active' => $users->where('is_active', true)->where('is_absent', false)->count(),
                'absent' => $users->where('is_absent', true)->count(),
                'online' => $users->filter(fn($u) => $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
            ];
        }

        // Performance: per role completion and target hit rate
        $performance = [];
        foreach ($stages as $stage) {
            $role = StateMachine::STAGE_TO_ROLE[$stage];
            $users = User::where('project_id', $id)->where('role', $role)->where('is_active', true)->get();
            $totalTarget = $users->sum('daily_target');
            $totalCompleted = WorkItem::where('project_id', $id)
                ->where('stage', $stage)
                ->where('status', 'completed')
                ->whereDate('completed_at', today())
                ->count();

            $performance[$stage] = [
                'today_completed' => $totalCompleted,
                'total_target' => $totalTarget,
                'hit_rate' => $totalTarget > 0 ? round(($totalCompleted / $totalTarget) * 100, 1) : 0,
            ];
        }

        // SLA breaches
        $slaBreaches = Order::forProject($id)
            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        // Production Statistics (all-time + today)
        $totalOrders = Order::forProject($id)->count();
        $completedOrders = Order::forProject($id)->where('workflow_state', 'DELIVERED')->count();
        $pendingOrders = Order::forProject($id)
            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count();

        // Team statistics
        $allTeams = \App\Models\Team::where('project_id', $id)->get();
        $activeTeams = $allTeams->where('is_active', true)->count();
        $totalTeams = $allTeams->count();

        // Staff statistics
        $allProjectStaff = User::where('project_id', $id)->where('is_active', true)->get();
        $totalStaff = $allProjectStaff->count();
        $activeStaff = $allProjectStaff->where('is_absent', false)
            ->filter(fn($u) => $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count();
        $absentStaff = $allProjectStaff->where('is_absent', true)->count();

        // Daily Absentee list
        $absentees = User::where('project_id', $id)
            ->where('is_active', true)
            ->where('is_absent', true)
            ->select('id', 'name', 'email', 'role', 'team_id')
            ->with('team:id,name')
            ->get();

        // Shift & Overtime Analysis (9-hour shift)
        $shiftHours = 9;
        $workItemsToday = WorkItem::where('project_id', $id)
            ->where('status', 'completed')
            ->whereDate('completed_at', today())
            ->selectRaw('assigned_user_id, COUNT(*) as completed')
            ->groupBy('assigned_user_id')
            ->get()
            ->keyBy('assigned_user_id');

        $overtimeWorkers = 0;
        $undertimeWorkers = 0;
        $targetAchieved = 0;
        $targetMissed = 0;

        foreach ($allProjectStaff->where('is_absent', false) as $staff) {
            $completed = $workItemsToday->get($staff->id)?->completed ?? 0;
            $target = $staff->daily_target ?? 0;
            
            if ($target > 0) {
                if ($completed >= $target) {
                    $targetAchieved++;
                    if ($completed > $target * 1.2) {
                        $overtimeWorkers++;
                    }
                } else {
                    $targetMissed++;
                    if ($completed < $target * 0.8) {
                        $undertimeWorkers++;
                    }
                }
            }
        }

        return response()->json([
            'project' => $project,
            // Queue health per state
            'state_counts' => $stateCounts,
            // Staffing per layer
            'staffing' => $staffing,
            // Performance per layer
            'performance' => $performance,
            // Production stats
            'production' => [
                'total_orders' => $totalOrders,
                'completed_orders' => $completedOrders,
                'pending_orders' => $pendingOrders,
                'received_today' => Order::forProject($id)
                    ->where('received_at', '>=', today()->startOfDay())
                    ->where('received_at', '<', today()->addDay()->startOfDay())->count(),
                'delivered_today' => Order::forProject($id)
                    ->where('workflow_state', 'DELIVERED')
                    ->where('delivered_at', '>=', today()->startOfDay())
                    ->where('delivered_at', '<', today()->addDay()->startOfDay())->count(),
                'sla_breaches' => $slaBreaches,
                'on_hold' => Order::forProject($id)->where('workflow_state', 'ON_HOLD')->count(),
            ],
            // Team stats
            'teams' => [
                'total' => $totalTeams,
                'active' => $activeTeams,
            ],
            // Staff overview
            'staff' => [
                'total' => $totalStaff,
                'active' => $activeStaff,
                'absent' => $absentStaff,
            ],
            // Daily absentees
            'absentees' => $absentees,
            // Shift & performance analysis
            'shift_analysis' => [
                'shift_hours' => $shiftHours,
                'overtime_workers' => $overtimeWorkers,
                'undertime_workers' => $undertimeWorkers,
                'target_achieved' => $targetAchieved,
                'target_missed' => $targetMissed,
            ],
        ]);
    }

    /**
     * GET /dashboard/operations
     * Ops Manager: assigned projects overview.
     */
    public function operations(Request $request)
    {
        $t0 = microtime(true);
        $user = $request->user();

        if (!in_array($user->role, ['ceo', 'director', 'operations_manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // ─── CACHE LAYER (20s TTL — Smart Polling checks every 10s) ──
        $cacheKey = 'ops_dashboard_' . $user->id;
        $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
        if ($cached) {
            $ms = round((microtime(true) - $t0) * 1000);
            return response($cached, 200, [
                'Content-Type' => 'application/json',
                'Server-Timing' => "total;dur={$ms}",
            ]);
        }

        // Get projects based on role
        if ($user->role === 'operations_manager') {
            $projectIds = $user->getManagedProjectIds();
            $projects = Project::whereIn('id', $projectIds)->where('status', 'active')->get();
        } else {
            // CEO/Director — see all (or country-scoped)
            $projects = Project::where('status', 'active')->get();
        }

        $projectIds = $projects->pluck('id');
        $projectIdsArray = $projectIds->toArray();

        // ─── BULK LOADS (minimize table scans) ──────────────────────

        // Reusable date boundaries
        $todayStart = today()->startOfDay();
        $tomorrowStart = today()->addDay()->startOfDay();
        $weekStart = now()->subDays(6)->startOfDay();

        // 1. All staff once (replaces per-project User::where + later allStaff re-query)
        $allStaff = User::whereIn('project_id', $projectIds)
            ->where('is_active', true)->get();
        $staffByProject = $allStaff->groupBy('project_id');

        // 2. Today's completions — single query on WorkItem (small table)
        $todayCompletions = WorkItem::where('completed_at', '>=', $todayStart)
            ->where('completed_at', '<', $tomorrowStart)
            ->where('status', 'completed')
            ->selectRaw('assigned_user_id, COUNT(*) as cnt')
            ->groupBy('assigned_user_id')
            ->pluck('cnt', 'assigned_user_id');

        // 3. State counts — SPLIT into 2 fast queries (avoids CASE WHEN table lookups)
        //    Query A: Simple GROUP BY workflow_state (uses workflow_state index, ~300ms)
        $allStateCounts = Order::queryAcrossProjects($projectIdsArray, function($q) {
            $q->selectRaw('project_id, workflow_state, COUNT(*) as cnt')
              ->groupBy('project_id', 'workflow_state');
        })->groupBy('project_id');

        //    Query B: Delivered today count (uses idx_delivered_at, ~5ms)
        $deliveredTodayByProject = Order::queryAcrossProjects($projectIdsArray, function($q) use ($todayStart, $tomorrowStart) {
            $q->where('workflow_state', 'DELIVERED')
              ->where('delivered_at', '>=', $todayStart)
              ->where('delivered_at', '<', $tomorrowStart)
              ->selectRaw('project_id, COUNT(*) as cnt')
              ->groupBy('project_id');
        })->pluck('cnt', 'project_id');

        // 4. Worker assigned counts — batch GROUP BY (single scan per table)
        $workerAssignedCounts = Order::queryAcrossProjects($projectIdsArray, function($q) {
            $q->whereNotNull('assigned_to')
              ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
              ->selectRaw('assigned_to, COUNT(*) as cnt')
              ->groupBy('assigned_to');
        })->pluck('cnt', 'assigned_to');

        // 5. Team stats — SPLIT into 2 queries (avoids CASE WHEN on delivered_at)
        //    Query A: Team pending counts (uses workflow_state index)
        $teamPendingStats = Order::queryAcrossProjects($projectIdsArray, function($q) {
            $q->whereNotNull('team_id')
              ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
              ->selectRaw('team_id, COUNT(*) as pending')
              ->groupBy('team_id');
        });

        //    Query B: Team delivered today (uses idx_delivered_at, very fast)
        $teamDeliveredStats = Order::queryAcrossProjects($projectIdsArray, function($q) use ($todayStart, $tomorrowStart) {
            $q->whereNotNull('team_id')
              ->where('workflow_state', 'DELIVERED')
              ->where('delivered_at', '>=', $todayStart)
              ->where('delivered_at', '<', $tomorrowStart)
              ->selectRaw('team_id, COUNT(*) as delivered_today')
              ->groupBy('team_id');
        });

        // ─── BUILD PROJECT DATA (zero individual queries) ───────────

        $totalPending = 0;
        $totalDeliveredToday = 0;

        $data = $projects->map(function ($project) use (
            $staffByProject, $todayCompletions, $allStateCounts,
            $deliveredTodayByProject, &$totalPending, &$totalDeliveredToday
        ) {
            $staff = $staffByProject->get($project->id, collect());
            $activeStaff = $staff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count();

            // State counts from bulk-loaded data (no queries!)
            $projectStates = $allStateCounts->get($project->id, collect());
            $stateCountsMap = $projectStates->pluck('cnt', 'workflow_state');

            // Pending = everything except DELIVERED and CANCELLED
            $pending = $stateCountsMap->except(['DELIVERED', 'CANCELLED'])->sum();
            $deliveredToday = (int) ($deliveredTodayByProject[$project->id] ?? 0);

            $totalPending += $pending;
            $totalDeliveredToday += $deliveredToday;

            // Queue health — filter to relevant workflow states
            $workflowType = $project->workflow_type ?? 'FP_3_LAYER';
            $states = $workflowType === 'PH_2_LAYER' ? StateMachine::PH_STATES : StateMachine::FP_STATES;
            $stateCounts = [];
            foreach ($states as $state) {
                $count = (int) ($stateCountsMap[$state] ?? 0);
                if ($count > 0) {
                    $stateCounts[$state] = $count;
                }
            }

            // Staffing details
            $staffDetails = $staff->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'role' => $s->role,
                'is_online' => $s->last_activity && $s->last_activity->gt(now()->subMinutes(15)),
                'is_absent' => $s->is_absent,
                'wip_count' => $s->wip_count,
                'assignment_score' => round((float) $s->assignment_score, 2),
                'today_completed' => $todayCompletions->get($s->id, 0),
            ]);

            return [
                'project' => $project->only(['id', 'code', 'name', 'country', 'department', 'workflow_type', 'queue_name']),
                'pending' => $pending,
                'delivered_today' => $deliveredToday,
                'total_staff' => $staff->count(),
                'active_staff' => $activeStaff,
                'queue_health' => [
                    'stages' => $stateCounts,
                    'staffing' => $staffDetails,
                ],
            ];
        });

        // Totals computed from bulk-loaded data — NO redundant re-queries
        $totalActiveStaff = $allStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count();
        $totalAbsent = $allStaff->where('is_absent', true)->count();
        // $totalPending and $totalDeliveredToday already accumulated in the project loop above

        // Role-wise completion statistics — only roles relevant to the OM's projects
        $roleStats = [];
        $projectWorkflowTypes = $projects->pluck('workflow_type')->unique();
        $relevantRoles = [];
        if ($projectWorkflowTypes->contains('FP_3_LAYER') || $projectWorkflowTypes->contains(null)) {
            $relevantRoles = array_merge($relevantRoles, ['drawer', 'checker', 'qa']);
        }
        if ($projectWorkflowTypes->contains('PH_2_LAYER')) {
            $relevantRoles = array_merge($relevantRoles, ['designer', 'qa']);
        }
        $roles = array_unique($relevantRoles);
        foreach ($roles as $role) {
            $roleUsers = $allStaff->where('role', $role);
            $roleUserIds = $roleUsers->pluck('id');
            $roleStats[$role] = [
                'total_staff' => $roleUsers->count(),
                'active' => $roleUsers->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
                'absent' => $roleUsers->where('is_absent', true)->count(),
                'today_completed' => $roleUserIds->sum(fn($uid) => $todayCompletions->get($uid, 0)),
                'total_wip' => $roleUsers->sum('wip_count'),
            ];
        }

        // Date-wise statistics (last 7 days) — bulk load
        $allStaffIds = $allStaff->pluck('id');
        $roleUserIds = [];
        foreach ($roles as $role) {
            $roleUserIds[$role] = $allStaff->where('role', $role)->pluck('id');
        }

        $weekCompletions = WorkItem::whereIn('assigned_user_id', $allStaffIds)
            ->where('status', 'completed')
            ->where('completed_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('assigned_user_id, DATE(completed_at) as completed_date, COUNT(*) as cnt')
            ->groupBy('assigned_user_id', 'completed_date')
            ->get()
            ->groupBy('completed_date');

        $weekReceived = Order::queryAcrossProjects($projectIds->toArray(), function($q) {
            $q->where('received_at', '>=', now()->subDays(6)->startOfDay())
              ->selectRaw('DATE(received_at) as the_date, COUNT(*) as cnt')
              ->groupBy('the_date');
        });
        // Merge counts for same dates across projects
        $weekReceivedMerged = $weekReceived->groupBy('the_date')->map(fn($items) => $items->sum('cnt'));

        $weekDelivered = Order::queryAcrossProjects($projectIds->toArray(), function($q) {
            $q->where('workflow_state', 'DELIVERED')
              ->where('delivered_at', '>=', now()->subDays(6)->startOfDay())
              ->selectRaw('DATE(delivered_at) as the_date, COUNT(*) as cnt')
              ->groupBy('the_date');
        });
        $weekDeliveredMerged = $weekDelivered->groupBy('the_date')->map(fn($items) => $items->sum('cnt'));

        $dateStats = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $dateLabel = now()->subDays($i)->format('D');
            
            $dayItems = $weekCompletions->get($date, collect());
            $roleCompletions = [];
            foreach ($roles as $role) {
                $roleCompletions[$role] = $dayItems->whereIn('assigned_user_id', $roleUserIds[$role])->sum('cnt');
            }
            
            $dateStats[] = [
                'date' => $date,
                'label' => $dateLabel,
                'received' => $weekReceivedMerged->get($date, 0),
                'delivered' => $weekDeliveredMerged->get($date, 0),
                'by_role' => $roleCompletions,
            ];
        }

        // Absentees detail
        $absentees = $allStaff->where('is_absent', true)->map(fn($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'role' => $u->role,
            'project_name' => $projects->firstWhere('id', $u->project_id)?->name,
        ])->values();

        // Workers list — uses bulk-loaded assigned counts (no N+1 queries)
        $workers = $allStaff->map(function ($u) use ($todayCompletions, $workerAssignedCounts) {
            $assignedWork = (int) ($workerAssignedCounts[$u->id] ?? 0);
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'project_id' => $u->project_id,
                'is_active' => $u->is_active,
                'is_absent' => $u->is_absent,
                'wip_count' => $u->wip_count,
                'assignment_score' => round((float) $u->assignment_score, 2),
                'today_completed' => $todayCompletions->get($u->id, 0),
                'assigned_work' => $assignedWork,
                'pending_work' => max(0, $assignedWork - $u->wip_count),
                'last_activity' => $u->last_activity,
                'is_online' => $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)),
            ];
        })->values();

        // Team-wise Performance — uses bulk-loaded teamStats (no extra queries)
        $teams = \App\Models\Team::whereIn('project_id', $projectIds)
            ->with(['project:id,name,code', 'qaLead:id,name'])
            ->where('is_active', true)
            ->get();

        // Derive team delivered/pending from the split team queries
        $teamDeliveredToday = collect();
        $teamPending = collect();
        foreach ($teamDeliveredStats as $row) {
            $teamDeliveredToday[$row->team_id] = ($teamDeliveredToday[$row->team_id] ?? 0) + (int) $row->delivered_today;
        }
        foreach ($teamPendingStats as $row) {
            $teamPending[$row->team_id] = ($teamPending[$row->team_id] ?? 0) + (int) $row->pending;
        }

        $teamPerformance = $teams->map(function ($team) use ($teamDeliveredToday, $teamPending, $allStaff, $todayCompletions) {
            $teamStaff = $allStaff->where('team_id', $team->id);
            $activeTeamStaff = $teamStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)));
            $teamStaffIds = $teamStaff->pluck('id');
            $teamTodayCompleted = $teamStaffIds->sum(fn($uid) => $todayCompletions->get($uid, 0));
            
            return [
                'id' => $team->id,
                'name' => $team->name,
                'project_code' => $team->project->code ?? '-',
                'qa_lead' => $team->qaLead?->name ?? 'Unassigned',
                'staff_count' => $teamStaff->count(),
                'active_staff' => $activeTeamStaff->count(),
                'absent_staff' => $teamStaff->where('is_absent', true)->count(),
                'delivered_today' => $teamDeliveredToday->get($team->id, 0),
                'pending' => $teamPending->get($team->id, 0),
                'today_completed' => $teamTodayCompleted,
                'efficiency' => $teamStaff->count() > 0 ? round($teamTodayCompleted / max($teamStaff->count(), 1), 1) : 0,
            ];
        })->sortByDesc('delivered_today')->values();

        // Project managers (scoped to requesting user's projects for OM visibility)
        $pmQuery = User::where('role', 'project_manager')
            ->where('is_active', true)
            ->with('managedProjects:id,code,name');

        // For OM: only show PMs assigned to the OM's projects
        if ($user->role === 'operations_manager') {
            $pmQuery->whereHas('managedProjects', function ($q) use ($projectIds) {
                $q->whereIn('projects.id', $projectIds);
            });
        }

        $projectManagers = $pmQuery->get()
            ->map(fn($pm) => [
                'id' => $pm->id,
                'name' => $pm->name,
                'email' => $pm->email,
                'projects' => $pm->managedProjects->map(fn($p) => ['id' => $p->id, 'code' => $p->code, 'name' => $p->name]),
            ])->values();

        $responseData = [
            'projects' => $data,
            'total_active_staff' => $totalActiveStaff,
            'total_absent' => $totalAbsent,
            'total_pending' => $totalPending,
            'total_delivered_today' => $totalDeliveredToday,
            'role_stats' => $roleStats,
            'date_stats' => $dateStats,
            'absentees' => $absentees,
            'workers' => $workers,
            'team_performance' => $teamPerformance,
            'project_managers' => $projectManagers,
        ];

        // Cache as JSON string to avoid serialization issues with Collections
        $json = json_encode($responseData);
        if ($json) {
            \Illuminate\Support\Facades\Cache::put($cacheKey, $json, 20);
        }

        $ms = round((microtime(true) - $t0) * 1000);
        return response($json, 200, [
            'Content-Type' => 'application/json',
            'Server-Timing' => "total;dur={$ms}",
        ]);
    }

    /**
     * GET /dashboard/worker
     * Worker's personal dashboard.
     */
    public function worker(Request $request)
    {
        $user = $request->user();

        // Only production workers should access this endpoint
        if (!in_array($user->role, ['drawer', 'checker', 'qa', 'designer'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $currentOrder = null;
        if ($user->project_id) {
            // Primary: check by assigned_to (new system)
            $currentOrder = Order::forProject($user->project_id)
                ->where('assigned_to', $user->id)
                ->whereIn('workflow_state', ['IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN'])
                ->with('project:id,name,code')
                ->first();

            // Fallback: check by role-specific ID column + legacy states
            if (!$currentOrder) {
                $legacyStateMap = ['drawer' => 'DRAW', 'checker' => 'CHECK', 'qa' => 'QA', 'designer' => 'DESIGN'];
                $idColMap = ['drawer' => 'drawer_id', 'checker' => 'checker_id', 'qa' => 'qa_id', 'designer' => 'drawer_id'];
                $doneColMap = ['drawer' => 'drawer_done', 'checker' => 'checker_done', 'qa' => 'final_upload', 'designer' => 'drawer_done'];
                $legacyState = $legacyStateMap[$user->role] ?? null;
                $idCol = $idColMap[$user->role] ?? null;
                $doneCol = $doneColMap[$user->role] ?? null;

                if ($legacyState && $idCol) {
                    $inState = ['drawer' => 'IN_DRAW', 'checker' => 'IN_CHECK', 'qa' => 'IN_QA', 'designer' => 'IN_DESIGN'][$user->role];
                    // Include legacy state + for drawers also RECEIVED/PENDING_QA_REVIEW/REJECTED states
                    $validStates = [$inState, $legacyState];
                    if ($user->role === 'drawer') {
                        $validStates = array_merge($validStates, ['RECEIVED', 'PENDING_QA_REVIEW', 'REJECTED_BY_CHECK', 'REJECTED_BY_QA']);
                    }
                    $currentOrder = Order::forProject($user->project_id)
                        ->where($idCol, $user->id)
                        ->whereIn('workflow_state', $validStates)
                        ->where(function ($q) use ($doneCol) {
                            $q->whereNull($doneCol)
                              ->orWhere($doneCol, '')
                              ->orWhere($doneCol, 'no');
                        })
                        ->with('project:id,name,code')
                        ->first();
                }
            }
        }

        $todayCompleted = WorkItem::where('assigned_user_id', $user->id)
            ->where('status', 'completed')
            ->whereDate('completed_at', today())
            ->count();

        // Fallback: count from project table (Metro-synced orders)
        if ($todayCompleted === 0 && $user->project_id) {
            $table = ProjectOrderService::getTableName($user->project_id);
            if (Schema::hasTable($table)) {
                [$idCol, $doneCol, , $dateCol] = self::getWorkerRoleColumns($user->role);
                if ($idCol && $doneCol) {
                    $todayCompleted = DB::table($table)
                        ->where($idCol, $user->id)
                        ->where($doneCol, 'yes')
                        ->whereDate($dateCol, today())
                        ->count();
                }
            }
        }

        $queueCount = 0;
        if ($user->project_id) {
            $project = $user->project;
            if ($project) {
                // Count new-system QUEUED_* states
                $queueStates = StateMachine::getQueuedStates($project->workflow_type ?? 'FP_3_LAYER');
                foreach ($queueStates as $state) {
                    $role = StateMachine::getRoleForState($state);
                    if ($role === $user->role) {
                        $queueCount += Order::forProject($user->project_id)
                            ->where('workflow_state', $state)->count();
                    }
                }

                // Also count legacy states (DRAW, CHECK, QA) assigned to this user
                $legacyStateMap = ['drawer' => 'DRAW', 'checker' => 'CHECK', 'qa' => 'QA', 'designer' => 'DESIGN'];
                $idColMap = ['drawer' => 'drawer_id', 'checker' => 'checker_id', 'qa' => 'qa_id', 'designer' => 'drawer_id'];
                $doneColMap = ['drawer' => 'drawer_done', 'checker' => 'checker_done', 'qa' => 'final_upload', 'designer' => 'drawer_done'];
                $legacyState = $legacyStateMap[$user->role] ?? null;
                $idCol = $idColMap[$user->role] ?? null;
                $doneCol = $doneColMap[$user->role] ?? null;
                if ($legacyState && $idCol) {
                    // Include legacy state + for drawers also RECEIVED/PENDING_QA_REVIEW/REJECTED states
                    $countStates = [$legacyState];
                    if ($user->role === 'drawer') {
                        $countStates = array_merge($countStates, ['RECEIVED', 'PENDING_QA_REVIEW', 'REJECTED_BY_CHECK', 'REJECTED_BY_QA']);
                    }
                    $queueCount += Order::forProject($user->project_id)
                        ->whereIn('workflow_state', $countStates)
                        ->where($idCol, $user->id)
                        ->where(function ($q) use ($doneCol) {
                            $q->whereNull($doneCol)
                              ->orWhere($doneCol, '')
                              ->orWhere($doneCol, 'no');
                        })
                        ->count();
                }
            }
        }

        return response()->json([
            'current_order' => $currentOrder,
            'today_completed' => $todayCompleted,
            'daily_target' => $user->daily_target ?? 0,
            'target_progress' => $user->daily_target > 0
                ? round(($todayCompleted / $user->daily_target) * 100, 1)
                : 0,
            'queue_count' => $queueCount,
            'wip_count' => $user->wip_count,
        ]);
    }

    /**
     * GET /dashboard/absentees
     * List all absentees (org-wide or project-scoped).
     * Includes daily absentee statistics per CEO requirements.
     */
    public function absentees(Request $request)
    {
        $user = $request->user();
        $query = User::where('is_active', true)->where('is_absent', true);

        if (!in_array($user->role, ['ceo', 'director'])) {
            // OM/PM: scope to their assigned projects via pivot tables
            $managedProjectIds = $user->getManagedProjectIds();
            if (!empty($managedProjectIds)) {
                $query->whereIn('project_id', $managedProjectIds);
            } elseif ($user->project_id) {
                $query->where('project_id', $user->project_id);
            } else {
                // No project access — return empty
                $query->whereRaw('1 = 0');
            }
        }

        $absentees = $query->with(['project:id,name,code,country,department', 'team:id,name'])
            ->get([
                'id', 'name', 'email', 'role', 'project_id', 'team_id', 
                'last_activity', 'inactive_days',
            ]);

        // Group by country for CEO view
        $byCountry = $absentees->groupBy(fn($u) => $u->project?->country ?? 'Unassigned');
        $byDepartment = $absentees->groupBy(fn($u) => $u->project?->department ?? 'Unassigned');
        $byRole = $absentees->groupBy('role');

        return response()->json([
            'total' => $absentees->count(),
            'by_country' => $byCountry->map->count(),
            'by_department' => $byDepartment->map->count(),
            'by_role' => $byRole->map->count(),
            'absentees' => $absentees,
        ]);
    }

    /**
     * GET /dashboard/daily-operations
     * CEO Daily Operations View - All projects with layer-wise worker activity and QA metrics.
     * Shows Drawer/Designer → Checker → QA work per project for a specific date.
     * Cached for 5 minutes to reduce database load.
     */
    public function dailyOperations(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['ceo', 'director', 'operations_manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $date = $request->get('date', today()->format('Y-m-d'));
        
        // Validate date format
        try {
            $dateObj = \Carbon\Carbon::parse($date);
            
            // Don't allow future dates
            if ($dateObj->isFuture()) {
                return response()->json(['message' => 'Cannot view future dates'], 400);
            }
            
            // Don't allow dates too far in the past (optional: 1 year limit)
            if ($dateObj->lt(now()->subYear())) {
                return response()->json(['message' => 'Date too far in the past'], 400);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Invalid date format'], 400);
        }
        
        // Audit log - track CEO viewing sensitive business data
        \App\Models\ActivityLog::log(
            'view_daily_operations',
            'Dashboard',
            null,
            ['date' => $date]
        );

        // view_mode: 'stage' (default) = each stage counted by its own done time
        //            'unified' = count Drawer/Checker by QA done time (all stages on same day)
        $viewMode = $request->get('view_mode', 'stage');

        // Scope projects for OM
        $scopedProjectIds = null;
        if ($user->role === 'operations_manager') {
            $scopedProjectIds = $user->getManagedProjectIds();
        }

        // Cache for 5 minutes (role-scoped + view-mode-scoped)
        $cacheKey = "daily_operations_{$date}_{$viewMode}" . ($scopedProjectIds ? '_om_' . $user->id : '');
        $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($dateObj, $scopedProjectIds, $viewMode) {
            return $this->generateDailyOperationsData($dateObj, $scopedProjectIds, $viewMode);
        });

        return response()->json($data);
    }

    /**
     * Internal: Generate daily operations data.
     * Uses direct per-project table queries for Metro compatibility
     * (WorkItems table may be empty, project_id column may differ from actual project ID).
     */
    private function generateDailyOperationsData(\Carbon\Carbon $dateObj, ?array $scopedProjectIds = null, string $viewMode = 'stage')
    {
        // Get active projects (scoped for OM, all for CEO/Director)
        $query = Project::where('status', 'active')
            ->orderBy('country')
            ->orderBy('department')
            ->orderBy('code');

        if ($scopedProjectIds !== null) {
            $query->whereIn('id', $scopedProjectIds);
        }

        $projects = $query->get();
        $projectsData = [];

        // Column map: stage → [date_col, id_col, name_col] in per-project order tables
        // IMPORTANT: ausFinaldate is stored in Australian AEDT (UTC+11), while
        // drawer_date/checker_date are in Pakistan PKT (UTC+5). Offset = 6h.
        // We normalize ausFinaldate → PKT by subtracting 6 hours in queries.
        $layerColumnMap = [
            'DRAW'   => ['date_col' => 'drawer_date',   'id_col' => 'drawer_id',  'name_col' => 'drawer_name',  'tz_offset' => 0],
            'CHECK'  => ['date_col' => 'checker_date',  'id_col' => 'checker_id', 'name_col' => 'checker_name', 'tz_offset' => 0],
            'QA'     => ['date_col' => 'ausFinaldate',  'id_col' => 'qa_id',      'name_col' => 'qa_name',      'tz_offset' => -6],
            'DESIGN' => ['date_col' => 'drawer_date',   'id_col' => 'drawer_id',  'name_col' => 'drawer_name',  'tz_offset' => 0],
        ];

        foreach ($projects as $project) {
            $tableName = ProjectOrderService::getTableName($project->id);
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            $workflowType = $project->workflow_type ?? 'FP_3_LAYER';
            $isFloorPlan  = $workflowType === 'FP_3_LAYER';

            // ─── RECEIVED: orders that came in on this date ──────────────────
            // Use COALESCE for Metro compat (received_at may be null, fall back to ausDatein)
            $hasAusDatein = Schema::hasColumn($tableName, 'ausDatein');
            if ($hasAusDatein) {
                $received = DB::table($tableName)
                    ->whereDate(DB::raw("COALESCE(received_at, ausDatein)"), $dateObj)
                    ->count();
            } else {
                $received = DB::table($tableName)
                    ->whereDate('received_at', $dateObj)
                    ->count();
            }

            // ─── DELIVERED: orders finalised on this date ────────────────────
            $hasAusFinal = Schema::hasColumn($tableName, 'ausFinaldate');
            $dateStr = $dateObj->format('Y-m-d');
            $deliveredQuery = DB::table($tableName)->where('workflow_state', 'DELIVERED');
            if ($hasAusFinal) {
                // Normalize ausFinaldate from AEDT to PKT (-6h) for accurate day boundary
                $deliveredQuery->where(function ($q) use ($dateStr) {
                    $q->whereRaw("DATE(delivered_at) = ?", [$dateStr])
                      ->orWhere(function ($q2) use ($dateStr) {
                          $q2->whereNull('delivered_at')
                             ->whereRaw("DATE(DATE_ADD(ausFinaldate, INTERVAL -6 HOUR)) = ?", [$dateStr]);
                      });
                });
            } else {
                $deliveredQuery->whereDate('delivered_at', $dateObj);
            }
            $delivered = $deliveredQuery->count();

            // ─── PENDING ─────────────────────────────────────────────────────
            $pending = DB::table($tableName)
                ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                ->count();

            // ─── LAYER WORK (DRAW / CHECK / QA) ─────────────────────────────
            // Try WorkItems first; fall back to project-table date columns
            $workItems = WorkItem::where('project_id', $project->id)
                ->where('status', 'completed')
                ->whereDate('completed_at', $dateObj)
                ->with(['assignedUser:id,name,email,role', 'order:id,order_number,project_id'])
                ->get();

            $stages    = $isFloorPlan ? ['DRAW', 'CHECK', 'QA'] : ['DESIGN', 'QA'];
            $layerWork = [];

            // In unified mode, Drawer/Checker are counted by QA done date (ausFinaldate)
            // so all 3 stages appear on the same day the order was QA-approved.
            $unifiedMode = $viewMode === 'unified';

            if ($workItems->isNotEmpty()) {
                // ── Standard path: WorkItem records exist ──
                foreach ($stages as $stage) {
                    $stageItems = $workItems->where('stage', $stage);
                    $workers = $stageItems->groupBy('assigned_user_id')->map(function ($items) {
                        $user = $items->first()->assignedUser;
                        return [
                            'id'        => $user?->id,
                            'name'      => $user?->name ?? 'Unknown',
                            'completed' => $items->count(),
                            'orders'    => $items->pluck('order.order_number')->filter()->unique()->take(15)->values(),
                            'has_more'  => $items->pluck('order.order_number')->filter()->unique()->count() > 15,
                        ];
                    })->values();

                    $layerWork[$stage] = ['total' => $stageItems->count(), 'workers' => $workers];
                }
            } else {
                // ── Fallback: query project table date columns (Metro data) ──
                foreach ($stages as $stage) {
                    $map = $layerColumnMap[$stage] ?? null;
                    if (!$map || !Schema::hasColumn($tableName, $map['date_col'])) {
                        $layerWork[$stage] = ['total' => 0, 'workers' => []];
                        continue;
                    }

                    // In unified mode, Drawer and Checker use QA done date (ausFinaldate) 
                    // so all stages are counted on the same day the order was QA-approved
                    if ($unifiedMode && in_array($stage, ['DRAW', 'CHECK', 'DESIGN']) && $hasAusFinal) {
                        $dateCol = 'ausFinaldate';
                        $tzOffset = -6; // AEDT → PKT
                    } else {
                        // Apply timezone normalization (ausFinaldate is AEDT, needs -6h to match PKT)
                        $dateCol = $map['date_col'];
                        $tzOffset = $map['tz_offset'] ?? 0;
                    }

                    if ($tzOffset !== 0) {
                        $dateExpr = DB::raw("DATE(DATE_ADD({$dateCol}, INTERVAL {$tzOffset} HOUR))");
                    } else {
                        $dateExpr = DB::raw("DATE({$dateCol})");
                    }

                    // In unified mode for DRAW/CHECK, also require the stage work to be done
                    $stageQuery = DB::table($tableName)->where($dateExpr, $dateObj->format('Y-m-d'));
                    if ($unifiedMode && $stage === 'DRAW') {
                        $stageQuery->where('drawer_done', 'yes');
                    } elseif ($unifiedMode && $stage === 'CHECK') {
                        $stageQuery->where('checker_done', 'yes');
                    }

                    $total = (clone $stageQuery)->count();

                    $workers = collect();
                    if ($total > 0 && Schema::hasColumn($tableName, $map['id_col'])) {
                        // First try grouping by worker ID
                        $workerRows = (clone $stageQuery)
                            ->whereNotNull($map['id_col'])
                            ->selectRaw("{$map['id_col']} as worker_id, {$map['name_col']} as worker_name, COUNT(*) as completed, GROUP_CONCAT(order_number ORDER BY order_number SEPARATOR ',') as order_nums")
                            ->groupBy($map['id_col'], $map['name_col'])
                            ->get();

                        // Fallback: if no ID-based workers, group by name (migrated data)
                        if ($workerRows->isEmpty() && Schema::hasColumn($tableName, $map['name_col'])) {
                            $workerRows = (clone $stageQuery)
                                ->whereNotNull($map['name_col'])
                                ->where($map['name_col'], '!=', '')
                                ->selectRaw("NULL as worker_id, {$map['name_col']} as worker_name, COUNT(*) as completed, GROUP_CONCAT(order_number ORDER BY order_number SEPARATOR ',') as order_nums")
                                ->groupBy($map['name_col'])
                                ->get();
                        }

                        $workers = $workerRows->map(function ($row) {
                            $allOrders = collect(explode(',', $row->order_nums ?? ''))->filter()->unique();
                            return [
                                'id'        => $row->worker_id,
                                'name'      => $row->worker_name ?? 'Unknown',
                                'completed' => (int) $row->completed,
                                'orders'    => $allOrders->take(15)->values(),
                                'has_more'  => $allOrders->count() > 15,
                            ];
                        })->values();
                    }

                    $layerWork[$stage] = ['total' => $total, 'workers' => $workers];
                }
            }

            // ─── QA CHECKLIST / MISTAKE COMPLIANCE ───────────────────────────
            $checklistStats = [
                'total_orders'    => $delivered,
                'total_items'     => 0,
                'completed_items' => 0,
                'mistake_count'   => 0,
                'compliance_rate' => 0,
            ];

            if ($delivered > 0) {
                // Collect delivered order IDs for today
                $dlvIdQuery = DB::table($tableName)->where('workflow_state', 'DELIVERED');
                if ($hasAusFinal) {
                    $dlvIdQuery->where(function ($q) use ($dateStr) {
                        $q->whereRaw("DATE(delivered_at) = ?", [$dateStr])
                          ->orWhere(function ($q2) use ($dateStr) {
                              $q2->whereNull('delivered_at')
                                 ->whereRaw("DATE(DATE_ADD(ausFinaldate, INTERVAL -6 HOUR)) = ?", [$dateStr]);
                          });
                    });
                } else {
                    $dlvIdQuery->whereDate('delivered_at', $dateObj);
                }
                $deliveredIds = $dlvIdQuery->pluck('id');

                // Try OrderChecklist first (standard system)
                $checklists = \App\Models\OrderChecklist::whereIn('order_id', $deliveredIds)->get();

                if ($checklists->isNotEmpty()) {
                    $checklistStats['total_items']     = $checklists->count();
                    $checklistStats['completed_items']  = $checklists->where('is_checked', true)->count();
                    $checklistStats['mistake_count']    = $checklists->sum('mistake_count');
                } else {
                    // Fallback: project-specific mistake tables (Metro)
                    $totalMistakes = 0;
                    foreach (['drawer', 'checker', 'qa'] as $layer) {
                        $mt = "project_{$project->id}_{$layer}_mistake";
                        if (Schema::hasTable($mt)) {
                            $totalMistakes += DB::table($mt)
                                ->whereIn('order_id', $deliveredIds)
                                ->count();
                        }
                    }
                    $checklistStats['mistake_count']    = $totalMistakes;
                    // 7 standard checklist items per order
                    $checklistStats['total_items']      = $delivered * 7;
                    $checklistStats['completed_items']   = max(0, $checklistStats['total_items'] - $totalMistakes);
                }

                $checklistStats['compliance_rate'] = $checklistStats['total_items'] > 0
                    ? round(($checklistStats['completed_items'] / $checklistStats['total_items']) * 100, 1)
                    : 100;
            }

            $projectsData[] = [
                'id'            => $project->id,
                'code'          => $project->code,
                'name'          => $project->name,
                'country'       => $project->country,
                'department'    => $project->department,
                'workflow_type' => $workflowType,
                'received'      => $received,
                'delivered'     => $delivered,
                'pending'       => $pending,
                'layers'        => $layerWork,
                'qa_checklist'  => $checklistStats,
            ];
        }

        // Group by country for summary
        $byCountry = collect($projectsData)->groupBy('country')->map(function ($projects, $country) {
            return [
                'country'         => $country,
                'project_count'   => $projects->count(),
                'total_received'  => $projects->sum('received'),
                'total_delivered' => $projects->sum('delivered'),
                'total_pending'   => $projects->sum('pending'),
            ];
        })->values();

        // Overall totals
        $totals = [
            'projects'         => count($projectsData),
            'received'         => collect($projectsData)->sum('received'),
            'delivered'        => collect($projectsData)->sum('delivered'),
            'pending'          => collect($projectsData)->sum('pending'),
            'total_work_items' => collect($projectsData)->sum(function ($p) {
                return collect($p['layers'])->sum('total');
            }),
        ];

        return [
            'date'       => $dateObj->format('Y-m-d'),
            'view_mode'  => $viewMode,
            'view_modes' => [
                'stage'   => 'Each stage counted by its own done time',
                'unified' => 'All stages counted by QA done time (same day)',
            ],
            'totals'     => $totals,
            'by_country' => $byCountry,
            'projects'   => $projectsData,
        ];
    }

    /**
     * GET /dashboard/project-manager
     * Project Manager: see only their assigned projects, order queues, team stats & staff report.
     */
    public function projectManager(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'project_manager') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $projectIds = $user->getManagedProjectIds();
        $projects = Project::whereIn('id', $projectIds)->where('status', 'active')->get();

        if ($projects->isEmpty()) {
            return response()->json([
                'projects' => [],
                'totals' => ['total_orders' => 0, 'pending' => 0, 'delivered_today' => 0, 'in_progress' => 0],
                'staff_report' => [],
                'order_queue' => [],
            ]);
        }

        // Determine department-appropriate roles from the project's workflow_type
        // FP_3_LAYER (Floor Plan): drawer, checker, qa
        // PH_2_LAYER (Photos Enhancement): designer, qa
        $departmentRoles = [];
        foreach ($projects as $proj) {
            $wf = $proj->workflow_type ?? 'FP_3_LAYER';
            if ($wf === 'PH_2_LAYER') {
                $departmentRoles = array_merge($departmentRoles, ['designer', 'qa']);
            } else {
                $departmentRoles = array_merge($departmentRoles, ['drawer', 'checker', 'qa']);
            }
        }
        $departmentRoles = array_unique($departmentRoles);

        // Get active teams belonging to PM's projects
        $pmTeamIds = \App\Models\Team::whereIn('project_id', $projectIds)
            ->where('is_active', true)
            ->pluck('id');

        // Staff: must be in PM's project, have a worker role, AND belong to an active team
        // This prevents showing users who have project_id set but no team or wrong team
        $allStaff = User::whereIn('project_id', $projectIds)
            ->where('is_active', true)
            ->whereIn('role', $departmentRoles)
            ->whereNotNull('team_id')
            ->whereIn('team_id', $pmTeamIds)
            ->get();
        $allStaffIds = $allStaff->pluck('id');
        $todayCompletions = WorkItem::whereDate('completed_at', today())
            ->where('status', 'completed')
            ->whereIn('assigned_user_id', $allStaffIds)
            ->selectRaw('assigned_user_id, COUNT(*) as cnt')
            ->groupBy('assigned_user_id')
            ->pluck('cnt', 'assigned_user_id');

        // Per-project stats
        $projectData = $projects->map(function ($project) use ($allStaff, $todayCompletions) {
            $pending = Order::forProject($project->id)
                ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count();
            $deliveredToday = Order::forProject($project->id)
                ->where('workflow_state', 'DELIVERED')
                ->whereDate('delivered_at', today())->count();
            $inProgress = Order::forProject($project->id)
                ->whereIn('workflow_state', ['IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN'])->count();
            $totalOrders = Order::forProject($project->id)->count();

            $staff = $allStaff->where('project_id', $project->id);

            // Queue per stage
            $workflowType = $project->workflow_type ?? 'FP_3_LAYER';
            $states = $workflowType === 'PH_2_LAYER' ? StateMachine::PH_STATES : StateMachine::FP_STATES;
            $stateCounts = [];
            foreach ($states as $state) {
                $count = Order::forProject($project->id)->where('workflow_state', $state)->count();
                if ($count > 0) {
                    $stateCounts[$state] = $count;
                }
            }

            return [
                'project' => $project->only(['id', 'code', 'name', 'country', 'department', 'workflow_type']),
                'total_orders' => $totalOrders,
                'pending' => $pending,
                'delivered_today' => $deliveredToday,
                'in_progress' => $inProgress,
                'total_staff' => $staff->count(),
                'active_staff' => $staff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
                'queue_stages' => $stateCounts,
            ];
        });

        // Totals
        $totalPending = Order::countAcrossProjects($projectIds, function($q) {
            $q->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED']);
        });
        $totalDeliveredToday = Order::countAcrossProjects($projectIds, function($q) {
            $q->where('workflow_state', 'DELIVERED')->whereDate('delivered_at', today());
        });
        $totalInProgress = Order::countAcrossProjects($projectIds, function($q) {
            $q->whereIn('workflow_state', ['IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN']);
        });
        $totalOrders = Order::countAcrossProjects($projectIds, function($q) {});
        $totalReceivedToday = Order::countAcrossProjects($projectIds, function($q) {
            $q->whereDate('received_at', today());
        });

        // Staff report: work assigned, completed, pending, active per staff member
        // Pre-load project names and team names for display
        $projectNamesMap = $projects->pluck('name', 'id');
        $teamNamesMap = \App\Models\Team::whereIn('id', $pmTeamIds)->pluck('name', 'id');

        $staffReport = $allStaff->map(function ($s) use ($todayCompletions, $projectNamesMap, $teamNamesMap) {
            $assignedCount = 0;
            if ($s->project_id) {
                $assignedCount = Order::forProject($s->project_id)
                    ->where('assigned_to', $s->id)
                    ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                    ->count();
            }

            return [
                'id' => $s->id,
                'name' => $s->name,
                'email' => $s->email,
                'role' => $s->role,
                'project_id' => $s->project_id,
                'project_name' => $projectNamesMap->get($s->project_id, '—'),
                'team_id' => $s->team_id,
                'team_name' => $teamNamesMap->get($s->team_id, '—'),
                'is_online' => $s->last_activity && $s->last_activity->gt(now()->subMinutes(15)),
                'is_absent' => $s->is_absent,
                'assigned_work' => $assignedCount,
                'completed_today' => $todayCompletions->get($s->id, 0),
                'pending_work' => max(0, $assignedCount - $s->wip_count),
                'wip_count' => $s->wip_count,
                'assignment_score' => round((float) $s->assignment_score, 2),
            ];
        })->values();

        // Order queue: recently received orders not yet assigned (for PM's projects)
        $orderQueue = [];
        foreach ($projectIds as $pid) {
            $queued = Order::forProject($pid)
                ->whereNull('assigned_to')
                ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                ->orderBy('received_at', 'asc')
                ->limit(20)
                ->get(['id', 'order_number', 'project_id', 'workflow_state', 'priority', 'received_at', 'client_reference', 'address', 'due_in']);
            foreach ($queued as $o) {
                $orderQueue[] = $o;
            }
        }

        // Team performance
        $teams = \App\Models\Team::whereIn('project_id', $projectIds)
            ->with(['project:id,name,code', 'qaLead:id,name'])
            ->where('is_active', true)->get();

        $pmTeamDeliveredToday = Order::queryAcrossProjects($projectIds, function($q) {
            $q->whereNotNull('team_id')
              ->where('workflow_state', 'DELIVERED')
              ->whereDate('delivered_at', today())
              ->selectRaw('team_id, COUNT(*) as cnt')
              ->groupBy('team_id');
        })->pluck('cnt', 'team_id');

        $pmTeamPending = Order::queryAcrossProjects($projectIds, function($q) {
            $q->whereNotNull('team_id')
              ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
              ->selectRaw('team_id, COUNT(*) as cnt')
              ->groupBy('team_id');
        })->pluck('cnt', 'team_id');

        $teamPerformance = $teams->map(function ($team) use ($allStaff, $todayCompletions, $pmTeamDeliveredToday, $pmTeamPending) {
            $teamStaff = $allStaff->where('team_id', $team->id);
            $teamStaffIds = $teamStaff->pluck('id');
            $teamCompleted = $teamStaffIds->sum(fn($uid) => $todayCompletions->get($uid, 0));
            $delivered = $pmTeamDeliveredToday->get($team->id, 0);
            $pending = $pmTeamPending->get($team->id, 0);
            return [
                'id' => $team->id,
                'name' => $team->name,
                'project_code' => $team->project->code ?? '-',
                'qa_lead' => $team->qaLead?->name ?? 'Unassigned',
                'staff_count' => $teamStaff->count(),
                'active_staff' => $teamStaff->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
                'today_completed' => $teamCompleted,
                'delivered_today' => $delivered,
                'pending' => $pending,
                'efficiency' => $teamStaff->count() > 0 ? round($teamCompleted / max($teamStaff->count(), 1), 1) : 0,
            ];
        })->values();

        return response()->json([
            'projects' => $projectData,
            'totals' => [
                'total_orders' => $totalOrders,
                'pending' => $totalPending,
                'delivered_today' => $totalDeliveredToday,
                'in_progress' => $totalInProgress,
                'received_today' => $totalReceivedToday,
            ],
            'staff_report' => $staffReport,
            'order_queue' => $orderQueue,
            'team_performance' => $teamPerformance,
            'department_roles' => array_values($departmentRoles),
        ]);
    }

    /**
     * GET /dashboard/queues
     * Returns distinct queue names with their project IDs and metadata.
     */
    public function queues(Request $request)
    {
        $user = $request->user();

        $query = Project::where('status', 'active');

        // Scope by role
        if ($user->role === 'operations_manager') {
            $omProjectIds = $user->getManagedProjectIds();
            if (!empty($omProjectIds)) {
                $query->whereIn('id', $omProjectIds);
            }
        } elseif ($user->role === 'project_manager') {
            $pmProjectIds = $user->getManagedProjectIds();
            $query->whereIn('id', $pmProjectIds);
        } elseif ($user->role === 'qa' || $user->role === 'live_qa') {
            $query->where('id', $user->project_id);
        }

        $projects = $query->orderBy('queue_name')->orderBy('name')->get(['id', 'code', 'name', 'queue_name', 'country', 'department', 'workflow_type']);

        // Group by queue_name
        $queues = [];
        foreach ($projects as $p) {
            $qn = $p->queue_name ?: $p->name;
            if (!isset($queues[$qn])) {
                $queues[$qn] = [
                    'queue_name' => $qn,
                    'projects' => [],
                    'department' => $p->department,
                    'country' => $p->country,
                    'workflow_type' => $p->workflow_type,
                ];
            }
            $queues[$qn]['projects'][] = [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'country' => $p->country,
                'department' => $p->department,
                'workflow_type' => $p->workflow_type,
            ];
        }

        return response()->json(['queues' => array_values($queues)]);
    }

    /**
     * GET /dashboard/assignment/{queueName}
     * Assignment Dashboard — queue-based view combining orders from all projects in a queue.
     * The dropdown now shows queue names instead of individual projects.
     * Accessible to: project_manager, operations_manager, qa, ceo, director
     */
    public function assignmentDashboard(Request $request, string $queueName)
    {
        $user = $request->user();
        $queueName = urldecode($queueName);

        // ─── Find all projects in this queue ───
        $projects = Project::where('queue_name', $queueName)
            ->where('status', 'active')
            ->get();

        if ($projects->isEmpty()) {
            return response()->json(['message' => 'Queue not found.'], 404);
        }

        $projectIds = $projects->pluck('id')->toArray();

        // ─── Access control ───
        if (in_array($user->role, ['ceo', 'director'])) {
            // Full access
        } elseif ($user->role === 'operations_manager') {
            $omProjectIds = $user->getManagedProjectIds();
            if (!empty($omProjectIds)) {
                $projectIds = array_intersect($projectIds, $omProjectIds);
                if (empty($projectIds)) {
                    return response()->json(['message' => 'Access denied.'], 403);
                }
            }
        } elseif ($user->role === 'project_manager') {
            $pmProjectIds = $user->getManagedProjectIds();
            $projectIds = array_intersect($projectIds, $pmProjectIds);
            if (empty($projectIds)) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
        } elseif ($user->role === 'qa' || $user->role === 'live_qa') {
            if (!in_array($user->project_id, $projectIds)) {
                return response()->json(['message' => 'Access denied.'], 403);
            }
            $projectIds = [$user->project_id];
        } else {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Filter projects to only accessible ones
        $projects = $projects->whereIn('id', $projectIds)->values();
        $primaryProject = $projects->first();
        $workflowType = $primaryProject->workflow_type ?? 'FP_3_LAYER';

        // ─── 1. Workers by role (aggregated across all projects in queue) ───
        $stages = StateMachine::getStages($workflowType);
        $workers = [];
        $allWorkers = collect();
        foreach ($stages as $stage) {
            $role = StateMachine::STAGE_TO_ROLE[$stage];
            $users = User::whereIn('project_id', $projectIds)
                ->where('role', $role)
                ->where('is_active', true)
                ->get(['id', 'name', 'email', 'role', 'team_id', 'project_id', 'is_active', 'is_absent',
                        'wip_count', 'today_completed', 'last_activity', 'daily_target']);
            $workers[$role] = $users->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'team_id' => $u->team_id,
                'project_id' => $u->project_id,
                'is_active' => $u->is_active,
                'is_absent' => $u->is_absent,
                'is_online' => $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)),
                'wip_count' => $u->wip_count,
                'today_completed' => $u->today_completed,
            ])->values();
            $allWorkers = $allWorkers->merge($users);
        }

        // ─── 2. Build UNION query across all project order tables ───
        $statusFilter = $request->input('status', 'all');
        $dateFilter = $request->input('date', today()->toDateString());
        $search = $request->input('search');
        $assignedTo = $request->input('assigned_to');
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 15);

        // Selected columns
        $selectCols = 'id, order_number, project_id, client_reference, address, client_name, '
            . 'workflow_state, priority, assigned_to, '
            . 'drawer_id, drawer_name, checker_id, checker_name, qa_id, qa_name, '
            . 'dassign_time, cassign_time, drawer_done, checker_done, final_upload, '
            . 'drawer_date, checker_date, ausFinaldate, '
            . 'amend, recheck_count, is_on_hold, '
            . 'due_in, due_date, '
            . 'received_at, delivered_at, created_at';

        // Build a UNION of all project tables
        $unionQuery = $this->buildQueueUnionQuery($projectIds, $selectCols);

        $query = DB::table(DB::raw("({$unionQuery}) as queue_orders"));

        // Apply filters to the union result
        if ($statusFilter === 'pending') {
            $query->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                  ->where(function ($q) use ($workflowType) {
                      if ($workflowType === 'PH_2_LAYER') {
                          $q->where('final_upload', '!=', 'yes')
                            ->orWhereNull('final_upload');
                      } else {
                          $q->where('drawer_done', '!=', 'yes')
                            ->orWhereNull('drawer_done');
                      }
                  });
        } elseif ($statusFilter === 'completed') {
            $query->where('workflow_state', 'DELIVERED');
        } elseif ($statusFilter === 'amends') {
            $query->where('amend', 'yes');
        }

        if ($dateFilter) {
            $dateStart = \Carbon\Carbon::parse($dateFilter)->startOfDay();
            $dateEnd = \Carbon\Carbon::parse($dateFilter)->addDay()->startOfDay();
            $query->where('received_at', '>=', $dateStart)
                  ->where('received_at', '<', $dateEnd);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('client_reference', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%")
                  ->orWhere('drawer_name', 'like', "%{$search}%")
                  ->orWhere('checker_name', 'like', "%{$search}%")
                  ->orWhere('qa_name', 'like', "%{$search}%");
            });
        }

        if ($assignedTo) {
            $query->where(function ($q) use ($assignedTo) {
                $q->where('assigned_to', $assignedTo)
                  ->orWhere('drawer_id', $assignedTo)
                  ->orWhere('checker_id', $assignedTo)
                  ->orWhere('qa_id', $assignedTo);
            });
        }

        $total = (clone $query)->count();
        $orders = (clone $query)->orderByDesc('received_at')->orderByDesc('id')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // ─── 3. Counts (single aggregation query instead of 6 separate queries) ───
        $baseQ = DB::table(DB::raw("({$unionQuery}) as queue_orders"));
        if ($dateFilter) {
            $dateStart = $dateStart ?? \Carbon\Carbon::parse($dateFilter)->startOfDay();
            $dateEnd = $dateEnd ?? \Carbon\Carbon::parse($dateFilter)->addDay()->startOfDay();
            $baseQ->where('received_at', '>=', $dateStart)
                  ->where('received_at', '<', $dateEnd);
        }

        $countsRow = (clone $baseQ)->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN workflow_state NOT IN ('DELIVERED','CANCELLED') THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN workflow_state = 'DELIVERED' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN amend = 'yes' THEN 1 ELSE 0 END) as amends,
            SUM(CASE WHEN assigned_to IS NOT NULL AND workflow_state NOT IN ('DELIVERED','CANCELLED') THEN 1 ELSE 0 END) as assigned,
            SUM(CASE WHEN assigned_to IS NULL AND workflow_state NOT IN ('DELIVERED','CANCELLED') THEN 1 ELSE 0 END) as unassigned
        ")->first();

        $todayTotal = (int) ($countsRow->total ?? 0);
        $pendingCount = (int) ($countsRow->pending ?? 0);
        $completedCount = (int) ($countsRow->completed ?? 0);
        $amendsCount = (int) ($countsRow->amends ?? 0);
        $assignedCount = (int) ($countsRow->assigned ?? 0);
        $unassignedCount = (int) ($countsRow->unassigned ?? 0);

        // ─── 4. Date-wise summary (last 7 days) — 2 bulk queries instead of 42+ ───
        $sevenDaysAgo = today()->subDays(6)->toDateString();

        // Received stats by date — single query with conditional aggregation
        $receivedByDate = DB::table(DB::raw("({$unionQuery}) as queue_orders"))
            ->where('received_at', '>=', $sevenDaysAgo)
            ->selectRaw("
                DATE(received_at) as the_date,
                SUM(CASE WHEN priority IN ('urgent','high') THEN 1 ELSE 0 END) as high_count,
                SUM(CASE WHEN priority IN ('normal','low') THEN 1 ELSE 0 END) as regular_count,
                SUM(CASE WHEN drawer_done = 'yes' THEN 1 ELSE 0 END) as drawer_done,
                SUM(CASE WHEN checker_done = 'yes' THEN 1 ELSE 0 END) as checker_done,
                SUM(CASE WHEN final_upload = 'yes' THEN 1 ELSE 0 END) as qa_done,
                SUM(CASE WHEN amend = 'yes' THEN 1 ELSE 0 END) as amender_done
            ")
            ->groupBy('the_date')
            ->get()
            ->keyBy('the_date');

        // Delivered stats by date — separate query since it uses delivered_at
        $deliveredByDate = DB::table(DB::raw("({$unionQuery}) as queue_orders"))
            ->where('workflow_state', 'DELIVERED')
            ->where('delivered_at', '>=', $sevenDaysAgo)
            ->selectRaw('DATE(delivered_at) as the_date, COUNT(*) as cnt')
            ->groupBy('the_date')
            ->pluck('cnt', 'the_date');

        $dateStats = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = today()->subDays($i);
            $dStr = $d->toDateString();
            $dayData = $receivedByDate[$dStr] ?? null;
            $highCount = (int) ($dayData->high_count ?? 0);
            $regularCount = (int) ($dayData->regular_count ?? 0);

            $dateStats[] = [
                'date' => $dStr,
                'label' => $d->format('D'),
                'day_label' => $d->format('d M'),
                'high' => $highCount,
                'regular' => $regularCount,
                'total' => $highCount + $regularCount,
                'drawer_done' => (int) ($dayData->drawer_done ?? 0),
                'checker_done' => (int) ($dayData->checker_done ?? 0),
                'qa_done' => (int) ($dayData->qa_done ?? 0),
                'amender_done' => (int) ($dayData->amender_done ?? 0),
                'delivered' => (int) ($deliveredByDate[$dStr] ?? 0),
            ];
        }

        // ─── 5. Role-wise completion stats for today ───
        $roleCompletions = [];
        $todayCompletions = WorkItem::where('completed_at', '>=', today()->startOfDay())
            ->where('completed_at', '<', today()->addDay()->startOfDay())
            ->where('status', 'completed')
            ->whereIn('assigned_user_id', $allWorkers->pluck('id'))
            ->selectRaw('assigned_user_id, COUNT(*) as cnt')
            ->groupBy('assigned_user_id')
            ->pluck('cnt', 'assigned_user_id');

        foreach ($stages as $stage) {
            $role = StateMachine::STAGE_TO_ROLE[$stage];
            $roleUsers = $allWorkers->where('role', $role);
            $roleCompletions[$role] = [
                'total_staff' => $roleUsers->count(),
                'active' => $roleUsers->filter(fn($u) => !$u->is_absent && $u->last_activity && $u->last_activity->gt(now()->subMinutes(15)))->count(),
                'today_completed' => $roleUsers->pluck('id')->sum(fn($uid) => $todayCompletions->get($uid, 0)),
            ];
        }

        // ─── Build queue info for response ───
        $queueInfo = [
            'queue_name' => $queueName,
            'projects' => $projects->map(fn($p) => $p->only(['id', 'code', 'name', 'country', 'department', 'workflow_type']))->values(),
            'department' => $primaryProject->department,
            'country' => $primaryProject->country,
            'workflow_type' => $workflowType,
        ];

        return response()->json([
            'queue' => $queueInfo,
            // Keep backward compat: 'project' key returns first project info
            'project' => $primaryProject->only(['id', 'code', 'name', 'country', 'department', 'workflow_type']),
            'workers' => $workers,
            'orders' => [
                'data' => $orders,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
            'counts' => [
                'today_total' => $todayTotal,
                'pending' => $pendingCount,
                'completed' => $completedCount,
                'amends' => $amendsCount,
                'assigned' => $assignedCount,
                'unassigned' => $unassignedCount,
            ],
            'date_stats' => $dateStats,
            'role_completions' => $roleCompletions,
        ]);
    }

    /**
     * Build a UNION ALL SQL string across all project order tables in a queue.
     * Each project has its own table (project_{id}_orders), so no project_id filter needed.
     * We override project_id in SELECT to ensure correctness (imported data may have legacy IDs).
     */
    private function buildQueueUnionQuery(array $projectIds, string $selectCols): string
    {
        $parts = [];
        foreach ($projectIds as $pid) {
            $tableName = ProjectOrderService::getTableName($pid);
            if (Schema::hasTable($tableName)) {
                // Replace project_id in SELECT with the correct value (table already scopes to this project)
                $cols = str_replace('project_id', "{$pid} as project_id", $selectCols);
                $parts[] = "SELECT {$cols} FROM `{$tableName}`";
            }
        }
        if (empty($parts)) {
            // Return a dummy empty query that returns no rows
            $firstTable = ProjectOrderService::getTableName($projectIds[0] ?? 0);
            return "SELECT {$selectCols} FROM `{$firstTable}` WHERE 1=0";
        }
        return implode(' UNION ALL ', $parts);
    }

    /**
     * Map worker role to project table columns.
     * Returns [id_column, done_column, in_progress_state, date_column]
     */
    private static function getWorkerRoleColumns(string $role): array
    {
        return match ($role) {
            'drawer', 'designer' => ['drawer_id', 'drawer_done', 'IN_DRAW', 'drawer_date'],
            'checker'            => ['checker_id', 'checker_done', 'IN_CHECK', 'checker_date'],
            'qa'                 => ['qa_id', 'final_upload', 'IN_QA', 'ausFinaldate'],
            default              => [null, null, null, null],
        };
    }
}
