# Metro → Benchmark Sync Integration Guide

**Date:** 24 February 2026  
**Purpose:** Mirror every action from the OLD Metro system into the NEW Benchmark system in real-time.  
**For:** Developer integrating sync into old Metro codebase

---

## Table of Contents

1. [Overview](#1-overview)
2. [What You Need](#2-what-you-need)
3. [Step 1: Add the Sync File](#step-1-add-the-sync-file)
4. [Step 2: Integrate into Order Actions](#step-2-integrate-into-order-actions)
5. [Step 3: Test It](#step-3-test-it)
6. [Step 4: Set Up Cron Backup](#step-4-set-up-cron-backup)
7. [Field Reference](#field-reference)
8. [Troubleshooting](#troubleshooting)

---

## 1. Overview

```
┌──────────────────┐         POST /api/sync/order         ┌──────────────────┐
│   OLD METRO      │  ──────────────────────────────────>  │   NEW BENCHMARK  │
│   (Your Server)  │      (with X-Sync-Token header)      │   (Our Server)   │
│                  │                                       │                  │
│  When manager    │   benchmark_sync.php sends the        │  Order is auto   │
│  assigns drawer, │   order data to the new system        │  created/updated │
│  checker marks   │                                       │  with correct    │
│  done, etc.      │                                       │  workflow state  │
└──────────────────┘                                       └──────────────────┘
```

**Kya hoga:** Jab bhi purane system mein koi action ho (order assign, done, upload, reject), woh automatically naye system mein bhi reflect hoga.

---

## 2. What You Need

| Item | Value |
|------|-------|
| Sync File | `benchmark_sync.php` (provided below) |
| API URL | `https://new.stellarinstitute.pk/api/sync/order` |
| Auth Token | `BM_SYNC_2026_x9K4mP7qR2vL` |
| Required PHP | 7.0+ with cURL extension |

---

## Step 1: Add the Sync File

### 1.1 Copy the file `benchmark_sync.php` to your old Metro project root

Place it where your other PHP files are (same folder as your order management files).

### 1.2 The file contains these functions:

| Function | Purpose |
|----------|---------|
| `syncToNewSystem($data)` | Send ONE order update |
| `syncFullOrderRow($row)` | Send a full DB row |
| `syncBatchToNewSystem($orders)` | Send multiple orders at once |

**No configuration needed** — the API URL and token are already set inside the file.

---

## Step 2: Integrate into Order Actions

### IMPORTANT: The `old_id` field is REQUIRED in every call. This is the `id` (primary key) from the `order` table.

---

### 2.1 — When Manager ASSIGNS a DRAWER

Find the file where drawer is assigned. After the UPDATE query, add:

```php
require_once 'benchmark_sync.php';   // Add at top of file (once only)

// ... your existing code that assigns drawer ...
// Example: UPDATE `order` SET dname='Ali Khan', dassign_time=NOW() WHERE id=123

// ADD THIS after the UPDATE:
syncToNewSystem([
    'old_id'       => $order_id,        // ← id from `order` table (REQUIRED)
    'order_id'     => $row['order_id'], // ← the order reference number
    'property'     => $row['property'],
    'dname'        => $drawer_name,     // ← drawer name that was assigned
    'dassign_time' => date('Y-m-d H:i:s'),
]);
```

---

### 2.2 — When Manager ASSIGNS a CHECKER

```php
require_once 'benchmark_sync.php';

// ... your existing code that assigns checker ...

syncToNewSystem([
    'old_id'       => $order_id,
    'cname'        => $checker_name,    // ← checker name that was assigned
    'cassign_time' => date('Y-m-d H:i:s'),
]);
```

---

### 2.3 — When DRAWER Marks Order as DONE

```php
require_once 'benchmark_sync.php';

// ... your existing code that marks drawer done ...

syncToNewSystem([
    'old_id'      => $order_id,
    'drawer_done' => 'yes',
    'drawer_date' => date('Y-m-d H:i:s'),
]);
```

---

### 2.4 — When CHECKER Marks Order as DONE

```php
require_once 'benchmark_sync.php';

// ... your existing code that marks checker done ...

syncToNewSystem([
    'old_id'       => $order_id,
    'checker_done' => 'yes',
    'checker_date' => date('Y-m-d H:i:s'),
]);
```

---

### 2.5 — When QA Does FINAL UPLOAD

```php
require_once 'benchmark_sync.php';

// ... your existing code for final upload ...

syncToNewSystem([
    'old_id'       => $order_id,
    'final_upload' => 'yes',
    'ausFinaldate' => date('Y-m-d H:i:s'),
    'qa_person'    => $qa_name,         // ← if available
]);
```

---

### 2.6 — When Order is REJECTED (sent back)

```php
require_once 'benchmark_sync.php';

// ... your existing rejection code ...

syncToNewSystem([
    'old_id' => $order_id,
    'status' => 'pending',
    'reason' => $rejection_reason,      // ← e.g. "Dimension wrong"
]);
```

---

### 2.7 — When a NEW ORDER is Added

```php
require_once 'benchmark_sync.php';

// ... your existing code that inserts new order ...
// $new_id = last insert id

// Fetch the full row
$row = $pdo->query("SELECT * FROM `order` WHERE id = $new_id")->fetch(PDO::FETCH_ASSOC);

syncFullOrderRow($row);   // ← sends everything
```

---

### 2.8 — When Order has a MISTAKE Marked

```php
require_once 'benchmark_sync.php';

syncToNewSystem([
    'old_id'  => $order_id,
    'mistake' => $drawer_mistake_value,   // ← drawer mistake
    'cmistake'=> $checker_mistake_value,  // ← checker mistake
]);
```

---

### 2.9 — SHORTCUT: Send Full Row (Easiest Method)

If you don't want to pick individual fields, just send the entire row after ANY action:

```php
require_once 'benchmark_sync.php';

// After ANY order action, fetch the full row and send it:
$row = $pdo->query("SELECT * FROM `order` WHERE id = $order_id")->fetch(PDO::FETCH_ASSOC);
syncFullOrderRow($row);
```

> **This is the simplest approach.** Use this if you want minimum code changes. The new system will figure out which fields changed.

---

## Step 3: Test It

### 3.1 Quick Test (run from terminal)

Create a test file `test_sync.php`:

```php
<?php
require_once 'benchmark_sync.php';

// Test with a real order ID from your database
$result = syncToNewSystem([
    'old_id'  => 914491,          // ← use a real order id
    'dname'   => 'Test Drawer',
    'drawer_done' => 'yes',
]);

echo $result ? "✅ SUCCESS\n" : "❌ FAILED - check benchmark_sync.log\n";
```

Run it:
```bash
php test_sync.php
```

### 3.2 Check the Log

After running, check `benchmark_sync.log` (created in same folder):

```bash
cat benchmark_sync.log
```

You should see:
```
[2026-02-24 12:00:00] OK: old_id=914491 → updated (HTTP 200)
```

### 3.3 Verify on New System

Check via API:
```bash
curl -s "https://new.stellarinstitute.pk/api/sync/status" \
  -H "X-Sync-Token: BM_SYNC_2026_x9K4mP7qR2vL"
```

You should see `live_synced_orders` count increase.

---

## Step 4: Set Up Cron Backup

Even with real-time sync, set up a cron job as backup to catch anything missed.

### 4.1 Create `cron_sync.php` on old Metro server:

```php
<?php
require_once __DIR__ . '/benchmark_sync.php';

// Connect to your Metro database
$pdo = new PDO(
    'mysql:host=localhost;dbname=YOUR_DATABASE_NAME',
    'YOUR_DB_USER',
    'YOUR_DB_PASSWORD'
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Get orders modified in last 10 minutes
$stmt = $pdo->query("
    SELECT * FROM `order`
    WHERE dassign_time  >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       OR cassign_time  >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       OR drawer_date   >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       OR checker_date  >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       OR ausFinaldate  >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
");

$orders = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $row['old_id'] = $row['id'];
    $orders[] = $row;
}

if (count($orders) > 0) {
    $result = syncBatchToNewSystem($orders);
    echo date('Y-m-d H:i:s') . " - Synced: {$result['success']}, Failed: {$result['failed']}\n";
} else {
    echo date('Y-m-d H:i:s') . " - No changes\n";
}
```

### 4.2 Add to crontab (run every 5 minutes):

```bash
crontab -e
```

Add this line:
```
*/5 * * * * /usr/bin/php /path/to/your/cron_sync.php >> /path/to/your/cron_sync.log 2>&1
```

---

## Field Reference

### Required Field (MUST include in every call):

| Field | Type | Description |
|-------|------|-------------|
| `old_id` | integer | **REQUIRED** — Primary key `id` from old `order` table |

### Optional Fields (send only what changed):

| Field | Type | When to Send |
|-------|------|-------------|
| `order_id` | string | Order reference number |
| `property` | string | Property address |
| `client_name` | string | Priority level (high/urgent/normal) |
| `dname` | string | Drawer name — when drawer assigned |
| `cname` | string | Checker name — when checker assigned |
| `qa_person` | string | QA person name — when QA assigned |
| `dassign_time` | datetime | When drawer was assigned |
| `cassign_time` | datetime | When checker was assigned |
| `drawer_done` | string | `"yes"` when drawer completes |
| `drawer_date` | datetime | When drawer completed |
| `checker_done` | string | `"yes"` when checker completes |
| `checker_date` | datetime | When checker completed |
| `final_upload` | string | `"yes"` when QA uploads final |
| `ausFinaldate` | datetime | When final upload done |
| `status` | string | `"pending"` when rejected |
| `reason` | string | Rejection reason text |
| `mistake` | string | Drawer mistake details |
| `cmistake` | string | Checker mistake details |
| `code` | string | Order code |
| `plan_type` | string | Plan type |
| `instruction` | string | Special instructions |
| `d_id` | integer | Drawer ID (old system) |
| `amend` | string | Amendment info |
| `d_live_qa` | integer | Drawer live QA flag |
| `c_live_qa` | integer | Checker live QA flag |
| `qa_live_qa` | integer | QA live QA flag |

---

## Troubleshooting

### "CURL ERROR" in log
- Check internet connection on old server
- Check if `https://new.stellarinstitute.pk` is accessible
- Run: `curl -I https://new.stellarinstitute.pk/api/sync/status`

### "401 Unauthorized" in log
- Token mismatch — make sure your `benchmark_sync.php` has:
  ```
  BM_SYNC_2026_x9K4mP7qR2vL
  ```

### "500 Internal Server Error" in log
- Check if `old_id` is included in the data
- Contact admin to check server logs

### Nothing happening / no log file
- Make sure `require_once 'benchmark_sync.php'` path is correct
- Check PHP error logs for the old system
- Test with `php test_sync.php` first

### Orders not updating
- Verify the `old_id` matches a `METRO-{old_id}` order in the new system
- New orders (IDs not in new system) will be auto-created

---

## Summary Checklist

- [ ] Copy `benchmark_sync.php` to old Metro server
- [ ] Add `require_once 'benchmark_sync.php'` to order action files
- [ ] Add `syncToNewSystem()` or `syncFullOrderRow()` calls after each action
- [ ] Test with `test_sync.php`
- [ ] Check `benchmark_sync.log` for success messages
- [ ] Set up `cron_sync.php` as backup (every 5 minutes)
- [ ] Monitor for a few days to confirm all actions are syncing

---

**Questions?** Contact the system admin or check `benchmark_sync.log` on the old server for detailed logs.
