# /ready-environment - Verify Development Environment

Ensure the local development environment is running and ready for work. This is **Step 1** of the session startup flow.

## Reference Docs

- **Infrastructure details:** See `docs/setup/local-infrastructure.md`
- **Troubleshooting:** See `docs/setup/troubleshooting.md`
- **Environment variables:** See `docs/ENVIRONMENT_VARIABLES.md`

## Workflow

### 1. Load Agent Configuration

```bash
source .env.docker.local
echo "Agent: $AGENT_NAME"
```

### 2. Check and Start Docker Containers

```bash
# Check state
docker ps -a --filter "name=${AGENT_NAME}-backend" --format "{{.Names}}: {{.Status}}"

# If stopped, START (don't recreate)
docker start ${AGENT_NAME}-backend ${AGENT_NAME}-dashboard
```

### 3. Check and Start Orchestrator Proxy

```bash
curl -s --max-time 2 http://localhost:80 >/dev/null 2>&1 || \
  (cd ../artifact-review-orchestrator && ./start.sh)
```

### 4. Check and Start Dev Servers

```bash
tmux has-session -t ${AGENT_NAME}-convex-dev 2>/dev/null || ./scripts/start-dev-servers.sh
```

### 5. Verify Connectivity (Smoke Tests)

```bash
curl -s --max-time 10 https://${AGENT_NAME}.loc | head -1
curl -s --max-time 10 https://${AGENT_NAME}.convex.cloud.loc | head -1
```

### 6. Report Status

**Success:** "Environment Ready - proceed to /check-branch-state"

**Failure:** Report which component failed and reference troubleshooting docs.

## Key Principle

**Start existing services, don't recreate them.** Use `docker start`, not `docker compose up`.
