# Plan Upgrade Journey

**Persona:** Document Creator
**Goal:** Upgrade from Free to Paid to remove limits

## Pricing Tiers

| Tier | Documents | Versions | Review Period | Price |
|------|-----------|----------|---------------|-------|
| **Free** | 3 | 3 per doc | 5 days | $0 |
| **Pro** | Unlimited | Unlimited | Unlimited | $X/mo |
| **Team** | Unlimited | Unlimited | Unlimited | $X/user/mo |

**Note:** Reviewers always have free accounts. Only Document Creators need paid plans.

## Free Tier Limits

| Limit | Behavior |
|-------|----------|
| 3 documents | 4th upload blocked until upgrade |
| 3 versions per doc | 4th version blocked, must upgrade |
| 5-day review period | Comments locked, document read-only after expiry |

## Flow: Hitting a Limit

```mermaid
flowchart TD
    A[User Action] --> B{Limit Reached?}

    B -->|Doc limit| C[Upload Blocked Modal]
    B -->|Version limit| D[Version Blocked Modal]
    B -->|Time expiring| E[Expiry Warning Banner]
    B -->|Time expired| F[Read-Only State]
    B -->|No| G[Action Succeeds]

    C --> H[Upgrade to Pro]
    D --> H
    E --> H
    F --> H

    H --> I[Pricing Page]
```

## Flow: Upgrade Process

```mermaid
flowchart TD
    A[Pricing Page] --> B{Select Plan}

    B -->|Pro| C[Pro Features]
    B -->|Team| D[Team Features]

    C --> E[Enter Payment]
    D --> F[Enter Seats + Payment]

    E --> G[Confirm Purchase]
    F --> G

    G --> H[Payment Processing]
    H --> I{Success?}

    I -->|Yes| J[Plan Activated]
    I -->|No| K[Payment Error]
    K --> E

    J --> L[Limits Removed]
    L --> M[Return to Dashboard]
```

## Screens

| Step | Screen | Notes |
|------|--------|-------|
| 1 | Limit Modal | Clear message, upgrade CTA |
| 2 | Pricing Page | Compare tiers, highlight current |
| 3 | Checkout | Stripe/payment form |
| 4 | Confirmation | Receipt, next steps |
| 5 | Dashboard | Limits removed, badge updated |

## Limit Notifications

### In-App Toasts

Toasts appear after successful actions when limits are approaching.

| Remaining | Document Toast | Version Toast |
|-----------|----------------|---------------|
| 2 left | "2 documents remaining. Upgrade for unlimited." | "2 versions remaining. Upgrade for unlimited." |
| 1 left | "1 document remaining. Upgrade for unlimited." | "1 version remaining. Upgrade for unlimited." |
| 0 left | Blocking modal (not toast) | Blocking modal (not toast) |

### Review Period Notifications

| Time | Channel | Message |
|------|---------|---------|
| 2 days left | Toast + Banner | "Review period ends in 2 days" |
| 1 day left | Toast + Banner + Email | "Review period ends tomorrow" |
| Expired | Banner + Email | "Review period ended. Comments locked." |

### Email Notifications

| Trigger | Email Subject | Content |
|---------|---------------|---------|
| 1 doc remaining | "You have 1 document left" | Usage summary, upgrade CTA |
| 1 version remaining | "Version limit approaching" | Doc name, upgrade CTA |
| 1 day before expiry | "Review ending tomorrow: [Doc Name]" | Doc link, upgrade CTA |
| Doc expired | "[Doc Name] is now read-only" | What happened, upgrade to reactivate |

### Notification Flow

```mermaid
flowchart TD
    A[User Action] --> B{Check Limits}

    B --> C{Docs Remaining?}
    C -->|2| D[Toast: 2 docs left]
    C -->|1| E[Toast: 1 doc left]
    C -->|1| F[Email: 1 doc left]
    C -->|0| G[Blocking Modal]

    B --> H{Versions Remaining?}
    H -->|2| I[Toast: 2 versions left]
    H -->|1| J[Toast: 1 version left]
    H -->|1| K[Email: version limit]
    H -->|0| L[Blocking Modal]

    B --> M{Review Period?}
    M -->|2 days| N[Toast + Banner]
    M -->|1 day| O[Toast + Banner + Email]
    M -->|Expired| P[Banner + Email]
```

## Upgrade Triggers

| Trigger | Location | UX |
|---------|----------|-----|
| Doc limit hit | Upload flow | Blocking modal |
| Version limit hit | Version upload | Blocking modal |
| 1 day before expiry | Dashboard, doc view | Warning banner |
| Expiry reached | Doc view | Read-only overlay, comments locked |
| Proactive | Settings, pricing link | Self-service |

## Post-Upgrade

- All limits removed immediately
- Expired docs become active again
- Comments unlocked on expired docs
- Version limits removed
- Review periods become unlimited
