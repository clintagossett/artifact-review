# ADR 0005: Domain Registrar

**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett

## Context

We need a domain registrar for the HTML Review Platform that supports:

1. **HTTPS URL forwarding** with automatic SSL certificates
2. **Modern API** for programmatic DNS management
3. **Competitive pricing** with transparent renewal costs
4. **Free WHOIS privacy** to protect personal information
5. **Fast DNS propagation** for quick iteration

### Historical Issues with GoDaddy

Previous experience with GoDaddy revealed critical limitations:
- **No HTTPS URL forwarding support** - SSL certificate errors on forwarded domains
- GoDaddy's forwarding uses `shortener.secureserver.net` with SSL only for that domain
- Users accessing forwarded domains via HTTPS encounter certificate warnings
- This is a known, unfixed issue as of 2025

### Why Not AWS Route53?

While Route53 technically supports HTTPS redirects, it requires orchestrating multiple AWS services:
- AWS Certificate Manager (ACM) - must be in `us-east-1` region
- S3 bucket for redirect hosting
- CloudFront distribution with "Redirect HTTP to HTTPS" policy
- Route53 DNS records pointing to CloudFront

**Complexity:** 4 services to configure for basic URL forwarding
**Cost:** ~$0.50/month for CloudFront (vs free at most registrars)

## Decision

**Use Porkbun as the primary domain registrar.**

### Key Features

