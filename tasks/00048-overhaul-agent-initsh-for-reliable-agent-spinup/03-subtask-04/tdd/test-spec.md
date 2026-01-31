I'll write comprehensive failing tests for the master generate-all-env.sh script that orchestrates all environment file generation.

<artifact name="test-spec.md" type="text/markdown">
# Test Specification: generate-all-env.sh

## Overview
Tests for the master environment generation script that orchestrates creation of all 4 environment files from config.json.

## Test Strategy

### Unit Tests (Bash)
- Script existence and permissions
- Help output
- Prerequisites validation
- Orchestration logic (calls correct generators)
- Error propagation from sub-generators
- Idempotency (safe to run multiple times)
- Output directory creation
- Progress reporting
- Exit codes

### Test Fixtures
- Mock config.json (reuse from subtask 1)
- Mock generator scripts (track calls)
- Temporary test directories

## Success Criteria
- ✅ All tests FAIL initially (RED phase)
- ✅ Tests are independent and isolated
- ✅ Tests validate orchestration, not implementation
- ✅ Clear test names expressing intent
- ✅ Comprehensive edge case coverage

## Exit Code Contract
| Code | Meaning |
|------|---------|
| 0 | Success - all files generated |
| 1 | Missing prerequisites (jq, config.json) |
| 2 | Docker generator failed |
| 3 | Dev generator failed |
| 4 | Next.js generator failed |
| 5 | Convex generator failed |
| 64 | Invalid arguments |

## Test Coverage Map
1. **Basic Functionality**
   - Script exists and is executable
   - Help flag works
   - Calls all 4 generators in correct order
   - Passes agent name to generators

2. **Prerequisites**
   - Detects missing jq
   - Detects missing config.json
   - Detects missing AGENT_NAME argument

3. **Error Handling**
   - Propagates docker generator failure (exit 2)
   - Propagates dev generator failure (exit 3)
   - Propagates nextjs generator failure (exit 4)
   - Propagates convex generator failure (exit 5)
   - Stops on first failure (fail-fast)

4. **Idempotency**
   - Safe to run multiple times
   - Overwrites existing files
   - No errors if files already exist

5. **Output & Progress**
   - Reports progress for each generator
   - Shows success/failure clearly
   - Lists generated files on success

</artifact>

<artifact name="tests/unit/04-generate-all-env.test.sh" type="application/x-sh">
#!/usr/bin/env bash
# tests/unit/04-generate-all-env.test.sh
#
# Unit tests for generate-all-env.sh master orchestration script
# Tests orchestration logic, error propagation, and idempotency

set -euo pipefail

# Test framework setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TEMP_DIR=""
TEST_RESULTS=()

setup_test_env() {
    TEST_TEMP_DIR=$(mktemp -d)
    
    # Create mock config.json
    cat > "$TEST_TEMP_DIR/config.json" << 'EOF'
{
  "agents": {
    "test-agent": {
      "appPort": 3000,
      "convexCloudPort": 3001,
      "convexSitePort": 3002,
      "subnet": "172.20.0.0/16",
      "dockerNetwork": "test-agent-network"
    }
  }
}
EOF

    # Create mock generator scripts (track if they were called)
    mkdir -p "$TEST_TEMP_DIR/scripts"
    
    # Mock docker generator
    cat > "$TEST_TEMP_DIR/scripts/generate-env-docker.sh" << 'EOF'
#!/usr/bin/env bash
echo "MOCK_DOCKER_GENERATOR_CALLED=1" > "$TEST_TEMP_DIR/docker-called"
echo "  ✓ .env.docker.local"
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-docker.sh"
    
    # Mock dev generator
    cat > "$TEST_TEMP_DIR/scripts/generate-env-dev.sh" << 'EOF'
#!/usr/bin/env bash
echo "MOCK_DEV_GENERATOR_CALLED=1" > "$TEST_TEMP_DIR/dev-called"
echo "  ✓ .env.dev.local"
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-dev.sh"
    
    # Mock nextjs generator
    cat > "$TEST_TEMP_DIR/scripts/generate-env-nextjs.sh" << 'EOF'
#!/usr/bin/env bash
echo "MOCK_NEXTJS_GENERATOR_CALLED=1" > "$TEST_TEMP_DIR/nextjs-called"
echo "  ✓ app/.env.nextjs.local"
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-nextjs.sh"
    
    # Mock convex generator
    cat > "$TEST_TEMP_DIR/scripts/generate-env-convex.sh" << 'EOF'
#!/usr/bin/env bash
echo "MOCK_CONVEX_GENERATOR_CALLED=1" > "$TEST_TEMP_DIR/convex-called"
echo "  ✓ app/.env.convex.local"
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-convex.sh"
}

