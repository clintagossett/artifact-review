# Task #00126: Implement Preview Deployment Strategy

**GitHub Issue:** #126
**Status:** Pending — Awaiting strategy review (#124)
**Depends on:** #124 (strategy document), #125 (test baseline)

## Problem

Vercel preview deployments fail with:
```
Detected a non-production build environment and "CONVEX_DEPLOY_KEY" for a production Convex deployment.
```

`CONVEX_DEPLOY_KEY` is set to the production deploy key for ALL Vercel targets. Convex refuses to use a production key in a non-production (preview) build.

## Strategy Reference

Full strategy with pros/cons per service: `tasks/00124-preview-deployment-strategy/README.md`

**Summary of recommended approach:**

| Service | Preview Strategy |
|---------|-----------------|
| Convex | Auto-isolated backend per branch (split deploy key) |
| Novu | Disable in previews (can't isolate per preview) |
| Resend | Share API key, derive SITE_URL from VERCEL_URL |
| Stripe | Disable webhooks (API calls still work) |

## Implementation Phases

### Phase 1: Unblock Preview Builds
- Split `CONVEX_DEPLOY_KEY` by Vercel target
- Remove `CONVEX_DEPLOYMENT` from preview target
- Update `vercel.json` build command
- Handle `SITE_URL` for previews

### Phase 2: Service Configuration
- Remove Novu env vars from preview target
- Remove `STRIPE_WEBHOOK_SECRET` from preview target
- Keep `RESEND_API_KEY` shared

### Phase 3: Branch Filtering
- Add Ignored Build Step scripts to all 3 Vercel projects
- dev: build previews only for PRs targeting `dev`
- staging/prod: skip all preview builds

### Phase 4: Validation
- Verify graceful degradation (missing Novu/Stripe env vars)
- Test end-to-end PR → preview deployment
- Verify Convex preview backend lifecycle

## Open Questions

1. Does `convex deploy --cmd` set `NEXT_PUBLIC_CONVEX_HTTP_URL` for previews?
2. Does preview `SITE_URL` need auth redirect URI registration?
3. Should preview backends be seeded with test data?

## Do Not Start Until

- [ ] Strategy document (#124) reviewed and approved
- [ ] Test baseline (#125) confirmed on hosted environment
