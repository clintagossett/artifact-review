# Vercel Deployment Debugging Guide

**Purpose:** Step-by-step guide for debugging failed Vercel deployments using CLI and API.

**Last Updated:** 2026-02-02

---

## Quick Reference

### Vercel Token Location
```bash
# Shared token for all agents
/home/clint-gossett/Documents/artifact-review-dev/.env.dev.local
# Variable: VERCEL_TOKEN
```

### Project Information
- **Project Name:** `artifact-review`
- **Organization:** `clint-1541s-projects`
- **Team ID:** `team_dD61vKrjrHtvbXe8o2ZmgjUS`
- **Project ID:** `prj_doBLCY9dhFFnLAQ1xLpnniJExLNo`
- **Production URL:** https://artifactreview-early.xyz
- **Deploys from:** `dev` branch (auto-deploy on push)

---

## Prerequisites

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Load Token

The Vercel token is stored in the parent `.env.dev.local`:

```bash
source /home/clint-gossett/Documents/artifact-review-dev/.env.dev.local
echo $VERCEL_TOKEN  # Verify it's loaded
```

### 3. Link Project (One-Time Setup)

```bash
cd /home/clint-gossett/Documents/artifact-review-dev/artifact-review
vercel link --token "$VERCEL_TOKEN" --yes --project artifact-review --scope clint-1541s-projects
```

This creates `.vercel/project.json` with project IDs.

---

## Debugging Workflow

### Step 1: List Recent Deployments

**Using CLI:**
```bash
cd /home/clint-gossett/Documents/artifact-review-dev/artifact-review
source /home/clint-gossett/Documents/artifact-review-dev/.env.dev.local
vercel --token "$VERCEL_TOKEN" ls artifact-review --yes
```

**Using API (More Reliable):**
```bash
source /home/clint-gossett/Documents/artifact-review-dev/.env.dev.local
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_doBLCY9dhFFnLAQ1xLpnniJExLNo&limit=10&teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  | jq -r '.deployments[] | "[\(.created | tonumber / 1000 | strftime("%Y-%m-%d %H:%M:%S"))] \(.state) - \(.target) - Commit: \(.meta.githubCommitSha[:7])"'
```

**Output shows:**
- Deployment timestamp
- State: `BUILDING`, `READY`, `ERROR`, `CANCELED`
- Target: `PRODUCTION`, `PREVIEW`
- Git commit SHA

**Look for:**
- Recent `ERROR` state deployments
- Pattern of failures (all failing vs intermittent)
- When failures started (compare commit SHAs with working deployments)

---

### Step 2: Get Deployment Details

**Find the deployment ID** from the failing deployment (format: `dpl_XXXXX`).

**Using CLI:**
```bash
vercel inspect <deployment-url> --token "$VERCEL_TOKEN"
```

**Using API:**
```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v2/deployments/<deployment-id>?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  | jq '.'
```

---

### Step 3: Get Build Logs (CRITICAL)

This is where you'll find the actual error message.

**Using API (Recommended - More Complete):**

```bash
# Get all build events
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v2/deployments/<deployment-id>/events?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS&limit=200" \
  | jq -r '.[] | "\(.created) [\(.type)] \(.payload.text)"' \
  | tail -100
```

**Common log patterns:**

1. **Find errors only:**
```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v2/deployments/<deployment-id>/events?teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS&limit=200" \
  | jq -r '.[] | select(.type == "stderr" or .type == "error-event") | .payload.text'
```

2. **Search for specific error:**
```bash
# ... | grep -i "error\|failed\|type error"
```

3. **Get last 50 log entries:**
```bash
# ... | tail -50
```

---

### Step 4: Identify the Error

**Common failure points:**

1. **npm install fails** → Dependency issue
2. **Convex deploy fails** → Backend deployment error (schema mismatch, env vars)
3. **TypeScript compilation fails** → Type errors in code
4. **Build command fails** → Next.js build error

**Example error (TypeScript):**
```
Failed to compile.

./src/app/api/novu/workflows/comment-workflow.ts:177:47
Type error: Argument of type 'X' is not assignable to parameter of type 'Y'
```

