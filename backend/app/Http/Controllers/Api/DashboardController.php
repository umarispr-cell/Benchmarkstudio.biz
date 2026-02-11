<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get CEO dashboard statistics.
     */
    public function ceo()
    {
        $stats = [
            'countries' => $this->getCountryStats(),
            'overview' => [
                'total_projects' => Project::count(),
                'active_projects' => Project::where('status', 'active')->count(),
                'total_orders' => Order::count(),
                'completed_orders' => Order::where('status', 'completed')->count(),
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
            ],
            'recent_activities' => $this->getRecentActivities(20),
        ];

        return response()->json($stats);
    }

    /**
     * Get Operations Manager dashboard statistics.
     */
    public function operations(Request $request)
    {
        $country = $request->input('country', auth()->user()->country);
        $department = $request->input('department');

        $query = Project::where('country', $country);
        
        if ($department) {
            $query->where('department', $department);
        }

        $projects = $query->with(['teams', 'orders'])->get();

        $stats = [
            'country' => $country,
            'department' => $department,
            'projects' => $projects->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                    'department' => $project->department,
                    'total_orders' => $project->orders->count(),
                    'pending_orders' => $project->orders->where('status', 'pending')->count(),
                    'in_progress_orders' => $project->orders->where('status', 'in-progress')->count(),
                    'completed_orders' => $project->orders->where('status', 'completed')->count(),
                    'total_teams' => $project->teams->count(),
                    'active_teams' => $project->teams->where('is_active', true)->count(),
                ];
            }),
            'layers' => $this->getLayerStats($country, $department),
        ];

        return response()->json($stats);
    }

    /**
     * Get worker dashboard statistics.
     */
    public function worker()
    {
        $user = auth()->user();

        $stats = [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'layer' => $user->layer,
                'project' => $user->project,
                'team' => $user->team,
            ],
            'work_queue' => Order::where('assigned_to', $user->id)
                ->where('status', '!=', 'completed')
                ->with(['project', 'team'])
                ->get(),
            'statistics' => [
                'assigned' => Order::where('assigned_to', $user->id)
                    ->where('status', 'pending')
                    ->count(),
                'in_progress' => Order::where('assigned_to', $user->id)
                    ->where('status', 'in-progress')
                    ->count(),
                'completed_today' => Order::where('assigned_to', $user->id)
                    ->where('status', 'completed')
                    ->whereDate('completed_at', today())
                    ->count(),
                'completed_this_week' => Order::where('assigned_to', $user->id)
                    ->where('status', 'completed')
                    ->whereBetween('completed_at', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
            ],
        ];

        return response()->json($stats);
    }

    /**
     * Get department statistics.
     */
    public function department(Request $request)
    {
        $country = $request->input('country', auth()->user()->country);
        $department = $request->input('department', auth()->user()->department);

        $projects = Project::where('country', $country)
            ->where('department', $department)
            ->get();

        $stats = [
            'country' => $country,
            'department' => $department,
            'total_projects' => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'total_orders' => Order::whereIn('project_id', $projects->pluck('id'))->count(),
            'pending_orders' => Order::whereIn('project_id', $projects->pluck('id'))
                ->where('status', 'pending')
                ->count(),
            'in_progress_orders' => Order::whereIn('project_id', $projects->pluck('id'))
                ->where('status', 'in-progress')
                ->count(),
            'completed_orders' => Order::whereIn('project_id', $projects->pluck('id'))
                ->where('status', 'completed')
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get project statistics.
     */
    public function project(string $projectId)
    {
        $project = Project::with(['teams', 'users', 'orders'])->findOrFail($projectId);

        $stats = [
            'project' => $project,
            'orders' => [
                'total' => $project->orders->count(),
                'pending' => $project->orders->where('status', 'pending')->count(),
                'in_progress' => $project->orders->where('status', 'in-progress')->count(),
                'completed' => $project->orders->where('status', 'completed')->count(),
                'on_hold' => $project->orders->where('status', 'on-hold')->count(),
            ],
            'teams' => [
                'total' => $project->teams->count(),
                'active' => $project->teams->where('is_active', true)->count(),
            ],
            'staff' => [
                'total' => $project->users->count(),
                'active' => $project->users->where('is_active', true)->count(),
                'by_layer' => $project->users->groupBy('layer')->map->count(),
            ],
        ];

        return response()->json($stats);
    }

    /**
     * Get country statistics.
     */
    private function getCountryStats()
    {
        return DB::table('projects')
            ->select('country', DB::raw('count(*) as total_projects'))
            ->groupBy('country')
            ->get()
            ->map(function ($country) {
                $projects = Project::where('country', $country->country)->pluck('id');
                return [
                    'country' => $country->country,
                    'total_projects' => $country->total_projects,
                    'active_projects' => Project::where('country', $country->country)
                        ->where('status', 'active')
                        ->count(),
                    'total_orders' => Order::whereIn('project_id', $projects)->count(),
                    'pending_orders' => Order::whereIn('project_id', $projects)
                        ->where('status', 'pending')
                        ->count(),
                    'completed_orders' => Order::whereIn('project_id', $projects)
                        ->where('status', 'completed')
                        ->count(),
                ];
            });
    }

    /**
     * Get layer statistics.
     */
    private function getLayerStats($country, $department = null)
    {
        $query = Order::whereHas('project', function ($q) use ($country, $department) {
            $q->where('country', $country);
            if ($department) {
                $q->where('department', $department);
            }
        });

        $layers = ['drawer', 'checker', 'qa', 'designer'];
        $stats = [];

        foreach ($layers as $layer) {
            $stats[$layer] = [
                'pending' => (clone $query)->where('current_layer', $layer)
                    ->where('status', 'pending')
                    ->count(),
                'in_progress' => (clone $query)->where('current_layer', $layer)
                    ->where('status', 'in-progress')
                    ->count(),
                'completed' => (clone $query)->where('current_layer', $layer)
                    ->where('status', 'completed')
                    ->count(),
            ];
        }

        return $stats;
    }

    /**
     * Get recent activities.
     */
    private function getRecentActivities($limit = 10)
    {
        return DB::table('activity_logs')
            ->join('users', 'activity_logs.user_id', '=', 'users.id')
            ->select('activity_logs.*', 'users.name as user_name')
            ->orderBy('activity_logs.created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
