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
- **Web App**: http://ar.local.com (Proxies to localhost:3000)
- **API**: http://api.ar.local.com (Proxies to localhost:3211)

### Agent API
The Agent API Specification is available at:
- **Discovery**: http://ar.local.com/openapi.yaml (Public instructions)
- **Full Spec**: http://api.ar.local.com/api/v1/openapi.yaml (Protected, requires `X-API-Key`)
