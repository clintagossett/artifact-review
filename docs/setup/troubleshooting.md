# Troubleshooting

## Quick Fix: Run the Initialization Script

Most environment and configuration issues can be fixed by running:
```bash
./scripts/agent-init.sh
```

This script:
- Verifies prerequisites (node, npm, docker, tmux, jq, mkcert)
- Generates all environment files from config.json
- Auto-detects mkcert CA path
- Sets up Convex with health checks
- Configures Novu
- Runs smoke tests

Use `--check` to see current configuration status across all sources.

## Configuration Issues

### Port Mismatch Between config.json and Environment Files

**Symptom:** Unexpected ports in URLs, wrong domains, services not accessible at expected addresses.

**Cause:** Environment files (.env.docker.local, app/.env.nextjs.local) don't match the orchestrator config.json. This happens when:
- config.json was updated but env files weren't regenerated
- Manual edits were made to env files
- Agent was initialized before orchestrator config was set

**Fix:** Regenerate environment files from config.json:
```bash
./scripts/agent-init.sh
```

**Verify configuration is correct:**
```bash
./scripts/agent-init.sh --check
```

This compares config.json, .env.docker.local, and app/.env.nextjs.local and shows any mismatches.

---

## Prerequisite Issues

### Missing Prerequisites (Exit Code 1)

**Symptom:** agent-init.sh exits with code 1 and lists missing tools.

**Required tools:** node, npm, docker, tmux, jq, mkcert

**Fix:** Install missing prerequisites:

```bash
# Node.js & npm (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts

# Docker (Debian/Ubuntu)
sudo apt-get update && sudo apt-get install docker.io docker-compose-plugin
sudo usermod -aG docker $USER  # Log out and back in

# tmux
sudo apt-get install tmux

# jq
sudo apt-get install jq

# mkcert (see mkcert section below)
```

---

### mkcert Not Found

**Symptom:** agent-init.sh reports "mkcert not found" or NODE_EXTRA_CA_CERTS can't be auto-detected.

**Fix:** Install mkcert for your OS:

**macOS:**
```bash
brew install mkcert
mkcert -install
```

**Debian/Ubuntu:**
```bash
sudo apt install libnss3-tools
wget https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert-v1.4.4-linux-amd64
sudo mv mkcert-v1.4.4-linux-amd64 /usr/local/bin/mkcert
mkcert -install
```

**Other Linux:**
```bash
# Build from source
git clone https://github.com/FiloSottile/mkcert && cd mkcert
go build -ldflags "-X main.Version=$(git describe --tags)"
sudo mv mkcert /usr/local/bin/
mkcert -install
```

After installing, run `./scripts/agent-init.sh` again to auto-detect the CA path.

**Manual fix if auto-detection still fails:**
```bash
# Find CA path
mkcert -CAROOT

# Add to app/.env.nextjs.local
NODE_EXTRA_CA_CERTS=/path/from/mkcert-CAROOT/rootCA.pem
```

---

## Backup and Rollback

### Script Rollback Behavior

**agent-init.sh creates backups before modifying files:**
- `.env.docker.local.backup`
- `app/.env.nextjs.local.backup`
- Other modified files get `.backup` suffix

**Automatic rollback on:**
- Ctrl+C (user cancellation)
- Script errors (failed health checks, missing orchestrator, etc.)

**Manual restore if needed:**
```bash
# Restore from backup
cp .env.docker.local.backup .env.docker.local
cp app/.env.nextjs.local.backup app/.env.nextjs.local
```

**Backup cleanup:**
Successful runs automatically clean up `.backup` files. If you see `.backup` files, the last run either failed or was cancelled.

---

## Docker Issues

### Health Check Failure (Exit Code 3)

**Symptom:** agent-init.sh exits with code 3: "Docker health check failed after 60s"

**Cause:** Convex backend container isn't reaching healthy status within timeout.

