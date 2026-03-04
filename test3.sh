#!/bin/bash
BASE="https://crm.benchmarkstudio.biz/apicrm/api"

echo "--- PING ---"
curl -sk --max-time 10 "$BASE/ping" 2>&1
echo ""

echo "--- LOGIN RAW RESPONSE ---"
curl -sk --max-time 15 -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ali.hamza@benchmark.com","password":"password"}' \
  -v 2>&1 | tail -30
echo ""

echo "--- CHECK LARAVEL LOGS ---"
tail -30 /home/crmbenchmarkstud/laravel-backend/storage/logs/laravel.log 2>/dev/null || echo "No log file"
