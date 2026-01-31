#!/usr/bin/env bash
# Documentation Tests for Subtask 15
# Tests that documentation is updated to reflect agent-init.sh behavior

set -uo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    echo -e "  ${YELLOW}$2${NC}"
    ((TESTS_FAILED++))
}

# TC01: CLAUDE.md references agent-init.sh
test_claude_references_agent_init() {
    local file="$PROJECT_ROOT/CLAUDE.md"
    if ! [ -f "$file" ]; then
        fail "TC01: CLAUDE.md references agent-init.sh" "File not found: $file"
        return
    fi

    local has_script_reference=$(grep -c "agent-init.sh" "$file" || true)
    local has_check_flag=$(grep -c "\-\-check" "$file" || true)
    local has_recommended=$(grep -ic "recommended\|First-Time Agent Setup" "$file" || true)

    if [ "$has_script_reference" -ge 1 ] && [ "$has_check_flag" -ge 1 ] && [ "$has_recommended" -ge 1 ]; then
        pass "TC01: CLAUDE.md references agent-init.sh"
    else
        fail "TC01: CLAUDE.md references agent-init.sh" "Missing references: script=$has_script_reference, --check=$has_check_flag, recommended=$has_recommended"
    fi
}

# TC02: CLAUDE.md explains config.json as source of truth
test_claude_config_source_of_truth() {
    local file="$PROJECT_ROOT/CLAUDE.md"
    local has_config_json=$(grep -c "config.json" "$file" || true)
    local has_source_truth=$(grep -ic "source of truth\|derived\|hardcod" "$file" || true)

    if [ "$has_config_json" -ge 1 ] && [ "$has_source_truth" -ge 1 ]; then
        pass "TC02: CLAUDE.md explains config.json as source of truth"
    else
        fail "TC02: CLAUDE.md explains config.json as source of truth" "Missing: config.json=$has_config_json, source_truth=$has_source_truth"
    fi
}

# TC03: CLAUDE.md documents --check mode
test_claude_check_mode() {
    local file="$PROJECT_ROOT/CLAUDE.md"
    local has_check_docs=$(grep -A 3 "\-\-check" "$file" | grep -ic "status\|configuration\|compare" || true)

    if [ "$has_check_docs" -ge 1 ]; then
        pass "TC03: CLAUDE.md documents --check mode"
    else
        fail "TC03: CLAUDE.md documents --check mode" "Missing --check documentation with status/configuration/compare"
    fi
}

# TC04: CLAUDE.md references troubleshooting doc
test_claude_troubleshooting_reference() {
    local file="$PROJECT_ROOT/CLAUDE.md"
    local has_troubleshooting=$(grep -c "troubleshooting.md" "$file" || true)
    local has_local_infra=$(grep -c "local-infrastructure.md" "$file" || true)

    if [ "$has_troubleshooting" -ge 1 ] && [ "$has_local_infra" -ge 1 ]; then
        pass "TC04: CLAUDE.md references troubleshooting doc"
    else
        fail "TC04: CLAUDE.md references troubleshooting doc" "Missing links: troubleshooting=$has_troubleshooting, local-infra=$has_local_infra"
    fi
}

# TC05: CLAUDE.md explains rollback behavior
test_claude_rollback() {
    local file="$PROJECT_ROOT/CLAUDE.md"
    local has_rollback=$(grep -ic "rollback\|backup" "$file" || true)

    if [ "$has_rollback" -ge 1 ]; then
        pass "TC05: CLAUDE.md explains rollback behavior"
    else
        fail "TC05: CLAUDE.md explains rollback behavior" "Missing rollback/backup documentation"
    fi
}

# TC06: local-infrastructure.md documents config.json
test_local_infra_config_json() {
    local file="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    if ! [ -f "$file" ]; then
        fail "TC06: local-infrastructure.md documents config.json" "File not found: $file"
        return
    fi

    local has_config_section=$(grep -ic "Configuration Source of Truth\|config.json" "$file" || true)
    local has_port_fields=$(grep -ic "appPort\|convexCloudPort\|subnet" "$file" || true)

    if [ "$has_config_section" -ge 2 ] && [ "$has_port_fields" -ge 2 ]; then
        pass "TC06: local-infrastructure.md documents config.json"
    else
        fail "TC06: local-infrastructure.md documents config.json" "Missing: config_section=$has_config_section, port_fields=$has_port_fields"
    fi
}