| Feature | Capability |
|---------|------------|
| **HTTPS URL Forwarding** | ✅ Automatic, free SSL certificates |
| **HSTS Support** | ✅ Works with .app, .dev domains |
| **Redirect Types** | 301 (permanent), 302/307 (temporary) |
| **API** | Modern JSON REST API |
| **WHOIS Privacy** | Free, enabled by default |
| **SSL Certificates** | Free (Let's Encrypt) |
| **DNS Speed** | <5 sec for new records, <5 min for updates |
| **Email Forwarding** | Free |

### Pricing

- **.review domains:** $10.79 first year, $21.09 renewal
- **.ai domains:** $72.40/year (2-year minimum = $144.80)
- **No hidden fees** - Transparent pricing
- **Free included:** WHOIS privacy, SSL, email/URL forwarding

## Alternatives Considered

| Registrar | HTTPS Forwarding | API | Pricing | Verdict |
|-----------|------------------|-----|---------|---------|
| **Porkbun** | ✅ Native, automatic | JSON REST | Low, consistent | **Chosen** |
| **GoDaddy** | ❌ Not supported | XML | Higher renewals | ❌ Deal breaker |
| **Route53** | ⚠️ Complex (4 services) | AWS CLI/API | ~$0.50/mo extra | Too complex |
| **Namecheap** | ❌ Not supported | XML, IP whitelist | Mid-range | Missing HTTPS forwarding |
| **Vercel** | ✅ At-cost pricing | JSON REST | At-cost | Platform lock-in risk |

### Why Not Namecheap?

Namecheap was a close second:
- ✅ Free WHOIS privacy
- ✅ 24/7 support
- ✅ Mature bulk tools (50+ domains)
- ❌ **No HTTPS URL forwarding support**
- ⚠️ XML-based API (less modern)

**Decision:** HTTPS forwarding is a hard requirement based on past GoDaddy pain.

### Why Not Vercel Domains?

Vercel offers at-cost domain pricing and automatic DNS configuration:
- ✅ At-cost pricing (no markup)
- ✅ Fast search, instant checkout
- ✅ Automatic SSL/DNS setup
- ❌ **Platform coupling** - optimized for Vercel hosting
- ⚠️ **Transfer issues reported** - community reports of transfer difficulties (2024-2025)
- ⚠️ **Limited services** - domains only, no email hosting

**Decision:** Avoid vendor lock-in; Porkbun offers same features without platform dependency.

## Consequences

### Positive

- **HTTPS forwarding works out of the box** - solves GoDaddy pain point
- **Modern API** - easier integration for automated DNS management
- **Cost savings** - transparent pricing, free features included
- **Fast DNS** - under 5 seconds for new records
- **No vendor lock-in** - works with any hosting provider

### Negative

- **Smaller company** - less established than GoDaddy/Namecheap (founded 2015)
- **Support** - email/tickets only, no 24/7 live chat
- **Bulk tools** - less mature for 50+ domain management (not needed yet)

### Migration Notes

If we need to migrate away from Porkbun in the future:
- Standard domain transfer process (unlock, get auth code, transfer)
- 60-day ICANN lock after registration/transfer
- API makes bulk operations easier if needed

## Implementation Details

### DNS Configuration

```bash
# Example: Setting up HTTPS URL forwarding via Porkbun UI
# 1. Login to Porkbun account
# 2. Navigate to domain → URL Forwarding
# 3. Set forwarding rule:
#    - Type: 301 (permanent) or 302 (temporary)
#    - Destination: https://target-domain.com
# 4. Save (HTTPS automatic, no SSL cert config needed)
```

### API Usage

```typescript
// Example: Programmatic DNS record management
import { PorkbunClient } from 'porkbun-api';

const client = new PorkbunClient({
  apiKey: process.env.PORKBUN_API_KEY,
  secretKey: process.env.PORKBUN_SECRET_KEY,
});

// Create DNS record
await client.dns.create('example.com', {
  type: 'A',
  name: 'www',
  content: '192.0.2.1',
  ttl: 600,
});

// Update DNS record
await client.dns.update('example.com', recordId, {
  content: '192.0.2.2',
});
```

### Rate Limits

Porkbun has "strict API limits" (exact limits not publicly documented):
- Monitor API usage during development
- Implement backoff/retry logic
- Cache DNS lookups when possible

## Domain Strategy

### Primary Domain Options

Based on research (see conversation 2024-12-24):

| Domain | Price | Availability | Notes |
|--------|-------|--------------|-------|
| `review.com` | N/A | ❌ Taken (TPR Education) | Premium, not available |
| `review.io` | N/A | ❌ Taken (Reviews.io) | Acquired for $72M |
| `review.ai` | $137.96/2yr | ❌ Taken (privacy protected) | Registered 2017 |
| `review.review` | $21.09/yr | ✅ Check availability | Uses .review TLD |
| `use.review` | $21.09/yr | ✅ Check availability | Action-oriented |
| `get.review` | $21.09/yr | ✅ Check availability | Action-oriented |

**Recommendation:** Check availability for `review.review`, `use.review`, `get.review` at Porkbun.

## Testing

### DNS Testing Checklist

- [ ] Verify HTTPS URL forwarding (301 and 302)
- [ ] Test SSL certificate auto-provisioning
- [ ] Confirm DNS propagation speed
- [ ] Test API record creation/update/delete
- [ ] Verify WHOIS privacy is enabled
- [ ] Test email forwarding functionality

### Production Verification

```bash
# Verify DNS propagation
dig @8.8.8.8 example.com

# Test HTTPS forwarding
curl -I https://example.com
# Should show: HTTP/2 301 (permanent redirect)
# Location: https://target-domain.com

# Verify SSL certificate
openssl s_client -connect example.com:443 -servername example.com
# Should show valid certificate for example.com
```

## References

- [Porkbun HTTPS URL Forwarder Announcement](https://porkbun.com/blog/announcing-porkbuns-https-url-forwarder/)
- [Porkbun URL Forwarding Setup Guide](https://kb.porkbun.com/article/39-how-to-set-up-url-forwarding)
- [Porkbun API v3 Documentation](https://porkbun.com/api/json/v3/documentation)
- [GoDaddy HTTPS Forwarding Limitation](https://redirect.pizza/support/godaddy-forwarding-with-https-support)
- [Domain Forwarding: Overcoming GoDaddy's Limitations](https://empirical.digital/posts/domain-forwarding-overcoming-godaddys-limitations/)
- [Porkbun vs Namecheap Comparison](https://affmaven.com/porkbun-vs-namecheap/)
