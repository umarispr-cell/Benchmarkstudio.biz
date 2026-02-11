<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $projects = [
            // UK Projects
            [
                'code' => 'UK-FP-001',
                'name' => 'London Property Services',
                'country' => 'UK',
                'department' => 'floor_plan',
                'client_name' => 'London Estate Agents Ltd',
                'status' => 'active',
                'workflow_layers' => ['drawer', 'checker', 'qa'],
                'metadata' => ['priority' => 'high'],
            ],
            [
                'code' => 'UK-PE-001',
                'name' => 'Manchester Photo Enhancement',
                'country' => 'UK',
                'department' => 'photos_enhancement',
                'client_name' => 'Manchester Properties',
                'status' => 'active',
                'workflow_layers' => ['designer', 'qa'],
                'metadata' => ['priority' => 'normal'],
            ],
            // Australia Projects
            [
                'code' => 'AU-FP-001',
                'name' => 'Sydney Real Estate Plans',
                'country' => 'Australia',
                'department' => 'floor_plan',
                'client_name' => 'Sydney Property Group',
                'status' => 'active',
                'workflow_layers' => ['drawer', 'checker', 'qa'],
                'metadata' => ['priority' => 'high'],
            ],
            [
                'code' => 'AU-PE-001',
                'name' => 'Melbourne Image Services',
                'country' => 'Australia',
                'department' => 'photos_enhancement',
                'client_name' => 'Melbourne Realty',
                'status' => 'active',
                'workflow_layers' => ['designer', 'qa'],
                'metadata' => ['priority' => 'normal'],
            ],
            // Canada Projects
            [
                'code' => 'CA-FP-001',
                'name' => 'Toronto Floor Planning',
                'country' => 'Canada',
                'department' => 'floor_plan',
                'client_name' => 'Toronto Property Solutions',
                'status' => 'active',
                'workflow_layers' => ['drawer', 'checker', 'qa'],
                'metadata' => ['priority' => 'normal'],
            ],
            // USA Projects
            [
                'code' => 'US-FP-001',
                'name' => 'New York Floor Plans',
                'country' => 'USA',
                'department' => 'floor_plan',
                'client_name' => 'NYC Real Estate Co',
                'status' => 'active',
                'workflow_layers' => ['drawer', 'checker', 'qa'],
                'metadata' => ['priority' => 'urgent'],
            ],
            [
                'code' => 'US-PE-001',
                'name' => 'Los Angeles Photo Studio',
                'country' => 'USA',
                'department' => 'photos_enhancement',
                'client_name' => 'LA Property Media',
                'status' => 'active',
                'workflow_layers' => ['designer', 'qa'],
                'metadata' => ['priority' => 'high'],
            ],
        ];

        foreach ($projects as $project) {
            Project::create($project);
        }
    }
}
