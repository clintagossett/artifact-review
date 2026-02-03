# Test Specification: Subtask 15 - Update Documentation

## Objective
Verify that documentation is updated to reflect the new `agent-init.sh` behavior, `config.json` as source of truth, and new error scenarios.

## Test Strategy

**Approach:** Documentation testing using content validation and cross-reference verification.

**Rationale for TDD:**
1. Documentation tests define the required content BEFORE writing documentation
2. Tests specify exact sections, terminology, and cross-references expected
3. Tests ensure documentation stays synchronized with implementation
4. RED phase confirms documentation gaps exist (expected initial state)

## Test Categories

### Category 1: CLAUDE.md Updates (TC01-TC05)
Verify that the main developer guide references `agent-init.sh` and explains the new workflow.

### Category 2: local-infrastructure.md Updates (TC06-TC10)
Verify that config.json is documented as the single source of truth for port configuration.

### Category 3: troubleshooting.md Updates (TC11-TC15)
Verify that new error scenarios from agent-init.sh are documented with solutions.

### Category 4: Task README Updates (TC16-TC18)
Verify that the task README documents the complete overhaul and its outcomes.

### Category 5: Cross-Reference Validation (TC19-TC22)
Verify that documentation cross-references are accurate and complete.

## Test Cases

### TC01: CLAUDE.md references agent-init.sh
**Given:** CLAUDE.md exists
**When:** Reading the "First-Time Agent Setup" section
**Then:** 
- Section should mention `./scripts/agent-init.sh` as the recommended approach
- Should list what the script does (prerequisites, env files, orchestrator, dependencies, Convex, Novu)
- Should include `--check` flag documentation
- Should prefer agent-init.sh over manual setup

**Validation:**
```bash
# CLAUDE.md should contain:
- "agent-init.sh" reference
- "--check" flag
- List of 6+ initialization steps
- "Recommended" or similar language
```

### TC02: CLAUDE.md explains config.json as source of truth
**Given:** CLAUDE.md exists
**When:** Reading the environment files section
**Then:**
- Should mention that ports/subnets come from orchestrator config.json
- Should explain that env files are DERIVED, not manually edited
- Should warn against hardcoding ports

**Validation:**
```bash
# CLAUDE.md should explain:
- config.json location (orchestrator)
- Derived vs manual configuration
- Warning about hardcoding
```

### TC03: CLAUDE.md documents --check mode
**Given:** CLAUDE.md exists  
**When:** Reading agent-init.sh documentation
**Then:**
- Should document `./scripts/agent-init.sh --check`
- Should explain that --check shows configuration status
- Should mention multi-source comparison (config.json, .env.docker.local, .env.nextjs.local)

### TC04: CLAUDE.md references troubleshooting doc
**Given:** CLAUDE.md exists
**When:** Reading environment setup sections
**Then:**
- Should link to `docs/setup/troubleshooting.md` for common issues
- Should link to `docs/setup/local-infrastructure.md` for infrastructure details

### TC05: CLAUDE.md explains rollback behavior
**Given:** CLAUDE.md exists
**When:** Reading agent-init.sh section
**Then:**
- Should mention that script creates backups before modifying env files
- Should explain rollback on failure (Ctrl+C or errors)
- Should reassure users that failed runs won't corrupt config

### TC06: local-infrastructure.md documents config.json
**Given:** local-infrastructure.md exists
**When:** Reading the configuration section
**Then:**
- Should have a section titled "Configuration Source of Truth" or similar
- Should explain that config.json defines all port mappings
- Should show example config.json structure for an agent
- Should explain the role of orchestrator config

**Validation:**
```bash
# Should document:
- config.json location
- Port fields: appPort, convexCloudPort, convexSitePort, mailpitPort
- subnet field
- How agent-init.sh reads these values
```

### TC07: local-infrastructure.md explains env file generation
**Given:** local-infrastructure.md exists
**When:** Reading about environment files
**Then:**
- Should explain that .env.docker.local is GENERATED from config.json
- Should explain that .env.nextjs.local is GENERATED with auto-detected mkcert path
- Should discourage manual editing of generated files

### TC08: local-infrastructure.md shows port lookup flow
**Given:** local-infrastructure.md exists
**When:** Reading configuration documentation
**Then:**
- Should show the flow: config.json → agent-init.sh → .env files
- Should explain why this prevents port conflicts
- Should mention multi-agent support

### TC09: local-infrastructure.md references agent-init.sh
**Given:** local-infrastructure.md exists
**When:** Reading setup instructions
**Then:**
- Should reference `./scripts/agent-init.sh` as the way to generate env files
- Should link back to CLAUDE.md for full setup guide

### TC10: local-infrastructure.md updates mkcert documentation
**Given:** local-infrastructure.md exists
**When:** Reading TLS certificate section
**Then:**
- Should explain that NODE_EXTRA_CA_CERTS is auto-detected by agent-init.sh
- Should mention `mkcert -CAROOT` detection
- Should explain when manual configuration is needed (if auto-detection fails)

### TC11: troubleshooting.md documents config.json mismatch
**Given:** troubleshooting.md exists
**When:** Reading troubleshooting scenarios
**Then:**
- Should have section for "Port Mismatch Between config.json and .env files"
- Should explain symptoms (unexpected ports, wrong domains)
- Should provide solution: run `./scripts/agent-init.sh` to regenerate
- Should show how to check with `./scripts/agent-init.sh --check`

