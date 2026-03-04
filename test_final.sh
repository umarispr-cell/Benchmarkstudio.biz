#!/bin/bash
API="https://crm.benchmarkstudio.biz/apicrm/api"
PASS=0
FAIL=0

result() {
  if [ "$1" -ge 200 ] && [ "$1" -lt 300 ]; then
    echo "  [PASS] $2 (HTTP $1)"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $2 (HTTP $1)"
    FAIL=$((FAIL+1))
  fi
}

# --- 1. Health & Ping ---
echo "=== 1. Health & Ping ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/ping")
result "$CODE" "Ping"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
result "$CODE" "Health"

# --- 2. Login ---
echo ""
echo "=== 2. Login ==="
LOGIN_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@benchmark.com","password":"password"}')

# Extract token using sed (no python needed)
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
TLEN=${#TOKEN}

if [ "$TLEN" -gt 10 ]; then
  echo "  [PASS] CEO Login (token length: $TLEN)"
  PASS=$((PASS+1))
else
  echo "  [FAIL] CEO Login (token length: $TLEN)"
  echo "  Response: $LOGIN_RESP"
  FAIL=$((FAIL+1))
  echo ""
  echo "RESULTS: $PASS passed, $FAIL failed"
  exit 1
fi

AUTH="-H \"Authorization: Bearer $TOKEN\" -H \"X-Authorization: Bearer $TOKEN\""

# Helper function for authenticated GET requests
auth_get() {
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Authorization: Bearer $TOKEN" \
    "$1"
}

auth_get_body() {
  curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Authorization: Bearer $TOKEN" \
    "$1"
}

# --- 3. Auth Endpoints ---
echo ""
echo "=== 3. Auth Endpoints ==="
CODE=$(auth_get "$API/auth/session-check")
result "$CODE" "Session Check"
CODE=$(auth_get "$API/profile")
result "$CODE" "Profile"

# --- 4. Dashboard ---
echo ""
echo "=== 4. Dashboard ==="
CODE=$(auth_get "$API/dashboard/stats")
result "$CODE" "Dashboard Stats"
CODE=$(auth_get "$API/dashboard/daily-ops")
result "$CODE" "Daily Ops"

# --- 5. Users ---
echo ""
echo "=== 5. Users ==="
CODE=$(auth_get "$API/users")
result "$CODE" "Users List"
CODE=$(auth_get "$API/users?search=ali")
result "$CODE" "Users Search"

# --- 6. Orders ---
echo ""
echo "=== 6. Orders ==="
CODE=$(auth_get "$API/orders")
result "$CODE" "Orders List"
CODE=$(auth_get "$API/orders?status=pending")
result "$CODE" "Orders Filter"

# --- 7. Projects ---
echo ""
echo "=== 7. Projects ==="
CODE=$(auth_get "$API/projects")
result "$CODE" "Projects List"

# --- 8. Teams ---
echo ""
echo "=== 8. Teams ==="
CODE=$(auth_get "$API/teams")
result "$CODE" "Teams List"

# --- 9. Activity Logs ---
echo ""
echo "=== 9. Activity Logs ==="
CODE=$(auth_get "$API/activity-logs")
result "$CODE" "Activity Logs"

# --- 10. Invoices ---
echo ""
echo "=== 10. Invoices ==="
CODE=$(auth_get "$API/invoices")
result "$CODE" "Invoices List"

# --- 11. Assignment Dashboard ---
echo ""
echo "=== 11. Assignment Dashboard ==="
CODE=$(auth_get "$API/supervisor/queue")
result "$CODE" "Supervisor Queue"
CODE=$(auth_get "$API/supervisor/team-members")
result "$CODE" "Team Members"

# --- 12. Logout ---
echo ""
echo "=== 12. Logout ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Authorization: Bearer $TOKEN" \
  "$API/auth/logout")
result "$CODE" "Logout"

# --- 13. Verify unauthenticated returns 401 (not 500) ---
echo ""
echo "=== 13. Unauthenticated Returns 401 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/profile")
if [ "$CODE" = "401" ]; then
  echo "  [PASS] Unauthenticated -> 401"
  PASS=$((PASS+1))
else
  echo "  [FAIL] Unauthenticated -> $CODE (expected 401)"
  FAIL=$((FAIL+1))
fi

# --- 14. Login with OM role ---
echo ""
echo "=== 14. OM Login ==="
OM_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alihamza@benchmark.com","password":"password123"}')
OM_TOKEN=$(echo "$OM_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
OM_TLEN=${#OM_TOKEN}
if [ "$OM_TLEN" -gt 10 ]; then
  echo "  [PASS] OM Login (token length: $OM_TLEN)"
  PASS=$((PASS+1))
else
  echo "  [FAIL] OM Login (token length: $OM_TLEN)"
  echo "  Response: $OM_RESP"
  FAIL=$((FAIL+1))
fi

# --- Summary ---
echo ""
echo "==============================="
TOTAL=$((PASS+FAIL))
echo "RESULTS: $PASS/$TOTAL passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "STATUS: ALL TESTS PASSED"
else
  echo "STATUS: SOME TESTS FAILED"
fi
echo "==============================="
