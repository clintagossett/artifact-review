# Troubleshooting

## Quick Fix: Run the Setup Script

Most environment issues can be fixed by running:
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
curl -s http://mark.convex.site.loc/.well-known/jwks.json | grep -o '"n":"[^"]*' | cut -c7-50
curl -s http://mark.loc/.well-known/jwks.json | grep -o '"n":"[^"]*' | cut -c7-50
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
docker exec mark-backend curl -s http://api.novu.loc/v1/subscribers
npx convex env list | grep NOVU
```

**Fix:** Ensure docker-compose.yml has:
```yaml
extra_hosts:
  - "api.novu.loc:host-gateway"
```

And Convex has the env vars:
```bash
npx convex env set NOVU_API_URL http://api.novu.loc
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
CONVEX_SELF_HOSTED_URL=http://mark.convex.cloud.loc
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
