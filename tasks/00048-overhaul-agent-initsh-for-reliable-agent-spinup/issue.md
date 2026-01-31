title:	Overhaul agent-init.sh for reliable agent spinup
state:	OPEN
author:	clintagossett
labels:	
comments:	0
assignees:	
projects:	
milestone:	
number:	48
--
## Problem

New agent spinup takes 12+ minutes with 25+ manual interventions required. Target is <2 minutes with zero manual steps.

**Observed during:** mark agent spinup (2026-01-30)

## Root Cause

Multiple sources of truth for configuration:
- `config.json` (orchestrator) - has correct ports
- `.env.docker.local` - generated correctly
- `.env.local` / `.env.nextjs.local` - NOT updated, have wrong values

## Critical Issues

1. **npm install not in agent-init.sh** - deps must be installed before Docker
2. **Port mismatches** - .env files have wrong ports (3220 vs 3240)
3. **Placeholder values** - `YOUR_USERNAME` not replaced with `$USER`
4. **NODE_EXTRA_CA_CERTS not set** - Node.js can't trust mkcert certs
5. **Wrong URLs in scripts** - use proxy URLs instead of localhost for CLI
6. **Novu "user already exists"** - shared service not handled gracefully
7. **RESEND_API_KEY not set** - email fails without dummy key
8. **Convex env vars need restart** - changes not picked up until server restart

## Solution

Make `agent-init.sh` the single entry point that:
1. Generates ALL env files from config.json
2. Installs npm deps with `--legacy-peer-deps`
3. Starts Docker services
4. Waits for health checks
5. Starts dev servers
6. Sets up Convex env vars
7. Sets up Novu (idempotently)
8. Sets RESEND_API_KEY
9. Restarts Convex to pick up changes

## Task File

See `artifact-review-orchestrator/tasks/agent-init-overhaul.md` for detailed implementation plan with 5 phases.

## Acceptance Criteria

- [ ] New agent spinup completes in <2 minutes
- [ ] No manual intervention required
- [ ] All env files generated from config.json
- [ ] NODE_EXTRA_CA_CERTS set automatically
- [ ] Novu handles existing users gracefully
- [ ] RESEND_API_KEY set automatically

## Labels

`enhancement` `dx` `agent-infrastructure`
