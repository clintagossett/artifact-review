#!/usr/bin/env bash
set -euo pipefail

# Source the test file
source ./13-rollback.test.sh

# Run only setup, TC01, and teardown
setup
test_tc01_create_backups_before_generation
teardown

echo "Result: Tests passed=$TESTS_PASSED, failed=$TESTS_FAILED"
