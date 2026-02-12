<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'project_id', 'stage', 'assigned_user_id', 'team_id',
        'status', 'assigned_at', 'started_at', 'completed_at',
        'comments', 'flags', 'rework_reason', 'rejection_code', 'attempt_number',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'flags' => 'array',
    ];

    public function order() { return $this->belongsTo(Order::class); }
    public function project() { return $this->belongsTo(Project::class); }
    public function assignedUser() { return $this->belongsTo(User::class, 'assigned_user_id'); }
    public function team() { return $this->belongsTo(Team::class); }

    public function scopeForStage($query, string $stage) { return $query->where('stage', $stage); }
    public function scopePending($query) { return $query->where('status', 'pending'); }
    public function scopeInProgress($query) { return $query->where('status', 'in_progress'); }
    public function scopeCompleted($query) { return $query->where('status', 'completed'); }
}
