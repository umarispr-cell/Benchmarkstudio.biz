<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkItem;
use App\Services\StateMachine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /dashboard/master
     * CEO/Director: Org → Country → Department → Project drilldown.
     */
    public function master(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['ceo', 'director'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $countries = Project::select('country')
            ->selectRaw('COUNT(*) as project_count')
            ->where('status', 'active')
            ->groupBy('country')
            ->get();

        $summary = [];
        foreach ($countries as $c) {
            $projects = Project::where('country', $c->country)->where('status', 'active')->get();
            $projectIds = $projects->pluck('id');

            $departments = [];
            foreach ($projects->groupBy('department') as $dept => $deptProjects) {
                $deptProjectIds = $deptProjects->pluck('id');

                $deptData = [
                    'department' => $dept,
                    'project_count' => $deptProjects->count(),
                    'total_orders' => Order::whereIn('project_id', $deptProjectIds)->count(),
                    'delivered_today' => Order::whereIn('project_id', $deptProjectIds)
                        ->where('workflow_state', 'DELIVERED')
                        ->whereDate('delivered_at', today())
                        ->count(),
                    'pending' => Order::whereIn('project_id', $deptProjectIds)
                        ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                        ->count(),
                    'sla_breaches' => Order::whereIn('project_id', $deptProjectIds)
                        ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
                        ->whereNotNull('due_date')
                        ->where('due_date', '<', now())
                        ->count(),
                    'projects' => $deptProjects->map(fn($p) => [
                        'id' => $p->id,
                        'code' => $p->code,
                        'name' => $p->name,
                        'workflow_type' => $p->workflow_type,
                        'pending' => Order::where('project_id', $p->id)
                            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count(),
                        'delivered_today' => Order::where('project_id', $p->id)
                            ->where('workflow_state', 'DELIVERED')
                            ->whereDate('delivered_at', today())->count(),
                    ]),
                ];
                $departments[] = $deptData;
            }

            $totalStaff = User::whereIn('project_id', $projectIds)->where('is_active', true)->count();
            $activeStaff = User::whereIn('project_id', $projectIds)
                ->where('is_active', true)
                ->where('is_absent', false)
                ->where('last_activity', '>', now()->subMinutes(15))
                ->count();
            $absentStaff = User::whereIn('project_id', $projectIds)
                ->where('is_active', true)
                ->where('is_absent', true)
                ->count();

            $summary[] = [
                'country' => $c->country,
                'project_count' => $c->project_count,
                'total_staff' => $totalStaff,
                'active_staff' => $activeStaff,
                'absent_staff' => $absentStaff,
                'received_today' => Order::whereIn('project_id', $projectIds)
                    ->whereDate('received_at', today())->count(),
                'delivered_today' => Order::whereIn('project_id', $projectIds)
                    ->where('workflow_state', 'DELIVERED')
                    ->whereDate('delivered_at', today())->count(),
                'total_pending' => Order::whereIn('project_id', $projectIds)
                    ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count(),
                'departments' => $departments,
            ];
        }

        // Org-wide totals
        $orgTotals = [
            'total_projects' => Project::where('status', 'active')->count(),
            'total_staff' => User::where('is_active', true)->count(),
            'active_staff' => User::where('is_active', true)->where('is_absent', false)
                ->where('last_activity', '>', now()->subMinutes(15))->count(),
            'absentees' => User::where('is_active', true)->where('is_absent', true)->count(),
            'orders_received_today' => Order::whereDate('received_at', today())->count(),
            'orders_delivered_today' => Order::where('workflow_state', 'DELIVERED')
                ->whereDate('delivered_at', today())->count(),
            'orders_received_week' => Order::where('received_at', '>=', now()->startOfWeek())->count(),
            'orders_delivered_week' => Order::where('workflow_state', 'DELIVERED')
                ->where('delivered_at', '>=', now()->startOfWeek())->count(),
            'orders_received_month' => Order::where('received_at', '>=', now()->startOfMonth())->count(),
            'orders_delivered_month' => Order::where('workflow_state', 'DELIVERED')
                ->where('delivered_at', '>=', now()->startOfMonth())->count(),
            'total_pending' => Order::whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count(),
        ];

        return response()->json([
            'org_totals' => $orgTotals,
            'countries' => $summary,
        ]);
    }

    /**
     * GET /dashboard/project/{id}
     * Project dashboard: queue health, staffing, performance.
     */
    public function project(Request $request, int $id)
    {
        $project = Project::findOrFail($id);
        $workflowType = $project->workflow_type ?? 'FP_3_LAYER';
        $states = $workflowType === 'PH_2_LAYER' ? StateMachine::PH_STATES : StateMachine::FP_STATES;

        // Queue health: counts per state
        $stateCounts = [];
        foreach ($states as $state) {
            $stateCounts[$state] = Order::where('project_id', $id)
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
        $slaBreaches = Order::where('project_id', $id)
            ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        return response()->json([
            'project' => $project,
            'state_counts' => $stateCounts,
            'staffing' => $staffing,
            'performance' => $performance,
            'sla_breaches' => $slaBreaches,
            'on_hold' => Order::where('project_id', $id)->where('workflow_state', 'ON_HOLD')->count(),
            'received_today' => Order::where('project_id', $id)->whereDate('received_at', today())->count(),
            'delivered_today' => Order::where('project_id', $id)
                ->where('workflow_state', 'DELIVERED')
                ->whereDate('delivered_at', today())->count(),
        ]);
    }

    /**
     * GET /dashboard/operations
     * Ops Manager: assigned projects overview.
     */
    public function operations(Request $request)
    {
        $user = $request->user();

        // Get projects the ops manager is responsible for
        $projects = $user->project_id
            ? Project::where('id', $user->project_id)->get()
            : Project::where('country', $user->country)->where('status', 'active')->get();

        $data = $projects->map(function ($project) {
            $pending = Order::where('project_id', $project->id)
                ->whereNotIn('workflow_state', ['DELIVERED', 'CANCELLED'])->count();
            $deliveredToday = Order::where('project_id', $project->id)
                ->where('workflow_state', 'DELIVERED')
                ->whereDate('delivered_at', today())->count();
            $staff = User::where('project_id', $project->id)
                ->where('is_active', true)->count();
            $activeStaff = User::where('project_id', $project->id)
                ->where('is_active', true)->where('is_absent', false)
                ->where('last_activity', '>', now()->subMinutes(15))->count();

            return [
                'project' => $project->only(['id', 'code', 'name', 'country', 'department', 'workflow_type']),
                'pending' => $pending,
                'delivered_today' => $deliveredToday,
                'total_staff' => $staff,
                'active_staff' => $activeStaff,
            ];
        });

        return response()->json(['projects' => $data]);
    }

    /**
     * GET /dashboard/worker
     * Worker's personal dashboard.
     */
    public function worker(Request $request)
    {
        $user = $request->user();

        $currentOrder = Order::where('assigned_to', $user->id)
            ->whereIn('workflow_state', ['IN_DRAW', 'IN_CHECK', 'IN_QA', 'IN_DESIGN'])
            ->with('project:id,name,code')
            ->first();

        $todayCompleted = WorkItem::where('assigned_user_id', $user->id)
            ->where('status', 'completed')
            ->whereDate('completed_at', today())
            ->count();

        $queueCount = 0;
        if ($user->project_id) {
            $project = $user->project;
            if ($project) {
                $queueStates = StateMachine::getQueuedStates($project->workflow_type ?? 'FP_3_LAYER');
                foreach ($queueStates as $state) {
                    $role = StateMachine::getRoleForState($state);
                    if ($role === $user->role) {
                        $queueCount = Order::where('project_id', $user->project_id)
                            ->where('workflow_state', $state)->count();
                        break;
                    }
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
     */
    public function absentees(Request $request)
    {
        $user = $request->user();
        $query = User::where('is_active', true)->where('is_absent', true);

        if (!in_array($user->role, ['ceo', 'director'])) {
            if ($user->project_id) {
                $query->where('project_id', $user->project_id);
            }
        }

        return response()->json([
            'absentees' => $query->with('project:id,name,code')->get([
                'id', 'name', 'email', 'role', 'project_id', 'team_id', 'last_activity',
            ]),
        ]);
    }
}
