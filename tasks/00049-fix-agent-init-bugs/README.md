# Task 49: Fix agent-init.sh Bugs from Task 48

**GitHub Issue:** #49
**Status:** Complete
**Created:** 2026-01-31

## Problem Statement

Task 48 broke agent-init.sh by refactoring it to source non-existent library files. Mark spent 80% of init time debugging issues that should have been caught before merge. See `../orchestrator-artifact-review/analysis/mark-init-observations-2026-01-31.md` for full details.

## Root Causes

1. **Task 48 broke agent-init.sh** - Script sources `lib/*.sh` files that were never created
2. **Port variables in comments** - `.env.docker.local` had ports as comments instead of exports
3. **SSL/TLS issues** - curl commands missing `-k` flag for mkcert certs
4. **NODE_EXTRA_CA_CERTS not set** - Convex CLI fails without mkcert CA trust
5. **CONVEX_ADMIN_PORT default wrong** - setup-convex-env.sh had 3220 instead of 3210
6. **PASSTHROUGH_VARS hardcoded** - New vars like RESEND_API_KEY weren't synced to Convex

## Changes Made

### 1. scripts/agent-init.sh

- Reverted to monolithic version from d6c59f2 (before lib refactoring)
- Added `export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"` at top
- Added `-sk` to all curl commands (4 places)
- Changed port vars from comments to actual exports:
  - `CONVEX_ADMIN_PORT`
  - `CONVEX_HTTP_PORT`
  - `CONVEX_DASHBOARD_PORT`
  - `MAILPIT_WEB_PORT`
  - `MAILPIT_SMTP_PORT`
- Added `.envrc` setup with `direnv allow`

### 2. scripts/setup-novu-org.sh

- Added `-sk` to all curl commands (7 places)

### 3. scripts/setup-convex-env.sh

- Changed `${CONVEX_ADMIN_PORT:-3220}` to `${CONVEX_ADMIN_PORT:?...}` (fail if not set)
- Removed hardcoded `PASSTHROUGH_VARS` array
- Now dynamically syncs ALL vars from `.env.convex.local` to Convex
- This ensures new vars like RESEND_API_KEY are automatically synced

### 4. docker-compose.yml

- Changed all port defaults to `:?` pattern (fail if not set):
  - `CONVEX_ADMIN_PORT`
  - `CONVEX_HTTP_PORT`
  - `CONVEX_DASHBOARD_PORT`
  - `MAILPIT_WEB_PORT`
  - `MAILPIT_SMTP_PORT`

## Acceptance Criteria

- [x] Fresh agent runs `agent-init.sh` without manual fixes
- [x] Port variables are exported (not comments)
- [x] curl commands work with mkcert certs
- [x] RESEND_API_KEY syncs automatically from `.env.convex.local`
- [x] Missing port vars cause immediate failure with clear error

## Testing

A fresh agent should be able to run:

```bash
./scripts/agent-init.sh
```

And have a working environment without any manual intervention.
