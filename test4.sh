#!/bin/bash
BASE="https://crm.benchmarkstudio.biz/apicrm/api"

# Login and capture token
LOGIN=$(curl -sk --max-time 15 -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"ali.hamza@benchmark.com","password":"password"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
echo "Token: ${TOKEN:0:30}..."

# Test each endpoint
echo ""
echo "=== 1. PROFILE ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/auth/profile" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"
curl -sk --max-time 10 "$BASE/auth/profile" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('name:', d.get('name','?'), '| role:', d.get('role','?'), '| is_online:', d.get('is_online','?'))" 2>/dev/null

echo ""
echo "=== 2. SESSION CHECK ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/auth/session-check" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"
curl -sk --max-time 10 "$BASE/auth/session-check" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1

echo ""
echo "=== 3. USERS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/users?per_page=2" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"
curl -sk --max-time 10 "$BASE/users?per_page=2" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('total:', d.get('total','?'))" 2>/dev/null

echo ""
echo "=== 4. QUEUES ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/dashboard/queues" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"
curl -sk --max-time 10 "$BASE/dashboard/queues" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('queues:', len(d.get('queues',[])))" 2>/dev/null

echo ""
echo "=== 5. OPERATIONS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/dashboard/operations" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"
curl -sk --max-time 10 "$BASE/dashboard/operations" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('projects:', len(d.get('projects',[])))" 2>/dev/null

echo ""
echo "=== 6. DAILY OPS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/dashboard/daily-operations" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"

echo ""
echo "=== 7. PROJECTS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/projects" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"

echo ""
echo "=== 8. TEAMS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/teams" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"

echo ""
echo "=== 9. NOTIFICATIONS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/notifications" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"

echo ""
echo "=== 10. AUDIT LOGS ==="
R=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/audit-logs?per_page=2" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN")
echo "Status: $R"

echo ""
echo "=== 11. LOGOUT ==="
curl -sk --max-time 10 -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1
echo ""

echo ""
echo "=== LARAVEL LOG (last error) ==="
grep -A2 "RouteNotFoundException\|NotFoundHttpException" /home/crmbenchmarkstud/laravel-backend/storage/logs/laravel.log 2>/dev/null | tail -10
