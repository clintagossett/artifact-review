# 001 Signup & Login Journey (Hybrid: Actual + Proposed)

**Persona:** Document Creator / Reviewer
**Goal:** Access the platform using a preferred authentication method

## Overview
Authentication is the entry point for both creators and reviewers. The app supports multiple ways to sign in to minimize friction.

## Auth Options

| Priority | Method | Use Case |
|----------|--------|----------|
| 1 | Magic Link | Quick signup, no password needed |
| 2 | Social (Google, GitHub) | **(Proposed)** One-click access via existing accounts |
| 3 | Email + Password | Traditional login |

## Flow

```mermaid
flowchart TD
    A[Landing Page] --> B[Click Sign Up / Log In]
    B --> C[Auth Screen]

    C --> D[Magic Link]
    C --> E[Social OAuth]
    C --> F[Email + Password]

    D --> D1[Enter Email]
    D1 --> D2[Check Inbox / Mailpit]
    D2 --> D3[Click Link]
    D3 --> G[Dashboard / Redirect to Doc]

    E --> E1[Provider Consent]
    E1 --> G

    F --> F1[Enter Credentials]
    F1 --> G
```

## Screens

| Step | Screen | Notes |
|------|--------|-------|
| 1 | Landing Page | Clear CTA for login/signup |
| 2 | Auth Form | Toggle between Password and Magic Link; Social buttons |
| 3 | Verification | "Check Your Email" screen for Magic Link |
| 4 | Dashboard | Default land for creators |

## Feature Alignment (E2E Test)
Matches `app/tests/e2e/auth.spec.ts`.

## Status & Actual State
- **Magic Link:** Implemented using Convex & Resend/Mailpit.
- **Password:** Implemented.
- **Google/GitHub:** (Proposed) Logic configured via Convex Auth, but not fully active.
