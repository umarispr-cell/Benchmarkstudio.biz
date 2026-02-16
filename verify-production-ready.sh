#!/bin/bash
# Production Readiness Verification Script
# Run this before deploying to production

set -e

echo "🔍 BENCHMARK DAILY OPERATIONS - PRODUCTION READINESS CHECK"
echo "=========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "📦 1. BACKEND CHECKS"
echo "-------------------"

cd backend

# Check PHP syntax
if php -l app/Http/Controllers/Api/DashboardController.php > /dev/null 2>&1; then
    check_pass "PHP syntax valid"
else
    check_fail "PHP syntax error in DashboardController"
fi

# Check migration applied
if php artisan migrate:status 2>&1 | grep -q "add_performance_indexes_for_daily_operations"; then
    check_pass "Performance indexes migration exists"
else
    check_fail "Missing performance indexes migration"
fi

# Check route registered
if php artisan route:list 2>&1 | grep -q "daily-operations"; then
    check_pass "API route registered"
else
    check_fail "API route not found"
fi

# Check database connection
if php artisan tinker --execute="DB::connection()->getPdo();" > /dev/null 2>&1; then
    check_pass "Database connection working"
else
    check_fail "Database connection failed"
fi

# Check ActivityLog model exists (for audit logging)
if php artisan tinker --execute="\App\Models\ActivityLog::count();" > /dev/null 2>&1; then
    check_pass "ActivityLog model available"
else
    check_warn "ActivityLog model not found (audit logging disabled)"
fi

# Check cache is working
if php artisan tinker --execute="Cache::put('test', 'value', 60); echo Cache::get('test');" 2>&1 | grep -q "value"; then
    check_pass "Cache system working"
else
    check_warn "Cache not working (will impact performance)"
fi

echo ""
echo "🎨 2. FRONTEND CHECKS"
echo "-------------------"

cd ../frontend

# Check TypeScript compilation
if npm run build > /tmp/build.log 2>&1; then
    check_pass "TypeScript build successful"
else
    check_fail "TypeScript build failed"
    cat /tmp/build.log | tail -20
fi

# Check DailyOperationsView component exists
if [ -f "src/pages/Dashboard/DailyOperationsView.tsx" ]; then
    check_pass "DailyOperationsView component exists"
else
    check_fail "DailyOperationsView component missing"
fi

# Check types defined
if grep -q "DailyOperationsData" src/types/index.ts; then
    check_pass "TypeScript types defined"
else
    check_fail "Missing DailyOperationsData type"
fi

# Check service method exists
if grep -q "dailyOperations" src/services/index.ts; then
    check_pass "API service method defined"
else
    check_fail "Missing dailyOperations service method"
fi

echo ""
echo "🔐 3. SECURITY CHECKS"
echo "-------------------"

cd ../backend

# Check rate limiting in routes
if grep -q "throttle.*daily" routes/api.php; then
    check_pass "Rate limiting configured"
else
    check_warn "Rate limiting not explicitly set"
fi

# Check authorization in controller
if grep -q "ceo.*director" app/Http/Controllers/Api/DashboardController.php | grep -q "dailyOperations"; then
    check_pass "CEO/Director authorization enforced"
else
    check_fail "Missing role-based authorization"
fi

# Check input validation
if grep -q "parse.*date" app/Http/Controllers/Api/DashboardController.php; then
    check_pass "Date input validation present"
else
    check_warn "Input validation might be missing"
fi

echo ""
echo "⚡ 4. PERFORMANCE CHECKS"
echo "----------------------"

# Check indexes exist
INDEXES=$(php artisan tinker --execute="
\$tables = ['work_items', 'orders', 'order_checklists'];
\$count = 0;
foreach (\$tables as \$table) {
    \$indexes = DB::select(\"SHOW INDEX FROM \$table WHERE Key_name LIKE 'idx_%'\");
    \$count += count(\$indexes);
}
echo \$count;
" 2>/dev/null)

if [ "$INDEXES" -gt 5 ]; then
    check_pass "Database indexes applied ($INDEXES indexes found)"
else
    check_fail "Missing database indexes (found $INDEXES, expected 7+)"
fi

# Check caching implementation
if grep -q "Cache::remember" app/Http/Controllers/Api/DashboardController.php; then
    check_pass "Caching implemented"
else
    check_warn "No caching found (may impact performance)"
fi

# Check bulk loading (no N+1)
if grep -q "whereIn.*project.*pluck" app/Http/Controllers/Api/DashboardController.php; then
    check_pass "Bulk loading implemented (N+1 prevented)"
else
    check_fail "Potential N+1 query problem"
fi

echo ""
echo "♿ 5. ACCESSIBILITY CHECKS"
echo "------------------------"

cd ../frontend

# Check aria labels
if grep -q "aria-label" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "ARIA labels present"
else
    check_warn "Missing ARIA labels"
fi

# Check sr-only labels
if grep -q "sr-only" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "Screen reader labels present"
else
    check_warn "Missing screen reader support"
fi

echo ""
echo "📊 6. FEATURE COMPLETENESS"
echo "-------------------------"

# Check date navigation
if grep -q "changeDate\|ChevronLeft\|ChevronRight" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "Date navigation implemented"
else
    check_fail "Date navigation missing"
fi

# Check CSV export
if grep -q "exportToCSV\|Download" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "CSV export implemented"
else
    check_warn "CSV export not found"
fi

# Check error handling
if grep -q "error.*setError\|catch.*error" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "Error handling implemented"
else
    check_fail "Missing error handling"
fi

# Check loading states
if grep -q "loading.*setLoading" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "Loading states implemented"
else
    check_fail "Missing loading states"
fi

# Check filters
if grep -q "filterCountry\|filterDept" src/pages/Dashboard/DailyOperationsView.tsx; then
    check_pass "Filters implemented"
else
    check_warn "Filters not found"
fi

echo ""
echo "=========================================================="
echo "📋 SUMMARY"
echo "=========================================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED - READY FOR PRODUCTION!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to staging environment"
    echo "2. Test with real CEO account"
    echo "3. Monitor for 24 hours"
    echo "4. Deploy to production"
    echo ""
    echo "📝 See DAILY_OPERATIONS_PRODUCTION_READY.md for deployment guide"
    exit 0
else
    echo -e "${RED}❌ FAILED - FIX ISSUES BEFORE DEPLOYMENT${NC}"
    echo ""
    echo "Review failed checks above and fix before deploying."
    exit 1
fi
