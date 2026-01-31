# Local Development Infrastructure

This document explains the local development infrastructure that artifact-review relies on. The infrastructure is managed by the parent `agentic-dev` repository and shared across all agent projects.

## Overview

Local development uses **DNS indirection** rather than hardcoded ports. A central orchestrator proxy routes all `*.loc` domains to the appropriate services.

```
Browser Request (mark.loc)
         │
         ▼
┌─────────────────────────┐
│   Orchestrator Proxy    │  ← Port 80, routes based on hostname
│   (agentic-dev repo)    │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Target Service        │  ← Next.js (3010), Convex (3220/3221), etc.
└─────────────────────────┘
```

## DNS Patterns

| Pattern | Example | Routes To |
|---------|---------|-----------|
| `{agent}.loc` | `mark.loc` | Next.js frontend |
| `api.{agent}.loc` | `api.mark.loc` | Next.js API routes |
| `{agent}.convex.cloud.loc` | `mark.convex.cloud.loc` | Convex WebSocket/sync |
| `{agent}.convex.site.loc` | `mark.convex.site.loc` | Convex HTTP actions |
| `{agent}.convex.loc` | `mark.convex.loc` | Convex Dashboard (dev UI) |
| `{agent}.mailpit.loc` | `mark.mailpit.loc` | Mailpit (email testing) |
| `novu.loc` | `novu.loc` | Shared Novu dashboard |
| `api.novu.loc` | `api.novu.loc` | Shared Novu API |

## Convex Endpoint Separation

Convex uses two distinct endpoints in production:
- `*.convex.cloud` - WebSocket connections for real-time sync
- `*.convex.site` - HTTP requests for actions and storage

Our local setup mirrors this:
- `mark.convex.cloud.loc` - WebSocket sync (port 3220)
- `mark.convex.site.loc` - HTTP actions (port 3221)

This separation matters because:
1. **Production parity** - Same URL patterns as deployed Convex
2. **Different protocols** - WebSocket vs HTTP have different requirements
3. **CORS handling** - Only HTTP endpoints need CORS (see below)

## CORS Handling

**Important:** The orchestrator proxy handles CORS for Convex HTTP actions (`*.convex.site.loc`).

### Why CORS is Needed

When the browser at `mark.loc` makes requests to `mark.convex.site.loc`, these are cross-origin requests. The browser enforces CORS and will block requests without proper headers.

### Why the Proxy Handles It (Not Your Project Code)

| Approach | Pros | Cons |
|----------|------|------|
| **Proxy handles CORS** | Mimics production (Convex Cloud handles CORS at infrastructure level), no per-project code, centralized | Proxy has Convex-specific knowledge |
| Project code handles CORS | More explicit | Doesn't mimic production, code duplication, must add to every HTTP action |

**We use the proxy approach** because it mimics how Convex Cloud works - CORS is handled at the infrastructure level before requests reach your code.

### What About WebSockets?

WebSocket connections (`*.convex.cloud.loc`) do **not** need CORS handling. The Same Origin Policy does not apply to WebSocket connections - browsers allow WebSocket connections to any origin.

## Why DNS Matters for Authentication

**Critical:** Using DNS names (not `localhost:port`) is essential for authentication stability.

The `@convex-dev/auth` library stores JWT tokens in localStorage using a **normalized URL** as the key:

```
URL: https://mark.convex.cloud.loc
Normalized: httpsmarkconvexcloudloc
Storage key: __convexAuthJWT_httpsmarkconvexcloudloc
```

**If you use ports directly and they change, users get logged out:**

```
Before: NEXT_PUBLIC_CONVEX_URL=http://localhost:3220
        JWT stored as: __convexAuthJWT_httplocalhost3220

After:  Port changes to 3221
        Looking for: __convexAuthJWT_httplocalhost3221
        Result: JWT NOT FOUND - user appears logged out!
```

**With DNS, port changes are invisible to the browser:**

```
Always: NEXT_PUBLIC_CONVEX_URL=https://mark.convex.cloud.loc
        JWT stored as: __convexAuthJWT_httpsmarkconvexcloudloc
        Port changes happen in proxy config, URL unchanged
        Result: JWT FOUND - user stays logged in
```

See [ADR 0018: JWT and Authentication Architecture](../architecture/decisions/0018-jwt-and-authentication-architecture.md) for the complete authentication system documentation.

## Configuration Source of Truth

**All port assignments and network configuration come from the orchestrator's `config.json`.** This is the single source of truth for:
- Port mappings (appPort, convexCloudPort, convexSitePort, mailpitPort)
- Network subnets
- Agent identity

**Environment files are GENERATED from config.json** by `./scripts/agent-init.sh`. Never manually edit ports in environment files - they will be overwritten on the next initialization.

### Port Lookup Flow

```
config.json (orchestrator)
    ↓
./scripts/agent-init.sh (reads config, generates env files)
    ↓
.env.docker.local + app/.env.nextjs.local (derived configuration)
    ↓
Docker Compose + Next.js (consume environment variables)
```

