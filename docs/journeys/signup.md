# Signup Journey

**Persona:** Document Creator
**Goal:** Create an account and get started

## Auth Options

| Priority | Method | Use Case |
|----------|--------|----------|
| 1 | Magic Link | Quick signup, lowest friction |
| 2 | Social (Google, Microsoft, GitHub) | Familiar, no password to remember |
| 3 | Email + Password | Traditional, full control |

## Flow

```mermaid
flowchart TD
    A[Landing Page] --> B[Click Sign Up]
    B --> C[Auth Options Screen]

    C --> D[Magic Link]
    C --> E[Google]
    C --> F[Microsoft]
    C --> G[GitHub]
    C --> H[Email + Password]

    D --> D1[Enter Email]
    D1 --> D2[Check Inbox]
    D2 --> D3[Click Link]
    D3 --> I[Dashboard]

    E --> E1[Google OAuth]
    E1 --> I

    F --> F1[Microsoft OAuth]
    F1 --> I

    G --> G1[GitHub OAuth]
    G1 --> I

    H --> H1[Enter Email]
    H1 --> H2[Create Password]
    H2 --> H3[Verify Email]
    H3 --> I
```

## Screens

| Step | Screen | Notes |
|------|--------|-------|
| 1 | Landing Page | Clear CTA for signup |
| 2 | Auth Options | Magic link prominent, social buttons, email/password link |
| 3a | Magic Link | Email input, "Check your inbox" confirmation |
| 3b | Social OAuth | Redirect to provider, return to app |
| 3c | Email/Password | Form with validation |
| 4 | Dashboard | Empty state with upload CTA |

## Sign In Flow

Returning users see same auth options. Magic link and social auto-match existing accounts by email.
