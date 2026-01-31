#!/bin/bash
# Tests for Subtask 15: Update Documentation
#
# This test suite validates that documentation has been updated to reflect:
# - agent-init.sh as the recommended setup method
# - config.json as the single source of truth
# - New error scenarios and troubleshooting steps
# - Rollback behavior and safety guarantees
#
# Expected: All tests FAIL initially (RED phase)
# After implementation: All tests PASS (GREEN phase)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

# Test counters
TOTAL=0
PASSED=0
FAILED=0

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
pass() {
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗${NC} $1"
    if [ -n "$2" ]; then
        echo -e "  ${YELLOW}Reason:${NC} $2"
    fi
}

test_case() {
    TOTAL=$((TOTAL + 1))
    echo ""
    echo "Test $1"
}

# Test helper: Check if file contains pattern
file_contains() {
    local file="$1"
    local pattern="$2"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    grep -q "$pattern" "$file"
}

# Test helper: Check if file contains all patterns
file_contains_all() {
    local file="$1"
    shift
    local patterns=("$@")
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    for pattern in "${patterns[@]}"; do
        if ! grep -q "$pattern" "$file"; then
            return 1
        fi
    done
    
    return 0
}

# Test helper: Check if section exists in file
section_exists() {
    local file="$1"
    local section="$2"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    grep -qi "^##.*$section" "$file" || grep -qi "^###.*$section" "$file"
}

# Test helper: Count occurrences of pattern in file
count_occurrences() {
    local file="$1"
    local pattern="$2"
    
    if [ ! -f "$file" ]; then
        echo "0"
        return
    fi
    
    grep -c "$pattern" "$file" || echo "0"
}

# =============================================================================
# Category 1: CLAUDE.md Updates
# =============================================================================

test_case "TC01: CLAUDE.md references agent-init.sh"
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
if file_contains_all "$CLAUDE_MD" \
    "agent-init.sh" \
    "--check" \
    "prerequisites" \
    "Recommended"; then
    
    # Check for list of what the script does
    if grep -A 10 "agent-init.sh" "$CLAUDE_MD" | grep -q "Verifies\|Copies\|Generates\|Installs\|Starts\|Creates"; then
        pass "TC01: CLAUDE.md references agent-init.sh with details"
    else
        fail "TC01: CLAUDE.md references agent-init.sh" "Missing list of initialization steps"
    fi
else
    fail "TC01: CLAUDE.md references agent-init.sh" "Missing key content (agent-init.sh, --check, or 'Recommended')"
fi

test_case "TC02: CLAUDE.md explains config.json as source of truth"
if file_contains_all "$CLAUDE_MD" \
    "config.json" \
    "orchestrator" \
    "source of truth\|single source\|derived"; then
    
    # Check for warning about hardcoding
    if grep -i "never\|don't\|avoid" "$CLAUDE_MD" | grep -qi "hardcod\|port"; then
        pass "TC02: CLAUDE.md explains config.json as source of truth"
    else
        fail "TC02: CLAUDE.md explains config.json" "Missing warning about hardcoding ports"
    fi
else
    fail "TC02: CLAUDE.md explains config.json as source of truth" "Missing explanation of config.json role"
fi

test_case "TC03: CLAUDE.md documents --check mode"
if grep -A 5 "agent-init.sh --check" "$CLAUDE_MD" | grep -qi "status\|configuration\|check"; then
    # Look for mention of multi-source comparison
    if grep -A 10 "agent-init.sh --check" "$CLAUDE_MD" | grep -qi "config.json\|\.env"; then
        pass "TC03: CLAUDE.md documents --check mode"
    else
        fail "TC03: CLAUDE.md documents --check mode" "Missing explanation of what --check displays"
    fi
else
    fail "TC03: CLAUDE.md documents --check mode" "Missing --check documentation"
fi

test_case "TC04: CLAUDE.md references troubleshooting doc"
if file_contains "$CLAUDE_MD" "docs/setup/troubleshooting.md" && \
   file_contains "$CLAUDE_MD" "docs/setup/local-infrastructure.md"; then
    pass "TC04: CLAUDE.md references troubleshooting and infrastructure docs"
else
    fail "TC04: CLAUDE.md references troubleshooting doc" "Missing links to docs/setup/ documentation"
fi

test_case "TC05: CLAUDE.md explains rollback behavior"
if grep -i "backup\|rollback" "$CLAUDE_MD" | grep -qi "env\|config\|fail"; then
    # Check for reassurance about safety
    if grep -B 5 -A 5 -i "backup\|rollback" "$CLAUDE_MD" | grep -qi "safe\|restore\|ctrl.*c\|sigint"; then
        pass "TC05: CLAUDE.md explains rollback behavior"
    else
        fail "TC05: CLAUDE.md explains rollback" "Missing explanation of safety/restore on failure"
    fi
