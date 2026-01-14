# Journeys Index

User journey maps documenting key workflows and interactions, numbered for alignment with End-to-End (E2E) testing.

## Pricing Context

| Tier | Who | Limits |
|------|-----|--------|
| Free | All users (reviewers stay here) | 3 docs, Unlimited versions, 5-day review |
| Pro | Document Creators | Unlimited |
| Team | Organizations | Unlimited + admin features |

## Actual State Journeys
These journeys reflect current production features and are mapped to E2E tests where applicable.

| ID | Journey | Persona | Test Alignment |
|---|---------|---------|----------------|
| 001 | [Signup & Login](./001-signup-and-login.md) | All Users | `auth.spec.ts` |
| 001.01 | [Expired Link Recovery](./001.01-expired-link-handling.md) | All Users | *Pending* |
| 002 | [Artifact Upload & View](./002-artifact-upload-and-view.md) | Creator | `artifact-workflow.spec.ts` |
| 003 | [Reviewer Comments](./003-reviewer-comments-and-feedback.md) | Reviewer | `artifact-workflow.spec.ts` |
| 003.01 | [Invitee Onboarding](./003.01-unauthenticated-reviewer-deep-link.md) | Reviewer | *Pending* |
| 003.02 | [Access Denied](./003.02-access-denied-and-revocation.md) | Reviewer | *Pending* |
| 004 | [Sharing & Invites](./004-artifact-sharing-and-invites.md) | Creator | *Pending* |
| 004.01 | [Reviewer Lifecycle](./004.01-reviewer-lifecycle-and-invites.md) | Creator | *Pending* |
| 005 | [Plan Upgrade & Limits](./005-plan-upgrade-and-limits.md) | Creator | *Pending* |
| 005.01 | [Stripe Checkout Flow](./005.01-stripe-checkout-flow.md) | Creator | *Pending* |
| 005.02 | [Customer Billing Portal](./005.02-customer-billing-portal.md) | Creator | *Manual* |
| 006 | [Account Settings](./006-account-settings-and-security.md) | All Users | *Manual* |

## Proposed Feature Journeys
Future state workflows currently in design or development.

| ID | Journey | Persona | Focus Area |
|---|---------|---------|------------|
| 007 | [GitHub Manual Pull](./007-github-manual-pull.md) | Creator | Integrations |
| 008 | [Team Workspace](./008-team-workspace-onboarding.md) | Admin | Organizations |
| 009 | [Version Comparison](./009-version-comparison-and-diff.md) | All Users | Collaboration |
| 010 | [Email Verification on Sharing](./010-email-verification-on-sharing.md) | Creator | Security |
| 011 | [Agent-Powered Workflows (PROPOSED)](./011-agent-powered-workflows.md) | Agent/Creator | AI Automation |
| 005.03 | [Subscription Renewal Failure (PROPOSED)](./005.03-subscription-renewal-failure.md) | Creator | Payments |