**Validation:**
```bash
# Section should include:
- Symptom description
- Root cause (manual editing or stale files)
- Fix: regenerate with agent-init.sh
- Verification: --check mode
```

### TC12: troubleshooting.md documents missing prerequisites
**Given:** troubleshooting.md exists
**When:** Reading troubleshooting scenarios
**Then:**
- Should document exit code 1: Missing prerequisites
- Should list required tools: node, npm, docker, tmux, jq, mkcert
- Should provide install commands for each tool
- Should explain how to verify with prerequisites check

### TC13: troubleshooting.md documents mkcert issues
**Given:** troubleshooting.md exists
**When:** Reading troubleshooting scenarios  
**Then:**
- Should document "mkcert not found" error
- Should provide install instructions per OS (macOS, Debian/Ubuntu, other)
- Should explain NODE_EXTRA_CA_CERTS auto-detection
- Should show manual fix if auto-detection fails

### TC14: troubleshooting.md documents rollback scenarios
**Given:** troubleshooting.md exists
**When:** Reading troubleshooting scenarios
**Then:**
- Should document that agent-init.sh creates backups before changes
- Should explain rollback on Ctrl+C or errors
- Should show how to manually restore from .backup files if needed
- Should mention that successful runs clean up backups

### TC15: troubleshooting.md documents health check failures
**Given:** troubleshooting.md exists
**When:** Reading Docker-related issues
**Then:**
- Should document exit code 3: Docker health check failure
- Should explain that script waits up to 60s for container to be healthy
- Should provide debugging steps: `docker ps`, `docker logs ${AGENT_NAME}-backend`
- Should reference wait-for-healthy.sh behavior

### TC16: Task README documents objectives
**Given:** tasks/00048-agent-init-overhaul/README.md exists
**When:** Reading the overview
**Then:**
- Should state the <2 minute goal
- Should state zero manual intervention goal
- Should explain the problem (12+ minutes, 25+ interventions)
- Should mark status as COMPLETE

### TC17: Task README documents all subtasks
**Given:** tasks/00048-agent-init-overhaul/README.md exists
**When:** Reading the subtask list
**Then:**
- Should list all 15 subtasks with status
- Subtask 15 should be listed as documentation update
- Should show completion status for each

### TC18: Task README documents outcomes
**Given:** tasks/00048-agent-init-overhaul/README.md exists
**When:** Reading outcomes section
**Then:**
- Should document actual spinup time achieved
- Should document zero intervention achievement
- Should list key improvements: config.json source of truth, health checks, rollback, etc.
- Should reference the new scripts created

### TC19: Cross-references are valid
**Given:** All documentation files exist
**When:** Following cross-reference links
**Then:**
- Links from CLAUDE.md to docs/setup/*.md should be valid
- Links from local-infrastructure.md to troubleshooting.md should be valid
- Links from troubleshooting.md to agent-init.sh should reference correct path
- All file paths should be absolute or relative-from-doc paths

### TC20: Terminology is consistent
**Given:** All documentation files exist
**When:** Searching for key terms
**Then:**
- "config.json" should consistently refer to orchestrator config
- "agent-init.sh" should use full path `./scripts/agent-init.sh`
- "source of truth" should consistently refer to config.json
- "health check" vs "smoke test" should be used correctly (health=Docker, smoke=endpoints)

### TC21: Code blocks are executable
**Given:** All documentation files exist
**When:** Examining code blocks
**Then:**
- Bash commands should be syntactically correct
- File paths should be valid (scripts/*, docs/*)
- Environment variables should match actual .env files
- Exit codes should match agent-init.sh implementation (0,1,2,3,4,5,6)

### TC22: Documentation references implementation
**Given:** All documentation files exist
**When:** Reading technical details
**Then:**
- Should reference actual script names (parse-config.sh, generate-env-nextjs.sh, etc.)
- Should reference actual functions (wait_for_container_healthy, run_smoke_tests)
- Should match actual phase names from agent-init.sh (Phase 1-9)
- Exit codes should match script (1=prereqs, 2=orchestrator, 3=docker, 4=convex, 5=novu, 6=smoke)

## Success Criteria

**RED Phase (Initial):**
- All tests FAIL because documentation hasn't been updated yet
- Test output clearly shows which sections are missing or incomplete
- Tests define the exact content and structure needed

**GREEN Phase (After Implementation):**
- All 22 tests PASS
- Documentation accurately reflects agent-init.sh behavior
- Cross-references are valid and helpful
- Users can follow documentation to successfully set up and troubleshoot agents

## Test Execution

```bash
# Run all documentation tests
./tasks/00048-agent-init-overhaul/15-update-documentation/tests/unit/15-documentation.test.sh

# Expected output (RED phase):
# ✗ TC01: CLAUDE.md references agent-init.sh
# ✗ TC02: CLAUDE.md explains config.json as source of truth
# ... (all tests failing)

# Expected output (GREEN phase):
# ✓ TC01: CLAUDE.md references agent-init.sh
# ✓ TC02: CLAUDE.md explains config.json as source of truth
# ... (all tests passing)
```

## Notes

1. **Documentation as Code:** These tests treat documentation with the same rigor as source code
2. **Content Validation:** Tests verify specific sections, terminology, and cross-references exist
3. **Executable Examples:** Code blocks in documentation should be syntactically correct
4. **User Journey:** Documentation should support the actual user workflow (prerequisites → init → troubleshoot)
5. **Maintenance:** Tests ensure documentation stays synchronized with implementation changes