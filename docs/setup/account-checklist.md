# Account Setup Checklist

**Status:** Active
**Last Updated:** 2025-12-25
**Purpose:** Just-In-Time account setup guide aligned with development phases

## Overview

This checklist uses a **Just-In-Time (JIT)** approach - you only set up accounts when you actually need them. This reduces upfront friction and prevents setting up services you won't use immediately.

**Key Principle:** Don't set up more than you need for the current step.

---

## JIT Setup Phases

### Phase 1: Local Development - Anonymous Auth

**When:** Before starting [Task 00006, Step 1](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/tasks/00006-local-dev-environment/README.md#step-1-anonymous-authentication)

**What you're building:** Anonymous authentication working locally

**Accounts needed:**
- [ ] Convex account (free tier, no deploy keys yet)
- [ ] GitHub account (for code hosting)

**System tools needed:**
- [ ] Node.js 20+
- [ ] npm
- [ ] git
- [ ] direnv

**Setup time:** 15-20 minutes

#### Step-by-Step Setup

**1. GitHub Account**

```bash
# Verify or create GitHub account
gh auth login

# Verify access
gh auth status
```

**2. Convex Account**

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Sign up with GitHub (recommended)
3. Don't create projects yet - `npx convex dev` will do this automatically

**3. Local Development Tools**

```bash
# Install Node.js (macOS)
brew install node@20

# Install direnv (macOS)
brew install direnv

# Add to shell (zsh)
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc

# Verify
node --version  # Should show v20+
direnv --version
```

**What you DON'T need yet:**
- Vercel account
- Resend account
- OAuth apps
- Domain registration
- Mailpit (comes in Phase 2)

**Verification:**

```bash
# Clone repo
gh repo clone your-username/artifact-review
cd artifact-review

# Allow direnv
direnv allow .

# Initialize Convex (creates dev project + .env.local automatically)
npx convex dev

# Should succeed and show Convex dev URL
```

**Move to Phase 2 when:** Anonymous auth works locally

---

### Phase 2: Local Development - Magic Links

**When:** Before starting [Task 00006, Step 2](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/tasks/00006-local-dev-environment/README.md#step-2-magic-link-authentication)

**What you're building:** Magic link authentication working locally (emails captured, not delivered)

**NEW accounts needed:**
- None - just Docker for Mailpit

**NEW system tools needed:**
- [ ] Docker Desktop

**Setup time:** 10 minutes

#### Step-by-Step Setup

**1. Install Docker**

```bash
# Install Docker Desktop (macOS)
brew install --cask docker

# Start Docker Desktop app
open -a Docker

# Verify
docker --version
```

**2. Start Mailpit**

```bash
# Start Mailpit container
docker run -d \
  --name mailpit \
  -p 1025:1025 \
  -p 8025:8025 \
  --restart unless-stopped \
  axllent/mailpit

# Verify it's running
docker ps | grep mailpit

# Open web UI
open http://localhost:8025
```

**What Mailpit does:**
- Captures all emails sent to `localhost:1025`
- Shows them in web UI at `http://localhost:8025`
- No emails actually delivered (perfect for local testing)

**What you DON'T need yet:**
- Resend account (real email service)
- Vercel account
- OAuth providers
- Domain

**Verification:**

After implementing magic link auth in Task 6 Step 2:

1. Start app: `npm run dev`
2. Go to magic link signup flow
3. Check Mailpit UI: `http://localhost:8025`
4. Should see magic link email
5. Click link → should authenticate

**Move to Phase 3 when:** Magic links work locally and you're ready to deploy

---

### Phase 3: Hosted Development

**When:** After local dev works and you want to deploy to Vercel

**What you're building:** Your app deployed and accessible via `*.vercel.app` URL

**NEW accounts needed:**
- [ ] Vercel account (free tier for now)
- [ ] Resend account (free tier, test API key only)

**Setup time:** 30-45 minutes

#### Step-by-Step Setup

**1. Vercel Account**

```bash
# Sign up at vercel.com with GitHub
open https://vercel.com/signup

# Install CLI
npm install -g vercel

# Login
vercel login

# Link project
cd /path/to/artifact-review
vercel link
# Follow prompts to create new project
```

**2. Resend Account (Test Mode)**

1. Go to [resend.com](https://resend.com)
2. Sign up with email
3. Verify email address
4. Dashboard → API Keys → Create API Key
   - Name: `artifact-review-test`
   - Type: **Test** (not production)
   - Copy key (starts with `re_test_`)

**3. Configure Convex Environment Variables**

```bash
# Set Resend test key in Convex dev project
npx convex env set RESEND_API_KEY="re_test_..." --project dev
npx convex env set RESEND_FROM_EMAIL="auth@yourdomain.com" --project dev

# Verify
npx convex env ls --project dev
```

**4. Configure Vercel Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_CONVEX_URL = https://your-dev.convex.cloud
CONVEX_DEPLOY_KEY = dev:xxxxxxxxxxxxx
```

Or via CLI:

```bash
vercel env add NEXT_PUBLIC_CONVEX_URL production
# Paste: https://your-dev.convex.cloud

vercel env add CONVEX_DEPLOY_KEY production
# Paste: dev:xxxxxxxxxxxxx (from Convex dashboard)
```

**5. Override Vercel Build Command**

Vercel Dashboard → Project Settings → General → Build & Development Settings:

```
Build Command: npx convex deploy --cmd 'npm run build'
```

This ensures Convex deploys before frontend build.

**What you DON'T need yet:**
- Custom domain
- OAuth providers (Google, GitHub)
- Production Resend keys
- Staging environment

**Verification:**

```bash
# Deploy to Vercel
git push origin main

# Check Vercel dashboard for build logs
vercel --prod

# Visit deployment
open https://artifact-review.vercel.app

# Test anonymous auth - should work
# Test magic links - emails logged in Resend dashboard (test mode, not delivered)
```

**Move to Phase 4 when:** Ready for staging/production

---

### Phase 4: Staging & Production (Future)

**When:** Ready to set up custom domains and real email delivery

**Status:** Do this later - not needed for MVP

**NEW accounts/services needed:**
- [ ] Domain registrar (Namecheap, $10-20/year)
- [ ] Convex Professional plan ($25/month for production)
- [ ] Vercel Pro plan ($20/month for commercial use)
- [ ] OAuth apps (Google + GitHub)
- [ ] Production Resend API keys

**Setup time:** 2-3 hours

See [Complete Account Reference](#complete-account-reference) below for full setup instructions.

**When you need this:**
- Custom domain (app.yourdomain.com)
- Real email delivery to customers
- OAuth social login
- Separate staging environment
- Production monitoring

---

## Quick Reference

### What Accounts Do I Need Right Now?

| Phase | Accounts | Tools | Time |
|-------|----------|-------|------|
| **Phase 1** (Local - Anonymous) | GitHub, Convex | Node, git, direnv | 15-20 min |
| **Phase 2** (Local - Magic Links) | (same) | Docker + Mailpit | 10 min |
| **Phase 3** (Hosted Dev) | + Vercel, Resend (test) | (same) | 30-45 min |
| **Phase 4** (Staging/Prod) | + Domain, OAuth apps | (same) | 2-3 hours |

### Environment Variables Quick Reference

**Local Development** (`.env.local` - auto-generated):
```bash
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-dev.convex.cloud
```

**Convex Dev Project** (`npx convex env set`):
```bash
RESEND_API_KEY=re_test_...
RESEND_FROM_EMAIL=auth@yourdomain.com
```

**Vercel Production** (dashboard or CLI):
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-dev.convex.cloud
CONVEX_DEPLOY_KEY=dev:xxxxxxxxxxxxx
```

---

## Troubleshooting by Phase

### Phase 1 Issues

**Problem:** `npx convex dev` fails to connect

**Solutions:**
- Verify you're logged into Convex account
- Check internet connection
- Try `npx convex dev --once` to see detailed error
- Ensure no firewall blocking `*.convex.cloud`

**Problem:** direnv not loading environment

**Solutions:**
```bash
# Re-allow direnv
direnv allow .

# Verify hook is installed
echo $DIRENV_DIFF  # Should show output

# Re-add hook to shell
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
```

---

### Phase 2 Issues

**Problem:** Mailpit not receiving emails

**Solutions:**
```bash
# Verify Mailpit is running
docker ps | grep mailpit

# Restart Mailpit
docker restart mailpit

# Check Mailpit logs
docker logs mailpit

# Verify Mailpit UI
open http://localhost:8025
```

**Problem:** Magic link not working

**Solutions:**
- Check Convex logs: `npx convex logs`
- Verify email sending code uses SMTP (not Resend) for local
- Check magic link URL points to `http://localhost:3000`
- Verify Convex Auth configured correctly

---

### Phase 3 Issues

**Problem:** Vercel build failing

**Solutions:**
- Check Vercel build logs for specific error
- Verify `CONVEX_DEPLOY_KEY` is set correctly
- Ensure build command override: `npx convex deploy --cmd 'npm run build'`
- Test local build: `npm run build`

**Problem:** Resend test emails not showing in dashboard

**Solutions:**
- Verify using test API key (starts with `re_test_`)
- Check Resend dashboard → Emails
- Test emails are logged but NOT delivered
- Verify Convex env var: `npx convex env ls --project dev`

---

## Agent Access (Claude Code)

### What Agents Need

**Phase 1-2 (Local dev):**
- Read/write access to code
- Access to `.env.local` (gitignored, safe locally)
- GitHub CLI authenticated (`gh auth login`)
- Convex CLI access via `.env.local`

**Phase 3 (Hosted dev):**
- Same as above
- Vercel CLI authenticated (optional)
- Can deploy to dev environment only

### What Agents Should NOT Have

For security:
- Production Convex deploy keys
- Production Resend API keys
- Staging/production environment access
- Billing or account settings access

### Agent Setup (One-Time)

```bash
# Human sets up authentication once
gh auth login
vercel login  # Optional

# Agent inherits these credentials
cd /path/to/artifact-review
direnv allow .
npm install

# Agent can now:
npx convex dev  # Uses .env.local
npm run dev     # Starts Next.js
gh pr create    # Creates PRs
```

### Agent Workflow

**Allowed operations:**
```bash
# Development
npx convex dev
npm run dev
npm run build
npm test

# Deploy to dev only
npx convex deploy --project dev

# Git operations
git commit -m "feat: ..."
gh pr create --title "..." --body "..."
```

**Prohibited operations (ask first):**
```bash
npx convex deploy --project staging  # Ask first
npx convex deploy --project prod     # Ask first
npx convex env set ... --project prod # Ask first
git push origin main                  # Use PR process
```

---

## Complete Account Reference

This section contains detailed setup instructions for ALL accounts across ALL environments. **You don't need all of this upfront** - use the JIT phases above instead.

This is reference material for when you're ready for staging/production (Phase 4).

---

### A. GitHub (All Phases)

**Purpose:** Code repository, CI/CD, issue tracking

**Plan:** Free

#### Setup Steps

1. **Create/verify GitHub account**
   - Go to [github.com](https://github.com)
   - Create account or log in
   - Enable 2FA (required for best practices)

2. **Create repository**
   ```bash
   # If new repo
   gh repo create artifact-review --private --source=. --remote=origin

   # If existing, verify
   gh repo view
   ```

3. **Generate Personal Access Token (for CLI)**
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Scopes needed: `repo`, `workflow`, `read:org`
   - Save token securely
   - Authenticate CLI: `gh auth login`

4. **Enable GitHub Actions**
   - Repository → Settings → Actions → General
   - Allow all actions
   - Save

**Verification:**
```bash
gh auth status
gh repo view --web
```

---

### B. Convex (All Phases)

**Purpose:** Backend, database, real-time subscriptions, file storage

**Plan Required:**
- Free for dev
- Professional ($25/month) for production

#### Phase 1-3: Development Project

```bash
# Automatically created when you run:
npx convex dev
# Follow prompts to create "artifact-review-dev"
```

This creates:
- Dev project in Convex dashboard
- `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

#### Phase 4: Staging & Production Projects

**Create projects via dashboard:**

1. **Staging project:**
   - Dashboard → Create New Project → "artifact-review-staging"
   - Region: us-west-2 (or closest to you)
   - Note the deployment URL: `https://[name].convex.cloud`

2. **Production project:**
   - Dashboard → Create New Project → "artifact-review-prod"
   - Same region as staging
   - Note the deployment URL

**Generate Deploy Keys (for Vercel):**

For each project (staging, prod):
- Open project in dashboard
- Settings → Deploy Key
- Generate new key
- Copy and save securely
- Format: `prod:xxxxxxxxxxxxx` or `staging:xxxxxxxxxxxxx`

**Upgrade Production to Professional:**
- Open production project
- Settings → Billing
- Upgrade to Professional ($25/month)
- Add payment method
- Confirm upgrade

**Environment Variables for Phase 4:**

```bash
# Staging
npx convex env set RESEND_API_KEY="re_..." --project staging
npx convex env set RESEND_FROM_EMAIL="auth@staging.yourdomain.com" --project staging
npx convex env set GOOGLE_CLIENT_ID="..." --project staging
npx convex env set GOOGLE_CLIENT_SECRET="..." --project staging
npx convex env set GITHUB_CLIENT_ID="..." --project staging
npx convex env set GITHUB_CLIENT_SECRET="..." --project staging

# Production
npx convex env set RESEND_API_KEY="re_..." --project prod
npx convex env set RESEND_FROM_EMAIL="auth@yourdomain.com" --project prod
npx convex env set GOOGLE_CLIENT_ID="..." --project prod
npx convex env set GOOGLE_CLIENT_SECRET="..." --project prod
npx convex env set GITHUB_CLIENT_ID="..." --project prod
npx convex env set GITHUB_CLIENT_SECRET="..." --project prod
```

**Verification:**
```bash
# Check projects exist
npx convex projects ls

# Check environment variables
npx convex env ls --project dev
npx convex env ls --project staging
npx convex env ls --project prod
```

---

### C. Resend (Phases 3-4)

**Purpose:** Transactional email (magic links, notifications)

**Plan Required:** Free tier (3,000 emails/month) for MVP

#### Phase 3: Test API Key (Hosted Dev)

1. **Create Resend account**
   - Go to [resend.com](https://resend.com)
   - Sign up with email
   - Verify email address

2. **Generate Test API Key**
   - Dashboard → API Keys → Create API Key
   - Name: `artifact-review-test`
   - Type: **Test**
   - Copy key (starts with `re_test_`)

3. **Set in Convex**
   ```bash
   npx convex env set RESEND_API_KEY="re_test_..." --project dev
   npx convex env set RESEND_FROM_EMAIL="auth@yourdomain.com" --project dev
   ```

**What test mode does:**
- Emails logged in Resend dashboard
- NOT actually delivered
- Perfect for hosted dev testing

#### Phase 4: Production Keys & Domain Verification

**Generate Production API Keys:**

1. **Staging key:**
   - Dashboard → API Keys → Create API Key
   - Name: `artifact-review-staging`
   - Type: Production
   - Copy key (starts with `re_`)

2. **Production key:**
   - Dashboard → API Keys → Create API Key
   - Name: `artifact-review-prod`
   - Type: Production
   - Copy key (starts with `re_`)

**Configure Domains (Staging + Production):**

1. **For staging:**
   - Dashboard → Domains → Add Domain
   - Enter: `staging.yourdomain.com`
   - Add DNS records (copy from Resend):
     - SPF record (TXT)
     - DKIM records (CNAME x2-3)
   - Wait for verification (can take up to 48 hours, usually minutes)

2. **For production:**
   - Add Domain: `yourdomain.com`
   - Add DNS records
   - Wait for verification

**Set up sender addresses:**
- Verified domains → Select domain
- From addresses: `auth@yourdomain.com`
- Click "Add from address"

**Set in Convex:**
```bash
# Staging
npx convex env set RESEND_API_KEY="re_..." --project staging
npx convex env set RESEND_FROM_EMAIL="auth@staging.yourdomain.com" --project staging
npx convex env set RESEND_ALLOWED_RECIPIENTS="qa@example.com,test@example.com" --project staging

# Production
npx convex env set RESEND_API_KEY="re_..." --project prod
npx convex env set RESEND_FROM_EMAIL="auth@yourdomain.com" --project prod
```

**Verification:**
```bash
# Check Resend dashboard
open https://resend.com/emails

# Verify domains are confirmed (staging + prod)
# Should see green checkmark next to domain names
```

---

### D. Vercel (Phases 3-4)

**Purpose:** Frontend deployment, preview environments, build orchestration

**Plan Required:**
- Free tier for Phase 3
- Pro ($20/month) for commercial use (Phase 4)

#### Phase 3: Initial Setup

1. **Create Vercel account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended)
   - Authorize GitHub access

2. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   ```

3. **Link project**
   ```bash
   cd /path/to/artifact-review
   vercel link
   # Follow prompts to create new project
   ```

4. **Configure Git branch deployments**
   - Vercel Dashboard → Project Settings → Git
   - Production Branch: `main`
   - Enable automatic deployments

5. **Override Build Command**
   - Project Settings → General → Build & Development Settings
   - Build Command: `npx convex deploy --cmd 'npm run build'`
   - Save

6. **Set Environment Variables**

   Via dashboard (Project Settings → Environment Variables):
   ```
   NEXT_PUBLIC_CONVEX_URL = https://your-dev.convex.cloud
   CONVEX_DEPLOY_KEY = dev:xxxxxxxxxxxxx
   ```

   Or via CLI:
   ```bash
   vercel env add NEXT_PUBLIC_CONVEX_URL production
   vercel env add CONVEX_DEPLOY_KEY production
   ```

#### Phase 4: Production Setup

1. **Upgrade to Pro plan**
   - Account Settings → Billing
   - Upgrade to Pro ($20/month)
   - Add payment method

2. **Create Convex production project** (see Convex section above)

3. **Update Vercel environment variables**
   ```
   NEXT_PUBLIC_CONVEX_URL = https://your-prod.convex.cloud
   CONVEX_DEPLOY_KEY = prod:xxxxxxxxxxxxx
   ```

4. **Add custom domain** (see Domain section below)

**Verification:**
```bash
# Deploy to production
git push origin main

# Check deployment
vercel --prod

# Visit site
open https://artifact-review.vercel.app
```

---

### E. Domain Registrar (Phase 4 Only)

**Purpose:** Domain registration and DNS management

**Plan Required:** Domain registration fee (~$10-20/year)

**Note:** Only needed for custom domains. Can skip for MVP and use Vercel's free domains.

#### Setup Steps

1. **Register domain** (if not already owned)
   - Go to [namecheap.com](https://namecheap.com)
   - Search for domain (e.g., `artifactreview.com`)
   - Purchase domain
   - Enable WhoisGuard (privacy protection)

2. **Configure DNS for Vercel**

   **Option A: Point to Vercel directly**
   - Namecheap dashboard → Domain List → Manage
   - Advanced DNS
   - Add records:
     ```
     Type: CNAME
     Host: app
     Value: cname.vercel-dns.com
     TTL: Automatic

     Type: CNAME
     Host: staging
     Value: cname.vercel-dns.com
     TTL: Automatic
     ```

   **Option B: Use Vercel nameservers (recommended)**
   - Vercel Dashboard → Project → Settings → Domains
   - Add domain → Follow instructions
   - Copy Vercel nameservers
   - Namecheap → Domain List → Manage → Nameservers
   - Select "Custom DNS" → Paste Vercel nameservers
   - Save

3. **Add domains in Vercel**
   - Vercel → Project → Settings → Domains
   - Add `app.yourdomain.com` → Production
   - Add `staging.yourdomain.com` → Staging (use `staging` branch)
   - Wait for DNS propagation (5 mins - 48 hours, usually < 1 hour)

4. **Configure DNS for Resend email**
   - Add records from Resend dashboard (see Resend section above)
   - SPF (TXT record for root domain)
   - DKIM (CNAME records for subdomains)

**Verification:**
```bash
# Check DNS propagation
dig app.yourdomain.com
# Should resolve to Vercel IP

# Check SSL
curl -I https://app.yourdomain.com
# Should return 200 OK with valid SSL

# Check Resend DNS
dig TXT yourdomain.com | grep spf
dig CNAME resend._domainkey.yourdomain.com
```

---

### F. OAuth Providers (Phase 4 Only)

**Purpose:** Social login for document creators

**Plan Required:** Free

#### Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project: "Artifact Review"
   - Select project

2. **Enable Google+ API**
   - APIs & Services → Library
   - Search "Google+ API"
   - Enable

3. **Create OAuth Credentials (Dev)**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: `Artifact Review Dev`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://dev.yourdomain.com/api/auth/callback/google`
   - Create
   - Copy Client ID and Client Secret

4. **Create OAuth Credentials (Staging)**
   - Repeat with redirect URI: `https://staging.yourdomain.com/api/auth/callback/google`

5. **Create OAuth Credentials (Production)**
   - Repeat with redirect URI: `https://app.yourdomain.com/api/auth/callback/google`

#### GitHub OAuth Setup

1. **Create GitHub OAuth App (Dev)**
   - GitHub → Settings → Developer settings → OAuth Apps
   - New OAuth App
   - Application name: `Artifact Review Dev`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Register application
   - Generate client secret
   - Copy Client ID and Client Secret

2. **Create GitHub OAuth App (Staging)**
   - Repeat with:
     - Name: `Artifact Review Staging`
     - Homepage: `https://staging.yourdomain.com`
     - Callback: `https://staging.yourdomain.com/api/auth/callback/github`

3. **Create GitHub OAuth App (Production)**
   - Repeat with:
     - Name: `Artifact Review Prod`
     - Homepage: `https://app.yourdomain.com`
     - Callback: `https://app.yourdomain.com/api/auth/callback/github`

**Set in Convex:**

```bash
# Dev
npx convex env set GOOGLE_CLIENT_ID="..." --project dev
npx convex env set GOOGLE_CLIENT_SECRET="..." --project dev
npx convex env set GITHUB_CLIENT_ID="..." --project dev
npx convex env set GITHUB_CLIENT_SECRET="..." --project dev

# Staging
npx convex env set GOOGLE_CLIENT_ID="..." --project staging
npx convex env set GOOGLE_CLIENT_SECRET="..." --project staging
npx convex env set GITHUB_CLIENT_ID="..." --project staging
npx convex env set GITHUB_CLIENT_SECRET="..." --project staging

# Production
npx convex env set GOOGLE_CLIENT_ID="..." --project prod
npx convex env set GOOGLE_CLIENT_SECRET="..." --project prod
npx convex env set GITHUB_CLIENT_ID="..." --project prod
npx convex env set GITHUB_CLIENT_SECRET="..." --project prod
```

**Verification:**
```bash
# Check Convex dashboard → project → Settings → Environment Variables
# Should see OAuth credentials listed (secrets hidden)

# Test OAuth flow (after Convex Auth is implemented)
# Click "Sign in with Google" - should redirect and authenticate
```

---

### G. Local Development Tools (Phases 1-2)

**Purpose:** Email testing, environment management

**Plan Required:** Free (open source tools)

#### Mailpit (Email Testing) - Phase 2

**Setup:**
```bash
# Start Mailpit via Docker
docker run -d \
  --name mailpit \
  -p 1025:1025 \
  -p 8025:8025 \
  --restart unless-stopped \
  axllent/mailpit

# Verify it's running
docker ps | grep mailpit

# Open web UI
open http://localhost:8025
```

**What it does:**
- Captures all SMTP emails sent to `localhost:1025`
- Displays them in web UI at `http://localhost:8025`
- No emails actually delivered (perfect for local dev)

**Verification:**
```bash
# Check Mailpit UI
curl http://localhost:8025
# Should return HTML (Mailpit UI)

# Test email send (after Convex auth configured)
# Send magic link locally → should appear in Mailpit UI
```

#### direnv (Environment Management) - Phase 1

**Setup:**
```bash
# Install direnv (macOS)
brew install direnv

# Add to shell (zsh)
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc

# Configure for project
cd /path/to/artifact-review
direnv allow .
```

**Verification:**
```bash
cd /path/to/artifact-review
# Should see: direnv: loading ...

# Check environment
env | grep CONVEX
# Should show CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL
```

---

## Security Checklist

Before going to production, verify:

- [ ] All production secrets stored securely (password manager)
- [ ] No secrets committed to git
- [ ] `.env.local` is gitignored
- [ ] Production and dev credentials are separate
- [ ] 2FA enabled on all accounts
- [ ] OAuth apps use HTTPS redirect URLs
- [ ] Resend domain verified with SPF/DKIM
- [ ] Vercel environment variables set correctly
- [ ] Agent access limited to dev environment
- [ ] GitHub branch protection rules enabled for `main`
- [ ] Production deployments require approval

---

## Cost Summary

| Service | Phase 1-2 | Phase 3 | Phase 4 |
|---------|-----------|---------|---------|
| **GitHub** | Free | Free | Free |
| **Convex** | Free | Free | $25/month (prod only) |
| **Resend** | N/A | Free | Free → $20/month |
| **Vercel** | N/A | Free | $20/month |
| **Domain** | N/A | N/A | $10-20/year |
| **Total/month** | **$0** | **$0** | **$45-65** |

---

## References

### Documentation
- [ADR 0001: Authentication Provider](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/architecture/decisions/0001-authentication-provider.md)
- [ADR 0003: Deployment & Hosting](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/architecture/decisions/0003-deployment-hosting-strategy.md)
- [ADR 0004: Email Strategy](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/architecture/decisions/0004-email-strategy.md)
- [ADR 0006: Frontend Stack](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/architecture/decisions/0006-frontend-stack.md)
- [Deployment Environments](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/architecture/deployment-environments.md)
- [Task 00006: Local Dev Environment](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/tasks/00006-local-dev-environment/README.md)

### External Resources
- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub CLI](https://cli.github.com)
- [direnv](https://direnv.net)
- [Mailpit](https://mailpit.axllent.org)