**Action:** Note the file path, line number, and exact error message.

---

### Step 5: Reproduce Locally

**CRITICAL:** Always verify the fix builds locally before pushing.

```bash
cd app/

# Run linting
npm run lint

# Run production build (this is what Vercel runs)
npm run build
```

**Why this matters:**
- Catches type errors before pushing
- Verifies all imports resolve
- Ensures environment variables are set correctly
- Saves Vercel build minutes and time

---

### Step 6: Fix and Verify

1. **Fix the error** in your code
2. **Run `npm run build` again** to verify it passes
3. **Commit the fix**
4. **Push to your dev branch**
5. **Monitor the new deployment**

**Monitor deployment:**
```bash
# Watch deployment status
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_doBLCY9dhFFnLAQ1xLpnniJExLNo&limit=1&teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS" \
  | jq -r '.deployments[0] | "State: \(.state) | Ready: \(.ready) | Commit: \(.meta.githubCommitSha[:7])"'
```

---

## Common Issues and Solutions

### Issue 1: All Deployments Failing with Same Error

**Symptom:** Every deployment shows `ERROR` state, same error in logs.

**Likely Cause:** Code error introduced in recent commit.

**Solution:**
1. Find the last working commit (check deployment list)
2. `git log <working-commit>..<failing-commit>` to see what changed
3. Review those changes for the error
4. Fix and verify with `npm run build` locally

**Example from Feb 2, 2026:**
- All deployments failing since commit `4a69c2f`
- Error: TypeScript type mismatch in `comment-workflow.ts`
- Fix: Added type assertion `as CommentPayload`

---

### Issue 2: Environment Variables Missing

**Symptom:** Build logs show:
```
Error: NEXT_PUBLIC_CONVEX_URL is not defined
```

**Solution:**
```bash
# Check what's set in Vercel
vercel env ls --token "$VERCEL_TOKEN"

# Compare with required vars in docs/ENVIRONMENT_VARIABLES.md
```

**Add missing variable:**
```bash
vercel env add VARIABLE_NAME --token "$VERCEL_TOKEN"
# Or use Vercel dashboard: Project Settings → Environment Variables
```

---

### Issue 3: Convex Deploy Fails

**Symptom:** Build logs show:
```
✖ 'npx convex deploy' failed
Error: Schema validation failed
```

**Causes:**
- Schema changes incompatible with existing data
- `CONVEX_DEPLOY_KEY` expired or wrong
- Convex backend unreachable

**Solution:**
1. Check `CONVEX_DEPLOY_KEY` in Vercel environment variables
2. Test Convex deploy locally: `cd app && npx convex deploy --project dev`
3. Review schema changes for breaking changes
4. Use multi-step migration if needed (see ADR 0003)

---

### Issue 4: Build Times Out

**Symptom:** Deployment shows `CANCELED` or times out after 15+ minutes.

**Causes:**
- Infinite loop in build process
- Extremely large dependencies
- Convex deploy hanging

**Solution:**
1. Check build logs for where it hangs
2. Verify build completes locally
3. Check Convex backend is accessible
4. Increase build timeout in Vercel settings (if justified)

---

## API Reference

### Authentication

All API requests need the Authorization header:
```bash
-H "Authorization: Bearer $VERCEL_TOKEN"
```

**Note:** The token value must be passed directly, not via shell variable expansion in the header string.

### Useful Endpoints

**List deployments:**
```
GET https://api.vercel.com/v6/deployments
Query params:
  - projectId: prj_doBLCY9dhFFnLAQ1xLpnniJExLNo
  - teamId: team_dD61vKrjrHtvbXe8o2ZmgjUS
  - limit: 10 (default)
```

**Get deployment details:**
```
GET https://api.vercel.com/v2/deployments/{deploymentId}
Query params:
  - teamId: team_dD61vKrjrHtvbXe8o2ZmgjUS
```

**Get deployment logs/events:**
```
GET https://api.vercel.com/v2/deployments/{deploymentId}/events
Query params:
  - teamId: team_dD61vKrjrHtvbXe8o2ZmgjUS
  - limit: 200 (get more logs)
```

