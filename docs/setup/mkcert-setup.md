# mkcert Setup for Local Development

This document explains how mkcert is used for TLS certificates in local development, specifically for the resend-proxy service.

## Overview

The **resend-proxy** intercepts calls to `api.resend.com` from the Convex backend and routes them to Mailpit for local email testing. Since Resend's client expects HTTPS, the proxy needs a valid TLS certificate.

We use [mkcert](https://github.com/FiloSottile/mkcert) to generate locally-trusted certificates:
- `api.resend.com.pem` - Certificate for the proxy
- `api.resend.com-key.pem` - Private key
- `rootCA.pem` - mkcert's root CA (used to build trust chain)

## Certificate Location

Certificates are stored in the **orchestrator repo** (shared across all agents):

```
artifact-review-orchestrator/certs/
├── api.resend.com.pem      # TLS cert for resend-proxy
├── api.resend.com-key.pem  # TLS private key
├── rootCA.pem              # mkcert root CA
├── system-ca.crt           # (generated) System CAs
└── ca-certificates-with-mkcert.crt  # (generated) Combined bundle
```

Agent repos reference these via the `MKCERT_CERTS_PATH` environment variable in `.env.docker.local`:
```bash
MKCERT_CERTS_PATH=../artifact-review-orchestrator/certs
```

The `.pem` files are committed to the orchestrator repo. The `.crt` bundle files are generated at startup and gitignored.

## One-Time Host Setup

**Before first use**, install mkcert's root CA on your host machine:

```bash
# Install mkcert if not present
# macOS: brew install mkcert
# Ubuntu: sudo apt install mkcert

# Install the root CA (adds to system trust store)
mkcert -install
```

This command:
1. Creates a root CA in `~/.local/share/mkcert/` (Linux) or `~/Library/Application Support/mkcert/` (macOS)
2. Adds it to your system's trust store

**Note:** You only need to run `mkcert -install` once per machine.

## How Containers Trust the Certs

The Convex backend container needs to trust certificates signed by mkcert's CA. This is handled automatically:

1. **CA bundle generation** (`start-dev-servers.sh`):
   - Combines system CA certificates with mkcert's `rootCA.pem`
   - Outputs to `docker/certs/ca-certificates-with-mkcert.crt`

2. **Backend trust** (`docker-compose.yml`):
   - Mounts the combined bundle to `/etc/ssl/certs/ca-certificates-with-mkcert.crt`
   - Sets `SSL_CERT_FILE` environment variable to use it

3. **Resend-proxy TLS** (`docker-compose.yml`):
   - Mounts `api.resend.com.pem` and key to `/certs/` in the container
   - Node.js HTTPS server reads these at startup

## Regenerating Certificates

If certificates expire or need regeneration:

```bash
cd ../artifact-review-orchestrator/certs

# Generate new cert for api.resend.com
mkcert api.resend.com

# Copy your mkcert root CA
cp "$(mkcert -CAROOT)/rootCA.pem" rootCA.pem

# Delete old CA bundle so it gets regenerated
rm -f ca-certificates-with-mkcert.crt system-ca.crt

# Back in your agent repo, restart services
cd ../artifact-review-{agent}
source .env.docker.local
export COMPOSE_PROJECT_NAME="$AGENT_NAME"
docker compose --env-file .env.docker.local up -d resend-proxy backend
```

## Troubleshooting

### TLS handshake failures from backend

**Symptom:** Backend logs show `CERT_UNTRUSTED` or `unable to get local issuer certificate`

**Causes:**
1. **CA bundle not generated**: Run `./scripts/start-dev-servers.sh` (generates bundle on first run)
2. **mkcert not installed on host**: Run `mkcert -install`
3. **rootCA.pem missing**: Check that `../artifact-review-orchestrator/certs/rootCA.pem` exists

**Fix:**
```bash
# Regenerate CA bundle
rm ../artifact-review-orchestrator/certs/ca-certificates-with-mkcert.crt
./scripts/start-dev-servers.sh --restart
```

### Certificate expired

**Symptom:** `CERT_HAS_EXPIRED` errors

**Fix:** Regenerate certificates (see "Regenerating Certificates" above)

### Proxy not receiving requests

**Symptom:** Backend logs show connection refused or timeout to `api.resend.com`

**Check:**
1. Resend-proxy container is running: `docker ps | grep resend-proxy`
2. Backend has correct extra_hosts entry: `docker inspect ${AGENT_NAME}-backend | grep api.resend.com`
3. Proxy is on correct network: `docker network inspect ${AGENT_NAME}_resend`

### "mkcert -install" fails

**Symptom:** Permission denied or trust store not found

**Fixes:**
- **Linux**: May need `sudo` for the first install, or install `libnss3-tools` for Firefox support
- **macOS**: Ensure you have admin rights; may prompt for password

## Why Not Use Self-Signed Certs?

Self-signed certificates require:
- Disabling TLS verification (security risk)
- Manual certificate import on each machine
- Complex trust chain management

mkcert solves this by creating a proper CA that integrates with your system's trust store, making development TLS "just work."

## Related Documentation

- [Local Infrastructure](local-infrastructure.md) - Overall local dev setup
- [Email Configuration](email-configuration.md) - How email flows in local dev
- [Troubleshooting](troubleshooting.md) - General troubleshooting guide