else
    fail "TC05: CLAUDE.md explains rollback behavior" "No mention of backup/rollback"
fi

# =============================================================================
# Category 2: local-infrastructure.md Updates
# =============================================================================

test_case "TC06: local-infrastructure.md documents config.json"
INFRA_MD="$PROJECT_ROOT/docs/setup/local-infrastructure.md"
if section_exists "$INFRA_MD" "configuration\|config\.json\|source of truth"; then
    # Check for port field documentation
    if file_contains_all "$INFRA_MD" \
        "appPort" \
        "convexCloudPort" \
        "subnet"; then
        pass "TC06: local-infrastructure.md documents config.json structure"
    else
        fail "TC06: local-infrastructure.md documents config.json" "Missing port field documentation"
    fi
else
    fail "TC06: local-infrastructure.md documents config.json" "Missing configuration section"
fi

test_case "TC07: local-infrastructure.md explains env file generation"
if grep -i "generat" "$INFRA_MD" | grep -qi "\.env\|environment"; then
    # Check for discouragement of manual editing
    if grep -B 3 -A 3 -i "generat" "$INFRA_MD" | grep -qi "don't.*edit\|auto.*generat\|derived"; then
        pass "TC07: local-infrastructure.md explains env file generation"
    else
        fail "TC07: local-infrastructure.md explains env generation" "Missing guidance against manual editing"
    fi
else
    fail "TC07: local-infrastructure.md explains env file generation" "No mention of generated env files"
fi

test_case "TC08: local-infrastructure.md shows port lookup flow"
if grep -C 5 "config\.json" "$INFRA_MD" | grep -qi "agent-init\|\.env"; then
    # Check for multi-agent support mention
    if file_contains "$INFRA_MD" "multi-agent\|multiple agents\|agent-specific"; then
        pass "TC08: local-infrastructure.md shows port lookup flow"
    else
        fail "TC08: local-infrastructure.md shows port lookup flow" "Missing multi-agent context"
    fi
else
    fail "TC08: local-infrastructure.md shows port lookup flow" "Missing flow documentation"
fi

test_case "TC09: local-infrastructure.md references agent-init.sh"
if file_contains "$INFRA_MD" "agent-init.sh" || \
   file_contains "$INFRA_MD" "./scripts/agent-init.sh"; then
    pass "TC09: local-infrastructure.md references agent-init.sh"
else
    fail "TC09: local-infrastructure.md references agent-init.sh" "No reference to agent-init.sh"
fi

test_case "TC10: local-infrastructure.md updates mkcert documentation"
if grep -B 5 -A 5 "NODE_EXTRA_CA_CERTS" "$INFRA_MD" | grep -qi "auto.*detect\|agent-init"; then
    pass "TC10: local-infrastructure.md documents mkcert auto-detection"
else
    fail "TC10: local-infrastructure.md updates mkcert documentation" "Missing auto-detection explanation"
fi

# =============================================================================
# Category 3: troubleshooting.md Updates
# =============================================================================

test_case "TC11: troubleshooting.md documents config.json mismatch"
TROUBLE_MD="$PROJECT_ROOT/docs/setup/troubleshooting.md"
if section_exists "$TROUBLE_MD" "mismatch\|port.*conflict\|configuration.*mismatch"; then
    # Check for solution
    if grep -A 10 -i "mismatch\|conflict" "$TROUBLE_MD" | grep -qi "agent-init.sh\|regenerate"; then
        pass "TC11: troubleshooting.md documents config.json mismatch"
    else
        fail "TC11: troubleshooting.md documents mismatch" "Missing solution (agent-init.sh)"
    fi
else
    fail "TC11: troubleshooting.md documents config.json mismatch" "Missing port mismatch section"
fi

test_case "TC12: troubleshooting.md documents missing prerequisites"
if grep -i "prerequisite\|exit.*code.*1" "$TROUBLE_MD" | grep -qi "node\|npm\|docker\|tmux\|jq\|mkcert"; then
    # Check for install commands
    count=$(count_occurrences "$TROUBLE_MD" "apt install\|brew install\|install")
    if [ "$count" -ge 2 ]; then
        pass "TC12: troubleshooting.md documents missing prerequisites"
    else
        fail "TC12: troubleshooting.md documents prerequisites" "Missing install commands"
    fi
else
    fail "TC12: troubleshooting.md documents missing prerequisites" "No prerequisite troubleshooting"
fi