**Get project info:**
```
GET https://api.vercel.com/v9/projects/{projectId}
Query params:
  - teamId: team_dD61vKrjrHtvbXe8o2ZmgjUS
```

**List environment variables:**
```
GET https://api.vercel.com/v9/projects/{projectId}/env
Query params:
  - teamId: team_dD61vKrjrHtvbXe8o2ZmgjUS
```

### Response Formats

**Deployment object:**
```json
{
  "uid": "dpl_XXXXX",
  "name": "artifact-review",
  "url": "artifact-review-xxx.vercel.app",
  "state": "READY" | "ERROR" | "BUILDING" | "CANCELED",
  "ready": 1770095327867,
  "target": "PRODUCTION" | "PREVIEW",
  "meta": {
    "githubCommitSha": "b3525f8...",
    "githubCommitMessage": "fix: ..."
  }
}
```

**Event object:**
```json
{
  "type": "stdout" | "stderr" | "error-event",
  "created": 1770093551612,
  "payload": {
    "text": "Log message here",
    "deploymentId": "dpl_XXXXX"
  }
}
```

---

## Troubleshooting Script

Save this as `scripts/debug-vercel-deployment.sh`:

```bash
#!/bin/bash
# Debug Vercel deployment
# Usage: ./scripts/debug-vercel-deployment.sh [deployment-id]

set -e

# Load token
source /home/clint-gossett/Documents/artifact-review-dev/.env.dev.local

DEPLOYMENT_ID="${1}"
PROJECT_ID="prj_doBLCY9dhFFnLAQ1xLpnniJExLNo"
TEAM_ID="team_dD61vKrjrHtvbXe8o2ZmgjUS"

if [ -z "$DEPLOYMENT_ID" ]; then
    echo "Getting recent deployments..."
    curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=5&teamId=$TEAM_ID" \
        | jq -r '.deployments[] | "[\(.created | tonumber / 1000 | strftime("%Y-%m-%d %H:%M:%S"))] \(.state) - Commit: \(.meta.githubCommitSha[:7]) - ID: \(.uid)"'
    echo ""
    echo "Usage: $0 <deployment-id>"
    exit 1
fi

echo "Fetching logs for deployment: $DEPLOYMENT_ID"
echo "=================================================="

curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v2/deployments/$DEPLOYMENT_ID/events?teamId=$TEAM_ID&limit=200" \
    | jq -r '.[] | "\(.created) [\(.type)] \(.payload.text)"' \
    | grep -i "error\|failed\|warning" --color=always || echo "No errors found in logs"
```

---

## Checklist: Before Pushing a Fix

- [ ] Run `npm run lint` - passes without errors
- [ ] Run `npm run build` - completes successfully
- [ ] Commit with descriptive message
- [ ] Push to dev branch
- [ ] Monitor deployment (check after 2-3 minutes)
- [ ] Verify deployment shows `READY` state
- [ ] Test the deployed site works

---

## Real-World Example: Feb 2, 2026

**Problem:** All deployments failing since morning.

**Process:**
1. Listed recent deployments → All showing `ERROR` since commit `4a69c2f`
2. Got build logs for most recent failure → TypeScript error at line 177
3. Identified error: Type mismatch in `digest.events.map()`
4. First fix attempt: Added `.map(e => e.payload)` → Still failed (type inference issue)
5. Ran local build → Caught that TypeScript needed explicit type
6. Second fix: Added type assertion `as CommentPayload` → Local build passed ✅
7. Pushed corrected fix → Deployment succeeded ✅

**Key Learning:** Always run `npm run build` locally to catch type errors before pushing.

**Files involved:**
- `app/src/app/api/novu/workflows/comment-workflow.ts:174`
- Error: Union type not compatible with function parameter
- Fix: `digest.events.map(e => e.payload as CommentPayload)`

---

## See Also

- [Vercel Deployments API](https://vercel.com/docs/rest-api/endpoints/deployments)
- [docs/architecture/deployment-environments.md](../architecture/deployment-environments.md) - Deployment strategy
- [docs/ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - Required env vars
- [app/vercel.json](../../app/vercel.json) - Build configuration
