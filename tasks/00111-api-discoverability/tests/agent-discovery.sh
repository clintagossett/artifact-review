#!/usr/bin/env bash
# Agent Discovery Test Script
# Simulates an AI agent's discovery journey against the live environment.
# Usage: ./agent-discovery.sh [BASE_URL] [API_KEY]
#   BASE_URL defaults to https://lux.convex.site.loc
#   API_KEY  is optional — used only for authenticated endpoint tests

set -euo pipefail

BASE_URL="${1:-https://lux.convex.site.loc}"
API_KEY="${2:-}"

PASS=0
FAIL=0
SKIP=0

pass() { ((PASS++)); echo "  PASS: $1"; }
fail() { ((FAIL++)); echo "  FAIL: $1"; }
skip() { ((SKIP++)); echo "  SKIP: $1"; }

echo "=== Agent Discovery Tests ==="
echo "Base URL: $BASE_URL"
echo ""

# --------------------------------------------------------------------------
# Test 1: GET /api/v1 — discovery endpoint (unauthenticated)
# --------------------------------------------------------------------------
echo "--- Test 1: GET /api/v1 (discovery) ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  pass "Status 200"
else
  fail "Expected 200, got $HTTP_CODE"
fi

# Check content-type via headers
HEADERS=$(curl -s -I "$BASE_URL/api/v1")
if echo "$HEADERS" | grep -qi "content-type:.*application/json"; then
  pass "Content-Type is application/json"
else
  fail "Content-Type is not application/json"
fi

# Check required fields in JSON
for field in name version documentation authentication endpoints health; do
  if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$field' in d" 2>/dev/null; then
    pass "Field '$field' present"
  else
    fail "Field '$field' missing"
  fi
done

# Check auth details
if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['authentication']['header']=='X-API-Key'" 2>/dev/null; then
  pass "Auth header is X-API-Key"
else
  fail "Auth header mismatch"
fi

if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['authentication']['prefix']=='ar_live_'" 2>/dev/null; then
  pass "Auth prefix is ar_live_"
else
  fail "Auth prefix mismatch"
fi

echo ""

# --------------------------------------------------------------------------
# Test 2: GET /api/v1/health — health check (unauthenticated)
# --------------------------------------------------------------------------
echo "--- Test 2: GET /api/v1/health ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  pass "Status 200"
else
  fail "Expected 200, got $HTTP_CODE"
fi

if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok'" 2>/dev/null; then
  pass "Status is 'ok'"
else
  fail "Status field mismatch"
fi

echo ""

# --------------------------------------------------------------------------
# Test 3: GET /api/v1/openapi.yaml — public spec (no auth required)
# --------------------------------------------------------------------------
echo "--- Test 3: GET /api/v1/openapi.yaml (public, no auth) ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/openapi.yaml")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  pass "Status 200"
else
  fail "Expected 200, got $HTTP_CODE"
fi

HEADERS=$(curl -s -I "$BASE_URL/api/v1/openapi.yaml")
if echo "$HEADERS" | grep -qi "content-type:.*text/yaml"; then
  pass "Content-Type is text/yaml"
else
  fail "Content-Type is not text/yaml"
fi

if echo "$BODY" | grep -q "openapi:"; then
  pass "Response contains OpenAPI spec"
else
  fail "Response doesn't look like an OpenAPI spec"
fi

echo ""

# --------------------------------------------------------------------------
# Test 4: GET /api/v1/artifacts without auth — expect 401 + WWW-Authenticate
# --------------------------------------------------------------------------
echo "--- Test 4: GET /api/v1/artifacts (no auth, expect 401) ---"
HEADERS=$(curl -s -D - -o /tmp/discovery_body.json "$BASE_URL/api/v1/artifacts")
HTTP_CODE=$(echo "$HEADERS" | head -1 | grep -o '[0-9]\{3\}')
BODY=$(cat /tmp/discovery_body.json 2>/dev/null || echo "{}")

if [ "$HTTP_CODE" = "401" ]; then
  pass "Status 401"
else
  fail "Expected 401, got $HTTP_CODE"
fi

if echo "$HEADERS" | grep -qi "www-authenticate"; then
  pass "WWW-Authenticate header present"
else
  fail "WWW-Authenticate header missing"
fi

if echo "$HEADERS" | grep -qi 'ApiKey.*X-API-Key'; then
  pass "WWW-Authenticate references X-API-Key"
else
  fail "WWW-Authenticate doesn't reference X-API-Key"
fi

if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'hint' in d" 2>/dev/null; then
  pass "Response body contains 'hint'"
else
  fail "Response body missing 'hint'"
fi

echo ""

# --------------------------------------------------------------------------
# Test 5: Authenticated endpoints (if API_KEY provided)
# --------------------------------------------------------------------------
echo "--- Test 5: GET /api/v1/artifacts (authenticated) ---"
if [ -z "$API_KEY" ]; then
  skip "No API_KEY provided — skipping authenticated endpoint test"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" "$BASE_URL/api/v1/artifacts")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  if [ "$HTTP_CODE" = "200" ]; then
    pass "Status 200 with valid API key"
  else
    fail "Expected 200 with valid API key, got $HTTP_CODE"
  fi
fi

echo ""

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Skipped: $SKIP"
echo ""

rm -f /tmp/discovery_body.json

if [ "$FAIL" -gt 0 ]; then
  echo "FAILED"
  exit 1
else
  echo "ALL PASSED"
  exit 0
fi
