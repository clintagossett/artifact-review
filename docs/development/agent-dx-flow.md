# Agent Developer Experience (DX) Flow

This is the definitive guide to agent setup, daily development, and environment management.

## Table of Contents

1. [Full Agent Lifecycle](#1-full-agent-lifecycle)
2. [Script Responsibilities](#2-script-responsibilities)
3. [Environment Variable Flow](#3-environment-variable-flow)
4. [Service Dependencies](#4-service-dependencies)
5. [Common Operations](#5-common-operations)

---

## 1. Full Agent Lifecycle

### Overview

An agent is an isolated development environment with its own:
- Git worktree (branch)
- Docker containers (Convex, Mailpit)
- Environment variables
- Novu organization
- Port assignments

### Lifecycle Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. CREATION              2. FIRST-TIME SETUP        3. DAILY STARTUP     │
│   ──────────────           ──────────────────         ─────────────────    │
│   git worktree add   →     ./scripts/agent-init.sh →  ./scripts/start-     │
│   artifact-review-X                                    dev-servers.sh      │
│                                                                             │
│                                    ↓                                        │
│                                                                             │
│   4. DEVELOPMENT           5. SHUTDOWN                6. RESET/TEARDOWN    │
│   ─────────────────        ──────────────             ─────────────────    │
│   Edit code, run tests     Close terminal (sessions   ./scripts/agent-     │
│   Hot reload active        persist in tmux)           teardown.sh          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Details

#### Phase 1: Creation (One-Time)

Create a new agent worktree:

```bash
# From main repo
cd artifact-review
git worktree add ../artifact-review-{name} -b {name}/dev-work

# Result:
# artifact-review-dev/
#   ├── artifact-review-orchestrator/  ← Shared infrastructure
#   ├── artifact-review/               ← Main repo
#   └── artifact-review-{name}/        ← Your new worktree
```

#### Phase 2: First-Time Setup (One-Time per Agent)

Initialize the agent environment:

```bash
cd artifact-review-{name}
./scripts/agent-init.sh
```

This takes ~70 seconds and:
- Generates all environment files
- Installs npm dependencies
- Starts Docker containers
- Creates Novu organization
- Sets up Convex JWT keys

#### Phase 3: Daily Startup (Every Session)

Start development servers:

```bash
./scripts/start-dev-servers.sh
```

This takes ~45-60 seconds and:
- Verifies DNS resolution
- Starts Docker services (if stopped)
- Creates tmux sessions for all dev servers
- Syncs Novu workflows automatically

#### Phase 4: Development

Your environment is now ready:
- **App:** https://{name}.loc
- **Convex Dashboard:** https://{name}.convex.loc
- **Mailpit:** https://{name}.mailpit.loc

Code changes hot-reload automatically. No restarts needed unless you change:
- `docker-compose.yml`
- `.env.*.local` files
- `package.json`

#### Phase 5: Shutdown

Simply close your terminal. Tmux sessions persist:

```bash
# Check sessions are still running
tmux ls

# Reattach later
tmux attach -t {name}-nextjs
```

#### Phase 6: Reset/Teardown

Full environment reset (destroys all data):

```bash
./scripts/agent-teardown.sh
```

Then reinitialize with `./scripts/agent-init.sh`.

---

## 2. Script Responsibilities

### 2.1 agent-init.sh

**Purpose:** Complete first-time setup for a new agent environment.

**When to Run:**
- First time after creating worktree
- After `agent-teardown.sh`
- Never during normal development

**Order of Operations:**

| Step | Action | Duration |
|------|--------|----------|
| 0 | Check prerequisites (Node, Docker, tmux, jq) | ~5s |
| 1 | Generate environment files from config.json | ~2s |
| 2 | Verify orchestrator is running | ~5s |
| 3 | Install npm dependencies | ~30s |
| 4 | Start Docker containers | ~12s |
| 5 | Setup Novu organization (calls setup-novu-org.sh) | ~10s |
| 6 | Configure Convex environment (calls setup-convex-env.sh) | ~5s |
| 7 | Show status and URLs | ~2s |

**Options:**

```bash
./scripts/agent-init.sh              # Full setup
./scripts/agent-init.sh --check      # Check status only
./scripts/agent-init.sh --env-only   # Generate env files only
./scripts/agent-init.sh --sync-secrets # Sync shared secrets (non-disruptive)
```

**Files Created:**

| File | Contents |
|------|----------|
| `.env.docker.local` | Agent identity, ports, domains |
| `.envrc` | direnv configuration |
| `app/.env.nextjs.local` | Next.js runtime config |
| `app/.env.convex.local` | Convex backend secrets |

---

### 2.2 setup-novu-org.sh

**Purpose:** Create Novu organization and retrieve per-agent API credentials.

**When to Run:**
- Called automatically by `agent-init.sh` (Step 5)
- Manually to refresh/verify credentials

**Prerequisites:**
- Orchestrator running (Novu stack must be available)

**What It Does:**

1. Check Novu API availability
2. Login or register user (`admin@{name}.loc` / `Password123$`)
3. Create or verify organization (`{name}-artifact-review`)
4. Retrieve API keys from Development environment
5. Update `app/.env.nextjs.local` with frontend vars
6. Update `app/.env.convex.local` with backend vars

**Options:**

```bash
./scripts/setup-novu-org.sh          # Full setup (idempotent)
./scripts/setup-novu-org.sh --check  # Check if configured
```

**Variables Set:**

| Variable | File | Purpose |
|----------|------|---------|
| `NOVU_SECRET_KEY` | Both env files | API authentication |
| `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` | .env.nextjs.local | Frontend app ID |
| `NOVU_API_URL` | Both env files | API endpoint |

**Important:** Novu credentials are **per-agent**. Do NOT copy from shared secrets or other agents.

---

### 2.3 setup-convex-env.sh

**Purpose:** Configure Convex backend with JWT keys and environment variables.

**When to Run:**
- Called automatically by `agent-init.sh` (Step 6)
- Manually with `--sync` after updating `.env.convex.local`
- Manually with `--regen` if JWT keys need regeneration

**Prerequisites:**
- Docker container running (`{name}-backend`)

**What It Does:**

1. Generate RSA 2048-bit JWT key pair (first run only)
2. Derive admin key from Docker container
3. Set environment variables in Convex runtime
4. Update `app/.env.nextjs.local` with connection info

**Options:**

```bash
./scripts/setup-convex-env.sh         # Full setup or refresh admin key
./scripts/setup-convex-env.sh --check # View current Convex vars
./scripts/setup-convex-env.sh --sync  # Sync passthrough vars only
./scripts/setup-convex-env.sh --regen # Regenerate JWT keys (invalidates sessions!)
```

**Variables Set in Convex:**

| Variable | Source | Purpose |
|----------|--------|---------|
| `JWT_PRIVATE_KEY` | Generated | Token signing |
| `JWKS` | Generated | Token verification |
| `SITE_URL` | Derived | App URL |
| `INTERNAL_API_KEY` | Generated | Auth callbacks |
| `STRIPE_*` | .env.convex.local | Payment processing |
| `RESEND_API_KEY` | .env.convex.local | Email sending |
| `NOVU_SECRET_KEY` | .env.convex.local | Notifications |
| `NOVU_API_URL` | .env.convex.local | Notification API |

---

### 2.4 start-dev-servers.sh

**Purpose:** Start all development servers for daily work.

**When to Run:**
- Every development session
- After environment variable changes
- After `package.json` changes

**What It Does:**

1. Load agent configuration from `.env.docker.local`
2. Verify DNS resolution for all domains
3. Register with orchestrator proxy
4. Start/verify Docker services
5. Initialize Convex functions (`npx convex dev --once`)
6. Create tmux sessions:
   - `{name}-convex-dev` - Convex function watcher
   - `{name}-nextjs` - Next.js dev server
   - `{name}-stripe` - Stripe webhook tunnel
7. **Sync Novu workflows** (automatic, after Next.js is up)
8. Print status summary

**Options:**

```bash
./scripts/start-dev-servers.sh           # Start (skip if running)
./scripts/start-dev-servers.sh --restart # Kill and restart all sessions
```

**Novu Sync (Automatic):**

After Next.js starts, the script:
1. Waits for bridge endpoint (`https://{name}.loc/api/novu`) to respond
2. Calls Novu sync API to register workflows
3. Reports success/failure in output

```
Syncing Novu workflows...
  Waiting for bridge endpoint...
  ✅ Bridge endpoint ready
  Syncing to Novu...
  ✅ Novu workflows synced (1 workflows)
```

---

### 2.5 agent-teardown.sh

**Purpose:** Reset environment to clean state (destroys all data).

**When to Run:**
- Environment is corrupted beyond repair
- Starting fresh with new configuration
- Before deleting worktree

**Options:**

```bash
./scripts/agent-teardown.sh            # Interactive with confirmation
./scripts/agent-teardown.sh --dry-run  # Show what would be deleted
./scripts/agent-teardown.sh --yes      # Skip confirmation
./scripts/agent-teardown.sh --keep-deps # Preserve node_modules
```

**What Gets Deleted:**

| Item | Impact |
|------|--------|
| Docker volume `{name}_convex_data` | **All Convex data, JWT keys, sessions** |
| `.env.docker.local` | Agent configuration |
| `app/.env.*.local` | All environment files |
| Tmux sessions | All running dev servers |
| Docker containers | Convex, Mailpit |
| `node_modules/` | (unless `--keep-deps`) |

**What's Preserved:**
- `.env.dev.local` (user API keys)
- All code (in git)

**Recovery:** Run `./scripts/agent-init.sh` after teardown.

---

## 3. Environment Variable Flow

### Visual Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENVIRONMENT VARIABLE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

ORCHESTRATOR (Source of Truth for Ports)
┌─────────────────────────────────────┐
│ ../artifact-review-orchestrator/    │
│ config.json                         │
│ ┌─────────────────────────────────┐ │
│ │ {                               │ │
│ │   "agents": {                   │ │
│ │     "mark": { "basePort": 3030 }│ │──────┐
│ │     "james": { "basePort": 3040}│ │      │
│ │   }                             │ │      │
│ │ }                               │ │      │
│ └─────────────────────────────────┘ │      │
└─────────────────────────────────────┘      │
                                             │
                     ┌───────────────────────┘
                     ▼
AGENT INIT (agent-init.sh)
┌─────────────────────────────────────┐
│ .env.docker.local                   │
│ ┌─────────────────────────────────┐ │
│ │ AGENT_NAME=mark                 │ │
│ │ BASE_PORT=3030                  │ │
│ │ NEXTJS_PORT=3030                │ │
│ │ CONVEX_ADMIN_PORT=3240          │ │
│ │ CONVEX_HTTP_PORT=3241           │ │
│ │ SITE_URL=https://mark.loc       │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         │
         │ Generates
         ▼
┌─────────────────────────────────────┐
│ app/.env.nextjs.local               │◄──────────────┐
│ ┌─────────────────────────────────┐ │               │
│ │ # Frontend vars                 │ │               │
│ │ NEXT_PUBLIC_CONVEX_URL=...      │ │               │
│ │ NEXT_PUBLIC_NOVU_*=...          │ │               │
│ │ CONVEX_SELF_HOSTED_ADMIN_KEY=...│ │◄── setup-convex-env.sh
│ └─────────────────────────────────┘ │               │
└─────────────────────────────────────┘               │
                                                      │
SHARED SECRETS (Parent Directory)                     │
┌─────────────────────────────────────┐               │
│ ../.env.dev.local                   │               │
│ ┌─────────────────────────────────┐ │               │
│ │ STRIPE_SECRET_KEY=sk_test_...   │ │               │
│ │ STRIPE_WEBHOOK_SECRET=whsec_... │ │               │
│ │ RESEND_API_KEY=re_...           │ │               │
│ │ # NO Novu vars (per-agent!)     │ │               │
│ └─────────────────────────────────┘ │               │
└─────────────────────────────────────┘               │
         │                                            │
         │ agent-init.sh --sync-secrets               │
         ▼                                            │
┌─────────────────────────────────────┐               │
│ app/.env.convex.local               │               │
│ ┌─────────────────────────────────┐ │               │
│ │ # Backend vars (synced)         │ │               │
│ │ STRIPE_SECRET_KEY=sk_test_...   │ │               │
│ │ STRIPE_WEBHOOK_SECRET=whsec_... │ │               │
│ │ RESEND_API_KEY=re_...           │ │               │
│ │                                 │ │               │
│ │ # Novu (from setup-novu-org.sh) │ │◄── setup-novu-org.sh
│ │ NOVU_SECRET_KEY=cde2a75cf...    │ │               │
│ │ NOVU_API_URL=https://api.novu...│ │               │
│ └─────────────────────────────────┘ │               │
└─────────────────────────────────────┘               │
         │                                            │
         │ setup-convex-env.sh --sync                 │
         ▼                                            │
┌─────────────────────────────────────┐               │
│ CONVEX RUNTIME                      │               │
│ ┌─────────────────────────────────┐ │               │
│ │ JWT_PRIVATE_KEY=-----BEGIN...   │◄── setup-convex-env.sh (generated)
│ │ JWKS={"keys":[...]}             │◄──┘             │
│ │ SITE_URL=https://mark.loc       │               │
│ │ INTERNAL_API_KEY=a7f3b2c...     │               │
│ │                                 │               │
│ │ # Passthrough from .env.convex  │               │
│ │ STRIPE_SECRET_KEY=sk_test_...   │               │
│ │ NOVU_SECRET_KEY=cde2a75cf...    │               │
│ │ NOVU_API_URL=https://api.novu...│               │
│ └─────────────────────────────────┘ │               │
└─────────────────────────────────────┘               │
                                                      │
NOVU ORGANIZATION                                     │
┌─────────────────────────────────────┐               │
│ setup-novu-org.sh                   │               │
│ ┌─────────────────────────────────┐ │               │
│ │ Creates: mark-artifact-review   │ │               │
│ │ User: admin@mark.loc            │ │               │
│ │ Gets: NOVU_SECRET_KEY           │────────────────┘
│ │ Gets: APPLICATION_IDENTIFIER    │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Variable Categories

| Category | Source | Destination | Sync Method |
|----------|--------|-------------|-------------|
| Ports & Identity | config.json | .env.docker.local | agent-init.sh |
| Shared Secrets | ../.env.dev.local | .env.convex.local | agent-init.sh --sync-secrets |
| Novu Credentials | Novu API | Both .env files | setup-novu-org.sh |
| JWT Keys | Generated | Convex runtime | setup-convex-env.sh |
| Backend Vars | .env.convex.local | Convex runtime | setup-convex-env.sh --sync |

---

## 4. Service Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE DEPENDENCY GRAPH                              │
└─────────────────────────────────────────────────────────────────────────────┘

Level 0: Infrastructure (Must be running FIRST)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR PROXY                    NOVU STACK                           │
│  ┌───────────────────────┐             ┌───────────────────────┐            │
│  │ ../orchestrator/      │             │ Novu API, Worker, WS  │            │
│  │ start.sh              │             │ MongoDB, Redis        │            │
│  │                       │             │                       │            │
│  │ Provides:             │             │ Provides:             │            │
│  │ - DNS routing (*.loc) │             │ - Notification API    │            │
│  │ - TLS termination     │             │ - Workflow engine     │            │
│  │ - Port mapping        │             │ - WebSocket server    │            │
│  └───────────────────────┘             └───────────────────────┘            │
│         ▲                                      ▲                            │
│         │ Required by                          │ Required by                │
│         │ ALL agent services                   │ setup-novu-org.sh          │
└─────────┴──────────────────────────────────────┴────────────────────────────┘

Level 1: Agent Backend
┌─────────────────────────────────────────────────────────────────────────────┐
│  DOCKER SERVICES                                                            │
│  ┌───────────────────────┐             ┌───────────────────────┐            │
│  │ {name}-backend        │             │ {name}-mailpit        │            │
│  │ (Convex container)    │             │ (Email capture)       │            │
│  │                       │             │                       │            │
│  │ Provides:             │             │ Provides:             │            │
│  │ - Database            │             │ - SMTP server         │            │
│  │ - Function runtime    │             │ - Email UI            │            │
│  │ - Admin key           │             │                       │            │
│  └───────────────────────┘             └───────────────────────┘            │
│         ▲                                                                   │
│         │ Required by                                                       │
│         │ setup-convex-env.sh                                               │
└─────────┴───────────────────────────────────────────────────────────────────┘

Level 2: Dev Servers (tmux sessions)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ {name}-convex-dev     │  │ {name}-nextjs         │  │ {name}-stripe   │  │
│  │                       │  │                       │  │                 │  │
│  │ npx convex dev        │  │ npm run dev           │  │ stripe listen   │  │
│  │                       │  │                       │  │                 │  │
│  │ Provides:             │  │ Provides:             │  │ Provides:       │  │
│  │ - Hot reload          │  │ - Frontend            │  │ - Webhook       │  │
│  │ - Function push       │  │ - API routes          │  │   forwarding    │  │
│  │ - Tail logs           │  │ - Bridge endpoint     │  │                 │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
│                                      ▲                                      │
│                                      │ Required by                          │
│                                      │ Novu workflow sync                   │
└──────────────────────────────────────┴──────────────────────────────────────┘

Level 3: Workflow Sync
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOVU BRIDGE SYNC (automatic in start-dev-servers.sh)                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Waits for: Next.js bridge endpoint (https://{name}.loc/api/novu)   │    │
│  │ Calls: POST https://api.novu.loc/v1/bridge/sync                    │    │
│  │ Result: Workflows registered in local Novu                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Startup Order Matrix

| Script | Requires Running | Starts/Configures |
|--------|-----------------|-------------------|
| `agent-init.sh` | Orchestrator | Docker, Novu org, Convex env |
| `setup-novu-org.sh` | Orchestrator + Novu stack | Novu org + credentials |
| `setup-convex-env.sh` | Docker container | Convex runtime vars |
| `start-dev-servers.sh` | Orchestrator | Docker + 3 tmux sessions + Novu sync |
| Novu sync | Next.js (tmux) | Workflow registration |

### What Needs to Be Running When

| Operation | Orchestrator | Novu Stack | Docker | Next.js |
|-----------|:------------:|:----------:|:------:|:-------:|
| agent-init.sh | ✅ | ✅ | Started | - |
| setup-novu-org.sh | ✅ | ✅ | - | - |
| setup-convex-env.sh | - | - | ✅ | - |
| start-dev-servers.sh | ✅ | ✅ (for sync) | Started | Started |
| Daily development | ✅ | ✅ | ✅ | ✅ |

---

## 5. Common Operations

### 5.1 Brand New Agent Setup

**Scenario:** Creating a new agent from scratch.

```bash
# Step 1: Create worktree (from main repo)
cd /path/to/artifact-review
git worktree add ../artifact-review-{name} -b {name}/dev-work

# Step 2: Ensure orchestrator is running
cd ../artifact-review-orchestrator
./start.sh

# Step 3: Initialize agent
cd ../artifact-review-{name}
./scripts/agent-init.sh

# Step 4: Start dev servers
./scripts/start-dev-servers.sh

# Done! Access at https://{name}.loc
```

**Total time:** ~3-5 minutes

---

### 5.2 Daily Startup

**Scenario:** Starting development after your machine was off.

```bash
# Step 1: Start orchestrator (if not running)
cd ../artifact-review-orchestrator
./start.sh

# Step 2: Start dev servers
cd ../artifact-review-{name}
./scripts/start-dev-servers.sh

# That's it! Sessions persist in tmux
```

**Total time:** ~1 minute

---

### 5.3 Syncing Shared Secrets Updates

**Scenario:** Someone updated `../.env.dev.local` with new Stripe keys.

```bash
# Non-disruptive sync (no restart needed)
./scripts/agent-init.sh --sync-secrets

# Push to Convex runtime
./scripts/setup-convex-env.sh --sync

# Verify
./scripts/setup-convex-env.sh --check
```

**Total time:** ~30 seconds

---

### 5.4 After Changing Environment Variables

**Scenario:** You edited `.env.convex.local` or `.env.nextjs.local`.

```bash
# For .env.convex.local changes (backend vars)
./scripts/setup-convex-env.sh --sync

# For any .env changes that affect Next.js or Docker
./scripts/start-dev-servers.sh --restart
```

---

### 5.5 Full Environment Reset

**Scenario:** Environment is corrupted, need clean slate.

```bash
# Step 1: Teardown (with confirmation)
./scripts/agent-teardown.sh

# Step 2: Reinitialize
./scripts/agent-init.sh

# Step 3: Start servers
./scripts/start-dev-servers.sh
```

**Total time:** ~5 minutes

**Warning:** This destroys all Convex data, JWT keys, and invalidates all sessions.

---

### 5.6 Refreshing Admin Key After Container Restart

**Scenario:** Docker container restarted, getting `BadAdminKey` errors.

```bash
# Refresh admin key (non-disruptive)
./scripts/setup-convex-env.sh

# Restart convex dev watcher
./scripts/start-dev-servers.sh --restart
```

---

### 5.7 Regenerating JWT Keys

**Scenario:** Security incident, need new signing keys.

```bash
# This invalidates ALL user sessions
./scripts/setup-convex-env.sh --regen

# Confirm with: yes

# Restart servers
./scripts/start-dev-servers.sh --restart
```

**Warning:** All users will need to log in again.

---

### 5.8 Checking Current Configuration

**Scenario:** Debugging, need to see what's configured.

```bash
# Check agent-init status
./scripts/agent-init.sh --check

# Check Convex environment
./scripts/setup-convex-env.sh --check

# Check Novu organization
./scripts/setup-novu-org.sh --check

# Check running services
tmux ls
docker ps
```

---

## Quick Reference

### Script Commands

| Task | Command |
|------|---------|
| First-time setup | `./scripts/agent-init.sh` |
| Daily startup | `./scripts/start-dev-servers.sh` |
| Restart servers | `./scripts/start-dev-servers.sh --restart` |
| Sync shared secrets | `./scripts/agent-init.sh --sync-secrets` |
| Sync to Convex | `./scripts/setup-convex-env.sh --sync` |
| Check status | `./scripts/agent-init.sh --check` |
| Full reset | `./scripts/agent-teardown.sh` |

### URLs

| Service | URL |
|---------|-----|
| App | https://{name}.loc |
| Convex Dashboard | https://{name}.convex.loc |
| Mailpit | https://{name}.mailpit.loc |
| Novu Dashboard | https://novu.loc |

### Tmux Sessions

| Session | Purpose | Attach |
|---------|---------|--------|
| `{name}-nextjs` | Next.js dev server | `tmux attach -t {name}-nextjs` |
| `{name}-convex-dev` | Convex function watcher | `tmux attach -t {name}-convex-dev` |
| `{name}-stripe` | Stripe webhook tunnel | `tmux attach -t {name}-stripe` |
