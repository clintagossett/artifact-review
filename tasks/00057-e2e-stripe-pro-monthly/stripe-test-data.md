# Stripe Checkout Test Data

## Test Card Details

Use these exact values in the Stripe Checkout form:

### Payment Method Selection
- **Ignore** "Pay with Link" option
- **Select** "Pay with card"

### Card Information
| Field | Value |
|-------|-------|
| Card number | `4242 4242 4242 4242` |
| Expiry | `02/29` |
| CVC | `001` |
| Cardholder name | `Test User` |

### Billing Address
| Field | Value |
|-------|-------|
| Country | `United States` |
| ZIP | `80301` |

### Options to Ignore/Uncheck
- **Uncheck** "Save my information for faster checkout" (if present)
- **Ignore** Phone number field (leave empty or skip)
- **Ignore** "Pay with Link" - always use "Pay with card"

## Playwright Selectors Hints

Stripe Checkout runs in an iframe. You'll need to:
1. Wait for redirect to `checkout.stripe.com`
2. Find and interact with the payment form
3. Handle the iframe context for card inputs

```typescript
// Example pattern - Stripe embeds card inputs in iframes
const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');
await cardFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
```

## Expected Flow

1. Click "Upgrade to Pro" button
2. Redirect to Stripe Checkout (`checkout.stripe.com`)
3. Fill card details (see above)
4. Click "Subscribe" button
5. Redirect back to `/settings?success=true`
6. Verify celebration UI / Pro status