test_case "TC13: troubleshooting.md documents mkcert issues"
if grep -i "mkcert" "$TROUBLE_MD" | grep -qi "not found\|install"; then
    # Check for OS-specific instructions
    if file_contains_all "$TROUBLE_MD" "macOS\|brew" "Ubuntu\|Debian\|apt"; then
        pass "TC13: troubleshooting.md documents mkcert issues"
    else
        fail "TC13: troubleshooting.md documents mkcert" "Missing OS-specific install instructions"
    fi
else
    fail "TC13: troubleshooting.md documents mkcert issues" "No mkcert troubleshooting"
fi

test_case "TC14: troubleshooting.md documents rollback scenarios"
if grep -i "backup\|rollback" "$TROUBLE_MD" | head -1 | grep -q .; then
    # Check for manual restore instructions
    if grep -A 5 -i "backup\|rollback" "$TROUBLE_MD" | grep -qi "\.backup\|restore"; then
        pass "TC14: troubleshooting.md documents rollback scenarios"
    else
        fail "TC14: troubleshooting.md documents rollback" "Missing manual restore instructions"
    fi
else
    fail "TC14: troubleshooting.md documents rollback scenarios" "No rollback documentation"
fi

test_case "TC15: troubleshooting.md documents health check failures"
if grep -i "health\|exit.*code.*3" "$TROUBLE_MD" | grep -qi "docker\|container"; then
    # Check for debugging steps
    if grep -A 10 -i "health.*fail\|exit.*code.*3" "$TROUBLE_MD" | grep -qi "docker ps\|docker logs"; then
        pass "TC15: troubleshooting.md documents health check failures"
    else
        fail "TC15: troubleshooting.md documents health failures" "Missing debugging commands"
    fi
else
    fail "TC15: troubleshooting.md documents health check failures" "No health check troubleshooting"
fi

# =============================================================================
# Category 4: Task README Updates
# =============================================================================

test_case "TC16: Task README documents objectives"
TASK_README="$PROJECT_ROOT/tasks/00048-agent-init-overhaul/README.md"
if file_contains_all "$TASK_README" \
    "2 minute\|<2 minute\|sub-2" \
    "zero.*intervention\|no.*manual\|automatic"; then
    
    # Check for problem statement
    if grep -i "problem\|12.*minute\|25.*intervention" "$TASK_README" | head -1 | grep -q .; then
        pass "TC16: Task README documents objectives"
    else
        fail "TC16: Task README documents objectives" "Missing problem statement"
    fi
else
    fail "TC16: Task README documents objectives" "Missing goal statements"
fi

test_case "TC17: Task README documents all subtasks"
if [ -f "$TASK_README" ]; then
    # Count subtask references (should be 15)
    subtask_count=$(grep -c "Subtask\|subtask.*[0-9]" "$TASK_README" || echo "0")
    
    if [ "$subtask_count" -ge 15 ]; then
        # Check for subtask 15 documentation
        if grep -i "15\|documentation" "$TASK_README" | grep -qi "subtask\|document"; then
            pass "TC17: Task README documents all subtasks"
        else
            fail "TC17: Task README documents subtasks" "Subtask 15 (documentation) not listed"
        fi
    else
        fail "TC17: Task README documents all subtasks" "Found only $subtask_count subtask references, expected 15"
    fi
else
    fail "TC17: Task README documents all subtasks" "Task README not found"
fi

test_case "TC18: Task README documents outcomes"
if section_exists "$TASK_README" "outcome\|result\|achievement\|complete"; then
    # Check for key improvements mentioned
    if file_contains_all "$TASK_README" \
        "config.json\|source of truth" \
        "health check" \
        "rollback"; then
        pass "TC18: Task README documents outcomes"
    else
        fail "TC18: Task README documents outcomes" "Missing key improvements"
    fi
else
    fail "TC18: Task README documents outcomes" "Missing outcomes section"
fi

# =============================================================================
# Category 5: Cross-Reference Validation
# =============================================================================

test_case "TC19: Cross-references are valid"
valid_refs=true
error_msg=""

# Check CLAUDE.md → docs/setup/ links
if file_contains "$CLAUDE_MD" "docs/setup/troubleshooting.md"; then
    if [ ! -f "$PROJECT_ROOT/docs/setup/troubleshooting.md" ]; then
        valid_refs=false
        error_msg="CLAUDE.md links to non-existent troubleshooting.md"
    fi
fi

if file_contains "$CLAUDE_MD" "docs/setup/local-infrastructure.md"; then
    if [ ! -f "$PROJECT_ROOT/docs/setup/local-infrastructure.md" ]; then
        valid_refs=false
        error_msg="CLAUDE.md links to non-existent local-infrastructure.md"
    fi
fi