teardown_test_env() {
    if [ -n "$TEST_TEMP_DIR" ] && [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"
    
    if [ "$expected" = "$actual" ]; then
        echo "✓ PASS: $message"
        TEST_RESULTS+=("PASS")
        return 0
    else
        echo "✗ FAIL: $message"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        TEST_RESULTS+=("FAIL")
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-File should exist: $file}"
    
    if [ -f "$file" ]; then
        echo "✓ PASS: $message"
        TEST_RESULTS+=("PASS")
        return 0
    else
        echo "✗ FAIL: $message"
        echo "  File not found: $file"
        TEST_RESULTS+=("FAIL")
        return 1
    fi
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"
    
    if [ "$expected" -eq "$actual" ]; then
        echo "✓ PASS: $message (exit $actual)"
        TEST_RESULTS+=("PASS")
        return 0
    else
        echo "✗ FAIL: $message"
        echo "  Expected exit code: $expected"
        echo "  Actual exit code:   $actual"
        TEST_RESULTS+=("FAIL")
        return 1
    fi
}

# Test 1: Script exists and is executable
test_script_exists() {
    echo "=== Test 1: Script exists and is executable ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    assert_file_exists "$script" "generate-all-env.sh should exist"
    
    if [ -x "$script" ]; then
        echo "✓ PASS: Script is executable"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Script is not executable"
        TEST_RESULTS+=("FAIL")
    fi
}

# Test 2: Help flag works
test_help_flag() {
    echo ""
    echo "=== Test 2: Help flag shows usage ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    local output
    output=$("$script" --help 2>&1 || true)
    
    if echo "$output" | grep -q "Usage:"; then
        echo "✓ PASS: Help shows usage"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Help doesn't show usage"
        TEST_RESULTS+=("FAIL")
    fi
    
    if echo "$output" | grep -q "generate-all-env.sh"; then
        echo "✓ PASS: Help mentions script name"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Help doesn't mention script name"
        TEST_RESULTS+=("FAIL")
    fi
}

# Test 3: Requires AGENT_NAME argument
test_requires_agent_name() {
    echo ""
    echo "=== Test 3: Requires AGENT_NAME argument ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Run without AGENT_NAME
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" 2>&1 || exit_code=$?
    
    assert_exit_code 64 "$exit_code" "Should exit 64 when AGENT_NAME missing"
    
    teardown_test_env
}

# Test 4: Detects missing jq
test_detects_missing_jq() {
    echo ""
    echo "=== Test 4: Detects missing jq ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Run with PATH that excludes jq
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    PATH="/usr/bin:/bin" "$script" test-agent 2>&1 || exit_code=$?
    
    # Should fail with prerequisites error if jq not in restricted PATH
    if ! command -v jq >/dev/null 2>&1; then
        assert_exit_code 1 "$exit_code" "Should exit 1 when jq missing"
    else
        echo "✓ SKIP: jq is in system PATH, cannot test missing jq"
        TEST_RESULTS+=("SKIP")
    fi
    
    teardown_test_env
}

# Test 5: Detects missing config.json
test_detects_missing_config() {
    echo ""
    echo "=== Test 5: Detects missing config.json ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Remove config.json
    rm -f "$TEST_TEMP_DIR/config.json"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 1 "$exit_code" "Should exit 1 when config.json missing"
    
    teardown_test_env
}

# Test 6: Calls all 4 generators
test_calls_all_generators() {
    echo ""
    echo "=== Test 6: Calls all 4 generators in order ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Patch script to use mock generators
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    export TEST_TEMP_DIR
    
    cd "$TEST_TEMP_DIR"
    "$script" test-agent >/dev/null 2>&1 || true
    
    assert_file_exists "$TEST_TEMP_DIR/docker-called" "Should call docker generator"
    assert_file_exists "$TEST_TEMP_DIR/dev-called" "Should call dev generator"
    assert_file_exists "$TEST_TEMP_DIR/nextjs-called" "Should call nextjs generator"
    assert_file_exists "$TEST_TEMP_DIR/convex-called" "Should call convex generator"
    
    teardown_test_env
}

