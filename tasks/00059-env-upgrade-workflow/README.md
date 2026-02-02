# Task 00059: Agent Dev Environment Upgrade Workflow

**GitHub Issue:** #59
**Status:** Complete
**Branch:** james/dev-work

## Problem

When `agent-init.sh` is re-run, it skips existing env files, causing agents to miss new shared secrets from the parent `../.env.dev.local`. The Stripe credentials issue was a symptom - the real problem was no general mechanism for env upgrades.

## Solution

Implemented a hybrid approach:

1. **Primary workflow:** Idempotent sync (`--sync-secrets`) - fast, preserves data
2. **Fallback workflow:** Teardown + fresh init (`agent-teardown.sh`) - nuclear option

## Changes

### `scripts/agent-init.sh`

Added new functionality:

1. **`sync_shared_secrets()` function** - Reads from shared parent `../.env.dev.local` and upserts into agent env files:

   | Shared Parent Var | Target File | Notes |
   |-------------------|-------------|-------|
   | `STRIPE_SECRET_KEY` | `app/.env.convex.local` | Convex backend |
   | `STRIPE_WEBHOOK_SECRET` | `app/.env.convex.local` | Convex backend |
   | `STRIPE_PRICE_ID_PRO` | `app/.env.convex.local` | Convex backend |
   | `STRIPE_PRICE_ID_PRO_ANNUAL` | `app/.env.convex.local` | Convex backend |
   | `RESEND_API_KEY` | `app/.env.convex.local` | Convex backend |
   | `NOVU_SECRET_KEY` | `app/.env.nextjs.local` | Next.js runtime |
   | `NOVU_APPLICATION_IDENTIFIER` | `app/.env.nextjs.local` | As `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` |

2. **`upsert_env_var()` helper** - Updates existing vars, uncomments commented vars, or appends new vars. Returns 0 if changed, 1 if unchanged.

3. **`--sync-secrets` flag** - Runs sync without full init:
   ```bash
   ./scripts/agent-init.sh --sync-secrets
   ```

4. **Enhanced `--check` output** - Shows credential sync status:
   ```
   Credential Sync Status (shared → local):
     STRIPE_SECRET_KEY:       ✅ In sync
     RESEND_API_KEY:          ❌ Missing in local
     NOVU_SECRET_KEY:         ❌ Out of sync
   ```

5. **Removed `populate_stripe_vars()`** - Replaced by `sync_shared_secrets()` which handles all shared secrets.

### `scripts/agent-teardown.sh` (NEW)

Nuclear option for complete environment reset:

```bash
./scripts/agent-teardown.sh              # Interactive with confirmation
./scripts/agent-teardown.sh --dry-run    # Show what would be deleted
./scripts/agent-teardown.sh --yes        # Skip confirmation (CI/automation)
./scripts/agent-teardown.sh --keep-deps  # Keep node_modules
```

Actions performed:
1. Stops tmux sessions (`{AGENT_NAME}-nextjs`, `{AGENT_NAME}-convex-dev`, `{AGENT_NAME}-stripe`)
2. Stops Docker containers (`docker compose down`)
3. Removes Docker volumes (`docker volume rm {AGENT_NAME}_convex_data`) with warning
4. Backs up and removes generated env files
5. Optionally removes `node_modules`

Safety features:
- Interactive confirmation prompt (skip with `--yes`)
- Timestamped backup of env files to `/tmp/agent-teardown-backup-*`
- Clear warning about data loss (JWT keys, sessions, database)
- Dry-run mode shows exactly what would happen

### `CLAUDE.md`

Added "Upgrading Environment Variables" section documenting:
- `--sync-secrets` flag usage
- `setup-convex-env.sh --sync` follow-up
- Teardown workflow for complete resets

## Usage

### Sync shared secrets (non-disruptive)

```bash
# When shared secrets change in parent env file
./scripts/agent-init.sh --sync-secrets

# Push to Convex backend
./scripts/setup-convex-env.sh --sync
```

### Check sync status

```bash
./scripts/agent-init.sh --check
```

### Full reset (nuclear option)

```bash
./scripts/agent-teardown.sh --yes
./scripts/agent-init.sh
```

## Verification

To verify the implementation:

1. **Sync test:** Add/change a var in `../.env.dev.local` → run `--sync-secrets` → verify propagated
2. **Idempotent test:** Run `--sync-secrets` twice → no changes on second run
3. **Preserve test:** Add custom var to `.env.convex.local` → run sync → verify custom var preserved
4. **Teardown test:** Run teardown with `--dry-run` → verify expected output
5. **Check test:** Run `--check` → verify credential sync status displays correctly