# TC07: local-infrastructure.md explains env file generation
test_local_infra_env_generation() {
    local file="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    local has_generated=$(grep -ic "GENERATED\|generated from config.json" "$file" || true)
    local has_auto_detect=$(grep -ic "auto-detect\|mkcert" "$file" || true)

    if [ "$has_generated" -ge 1 ] && [ "$has_auto_detect" -ge 1 ]; then
        pass "TC07: local-infrastructure.md explains env file generation"
    else
        fail "TC07: local-infrastructure.md explains env file generation" "Missing: generated=$has_generated, auto_detect=$has_auto_detect"
    fi
}

# TC08: local-infrastructure.md shows port lookup flow
test_local_infra_port_flow() {
    local file="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    local has_flow=$(grep -ic "config.json.*agent-init.*env\|flow\|prevent.*conflict" "$file" || true)

    if [ "$has_flow" -ge 1 ]; then
        pass "TC08: local-infrastructure.md shows port lookup flow"
    else
        fail "TC08: local-infrastructure.md shows port lookup flow" "Missing flow documentation"
    fi
}

# TC09: local-infrastructure.md references agent-init.sh
test_local_infra_agent_init() {
    local file="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    local has_script=$(grep -c "agent-init.sh" "$file" || true)

    if [ "$has_script" -ge 1 ]; then
        pass "TC09: local-infrastructure.md references agent-init.sh"
    else
        fail "TC09: local-infrastructure.md references agent-init.sh" "Missing agent-init.sh reference"
    fi
}

# TC10: local-infrastructure.md updates mkcert documentation
test_local_infra_mkcert() {
    local file="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    local has_mkcert=$(grep -ic "NODE_EXTRA_CA_CERTS\|mkcert -CAROOT" "$file" || true)

    if [ "$has_mkcert" -ge 1 ]; then
        pass "TC10: local-infrastructure.md updates mkcert documentation"
    else
        fail "TC10: local-infrastructure.md updates mkcert documentation" "Missing mkcert auto-detection docs"
    fi
}

# TC11: troubleshooting.md documents config.json mismatch
test_troubleshooting_config_mismatch() {
    local file="$PROJECT_ROOT/docs/setup/troubleshooting.md"
    if ! [ -f "$file" ]; then
        fail "TC11: troubleshooting.md documents config.json mismatch" "File not found: $file"
        return
    fi

    local has_mismatch=$(grep -ic "Port Mismatch\|config.json mismatch\|unexpected port" "$file" || true)
    local has_fix=$(grep -c "agent-init.sh" "$file" || true)

    if [ "$has_mismatch" -ge 1 ] && [ "$has_fix" -ge 1 ]; then
        pass "TC11: troubleshooting.md documents config.json mismatch"
    else
        fail "TC11: troubleshooting.md documents config.json mismatch" "Missing: mismatch=$has_mismatch, fix=$has_fix"
    fi
}

# TC12: troubleshooting.md documents missing prerequisites
test_troubleshooting_prerequisites() {
    local file="$PROJECT_ROOT/docs/setup/troubleshooting.md"
    local has_prereqs=$(grep -ic "prerequisite\|node\|npm\|docker\|tmux\|jq\|mkcert" "$file" || true)
    local has_exit_code=$(grep -c "exit code 1" "$file" || true)

    if [ "$has_prereqs" -ge 3 ]; then
        pass "TC12: troubleshooting.md documents missing prerequisites"
    else
        fail "TC12: troubleshooting.md documents missing prerequisites" "Missing prerequisite documentation: $has_prereqs"
    fi
}

# TC13: troubleshooting.md documents mkcert issues
test_troubleshooting_mkcert() {
    local file="$PROJECT_ROOT/docs/setup/troubleshooting.md"
    local has_mkcert_error=$(grep -ic "mkcert not found\|mkcert.*install" "$file" || true)

    if [ "$has_mkcert_error" -ge 1 ]; then
        pass "TC13: troubleshooting.md documents mkcert issues"
    else
        fail "TC13: troubleshooting.md documents mkcert issues" "Missing mkcert troubleshooting"
    fi
}

# TC14: troubleshooting.md documents rollback scenarios
test_troubleshooting_rollback() {
    local file="$PROJECT_ROOT/docs/setup/troubleshooting.md"
    local has_rollback=$(grep -ic "rollback\|backup\|restore.*backup" "$file" || true)

    if [ "$has_rollback" -ge 1 ]; then
        pass "TC14: troubleshooting.md documents rollback scenarios"
    else
        fail "TC14: troubleshooting.md documents rollback scenarios" "Missing rollback documentation"
    fi
}

# TC15: troubleshooting.md documents health check failures
test_troubleshooting_health_checks() {
    local file="$PROJECT_ROOT/docs/setup/troubleshooting.md"
    local has_health=$(grep -ic "health check\|exit code 3\|docker.*healthy" "$file" || true)

    if [ "$has_health" -ge 1 ]; then
        pass "TC15: troubleshooting.md documents health check failures"
    else
        fail "TC15: troubleshooting.md documents health check failures" "Missing health check troubleshooting"
    fi
}