# Check for valid script paths
if grep "scripts/agent-init.sh\|./scripts/agent-init.sh" "$CLAUDE_MD" "$INFRA_MD" "$TROUBLE_MD" 2>/dev/null | head -1 | grep -q .; then
    if [ ! -f "$PROJECT_ROOT/scripts/agent-init.sh" ]; then
        valid_refs=false
        error_msg="Documentation references non-existent scripts/agent-init.sh"
    fi
fi

if [ "$valid_refs" = true ]; then
    pass "TC19: Cross-references are valid"
else
    fail "TC19: Cross-references are valid" "$error_msg"
fi

test_case "TC20: Terminology is consistent"
consistent=true
issues=""

# Check config.json terminology
if grep -c "config\.json" "$CLAUDE_MD" "$INFRA_MD" "$TROUBLE_MD" 2>/dev/null | grep -q "^[0-9]*$"; then
    # Should be called config.json, not configuration.json or settings.json
    if grep -i "configuration\.json\|settings\.json" "$CLAUDE_MD" "$INFRA_MD" 2>/dev/null | head -1 | grep -q .; then
        consistent=false
        issues="Inconsistent naming: found 'configuration.json' or 'settings.json' instead of 'config.json'"
    fi
fi

# Check script path consistency (should be ./scripts/ not just scripts/)
inconsistent_paths=$(grep -h "scripts/agent-init" "$CLAUDE_MD" "$INFRA_MD" "$TROUBLE_MD" 2>/dev/null | grep -v "^\./scripts/" | head -1)
if [ -n "$inconsistent_paths" ]; then
    consistent=false
    issues="Inconsistent script paths: some missing './' prefix"
fi

if [ "$consistent" = true ]; then
    pass "TC20: Terminology is consistent"
else
    fail "TC20: Terminology is consistent" "$issues"
fi

test_case "TC21: Code blocks are executable"
executable=true
syntax_issues=""

# Extract bash code blocks and check for common syntax errors
# This is a simplified check - just looking for obvious issues

# Check for invalid paths in code blocks
if grep -A 3 '```bash' "$CLAUDE_MD" "$INFRA_MD" "$TROUBLE_MD" 2>/dev/null | \
   grep -E "cd /nonexistent|docker exec nonexistent" | head -1 | grep -q .; then
    executable=false
    syntax_issues="Found invalid paths in code examples"
fi

# Check that agent-init.sh exit codes are correct (0,1,2,3,4,5,6)
if grep -h "exit.*code" "$TROUBLE_MD" 2>/dev/null | grep -E "exit.*[789]|exit.*1[0-9]" | head -1 | grep -q .; then
    executable=false
    syntax_issues="Documentation mentions invalid exit codes (should be 0-6)"
fi

if [ "$executable" = true ]; then
    pass "TC21: Code blocks are executable"
else
    fail "TC21: Code blocks are executable" "$syntax_issues"
fi

test_case "TC22: Documentation references implementation"
accurate=true
impl_issues=""

# Check that exit codes match agent-init.sh implementation
AGENT_INIT="$PROJECT_ROOT/scripts/agent-init.sh"
if [ -f "$AGENT_INIT" ]; then
    # agent-init.sh defines exit codes 0-6
    if grep "Exit.*[Cc]ode" "$TROUBLE_MD" "$CLAUDE_MD" 2>/dev/null | grep -E "[789]|1[0-9]" | head -1 | grep -q .; then
        accurate=false
        impl_issues="Documentation references non-existent exit codes"
    fi
    
    # Check that script names match
    if grep -i "parse.*config\|generate.*env.*nextjs\|wait.*healthy\|smoke.*test" "$INFRA_MD" "$CLAUDE_MD" 2>/dev/null | head -1 | grep -q .; then
        # These scripts should exist
        for script in "lib/parse-config.sh" "lib/generate-env-nextjs.sh" "lib/wait-for-healthy.sh" "lib/smoke-test.sh"; do
            if [ ! -f "$PROJECT_ROOT/scripts/$script" ]; then
                accurate=false
                impl_issues="Documentation references non-existent script: $script"
                break
            fi
        done
    fi
fi

if [ "$accurate" = true ]; then
    pass "TC22: Documentation references implementation"
else
    fail "TC22: Documentation references implementation" "$impl_issues"
fi

# =============================================================================
# Test Summary
# =============================================================================

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total:  $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Documentation is complete and accurate."
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Expected: All tests fail in RED phase (before documentation written)"
    echo "Action:   Update documentation files to make tests pass"
    echo ""
    echo "Files to update:"
    echo "  - CLAUDE.md"
    echo "  - docs/setup/local-infrastructure.md"
    echo "  - docs/setup/troubleshooting.md"
    echo "  - tasks/00048-agent-init-overhaul/README.md"
    exit 1
fi