# Development Setup

## Local DNS Mocking (Optional)

To simulate a production-like environment with custom domains (`ar.local.com` and `api.ar.local.com`), we use a local reverse proxy.

### 1. One-time Setup
Run the setup script which will add the domains to your `/etc/hosts` and start the proxy.
```bash
./scripts/setup-local-dns.sh
```

### 2. Running the Proxy manually
If you already have the hosts entries, you can start the proxy directly from the `app` directory:

```bash
cd app
sudo npm run proxy
```
*Note: Sudo is required to bind to Port 80.*

### URLs
- **Web App**: http://ar.loc (Proxies to localhost:3000)
- **API**: http://api.ar.loc (Proxies to localhost:3211)

### Agent API
The Agent API Specification is available at:
- **Discovery**: http://ar.loc/openapi.yaml (Public instructions)
- **Full Spec**: http://api.ar.loc/api/v1/openapi.yaml (Protected, requires `X-API-Key`)

## Multi-Agent / Parallel Development

Run multiple isolated instances of the app (e.g., `mark`, `alice`) on the same machine.

### 1. Architecture & Ports
We use a **Port Offset** strategy. You choose a `Base Port` (e.g., 3010), and all other services are calculated relative to it.

| Service | Calculation | Example (`--port 3010`) | Domain |
| :--- | :--- | :--- | :--- |
| **Next.js App** | `Base` | **3010** | `http://mark.loc` |
| **Convex API** | `Base + 211` | **3221** | `http://api.mark.loc` |
| **Convex Dash** | `Base + 3791` | 6801 | `http://convex.mark.loc` |
| **Novu Studio** | `Base + 1022` | 4032 | `http://novu.mark.loc` |
| **Novu Console** | `Base + 1200` | 4210 | `http://novu-console.mark.loc` |
| **Mailpit** | `Base + 5025` | 8035 | `http://mailpit.mark.loc` |

### 2. Setup New Agent
1. **Register**: (Updates DNS & Proxy Config)
   ```bash
   ./scripts/manage-agent.sh register mark 3010
   ```
   *Requires `sudo` once per agent to update `/etc/hosts`.*

2. **Start Servers**:
   ```bash
   ./scripts/start-dev-servers.sh --agent mark --port 3010
   ```

3. **Start Proxy**: (Main workspace only)
   ```bash
   cd app && npm run proxy
   ```
   *Runs on Port 80. Requires `sudo setcap` one-time setup (see below).*

### 3. Port 80 Setup (No Sudo)
To run the proxy on Port 80 without `sudo` every time:
```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### 4. URLs
- **Mark's App**: `http://mark.loc`
- **Mark's API**: `http://api.mark.loc`
- **Tools**: `mailpit.mark.loc`, `novu.mark.loc`, `convex.mark.loc`

### 5. Convex & Local Docker
We run a self-hosted Convex backend in Docker. To ensure `npx convex dev` connects to it (instead of spinning up a random local backend):
1.  **Environment**: `CONVEX_SELF_HOSTED_URL` must be set to `http://127.0.0.1:[PORT]`.
2.  **No Deployment**: `CONVEX_DEPLOYMENT` must be **unset** or removed from `.env.local`.

The `start-dev-servers.sh` script handles this automatically:
- calculates the correct port (e.g., 3221).
- exports `CONVEX_SELF_HOSTED_URL`.
- unsets `CONVEX_DEPLOYMENT`.
- comments out conflicting lines in `app/.env.local`.

**Troubleshooting**:
If `npx convex dev` prompts to create a new project or spins up on a wrong port (like 3212):
1. Stop the server.
2. Check `app/.env.local` and delete any `CONVEX_DEPLOYMENT=...` lines.
3. Restart using the script: `./scripts/start-dev-servers.sh ... --restart`.

