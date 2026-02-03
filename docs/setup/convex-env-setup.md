# Convex Environment Variables Setup

## Quick Reference

```bash
# Full setup (first time or after container restart)
./scripts/setup-convex-env.sh

# Sync vars only (non-disruptive, after editing .env.convex.local)
./scripts/setup-convex-env.sh --sync

# Check current state
./scripts/setup-convex-env.sh --check

# Regenerate JWT keys (invalidates all sessions!)
./scripts/setup-convex-env.sh --regen
```

## The Script: `./scripts/setup-convex-env.sh`

This is the **single source of truth** for managing Convex environment variables.

### Options

| Flag | Purpose | Disruptive? |
|------|---------|-------------|
| (none) | Full setup: JWT keys, admin key, sync all vars | Yes - restarts Convex dev |
| `--sync` | Sync vars from `.env.convex.local` only | No |
| `--check` | Show current Convex env state | No |
| `--regen` | Regenerate JWT keys | Yes - invalidates sessions |

### When to Use Each Option

- **First time setup**: `./scripts/setup-convex-env.sh` (no flags)
- **Added a new env var**: `./scripts/setup-convex-env.sh --sync`
- **Changed a value**: `./scripts/setup-convex-env.sh --sync`
- **After container restart**: `./scripts/setup-convex-env.sh` (refreshes admin key)
- **Debugging**: `./scripts/setup-convex-env.sh --check`

## Setup Steps

### 1. Create your environment file

```bash
cp app/.env.convex.local.example app/.env.convex.local
```

### 2. Edit `app/.env.convex.local` with your values

```bash
# Required variables:
SITE_URL=https://james.loc  # Your agent's domain
INTERNAL_API_KEY=your-secret-key
RESEND_API_KEY=re_your_key
EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>
EMAIL_FROM_NOTIFICATIONS=Artifact Review <notify@yourdomain.com>

# Stripe (if using billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
```

### 3. Run setup

```bash
./scripts/setup-convex-env.sh
```

This will:
- Generate JWT keys (if not already set)
- Retrieve admin key from Docker container
- Sync all vars from `.env.convex.local` to Convex
- Update `.env.nextjs.local` with connection info

## File Structure

```
project-root/
├── scripts/
│   └── setup-convex-env.sh      # Main setup script
└── app/
    ├── .env.convex.local        # Backend env vars (gitignored)
    ├── .env.convex.local.example # Template
    └── .env.nextjs.local        # Next.js + Convex connection (gitignored)
```

## Verification

```bash
# Check all vars in Convex
./scripts/setup-convex-env.sh --check

# Or query specific var
npx convex env get SITE_URL --env-file app/.env.nextjs.local
```

## Troubleshooting

### "No .env.nextjs.local found"

Run full setup first:
```bash
./scripts/setup-convex-env.sh
```

### JWT Keys Errors

JWT keys should NOT be in `.env.convex.local`. They are managed separately by the setup script. If you accidentally added them:
1. Remove `JWT_PRIVATE_KEY` and `JWKS` from `.env.convex.local`
2. Run `./scripts/setup-convex-env.sh --sync`

### Environment vars not taking effect

Convex picks up env changes automatically, but you may need to:
```bash
npx convex dev --once --env-file app/.env.nextjs.local
```

## See Also

- [Full Environment Variables Documentation](../ENVIRONMENT_VARIABLES.md)
- [Troubleshooting Guide](./troubleshooting.md)