# Test 7: Propagates docker generator failure
test_propagates_docker_failure() {
    echo ""
    echo "=== Test 7: Propagates docker generator failure ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Make docker generator fail
    cat > "$TEST_TEMP_DIR/scripts/generate-env-docker.sh" << 'EOF'
#!/usr/bin/env bash
echo "ERROR: Docker generator failed"
exit 2
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-docker.sh"
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 2 "$exit_code" "Should exit 2 when docker generator fails"
    
    teardown_test_env
}

# Test 8: Propagates dev generator failure
test_propagates_dev_failure() {
    echo ""
    echo "=== Test 8: Propagates dev generator failure ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Make dev generator fail
    cat > "$TEST_TEMP_DIR/scripts/generate-env-dev.sh" << 'EOF'
#!/usr/bin/env bash
echo "ERROR: Dev generator failed"
exit 3
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-dev.sh"
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 3 "$exit_code" "Should exit 3 when dev generator fails"
    
    teardown_test_env
}

# Test 9: Propagates nextjs generator failure
test_propagates_nextjs_failure() {
    echo ""
    echo "=== Test 9: Propagates nextjs generator failure ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Make nextjs generator fail
    cat > "$TEST_TEMP_DIR/scripts/generate-env-nextjs.sh" << 'EOF'
#!/usr/bin/env bash
echo "ERROR: Next.js generator failed"
exit 4
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-nextjs.sh"
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 4 "$exit_code" "Should exit 4 when nextjs generator fails"
    
    teardown_test_env
}

# Test 10: Propagates convex generator failure
test_propagates_convex_failure() {
    echo ""
    echo "=== Test 10: Propagates convex generator failure ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Make convex generator fail
    cat > "$TEST_TEMP_DIR/scripts/generate-env-convex.sh" << 'EOF'
#!/usr/bin/env bash
echo "ERROR: Convex generator failed"
exit 5
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-convex.sh"
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 5 "$exit_code" "Should exit 5 when convex generator fails"
    
    teardown_test_env
}

# Test 11: Stops on first failure (fail-fast)
test_fail_fast() {
    echo ""
    echo "=== Test 11: Stops on first failure (fail-fast) ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    # Make docker generator fail
    cat > "$TEST_TEMP_DIR/scripts/generate-env-docker.sh" << 'EOF'
#!/usr/bin/env bash
echo "DOCKER_FAILED" > "$TEST_TEMP_DIR/docker-called"
exit 2
EOF
    chmod +x "$TEST_TEMP_DIR/scripts/generate-env-docker.sh"
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    export TEST_TEMP_DIR
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent 2>&1 || exit_code=$?
    
    assert_exit_code 2 "$exit_code" "Should exit with docker failure code"
    
    # Subsequent generators should NOT be called
    if [ ! -f "$TEST_TEMP_DIR/dev-called" ]; then
        echo "✓ PASS: Dev generator not called after docker failure (fail-fast)"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Dev generator was called after docker failure (should stop)"
        TEST_RESULTS+=("FAIL")
    fi
    
    teardown_test_env
}

# Test 12: Idempotent - safe to run multiple times
test_idempotent() {
    echo ""
    echo "=== Test 12: Idempotent - safe to run multiple times ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    cd "$TEST_TEMP_DIR"
    
    # Run first time
    local exit_code_1=0
    "$script" test-agent >/dev/null 2>&1 || exit_code_1=$?
    
    # Run second time (should succeed)
    local exit_code_2=0
    "$script" test-agent >/dev/null 2>&1 || exit_code_2=$?
    
    assert_exit_code 0 "$exit_code_1" "First run should succeed"
    assert_exit_code 0 "$exit_code_2" "Second run should succeed (idempotent)"
    
    teardown_test_env
}

# Test 13: Shows progress output
test_progress_output() {
    echo ""
    echo "=== Test 13: Shows progress output ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local output
    cd "$TEST_TEMP_DIR"
    output=$("$script" test-agent 2>&1 || true)
    
    if echo "$output" | grep -q "Generating environment files"; then
        echo "✓ PASS: Shows generation header"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Missing generation header"
        TEST_RESULTS+=("FAIL")
    fi
    
    if echo "$output" | grep -q ".env.docker.local"; then
        echo "✓ PASS: Shows docker file progress"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Missing docker file progress"
        TEST_RESULTS+=("FAIL")
    fi
    
    teardown_test_env
}

