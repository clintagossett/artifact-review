#!/usr/bin/env bash
#
# Test Runner for Task 00048 - Agent Init Overhaul
#
# Usage:
#   ./tasks/00048-agent-init-overhaul/tests/run-tests.sh              # Run all tests
#   ./tasks/00048-agent-init-overhaul/tests/run-tests.sh unit         # Run only unit tests
#   ./tasks/00048-agent-init-overhaul/tests/run-tests.sh 01           # Run specific test file
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_DIR="$(dirname "$SCRIPT_DIR")"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    cat << EOF
Test Runner for Task 00048

Usage:
  $0 [OPTIONS] [FILTER]

Options:
  -h, --help     Show this help message
  -v, --verbose  Verbose output

Filters:
  unit           Run only unit tests
  e2e            Run only e2e tests
  01             Run only tests matching '01' (e.g., 01-parse-config.test.sh)

Examples:
  $0                    # Run all tests
  $0 unit               # Run only unit tests
  $0 01                 # Run tests matching '01'
  $0 --verbose unit     # Run unit tests with verbose output

EOF
}

run_test_file() {
    local test_file="$1"
    local test_name=$(basename "$test_file")

    echo -e "${BLUE}Running${NC}: $test_name"
    echo "----------------------------------------"

    if bash "$test_file"; then
        echo -e "${GREEN}✓ PASSED${NC}: $test_name"
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}: $test_name"
        echo ""
        return 1
    fi
}

main() {
    local filter=""
    local verbose=0

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                verbose=1
                shift
                ;;
            *)
                filter="$1"
                shift
                ;;
        esac
    done

    echo "============================================================================"
    echo "Task 00048: Agent Init Overhaul - Test Suite"
    echo "============================================================================"
    echo ""

    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    # Find test files
    local test_files=()

    if [ -z "$filter" ] || [ "$filter" = "unit" ]; then
        while IFS= read -r -d '' file; do
            test_files+=("$file")
        done < <(find "$SCRIPT_DIR/unit" -name "*.test.sh" -type f -print0 2>/dev/null || true)
    fi

    if [ -z "$filter" ] || [ "$filter" = "e2e" ]; then
        while IFS= read -r -d '' file; do
            test_files+=("$file")
        done < <(find "$SCRIPT_DIR/e2e" -name "*.test.sh" -type f -print0 2>/dev/null || true)
    fi

    # Apply numeric filter if provided
    if [ -n "$filter" ] && [ "$filter" != "unit" ] && [ "$filter" != "e2e" ]; then
        local filtered_files=()
        for file in "${test_files[@]}"; do
            if [[ "$(basename "$file")" == *"$filter"* ]]; then
                filtered_files+=("$file")
            fi
        done
        test_files=("${filtered_files[@]}")
    fi

    if [ ${#test_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}No test files found matching filter: '$filter'${NC}"
        exit 0
    fi

    # Run tests
    for test_file in "${test_files[@]}"; do
        total_tests=$((total_tests + 1))

        if run_test_file "$test_file"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    done

    # Summary
    echo "============================================================================"
    echo "Test Summary"
    echo "============================================================================"
    echo "Total test files: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"
    echo ""

    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}✓ All test files passed${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some test files failed${NC}"
        exit 1
    fi
}

main "$@"
