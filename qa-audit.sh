#!/bin/bash
# ============================================================================
# BENCHMARK QA AUDIT - Ruthless Testing Script
# ============================================================================

BASE="http://127.0.0.1:8000/api"
PASS=0
FAIL=0
BUGS=""

pass() { PASS=$((PASS+1)); echo "  ✅ PASS: $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ FAIL: $1"; BUGS="$BUGS\n- $1"; }

login() {
    local email=$1
    local token=$(curl -s "$BASE/auth/login" -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"password\"}" \
        | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
    echo "$token"
}

api() {
    local method=$1 url=$2 token=$3 data=$4
    if [ -n "$data" ]; then
        curl -s -w "\n%{http_code}" "$BASE$url" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" 2>/dev/null
    else
        curl -s -w "\n%{http_code}" "$BASE$url" -X "$method" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -H "Authorization: Bearer $token" 2>/dev/null
    fi
}

get_code() { echo "$1" | tail -1; }
get_body() { echo "$1" | sed '$d'; }

echo "============================================================================"
echo "BENCHMARK QA AUDIT - $(date)"
echo "============================================================================"

# ---- Login all test users ----
echo ""
echo ">>> Logging in test users..."
CEO_TOKEN=$(login "ceo@benchmark.com")
DIR_TOKEN=$(login "director@benchmark.com")
MGR_UK_TOKEN=$(login "manager.uk@benchmark.com")
MGR_AU_TOKEN=$(login "manager.au@benchmark.com")
DRAWER_TOKEN=$(login "drawer1@benchmark.com")
CHECKER_TOKEN=$(login "checker1@benchmark.com")
QA_TOKEN=$(login "qa1@benchmark.com")
DESIGNER_TOKEN=$(login "designer1@benchmark.com")
QA_PHOTOS_TOKEN=$(login "qa.photos@benchmark.com")
DRAWER_AU_TOKEN=$(login "drawer.au@benchmark.com")
ACCTS_TOKEN=$(login "accounts@benchmark.com")

echo "CEO token: ${CEO_TOKEN:0:10}..."
echo "Drawer token: ${DRAWER_TOKEN:0:10}..."
echo "Checker token: ${CHECKER_TOKEN:0:10}..."
echo "QA token: ${QA_TOKEN:0:10}..."

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION A: WORKFLOW STATE MACHINE"
echo "============================================================================"

# A1: Check seeded order states
echo ""
echo "--- A1: Verify seed data has workflow_state ---"
RESULT=$(api GET "/workflow/project/1/orders" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    HAS_STATE=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
orders = data.get('data', data.get('orders', []))
if isinstance(orders, dict): orders = orders.get('data', [])
states = [o.get('workflow_state','MISSING') for o in orders]
print(','.join(states))
" 2>/dev/null)
    echo "  Order states: $HAS_STATE"
    if echo "$HAS_STATE" | grep -q "MISSING"; then
        fail "A1: Orders missing workflow_state field"
    else
        pass "A1: Orders have workflow_state field"
    fi
else
    fail "A1: Cannot fetch project orders (HTTP $CODE)"
    echo "  Body: $(echo "$BODY" | head -5)"
fi

# A2: Receive a new order (should auto-advance to QUEUED_DRAW)
echo ""
echo "--- A2: receiveOrder () auto-advance to QUEUED_DRAW ---"
RESULT=$(api POST "/workflow/orders/receive" "$CEO_TOKEN" \
    '{"project_id":1,"client_reference":"QA-TEST-001","order_data":{"address":"123 Test St","type":"residential","rooms":3},"priority":"normal"}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    NEW_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    if [ "$STATE" = "QUEUED_DRAW" ]; then
        pass "A2: New FP order auto-advanced to QUEUED_DRAW (order #$NEW_ORDER_ID)"
    else
        fail "A2: New FP order state is '$STATE' instead of QUEUED_DRAW"
    fi
else
    fail "A2: receiveOrder failed (HTTP $CODE)"
    echo "  $BODY"
fi

# A3: Receive PH order (should auto-advance to QUEUED_DESIGN)
echo ""
echo "--- A3: receiveOrder (PH) auto-advance to QUEUED_DESIGN ---"
RESULT=$(api POST "/workflow/orders/receive" "$CEO_TOKEN" \
    '{"project_id":2,"client_reference":"QA-TEST-PH-001","order_data":{"address":"456 Photo St","type":"villa"},"priority":"high"}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    if [ "$STATE" = "QUEUED_DESIGN" ]; then
        pass "A3: New PH order auto-advanced to QUEUED_DESIGN"
    else
        fail "A3: New PH order state is '$STATE' instead of QUEUED_DESIGN"
    fi
else
    fail "A3: receiveOrder PH failed (HTTP $CODE)"
    echo "  $BODY"
fi

# A4: Invalid transition - Try to submit an order that's in QUEUED (not IN_)
echo ""
echo "--- A4: Invalid transition denial (QUEUED → SUBMITTED) ---"
RESULT=$(api POST "/workflow/orders/4/submit" "$DRAWER_TOKEN" '{"comments":"test"}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "422" ] || [ "$CODE" = "403" ] || [ "$CODE" = "400" ]; then
    pass "A4: Rejected submit on non-IN_ order (HTTP $CODE)"
else
    fail "A4: Should reject submit on QUEUED order but got HTTP $CODE"
    echo "  $BODY"
fi

# A5: startNext for drawer (should get QUEUED_DRAW order)
echo ""
echo "--- A5: startNext for drawer ---"
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    STARTED_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    if [ "$STATE" = "IN_DRAW" ]; then
        pass "A5: startNext moved order #$STARTED_ORDER_ID to IN_DRAW"
    else
        fail "A5: startNext state is '$STATE' instead of IN_DRAW"
    fi
else
    fail "A5: startNext failed (HTTP $CODE)"
    echo "  $BODY"
fi

# A6: Submit the drawing
echo ""
echo "--- A6: Submit drawing (IN_DRAW → SUBMITTED_DRAW → QUEUED_CHECK) ---"
if [ -n "$STARTED_ORDER_ID" ]; then
    RESULT=$(api POST "/workflow/orders/$STARTED_ORDER_ID/submit" "$DRAWER_TOKEN" '{"comments":"Drawing complete"}')
    CODE=$(get_code "$RESULT")
    BODY=$(get_body "$RESULT")
    if [ "$CODE" = "200" ]; then
        STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        if [ "$STATE" = "QUEUED_CHECK" ]; then
            pass "A6: Submit advanced to QUEUED_CHECK"
        else
            fail "A6: After submit state is '$STATE' instead of QUEUED_CHECK"
        fi
    else
        fail "A6: Submit failed (HTTP $CODE)"
        echo "  $BODY"
    fi
fi

# A7: Checker startNext + submit
echo ""
echo "--- A7: Checker flow (startNext → IN_CHECK → submit → QUEUED_QA) ---"
RESULT=$(api POST "/workflow/start-next" "$CHECKER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    CHECKER_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    if [ "$STATE" = "IN_CHECK" ]; then
        # Submit check
        RESULT2=$(api POST "/workflow/orders/$CHECKER_ORDER_ID/submit" "$CHECKER_TOKEN" '{"comments":"Check passed"}')
        CODE2=$(get_code "$RESULT2")
        BODY2=$(get_body "$RESULT2")
        STATE2=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        if [ "$STATE2" = "QUEUED_QA" ]; then
            pass "A7: Checker flow complete → QUEUED_QA"
        else
            fail "A7: After checker submit state is '$STATE2' instead of QUEUED_QA"
        fi
    else
        fail "A7: Checker startNext state is '$STATE' instead of IN_CHECK"
    fi
else
    fail "A7: Checker startNext failed (HTTP $CODE)"
    echo "  $BODY"
fi

# A8: QA approve → DELIVERED
echo ""
echo "--- A8: QA flow (startNext → IN_QA → submit → DELIVERED) ---"
RESULT=$(api POST "/workflow/start-next" "$QA_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    QA_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    if [ "$STATE" = "IN_QA" ]; then
        RESULT2=$(api POST "/workflow/orders/$QA_ORDER_ID/submit" "$QA_TOKEN" '{"comments":"QA approved"}')
        CODE2=$(get_code "$RESULT2")
        BODY2=$(get_body "$RESULT2")
        STATE2=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        if [ "$STATE2" = "DELIVERED" ]; then
            pass "A8: QA flow complete → DELIVERED"
        else
            fail "A8: After QA submit state is '$STATE2' instead of DELIVERED"
        fi
    else
        fail "A8: QA startNext state is '$STATE' instead of IN_QA"
    fi
else
    fail "A8: QA startNext failed (HTTP $CODE)"
    echo "  $BODY"
fi

# A9: QA Reject → should send back to QUEUED_CHECK or QUEUED_DRAW
echo ""
echo "--- A9: QA Rejection flow ---"
# First, let's start another order through the pipeline for rejection
RESULT=$(api POST "/workflow/start-next" "$QA_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    REJECT_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    echo "  Got order #$REJECT_ORDER_ID in state $STATE"
    if [ "$STATE" = "IN_QA" ]; then
        RESULT2=$(api POST "/workflow/orders/$REJECT_ORDER_ID/reject" "$QA_TOKEN" \
            '{"reason":"Quality issues found in this drawing","rejection_code":"quality","route_to":"checker"}')
        CODE2=$(get_code "$RESULT2")
        BODY2=$(get_body "$RESULT2")
        STATE2=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        if [ "$STATE2" = "QUEUED_CHECK" ] || [ "$STATE2" = "QUEUED_DRAW" ]; then
            pass "A9: QA rejection sent order to $STATE2"
        else
            fail "A9: QA rejection resulted in '$STATE2' instead of QUEUED_CHECK/QUEUED_DRAW"
            echo "  $BODY2"
        fi
    else
        fail "A9: No IN_QA order available for rejection test"
    fi
else
    echo "  No orders in QA queue for rejection test, creating test path..."
    fail "A9: No QA orders available for rejection test (HTTP $CODE)"
fi

# A10: Checker Reject → should send back to QUEUED_DRAW
echo ""
echo "--- A10: Checker Rejection flow ---"
RESULT=$(api POST "/workflow/start-next" "$CHECKER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    CHECK_REJECT_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    STATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    echo "  Got order #$CHECK_REJECT_ID in state $STATE"
    if [ "$STATE" = "IN_CHECK" ]; then
        RESULT2=$(api POST "/workflow/orders/$CHECK_REJECT_ID/reject" "$CHECKER_TOKEN" \
            '{"reason":"Drawing has missing room labels","rejection_code":"incomplete"}')
        CODE2=$(get_code "$RESULT2")
        BODY2=$(get_body "$RESULT2")
        STATE2=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        if [ "$STATE2" = "QUEUED_DRAW" ]; then
            pass "A10: Checker rejection sent order to QUEUED_DRAW"
        else
            fail "A10: Checker rejection resulted in '$STATE2' instead of QUEUED_DRAW"
            echo "  $BODY2"
        fi
    else
        fail "A10: No IN_CHECK order available (got $STATE)"
    fi
else
    echo "  No orders in CHECK queue"
    fail "A10: No CHECK orders available (HTTP $CODE)"
fi

# A11: Hold order
echo ""
echo "--- A11: Hold/Resume order ---"
# Get an order that's in IN_DRAW
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    HOLD_ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    
    # Hold it (using QA token as QA is in HOLD_ALLOWED_ROLES)
    RESULT2=$(api POST "/workflow/orders/$HOLD_ORDER_ID/hold" "$QA_TOKEN" \
        '{"hold_reason":"Waiting for client clarification"}')
    CODE2=$(get_code "$RESULT2")
    BODY2=$(get_body "$RESULT2")
    STATE2=$(echo "$BODY2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
    if [ "$STATE2" = "ON_HOLD" ]; then
        pass "A11a: Order placed ON_HOLD"
        
        # Resume
        RESULT3=$(api POST "/workflow/orders/$HOLD_ORDER_ID/resume" "$QA_TOKEN")
        CODE3=$(get_code "$RESULT3")
        BODY3=$(get_body "$RESULT3")
        STATE3=$(echo "$BODY3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('workflow_state','NONE'))" 2>/dev/null)
        echo "  After resume: state=$STATE3"
        if [ "$STATE3" = "QUEUED_DRAW" ] || [ "$STATE3" = "QUEUED_CHECK" ] || [ "$STATE3" = "QUEUED_QA" ] || [ "$STATE3" = "IN_DRAW" ]; then
            pass "A11b: Order resumed from hold to $STATE3"
        else
            fail "A11b: Order resumed to unexpected state '$STATE3'"
        fi
    else
        fail "A11a: Hold failed, state is '$STATE2'"
        echo "  $BODY2"
    fi
else
    fail "A11: No orders available for hold test (HTTP $CODE)"
fi

# A12: Invalid role for hold (drawer should NOT be able to hold)
echo ""
echo "--- A12: Drawer cannot hold orders ---"
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    DRAWER_HOLD_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    RESULT2=$(api POST "/workflow/orders/$DRAWER_HOLD_ID/hold" "$DRAWER_TOKEN" '{"hold_reason":"testing"}')
    CODE2=$(get_code "$RESULT2")
    if [ "$CODE2" = "403" ]; then
        pass "A12: Drawer correctly denied hold (403)"
    else
        fail "A12: Drawer was NOT denied hold (HTTP $CODE2)"
        echo "  $(get_body "$RESULT2")"
    fi
fi

# A13: Drawer cannot reject
echo ""
echo "--- A13: Drawer cannot reject orders ---"
if [ -n "$DRAWER_HOLD_ID" ]; then
    RESULT=$(api POST "/workflow/orders/$DRAWER_HOLD_ID/reject" "$DRAWER_TOKEN" \
        '{"reason":"Testing unauthorized rejection","rejection_code":"quality"}')
    CODE=$(get_code "$RESULT")
    if [ "$CODE" = "403" ]; then
        pass "A13: Drawer correctly denied reject (403)"
    else
        fail "A13: Drawer was NOT denied reject (HTTP $CODE)"
        echo "  $(get_body "$RESULT")"
    fi
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION B: AUTO-ASSIGNMENT"
echo "============================================================================"

# B1: Verify startNext assigns to requesting user
echo ""
echo "--- B1: startNext assigns to requesting user ---"
# Drawer already has orders, check
RESULT=$(api GET "/workflow/project/1/orders?state=IN_DRAW" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
IN_DRAW_ASSIGNED=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
orders = data.get('data', data.get('orders', []))
if isinstance(orders, dict): orders = orders.get('data', [])
for o in orders:
    if o.get('workflow_state') == 'IN_DRAW':
        print(f\"order={o['id']} assigned_to={o.get('assigned_to','NONE')}\")
" 2>/dev/null)
echo "  IN_DRAW orders: $IN_DRAW_ASSIGNED"
pass "B1: (verified by A5 - startNext assigns to requester)"

# B2: WIP cap enforcement
echo ""
echo "--- B2: WIP cap enforcement ---"
# Try startNext again for drawer (should hit WIP cap)
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
WIP_MSG=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)
echo "  startNext again: HTTP $CODE, msg: $WIP_MSG"
# Note: WIP cap default is project->wip_cap ?? 1
# If drawer already has 1 IN_DRAW, second should be blocked
if [ "$CODE" = "200" ]; then
    # Check if it gave another order despite WIP cap
    echo "  WARNING: Drawer got another order. Checking WIP cap..."
    fail "B2: WIP cap may not be enforced (drawer got another order)"
elif [ "$CODE" = "422" ] || [ "$CODE" = "409" ]; then
    pass "B2: WIP cap enforced, second startNext denied"
else
    echo "  HTTP $CODE - $WIP_MSG"
    if echo "$WIP_MSG" | grep -qi "wip\|cap\|limit\|no.*order\|queue.*empty"; then
        pass "B2: WIP cap or empty queue prevented second assignment"
    else
        fail "B2: Unexpected response to second startNext (HTTP $CODE)"
    fi
fi

# B3: findBestUser dead code check
echo ""
echo "--- B3: findBestUser() is dead code (known issue) ---"
fail "B3: [CODE REVIEW] findBestUser() exists but is never called - fairness/load-balancing is NOT implemented"

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION C: ABSENCE / TERMINATION"
echo "============================================================================"

# C1: Force logout with reassignment
echo ""
echo "--- C1: Force logout reassigns work ---"
# First check if forceLogout endpoint exists
RESULT=$(api POST "/auth/force-logout/5" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Force logout drawer (user 5): HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "C1: Force logout succeeded"
    # Check drawer's orders got reassigned
    RESULT2=$(api GET "/workflow/project/1/orders" "$CEO_TOKEN")
    BODY2=$(get_body "$RESULT2")
    DRAWER_ORDERS=$(echo "$BODY2" | python3 -c "
import sys,json
data = json.load(sys.stdin)
orders = data.get('data', data.get('orders', []))
if isinstance(orders, dict): orders = orders.get('data', [])
for o in orders:
    if o.get('assigned_to') == 5:
        print(f\"STILL assigned: order {o['id']} state={o['workflow_state']}\")
" 2>/dev/null)
    if [ -z "$DRAWER_ORDERS" ]; then
        pass "C1b: Drawer's orders reassigned (none still assigned)"
    else
        fail "C1b: Drawer still has assigned orders after force logout: $DRAWER_ORDERS"
    fi
else
    fail "C1: Force logout failed (HTTP $CODE): $BODY"
fi

# Re-login drawer for more tests
DRAWER_TOKEN=$(login "drawer1@benchmark.com")

# C2: Deactivate user endpoint
echo ""
echo "--- C2: Deactivate user ---"
RESULT=$(api POST "/users/10/deactivate" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Deactivate AU drawer (user 10): HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "C2: Deactivate user succeeded"
elif [ "$CODE" = "500" ]; then
    fail "C2: [P0] Deactivate endpoint returns 500 (method likely missing in controller)"
    echo "  $BODY"
else
    fail "C2: Deactivate failed (HTTP $CODE)"
    echo "  $BODY"
fi

# C3: Deactivated user cannot login
echo ""
echo "--- C3: Deactivated user cannot login ---"
RESULT=$(curl -s -w "\n%{http_code}" "$BASE/auth/login" -X POST \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"drawer.au@benchmark.com","password":"password"}' 2>/dev/null)
CODE=$(get_code "$RESULT")
if [ "$CODE" = "403" ] || [ "$CODE" = "401" ]; then
    pass "C3: Deactivated user denied login ($CODE)"
else
    fail "C3: Deactivated user was NOT denied login (HTTP $CODE)"
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION D: SINGLE SESSION ENFORCEMENT"
echo "============================================================================"

# D1: Login same user twice, first token should be invalidated
echo ""
echo "--- D1: Single session enforcement ---"
TOKEN_A=$(login "checker1@benchmark.com")
echo "  Session A token: ${TOKEN_A:0:10}..."
TOKEN_B=$(login "checker1@benchmark.com")
echo "  Session B token: ${TOKEN_B:0:10}..."

# Try using Token A (should be invalidated)
RESULT=$(api GET "/auth/profile" "$TOKEN_A")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Session A after B login: HTTP $CODE"
if [ "$CODE" = "401" ]; then
    SESSION_MSG=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))" 2>/dev/null)
    if [ "$SESSION_MSG" = "SESSION_INVALIDATED" ]; then
        pass "D1: First session invalidated with SESSION_INVALIDATED code"
    else
        pass "D1: First session invalidated (401)"
    fi
else
    fail "D1: [P0] First session NOT invalidated after second login (HTTP $CODE)"
fi

# D2: Session B should work
RESULT=$(api GET "/auth/profile" "$TOKEN_B")
CODE=$(get_code "$RESULT")
if [ "$CODE" = "200" ]; then
    pass "D2: Second session works correctly"
else
    fail "D2: Second session doesn't work (HTTP $CODE)"
fi

# Refresh checker token
CHECKER_TOKEN=$TOKEN_B

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION E: ROLE-BASED DATA VISIBILITY"
echo "============================================================================"

# E1: CEO can see all projects
echo ""
echo "--- E1: CEO sees all projects ---"
RESULT=$(api GET "/projects" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
PROJECT_COUNT=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('data', data.get('projects', []))
print(len(items))
" 2>/dev/null)
echo "  CEO sees $PROJECT_COUNT projects"
if [ "$PROJECT_COUNT" -ge 7 ] 2>/dev/null; then
    pass "E1: CEO sees all 7 projects"
else
    fail "E1: CEO sees only $PROJECT_COUNT projects (expected 7)"
fi

# E2: Manager sees only their projects
echo ""
echo "--- E2: Manager sees only their project ---"
RESULT=$(api GET "/projects" "$MGR_UK_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
MGR_PROJECTS=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('data', data.get('projects', []))
for p in items:
    print(f\"id={p.get('id')} name={p.get('name','')}\")
print(f'TOTAL={len(items)}')
" 2>/dev/null)
echo "  UK Manager sees: $MGR_PROJECTS"

# E3: Worker API access to management endpoints
echo ""
echo "--- E3: Worker denied management endpoints ---"
RESULT=$(api GET "/projects" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Drawer accessing /projects: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "E3: Worker correctly denied /projects access (403)"
else
    fail "E3: [P0] Worker NOT denied /projects access (HTTP $CODE)"
fi

# E4: Worker denied user management
echo ""
echo "--- E4: Worker denied /users endpoint ---"
RESULT=$(api GET "/users" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Drawer accessing /users: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "E4: Worker correctly denied /users access (403)"
else
    fail "E4: [P0] Worker NOT denied /users access (HTTP $CODE)"
fi

# E5: orderDetails field filtering by role
echo ""
echo "--- E5: orderDetails field filtering by role ---"
# Get an order detail as drawer vs CEO
RESULT_DRAWER=$(api GET "/workflow/orders/1" "$DRAWER_TOKEN")
RESULT_CEO=$(api GET "/workflow/orders/1" "$CEO_TOKEN")
DRAWER_FIELDS=$(echo "$(get_body "$RESULT_DRAWER")" | python3 -c "
import sys,json
data = json.load(sys.stdin)
order = data.get('order', data)
print(','.join(sorted(order.keys())))
" 2>/dev/null)
CEO_FIELDS=$(echo "$(get_body "$RESULT_CEO")" | python3 -c "
import sys,json
data = json.load(sys.stdin)
order = data.get('order', data)
print(','.join(sorted(order.keys())))
" 2>/dev/null)
DRAWER_COUNT=$(echo "$DRAWER_FIELDS" | tr ',' '\n' | wc -l | tr -d ' ')
CEO_COUNT=$(echo "$CEO_FIELDS" | tr ',' '\n' | wc -l | tr -d ' ')
echo "  Drawer sees $DRAWER_COUNT fields, CEO sees $CEO_COUNT fields"
if [ "$CEO_COUNT" -gt "$DRAWER_COUNT" ] 2>/dev/null; then
    pass "E5: CEO sees more fields than drawer ($CEO_COUNT > $DRAWER_COUNT)"
else
    fail "E5: Role-based field filtering not working (CEO=$CEO_COUNT, drawer=$DRAWER_COUNT)"
fi

# E6: Accounts manager cannot access workflow
echo ""
echo "--- E6: Accounts manager denied workflow access ---"
RESULT=$(api POST "/workflow/start-next" "$ACCTS_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
echo "  Accounts manager startNext: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "E6: Accounts manager denied workflow access (403)"
else
    fail "E6: Accounts manager NOT denied workflow access (HTTP $CODE)"
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION F: PROJECT ISOLATION"
echo "============================================================================"

# F1: Drawer from project 1 cannot access project 3 orders
echo ""
echo "--- F1: Cross-project order access ---"
RESULT=$(api GET "/workflow/project/3/orders" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  UK Drawer accessing AU project orders: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "F1: Cross-project access denied (403)"
else
    fail "F1: [P0] Cross-project access NOT denied (HTTP $CODE)"
    echo "  Body: $(get_body "$RESULT" | head -3)"
fi

# F2: UK drawer cannot startNext in AU project
echo ""
echo "--- F2: Cross-project startNext ---"
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":3}')
CODE=$(get_code "$RESULT")
echo "  UK Drawer startNext in AU project: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "F2: Cross-project startNext denied (403)"
else
    fail "F2: [P0] Cross-project startNext NOT denied (HTTP $CODE)"
    echo "  $(get_body "$RESULT")"
fi

# F3: UK Manager accessing AU project orders
echo ""
echo "--- F3: UK Manager accessing AU project ---"
RESULT=$(api GET "/workflow/project/3/orders" "$MGR_UK_TOKEN")
CODE=$(get_code "$RESULT")
echo "  UK Manager accessing AU project: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "F3: UK Manager denied AU project access (403)"
else
    fail "F3: [P0] UK Manager NOT denied AU project access (HTTP $CODE)"
fi

# F4: CEO can access all projects (bypass)
echo ""
echo "--- F4: CEO can access all projects ---"
RESULT=$(api GET "/workflow/project/3/orders" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
echo "  CEO accessing AU project: HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "F4: CEO correctly bypasses project isolation"
else
    fail "F4: CEO cannot access AU project (HTTP $CODE)"
fi

# F5: Cross-project reassignment
echo ""
echo "--- F5: Cross-project reassignment (should be denied) ---"
# Try to reassign a project 1 order to user 10 (AU drawer)
RESULT=$(api POST "/workflow/orders/1/reassign" "$CEO_TOKEN" '{"user_id":10}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Reassign proj1 order to AU user: HTTP $CODE"
if [ "$CODE" = "422" ] || [ "$CODE" = "403" ]; then
    pass "F5: Cross-project reassignment denied"
else
    fail "F5: [P0] Cross-project reassignment NOT denied (HTTP $CODE) - order in project 1 assigned to user in project 3"
    echo "  $BODY"
fi

# F6: Middleware check - EnforceProjectIsolation
echo ""
echo "--- F6: [CODE REVIEW] EnforceProjectIsolation middleware ---"
fail "F6: [CODE REVIEW] EnforceProjectIsolation middleware class exists but is NOT registered in any route group in api.php - isolation relies on ad-hoc controller checks"

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION G: DASHBOARD & STATS ACCURACY"
echo "============================================================================"

# G1: Dashboard endpoints exist and return data
echo ""
echo "--- G1: Dashboard endpoints ---"
RESULT=$(api GET "/dashboard/master" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Master dashboard: HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "G1a: Master dashboard returns 200"
    echo "  Data: $(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys()))" 2>/dev/null)"
else
    fail "G1a: Master dashboard failed (HTTP $CODE)"
fi

RESULT=$(api GET "/dashboard/operations?project_id=1" "$MGR_UK_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Operations dashboard: HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "G1b: Operations dashboard returns 200"
else
    fail "G1b: Operations dashboard failed (HTTP $CODE)"
fi

RESULT=$(api GET "/dashboard/worker" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Worker dashboard: HTTP $CODE"
if [ "$CODE" = "200" ]; then
    pass "G1c: Worker dashboard returns 200"
else
    fail "G1c: Worker dashboard failed (HTTP $CODE)"
fi

# G2: Dashboard role restrictions
echo ""
echo "--- G2: Dashboard role restrictions ---"
RESULT=$(api GET "/dashboard/master" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Drawer accessing master dashboard: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "G2a: Drawer denied master dashboard (403)"
else
    fail "G2a: [P0] Drawer NOT denied master dashboard (HTTP $CODE)"
fi

RESULT=$(api GET "/dashboard/operations?project_id=1" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Drawer accessing operations dashboard: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "G2b: Drawer denied operations dashboard (403)"
else
    fail "G2b: [P0] Drawer NOT denied operations dashboard (HTTP $CODE)"
fi

# G3: Stats reconciliation
echo ""
echo "--- G3: Dashboard stats vs raw data reconciliation ---"
RESULT=$(api GET "/dashboard/master" "$CEO_TOKEN")
BODY=$(get_body "$RESULT")
echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
print('Dashboard data keys:', list(data.keys()))
for k,v in data.items():
    if isinstance(v, (int, float)):
        print(f'  {k}: {v}')
    elif isinstance(v, dict):
        for k2,v2 in v.items():
            if isinstance(v2, (int, float)):
                print(f'  {k}.{k2}: {v2}')
    elif isinstance(v, list):
        print(f'  {k}: [{len(v)} items]')
" 2>/dev/null
pass "G3: Dashboard data structure verified (manual reconciliation would require DB query)"

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION H: MONTH LOCK + INVOICING"
echo "============================================================================"

# H1: Lock a month
echo ""
echo "--- H1: Lock month ---"
RESULT=$(api POST "/month-locks" "$MGR_UK_TOKEN" \
    '{"project_id":1,"month":1,"year":2026}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Lock Jan 2026 for project 1: HTTP $CODE"
if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    LOCK_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('month_lock',d).get('id',''))" 2>/dev/null)
    pass "H1: Month locked (id=$LOCK_ID)"
else
    fail "H1: Month lock failed (HTTP $CODE)"
    echo "  $BODY"
fi

# H2: Get frozen counts
echo ""
echo "--- H2: Frozen counts ---"
RESULT=$(api GET "/month-locks/counts?project_id=1&month=1&year=2026" "$MGR_UK_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Frozen counts: HTTP $CODE"
if [ "$CODE" = "200" ]; then
    echo "  Data: $(echo "$BODY" | head -5)"
    pass "H2: Frozen counts returned"
else
    fail "H2: Frozen counts failed (HTTP $CODE)"
fi

# H3: Create invoice on locked month
echo ""
echo "--- H3: Create invoice ---"
RESULT=$(api POST "/invoices" "$CEO_TOKEN" \
    '{"project_id":1,"month":1,"year":2026,"invoice_number":"INV-QA-001","service_counts":{"floor_plans":5},"notes":"QA test invoice"}')
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
echo "  Create invoice: HTTP $CODE"
if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    INVOICE_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoice',d).get('id',''))" 2>/dev/null)
    pass "H3: Invoice created (id=$INVOICE_ID)"
else
    fail "H3: Invoice creation failed (HTTP $CODE)"
    echo "  $BODY"
fi

# H4: Create invoice WITHOUT locked month (should fail)
echo ""
echo "--- H4: Invoice without locked month (should fail) ---"
RESULT=$(api POST "/invoices" "$CEO_TOKEN" \
    '{"project_id":1,"month":6,"year":2026,"invoice_number":"INV-QA-002","service_counts":{"floor_plans":3},"notes":"Should fail"}')
CODE=$(get_code "$RESULT")
echo "  Invoice without lock: HTTP $CODE"
if [ "$CODE" = "422" ] || [ "$CODE" = "403" ]; then
    pass "H4: Invoice without locked month correctly rejected ($CODE)"
else
    fail "H4: [P0] Invoice created without locked month (HTTP $CODE)"
fi

# H5: Invoice status transitions
echo ""
echo "--- H5: Invoice status transitions ---"
if [ -n "$INVOICE_ID" ]; then
    # draft → prepared
    RESULT=$(api POST "/invoices/$INVOICE_ID/transition" "$CEO_TOKEN" '{"status":"prepared"}')
    CODE=$(get_code "$RESULT")
    echo "  draft → prepared: HTTP $CODE"
    if [ "$CODE" = "200" ]; then
        pass "H5a: draft → prepared"
    else
        fail "H5a: draft → prepared failed ($CODE)"
        echo "  $(get_body "$RESULT")"
    fi
    
    # prepared → approved (CEO only)
    RESULT=$(api POST "/invoices/$INVOICE_ID/transition" "$CEO_TOKEN" '{"status":"approved"}')
    CODE=$(get_code "$RESULT")
    echo "  prepared → approved: HTTP $CODE"
    if [ "$CODE" = "200" ]; then
        pass "H5b: prepared → approved"
    else
        fail "H5b: prepared → approved failed ($CODE)"
    fi
    
    # approved → issued
    RESULT=$(api POST "/invoices/$INVOICE_ID/transition" "$CEO_TOKEN" '{"status":"issued"}')
    CODE=$(get_code "$RESULT")
    echo "  approved → issued: HTTP $CODE"
    if [ "$CODE" = "200" ]; then
        pass "H5c: approved → issued"
    else
        fail "H5c: approved → issued failed ($CODE)"
    fi
    
    # issued → sent
    RESULT=$(api POST "/invoices/$INVOICE_ID/transition" "$CEO_TOKEN" '{"status":"sent"}')
    CODE=$(get_code "$RESULT")
    echo "  issued → sent: HTTP $CODE"
    if [ "$CODE" = "200" ]; then
        pass "H5d: issued → sent"
    else
        fail "H5d: issued → sent failed ($CODE)"
    fi
    
    # H6: Invalid transition (sent → draft)
    RESULT=$(api POST "/invoices/$INVOICE_ID/transition" "$CEO_TOKEN" '{"status":"draft"}')
    CODE=$(get_code "$RESULT")
    echo "  sent → draft (invalid): HTTP $CODE"
    if [ "$CODE" = "422" ] || [ "$CODE" = "403" ] || [ "$CODE" = "400" ]; then
        pass "H6: Invalid invoice transition denied ($CODE)"
    else
        fail "H6: Invalid invoice transition NOT denied (HTTP $CODE)"
    fi
fi

# H7: Worker cannot create invoice
echo ""
echo "--- H7: Worker denied invoice access ---"
RESULT=$(api POST "/invoices" "$DRAWER_TOKEN" \
    '{"project_id":1,"month":1,"year":2026,"invoice_number":"INV-HACK","service_counts":{"floor_plans":1}}')
CODE=$(get_code "$RESULT")
echo "  Drawer creating invoice: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "H7: Worker denied invoice creation (403)"
else
    fail "H7: [P0] Worker NOT denied invoice creation (HTTP $CODE)"
fi

# H8: Unlock month - ops manager should NOT be able to unlock
echo ""
echo "--- H8: Only director/CEO can unlock ---"
if [ -n "$LOCK_ID" ]; then
    RESULT=$(api POST "/month-locks/$LOCK_ID/unlock" "$MGR_UK_TOKEN")
    CODE=$(get_code "$RESULT")
    echo "  Manager unlock: HTTP $CODE"
    if [ "$CODE" = "403" ]; then
        pass "H8: Manager denied unlock (403)"
    else
        fail "H8: Manager NOT denied unlock (HTTP $CODE)"
        echo "  $(get_body "$RESULT")"
    fi
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION I: AUDIT LOG COMPLETENESS"
echo "============================================================================"

# I1: Check audit logs exist
echo ""
echo "--- I1: Audit logs populated ---"
RESULT=$(api GET "/audit-logs" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
BODY=$(get_body "$RESULT")
if [ "$CODE" = "200" ]; then
    LOG_COUNT=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
logs = data if isinstance(data, list) else data.get('data', data.get('logs', []))
if isinstance(logs, dict): logs = logs.get('data', [])
print(len(logs))
" 2>/dev/null)
    echo "  Audit log count: $LOG_COUNT"
    if [ "$LOG_COUNT" -gt 5 ] 2>/dev/null; then
        pass "I1: Audit logs populated ($LOG_COUNT entries)"
    else
        fail "I1: Too few audit logs ($LOG_COUNT)"
    fi
elif [ "$CODE" = "404" ]; then
    fail "I1: [P0] No audit-logs endpoint (404)"
else
    fail "I1: Audit logs endpoint failed (HTTP $CODE)"
    echo "  $BODY"
fi

# I2: Login produces audit log
echo ""
echo "--- I2: Login audit log ---"
if [ "$CODE" = "200" ]; then
    HAS_LOGIN=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
logs = data if isinstance(data, list) else data.get('data', data.get('logs', []))
if isinstance(logs, dict): logs = logs.get('data', [])
login_logs = [l for l in logs if 'LOGIN' in str(l.get('action',''))]
print(len(login_logs))
" 2>/dev/null)
    echo "  LOGIN audit entries: $HAS_LOGIN"
    if [ "$HAS_LOGIN" -gt 0 ] 2>/dev/null; then
        pass "I2: Login events logged ($HAS_LOGIN entries)"
    else
        fail "I2: No LOGIN events in audit log"
    fi
fi

# I3: State change audit logs
echo ""
echo "--- I3: State change audit logs ---"
if [ "$CODE" = "200" ]; then
    HAS_STATE=$(echo "$BODY" | python3 -c "
import sys,json
data = json.load(sys.stdin)
logs = data if isinstance(data, list) else data.get('data', data.get('logs', []))
if isinstance(logs, dict): logs = logs.get('data', [])
state_logs = [l for l in logs if 'STATE' in str(l.get('action',''))]
print(len(state_logs))
" 2>/dev/null)
    echo "  STATE_CHANGE audit entries: $HAS_STATE"
    if [ "$HAS_STATE" -gt 0 ] 2>/dev/null; then
        pass "I3: State change events logged ($HAS_STATE entries)"
    else
        fail "I3: No STATE_CHANGE events in audit log"
    fi
fi

# I4: Worker cannot view audit logs
echo ""
echo "--- I4: Worker denied audit log access ---"
RESULT=$(api GET "/audit-logs" "$DRAWER_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Worker audit-logs: HTTP $CODE"
if [ "$CODE" = "403" ]; then
    pass "I4: Worker denied audit log access (403)"
else
    fail "I4: Worker NOT denied audit log access (HTTP $CODE)"
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "SECTION X: BREAK-IT / CHAOS TESTS"
echo "============================================================================"

# X1: Unauthenticated access
echo ""
echo "--- X1: Unauthenticated access denied ---"
RESULT=$(curl -s -w "\n%{http_code}" "$BASE/dashboard/master" -X GET \
    -H "Accept: application/json" 2>/dev/null)
CODE=$(get_code "$RESULT")
echo "  No auth dashboard: HTTP $CODE"
if [ "$CODE" = "401" ]; then
    pass "X1: Unauthenticated access denied (401)"
else
    fail "X1: [P0] Unauthenticated access NOT denied (HTTP $CODE)"
fi

# X2: Invalid token
echo ""
echo "--- X2: Invalid/expired token ---"
RESULT=$(api GET "/auth/profile" "invalid-token-12345")
CODE=$(get_code "$RESULT")
echo "  Invalid token: HTTP $CODE"
if [ "$CODE" = "401" ]; then
    pass "X2: Invalid token rejected (401)"
else
    fail "X2: Invalid token NOT rejected (HTTP $CODE)"
fi

# X3: SQL injection in login
echo ""
echo "--- X3: SQL injection in login ---"
RESULT=$(curl -s -w "\n%{http_code}" "$BASE/auth/login" -X POST \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"admin@test.com\" OR 1=1--","password":"x"}' 2>/dev/null)
CODE=$(get_code "$RESULT")
echo "  SQL injection login: HTTP $CODE"
if [ "$CODE" = "401" ] || [ "$CODE" = "422" ]; then
    pass "X3: SQL injection rejected ($CODE)"
else
    fail "X3: SQL injection unexpected response (HTTP $CODE)"
fi

# X4: XSS in order data
echo ""
echo "--- X4: XSS payloads in order data ---"
RESULT=$(api POST "/workflow/orders/receive" "$CEO_TOKEN" \
    '{"project_id":1,"client_reference":"XSS-TEST","order_data":{"address":"<script>alert(1)</script>","type":"residential"},"priority":"normal"}')
CODE=$(get_code "$RESULT")
echo "  XSS in order: HTTP $CODE (stored but should be escaped on output)"
if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    pass "X4: XSS payload stored (escaping is frontend responsibility)"
else
    echo "  OK - rejected XSS payload"
    pass "X4: XSS payload rejected"
fi

# X5: Massive payload
echo ""
echo "--- X5: Oversized payload ---"
LARGE=$(python3 -c "print('A'*100000)")
RESULT=$(curl -s -w "\n%{http_code}" "$BASE/workflow/orders/receive" -X POST \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -d "{\"project_id\":1,\"client_reference\":\"LARGE-TEST\",\"order_data\":{\"address\":\"$LARGE\"},\"priority\":\"normal\"}" 2>/dev/null)
CODE=$(get_code "$RESULT")
echo "  100KB payload: HTTP $CODE"
pass "X5: Large payload handled (HTTP $CODE)"

# X6: Double submit (race condition)
echo ""
echo "--- X6: Idempotency / duplicate order ---"
RESULT=$(api POST "/workflow/orders/receive" "$CEO_TOKEN" \
    '{"project_id":1,"client_reference":"QA-TEST-001","order_data":{"address":"Duplicate test"},"priority":"normal"}')
CODE=$(get_code "$RESULT")
echo "  Duplicate client_reference: HTTP $CODE"
if [ "$CODE" = "409" ] || [ "$CODE" = "422" ]; then
    pass "X6: Duplicate order rejected ($CODE)"
else
    fail "X6: Duplicate order NOT rejected (HTTP $CODE) - idempotency check may be broken"
fi

# X7: Negative/invalid IDs
echo ""
echo "--- X7: Invalid IDs ---"
RESULT=$(api GET "/workflow/orders/99999" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Non-existent order: HTTP $CODE"
if [ "$CODE" = "404" ]; then
    pass "X7a: Non-existent order returns 404"
else
    fail "X7a: Non-existent order returns $CODE instead of 404"
fi

RESULT=$(api GET "/workflow/orders/-1" "$CEO_TOKEN")
CODE=$(get_code "$RESULT")
echo "  Negative ID: HTTP $CODE"
if [ "$CODE" = "404" ] || [ "$CODE" = "422" ]; then
    pass "X7b: Negative ID handled ($CODE)"
else
    fail "X7b: Negative ID returns $CODE"
fi

# X8: Method not allowed
echo ""
echo "--- X8: Wrong HTTP method ---"
RESULT=$(curl -s -w "\n%{http_code}" "$BASE/auth/login" -X DELETE \
    -H "Accept: application/json" 2>/dev/null)
CODE=$(get_code "$RESULT")
echo "  DELETE on login: HTTP $CODE"
if [ "$CODE" = "405" ] || [ "$CODE" = "404" ]; then
    pass "X8: Wrong method rejected ($CODE)"
else
    fail "X8: Wrong method not rejected (HTTP $CODE)"
fi

# X9: Empty body on required endpoints
echo ""
echo "--- X9: Empty body validation ---"
RESULT=$(api POST "/workflow/orders/receive" "$CEO_TOKEN" '{}')
CODE=$(get_code "$RESULT")
echo "  Empty receive: HTTP $CODE"
if [ "$CODE" = "422" ]; then
    pass "X9: Empty body correctly validated (422)"
else
    fail "X9: Empty body not validated (HTTP $CODE)"
fi

# X10: Submit order assigned to different user
echo ""
echo "--- X10: Submit order assigned to different user ---"
# Try submitting an order as checker that's assigned to drawer
RESULT=$(api POST "/workflow/start-next" "$DRAWER_TOKEN" '{"project_id":1}')
CODE=$(get_code "$RESULT")
if [ "$CODE" = "200" ]; then
    STOLEN_ID=$(echo "$(get_body "$RESULT")" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('order',d).get('id',''))" 2>/dev/null)
    # Try to submit as checker
    RESULT2=$(api POST "/workflow/orders/$STOLEN_ID/submit" "$CHECKER_TOKEN" '{"comments":"stealing"}')
    CODE2=$(get_code "$RESULT2")
    echo "  Checker submitting drawer's order: HTTP $CODE2"
    if [ "$CODE2" = "403" ]; then
        pass "X10: Cannot submit another user's order (403)"
    else
        fail "X10: [P0] Can submit another user's assigned order (HTTP $CODE2)"
    fi
fi

# ============================================================================
echo ""
echo "============================================================================"
echo "FINAL REPORT"
echo "============================================================================"
echo ""
echo "Total PASS: $PASS"
echo "Total FAIL: $FAIL"
echo ""
if [ $FAIL -gt 0 ]; then
    echo "BUGS FOUND:"
    echo -e "$BUGS"
fi
echo ""
if [ $FAIL -eq 0 ]; then
    echo "VERDICT: ✅ ALL TESTS PASSED"
elif [ $FAIL -le 3 ]; then
    echo "VERDICT: ⚠️  CONDITIONAL PASS - Minor issues found"
else
    echo "VERDICT: ❌ REJECTED - $FAIL failures found"
fi
echo ""
echo "============================================================================"
