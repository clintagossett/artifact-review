# Subtask 05: Docker Health Check Utility

**Status:** RED Phase ✓ (Tests written and failing)

## Objective

Create a reusable utility script that waits for Docker containers to report healthy status before proceeding. This prevents race conditions during agent initialization when services haven't fully started yet.

## Problem

Currently, `agent-init.sh` uses arbitrary `sleep` commands or no wait at all between starting Docker containers and using them. This causes:

- Race conditions when backend isn't ready
- Failed health checks that succeed on retry
- Unclear whether services are actually healthy
- No timeout handling for stuck containers

## Solution

Create `scripts/lib/wait-for-healthy.sh` with:

1. **Health Check Function:** `wait_for_container_healthy <container> [timeout]`
2. **Docker Integration:** Uses `docker inspect --format='{{.State.Health.Status}}'`
3. **Smart Retry Logic:** Handles `starting`, `healthy`, `unhealthy` states
4. **Configurable Timeout:** Default 60s, customizable per call
5. **Clear Output:** Progress indicators and elapsed time
6. **Proper Exit Codes:** 0=success, 1=missing docker, 2=not found, 3=no healthcheck, 6=timeout

## Files

| File | Purpose | Status |
|------|---------|--------|
| `test-spec.md` | Test specification and acceptance criteria | ✅ Complete |
| `tests/unit/05-wait-for-healthy.test.sh` | 15 unit tests (TDD RED phase) | ✅ Complete |
| `scripts/lib/wait-for-healthy.sh` | Implementation | ⏳ Pending |

## Test Coverage

**15 test cases** covering:

- ✅ Script existence and permissions
- ✅ Missing prerequisites (docker)
- ✅ Container not found
- ✅ No healthcheck configured
- ✅ Immediately healthy (fast path)
- ✅ Becomes healthy after delay
- ✅ Timeout after max wait
- ✅ Custom timeout parameter
- ✅ Default timeout (60s)
- ✅ Container starting state
- ✅ Container unhealthy state
- ✅ Polling interval (1-2s)
- ✅ Progress output format
- ✅ Library sourcing (no execution)
- ⚠️ Multiple containers (stretch goal - skipped)

**Current Status:** 0 passed, 14 failed (expected - RED phase)

## API Contract

### Function Signature
```bash
wait_for_container_healthy <container_name> [timeout_seconds]
```

### Parameters
- `container_name` (required): Docker container name or ID
- `timeout_seconds` (optional): Max wait time (default: 60)

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | Container became healthy |
| 1 | Missing prerequisites (docker) |
| 2 | Container not found |
| 3 | No healthcheck configured |
| 6 | Timeout waiting for healthy |

### Health States
| State | Action |
|-------|--------|
| `starting` | Keep waiting |
| `healthy` | Success (return 0) |
| `unhealthy` | Keep retrying |
| `none` (empty) | Error (return 3) |

## Usage Example

```bash
#!/bin/bash
# In agent-init.sh

source scripts/lib/wait-for-healthy.sh

# Wait for Convex backend (default 60s)
wait_for_container_healthy "${AGENT_NAME}-backend" || {
    echo "Error: Backend failed to start" >&2
    exit 3
}

# Custom timeout (30s)
wait_for_container_healthy "${AGENT_NAME}-backend" 30 || {
    echo "Backend timeout" >&2
    exit 3
}
```

## Expected Output

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

## Implementation Checklist

**RED Phase** (Tests First) ✅
- [x] Write test specification
- [x] Create 15 unit tests
- [x] Verify all tests fail
- [x] Document acceptance criteria

**GREEN Phase** (Make Tests Pass) ⏳
- [ ] Create `scripts/lib/wait-for-healthy.sh`
- [ ] Implement `wait_for_container_healthy` function
- [ ] Add docker prerequisite check
- [ ] Add container existence check
- [ ] Implement health status polling
- [ ] Add timeout logic (default 60s)
- [ ] Format progress output
- [ ] Make executable (`chmod +x`)
- [ ] Run tests until all pass

**REFACTOR Phase** (Clean Up) ⏳
- [ ] Add comprehensive comments
- [ ] Optimize polling interval
- [ ] Improve error messages
- [ ] Add usage documentation in script header
- [ ] Test with real Docker containers

## Integration Points

This utility will be used in:

1. **agent-init.sh** - Wait for backend after `docker compose up`
2. **start-dev-servers.sh** - Verify backend health before starting dev servers
3. **setup-convex-env.sh** - Ensure backend is ready before env sync
4. **Future scripts** - Any script that depends on Docker containers

## Testing

### Run tests
```bash
# This test file
./tasks/00048-agent-init-overhaul/tests/unit/05-wait-for-healthy.test.sh

# All unit tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh unit

# All tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh
```

### Test characteristics
- **Isolated:** Each test runs in temp directory
- **Fast:** Entire suite < 10 seconds
- **Mocked:** No real Docker containers needed
- **Comprehensive:** 15 test cases covering all edge cases

## Design Decisions

### Why 60-second default timeout?
Docker healthchecks typically run every 5-10 seconds. 60 seconds allows ~6-12 health check attempts, which is reasonable for detecting stuck containers without excessive wait.

### Why poll every 2 seconds?
- Not too fast: Avoids CPU waste
- Not too slow: Detects healthy state quickly
- Aligns with typical healthcheck intervals

### Why continue on "unhealthy"?
Healthchecks can fail temporarily (e.g., during initialization). Retrying allows containers to recover. Only timeout exits the loop.

### Why exit code 6 for timeout?
Follows the established convention from the agent-init standards:
- 0: Success
- 1: Missing prerequisites
- 2: File/directory not found
- 3: Invalid config
- 4: Agent not found
- 5: Port/key not found
- **6: Health check failed** ← Our code

## Dependencies

- `docker` command (required, checked at runtime)
- `bash` >= 4.0 (for arithmetic)
- Standard utilities: `sleep`, `echo`

## References

- **Test Spec:** `test-spec.md` (full acceptance criteria)
- **Tests:** `../tests/unit/05-wait-for-healthy.test.sh`
- **Docker Compose:** `docker-compose.yml` (backend healthcheck config)
- **Agent Init Standards:** `../analysis.md` (exit codes, patterns)
- **Existing Test Pattern:** `../tests/unit/01-parse-config.test.sh` (test framework)

## Next Steps

1. **Implement the script** to make tests pass (GREEN phase)
2. **Refactor** for clarity and maintainability
3. **Integrate** into `agent-init.sh`
4. **Update task README** with completion status
