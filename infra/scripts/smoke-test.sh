#!/usr/bin/env bash
# filepath: /Users/rajveerbishnoi/TokenTax/infra/scripts/smoke-test.sh
# ============================================================
# TokenTax — Production Smoke Test Suite
# ============================================================
#
# Validates a running TokenTax deployment by testing:
#   1. API health endpoints
#   2. Core functional endpoints (analyze, tokenizers, languages)
#   3. Auth flow (register → login → profile)
#   4. Prometheus metrics
#   5. Frontend availability
#
# Usage:
#   ./infra/scripts/smoke-test.sh                    # defaults to http://localhost
#   ./infra/scripts/smoke-test.sh https://tokentax.io
#   BASE_URL=https://staging.tokentax.io ./infra/scripts/smoke-test.sh
#
# Exit codes:
#   0 — All tests passed
#   1 — One or more tests failed
# ============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────
BASE_URL="${1:-${BASE_URL:-http://localhost}}"
API_URL="${BASE_URL}/api/v1"
TIMEOUT=15
PASS=0
FAIL=0
TOTAL=0

# Colors (if terminal supports them)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN='' RED='' YELLOW='' CYAN='' BOLD='' NC=''
fi

# ── Helpers ──────────────────────────────────────────────
pass() {
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${GREEN}✅ $1${NC}"
}

fail() {
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo -e "  ${RED}❌ $1${NC}"
}

header() {
  echo ""
  echo -e "${CYAN}${BOLD}── $1 ──${NC}"
}

check_status() {
  local name="$1" url="$2" expected="${3:-200}"
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expected" ]; then
    pass "$name (HTTP $status)"
  else
    fail "$name — expected $expected, got $status"
  fi
}

check_json_field() {
  local name="$1" url="$2" field="$3" expected="$4"
  local response value
  response=$(curl -sf --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "")
  if [ -z "$response" ]; then
    fail "$name — no response"
    return
  fi
  value=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)$field)" 2>/dev/null || echo "")
  if [ "$value" = "$expected" ]; then
    pass "$name ($field = $value)"
  else
    fail "$name — expected $field=$expected, got '$value'"
  fi
}

# ── Banner ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  TokenTax Smoke Test Suite${NC}"
echo -e "${BOLD}  Target: ${CYAN}${BASE_URL}${NC}"
echo -e "${BOLD}  Date:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"

# ── 1. Health Endpoints ─────────────────────────────────
header "Health Endpoints"

check_status "Liveness (ping)" "${API_URL}/health/ping"
check_json_field "Ping response" "${API_URL}/health/ping" "['status']" "ok"
check_status "Readiness (health)" "${API_URL}/health"

# ── 2. API Documentation ────────────────────────────────
header "API Documentation"

check_status "Swagger UI" "${BASE_URL}/docs"
check_status "OpenAPI JSON" "${BASE_URL}/openapi.json"

# ── 3. Core Functional Endpoints ────────────────────────
header "Core Endpoints"

check_status "GET /tokenizers" "${API_URL}/tokenizers"
check_status "GET /languages" "${API_URL}/languages"

# Test analyze endpoint with a real payload
ANALYZE_RESPONSE=$(curl -sf --max-time 30 \
  -X POST "${API_URL}/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","language":"en"}' 2>/dev/null || echo "")

if [ -n "$ANALYZE_RESPONSE" ]; then
  RESULT_COUNT=$(echo "$ANALYZE_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results', [])))" 2>/dev/null || echo "0")
  if [ "$RESULT_COUNT" -ge 1 ]; then
    pass "POST /analyze — returned $RESULT_COUNT tokenizer results"
  else
    fail "POST /analyze — expected ≥1 results, got $RESULT_COUNT"
  fi
else
  fail "POST /analyze — no response"
fi

# Test with multilingual text
MULTI_RESPONSE=$(curl -sf --max-time 30 \
  -X POST "${API_URL}/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは世界","language":"ja"}' 2>/dev/null || echo "")

if [ -n "$MULTI_RESPONSE" ]; then
  pass "POST /analyze (Japanese) — responded"
else
  fail "POST /analyze (Japanese) — no response"
fi

# ── 4. Auth Endpoints ───────────────────────────────────
header "Auth Endpoints"

# Generate unique email for this test run
TEST_EMAIL="smoketest-$(date +%s)@tokentax-test.io"
TEST_PASSWORD="SmokeTest123!@#"

# Register
REGISTER_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" 2>/dev/null || echo "000")

if [ "$REGISTER_STATUS" = "201" ]; then
  pass "POST /auth/register (HTTP $REGISTER_STATUS)"
else
  # 409 = already exists (acceptable in re-runs)
  if [ "$REGISTER_STATUS" = "409" ]; then
    pass "POST /auth/register — user exists (HTTP 409, acceptable)"
  else
    fail "POST /auth/register — expected 201, got $REGISTER_STATUS"
  fi
fi

# Login
LOGIN_RESPONSE=$(curl -sf --max-time "$TIMEOUT" \
  -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" 2>/dev/null || echo "")

if [ -n "$LOGIN_RESPONSE" ]; then
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
  if [ -n "$ACCESS_TOKEN" ]; then
    pass "POST /auth/login — received access_token"

    # Profile (authenticated)
    PROFILE_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "${API_URL}/auth/me" 2>/dev/null || echo "000")
    if [ "$PROFILE_STATUS" = "200" ]; then
      pass "GET /auth/me — authenticated (HTTP 200)"
    else
      fail "GET /auth/me — expected 200, got $PROFILE_STATUS"
    fi
  else
    fail "POST /auth/login — no access_token in response"
  fi
else
  fail "POST /auth/login — no response"
fi

# Unauthenticated access to /me should fail
check_status "GET /auth/me (no token)" "${API_URL}/auth/me" "401"

# ── 5. Prometheus Metrics ───────────────────────────────
header "Monitoring"

METRICS_RESPONSE=$(curl -sf --max-time "$TIMEOUT" "${API_URL}/metrics" 2>/dev/null || echo "")
if echo "$METRICS_RESPONSE" | grep -q "http_requests_total"; then
  pass "Prometheus metrics — http_requests_total present"
else
  fail "Prometheus metrics — http_requests_total not found"
fi

if echo "$METRICS_RESPONSE" | grep -q "http_request_duration_seconds"; then
  pass "Prometheus metrics — http_request_duration_seconds present"
else
  fail "Prometheus metrics — http_request_duration_seconds not found"
fi

# ── 6. Frontend ─────────────────────────────────────────
header "Frontend"

check_status "Frontend root" "${BASE_URL}"

# Check that the frontend returns HTML (not a JSON error)
FRONTEND_CONTENT=$(curl -sf --max-time "$TIMEOUT" "${BASE_URL}" 2>/dev/null | head -5 || echo "")
if echo "$FRONTEND_CONTENT" | grep -qi "<!doctype\|<html"; then
  pass "Frontend serves HTML"
else
  fail "Frontend does not serve HTML"
fi

# Nginx health
check_status "Nginx health" "${BASE_URL}/nginx-health"

# ── Summary ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}ALL TESTS PASSED${NC} — ${PASS}/${TOTAL} checks"
else
  echo -e "  ${RED}${BOLD}${FAIL} FAILED${NC}, ${GREEN}${PASS} passed${NC} — ${TOTAL} total"
fi
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# Exit with failure if any tests failed
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
