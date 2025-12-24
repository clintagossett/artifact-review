# Notification Patterns

Design system for user notifications across the platform.

## Principles

1. **Progressive urgency**: Nudge before blocking
2. **Multi-channel**: In-app → Email for critical moments
3. **Actionable**: Every notification has a clear next step
4. **Non-disruptive**: Toasts for info, modals only when action required

## Notification Types

### Toast

**Purpose:** Non-blocking feedback and soft warnings

**When to use:**
- Success confirmations
- Soft limit warnings (2 remaining, 1 remaining)
- Informational updates

**Characteristics:**
- Auto-dismiss after 5 seconds
- Appears top-right
- Includes CTA link (optional)

**Examples:**
- "Document uploaded successfully"
- "2 documents remaining. Upgrade for unlimited."
- "Review period ends in 2 days"

### Banner

**Purpose:** Persistent warnings that don't block workflow

**When to use:**
- Time-sensitive deadlines approaching
- Account status changes
- Feature announcements

**Characteristics:**
- Stays visible until dismissed or resolved
- Appears below header
- Includes primary CTA button

**Examples:**
- "Review period ends tomorrow"
- "Payment method expiring soon"
- "Team admin has invited you to upgrade"

### Modal

**Purpose:** Blocking interactions that require immediate decision

**When to use:**
- Hard limits reached (no remaining actions)
- Destructive actions (delete, cancel subscription)
- Required onboarding steps

**Characteristics:**
- Blocks interaction with background
- Must be dismissed or acted upon
- Clear primary and secondary actions

**Examples:**
- "You've reached your document limit. Upgrade or archive a document."
- "Delete this document? This cannot be undone."
- "Complete your profile to continue"

### Email

**Purpose:** Out-of-app notifications for critical updates

**When to use:**
- 1 unit remaining (docs/versions)
- 1 day before expiry
- Post-expiry status change
- Weekly digest (optional)

**Characteristics:**
- Plain text + HTML versions
- Clear subject lines
- Single primary CTA
- Unsubscribe link (non-critical only)

**Examples:**
- "You have 1 document left"
- "Review ending tomorrow: [Doc Name]"
- "[Doc Name] is now read-only"

## Decision Matrix

| Scenario | Toast | Banner | Modal | Email |
|----------|-------|--------|-------|-------|
| 2 units remaining | ✓ | - | - | - |
| 1 unit remaining | ✓ | - | - | ✓ |
| 0 units remaining | - | - | ✓ | - |
| 2 days before expiry | ✓ | ✓ | - | - |
| 1 day before expiry | ✓ | ✓ | - | ✓ |
| After expiry | - | ✓ | - | ✓ |
| New comment | ✓ | - | - | ✓ |
| @mention | ✓ | - | - | ✓ |
| Doc shared with you | - | - | - | ✓ |
| Upload success | ✓ | - | - | - |
| Upload failed | ✓ | - | - | - |

## Toast vs Modal Pattern

**Key principle:** Toast = informational, Modal = blocking

| Aspect | Toast | Modal |
|--------|-------|-------|
| Dismissible | Auto-dismiss (5s) | User must act |
| Workflow | Non-blocking | Blocking |
| Urgency | Low to medium | High |
| CTA | Optional link | Required action |
| Use after success | ✓ Yes | ✗ No |
| Use before limit | ✓ Yes | ✗ No |
| Use at limit | ✗ No | ✓ Yes |

## Email Notification Design

### Structure

```
Subject: Clear, action-oriented (max 50 chars)

Preheader: Additional context (max 100 chars)

Body:
- Personal greeting
- Context (what happened)
- Impact (what this means)
- Action (what to do next)
- CTA button
- Footer (settings, unsubscribe)
```

### Tone

- **Informational:** Neutral, helpful
- **Warning:** Urgent but not alarming
- **Transactional:** Clear, concise

### Frequency Limits

- Max 1 limit warning email per 24 hours
- Max 3 comment notification emails per day (then digest)
- No email for events user triggered themselves

## Implementation Notes

### Toast Component Props

```typescript
interface ToastProps {
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  duration?: number // default 5000ms
  action?: {
    label: string
    href: string
  }
}
```

### Email Template Variables

All emails should support:
- `{{user_name}}`
- `{{document_name}}`
- `{{remaining_count}}`
- `{{days_until_expiry}}`
- `{{cta_url}}`
- `{{upgrade_url}}`

### Accessibility

- Toasts must be announced to screen readers
- Modals must trap focus
- Emails must have semantic HTML and plain text fallback
