#!/bin/bash
# Comprehensive CRM API Test Suite
# Tests all major endpoints used by the React frontend

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

# Auth helper
auth_get() {
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$1"
}

auth_get_body() {
  curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$1"
}

auth_post() {
  curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$1"
}

echo "============================================="
echo "  CRM SYSTEM - COMPREHENSIVE API TEST"
echo "============================================="
echo ""

# --- 1. Health & Ping ---
echo "=== 1. Public Endpoints ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/ping")
result "$CODE" "Ping"

# --- 2. CEO Login ---
echo ""
echo "=== 2. CEO Login ==="
LOGIN_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"ceo@benchmark.com","password":"password"}')
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
TLEN=${#TOKEN}
if [ "$TLEN" -gt 10 ]; then
  echo "  [PASS] CEO Login (token: ${TLEN} chars)"
  PASS=$((PASS+1))
else
  echo "  [FAIL] CEO Login - cannot continue"
  echo "  Response: $LOGIN_RESP"
  exit 1
fi

# Check is_online in response
ONLINE=$(echo "$LOGIN_RESP" | sed -n 's/.*"is_online":\([a-z]*\).*/\1/p')
if [ "$ONLINE" = "true" ]; then
  echo "  [PASS] is_online = true after login"
  PASS=$((PASS+1))
else
  echo "  [FAIL] is_online = $ONLINE (expected true)"
  FAIL=$((FAIL+1))
fi

# --- 3. Auth Endpoints ---
echo ""
echo "=== 3. Auth Endpoints ==="
CODE=$(auth_get "$API/auth/session-check")
result "$CODE" "Session Check"
CODE=$(auth_get "$API/auth/profile")
result "$CODE" "Profile"

# --- 4. Dashboard (CEO sees master) ---
echo ""
echo "=== 4. Dashboard ==="
CODE=$(auth_get "$API/dashboard/master")
result "$CODE" "Master Dashboard"
CODE=$(auth_get "$API/dashboard/operations")
result "$CODE" "Operations Dashboard"
CODE=$(auth_get "$API/dashboard/daily-operations")
result "$CODE" "Daily Operations"
CODE=$(auth_get "$API/dashboard/queues")
result "$CODE" "Queues Dashboard"
CODE=$(auth_get "$API/dashboard/absentees")
result "$CODE" "Absentees"

# --- 5. Users CRUD ---
echo ""
echo "=== 5. Users ==="
CODE=$(auth_get "$API/users")
result "$CODE" "Users List"
CODE=$(auth_get "$API/users?search=ali")
result "$CODE" "Users Search"
CODE=$(auth_get "$API/users-inactive")
result "$CODE" "Inactive Users"

# --- 6. Projects ---
echo ""
echo "=== 6. Projects ==="
CODE=$(auth_get "$API/projects")
result "$CODE" "Projects List"

# --- 7. Invoices ---
echo ""
echo "=== 7. Invoices ==="
CODE=$(auth_get "$API/invoices")
result "$CODE" "Invoices List"

# --- 8. Audit Logs ---
echo ""
echo "=== 8. Audit/Activity ==="
CODE=$(auth_get "$API/audit-logs")
result "$CODE" "Audit Logs"

# --- 9. Notifications ---
echo ""
echo "=== 9. Notifications ==="
CODE=$(auth_get "$API/notifications")
result "$CODE" "Notifications"
CODE=$(auth_get "$API/notifications/unread-count")
result "$CODE" "Unread Count"

# --- 10. Workflow ---
echo ""
echo "=== 10. Workflow ==="
CODE=$(auth_get "$API/workflow/my-current")
result "$CODE" "My Current Work"
CODE=$(auth_get "$API/workflow/my-queue")
result "$CODE" "My Queue"
CODE=$(auth_get "$API/workflow/my-stats")
result "$CODE" "My Stats"
CODE=$(auth_get "$API/workflow/check-updates")
result "$CODE" "Check Updates"

# --- 11. CEO Logout ---
echo ""
echo "=== 11. CEO Logout ==="
CODE=$(auth_post "$API/auth/logout")
result "$CODE" "CEO Logout"

# --- 12. Unauthenticated returns 401 ---
echo ""
echo "=== 12. Auth Guard ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Accept: application/json" \
  "$API/auth/profile")
