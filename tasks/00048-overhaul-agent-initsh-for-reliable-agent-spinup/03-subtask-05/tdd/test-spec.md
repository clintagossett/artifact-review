Perfect! Now let me create a summary output for you:

## Summary

I've successfully written **failing tests** for Subtask 5 (Docker Health Check Utility) following TDD principles. Here's what was created:

### 📋 Test Specification (`test-spec.md`)
- **15 comprehensive test cases** defining acceptance criteria
- Complete API contract documentation
- Implementation guidance with code examples
- Expected output formats
- 442 lines of detailed specification

### ✅ Unit Tests (`tests/unit/05-wait-for-healthy.test.sh`)
- **631 lines** of test code
- **15 test cases** covering all edge cases:
  - Script existence and permissions
  - Missing docker command
  - Container not found
  - No healthcheck configured
  - Immediate health (fast path)
  - Delayed health (retry logic)
  - Timeout handling
  - Custom vs default timeout
  - All Docker health states (starting, healthy, unhealthy)
  - Polling interval validation
  - Progress output format
  - Library sourcing (no execution on source)
  - Stretch goal: multiple containers (skipped)

### 🔴 RED Phase Status: ✅ COMPLETE

**Test Results:**
- Total: 15 tests
- Passed: 0
- Failed: 14
- Skipped: 1 (stretch goal)

All tests fail as expected because `scripts/lib/wait-for-healthy.sh` doesn't exist yet.

### 📝 Documentation (`README.md`)
- Complete subtask overview
- Problem statement and solution
- API contract
- Usage examples
- Implementation checklist
- Integration points
- Design decisions (why 60s timeout, why 2s polling, etc.)

### 🎯 What the Tests Define

The utility will:
1. **Wait for Docker containers to be healthy** before proceeding
2. **Use `docker inspect --format='{{.State.Health.Status}}'`** to check status
3. **Handle all health states:** starting, healthy, unhealthy
4. **Default 60-second timeout** (customizable)
5. **Poll every 2 seconds** (reasonable balance)
6. **Show progress:** "Waiting for mark-backend... 4s"
7. **Return proper exit codes:** 0=success, 1=no docker, 2=not found, 3=no healthcheck, 6=timeout
8. **Be sourceable as a library** (no execution when sourced)

### 🚀 Next Steps (GREEN Phase)

You can now implement `scripts/lib/wait-for-healthy.sh` to make these tests pass. The tests clearly define:
- Function signature: `wait_for_container_healthy <container> [timeout]`
- All error conditions and exit codes
- Expected output format
- Polling behavior
- Timeout handling

Run tests with:
```bash
./tasks/00048-agent-init-overhaul/tests/unit/05-wait-for-healthy.test.sh
```

The tests use **mocking** so no real Docker containers are needed during development!