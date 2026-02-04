# Convex Project Creation Guide

**Purpose:** Step-by-step guide for creating Convex projects for staging and production environments

**Last Updated:** 2026-02-03

## Overview

This guide documents the process of creating new Convex projects in the Convex dashboard. Each deployment environment (staging, production) requires its own Convex project for proper isolation and access control.

## Convex Project Architecture

```
artifact-review-dev (existing)
  ├── dev deployments → Local development
  └── Used for: Local dev experiments only

artifact-review-staging (CREATE NEW)
  ├── prod deployment → STAGING (artifactreview-early.xyz)
  └── preview deployments → PR previews

artifact-review-prod (CREATE LATER)
  └── prod deployment → PRODUCTION (artifactreview.com)
```

**Important:** Convex's "prod" deployment ≠ production environment. Every Convex project has:
- **prod deployment** - Stable, persistent deployment (used for staging OR production)
- **dev deployments** - Unstable, temporary deployments (local development or previews)

We use the "prod" deployment of the `artifact-review-staging` project for our staging environment.

## Prerequisites

- Convex account with access to create projects
- Access to Convex dashboard: https://dashboard.convex.dev/

## Creating a Convex Project

### Step 1: Access Convex Dashboard

1. Navigate to https://dashboard.convex.dev/
2. Sign in with your Convex account
3. You'll see your existing projects listed

### Step 2: Create New Project

1. Click **"Create a project"** button (top right)
2. **Project name:** Enter the project name
   - For staging: `artifact-review-staging`
   - For production: `artifact-review-prod`
3. **Region:** Select deployment region
   - Recommended: `us-west-2` (or closest to your users)
   - **Important:** Use the same region for all projects (dev, staging, prod) to minimize latency between environments
4. Click **"Create"**

The project will be created and you'll be redirected to the project dashboard.

### Step 3: Note Project Information

After creation, record these details:

1. **Project URL:** `https://[random-name].convex.cloud`
   - This is your Convex backend URL
   - Format: `https://[adjective-animal-number].convex.cloud`
   - Example: `https://happy-fox-123.convex.cloud`

2. **Project HTTP URL:** `https://[random-name].convex.site`
   - Used for HTTP actions
   - Same prefix as the project URL
   - Example: `https://happy-fox-123.convex.site`

3. **Project ID:** Found in Settings → General
   - Used for CLI commands with `--project` flag
   - Example: `artifact-review-staging`

### Step 4: Generate Deploy Key

The deploy key allows Vercel (or other CI/CD systems) to deploy to this Convex project.

1. Navigate to **Settings → Deploy Keys**
2. Click **"Generate a deploy key"**
3. **Environment:** Select `prod` (for staging/production environments)
   - This creates a key that can deploy to the "prod" deployment
   - Preview deployments will create separate "dev" deployments within the project
4. **Copy the deploy key** - it will look like:
   ```
   prod:xxxxxxxxxxxxx|yyyyyyyyyyyyyy
   ```
5. **Store securely** - you'll need this for:
   - Vercel environment variables (`CONVEX_DEPLOY_KEY`)
   - Parent project config (`../../.env.dev.local` as `CONVEX_DEPLOY_STAGING`)

**Important:** The deploy key is shown only once. If you lose it, you'll need to regenerate (which invalidates the old one).

### Step 5: Configure Environment Variables

Each Convex project needs environment variables configured. These are set via the Convex CLI or dashboard.

#### Via Convex Dashboard

1. Navigate to **Settings → Environment Variables**
2. Add each variable:
   - Click **"Add Environment Variable"**
   - Enter name and value
   - Click **"Save"**

#### Via Convex CLI (Recommended)

```bash
# Set variables for staging project
npx convex env set VARIABLE_NAME="value" --project artifact-review-staging --prod

# For production project
npx convex env set VARIABLE_NAME="value" --project artifact-review-prod --prod
```

**Important:** Use `--prod` flag to set variables for the "prod" deployment (used by staging/production).

#### Required Environment Variables

For staging project:

```bash
# Site configuration
npx convex env set SITE_URL="https://artifactreview-early.xyz" --project artifact-review-staging --prod

# Email (Resend)
npx convex env set RESEND_API_KEY="re_..." --project artifact-review-staging --prod
npx convex env set EMAIL_FROM_AUTH="Artifact Review <auth@artifactreview-early.xyz>" --project artifact-review-staging --prod
npx convex env set EMAIL_FROM_NOTIFICATIONS="Artifact Review <notify@artifactreview-early.xyz>" --project artifact-review-staging --prod

# Stripe (test mode)
npx convex env set STRIPE_SECRET_KEY="sk_test_..." --project artifact-review-staging --prod
npx convex env set STRIPE_WEBHOOK_SECRET="whsec_..." --project artifact-review-staging --prod
npx convex env set STRIPE_PRICE_ID_PRO="price_..." --project artifact-review-staging --prod
npx convex env set STRIPE_PRICE_ID_PRO_ANNUAL="price_..." --project artifact-review-staging --prod

# OAuth (staging credentials)
npx convex env set GOOGLE_CLIENT_ID="..." --project artifact-review-staging --prod
npx convex env set GOOGLE_CLIENT_SECRET="..." --project artifact-review-staging --prod
npx convex env set GITHUB_CLIENT_ID="..." --project artifact-review-staging --prod
npx convex env set GITHUB_CLIENT_SECRET="..." --project artifact-review-staging --prod

# Internal API key (generate random string)
npx convex env set INTERNAL_API_KEY="..." --project artifact-review-staging --prod
```

