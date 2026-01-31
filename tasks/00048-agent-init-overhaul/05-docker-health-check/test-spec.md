# Test Specification: Docker Health Check Utility

## Purpose
Create a utility script (`scripts/lib/wait-for-healthy.sh`) that waits for Docker containers to report healthy status before proceeding. This prevents race conditions during agent initialization.

## Test Results Summary

**Status:** RED Phase ✓ (All tests failing as expected)

| Test | Status | Description |
|------|--------|-------------|
| TC01 | ❌ FAIL | Script exists and is executable |
| TC02 | ❌ FAIL | Missing docker command |
| TC03 | ❌ FAIL | Container does not exist |
| TC04 | ❌ FAIL | Container has no healthcheck |
| TC05 | ❌ FAIL | Container already healthy |
| TC06 | ❌ FAIL | Container becomes healthy after delay |
| TC07 | ❌ FAIL | Container times out |
| TC08 | ❌ FAIL | Custom timeout parameter |
| TC09 | ❌ FAIL | Default timeout (60 seconds) |
| TC10 | ❌ FAIL | Container in starting state |
| TC11 | ❌ FAIL | Container unhealthy state retries |
| TC12 | ❌ FAIL | Reasonable polling interval |
| TC13 | ❌ FAIL | Progress output format |
| TC14 | ❌ FAIL | Can be sourced without execution |
| TC15 | ⚠️ SKIP | Multiple containers (stretch goal) |

**Total:** 15 tests
**Passed:** 0
**Failed:** 14
**Skipped:** 1 (stretch goal)

## Acceptance Criteria

### TC01: Script exists and is executable
**Requirement:** File `scripts/lib/wait-for-healthy.sh` exists and has execute permissions.

**Test:** Checks file existence and executable bit.

**Expected:** File exists with `-x` permission.

---

### TC02: Missing docker command
**Requirement:** When `docker` command is not available, script exits with code 1 and clear error.

**Test:** Mocks `docker` as unavailable, calls `wait_for_container_healthy`.

**Expected:**
- Exit code: 1
- Output contains: "docker"

---

### TC03: Container does not exist
**Requirement:** When given a container name that doesn't exist, script exits with code 2.

**Test:** Mocks `docker inspect` to return error for non-existent container.

**Expected:**
- Exit code: 2
- Output contains: "not found"

---

### TC04: Container has no healthcheck
**Requirement:** When container exists but has no healthcheck configured, script exits with code 3.

**Test:** Mocks `docker inspect` to return empty health status.

**Expected:**
- Exit code: 3
- Output contains: "no healthcheck"

---

### TC05: Container already healthy
**Requirement:** When container is already healthy, script succeeds immediately.

**Test:** Mocks health status as "healthy" on first check.

**Expected:**
- Exit code: 0
- Output contains: "healthy"
- Completes quickly (< 2 seconds preferred)

---

### TC06: Container becomes healthy after delay
**Requirement:** When container starts unhealthy but becomes healthy, script waits and succeeds.

**Test:** Mocks health status as "starting" for 2 checks, then "healthy".

**Expected:**
- Exit code: 0
- Output contains: "healthy"
- Shows progress while waiting

---

### TC07: Container times out
**Requirement:** When container doesn't become healthy within timeout, script exits with code 6.

**Test:** Mocks health status to always return "starting", uses 3-second timeout.

**Expected:**
- Exit code: 6
- Output contains: "timeout"

---

### TC08: Custom timeout parameter
**Requirement:** When timeout parameter is provided, script uses custom timeout.

**Test:** Calls with 5-second timeout, verifies timeout is respected.

**Expected:**
- Timeout occurs around 5 seconds (±2s tolerance for overhead)
- Exit code: 6

---

### TC09: Default timeout (60 seconds)
**Requirement:** When no timeout parameter provided, script uses 60-second default.

**Test:** Checks script content for default timeout value.

**Expected:**
- Script defines default timeout as 60 seconds

---

### TC10: Container in starting state
**Requirement:** When container health is "starting", script waits and retries.

**Test:** Mocks health as "starting" once, then "healthy".

**Expected:**
- Exit code: 0
- Doesn't fail immediately on "starting" state

---

### TC11: Container unhealthy state
**Requirement:** When container health is "unhealthy", script continues retrying until timeout.

**Test:** Mocks health as "unhealthy" consistently, uses 3-second timeout.

