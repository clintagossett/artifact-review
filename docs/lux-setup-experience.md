# Agent Lux Setup Experience Report

**Date:** 2026-02-04
**Agent:** lux
**Starting Point:** Fresh clone on `lux/dev-work` branch
**Final Result:** 18/20 e2e tests passing (2 skipped)

This document captures all issues encountered during initial environment setup and how they were resolved. The goal is to improve the agent onboarding process.

---

## Executive Summary

The setup process required several manual interventions beyond running `./scripts/agent-init.sh`. Key issues fell into four categories:

1. **Env file syntax errors** - Unquoted values with special characters broke bash sourcing
2. **Convex env sync failures** - The sync script failed silently, requiring manual variable setting
3. **Missing generated test files** - Test samples requiring ffmpeg weren't pre-generated
4. **Placeholder values not replaced** - Some placeholders required manual replacement

**Time to first successful test run:** ~15 minutes of troubleshooting after initial script run

---

## Issue 1: Env File Bash Syntax Errors

### Problem

After `agent-init.sh` completed, the `.env.convex.local` file contained unquoted values with special characters:

```bash
# BROKEN - causes bash syntax error when sourced
EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>
EMAIL_FROM_NOTIFICATIONS=Artifact Review <notify@yourdomain.com>
```

When any script tried to `source .env.convex.local`, it failed with:
```
.env.convex.local: line 32: syntax error near unexpected token `newline'
.env.convex.local: line 32: `EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>'
```

### Root Cause

The `app/.env.convex.local.example` template has unquoted values:
```bash
EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>
```

When copied to `.env.convex.local`, these values break bash sourcing because:
- Spaces require quoting
- Angle brackets `<>` are interpreted as redirection operators

### Fix Applied

Manually edited `.env.convex.local` to quote the values:

```bash
# FIXED - properly quoted for bash
EMAIL_FROM_AUTH="Artifact Review <auth@lux.loc>"
EMAIL_FROM_NOTIFICATIONS="Artifact Review <notify@lux.loc>"
```

### Recommended Permanent Fix

Update `app/.env.convex.local.example`:
```bash
# Before (broken)
EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>

# After (works)
EMAIL_FROM_AUTH="Artifact Review <auth@yourdomain.com>"
```

Also update `agent-init.sh` to either:
1. Quote these values when generating the file
2. Use the agent name in the email domain: `"Artifact Review <auth@${AGENT_NAME}.loc>"`

---

## Issue 2: Convex Environment Sync Failures

### Problem

Running `./scripts/setup-convex-env.sh --sync` repeatedly failed silently. The `--check` output showed all passthrough variables as "(not set in Convex)":

```
--- Passthrough vars (from .env.convex.local) ---
[red] RESEND_API_KEY: (not set in Convex)
[red] EMAIL_FROM_AUTH: (not set in Convex)
[red] NOVU_SECRET_KEY: (not set in Convex)
[red] STRIPE_SECRET_KEY: (not set in Convex)
... etc
```

### Root Cause

The sync script sources `.env.convex.local` to read variable values. Due to Issue 1 (unquoted values), the source command failed, so no variables were read or synced.

The script's error handling didn't surface this failure clearly - it appeared to run but set nothing.

### Fix Applied

After fixing the env file syntax (Issue 1), manually ran each `npx convex env set` command:

```bash
cd app
source ../.env.docker.local

npx convex env set --env-file .env.nextjs.local -- RESEND_API_KEY "re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW"
npx convex env set --env-file .env.nextjs.local -- EMAIL_FROM_AUTH "Artifact Review <auth@lux.loc>"
npx convex env set --env-file .env.nextjs.local -- EMAIL_FROM_NOTIFICATIONS "Artifact Review <notify@lux.loc>"
npx convex env set --env-file .env.nextjs.local -- NOVU_SECRET_KEY "1036927102dfe822c1b88001871c2a15"
npx convex env set --env-file .env.nextjs.local -- NOVU_API_URL "https://api.novu.loc"
npx convex env set --env-file .env.nextjs.local -- STRIPE_SECRET_KEY "rk_test_..."
npx convex env set --env-file .env.nextjs.local -- STRIPE_WEBHOOK_SECRET "whsec_..."
npx convex env set --env-file .env.nextjs.local -- STRIPE_PRICE_ID_PRO "price_..."
npx convex env set --env-file .env.nextjs.local -- STRIPE_PRICE_ID_PRO_ANNUAL "price_..."
npx convex env set --env-file .env.nextjs.local -- INTERNAL_API_KEY "f10561d406e511eb4fe3c2e8395ec04d47359b05856c0506e7abc05495c8036c"
```

### Recommended Permanent Fix

1. **Add validation in setup-convex-env.sh:**
   ```bash
   # Before sourcing, validate the file can be sourced
   if ! bash -n "$convex_env_file" 2>/dev/null; then
       echo -e "${RED}ERROR: $convex_env_file has syntax errors${NC}"
       echo "Check for unquoted values with spaces or special characters"
       exit 1
   fi
   ```

