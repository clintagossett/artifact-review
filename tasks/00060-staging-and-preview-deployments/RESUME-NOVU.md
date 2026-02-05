# Session Resume: Task 60 - Staging Environment Setup

**Last Updated:** 2026-02-03 (Late Afternoon)
**Status:** Phase 1 - Staging DEPLOYED ✅ | Next: Test Site & Create Production

---

## ✅ COMPLETED: Phase 1 - Staging Environment

### Step 1.1: Create Staging Convex Project ✅
- ✅ Created `artifact-review-staging` project
- ✅ Deploy key stored: `CONVEX_DEPLOY_STAGING` in `../.env.dev.local`
- ✅ Documentation created: `docs/setup/convex-project-creation.md`

**Project Details:**
- Name: `artifact-review-staging`
- Deployment URL: `https://adventurous-mosquito-571.convex.cloud`
- HTTP Actions URL: `https://adventurous-mosquito-571.convex.site`

### Step 1.2: Configure Convex Staging Project ✅

**Environment Variables (13 total):**
- ✅ Site: `SITE_URL`, `INTERNAL_API_KEY`
- ✅ Email: `RESEND_API_KEY`, `EMAIL_FROM_AUTH`, `EMAIL_FROM_NOTIFICATIONS`
- ✅ Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PRO_ANNUAL`
- ✅ Auth: `JWT_PRIVATE_KEY`, `JWKS`
- ✅ Novu: `NOVU_SECRET_KEY`, `NOVU_API_URL`

**Novu Credentials (US Region):**
Stored in `../.env.dev.local`:
```bash
NOVU_STAGING_SECRET_KEY=3f7fddff501d19f2ac2fc942ad306b59
NOVU_STAGING_APP_ID=IYae_Y00bYFI
NOVU_STAGING_API_URL=https://api.novu.co
NOVU_STAGING_SOCKET_URL=wss://socket.novu.co
```

**Scripts Created:**
- ✅ `scripts/setup-staging-env.sh` - Environment variables
- ✅ `scripts/setup-staging-jwt.sh` - JWT key generation
- ✅ `scripts/setup-staging-novu.sh` - Novu configuration

### Step 1.3: Git Branch Strategy ✅

**Decision: Changed to separate Vercel projects instead of branch-based deployment**

**Git Branches Configured:**
- ✅ Default branch changed to `dev` in GitHub
- ✅ `staging` branch updated from `dev` (commit 0d8cc12)
- ✅ `main` branch updated to match `staging` (commit 0d8cc12)

**Workflow:**
```
dev (default) → staging → main (production)
```

### Step 1.4: Create Vercel Staging Project ✅

**Project Created:** `artifact-review-staging`
- ✅ Connected to GitHub: `clintagossett/artifact-review`
- ✅ Production branch: `staging`
- ✅ Root directory: `app`
- ✅ Build config: Uses `app/vercel.json`
- ✅ Domain: `artifactreview-early.xyz` (assigned to production)

**Environment Variables (8 total):**
Created template file: `../vercel-staging.env` for easy import
- ✅ CONVEX_DEPLOY_KEY
- ✅ NEXT_PUBLIC_CONVEX_URL
- ✅ NEXT_PUBLIC_CONVEX_HTTP_URL
- ✅ SITE_URL
- ✅ NOVU_SECRET_KEY (server-side)
- ✅ NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER
- ✅ NEXT_PUBLIC_NOVU_API_URL
- ✅ NEXT_PUBLIC_NOVU_SOCKET_URL

**Key Learning:** `NOVU_SECRET_KEY` is needed in BOTH Convex AND Vercel (for Next.js API routes)

### Step 1.5: Deploy Staging ✅

**Build Issues Resolved:**
- ❌ First build failed: Missing `NOVU_SECRET_KEY`
- ✅ Added `NOVU_SECRET_KEY` to Vercel
- ✅ Second build succeeded!

**Current Status:**
- ✅ Build completed successfully
- ✅ Domain configured: `artifactreview-early.xyz`
- ⏳ Site testing pending (user taking break)

---

## 🔄 NEXT STEPS

### Immediate: Test Staging Site

1. **Access the site:** `https://artifactreview-early.xyz`
2. **Verify Convex connection:** Check browser console/network for `adventurous-mosquito-571.convex.cloud`
3. **Test basic functionality:**
   - Sign up/login
   - Upload artifact
   - Share/comment
4. **Run tests against staging:**
   - E2E test suite
   - Smoke tests

### Then: Create Production Environment

**Following the same pattern as staging:**

1. **Create Production Convex Project**
   - Project name: `artifact-review-prod`
   - Get deploy key
   - Run setup scripts (env, JWT, Novu)

2. **Create Production Vercel Project**
   - Project name: `artifact-review-prod`
   - Production branch: `main`
   - Domain: `artifactreview.com`
   - Copy `vercel-staging.env` → `vercel-production.env` and update values
   - Import environment variables

3. **Configure DNS**
   - Add `artifactreview.com` DNS records in Porkbun

4. **Test Production**
   - Deploy and verify
   - Run tests

---

## 📝 Key Files & Resources

**Environment Template:**
```bash
../vercel-staging.env  # Template for staging (complete)
../vercel-production.env  # Create this for production
```

**Convex Deploy Keys:**
```bash
# In ../.env.dev.local
CONVEX_DEPLOY_STAGING=prod:adventurous-mosquito-571|eyJ2MiI6Ijg4ZDE2MTdlMzc1NTRhZmNhM2M1ZWNmMjI1ZWVlYjUwIn0=
# CONVEX_DEPLOY_PROD (to be created)
```

**Vercel Projects:**
- Staging: `artifact-review-staging` → `artifactreview-early.xyz`
- Production: `artifact-review-prod` (to be created) → `artifactreview.com`

**Git Branches:**
- `dev` (default) - integration branch
- `staging` - staging environment
- `main` - production environment

---

## 🎯 Overall Progress

**Phase 1: Staging Environment**
- ✅ Step 1.1: Create Staging Convex Project
- ✅ Step 1.2: Configure Convex Staging Project
- ✅ Step 1.3: Git Branch Strategy & Vercel Project Structure
- ✅ Step 1.4: Create Vercel Staging Project
- ✅ Step 1.5: Deploy Staging (build succeeded!)
- ⏳ Step 1.6: Test Deployment (NEXT)

**Phase 2: Production Environment**
- ⏳ Create production Convex project
- ⏳ Create production Vercel project
- ⏳ Configure DNS
- ⏳ Test production

**Phase 3: Preview Deployments** (Future)
- ⏳ Configure preview environment variables
- ⏳ Implement webhook routing for Resend
- ⏳ Test PR preview deployments

---

## 🚀 When You Resume:

**START HERE:**
1. Test staging site at `https://artifactreview-early.xyz`
2. Verify functionality and Convex connection
3. Run tests against staging
4. If all good, proceed to create production environment

**Quick Commands:**
```bash
# View task README
cat tasks/00060-staging-and-preview-deployments/README.md

# Check staging Convex env
export CONVEX_DEPLOY_KEY="prod:adventurous-mosquito-571|eyJ2MiI6Ijg4ZDE2MTdlMzc1NTRhZmNhM2M1ZWNmMjI1ZWVlYjUwIn0="
npx convex env list

# View environment template
cat ../vercel-staging.env
```