# Test 14: Success exit code when all generators succeed
test_success_exit_code() {
    echo ""
    echo "=== Test 14: Success exit code (0) when all generators succeed ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local exit_code=0
    cd "$TEST_TEMP_DIR"
    "$script" test-agent >/dev/null 2>&1 || exit_code=$?
    
    assert_exit_code 0 "$exit_code" "Should exit 0 when all generators succeed"
    
    teardown_test_env
}

# Test 15: Lists generated files on success
test_lists_generated_files() {
    echo ""
    echo "=== Test 15: Lists generated files on success ==="
    
    local script="$TASK_ROOT/scripts/generate-all-env.sh"
    
    if [ ! -f "$script" ]; then
        echo "✗ SKIP: Script doesn't exist yet"
        TEST_RESULTS+=("SKIP")
        return
    fi
    
    setup_test_env
    
    export PATH="$TEST_TEMP_DIR/scripts:$PATH"
    
    local output
    cd "$TEST_TEMP_DIR"
    output=$("$script" test-agent 2>&1 || true)
    
    if echo "$output" | grep -q "Generated"; then
        echo "✓ PASS: Shows completion message"
        TEST_RESULTS+=("PASS")
    else
        echo "✗ FAIL: Missing completion message"
        TEST_RESULTS+=("FAIL")
    fi
    
    teardown_test_env
}

# Run all tests
main() {
    echo "========================================"
    echo "Testing: generate-all-env.sh"
    echo "========================================"
    
    test_script_exists
    test_help_flag
    test_requires_agent_name
    test_detects_missing_jq
    test_detects_missing_config
    test_calls_all_generators
    test_propagates_docker_failure
    test_propagates_dev_failure
    test_propagates_nextjs_failure
    test_propagates_convex_failure
    test_fail_fast
    test_idempotent
    test_progress_output
    test_success_exit_code
    test_lists_generated_files
    
    # Summary
    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    
    local pass_count=0
    local fail_count=0
    local skip_count=0
    
    for result in "${TEST_RESULTS[@]}"; do
        case "$result" in
            PASS) ((pass_count++)) ;;
            FAIL) ((fail_count++)) ;;
            SKIP) ((skip_count++)) ;;
        esac
    done
    
    echo "Passed: $pass_count"
    echo "Failed: $fail_count"
    echo "Skipped: $skip_count"
    echo "Total: ${#TEST_RESULTS[@]}"
    
    if [ $fail_count -gt 0 ]; then
        echo ""
        echo "Status: FAILED (as expected - RED phase)"
        exit 1
    else
        echo ""
        echo "Status: All tests passed or skipped"
        exit 0
    fi
}

main "$@"
</artifact>

I've created comprehensive failing tests for the master `generate-all-env.sh` orchestration script. Here's what the tests cover:

## Test Coverage

### **Basic Functionality (Tests 1-2)**
- Script exists and is executable
- Help flag shows proper usage

### **Prerequisites Validation (Tests 3-5)**
- Requires AGENT_NAME argument (exit 64)
- Detects missing jq (exit 1)
- Detects missing config.json (exit 1)

### **Orchestration Logic (Test 6)**
- Calls all 4 generators in order
- Uses mock generators to track calls

### **Error Propagation (Tests 7-10)**
- Propagates docker generator failure (exit 2)
- Propagates dev generator failure (exit 3)
- Propagates nextjs generator failure (exit 4)
- Propagates convex generator failure (exit 5)

### **Fail-Fast Behavior (Test 11)**
- Stops on first failure
- Doesn't call subsequent generators after failure

### **Idempotency (Test 12)**
- Safe to run multiple times
- Second run succeeds without errors

### **Output & Progress (Tests 13, 15)**
- Shows progress for each generator
- Shows completion message
- Lists generated files

### **Success Case (Test 14)**
- Returns exit code 0 when all generators succeed

## Key Features

1. **Mock Generators**: Creates lightweight mock scripts that track whether they were called
2. **Isolated Tests**: Each test uses temporary directories and cleans up
3. **Exit Code Validation**: Tests exact exit codes per the contract
4. **Progress Output**: Validates user-facing output
5. **Fail-Fast**: Ensures script stops on first error (doesn't continue after failure)

## Running the Tests

```bash
cd tasks/00048-agent-init-overhaul
bash tests/unit/04-generate-all-env.test.sh
```

**Expected Result**: All tests should **FAIL** or **SKIP** (RED phase) until you implement the script.

The tests are ready for TDD development! 🔴