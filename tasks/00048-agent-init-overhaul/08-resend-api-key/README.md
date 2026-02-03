# Subtask 08: Add RESEND_API_KEY to setup-convex-env.sh

**Status:** ✅ Complete
**TDD Phase:** GREEN (all tests passing)

## Objective

Ensure the Resend API key is properly read from `app/.env.nextjs.local` and synced to Convex environment variables using the `setup-convex-env.sh` script.

## Implementation Summary

Added `RESEND_API_KEY` to the `PASSTHROUGH_VARS` array in `scripts/setup-convex-env.sh`. This enables automatic synchronization of the Resend API key from local environment files to the Convex backend.

## Changes Made

### Modified Files

1. **scripts/setup-convex-env.sh** (1 line changed)
   - Added `"RESEND_API_KEY"` to the `PASSTHROUGH_VARS` array on line 61
   - No other changes needed - the existing passthrough mechanism handles all the logic

## Test Results

All 8 unit tests passing:

- ✅ TC01: RESEND_API_KEY in PASSTHROUGH_VARS array
- ✅ TC02: Read RESEND_API_KEY from .env.nextjs.local
- ✅ TC03: Handle missing RESEND_API_KEY gracefully
- ✅ TC04: Check mode displays RESEND_API_KEY
- ✅ TC05: Check mode shows 'not set' when missing
- ✅ TC06: Handle special characters in API key
- ✅ TC07: Idempotency - setting same value twice
- ✅ TC08: Truncate long values in check mode

## How It Works

The `PASSTHROUGH_VARS` mechanism in `setup-convex-env.sh`:

1. Reads variables from `app/.env.nextjs.local` (or fallback to `app/.env.local`)
2. For each variable in the array:
   - Extracts the value using `grep "^${var}=" | cut -d'=' -f2-`
   - If found, sets it in Convex using `npx convex env set`
   - If not found, skips with a yellow warning message
3. Uses `--` separator to prevent special characters from being parsed as flags
4. Properly handles special characters, empty values, and long values

## Verification

To verify the implementation works:

```bash
# 1. Add RESEND_API_KEY to your env file
echo "RESEND_API_KEY=re_your_api_key_here" >> app/.env.nextjs.local

# 2. Run the setup script
./scripts/setup-convex-env.sh

# 3. Verify it was set in Convex
./scripts/setup-convex-env.sh --check
```

Expected output in check mode:
```
Current Convex environment variables:
--------------------------------------
  RESEND_API_KEY: re_your_api_key_here
```

## Design Decisions

### Why Only One Line Changed?

The `PASSTHROUGH_VARS` mechanism was designed for extensibility. Adding new environment variables only requires updating the array - no logic changes needed.

### Why Not Validate the API Key Format?

Following the principle of minimal implementation (GREEN phase in TDD), we only add the key to the array. The Resend API itself will validate the key format when used.

### Why Skip Instead of Fail When Missing?

RESEND_API_KEY is optional during development (email features may not be tested locally). The script gracefully skips missing passthrough vars so developers can work without configuring every service.

## TDD Workflow

1. **RED Phase**: Created 8 failing tests in `tests/unit/08-resend-api-key.test.sh`
2. **GREEN Phase**: Added `"RESEND_API_KEY"` to `PASSTHROUGH_VARS` array (1 line)
3. **Verification**: All 8 tests now pass ✅

## Related Files

- `scripts/setup-convex-env.sh` - Main script (modified)
- `app/.env.nextjs.local.example` - Example env file (already has RESEND_API_KEY)
- `docs/setup/email-configuration.md` - Email setup documentation
- `tasks/00048-agent-init-overhaul/08-resend-api-key/tests/unit/08-resend-api-key.test.sh` - Unit tests
