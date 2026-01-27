# Convex Environment Variables Setup

## Quick Start

For agents and developers to set up Convex backend environment variables:

### 1. Create your environment file

```bash
cd app
cp .env.convex.local.example .env.convex.local
```

### 2. Edit `.env.convex.local` with your values

```bash
# Required variables:
SITE_URL=http://mark.loc  # or your local domain
INTERNAL_API_KEY=your-secret-key
RESEND_API_KEY=re_your_key
EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>
EMAIL_FROM_NOTIFICATIONS=Artifact Review <notify@yourdomain.com>
```

### 3. Sync to Convex

```bash
npm run sync-convex-env
```

This reads `.env.convex.local` and automatically sets all variables in Convex using `npx convex env set`.

### 4. Deploy (if needed)

```bash
npx convex dev --once
```

## Why This Approach?

- **Declarative**: All Convex env vars in one file
- **Version controlled**: `.env.convex.local.example` shows required variables
- **Agent-friendly**: Single command to sync everything
- **Repeatable**: Easy to recreate environments

## File Structure

```
app/
├── .env.local                    # Frontend env vars (Next.js)
├── .env.convex.local            # Backend env vars (Convex) - gitignored
├── .env.convex.local.example    # Template for backend vars
└── scripts/
    └── sync-convex-env.js       # Sync script
```

## Verification

Check what's currently set in Convex:

```bash
npx convex env list
```

## Troubleshooting

### JWT Keys Not Setting

If you encounter errors when setting JWT_PRIVATE_KEY (values starting with `--` are parsed as options), the sync script now uses the `--` separator to prevent this:

```bash
npx convex env set -- JWT_PRIVATE_KEY "$(cat /tmp/jwt_key.txt)"
```

The updated `sync-convex-env.js` script handles this automatically.

## See Also

- [Full Environment Variables Documentation](../ENVIRONMENT_VARIABLES.md)
- [Development Setup](../DEVELOPMENT.md)