if [ "$CODE" = "401" ]; then
  echo "  [PASS] Unauthenticated -> 401"
  PASS=$((PASS+1))
else
  echo "  [FAIL] Unauthenticated -> $CODE (expected 401)"
  FAIL=$((FAIL+1))
fi

# --- 13. OM Login ---
echo ""
echo "=== 13. OM (Ali Hamza) Login ==="
OM_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"ali.hamza@benchmark.com","password":"password"}')
OM_TOKEN=$(echo "$OM_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
OM_TLEN=${#OM_TOKEN}
if [ "$OM_TLEN" -gt 10 ]; then
  echo "  [PASS] OM Login (token: ${OM_TLEN} chars)"
  PASS=$((PASS+1))
  
  # Test OM-specific endpoints
  OM_AUTH_GET() {
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $OM_TOKEN" \
      -H "X-Authorization: Bearer $OM_TOKEN" \
      -H "Accept: application/json" \
      "$1"
  }
  
  # OM Dashboard
  CODE=$(OM_AUTH_GET "$API/dashboard/operations")
  result "$CODE" "OM Operations Dashboard"
  
  # OM Assignment queue
  CODE=$(OM_AUTH_GET "$API/workflow/my-queue")
  result "$CODE" "OM My Queue"
  
  CODE=$(OM_AUTH_GET "$API/workflow/my-stats")
  result "$CODE" "OM My Stats"
  
  CODE=$(OM_AUTH_GET "$API/users")
  result "$CODE" "OM Users (scoped)"
  
  # OM Logout
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $OM_TOKEN" \
    -H "X-Authorization: Bearer $OM_TOKEN" \
    -H "Accept: application/json" \
    "$API/auth/logout")
  result "$CODE" "OM Logout"
else
  echo "  [FAIL] OM Login (token: ${OM_TLEN} chars)"
  echo "  Response: $OM_RESP"
  FAIL=$((FAIL+1))
fi

# --- 14. PM Login ---
echo ""
echo "=== 14. PM (Ahmad Mustafa) Login ==="
PM_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"ahmad.mustafa@benchmark.com","password":"password"}')
PM_TOKEN=$(echo "$PM_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
PM_TLEN=${#PM_TOKEN}
if [ "$PM_TLEN" -gt 10 ]; then
  echo "  [PASS] PM Login (token: ${PM_TLEN} chars)"
  PASS=$((PASS+1))
  
  PM_AUTH_GET() {
    curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $PM_TOKEN" \
      -H "X-Authorization: Bearer $PM_TOKEN" \
      -H "Accept: application/json" \
      "$1"
  }
  
  CODE=$(PM_AUTH_GET "$API/dashboard/project-manager")
  result "$CODE" "PM Dashboard"
  
  CODE=$(PM_AUTH_GET "$API/workflow/my-queue")
  result "$CODE" "PM My Queue"
  
  # PM Logout
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "X-Authorization: Bearer $PM_TOKEN" \
    -H "Accept: application/json" \
    "$API/auth/logout")
  result "$CODE" "PM Logout"
else
  echo "  [FAIL] PM Login (token: ${PM_TLEN} chars)"
  echo "  Response: $PM_RESP"
  FAIL=$((FAIL+1))
fi

# --- Summary ---
echo ""
echo "============================================="
TOTAL=$((PASS+FAIL))
echo "  RESULTS: $PASS/$TOTAL passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "  STATUS: ALL TESTS PASSED ✓"
else
  echo "  STATUS: $FAIL TESTS FAILED"
fi
echo "============================================="