# TC16: Task README documents objectives
test_task_readme_objectives() {
    local file="$PROJECT_ROOT/tasks/00048-agent-init-overhaul/README.md"
    if ! [ -f "$file" ]; then
        fail "TC16: Task README documents objectives" "File not found: $file"
        return
    fi

    local has_objectives=$(grep -ic "2 minute\|zero.*intervention\|COMPLETE" "$file" || true)

    if [ "$has_objectives" -ge 2 ]; then
        pass "TC16: Task README documents objectives"
    else
        fail "TC16: Task README documents objectives" "Missing objectives: $has_objectives"
    fi
}

# TC17: Task README documents all subtasks
test_task_readme_subtasks() {
    local file="$PROJECT_ROOT/tasks/00048-agent-init-overhaul/README.md"
    local has_subtask_15=$(grep -ic "15.*documentation\|subtask 15" "$file" || true)

    if [ "$has_subtask_15" -ge 1 ]; then
        pass "TC17: Task README documents all subtasks"
    else
        fail "TC17: Task README documents all subtasks" "Missing subtask 15: $has_subtask_15"
    fi
}

# TC18: Task README documents outcomes
test_task_readme_outcomes() {
    local file="$PROJECT_ROOT/tasks/00048-agent-init-overhaul/README.md"
    local has_outcomes=$(grep -ic "outcome\|achievement\|improvement\|spinup time" "$file" || true)

    if [ "$has_outcomes" -ge 2 ]; then
        pass "TC18: Task README documents outcomes"
    else
        fail "TC18: Task README documents outcomes" "Missing outcomes: $has_outcomes"
    fi
}

# TC19: Cross-references are valid
test_cross_references() {
    local claude="$PROJECT_ROOT/CLAUDE.md"
    local infra="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
    local trouble="$PROJECT_ROOT/docs/setup/troubleshooting.md"

    local all_exist=true
    [ -f "$claude" ] || all_exist=false
    [ -f "$infra" ] || all_exist=false
    [ -f "$trouble" ] || all_exist=false

    if [ "$all_exist" = true ]; then
        pass "TC19: Cross-references are valid"
    else
        fail "TC19: Cross-references are valid" "Referenced files do not exist"
    fi
}

# TC20: Terminology is consistent
test_terminology_consistency() {
    local claude="$PROJECT_ROOT/CLAUDE.md"
    local has_consistent=$(grep -c "config.json" "$claude" || true)
    local has_scripts=$(grep -c "./scripts/agent-init.sh\|scripts/agent-init.sh" "$claude" || true)

    if [ "$has_consistent" -ge 1 ] && [ "$has_scripts" -ge 1 ]; then
        pass "TC20: Terminology is consistent"
    else
        fail "TC20: Terminology is consistent" "Inconsistent terminology"
    fi
}

# TC21: Code blocks are executable
test_code_blocks_executable() {
    # This is a basic check - just verify scripts referenced exist
    local script="$PROJECT_ROOT/scripts/agent-init.sh"

    if [ -f "$script" ] && [ -x "$script" ]; then
        pass "TC21: Code blocks are executable"
    else
        fail "TC21: Code blocks are executable" "Referenced script not found or not executable: $script"
    fi
}

# TC22: Documentation references implementation
test_documentation_references_implementation() {
    local claude="$PROJECT_ROOT/CLAUDE.md"
    local has_scripts=$(grep -ic "parse-config\|generate-env\|wait.*healthy\|smoke.*test" "$claude" || true)

    if [ "$has_scripts" -ge 1 ]; then
        pass "TC22: Documentation references implementation"
    else
        fail "TC22: Documentation references implementation" "Missing implementation references"
    fi
}

# Run all tests
echo "Running Documentation Tests..."
echo "=============================="

test_claude_references_agent_init
test_claude_config_source_of_truth
test_claude_check_mode
test_claude_troubleshooting_reference
test_claude_rollback
test_local_infra_config_json
test_local_infra_env_generation
test_local_infra_port_flow
test_local_infra_agent_init
test_local_infra_mkcert
test_troubleshooting_config_mismatch
test_troubleshooting_prerequisites
test_troubleshooting_mkcert
test_troubleshooting_rollback
test_troubleshooting_health_checks
test_task_readme_objectives
test_task_readme_subtasks
test_task_readme_outcomes
test_cross_references
test_terminology_consistency
test_code_blocks_executable
test_documentation_references_implementation

echo ""
echo "=============================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
