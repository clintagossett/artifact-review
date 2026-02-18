# Task 00130: Add Email Webhook Integration to Novu Org Setup

**GitHub Issue:** #130
**Status:** Complete

## Problem

The `setup-novu-org.sh` script did not configure the Novu email webhook integration. This meant agents that ran `setup-novu-org.sh` standalone (not via `agent-init.sh`) were missing the email webhook, causing the email digest pipeline to silently fail.

## Solution

Updated `setup-novu-org.sh` to:
1. Automatically configure the email webhook as part of standard setup
2. Added `--fix-email` flag for existing agents to retrofit the webhook
3. Added email webhook status to `--check` output
4. Updated `docs/development/novu-setup.md` to reflect the changes

## Files Changed

- `scripts/setup-novu-org.sh` - Added email webhook setup, `--fix-email` flag, and `--check` enhancement
- `docs/development/novu-setup.md` - Updated setup instructions

## Related

- `scripts/setup-novu-email-webhook.sh` - Standalone webhook setup script (called by setup-novu-org.sh)
- `scripts/agent-init.sh` - Already called both scripts at steps 5 and 5.5