**Expected:**
- Exit code: 6
- Retries until timeout (doesn't fail immediately)

---

### TC12: Polling interval
**Requirement:** Script polls at reasonable intervals (1-2 seconds).

**Test:** Measures time with 2 "starting" responses before "healthy".

**Expected:**
- Takes at least 1 second (not instant polling)
- Takes less than 6 seconds (reasonable overhead)

---

### TC13: Progress output
**Requirement:** Script shows clear progress and success messages.

**Test:** Captures output from successful health check.

**Expected:**
- Output contains container name
- Clear success indicator

**Desired Format:**
```
Waiting for mark-backend... 2s
Waiting for mark-backend... 4s
✓ mark-backend is healthy (6s)
```

---

### TC14: Library sourcing
**Requirement:** Script can be sourced without executing functions.

**Test:** Sources the script, verifies no execution output.

**Expected:**
- Exit code: 0 (no errors)
- No "Waiting" messages (nothing executes)
- Functions are defined for use

---

### TC15: Multiple containers (stretch goal)
**Requirement:** Accept multiple container names and wait for all.

**Test:** Skipped - stretch goal for future enhancement.

**Expected:** Not required for initial implementation.

---

## API Contract

### Function Signature
```bash
wait_for_container_healthy <container_name> [timeout_seconds]
```

### Parameters
- `container_name` (required): Docker container name or ID
- `timeout_seconds` (optional): Maximum wait time in seconds (default: 60)

### Return Codes
| Code | Meaning |
|------|---------|
| 0 | Container became healthy |
| 1 | Missing prerequisites (docker command) |
| 2 | Container not found |
| 3 | Container has no healthcheck |
| 6 | Timeout waiting for healthy status |

### Docker Health States
| State | Description | Action |
|-------|-------------|--------|
| `starting` | Healthcheck running | Continue waiting |
| `healthy` | Healthcheck passed | Success (exit 0) |
| `unhealthy` | Healthcheck failed | Continue retrying until timeout |
| `none` | No healthcheck defined | Error (exit 3) |

### Expected Output Format

**Success:**
```
Waiting for mark-backend... 2s
Waiting for mark-backend... 4s
✓ mark-backend is healthy (6s)
```

**Timeout:**
```
Waiting for mark-backend... 58s
Waiting for mark-backend... 60s
✗ mark-backend health check timeout after 60s
```

**Error:**
```
Error: Container 'mark-backend' not found
```

## Implementation Guidance

### Docker Inspect Health Check
```bash
# Check if container exists
if ! docker inspect "$container_name" >/dev/null 2>&1; then
    echo "Error: Container '$container_name' not found" >&2
    return 2
fi

# Get health status
health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)

# Check if healthcheck is configured
if [ -z "$health_status" ]; then
    echo "Error: Container '$container_name' has no healthcheck defined" >&2
    return 3
fi
```

### Poll Loop Pattern
```bash
local timeout="${2:-60}"  # Default 60 seconds
local elapsed=0

while [ $elapsed -lt $timeout ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)

    if [ "$status" = "healthy" ]; then
        echo "✓ $container_name is healthy (${elapsed}s)"
        return 0
    fi

    echo "Waiting for $container_name... ${elapsed}s"
    sleep 2
    elapsed=$((elapsed + 2))
done

echo "✗ $container_name health check timeout after ${timeout}s" >&2
return 6
```

### Library Sourcing Pattern
```bash
#!/usr/bin/env bash
# scripts/lib/wait-for-healthy.sh

# Function definition
wait_for_container_healthy() {
    # ... implementation ...
}

# Only execute if run directly (not sourced)
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Handle CLI usage
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <container_name> [timeout_seconds]" >&2
        exit 1
    fi
    wait_for_container_healthy "$@"
fi
```

## Test Strategy

### Unit Tests (Current - RED Phase)
- ✅ Mock Docker commands using function overrides
- ✅ Test all exit codes for failure paths
- ✅ Test timeout logic with fast intervals (3-5 seconds)
- ✅ Verify output formatting
- ✅ Test library sourcing (no execution)

### Integration Tests (Future)
- Use real Docker containers with healthchecks
- Verify actual health check transitions
- Test with convex-backend container from docker-compose.yml

## Dependencies
- `docker` command (checked at runtime)
- `bash` >= 4.0 (for arithmetic)
- Standard utilities: `sleep`, `echo`

## Usage Examples

### In agent-init.sh
```bash
#!/bin/bash
source scripts/lib/wait-for-healthy.sh

# Wait for Convex backend (default 60s timeout)
wait_for_container_healthy "${AGENT_NAME}-backend" || {
    echo "Error: Backend failed to start" >&2
    exit 3
}
```

### With custom timeout
```bash
# Wait 30 seconds max
wait_for_container_healthy "${AGENT_NAME}-backend" 30 || {
    echo "Backend startup timeout" >&2
    exit 3
}
```

### Standalone usage
```bash
# From command line
./scripts/lib/wait-for-healthy.sh mark-backend

# With custom timeout
./scripts/lib/wait-for-healthy.sh mark-backend 45
```

## Next Steps (GREEN Phase)

After tests are confirmed failing (RED phase):

1. **Create `scripts/lib/wait-for-healthy.sh`**
   - Implement `wait_for_container_healthy` function
   - Add prerequisite checks (docker command)
   - Add container existence check
   - Implement health status polling loop
   - Add timeout logic with default 60 seconds
   - Format progress output

2. **Make executable**
   ```bash
   chmod +x scripts/lib/wait-for-healthy.sh
   ```

3. **Run tests until GREEN**
   ```bash
   ./tasks/00048-agent-init-overhaul/tests/unit/05-wait-for-healthy.test.sh
   ```

4. **Refactor phase**
   - Clean up code structure
   - Add comments
   - Optimize polling interval
   - Improve error messages

5. **Integration**
   - Update `agent-init.sh` to use this utility
   - Replace hardcoded sleeps with health checks
   - Add to script dependency chain

## Test Execution

### Run tests
```bash
# Run this specific test
./tasks/00048-agent-init-overhaul/tests/unit/05-wait-for-healthy.test.sh

# Run all unit tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh unit

# Run all tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh
```

### Expected RED phase output
```
============================================================================
Docker Health Check Unit Tests (TDD - RED Phase)
============================================================================

  TC01: Script exists and is executable... FAIL: scripts/lib/wait-for-healthy.sh does not exist
  TC02: Missing docker command... FAIL: scripts/lib/wait-for-healthy.sh does not exist
  [... 12 more failures ...]
  TC15: Multiple containers (stretch goal)... SKIP (stretch goal)

============================================================================
Test Summary
============================================================================
Total:  15
Passed: 0
Failed: 14

Some tests failed (expected in RED phase)
```

## Notes

- All tests are designed to be **isolated** - each test runs in a temporary directory
- Tests use **mocking** to avoid requiring actual Docker containers
- Tests are **fast** - entire suite runs in < 10 seconds
- Tests follow **existing patterns** from `01-parse-config.test.sh`
- Script will be **reusable** across multiple agent-init phases
