# Task 00048: Overhaul agent-init.sh for Reliable Agent Spinup

**Status:** ✅ COMPLETE
**GitHub Issue:** #48
**Target:** <2 minutes spinup, zero manual intervention

## Problem Statement

New agent spinup took 12+ minutes with 25+ manual interventions. The `agent-init.sh` script should be a single entry point that handles everything automatically.

Root cause: Multiple sources of truth for configuration and missing orchestration between setup steps.

## Solution

Complete overhaul of agent initialization process with:
- **Single source of truth:** All configuration derived from orchestrator config.json
- **Health checks, not sleeps:** Wait for actual service readiness
- **Idempotent operations:** Safe to run multiple times
- **Automatic rollback:** Backups created before changes, restored on failure
- **Progress indicators:** Clear phase-by-phase output

## Subtasks

1. ✅ **Audit current spinup process** - Documented 25+ interventions, 12+ minute timing
2. ✅ **Create parse-config.sh** - Read orchestrator config.json
3. ✅ **Create generate-env-docker.sh** - Generate .env.docker.local
4. ✅ **Create generate-env-nextjs.sh** - Generate app/.env.nextjs.local with mkcert auto-detection
5. ✅ **Create wait-for-healthy.sh** - Docker health check loop
6. ✅ **Update setup-convex-env.sh** - Use parse-config for ports
7. ✅ **Update setup-novu-org.sh** - Graceful existing user handling
8. ✅ **Create smoke-test.sh** - Verify all endpoints accessible
9. ✅ **Create backup/restore utils** - Rollback on failure
10. ✅ **Rewrite agent-init.sh** - Orchestrate all phases with progress output
11. ✅ **Add --check mode** - Compare config across sources
12. ✅ **Test full spinup** - Verify <2 minute target
13. ✅ **Test idempotency** - Run twice, second run faster
14. ✅ **Test rollback** - Ctrl+C and error scenarios
15. ✅ **Update documentation** - CLAUDE.md, local-infrastructure.md, troubleshooting.md

## Outcomes

**Spinup time:** <2 minutes (goal achieved)
**Manual interventions:** 0 (goal achieved)

### Key Improvements

1. **Configuration Management:**
   - Orchestrator config.json is single source of truth for ports/subnets
   - Environment files generated automatically, not copied from examples
   - No manual port editing required

2. **Reliability:**
   - Health checks instead of arbitrary sleeps
   - Docker container health verified before proceeding
   - Smoke tests verify all endpoints accessible

3. **Safety:**
   - Backups created before modifying any files
   - Automatic rollback on Ctrl+C or errors
   - `--check` mode shows configuration status without changes

4. **Developer Experience:**
   - Clear phase-by-phase progress output
   - Exit codes indicate exact failure reason (1=prereqs, 2=orchestrator, 3=docker, 4=convex, 5=novu, 6=smoke)
   - Idempotent - safe to run multiple times

## Scripts Created

| Script | Purpose |
|--------|---------|
| `scripts/lib/parse-config.sh` | Read orchestrator config.json |
| `scripts/lib/backup-restore.sh` | Backup/restore utilities |
| `scripts/generate-env-docker.sh` | Generate .env.docker.local |
| `scripts/generate-env-nextjs.sh` | Generate app/.env.nextjs.local |
| `scripts/wait-for-healthy.sh` | Docker health check loop |
| `scripts/smoke-test.sh` | Endpoint accessibility tests |

## Acceptance Criteria

- [x] New agent spinup completes in <2 minutes
- [x] No manual intervention required
- [x] `agent-init.sh` is single entry point
- [x] All env files generated correctly from config.json
- [x] NODE_EXTRA_CA_CERTS set automatically
- [x] Novu setup handles existing users gracefully
- [x] RESEND_API_KEY set automatically
- [x] Convex dev server restarted after env var changes

## Documentation Updated

- [x] CLAUDE.md - References agent-init.sh, explains config.json as source of truth
- [x] docs/setup/local-infrastructure.md - Documents port lookup flow, config.json structure
- [x] docs/setup/troubleshooting.md - New error scenarios, rollback behavior, exit codes
