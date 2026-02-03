# Resend-to-Mailpit Proxy

Intercepts HTTPS calls to `api.resend.com` from the Convex backend and routes them to Mailpit for local email testing.

## How It Works

1. Backend container has `extra_hosts: api.resend.com:172.28.0.10` pointing to this proxy
2. Proxy serves HTTPS on port 443 with mkcert-trusted certificate
3. Backend trusts the cert via `SSL_CERT_FILE` pointing to combined CA bundle
4. Proxy translates Resend API format → Mailpit API format

## Files

- `proxy.js` - Node.js HTTPS server that translates requests
- `Dockerfile` - Container build (certs mounted at runtime)

## TLS Certificates

Certificates are stored in the **orchestrator repo** and mounted into the container:
- `api.resend.com.pem` - Server certificate (mkcert-generated)
- `api.resend.com-key.pem` - Server private key
- `rootCA.pem` - mkcert root CA
- `ca-certificates-with-mkcert.crt` - Combined CA bundle (generated at startup)

Location: Configured via `MKCERT_CERTS_PATH` in `.env.docker.local` (default: `../artifact-review-orchestrator/certs/`)

See [docs/setup/mkcert-setup.md](../../docs/setup/mkcert-setup.md) for full certificate documentation.

## Endpoints

- `POST /emails/batch` - Batch email send (used by @convex-dev/resend)
- `POST /emails` - Single email send
- `GET /health` - Health check
