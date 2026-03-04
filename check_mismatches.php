<?php
require("vendor/autoload.php");
$app = require_once("bootstrap/app.php");
$kernel = $app->make("Illuminate\Contracts\Console\Kernel");
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Active IN_* orders
$rows = DB::table("project_13_orders")
    ->whereIn("workflow_state", ["IN_DRAW","IN_CHECK","IN_QA","IN_DESIGN","DRAW","CHECK","QA"])
    ->select("id","order_number","workflow_state","assigned_to","drawer_id","drawer_name","checker_id","checker_name")
    ->get();

echo "Active orders (" . count($rows) . "):\n";
foreach ($rows as $r) {
    $flag = "";
    if (in_array($r->workflow_state, ["IN_DRAW","DRAW"]) && $r->assigned_to && $r->drawer_id && (int)$r->assigned_to !== (int)$r->drawer_id)
        $flag = " *** MISMATCH";
    if (in_array($r->workflow_state, ["IN_CHECK","CHECK"]) && $r->assigned_to && $r->checker_id && (int)$r->assigned_to !== (int)$r->checker_id)
        $flag = " *** MISMATCH";
    echo "  id={$r->id} {$r->order_number} state={$r->workflow_state} assigned_to={$r->assigned_to} drawer_id={$r->drawer_id} checker_id={$r->checker_id}{$flag}\n";
}

// IN_DRAW with drawer_id but no assigned_to
$noAssign = DB::table("project_13_orders")
    ->whereIn("workflow_state", ["IN_DRAW","DRAW"])
    ->whereNotNull("drawer_id")
    ->where(function($q) {
        $q->whereNull("assigned_to")->orWhere("assigned_to", "");
    })
    ->count();
echo "\nIN_DRAW with drawer_id but no assigned_to: $noAssign\n";

// Drawers in the system
$drawers = DB::table("users")->where("role","drawer")->where("project_id",13)->select("id","name")->get();
echo "\nDrawers:\n";
foreach ($drawers as $d) echo "  ID={$d->id} {$d->name}\n";
