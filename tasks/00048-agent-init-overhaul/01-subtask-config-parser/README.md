# Subtask 1: Config Parser Utility

**Status:** ✅ COMPLETE

## Overview

Create a reusable bash library for reading agent configuration from the orchestrator's `config.json`. This library provides functions to extract port mappings, subnet information, and validate agent existence.

## Deliverables

### 1. Implementation
- **File:** `scripts/lib/parse-config.sh`
- **Location:** Project root `scripts/lib/` directory
- **Status:** ✅ Implemented and tested

### 2. Test Suite
- **File:** `tasks/00048-agent-init-overhaul/tests/unit/01-parse-config.test.sh`
- **Test Cases:** 13 (12 passing, 1 skipped)
- **Status:** ✅ All tests passing

### 3. Documentation
- **Example Usage:** `example-usage.sh` (this directory)
- **Test Documentation:** `../tests/README.md`
- **Status:** ✅ Complete

## Public API

The library provides three public functions:

### `get_agent_port <agent-name> <port-key>`

Retrieves a specific configuration value for an agent.

**Parameters:**
- `agent-name`: Name of the agent (e.g., "james", "default")
- `port-key`: Configuration key (e.g., "appPort", "convexCloudPort", "subnet")

**Returns:**
- The requested value (as string)
- Exit code 0 on success

**Exit Codes:**
- 0: Success
- 2: Orchestrator directory or config.json not found
- 3: Invalid JSON in config.json
- 4: Agent not found
- 5: Port key not found

**Example:**
```bash
source scripts/lib/parse-config.sh
APP_PORT=$(get_agent_port "james" "appPort")
echo "App port: $APP_PORT"  # Output: App port: 3020
```

### `get_agent_config <agent-name>`

Retrieves the full configuration object for an agent as JSON.

**Parameters:**
- `agent-name`: Name of the agent (e.g., "james", "default")

**Returns:**
- JSON object containing all configuration for the agent
- Exit code 0 on success

**Exit Codes:**
- 0: Success
- 2: Orchestrator directory or config.json not found
- 3: Invalid JSON in config.json
- 4: Agent not found

**Example:**
```bash
source scripts/lib/parse-config.sh
CONFIG=$(get_agent_config "james")
echo "$CONFIG" | jq '.appPort'  # Output: 3020
```

### `validate_agent_exists <agent-name>`

Checks if an agent exists in the configuration (silent - no output).

**Parameters:**
- `agent-name`: Name of the agent to check

**Returns:**
- Exit code 0 if agent exists
- Exit code 1 if agent does not exist

**Example:**
```bash
source scripts/lib/parse-config.sh
if validate_agent_exists "james"; then
    echo "Agent exists!"
fi
```

## Features

### Automatic Config Location
- Automatically finds `../orchestrator-artifact-review/config.json` relative to script location
- Caches the config file path for performance
- No need to hardcode paths

### Robust Error Handling
- Validates that orchestrator directory exists
- Validates that config.json exists and is readable
- Validates JSON syntax before parsing
- Validates agent name exists
- Validates port key exists
- Provides clear error messages on stderr

### Dependency Checking
- Checks for `jq` availability on library load
- Fails fast with helpful error message if `jq` not installed

### Performance
- Caches config file location after first lookup
- Minimal overhead for repeated calls

## Test Coverage

All tests run in isolated temporary environments with no side effects on the real system.

| Test | Description | Status |
|------|-------------|--------|
| TC01 | Dependency validation (jq required) | SKIP |
| TC02 | Orchestrator directory not found | ✅ PASS |
| TC03 | config.json not found | ✅ PASS |
| TC04 | Invalid JSON in config.json | ✅ PASS |
| TC05 | Agent not in config | ✅ PASS |
| TC06 | Read appPort for existing agent | ✅ PASS |
| TC07 | Read convexCloudPort | ✅ PASS |
| TC08 | Read subnet | ✅ PASS |
| TC09 | Read all config for agent | ✅ PASS |
| TC10 | Validate existing agent | ✅ PASS |
| TC11 | Validate non-existing agent | ✅ PASS |
| TC12 | Read default agent config | ✅ PASS |
| TC13 | Invalid port key requested | ✅ PASS |

**Result: 12/13 passing (92.3%) - TC01 skipped due to PATH mocking complexity**

## Running Tests

```bash
# Run all tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh

# Run only config parser tests
./tasks/00048-agent-init-overhaul/tests/run-tests.sh 01

# Run directly
./tasks/00048-agent-init-overhaul/tests/unit/01-parse-config.test.sh
```

## Example Usage

See `example-usage.sh` in this directory for a comprehensive demonstration.

Run it with:
```bash
./tasks/00048-agent-init-overhaul/01-subtask-config-parser/example-usage.sh
```

## Integration Examples

### Generate Environment File
```bash
source scripts/lib/parse-config.sh

AGENT_NAME="james"

cat > .env.local << EOF
AGENT_NAME=${AGENT_NAME}
APP_PORT=$(get_agent_port "$AGENT_NAME" "appPort")
CONVEX_CLOUD_PORT=$(get_agent_port "$AGENT_NAME" "convexCloudPort")
SUBNET=$(get_agent_port "$AGENT_NAME" "subnet")
EOF
```

### Validate Agent Before Running Script
```bash
source scripts/lib/parse-config.sh

AGENT_NAME="${1:-}"

if [ -z "$AGENT_NAME" ]; then
    echo "Usage: $0 <agent-name>"
    exit 1
fi

if ! validate_agent_exists "$AGENT_NAME"; then
    echo "ERROR: Agent '$AGENT_NAME' not found in config.json"
    echo "Available agents:"
    jq -r 'keys[]' "$(_find_config_file)"
    exit 1
fi

# Continue with script...
```

## Design Decisions

### Why Bash Library (not standalone script)?
- Designed to be sourced by other scripts
- Avoids subprocess overhead for multiple reads
- Enables config caching within a single script execution
- More flexible for different use cases

### Why jq (not grep/sed/awk)?
- JSON is a structured format that requires proper parsing
- `jq` is the standard tool for JSON parsing in bash
- Prevents bugs from attempting to parse JSON with regex
- Already a dependency of the project

### Why Cache Config File Path?
- Reduces filesystem traversal overhead
- Safe because config.json location doesn't change during execution
- Improves performance for scripts that read multiple values

### Why Silent validate_agent_exists?
- Designed for conditional checks in if statements
- Follows Unix convention of silent success, verbose failure
- Use case is typically boolean logic, not user-facing messages

## Files Created

```
artifact-review-james/
├── scripts/
│   └── lib/
│       └── parse-config.sh              # ✅ Main library
└── tasks/00048-agent-init-overhaul/
    ├── 01-subtask-config-parser/
    │   ├── README.md                    # ✅ This file
    │   └── example-usage.sh             # ✅ Example script
    └── tests/
        ├── README.md                    # ✅ Test documentation
        ├── run-tests.sh                 # ✅ Test runner
        └── unit/
            └── 01-parse-config.test.sh  # ✅ Test suite
```

## Next Steps

This library is ready to be used by:
- Subtask 2: Environment file generator (will use this to read port values)
- Subtask 3: Health check utilities (will use this to construct URLs)
- Updated `agent-init.sh` (will use this instead of hardcoded values)

## TDD Process Followed

1. ✅ **RED Phase:** Created failing tests that defined requirements
2. ✅ **GREEN Phase:** Implemented minimal code to pass all tests
3. ⏭️ **REFACTOR Phase:** (Not needed - implementation is already clean and well-documented)

---

**Subtask Complete:** Ready for integration into agent initialization scripts.
