#!/usr/bin/env bash
#
# Unit Tests for Enhanced --check Mode in scripts/agent-init.sh
#
# Test Framework: Plain bash (no external dependencies)
# Run: ./tasks/00048-agent-init-overhaul/14-check-mode/tests/unit/14-check-mode.test.sh
#

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

setup() {
    # Create temporary test directory
    TEST_DIR=$(mktemp -d)

    # Save original directory
    ORIG_DIR=$(pwd)

    # Create test project structure
    TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
    mkdir -p "${TEST_PROJECT_DIR}/scripts"
    mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"
    mkdir -p "${TEST_PROJECT_DIR}/app"

    # Create mock orchestrator directory
    MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
    mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

    # Create orchestrator config.json with test agent
    cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "agents": {
    "james": {
      "appPort": 3020,
      "convexCloudPort": 3230,
      "convexSitePort": 3231,
      "mailpitPort": 8045,
      "convexDashboardPort": 6811,
      "subnet": "172.28"
    }
  }
}
EOF

    # Copy scripts if they exist
    if [ -f "${ORIG_DIR}/scripts/agent-init.sh" ]; then
        cp "${ORIG_DIR}/scripts/agent-init.sh" "${TEST_PROJECT_DIR}/scripts/"
    fi

    # Copy lib scripts if they exist
    for lib_file in parse-config.sh generate-env-docker.sh generate-env-nextjs.sh wait-for-healthy.sh smoke-test.sh; do
        if [ -f "${ORIG_DIR}/scripts/lib/${lib_file}" ]; then
            cp "${ORIG_DIR}/scripts/lib/${lib_file}" "${TEST_PROJECT_DIR}/scripts/lib/"
        fi
    done

    # Create mock binaries directory
    mkdir -p "${TEST_DIR}/bin"
    create_mock_binaries

    # Add mock bin to PATH
    export PATH="${TEST_DIR}/bin:$PATH"

    cd "${TEST_PROJECT_DIR}"
}

teardown() {
    cd "${ORIG_DIR}"
    rm -rf "${TEST_DIR}"
}

create_mock_binaries() {
    # Mock node
    cat > "${TEST_DIR}/bin/node" << 'EOF'
#!/bin/bash
echo "v20.0.0"
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/node"

    # Mock npm
    cat > "${TEST_DIR}/bin/npm" << 'EOF'
#!/bin/bash
echo "10.0.0"
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/npm"

    # Mock docker
    cat > "${TEST_DIR}/bin/docker" << 'EOF'
#!/bin/bash
case "$1" in
    info)
        echo "Docker running"
        exit 0
        ;;
    ps)
        echo "james-backend"
        exit 0
        ;;
esac
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/docker"

    # Mock tmux
    cat > "${TEST_DIR}/bin/tmux" << 'EOF'
#!/bin/bash
case "$1" in
    -V)
        echo "tmux 3.0"
        exit 0
        ;;
    has-session)
        exit 0  # Session exists
        ;;
esac
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/tmux"

    # Mock jq - use system jq for actual parsing
    cat > "${TEST_DIR}/bin/jq" << 'EOF'
#!/bin/bash
# Use real jq since we need JSON parsing
if command -v /usr/bin/jq >/dev/null 2>&1; then
    /usr/bin/jq "$@"
else
    command jq "$@"
fi
EOF
    chmod +x "${TEST_DIR}/bin/jq"

    # Mock mkcert
    cat > "${TEST_DIR}/bin/mkcert" << 'EOF'
#!/bin/bash
if [ "$1" = "-version" ]; then
    echo "v1.4.4"
    exit 0
elif [ "$1" = "-CAROOT" ]; then
    echo "/tmp/mkcert-ca"
    mkdir -p /tmp/mkcert-ca
    touch /tmp/mkcert-ca/rootCA.pem
    exit 0
fi
exit 0
EOF
    chmod +x "${TEST_DIR}/bin/mkcert"

    # Mock curl
    cat > "${TEST_DIR}/bin/curl" << 'EOF'
