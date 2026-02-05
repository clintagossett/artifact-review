# ADR 0023: Separate Novu Workflow Sync Mechanisms for Local vs Cloud

**Status:** Accepted
**Date:** 2026-02-03
**Deciders:** Mark (Agent), Clint (User)
**Context:** Task 60 - Staging and Preview Deployments

---

## Context and Problem Statement

During the implementation of staging deployment with automated Novu workflow sync, we identified that we have two different mechanisms for syncing Novu Framework workflows:

1. **Local Development:** Shell script in `scripts/start-dev-servers.sh` with `sync_novu_workflows()` function
2. **Staging/Production:** `package.json` postbuild script that runs during Vercel deployment

Both use `npx novu@latest sync` but in different contexts with different orchestration logic. The question arose: should we DRY (Don't Repeat Yourself) this and create a unified sync script?

## Decision Drivers

- **Maintainability:** Avoid duplicate code where possible
- **Simplicity:** Keep solutions as simple as needed for their context
- **Separation of Concerns:** Local development vs cloud deployment are fundamentally different
- **Error Handling:** Different failure modes and recovery strategies
- **Future Maintenance:** Avoid premature abstraction

## Considered Options

### Option 1: Create Unified Sync Script

Create `scripts/sync-novu-workflows.sh` that handles both local and cloud sync:

```bash
#!/bin/bash
# Usage: ./scripts/sync-novu-workflows.sh [--local|--staging|--production]
# Detects environment and syncs appropriately
```

**Pros:**
- Single source of truth for sync logic
- DRY principle applied
- Consistent error handling

**Cons:**
- Increased complexity (needs environment detection)
- Different orchestration needs complicate single script
- Local and cloud contexts are fundamentally different
- More parameters and conditional logic
- Harder to understand and maintain

### Option 2: Keep Separate Mechanisms (CHOSEN)

Maintain two separate sync approaches:
- Local: `scripts/start-dev-servers.sh` → `sync_novu_workflows()` function
- Cloud: `app/package.json` → `postbuild` script

**Pros:**
- Each implementation optimized for its context
- Simple, clear, easy to understand
- No premature abstraction
- Different error handling strategies appropriate to context
- Easy to modify one without affecting the other

**Cons:**
- Appears to violate DRY principle (but see "Why Not DRY" below)
- Two places to update if Novu CLI API changes

## Decision Outcome

**Chosen option: Option 2 - Keep Separate Mechanisms**

We decided to keep the two sync mechanisms separate because they serve fundamentally different contexts with different requirements.

## Rationale

### Why Not DRY?

While both use the same underlying CLI command (`npx novu@latest sync`), the "duplication" is minimal. The actual command is a simple one-liner:

```bash
npx novu@latest sync --bridge-url <URL> --secret-key <KEY> --api-url <URL>
```

**What's actually different:**

| Aspect | Local Development | Staging/Production (Vercel) |
|--------|------------------|----------------------------|
| **Target** | Local Docker Novu (`https://api.novu.loc`) | Novu Cloud (`https://api.novu.co`) |
| **Bridge URL** | `https://${AGENT_NAME}.loc/api/novu` | `$SITE_URL/api/novu` |
| **Orchestration** | ~50 lines (wait for services, health checks, Docker connectivity) | 1 line (environment already ready) |
| **Prerequisites** | Check orchestrator running, wait for Next.js bridge, verify Novu API | None (Vercel environment is ready) |
| **Execution Context** | Interactive shell script with user feedback | Non-interactive CI/CD step |
| **Error Recovery** | Skip and continue (developer can manually sync) | Fail gracefully, don't block deployment |
| **When Runs** | Manual developer action (`./scripts/start-dev-servers.sh`) | Automatic on every Vercel deployment |

### Context-Specific Requirements

**Local Development Needs:**
- Check if orchestrator is running
- Wait for Next.js dev server to be ready (bridge endpoint)
- Verify local Novu API is accessible
- Provide helpful error messages for missing dependencies
- Guide developer to troubleshooting steps
- Non-blocking (dev can work without Novu sync)

**Vercel Deployment Needs:**
- Simple, fast execution
- Minimal dependencies (just environment variables)
- Non-fatal error handling (don't break builds)
- No interactive feedback needed
- Assume infrastructure is ready (Novu Cloud always available)

### The Core Command Is Not The Logic

The "duplication" is just the CLI invocation, which is effectively configuration data. The surrounding orchestration logic is substantially different and serves different purposes.

**Analogy:** Using `git commit` in two different places doesn't mean we should abstract "all git operations" into a single script.

## Consequences

### Positive

- ✅ **Clear Separation:** Each implementation is optimized for its context
- ✅ **Simple to Understand:** No complex environment detection or branching
- ✅ **Easy to Maintain:** Changes to local sync don't affect cloud, and vice versa
- ✅ **Appropriate Error Handling:** Each context handles failures appropriately
- ✅ **No Premature Abstraction:** Avoids complexity that isn't currently needed

### Negative

- ⚠️ **CLI Updates:** If Novu CLI API changes, must update both places
  - **Mitigation:** This is rare (stable API), and the change is simple (just command-line flags)
- ⚠️ **Appears to Violate DRY:** On surface level looks like duplication
  - **Mitigation:** This ADR documents why it's intentional, not oversight

### Neutral

- 📝 **Documentation:** Need to document both approaches clearly
  - Local: `docs/development/novu-setup.md`
  - Cloud: `tasks/00060-staging-and-preview-deployments/README.md`

## Implementation

### Local Development Sync

**Location:** `scripts/start-dev-servers.sh`

**Function:** `sync_novu_workflows()`

**Logic:**
1. Read `NOVU_SECRET_KEY` from `.env.nextjs.local`
2. Check if orchestrator is running
3. Wait for Next.js bridge endpoint to be ready (15 attempts, 2s each)
4. Check if local Novu API is healthy
5. Sync via `npx novu@latest sync --bridge-url https://${AGENT_NAME}.loc/api/novu --secret-key <key> --api-url https://api.novu.loc`
6. Provide helpful error messages if any step fails
7. Continue anyway (non-blocking)

### Cloud Deployment Sync

**Location:** `app/package.json`

**Script:** `postbuild`

**Logic:**
```json
"postbuild": "npx novu@latest sync --bridge-url $SITE_URL/api/novu --secret-key $NOVU_SECRET_KEY --api-url $NOVU_API_URL || echo 'Novu sync failed (non-fatal)'"
```

Single line that:
1. Runs after `npm run build` completes (Next.js is built, bridge endpoint ready)
2. Uses Vercel environment variables
3. Syncs to Novu Cloud
4. Fails gracefully if sync fails (doesn't break deployment)

## When to Revisit

This decision should be revisited if:

1. **Novu CLI becomes complex:** If sync requires multi-step orchestration in cloud too
2. **Additional environments:** If we add more deployment targets (e.g., self-hosted production with Docker Novu)
3. **Significant duplication emerges:** If orchestration logic starts to converge
4. **Novu CLI API changes frequently:** If we're updating both places often

## References

- **Task:** #60 - Staging and Preview Deployments
- **Issue:** #71 - Implement Novu → Convex → Resend architecture
- **Local Setup Docs:** `docs/development/novu-setup.md`
- **Staging Deployment:** `tasks/00060-staging-and-preview-deployments/README.md`
- **Novu Framework Docs:** https://docs.novu.co/framework/deployment/syncing

## Related ADRs

- ADR 0022: Stripe Webhook Multi-Deployment Filtering (similar pattern of environment-specific handling)

---

## Summary

We maintain separate Novu sync mechanisms for local development (shell script) and cloud deployment (package.json postbuild) because they serve fundamentally different contexts with different orchestration requirements. The apparent "duplication" is just the CLI invocation, while the surrounding logic is context-specific and necessary. This keeps each implementation simple, clear, and appropriate for its environment.
