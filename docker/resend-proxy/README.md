# Resend-to-Mailpit Proxy

Intercepts HTTPS calls to `api.resend.com` from the Convex backend and routes them to Mailpit for local email testing.

## How It Works

1. Backend container has `extra_hosts: api.resend.com:172.28.0.10` pointing to this proxy
2. Proxy serves HTTPS on port 443 with mkcert-trusted certificate
3. Backend trusts the cert via `SSL_CERT_FILE` pointing to combined CA bundle
4. Proxy translates Resend API format → Mailpit API format

## Files

- `proxy.js` - Node.js HTTPS server that translates requests
- `Dockerfile` - Container build with mkcert certs
- `certs/` - TLS certificates:
  - `api.resend.com.pem` - Server certificate (mkcert-generated)
  - `api.resend.com-key.pem` - Server private key
  - `rootCA.pem` - mkcert root CA
  - `ca-certificates-with-mkcert.crt` - Combined CA bundle (generated)

## Setup (if certs need regeneration)

The certs are pre-generated using mkcert. If you need to regenerate:

```bash
# Install mkcert
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
mv mkcert-v*-linux-amd64 ~/.local/bin/mkcert

# Generate new cert
cd docker/resend-proxy/certs
~/.local/bin/mkcert api.resend.com

# Regenerate combined CA bundle
docker exec james-backend cat /etc/ssl/certs/ca-certificates.crt > system-ca.crt
cat system-ca.crt rootCA.pem > ca-certificates-with-mkcert.crt

# Restart containers
docker compose --env-file .env.docker.local up -d backend resend-proxy
```

## Endpoints

- `POST /emails/batch` - Batch email send (used by @convex-dev/resend)
- `POST /emails` - Single email send
- `GET /health` - Health check