For production project (when ready):

```bash
# Site configuration
npx convex env set SITE_URL="https://artifactreview.com" --project artifact-review-prod --prod

# Email (Resend - production key)
npx convex env set RESEND_API_KEY="re_..." --project artifact-review-prod --prod
npx convex env set EMAIL_FROM_AUTH="Artifact Review <auth@artifactreview.com>" --project artifact-review-prod --prod
npx convex env set EMAIL_FROM_NOTIFICATIONS="Artifact Review <notify@artifactreview.com>" --project artifact-review-prod --prod

# Stripe (live mode)
npx convex env set STRIPE_SECRET_KEY="sk_live_..." --project artifact-review-prod --prod
npx convex env set STRIPE_WEBHOOK_SECRET="whsec_..." --project artifact-review-prod --prod
npx convex env set STRIPE_PRICE_ID_PRO="price_..." --project artifact-review-prod --prod
npx convex env set STRIPE_PRICE_ID_PRO_ANNUAL="price_..." --project artifact-review-prod --prod

# OAuth (production credentials)
npx convex env set GOOGLE_CLIENT_ID="..." --project artifact-review-prod --prod
npx convex env set GOOGLE_CLIENT_SECRET="..." --project artifact-review-prod --prod
npx convex env set GITHUB_CLIENT_ID="..." --project artifact-review-prod --prod
npx convex env set GITHUB_CLIENT_SECRET="..." --project artifact-review-prod --prod

# Internal API key (generate random string, different from staging)
npx convex env set INTERNAL_API_KEY="..." --project artifact-review-prod --prod
```

### Step 6: Deploy Initial Schema

The project is created but empty. Deploy your Convex schema and functions:

```bash
# Deploy to staging
npx convex deploy --project artifact-review-staging --prod

# Deploy to production (when ready)
npx convex deploy --project artifact-review-prod --prod
```

This will:
- Push your schema from `convex/schema.ts`
- Deploy all functions from `convex/`
- Create database tables based on schema

### Step 7: Verify Setup

```bash
# List all Convex projects
npx convex projects ls

# Check environment variables
npx convex env ls --project artifact-review-staging --prod

# Check deployment status
npx convex dashboard --project artifact-review-staging
```

## Storing Project Information

### For Local Development

Store deploy keys in parent project's `.env.dev.local`:

```bash
# In artifact-review-dev/.env.dev.local
CONVEX_DEPLOY_STAGING="prod:xxxxxxxxxxxxx|yyyyyyyyyyyyyy"
CONVEX_DEPLOY_PROD="prod:xxxxxxxxxxxxx|yyyyyyyyyyyyyy"
```

This allows all agent instances to reference the staging/production deploy keys.

### For Vercel

Set these environment variables in Vercel for each environment:

**Staging environment:**
- `NEXT_PUBLIC_CONVEX_URL` = `https://[staging-name].convex.cloud`
- `NEXT_PUBLIC_CONVEX_HTTP_URL` = `https://[staging-name].convex.site`
- `CONVEX_DEPLOY_KEY` = `prod:xxxxxxxxxxxxx|yyyyyyyyyyyyyy` (staging deploy key)

**Production environment:**
- `NEXT_PUBLIC_CONVEX_URL` = `https://[prod-name].convex.cloud`
- `NEXT_PUBLIC_CONVEX_HTTP_URL` = `https://[prod-name].convex.site`
- `CONVEX_DEPLOY_KEY` = `prod:xxxxxxxxxxxxx|yyyyyyyyyyyyyy` (production deploy key)

## Upgrading to Professional Plan

Production projects should be upgraded to Professional plan for:
- Production support
- Higher rate limits
- Better SLA
- Advanced features

**Cost:** $25/month per project

### Steps to Upgrade

1. Open project in Convex dashboard
2. Navigate to **Settings → Billing**
3. Click **"Upgrade to Professional"**
4. Add payment method
5. Confirm upgrade

**Note:** Only upgrade production project. Keep staging and dev projects on free plan.

## Troubleshooting

### "Project not found" when deploying

Make sure you're using the correct project name:
```bash
npx convex projects ls  # List all projects
npx convex deploy --project artifact-review-staging --prod
```

### Deploy key not working

- Verify the key is for the correct environment (`prod` vs `dev`)
- Check if key was regenerated (invalidates old keys)
- Ensure key is properly formatted: `prod:xxx|yyy`

### Environment variables not set

```bash
# Check what's currently set
npx convex env ls --project artifact-review-staging --prod

# Set missing variables
npx convex env set VARIABLE_NAME="value" --project artifact-review-staging --prod
```

### Schema deployment fails

- Check for schema validation errors in output
- Ensure schema is valid TypeScript
- Try deploying with `--debug` flag for more info:
  ```bash
  npx convex deploy --project artifact-review-staging --prod --debug
  ```

## Next Steps

After creating the Convex project:

1. Configure Vercel to use the new project
2. Set up domain DNS records
3. Deploy application to staging environment
4. Test functionality
5. Configure monitoring and alerts

## See Also

- [Convex Environment Variables Setup](./convex-env-setup.md) - Local development setup
- [Deployment Environments](../architecture/deployment-environments.md) - Full environment strategy
- [Account Setup Checklist](./account-checklist.md) - Complete setup guide
- [Task 00060: Staging + Preview Deployments](../../tasks/00060-staging-and-preview-deployments/README.md) - Implementation task
