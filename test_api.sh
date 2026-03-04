#!/bin/bash
BASE="https://crm.benchmarkstudio.biz/apicrm/api"
C="curl -sk --max-time 15"
PASS=0
FAIL=0

check() {
  if [ $? -eq 0 ]; then
    echo "  [PASS] $1"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $1"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================="
echo "  CRM API FULL SYSTEM TEST"
echo "  $(date)"
echo "========================================="
echo ""

# 1. Health
echo "--- 1. Health & Ping ---"
HEALTH=$($C "$BASE/health")
echo "$HEALTH" | grep -q '"status"'
check "Health endpoint responds"
echo "  $HEALTH"
echo ""

PING=$($C "$BASE/ping")
echo "$PING" | grep -q '"ok"'
check "Ping endpoint"
echo ""

# 2. Login as CEO
echo "--- 2. Login Tests ---"
LOGIN=$($C -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"ceo@benchmark.com","password":"password"}')
echo "$LOGIN" | grep -q '"token"'
check "CEO login"
CEO_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
CEO_ONLINE=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('is_online','?'))" 2>/dev/null)
echo "  CEO is_online after login: $CEO_ONLINE"
echo ""

# 3. Login as OM
LOGIN2=$($C -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"ali.hamza@benchmark.com","password":"password"}')
echo "$LOGIN2" | grep -q '"token"'
check "OM (Ali Hamza) login"
OM_TOKEN=$(echo "$LOGIN2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
echo ""

# Use OM token for most tests
H1="Authorization: Bearer $OM_TOKEN"
H2="X-Authorization: Bearer $OM_TOKEN"

# 4. Session Check
echo "--- 3. Session Check ---"
SC=$($C "$BASE/auth/session-check" -H "$H1" -H "$H2")
echo "$SC" | grep -q '"valid":true'
check "Session check valid"
echo "  $SC"
echo ""

# 5. Profile
echo "--- 4. Profile ---"
PROF=$($C "$BASE/auth/profile" -H "$H1" -H "$H2")
echo "$PROF" | grep -q '"is_online"'
check "Profile returns is_online field"
PROF_ONLINE=$(echo "$PROF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('is_online','MISSING'))" 2>/dev/null)
echo "  is_online in profile: $PROF_ONLINE"
echo ""

# 6. Users list
echo "--- 5. Users List ---"
USERS=$($C "$BASE/users?per_page=5" -H "$H1" -H "$H2")
echo "$USERS" | grep -q '"is_online"'
check "Users list returns is_online"
echo "$USERS" | grep -q '"project"'
check "Users list returns project relation"
UTOTAL=$(echo "$USERS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','?'))" 2>/dev/null)
echo "  Total users visible to OM: $UTOTAL"
echo ""

# 7. Users filter by role
echo "--- 6. Users Filter ---"
DRAWERS=$($C "$BASE/users?role=drawer&per_page=5" -H "$H1" -H "$H2")
echo "$DRAWERS" | grep -q '"drawer"'
check "Users filter by role=drawer"
DTOTAL=$(echo "$DRAWERS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','?'))" 2>/dev/null)
echo "  Drawers found: $DTOTAL"
echo ""

# 8. Queues
echo "--- 7. Queues ---"
QUEUES=$($C "$BASE/dashboard/queues" -H "$H1" -H "$H2")
echo "$QUEUES" | grep -q '"queues"'
check "Queues endpoint"
QCOUNT=$(echo "$QUEUES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('queues',[])))" 2>/dev/null)
echo "  Queue count: $QCOUNT"
echo ""

# 9. Operations dashboard
echo "--- 8. Operations Dashboard ---"
OPS=$($C "$BASE/dashboard/operations" -H "$H1" -H "$H2")
echo "$OPS" | grep -q '"projects"'
check "Operations dashboard"
PCOUNT=$(echo "$OPS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('projects',[])))" 2>/dev/null)
echo "  Projects visible: $PCOUNT"
echo ""

# 10. Daily operations
echo "--- 9. Daily Operations ---"
DAILY=$($C "$BASE/dashboard/daily-operations" -H "$H1" -H "$H2")
echo "$DAILY" | grep -q '"data"'
check "Daily operations endpoint"
echo ""

# 11. Assignment dashboard (first queue)
echo "--- 10. Assignment Dashboard ---"
QNAME=$(echo "$QUEUES" | python3 -c "import sys,json; qs=json.load(sys.stdin).get('queues',[]); print(qs[0]['queue_name'] if qs else '')" 2>/dev/null)
if [ -n "$QNAME" ]; then
  ENCODED_QNAME=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QNAME'))" 2>/dev/null)
  ASSIGN=$($C "$BASE/dashboard/assignment/$ENCODED_QNAME" -H "$H1" -H "$H2")
  echo "$ASSIGN" | grep -q '"orders"'
  check "Assignment dashboard for queue: $QNAME"
  OCOUNT=$(echo "$ASSIGN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('orders',{}).get('total','?'))" 2>/dev/null)
  echo "  Orders in queue: $OCOUNT"
else
  echo "  [SKIP] No queues found"
fi
echo ""

# 12. Projects list
echo "--- 11. Projects ---"
PROJS=$($C "$BASE/projects" -H "$H1" -H "$H2")
echo "$PROJS" | grep -q '"data"'
check "Projects list"
echo ""

# 13. Teams list
echo "--- 12. Teams ---"
TEAMS=$($C "$BASE/teams" -H "$H1" -H "$H2")
echo "$TEAMS" | grep -q '"data"'
check "Teams list"
echo ""

# 14. Notifications
echo "--- 13. Notifications ---"
NOTIF=$($C "$BASE/notifications" -H "$H1" -H "$H2")
NOTIF_OK=$?
[ $NOTIF_OK -eq 0 ]
check "Notifications endpoint"
echo ""

# 15. Audit logs
echo "--- 14. Audit Logs ---"
AUDIT=$($C "$BASE/audit-logs?per_page=3" -H "$H1" -H "$H2")
echo "$AUDIT" | grep -q '"data"'
check "Audit logs"
echo ""

# 16. CEO Dashboard
echo "--- 15. CEO Dashboard ---"
CH1="Authorization: Bearer $CEO_TOKEN"
CH2="X-Authorization: Bearer $CEO_TOKEN"
CEOD=$($C "$BASE/dashboard/master" -H "$CH1" -H "$CH2")
echo "$CEOD" | grep -q '"total_orders\|projects\|users"'
check "CEO master dashboard"
echo ""

# 17. CEO Daily Ops
echo "--- 16. CEO Daily Operations ---"
CDAILY=$($C "$BASE/dashboard/daily-operations" -H "$CH1" -H "$CH2")
echo "$CDAILY" | grep -q '"data"'
check "CEO daily operations"
echo ""

# 18. Workflow endpoints (worker role needed - test with OM anyway for error checks)
echo "--- 17. Workflow Endpoints ---"
MYSTATS=$($C "$BASE/workflow/my-stats" -H "$H1" -H "$H2")
echo "$MYSTATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Stats:', str(d)[:150])" 2>/dev/null
echo ""

# 19. Test logout
echo "--- 18. Logout ---"
LOGOUT=$($C -X POST "$BASE/auth/logout" -H "$H1" -H "$H2")
echo "$LOGOUT" | grep -q '"message"'
check "OM logout"
echo "  $LOGOUT"

# Verify session is invalid after logout
AFTER=$($C "$BASE/auth/profile" -H "$H1" -H "$H2")
echo "$AFTER" | grep -q '"Unauthenticated"'
check "Session invalid after logout"
echo ""

# 20. CEO logout
echo "--- 19. CEO Logout ---"
CLOGOUT=$($C -X POST "$BASE/auth/logout" -H "$CH1" -H "$CH2")
echo "$CLOGOUT" | grep -q '"message"'
check "CEO logout"
echo ""

# Summary
echo "========================================="
echo "  TEST RESULTS: $PASS PASSED, $FAIL FAILED"
echo "========================================="
