# Tests: Agent Init Overhaul (Task 00048)

This directory contains tests for the agent initialization system overhaul.

## Test Structure

```
tests/
├── README.md                        # This file
├── run-tests.sh                     # Test runner script
├── unit/                            # Unit tests
│   ├── 01-parse-config.test.sh     # Config parser tests
│   ├── 02-env-generator.test.sh    # Env file generator tests (TODO)
│   └── 03-health-checks.test.sh    # Health check tests (TODO)
└── e2e/                             # End-to-end tests
    └── agent-init.test.sh           # Full agent-init.sh test (TODO)
```

## Running Tests

### Run All Tests
```bash
./tasks/00048-agent-init-overhaul/tests/run-tests.sh
```

### Run Specific Test Suite
```bash
# Unit tests only
./tasks/00048-agent-init-overhaul/tests/run-tests.sh unit

# E2E tests only
./tasks/00048-agent-init-overhaul/tests/run-tests.sh e2e
```

### Run Specific Test File
```bash
# Run config parser tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh 01

# Run directly
./tasks/00048-agent-init-overhaul/tests/unit/01-parse-config.test.sh
```

## Test Framework

We use a lightweight bash testing framework (no external dependencies like BATS). Each test file:

- Sets up isolated test environment (temporary directories)
- Runs test cases with clear assertions
- Cleans up after itself
- Reports results with colored output

### Test File Structure

```bash
#!/usr/bin/env bash

# Setup/teardown functions
setup() { ... }
teardown() { ... }

# Assertion helpers
assert_equals() { ... }
assert_exit_code() { ... }
assert_contains() { ... }

# Test cases (named test_tcXX_*)
test_tc01_something() {
    test_start "TC01: Description"
    # ... test logic ...
    test_pass || test_fail
}

# Test runner
run_all_tests() { ... }
```

## TDD Workflow

This project follows Test-Driven Development:

### RED Phase
- Write failing tests that define acceptance criteria
- Tests should fail because implementation doesn't exist yet
- This phase documents **what** we're building

### GREEN Phase
- Implement minimum code to make tests pass
- Focus on functionality, not elegance
- All tests should pass

### REFACTOR Phase
- Clean up implementation
- Improve code quality
- Tests should still pass

## Test Coverage

### Subtask 1: Config Parser (`scripts/lib/parse-config.sh`)

| Test Case | Description | Status |
|-----------|-------------|--------|
| TC01 | Dependency validation (jq required) | SKIP (requires PATH mocking) |
| TC02 | Orchestrator directory not found | ✓ PASS |
| TC03 | config.json not found | ✓ PASS |
| TC04 | Invalid JSON in config.json | ✓ PASS |
| TC05 | Agent not in config | ✓ PASS |
| TC06 | Read appPort for existing agent | ✓ PASS |
| TC07 | Read convexCloudPort | ✓ PASS |
| TC08 | Read subnet | ✓ PASS |
| TC09 | Read all config for agent | ✓ PASS |
| TC10 | Validate existing agent | ✓ PASS |
| TC11 | Validate non-existing agent | ✓ PASS |
| TC12 | Read default agent config | ✓ PASS |
| TC13 | Invalid port key requested | ✓ PASS |

**Status: 12/13 tests passing (1 skipped) ✓**

### Subtask 2: Env File Generator (TODO)

Tests will be added as subtask is started.

### Subtask 3: Health Checks (TODO)

Tests will be added as subtask is started.

## Exit Code Conventions

All scripts follow consistent exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing prerequisites |
| 2 | File/directory not found |
| 3 | Invalid JSON/config |
| 4 | Agent not found |
| 5 | Port/key not found |
| 6 | Health check failed |

## Test Isolation

Each test:
- Creates a temporary workspace (`mktemp -d`)
- Mocks the orchestrator directory structure
- Creates fixture config.json files
- Cleans up completely after running

Tests do NOT:
- Modify the real orchestrator config
- Touch production environment files
- Require running Docker or services
- Have side effects on the system

## Adding New Tests

1. Create test file: `tests/unit/XX-feature.test.sh`
2. Make it executable: `chmod +x tests/unit/XX-feature.test.sh`
3. Follow the existing structure (setup, teardown, assertions)
4. Run in RED phase to verify tests fail
5. Implement feature
6. Run tests until GREEN
7. Update this README with test coverage info

## Debugging Tests

### Verbose Test Output
Individual test files show detailed output by default. Use the test runner for summary view.

### Check Test Environment
Tests create temporary directories. To inspect:

```bash
# Add this in your test file setup():
echo "Test directory: $TEST_DIR"
read -p "Press enter to continue..." # Pause to inspect

# Then manually explore:
ls -la $TEST_DIR
cat $TEST_DIR/orchestrator-artifact-review/config.json
```

### Run Single Test Case
Edit the test file and comment out other test cases in `run_all_tests()`.

## Dependencies

- **Required:** bash, jq, mktemp, grep, find
- **Optional:** None

All dependencies are standard Linux/macOS utilities.
