# Domain Setup Status for Magic Link Testing

**Date:** 2025-12-26
**Domain:** `artifactreview-early.xyz`
**Sending Address:** `hello@artifactreview-early.xyz`
**Receiving Domain:** `@artifactreview-early.xyz` (root domain)
**Purpose:** Disposable test domain for magic link email testing (send & receive)

---

## ✅ Completed Steps

### 1. Domain Purchase
- ✅ Purchased `artifactreview-early.xyz` on Porkbun
- ✅ Domain expires: 2026-12-27
- ✅ Status: ACTIVE

### 2. Porkbun API Setup
- ✅ Generated API credentials
- ✅ Added to `.env.local`:
  - `PORKBUN_API_KEY`
  - `PORKBUN_SECRET_KEY`
  - `TEST_EMAIL_DOMAIN`
- ✅ Enabled API access for domain
- ✅ Tested API connection successfully

### 3. Resend Domain Configuration
- ✅ Added `artifactreview-early.xyz` to Resend (root domain)
- ✅ Domain ID: `d0c15326-141d-41a4-ac37-bd484a1d07ed`
- ✅ Retrieved DNS records from Resend
- ✅ Configured for both sending AND receiving emails

### 4. DNS Records Added to Porkbun
Successfully added via Porkbun API (from `dns.txt`):

**Sending Records (Resend):**

| Type | Name | Value | Priority | Record ID |
|------|------|-------|----------|-----------|
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQE... (DKIM) | - | 513579885 |
| MX | send | feedback-smtp.us-east-1.amazonses.com | 10 | 513579887 |
| TXT | send | v=spf1 include:amazonses.com ~all | - | 513579888 |

**Receiving Records:**

| Type | Name | Value | Priority | Record ID |
|------|------|-------|----------|-----------|
| MX | @ (root) | inbound-smtp.us-east-1.amazonaws.com | 10 | 513580077 |

**DMARC (Recommended):**

| Type | Name | Value | Record ID |
|------|------|-------|-----------|
| TXT | _dmarc | v=DMARC1; p=none; | 513580082 |

### 5. Code Updates
- ✅ Updated `app/convex/auth.ts`:
  - Changed from: `onboarding@resend.dev`
  - Changed to: `hello@artifactreview-early.xyz`

---

## ⏳ Pending: DNS Propagation

**Current Status:** DNS records added but not yet verified by Resend

**DNS Record Status (as of last check):**
- DKIM: `pending`
- SPF (MX): `pending`
- SPF (TXT): `pending`

**Expected Time:** 5-30 minutes (can take up to 48 hours in rare cases)

**Monitoring:**
```bash
cd app
RESEND_API_KEY=re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW node monitor-domain-verification.mjs
```

This script checks every 30 seconds and will notify when verification is complete.

---

## 📋 Next Steps (Once Domain is Verified)

### 1. Test Email Sending
```bash
cd app
RESEND_API_KEY=re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW node test-email-send-retrieve.mjs
```

Should successfully:
- ✅ Send email from `hello@artifactreview-early.xyz`
- ✅ Deliver to `test-XXXXX@tolauante.resend.app` (Resend test inbox)
- ✅ Retrieve email via Resend API
- ✅ Can also receive emails at `*@artifactreview-early.xyz` (with MX record configured)

### 2. Update Convex Environment
Set AUTH_RESEND_KEY in Convex:
```bash
cd app
npx convex env set AUTH_RESEND_KEY re_MBbCwNE9_6dYWJ9ksgZtPrwWb9cbc7BfW
```

### 3. Complete E2E Tests with Email Retrieval
Hand off to `tdd-developer` agent to:
- Update E2E tests to programmatically retrieve emails from Resend
- Implement full magic link flow testing:
  1. Request magic link
  2. Retrieve email via Resend API
  3. Extract magic link URL from email HTML
  4. Navigate to magic link URL
  5. Verify authentication succeeds
- Run all E2E tests (including the 2 Resend API integration tests)
- Generate validation trace/video

---

## 🔧 Utility Scripts Created

Located in `app/`:

| Script | Purpose |
|--------|---------|
| `test-porkbun-api.mjs` | Test Porkbun API connection and DNS access |
| `list-resend-domains.mjs` | List all domains in Resend account |
| `get-resend-dns-records.mjs` | Get DNS records for Resend domain |
| `add-dns-records-porkbun.mjs` | Add DNS records to Porkbun via API |
| `verify-resend-domain.mjs` | Trigger and check domain verification |
| `monitor-domain-verification.mjs` | Auto-monitor verification status (30s intervals) |
| `test-email-send-retrieve.mjs` | Test email sending and retrieval |

---

## 🎯 Success Criteria

Domain setup will be complete when:
- [⏳] Domain status in Resend: `verified`
- [⏳] All DNS records status: `verified`
- [ ] Can send email from `hello@artifactreview-early.xyz`
- [ ] Can receive emails at `*@artifactreview-early.xyz` (via MX record)
- [ ] Can receive emails at `*@tolauante.resend.app` (Resend test inbox)
- [ ] Can retrieve emails via Resend API
- [ ] Magic link E2E tests passing with email retrieval

---

## 📝 Notes

- This is a **disposable test domain** - reputation doesn't matter
- Free Resend plan allows 1 domain (already using `mail.artifactreview-early.xyz`)
- Test inbox: `<anything>@tolauante.resend.app` (Resend's test inbox feature)
- Production will need a proper domain with reputation management

---

## 🔗 References

- Porkbun Domain: https://porkbun.com/account/domainsSpeedy
- Resend Domain: https://resend.com/domains/d0c15326-141d-41a4-ac37-bd484a1d07ed
- Porkbun API Docs: https://porkbun.com/api/json/v3/documentation
- Resend API Docs: https://resend.com/docs/api-reference/introduction
- DNS Configuration: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/dns.txt`
