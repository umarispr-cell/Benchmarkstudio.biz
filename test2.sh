#!/bin/bash
BASE="https://crm.benchmarkstudio.biz/apicrm/api"

echo "--- LOGIN ---"
LOGIN=$(curl -sk --max-time 15 -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"ali.hamza@benchmark.com","password":"password"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
echo "Token length: ${#TOKEN}"
echo "Token start: ${TOKEN:0:30}"

echo "--- Profile ---"
curl -sk --max-time 10 "$BASE/auth/profile" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 300
echo ""

echo "--- Session Check ---"
curl -sk --max-time 10 "$BASE/auth/session-check" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 300
echo ""

echo "--- Users ---"
curl -sk --max-time 10 "$BASE/users?per_page=2" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 500
echo ""

echo "--- Dashboard Queues ---"
curl -sk --max-time 10 "$BASE/dashboard/queues" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 500
echo ""

echo "--- Operations ---"
curl -sk --max-time 10 "$BASE/dashboard/operations" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 500
echo ""

echo "--- Logout ---"
curl -sk --max-time 10 -X POST "$BASE/auth/logout" -H "Authorization: Bearer $TOKEN" -H "X-Authorization: Bearer $TOKEN" 2>&1 | head -c 200
echo ""