#!/bin/bash
# Mock successful responses - always return failure for test isolation
exit 1
EOF
    chmod +x "${TEST_DIR}/bin/curl"
}

# Strip ANSI color codes from output for easier assertions
strip_colors() {
    sed 's/\x1b\[[0-9;]*m//g'
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"

    if [ "$expected" = "$actual" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected: '$expected'"
        echo "    Actual:   '$actual'"
        return 1
    fi
}

assert_exit_code() {
    local expected_code="$1"
    local actual_code="$2"
    local message="${3:-}"

    if [ "$expected_code" -eq "$actual_code" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected exit code: $expected_code"
        echo "    Actual exit code:   $actual_code"
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-}"

    if [ -f "$file" ]; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    File does not exist: $file"
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if echo "$haystack" | grep -qF "$needle"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to contain: '$needle'"
        echo "    Actual output (first 500 chars):"
        echo "${haystack:0:500}"
        return 1
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-}"

    if ! echo "$haystack" | grep -qF "$needle"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected NOT to contain: '$needle'"
        return 1
    fi
}

assert_matches_pattern() {
    local text="$1"
    local pattern="$2"
    local message="${3:-}"

    if echo "$text" | grep -qE "$pattern"; then
        return 0
    else
        echo -e "${RED}  FAIL${NC}: ${message}"
        echo "    Expected to match pattern: '$pattern'"
        echo "    Actual text: '$text'"
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
# Test Cases - Category 1: Multi-Source Configuration Display
# ============================================================================

test_tc01_display_all_config_sources() {
    test_start "TC01: Display all configuration sources"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.28.0.0/24
EOF

    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
NODE_EXTRA_CA_CERTS=/tmp/mkcert-ca/rootCA.pem
NOVU_API_KEY=test-key
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should display config.json section (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "config.json" "Should show config.json as source" || { test_fail; return; }
    assert_contains "$output" "appPort" "Should show appPort from config.json" || { test_fail; return; }
    assert_contains "$output" "3020" "Should show port value from config.json" || { test_fail; return; }

    # Should display .env.docker.local section
    assert_contains "$output" ".env.docker.local" "Should show .env.docker.local as source" || { test_fail; return; }
    assert_contains "$output" "AGENT_NAME" "Should show AGENT_NAME from env" || { test_fail; return; }

    # Should display app/.env.nextjs.local section
    assert_contains "$output" ".env.nextjs.local" "Should show .env.nextjs.local as source" || { test_fail; return; }
    assert_contains "$output" "CONVEX_SELF_HOSTED_URL" "Should show Convex URL" || { test_fail; return; }

    test_pass
}

test_tc02_display_section_headers() {
    test_start "TC02: Display clear section headers"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create minimal env files
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should have structured sections (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "Configuration Sources" "Should have Configuration Sources section" || { test_fail; return; }
    assert_contains "$output" "Port" "Should have Port section" || { test_fail; return; }
    assert_contains "$output" "Required Variables" "Should have Required Variables section" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Cases - Category 2: Port Comparison & Mismatch Detection
# ============================================================================

test_tc03_port_comparison_matching() {
    test_start "TC03: Port comparison - matching values"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env with matching ports
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.28.0.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show matching ports with checkmark (THIS WILL FAIL - RED PHASE)
    # Look for format like: "appPort: 3020 ✓" or "BASE_PORT: 3020 (matches config.json)"
    assert_matches_pattern "$output" "3020.*match|✓.*3020" "Should indicate port 3020 matches" || { test_fail; return; }

    test_pass
}

test_tc04_port_comparison_mismatch() {
    test_start "TC04: Port comparison - mismatched values"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env with WRONG port (should be 3020, using 3000)
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3000
SUBNET=172.28.0.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should highlight mismatch (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "MISMATCH" "Should show MISMATCH warning" || { test_fail; return; }
    assert_contains "$output" "3020" "Should show expected value 3020" || { test_fail; return; }
    assert_contains "$output" "3000" "Should show actual value 3000" || { test_fail; return; }

    test_pass
}

test_tc05_subnet_comparison_mismatch() {
    test_start "TC05: Subnet comparison - mismatched values"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env with WRONG subnet (should be 172.28, using 172.27)
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.27.0.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should highlight subnet mismatch (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "172.28" "Should show expected subnet 172.28" || { test_fail; return; }
    assert_contains "$output" "172.27" "Should show actual subnet 172.27" || { test_fail; return; }
    assert_matches_pattern "$output" "subnet.*MISMATCH|MISMATCH.*subnet" "Should flag subnet mismatch" || { test_fail; return; }

    test_pass
}

test_tc06_comparison_table_format() {
    test_start "TC06: Port comparison table format"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.27.0.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show comparison in table format (THIS WILL FAIL - RED PHASE)
    # Look for column headers like "Expected" and "Actual" or "config.json" and "env"
    assert_matches_pattern "$output" "Expected|config\.json" "Should show expected/config.json column" || { test_fail; return; }
    assert_matches_pattern "$output" "Actual|\.env" "Should show actual/env column" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Cases - Category 3: Required Environment Variable Validation
# ============================================================================

test_tc07_required_var_agent_name_missing() {
    test_start "TC07: Required variable - AGENT_NAME missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env WITHOUT AGENT_NAME
    cat > ".env.docker.local" << 'EOF'
BASE_PORT=3020
SUBNET=172.28.0.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should warn about missing AGENT_NAME (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "AGENT_NAME" "Should mention AGENT_NAME" || { test_fail; return; }
    assert_matches_pattern "$output" "NOT SET|missing|required" "Should indicate AGENT_NAME is not set" || { test_fail; return; }

    test_pass
}

test_tc08_required_var_node_ca_certs_missing() {
    test_start "TC08: Required variable - NODE_EXTRA_CA_CERTS missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Create app env WITHOUT NODE_EXTRA_CA_CERTS
    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should warn about missing NODE_EXTRA_CA_CERTS (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "NODE_EXTRA_CA_CERTS" "Should mention NODE_EXTRA_CA_CERTS" || { test_fail; return; }
    assert_matches_pattern "$output" "NOT SET|missing" "Should indicate NODE_EXTRA_CA_CERTS is not set" || { test_fail; return; }

    test_pass
}

test_tc09_required_var_convex_url_missing() {
    test_start "TC09: Required variable - CONVEX_SELF_HOSTED_URL missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Create app env WITHOUT CONVEX_SELF_HOSTED_URL
    cat > "app/.env.nextjs.local" << 'EOF'
NODE_EXTRA_CA_CERTS=/tmp/mkcert-ca/rootCA.pem
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should warn about missing CONVEX_SELF_HOSTED_URL (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "CONVEX_SELF_HOSTED_URL" "Should mention CONVEX_SELF_HOSTED_URL" || { test_fail; return; }
    assert_matches_pattern "$output" "NOT SET|missing" "Should indicate CONVEX_SELF_HOSTED_URL is not set" || { test_fail; return; }

    test_pass
}

test_tc10_required_var_novu_key_missing() {
    test_start "TC10: Required variable - NOVU_API_KEY missing"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Create app env WITHOUT NOVU_API_KEY
    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
NODE_EXTRA_CA_CERTS=/tmp/mkcert-ca/rootCA.pem
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should warn about missing NOVU_API_KEY (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "NOVU_API_KEY" "Should mention NOVU_API_KEY" || { test_fail; return; }
    assert_matches_pattern "$output" "NOT SET|missing" "Should indicate NOVU_API_KEY is not set" || { test_fail; return; }

    test_pass
}

test_tc11_all_required_vars_present() {
    test_start "TC11: All required variables present"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create complete env files
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.28.0.0/24
EOF

    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
NODE_EXTRA_CA_CERTS=/tmp/mkcert-ca/rootCA.pem
NOVU_API_KEY=test-key-123
NOVU_APPLICATION_IDENTIFIER=test-app-id
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show all required vars are set (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "AGENT_NAME" "Should show AGENT_NAME" || { test_fail; return; }
    assert_contains "$output" "NODE_EXTRA_CA_CERTS" "Should show NODE_EXTRA_CA_CERTS" || { test_fail; return; }
    # Should NOT have "NOT SET" warnings when all vars are present
    assert_not_contains "$output" "NOT SET" "Should not show NOT SET when all vars present" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Cases - Category 4: Output Format & Clarity
# ============================================================================

test_tc12_summary_all_valid() {
    test_start "TC12: Summary - all configuration valid"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create complete, matching config
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3020
SUBNET=172.28.0.0/24
EOF

    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
NODE_EXTRA_CA_CERTS=/tmp/mkcert-ca/rootCA.pem
NOVU_API_KEY=test-key
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show positive summary (THIS WILL FAIL - RED PHASE)
    assert_matches_pattern "$output" "valid|OK|good|✓" "Should indicate configuration is valid" || { test_fail; return; }
    assert_not_contains "$output" "MISMATCH" "Should not show mismatches" || { test_fail; return; }

    test_pass
}

test_tc13_summary_with_issues() {
    test_start "TC13: Summary - multiple issues found"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create config with multiple issues
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3000
SUBNET=172.27.0.0/24
EOF

    cat > "app/.env.nextjs.local" << 'EOF'
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show issue count in summary (THIS WILL FAIL - RED PHASE)
    assert_matches_pattern "$output" "issue|warning|problem" "Should mention issues" || { test_fail; return; }

    # Should list specific issues
    assert_contains "$output" "MISMATCH" "Should show port mismatch issue" || { test_fail; return; }
    assert_contains "$output" "NODE_EXTRA_CA_CERTS" "Should show missing NODE_EXTRA_CA_CERTS issue" || { test_fail; return; }

    test_pass
}

test_tc14_actionable_recommendations() {
    test_start "TC14: Provide actionable recommendations"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create config with port mismatch
    cat > ".env.docker.local" << 'EOF'
AGENT_NAME=james
BASE_PORT=3000
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should provide actionable next steps (THIS WILL FAIL - RED PHASE)
    assert_matches_pattern "$output" "agent-init\.sh|regenerate|setup" "Should suggest running agent-init.sh" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Cases - Category 5: Error Handling
# ============================================================================

test_tc15_missing_config_json() {
    test_start "TC15: Handle missing config.json gracefully"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Remove orchestrator config
    rm -f "${MOCK_ORCHESTRATOR_DIR}/config.json"

    # Create env file
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    local exit_code=$?
    set -e

    # Should handle gracefully (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" "config.json" "Should mention config.json" || { test_fail; return; }
    assert_matches_pattern "$output" "not found|missing|orchestrator" "Should indicate config.json issue" || { test_fail; return; }

    # Should not crash (exit 0 for --check mode)
    assert_exit_code 0 "$exit_code" "--check should not fail even with missing config.json" || { test_fail; return; }

    test_pass
}

test_tc16_missing_env_docker_local() {
    test_start "TC16: Handle missing .env.docker.local gracefully"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Don't create .env.docker.local

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    local exit_code=$?
    set -e

    # Should report missing file (THIS WILL FAIL - RED PHASE)
    assert_contains "$output" ".env.docker.local" "Should mention .env.docker.local" || { test_fail; return; }
    assert_matches_pattern "$output" "not found|missing" "Should indicate file is missing" || { test_fail; return; }

    # Should suggest running agent-init.sh
    assert_contains "$output" "agent-init.sh" "Should suggest running agent-init.sh" || { test_fail; return; }

    # Should not crash
    assert_exit_code 0 "$exit_code" "--check should not fail with missing env file" || { test_fail; return; }

    test_pass
}

test_tc17_invalid_json_in_config() {
    test_start "TC17: Handle invalid JSON in config.json"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create invalid JSON
    echo "{ invalid json }" > "${MOCK_ORCHESTRATOR_DIR}/config.json"

    # Create env file
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    local exit_code=$?
    set -e

    # Should handle gracefully without crashing (THIS WILL FAIL - RED PHASE)
    assert_exit_code 0 "$exit_code" "--check should not crash on invalid JSON" || { test_fail; return; }
    assert_matches_pattern "$output" "invalid|error|JSON" "Should mention JSON error" || { test_fail; return; }

    test_pass
}

test_tc18_agent_not_in_config() {
    test_start "TC18: Handle agent not found in config.json"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env with different agent name
    echo "AGENT_NAME=nonexistent-agent" > ".env.docker.local"

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    local exit_code=$?
    set -e

    # Should report agent not found (THIS WILL FAIL - RED PHASE)
    assert_matches_pattern "$output" "not found|Agent.*nonexistent-agent" "Should indicate agent not found" || { test_fail; return; }
    assert_exit_code 0 "$exit_code" "--check should not fail when agent not in config" || { test_fail; return; }

    test_pass
}

test_tc19_check_mode_always_exits_zero() {
    test_start "TC19: --check mode never fails (exit 0)"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create broken config (multiple issues)
    cat > ".env.docker.local" << 'EOF'
BASE_PORT=9999
SUBNET=192.168.1.0/24
EOF

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1)
    local exit_code=$?
    set -e

    # --check is informational only, should never fail (THIS WILL FAIL - RED PHASE)
    assert_exit_code 0 "$exit_code" "--check should always exit 0 (informational mode)" || { test_fail; return; }

    test_pass
}

test_tc20_show_config_file_paths() {
    test_start "TC20: Show full paths to config files"

    if [ ! -f "scripts/agent-init.sh" ]; then
        test_skip "agent-init.sh not found"
        return
    fi

    # Create env files
    echo "AGENT_NAME=james" > ".env.docker.local"

    # Run --check
    set +e
    local output
    output=$(bash scripts/agent-init.sh --check 2>&1 | strip_colors)
    set -e

    # Should show full paths to files (THIS WILL FAIL - RED PHASE)
    assert_matches_pattern "$output" "/.*config\.json|config\.json:.*/" "Should show path to config.json" || { test_fail; return; }
    assert_matches_pattern "$output" "/.*\.env\.docker\.local|\.env\.docker\.local:.*/" "Should show path to .env.docker.local" || { test_fail; return; }

    test_pass
}

# ============================================================================
# Test Runner
# ============================================================================

run_all_tests() {
    echo "======================================================================"
    echo "Unit Tests: Enhanced --check Mode in scripts/agent-init.sh"
    echo "======================================================================"
    echo ""
    echo "NOTE: These tests are in RED phase - they SHOULD FAIL initially."
    echo "After implementation, all tests should pass (GREEN phase)."
    echo ""

    setup

    # Category 1: Multi-Source Configuration Display
    test_tc01_display_all_config_sources
    test_tc02_display_section_headers

    # Category 2: Port Comparison & Mismatch Detection
    test_tc03_port_comparison_matching
    test_tc04_port_comparison_mismatch
    test_tc05_subnet_comparison_mismatch
    test_tc06_comparison_table_format

    # Category 3: Required Environment Variable Validation
    test_tc07_required_var_agent_name_missing
    test_tc08_required_var_node_ca_certs_missing
    test_tc09_required_var_convex_url_missing
    test_tc10_required_var_novu_key_missing
    test_tc11_all_required_vars_present

    # Category 4: Output Format & Clarity
    test_tc12_summary_all_valid
    test_tc13_summary_with_issues
    test_tc14_actionable_recommendations

    # Category 5: Error Handling
    test_tc15_missing_config_json
    test_tc16_missing_env_docker_local
    test_tc17_invalid_json_in_config
    test_tc18_agent_not_in_config
    test_tc19_check_mode_always_exits_zero
    test_tc20_show_config_file_paths

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
        echo -e "${YELLOW}Expected result: Tests FAIL (RED phase)${NC}"
        echo "After implementation, run again to verify GREEN phase."
        exit 1
    else
        echo -e "${GREEN}All tests passed! (GREEN phase)${NC}"
        exit 0
    fi
}

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" -ef "$0" ]; then
    run_all_tests
fi
