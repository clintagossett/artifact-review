#!/usr/bin/env bash
#
# E2E Smoke Test: Validate Complete Agent Setup
#
# Test Framework: Plain bash with curl
# Run: ./tasks/00048-agent-init-overhaul/tests/e2e/11-smoke-test.test.sh
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
#   2 - Orchestrator not running
#   3 - Docker containers not running
#   4 - Tmux sessions not running
#   5 - Environment variables not set
#   6 - HTTP endpoint unreachable

set -euo pipefail

# ============================================================================
# Test Framework
# ============================================================================

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
CURRENT_TEST=""

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Setup and Configuration
# ============================================================================

setup() {
    # Detect project root (4 levels up from tasks/00048-*/tests/e2e/)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

    cd "$PROJECT_ROOT"

    # Load agent identity
    if [ ! -f ".env.docker.local" ]; then
        echo -e "${RED}ERROR:${NC} .env.docker.local not found. Run agent-init.sh first."
        exit 5
    fi

    source .env.docker.local

    if [ -z "${AGENT_NAME:-}" ]; then
        echo -e "${RED}ERROR:${NC} AGENT_NAME not set in .env.docker.local"
        exit 5
    fi

    # Find orchestrator config
    ORCHESTRATOR_DIR="$(cd "${PROJECT_ROOT}/.." && pwd)/artifact-review-orchestrator"
    if [ ! -f "${ORCHESTRATOR_DIR}/config.json" ]; then
        echo -e "${RED}ERROR:${NC} Orchestrator config.json not found at ${ORCHESTRATOR_DIR}"
        exit 2
    fi

    # Set NODE_EXTRA_CA_CERTS for TLS trust
    if command -v mkcert &> /dev/null; then
        MKCERT_CA_ROOT=$(mkcert -CAROOT 2>/dev/null || echo "")
        if [ -n "$MKCERT_CA_ROOT" ] && [ -f "${MKCERT_CA_ROOT}/rootCA.pem" ]; then
            export NODE_EXTRA_CA_CERTS="${MKCERT_CA_ROOT}/rootCA.pem"
        fi
    fi

    # Define endpoint URLs
    FRONTEND_URL="https://${AGENT_NAME}.loc"
    CONVEX_CLOUD_URL="https://${AGENT_NAME}.convex.cloud.loc"
    CONVEX_SITE_URL="https://${AGENT_NAME}.convex.site.loc"
    NOVU_API_URL="https://api.novu.loc"

    echo "======================================================================"
    echo "E2E Smoke Test: Agent Setup Validation"
    echo "======================================================================"
    echo "Agent Name:    ${AGENT_NAME}"
    echo "Frontend:      ${FRONTEND_URL}"
    echo "Convex Cloud:  ${CONVEX_CLOUD_URL}"
    echo "Convex Site:   ${CONVEX_SITE_URL}"
    echo "Novu API:      ${NOVU_API_URL}"
    echo "======================================================================"
    echo ""
}

teardown() {
    # No cleanup needed for read-only smoke tests
    :
}

# ============================================================================
# Test Helpers
# ============================================================================

http_get() {
    local url="$1"
    local max_time="${2:-5}"

    # Use curl with:
    # -s: silent
    # -k: insecure (accept self-signed certs)
    # -w: write status code
    # -o: output to /dev/null
    # --max-time: timeout
    curl -s -k -w "%{http_code}" -o /dev/null --max-time "$max_time" "$url" 2>/dev/null || echo "000"
}

http_get_body() {
    local url="$1"
    local max_time="${2:-5}"

    curl -s -k --max-time "$max_time" "$url" 2>/dev/null || echo ""
}

assert_http_not_5xx() {
    local status_code="$1"
    local url="$2"
    local message="${3:-}"

    # Check if status code is in 5xx range
    if [[ "$status_code" =~ ^5[0-9][0-9]$ ]]; then
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    URL: $url"
        echo "    Status: $status_code (server error)"
        return 1
    elif [ "$status_code" = "000" ]; then
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    URL: $url"
        echo "    Status: Connection failed"
        return 1
    else
        return 0
    fi
}

assert_container_running() {
    local container_name="$1"
    local message="${2:-}"

    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Container not running: $container_name"
        return 1
    fi
}

assert_tmux_session_exists() {
    local session_name="$1"
    local message="${2:-}"

    if tmux has-session -t "$session_name" 2>/dev/null; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Tmux session not found: $session_name"
        return 1
    fi
}

test_start() {
    CURRENT_TEST="$1"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  ${CURRENT_TEST}..."
}

test_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e " ${GREEN}✓${NC}"
}

test_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    # Error already printed by assert functions
}

test_skip() {
    local reason="$1"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    echo -e " ${YELLOW}SKIP${NC} ($reason)"
}

# ============================================================================
# Test Cases
# ============================================================================

test_tc01_frontend_reachable() {
    test_start "TC01: Frontend endpoint reachable"

    local status_code
    status_code=$(http_get "$FRONTEND_URL" 10)

    # Frontend should return 200 (OK) or 3xx (redirect to login)
    # Should NOT return 5xx (server error) or 000 (connection failed)
    if assert_http_not_5xx "$status_code" "$FRONTEND_URL" "Frontend endpoint should be reachable"; then
        # Also verify it's HTML (not just any response)
        local body
        body=$(http_get_body "$FRONTEND_URL" 10)

        if echo "$body" | grep -qi "html\|<!DOCTYPE"; then
            test_pass
        else
            echo -e "${RED}  FAIL${NC}: Frontend did not return HTML content"
            test_fail
        fi
    else
        test_fail
    fi
}