2. **Show clearer error messages** when sync fails - currently it silently continues

3. **Fix the example file** (see Issue 1) so this doesn't happen in the first place

---

## Issue 3: Missing Generated Test Samples

### Problem

E2E tests failed with:
```
Error: ENOENT: no such file or directory, stat
'/home/.../samples/04-invalid/wrong-type/presentation-with-video.zip'
```

Two tests depended on this file:
- `Shows error state for ZIP with forbidden file types`
- `visual: ZIP error state display`

### Root Cause

The file `presentation-with-video.zip` must be **generated** by running a script. It contains real video files created by ffmpeg and is gitignored (too large to commit).

This is documented in `samples/README.md` but:
1. `agent-init.sh` doesn't generate these files
2. There's no check or warning during test runs
3. Easy to miss in documentation

### Fix Applied

```bash
cd samples/04-invalid/wrong-type
./generate.sh
```

Output confirmed the file was created:
```
✅ presentation-with-video.zip created
Total ZIP size: 110KB (well under 100MB limit)

Contents:
  ✅ index.html (valid HTML with video tags)
  ✅ styles.css (valid CSS)
  ❌ media/demo.mov (67KB - REAL QuickTime video - FORBIDDEN)
  ❌ media/intro.mp4 (42KB - REAL MP4 video - FORBIDDEN)
  ❌ media/outro.avi (28KB - REAL AVI video - FORBIDDEN)
```

### Recommended Permanent Fix

**Option A: Add to agent-init.sh**
```bash
# Generate test samples that require external tools
echo "Generating test samples..."
if command -v ffmpeg &> /dev/null; then
    (cd samples/04-invalid/wrong-type && ./generate.sh)
    (cd samples/04-invalid/too-large && ./generate.sh)
else
    echo "⚠️  ffmpeg not found - some e2e tests will fail"
    echo "   Install ffmpeg and run: cd samples/04-invalid/wrong-type && ./generate.sh"
fi
```

**Option B: Check before running tests**
Add to the test setup or a pre-test script:
```bash
if [ ! -f "samples/04-invalid/wrong-type/presentation-with-video.zip" ]; then
    echo "ERROR: Missing test sample. Run: cd samples/04-invalid/wrong-type && ./generate.sh"
    exit 1
fi
```

**Option C: Skip tests gracefully**
Modify the tests to skip with a clear message if the file doesn't exist.

---

## Issue 4: Placeholder Values Not Replaced

### Problem

Several placeholder values in generated env files weren't replaced with actual values:

#### 4a. INTERNAL_API_KEY placeholder
```bash
# In .env.convex.local - still had placeholder
INTERNAL_API_KEY=your-random-secret-key-here
```

#### 4b. NODE_EXTRA_CA_CERTS path placeholder
```bash
# In .env.nextjs.local - had placeholder username
NODE_EXTRA_CA_CERTS=/home/YOUR_USERNAME/.local/share/mkcert/rootCA.pem
```

### Root Cause

The `agent-init.sh` script:
1. Generates `INTERNAL_API_KEY` but only sets it in Convex, not in the local env file
2. Detects mkcert CA path but doesn't update `.env.nextjs.local`

### Fix Applied

```bash
# Generate and set INTERNAL_API_KEY
INTERNAL_KEY=$(openssl rand -hex 32)
sed -i "s/INTERNAL_API_KEY=your-random-secret-key-here/INTERNAL_API_KEY=$INTERNAL_KEY/" app/.env.convex.local

# Fix NODE_EXTRA_CA_CERTS path
MKCERT_CA=$(mkcert -CAROOT)/rootCA.pem
# Updated .env.nextjs.local manually
```

### Recommended Permanent Fix

In `agent-init.sh`, after generating env files:

```bash
# Generate INTERNAL_API_KEY if still placeholder
if grep -q "your-random-secret-key-here" "$APP_DIR/.env.convex.local"; then
    INTERNAL_KEY=$(openssl rand -hex 32)
    sed -i "s/INTERNAL_API_KEY=your-random-secret-key-here/INTERNAL_API_KEY=$INTERNAL_KEY/" "$APP_DIR/.env.convex.local"
    echo "✅ Generated INTERNAL_API_KEY"
fi

# Fix NODE_EXTRA_CA_CERTS path
MKCERT_CA_PATH=$(mkcert -CAROOT 2>/dev/null)/rootCA.pem
if [ -f "$MKCERT_CA_PATH" ]; then
    sed -i "s|NODE_EXTRA_CA_CERTS=.*|NODE_EXTRA_CA_CERTS=$MKCERT_CA_PATH|" "$APP_DIR/.env.nextjs.local"
    echo "✅ Set NODE_EXTRA_CA_CERTS to $MKCERT_CA_PATH"
fi
```

---

## Issue 5: Novu Organization Not Configured

### Problem

After `agent-init.sh`, Novu-related env vars were empty:
```bash
NOVU_SECRET_KEY=
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=
```

