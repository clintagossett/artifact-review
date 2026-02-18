# /set-staging-env - Set Staging Environment Variables

Set environment variables for Vercel (Next.js) and Convex (backend) staging deployments.

## Usage

```
/set-staging-env VARIABLE_NAME=value          # Auto-detect target (Vercel or Convex)
/set-staging-env --vercel VARIABLE_NAME=value # Force Vercel
/set-staging-env --convex VARIABLE_NAME=value # Force Convex
/set-staging-env --list                       # List current staging env vars
```

## Where Secrets Are Stored

| Secret | Location | Purpose |
|--------|----------|---------|
| `VERCEL_TOKEN` | `../artifact-review-dev/.env.dev.local` | Vercel API authentication |
| `CONVEX_DEPLOY_KEY` | `../artifact-review-dev/.env.dev.local` | Convex deployment (staging) |

## Staging Infrastructure IDs

| Resource | ID |
|----------|-----|
| Vercel Team ID | `team_dD61vKrjrHtvbXe8o2ZmgjUS` |
| Vercel Project ID (staging) | `prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5` |
| Convex Deployment | `adventurous-mosquito-571` |
| Convex HTTP URL | `https://adventurous-mosquito-571.convex.site` |

## Instructions

### Step 1: Load API Token

```bash
VERCEL_TOKEN=$(grep VERCEL_TOKEN ../artifact-review-dev/.env.dev.local | cut -d= -f2)
```

### Step 2: Set Vercel Environment Variable

For Next.js runtime variables (client or server-side):

```bash
curl -s -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  -d '{"key":"VARIABLE_NAME","value":"value","type":"plain","target":["preview"]}'
```

**Target options:**
- `["preview"]` - Staging only (recommended)
- `["production"]` - Production only
- `["preview", "production"]` - Both environments

**Type options:**
- `plain` - Visible in dashboard
- `encrypted` - Hidden after creation (for secrets)

### Step 3: Set Convex Environment Variable

For Convex backend variables:

```bash
cd app
npx convex env set VARIABLE_NAME "value" --prod
```

Or use the setup script for bulk sync:

```bash
./scripts/setup-convex-env.sh --sync
```

### Step 4: Trigger Redeploy (if needed)

Vercel picks up env vars on next deploy. To trigger immediately:

```bash
git commit --allow-empty -m "chore: Trigger redeploy for env var change" && git push origin staging
```

## Which Target to Use?

| Variable Prefix/Type | Target | Reason |
|---------------------|--------|--------|
| `NEXT_PUBLIC_*` | Vercel | Client-side, bundled at build |
| `NOVU_*` (server) | Vercel | Next.js API routes |
| `SITE_URL` | Vercel | Build-time config |
| `STRIPE_*` | Convex | Backend payment processing |
| `RESEND_*` | Convex | Backend email sending |
| `JWT_*`, `JWKS` | Convex | Auth (set via setup script only) |
| `INTERNAL_API_KEY` | Convex | Backend API auth |

## Tracking Files

After setting variables, update the tracking files:

| File | Purpose |
|------|---------|
| `../artifact-review-dev/.env.vercel.staging` | Vercel staging vars |
| `../artifact-review-dev/.env.convex.staging` | Convex staging vars |

## List Current Variables

### Vercel:
```bash
VERCEL_TOKEN=$(grep VERCEL_TOKEN ../artifact-review-dev/.env.dev.local | cut -d= -f2)
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  -o /tmp/vercel-envs.json && \
python3 -c "import json; d=json.load(open('/tmp/vercel-envs.json')); [print(f'{e[\"key\"]}: {e.get(\"value\",\"[encrypted]\")} ({e[\"target\"]})') for e in d.get('envs',[])]"
```

### Convex:
```bash
cd app && npx convex env list --prod
```

## Common Variables

### Vercel Staging
```
CONVEX_DEPLOY_KEY=prod:adventurous-mosquito-571|...
NEXT_PUBLIC_CONVEX_URL=https://adventurous-mosquito-571.convex.cloud
NEXT_PUBLIC_CONVEX_HTTP_URL=https://adventurous-mosquito-571.convex.site
SITE_URL=https://artifactreview-early.xyz
NOVU_SECRET_KEY=...
NOVU_API_URL=https://api.novu.co
NOVU_DIGEST_INTERVAL=2m   # ⚠️ Vercel ONLY - NOT in Convex (read by Novu bridge in Next.js)
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=...
NEXT_PUBLIC_NOVU_API_URL=https://api.novu.co
NEXT_PUBLIC_NOVU_SOCKET_URL=wss://socket.novu.co
```

### Convex Staging
```
SITE_URL=https://artifactreview-early.xyz
INTERNAL_API_KEY=...
JWT_PRIVATE_KEY=... (set via setup script)
JWKS=... (set via setup script)
RESEND_API_KEY=...
EMAIL_FROM_AUTH=auth@artifactreview-early.xyz
EMAIL_FROM_NOTIFICATIONS=notify@artifactreview-early.xyz
NOVU_SECRET_KEY=...
NOVU_API_URL=https://api.novu.co
NOVU_EMAIL_WEBHOOK_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_PRO=...
STRIPE_PRICE_ID_PRO_ANNUAL=...
```

## Examples

### Set Novu digest interval for staging:
**NOTE:** `NOVU_DIGEST_INTERVAL` is a **Vercel-only** variable. It is read by the Novu bridge (Next.js API route), NOT by Convex. Do not set it in Convex.
```bash
VERCEL_TOKEN=$(grep VERCEL_TOKEN ../artifact-review-dev/.env.dev.local | cut -d= -f2)
# Target must include "production" because staging deploys to Vercel's production environment
curl -s -X PATCH \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v9/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env/<ENV_ID>" \
  -d '{"value":"2m","target":["production","preview"]}'
# After changing: redeploy Vercel AND re-sync Novu workflow (see ENVIRONMENT_VARIABLES.md)
```

### Set Stripe webhook secret in Convex:
```bash
cd app && npx convex env set STRIPE_WEBHOOK_SECRET "whsec_..." --prod
```

### Update existing variable (delete + recreate):
```bash
# Get env ID first
VERCEL_TOKEN=$(grep VERCEL_TOKEN ../artifact-review-dev/.env.dev.local | cut -d= -f2)
ENV_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print([e['id'] for e in d.get('envs',[]) if e['key']=='VARIABLE_NAME'][0])")

# Delete
curl -s -X DELETE \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env/$ENV_ID?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS"

# Recreate with new value
curl -s -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5/env?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  -d '{"key":"VARIABLE_NAME","value":"new_value","type":"plain","target":["preview"]}'
```
