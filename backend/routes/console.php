<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Per CEO Requirements: Auto-flag users inactive for 15+ days
// Runs daily at midnight
Schedule::command('users:flag-inactive --days=15')
    ->daily()
    ->at('00:00')
    ->description('Flag inactive users and reassign their orders');