This prevents port conflicts in multi-agent setups. Each agent has unique ports defined in one place.

### Example config.json Structure

```json
{
  "agents": {
    "mark": {
      "appPort": 3010,
      "convexCloudPort": 3220,
      "convexSitePort": 3221,
      "convexDashboardPort": 6801,
      "mailpitPort": 8035,
      "subnet": "172.20.0.0/16"
    }
  }
}
```

## Environment Variables

Your `.env.local` files should use DNS names, not ports. **These files are GENERATED by `./scripts/agent-init.sh`** with:
- Ports read from config.json
- `NODE_EXTRA_CA_CERTS` auto-detected from `mkcert -CAROOT`
- Correct agent-specific domains

**Do not manually edit these files.** Re-run `./scripts/agent-init.sh` if configuration needs to change.

```bash
# Convex URLs (use DNS, not localhost:port)
NEXT_PUBLIC_CONVEX_URL=https://mark.convex.cloud.loc
NEXT_PUBLIC_CONVEX_HTTP_URL=https://mark.convex.site.loc
CONVEX_SITE_URL=https://mark.convex.site.loc

# Shared services
NOVU_API_URL=https://api.novu.loc
MAILPIT_API_URL=https://mark.mailpit.loc/api/v1
```

See [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) for the full list.

## Orchestrator Port Routing (Important!)

**All services route through the orchestrator proxy on port 80.** Never specify ports in `.loc` URLs.

### The Pattern

```
{agent}.{service}.loc → orchestrator (port 80) → correct backend port
```

| URL (correct) | Proxy Routes To |
|---------------|-----------------|
| `james.loc` | `localhost:3010` (Next.js) |
| `james.convex.cloud.loc` | `localhost:3220` (Convex WS) |
| `james.mailpit.loc` | `localhost:8025` (Mailpit) |

### Common Mistake: Specifying Ports

```typescript
// WRONG - bypasses proxy, breaks multi-agent
fetch("https://james.mailpit.loc:8025/api/v1/send")

// CORRECT - uses proxy routing
fetch("https://james.mailpit.loc/api/v1/send")
```

### Why This Matters

1. **Multi-agent support** - Port mappings differ per agent (james uses 8025, mark uses 8035)
2. **Single source of truth** - Proxy config defines all port mappings
3. **Consistency** - Same pattern everywhere, no port hunting

### Key Rules

1. Never specify ports in `.loc` URLs - the proxy handles port mapping
2. All `.loc` requests go through port 80 (default HTTP)
3. The orchestrator `config.json` defines the port mappings
4. If you need to debug, check the Port Reference section below

## Infrastructure vs Application Config

Infrastructure identity (AGENT_NAME, ports) stays in Docker/shell env:

| Location | Purpose | Examples |
|----------|---------|----------|
| `.env.docker.local` | Agent identity | `AGENT_NAME=james` |
| Docker Compose | Port mappings | `CONVEX_ADMIN_PORT=3210` |
| Shell environment | Infrastructure scripts | Port assignments |

Application config (URLs) goes in app env vars:

| Location | Purpose | Examples |
|----------|---------|----------|
| `.env.nextjs.local` | Frontend URLs | `MAILPIT_API_URL` |
| Convex env | Backend URLs | `SITE_URL`, `MAILPIT_URL`, `CONVEX_SITE_ORIGIN` |

### Never Put in Convex Env

- **AGENT_NAME** - Infrastructure identity, meaningless in production
- **Hardcoded localhost URLs** - Won't work in production
- **Port numbers** - Infrastructure detail, not application config

### Do Put in Convex Env

- **Full URLs** that work in that environment (e.g., `https://james.loc`)
- **API keys** and secrets
- **Feature flags**

### Why This Matters

Code that uses `process.env.AGENT_NAME` to construct URLs will break in production because AGENT_NAME doesn't exist there. Instead, use explicit URL env vars that are set appropriately for each environment:

```typescript
// WRONG - uses infrastructure identity
const url = `http://${process.env.AGENT_NAME}.mailpit.loc`;

// CORRECT - uses explicit URL config
const url = process.env.MAILPIT_URL;
if (!url) throw new Error("MAILPIT_URL not set");
```

## TLS Certificates (mkcert)

Local development uses HTTPS with certificates generated by mkcert. The orchestrator proxy terminates TLS and routes requests to backend services.

### How It Works

```
Browser (HTTPS) → Orchestrator Proxy (TLS termination) → Service (HTTP)
```

The mkcert CA must be trusted by your browser and by Node.js processes that make HTTPS requests (like Playwright tests).

### Browser Trust

mkcert automatically installs its CA in your system trust store when you run `mkcert -install`. Most browsers will automatically trust the certificates.

### Node.js Trust (Required for Tests)

Node.js does NOT automatically trust the mkcert CA. You must set `NODE_EXTRA_CA_CERTS` to point to your mkcert root CA.

**Automatic Detection:** `./scripts/agent-init.sh` automatically detects your mkcert CA location using `mkcert -CAROOT` and sets `NODE_EXTRA_CA_CERTS` in `app/.env.nextjs.local`. No manual configuration needed.

**Find your mkcert CA path manually:**
```bash
mkcert -CAROOT
# Example output: /home/username/.local/share/mkcert
```

**Manual configuration (if auto-detection fails):**
```bash
# Add to your shell profile (~/.bashrc or ~/.zshrc)
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"