E2E tests that depended on notifications showed warnings:
```
NOVU_SECRET_KEY not set, skipping API validation
```

### Root Cause

The `agent-init.sh` script **did** attempt to run `setup-novu-org.sh`, but during my run the Novu API wasn't responding initially (container still starting). The script showed:
```
⚠️  Novu API not responding (may need a moment to start)
```

It didn't retry or wait for Novu to be ready.

### Fix Applied

Manually ran the Novu setup after containers were fully up:
```bash
./scripts/setup-novu-org.sh
```

Output:
```
✅ User registered successfully
✅ Organization created successfully (ID: 69816bb798b5753283cc6ada)
✅ API keys retrieved successfully

NOVU_SECRET_KEY=1036927102dfe822c1b88001871c2a15
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=VztZ5oOJ-M5l
```

### Recommended Permanent Fix

In `agent-init.sh`, add retry logic for Novu setup:

```bash
echo "Setting up Novu organization..."
MAX_RETRIES=5
for i in $(seq 1 $MAX_RETRIES); do
    if ./scripts/setup-novu-org.sh; then
        break
    fi
    if [ $i -lt $MAX_RETRIES ]; then
        echo "Novu not ready, retrying in 5s... ($i/$MAX_RETRIES)"
        sleep 5
    else
        echo "⚠️  Novu setup failed after $MAX_RETRIES attempts"
        echo "   Run manually later: ./scripts/setup-novu-org.sh"
    fi
done
```

---

## Complete Setup Sequence That Worked

For reference, here's the full sequence that resulted in a working environment:

```bash
# 1. Run the init script (gets most things set up)
./scripts/agent-init.sh

# 2. Fix env file syntax errors
# Edit app/.env.convex.local - quote EMAIL_FROM_* values
vim app/.env.convex.local
# Change: EMAIL_FROM_AUTH=Artifact Review <auth@yourdomain.com>
# To:     EMAIL_FROM_AUTH="Artifact Review <auth@lux.loc>"

# 3. Generate INTERNAL_API_KEY
INTERNAL_KEY=$(openssl rand -hex 32)
sed -i "s/INTERNAL_API_KEY=your-random-secret-key-here/INTERNAL_API_KEY=$INTERNAL_KEY/" app/.env.convex.local

# 4. Fix mkcert CA path in .env.nextjs.local
MKCERT_PATH=$(mkcert -CAROOT)/rootCA.pem
sed -i "s|NODE_EXTRA_CA_CERTS=.*|NODE_EXTRA_CA_CERTS=$MKCERT_PATH|" app/.env.nextjs.local

# 5. Set up Novu (if it failed during init)
./scripts/setup-novu-org.sh

# 6. Sync all Convex environment variables manually
cd app
source ../.env.docker.local
npx convex env set --env-file .env.nextjs.local -- RESEND_API_KEY "$(grep RESEND_API_KEY ../.env.convex.local | cut -d= -f2)"
# ... repeat for all variables (see Issue 2)

# 7. Generate missing test samples
cd ../samples/04-invalid/wrong-type
./generate.sh

# 8. Restart dev servers to pick up changes
cd ../..
./scripts/start-dev-servers.sh --restart

# 9. Run tests
cd app
npm run test:e2e
```

---

## Recommendations Summary

| Issue | Quick Fix | Permanent Fix |
|-------|-----------|---------------|
| Unquoted env values | Quote manually | Fix .example template |
| Convex sync fails silently | Run npx commands manually | Add validation + better errors |
| Missing test samples | Run generate.sh | Add to agent-init.sh |
| INTERNAL_API_KEY placeholder | Generate with openssl | Auto-generate in agent-init.sh |
| NODE_EXTRA_CA_CERTS path | Set manually | Auto-detect in agent-init.sh |
| Novu not ready | Run setup-novu-org.sh later | Add retry logic |

---

## Files That Need Updates

1. **`app/.env.convex.local.example`** - Quote EMAIL_FROM_* values
2. **`app/.env.nextjs.local.example`** - Use actual path detection hint
3. **`scripts/agent-init.sh`** - Add:
   - INTERNAL_API_KEY generation
   - NODE_EXTRA_CA_CERTS auto-detection
   - Test sample generation (with ffmpeg check)
   - Novu setup retry logic
4. **`scripts/setup-convex-env.sh`** - Add:
   - Syntax validation before sourcing env files
   - Clearer error messages on sync failure

---

## Appendix: Test Results

### First Run (16 failures)
- Most failures due to missing Convex env vars (auth, email not working)
- Stripe test failed (no STRIPE_SECRET_KEY)
- Notification tests failed (no NOVU_SECRET_KEY)

### Second Run (3 failures)
After fixing env vars and restarting:
- 2 failures: Missing `presentation-with-video.zip`
- 1 failure: Notification timing issue (flaky)

### Final Run (0 failures)
After generating test samples:
- 18 passed
- 2 skipped (expected - browser-specific visual tests)