**Debug:**
```bash
source .env.docker.local

# Check container status
docker ps -a --filter name=${AGENT_NAME}-backend

# View container logs
docker logs ${AGENT_NAME}-backend

# Check health check status
docker inspect --format='{{.State.Health.Status}}' ${AGENT_NAME}-backend
```

**Common causes:**
- Insufficient Docker resources (memory, CPU)
- Port conflicts preventing container start
- Corrupted Docker volume

**Fix:**
```bash
# Restart Docker
sudo systemctl restart docker

# Try initialization again
./scripts/agent-init.sh
```

---

## Convex Setup Script

Most Convex environment issues can be fixed by running:
```bash
./scripts/setup-convex-env.sh
```

This script:
- Generates JWT keys if missing
- Retrieves admin key from container
- Updates `.env.local` with correct values
- Sets all required Convex environment variables

Use `--check` to see current state, `--regen` to regenerate JWT keys (invalidates all sessions).

---

## Auth Not Working After Docker/Key Reset

**Symptom:** Sign-up stuck on "Creating account..."

**Fix:** Restart Next.js to clear JWKS cache:
```bash
tmux kill-session -t mark-nextjs
tmux new-session -d -s mark-nextjs -c app "npm run dev -- -p 3010"
```

**Verify:** These should match:
```bash
curl -s https://mark.convex.site.loc/.well-known/jwks.json | grep -o '"n":"[^"]*' | cut -c7-50
curl -s https://mark.loc/.well-known/jwks.json | grep -o '"n":"[^"]*' | cut -c7-50
```

---

## JWT_PRIVATE_KEY "Invalid byte 92" Error

**Preferred Fix:** Run the setup script to regenerate:
```bash
./scripts/setup-convex-env.sh --regen
```

**Manual Fix:** Set with actual newlines, not escaped:
```bash
npx convex env set -- JWT_PRIVATE_KEY "$(cat /path/to/key.pem)"
```

---

## BadAdminKey (401 Unauthorized)

**Preferred Fix:** Run the setup script:
```bash
./scripts/setup-convex-env.sh
```

**Manual Fix:** Get fresh key from container:
```bash
docker exec mark-backend ./generate_admin_key.sh
# Update CONVEX_ADMIN_KEY in .env.local
```

---

## Novu ECONNREFUSED 127.0.0.1:80

**Check:**
```bash
docker exec mark-backend curl -s https://api.novu.loc/v1/subscribers
npx convex env list | grep NOVU
```

**Fix:** Ensure docker-compose.yml has:
```yaml
extra_hosts:
  - "api.novu.loc:host-gateway"
```

And Convex has the env vars:
```bash
npx convex env set NOVU_API_URL https://api.novu.loc
npx convex env set NOVU_SECRET_KEY <key>
```

---

## Novu "API Key not found"

**Fix:** Re-run setup:
```bash
./scripts/setup-novu-org.sh
npx convex env set NOVU_SECRET_KEY <new-key>
```

---

## Convex Overwrites NEXT_PUBLIC_CONVEX_URL

**Fix:** Use public URL in config:
```bash
# .env.local
CONVEX_SELF_HOSTED_URL=https://mark.convex.cloud.loc
```

---

## Docker Container No Ports or Wrong Name

**Check container names:**
```bash
docker ps -a --filter name=backend --format "{{.Names}}: {{.Status}}"
```

Correct names are `mark-backend`, `mark-dashboard`, `mark-mailpit` (no `-1` suffix).

**NEVER run docker compose directly.** Always use:
```bash
./scripts/start-dev-servers.sh --restart
```

Running `docker compose` without proper `AGENT_NAME` creates wrong containers like `artifact-review-backend` which causes data/auth issues.

See `/home/clint-gossett/Documents/agentic-dev/docs/guides/troubleshooting.md` for detailed guidance on this critical mistake.

---

## Port Already Allocated

**Find conflict:**
```bash
docker ps -a --format "{{.Names}} {{.Ports}}" | grep <port>
```

**Fix:**
```bash
docker compose -p <other-project> down
```