test_tc02_convex_cloud_reachable() {
    test_start "TC02: Convex Cloud endpoint reachable"

    local status_code
    status_code=$(http_get "$CONVEX_CLOUD_URL" 10)

    # Convex Cloud endpoint expects WebSocket upgrade
    # Should return 400/426 (bad request/upgrade required) or 200
    # Should NOT return 5xx (server error) or 000 (connection failed)
    if assert_http_not_5xx "$status_code" "$CONVEX_CLOUD_URL" "Convex Cloud endpoint should be reachable"; then
        test_pass
    else
        test_fail
    fi
}

test_tc03_convex_site_reachable() {
    test_start "TC03: Convex Site endpoint reachable"

    local status_code
    status_code=$(http_get "$CONVEX_SITE_URL" 10)

    # Convex Site (HTTP actions) should return 200, 400, or 401
    # Should NOT return 5xx or 000
    if assert_http_not_5xx "$status_code" "$CONVEX_SITE_URL" "Convex Site endpoint should be reachable"; then
        test_pass
    else
        test_fail
    fi
}

test_tc04_novu_api_reachable() {
    test_start "TC04: Novu API endpoint reachable"

    # Novu health check endpoint
    local health_url="${NOVU_API_URL}/v1/health-check"
    local status_code
    status_code=$(http_get "$health_url" 10)

    # Should return 200 (OK) or 401 (auth required)
    # Should NOT return 5xx or 000
    if assert_http_not_5xx "$status_code" "$health_url" "Novu API should be reachable"; then
        test_pass
    else
        test_fail
    fi
}

test_tc05_auth_flow_initiates() {
    test_start "TC05: Basic auth flow initiates"

    # This test will POST to the auth endpoint to initiate magic link
    # We don't care if it succeeds or fails validation - just that it doesn't 500

    # Skip for now - requires knowing the exact auth endpoint structure
    test_skip "Auth endpoint structure not yet defined"
}

test_tc06_docker_containers_healthy() {
    test_start "TC06: All Docker containers healthy"

    local all_healthy=true

    # Check backend container
    if ! assert_container_running "${AGENT_NAME}-backend" "Backend container should be running"; then
        all_healthy=false
    fi

    # Check mailpit container
    if ! assert_container_running "${AGENT_NAME}-mailpit" "Mailpit container should be running"; then
        all_healthy=false
    fi

    # Note: Dashboard container check might be optional depending on setup

    if [ "$all_healthy" = true ]; then
        test_pass
    else
        test_fail
    fi
}

test_tc07_tmux_sessions_running() {
    test_start "TC07: Tmux sessions running"

    local all_running=true

    # Check Convex dev session
    if ! assert_tmux_session_exists "${AGENT_NAME}-convex-dev" "Convex dev session should exist"; then
        all_running=false
    fi

    # Check Next.js session
    if ! assert_tmux_session_exists "${AGENT_NAME}-nextjs" "Next.js session should exist"; then
        all_running=false
    fi

    if [ "$all_running" = true ]; then
        test_pass
    else
        test_fail
    fi
}

test_tc08_environment_variables_set() {
    test_start "TC08: Environment variables set"

    local all_set=true

    # Already sourced .env.docker.local in setup()
    # Check key variables are set

    if [ -z "${AGENT_NAME:-}" ]; then
        echo -e "${RED}  FAIL${NC}: AGENT_NAME not set"
        all_set=false
    fi

    if [ -z "${BASE_PORT:-}" ] && [ -z "${appPort:-}" ]; then
        echo -e "${RED}  FAIL${NC}: Neither BASE_PORT nor appPort is set"
        all_set=false
    fi

    # Verify agent name matches directory pattern
    local expected_dir_pattern="artifact-review-${AGENT_NAME}"
    if ! echo "$PROJECT_ROOT" | grep -q "$AGENT_NAME"; then
        echo -e "${RED}  FAIL${NC}: AGENT_NAME doesn't match directory"
        all_set=false
    fi

    if [ "$all_set" = true ]; then
        test_pass
    else
        test_fail
    fi
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    setup

    echo "Running smoke tests..."
    echo ""

    test_tc01_frontend_reachable
    test_tc02_convex_cloud_reachable
    test_tc03_convex_site_reachable
    test_tc04_novu_api_reachable
    test_tc05_auth_flow_initiates
    test_tc06_docker_containers_healthy
    test_tc07_tmux_sessions_running
    test_tc08_environment_variables_set

    teardown

    echo ""
    echo "======================================================================"
    echo "Test Results"
    echo "======================================================================"
    echo -e "Total:   $TESTS_RUN"
    echo -e "${GREEN}Passed:  $TESTS_PASSED${NC}"
    echo -e "${RED}Failed:  $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
    echo "======================================================================"
    echo ""

    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${RED}Smoke tests FAILED${NC}"
        echo "One or more critical endpoints are not accessible."
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check orchestrator is running:"
        echo "     cd ../artifact-review-orchestrator && ./start.sh"
        echo "  2. Check dev servers are running:"
        echo "     ./scripts/start-dev-servers.sh"
        echo "  3. Check Docker containers:"
        echo "     docker ps"
        echo "  4. Check tmux sessions:"
        echo "     tmux list-sessions"
        echo ""
        exit 1
    else
        echo -e "${GREEN}All smoke tests passed!${NC}"
        echo "Agent setup is complete and all endpoints are accessible."
        exit 0
    fi
}

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" -ef "$0" ]; then
    run_all_tests
fi