# Or set in .env.nextjs.local for Playwright tests
NODE_EXTRA_CA_CERTS=/home/YOUR_USERNAME/.local/share/mkcert/rootCA.pem
```

**Why this matters:**
- Playwright tests make HTTPS requests to `*.loc` domains
- Without `NODE_EXTRA_CA_CERTS`, Node.js will reject the self-signed certificates
- Tests will fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or similar errors

See the [Testing Guide](../development/testing-guide.md#https-and-tls-certificates) for more details on running Playwright tests with HTTPS.

## Starting the Infrastructure

**Recommended:** Use the automated initialization script:

```bash
./scripts/agent-init.sh
```

This handles everything: orchestrator verification, environment generation, service startup, and health checks.

**Manual startup** (if needed):

```bash
# 1. Start the orchestrator proxy (required for DNS routing)
cd ../artifact-review-orchestrator
./start.sh

# 2. Start artifact-review dev servers
./scripts/start-dev-servers.sh
```

See [CLAUDE.md](../../CLAUDE.md) for the complete setup guide.

## Troubleshooting

### DNS not resolving (`ERR_NAME_NOT_RESOLVED`)

The orchestrator proxy must be running, and dnsmasq must be configured:

```bash
# Check if orchestrator is running
tmux has-session -t orchestrator-proxy && echo "Running" || echo "Not running"

# Start if needed
cd /home/clint-gossett/Documents/agentic-dev/orchestrator && ./start.sh
```

### CORS errors on Convex requests

If you see CORS errors for `*.convex.site.loc` requests:
1. Ensure the orchestrator proxy is running (it handles CORS)
2. Check that you're using the correct DNS names in `.env.local`

### Connection refused

The target service isn't running:

```bash
# Check what's running
tmux list-sessions

# Start dev servers
./scripts/start-dev-servers.sh
```

### Convex `BadAdminKey` Error

If you see `401 Unauthorized: BadAdminKey: The provided admin key was invalid for this instance`:

**Cause:** The Convex Docker volume was recreated (or is new), generating new credentials that don't match `.env.local`.

**Solution:** Regenerate the admin key from the running container:

```bash
# Generate new admin key
docker exec mark-backend-1 ./generate_admin_key.sh

# Output looks like:
# Admin key:
# artifact-review-local|016dc9ddef2a6d89...

# Update .env.local with the new key
CONVEX_SELF_HOSTED_ADMIN_KEY=artifact-review-local|016dc9ddef2a6d89...

# Restart servers
./scripts/start-dev-servers.sh --restart
```

**Why this happens:**
- The admin key uses AES-128-GCM-SIV encryption, not simple HMAC
- Keys are stored in the Docker volume (`mark_convex_data`)
- When volumes are removed (`docker volume rm mark_convex_data`), new credentials are generated
- The `.env.local` key must match what's in the container

**Prevention:**
- Don't delete the Convex Docker volume unless necessary
- After any Docker volume reset, regenerate the admin key

## Infrastructure ADRs

For deeper understanding, see the architecture decisions in the parent repo:

| ADR | Topic |
|-----|-------|
| [ADR 0001: DNS Indirection](file:///home/clint-gossett/Documents/agentic-dev/docs/adr/0001-dns-indirection.md) | Why DNS names instead of ports |
| [ADR 0002: Tmux Process Management](file:///home/clint-gossett/Documents/agentic-dev/docs/adr/0002-tmux-process-management.md) | How long-running processes are managed |
| [ADR 0003: CORS for Self-Hosted Convex](file:///home/clint-gossett/Documents/agentic-dev/docs/adr/0003-cors-for-self-hosted-convex.md) | Why/how CORS is handled in the proxy |

## Port Reference (Debug Only)

You should never need these ports directly - always use DNS names. This is for debugging only:

| Service | Port | DNS Name |
|---------|------|----------|
| Next.js | 3010 | `mark.loc`, `api.mark.loc` |
| Convex Cloud (WebSocket) | 3220 | `mark.convex.cloud.loc` |
| Convex Site (HTTP) | 3221 | `mark.convex.site.loc` |
| Convex Dashboard | 6801 | `mark.convex.loc` |
| Mailpit | 8035 | `mark.mailpit.loc` |
| Novu Dashboard | 4200 | `novu.loc` |
| Novu API | 3002 | `api.novu.loc` |
