#!/bin/bash
BASE="http://localhost:8000/api"
PASS=0
FAIL=0

t() {
  local method="$1" url="$2" expect="$3" label="$4" token="$5"
  local cmd="curl -s -o /dev/null -w %{http_code} -H Accept:application/json -H Content-Type:application/json"
  [ -n "$token" ] && cmd="$cmd -H Authorization:Bearer\ $token"
  [ "$method" != "GET" ] && cmd="$cmd -X $method"
  local code
  code=$(eval $cmd "$BASE$url")
  if [ "$code" = "$expect" ]; then
    echo "  PASS $label ($code)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $label (expected $expect, got $code)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== AUTH ==="
CEO_TOKEN=$(curl -s -X POST -H "Accept:application/json" -H "Content-Type:application/json" -d '{"email":"ceo@benchmark.com","password":"password"}' "$BASE/auth/login" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$CEO_TOKEN" ] && echo "  PASS CEO login" && PASS=$((PASS+1)) || echo "  FAIL CEO login" && FAIL=$((FAIL+1))

WK_TOKEN=$(curl -s -X POST -H "Accept:application/json" -H "Content-Type:application/json" -d '{"email":"drawer1@benchmark.com","password":"password"}' "$BASE/auth/login" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$WK_TOKEN" ] && echo "  PASS Worker login" && PASS=$((PASS+1)) || echo "  FAIL Worker login" && FAIL=$((FAIL+1))

echo ""
echo "=== HEALTH ==="
t GET "/health" 200 "Health" ""
t GET "/ping" 200 "Ping" ""

echo ""
echo "=== CEO DASHBOARDS ==="
t GET "/dashboard/master" 200 "Master dash" "$CEO_TOKEN"
t GET "/dashboard/operations" 200 "Ops dash" "$CEO_TOKEN"
t GET "/dashboard/project/1" 200 "Project dash" "$CEO_TOKEN"
t GET "/dashboard/absentees" 200 "Absentees" "$CEO_TOKEN"
t GET "/dashboard/daily-operations" 200 "Daily ops" "$CEO_TOKEN"

echo ""
echo "=== WORKER DASHBOARD ==="
t GET "/dashboard/worker" 200 "Worker dash" "$WK_TOKEN"

echo ""
echo "=== WORKFLOW (Worker) ==="
t POST "/workflow/start-next" 200 "Start next" "$WK_TOKEN"
t GET "/workflow/my-current" 200 "My current" "$WK_TOKEN"
t GET "/workflow/my-stats" 200 "My stats" "$WK_TOKEN"
t GET "/workflow/my-queue" 200 "My queue" "$WK_TOKEN"
t GET "/workflow/my-completed" 200 "My completed" "$WK_TOKEN"
t GET "/workflow/my-history" 200 "My history" "$WK_TOKEN"
t GET "/workflow/my-performance" 200 "My performance" "$WK_TOKEN"

echo ""
echo "=== PROJECTS (CEO) ==="
t GET "/projects" 200 "List projects" "$CEO_TOKEN"
t GET "/projects/1" 200 "Show project" "$CEO_TOKEN"
t GET "/projects/1/statistics" 200 "Project stats" "$CEO_TOKEN"
t GET "/projects/1/teams" 200 "Project teams" "$CEO_TOKEN"

echo ""
echo "=== USERS (CEO) ==="
t GET "/users" 200 "List users" "$CEO_TOKEN"
t GET "/users/1" 200 "Show user" "$CEO_TOKEN"
t GET "/users-inactive" 200 "Inactive users" "$CEO_TOKEN"

echo ""
echo "=== NOTIFICATIONS ==="
t GET "/notifications" 200 "Notifications" "$CEO_TOKEN"
t GET "/notifications/unread-count" 200 "Unread count" "$CEO_TOKEN"

echo ""
echo "=== INVOICES ==="
t GET "/invoices" 200 "List invoices" "$CEO_TOKEN"

echo ""
echo "=== MONTH LOCKS ==="
t GET "/month-locks/1" 200 "Month locks list" "$CEO_TOKEN"

echo ""
echo "=== WORKFLOW MGMT (CEO) ==="
t GET "/workflow/1/orders" 200 "Project orders" "$CEO_TOKEN"
t GET "/workflow/1/queue-health" 200 "Queue health" "$CEO_TOKEN"
t GET "/workflow/1/staffing" 200 "Staffing" "$CEO_TOKEN"

echo ""
echo "=== IMPORT ==="
t GET "/projects/1/import-sources" 200 "Import sources" "$CEO_TOKEN"
t GET "/projects/1/import-history" 200 "Import history" "$CEO_TOKEN"

echo ""
echo "=== CHECKLISTS ==="
t GET "/projects/1/checklists" 200 "Templates" "$CEO_TOKEN"

echo ""
echo "=== AUDIT ==="
t GET "/audit-logs" 200 "Audit logs" "$CEO_TOKEN"

echo ""
echo "=== RBAC: Worker blocked from mgmt ==="
t GET "/projects" 403 "Worker->projects" "$WK_TOKEN"
t GET "/users" 403 "Worker->users" "$WK_TOKEN"
t GET "/invoices" 403 "Worker->invoices" "$WK_TOKEN"

echo ""
echo "=== RBAC: Unauth ==="
t GET "/dashboard/master" 401 "Unauth->dash" ""
t GET "/auth/profile" 401 "Unauth->profile" ""

echo ""
echo "================================"
echo "TOTAL: $PASS passed, $FAIL failed"
