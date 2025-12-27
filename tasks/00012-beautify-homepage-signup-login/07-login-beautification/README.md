# Subtask 07: Login Page Beautification

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Transform the login page to match the Figma design with gradient logo, pill-style auth toggle, icon inputs, demo credentials panel, and polished visual styling.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires GradientLogo.tsx component
  - Requires IconInput.tsx component
  - Requires Alert component from ShadCN
  - Requires brand colors and Inter font

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/auth/AuthMethodToggle.tsx` | Pill-style toggle for Password/Magic Link modes |
| `app/src/components/auth/DemoCredentialsPanel.tsx` | Cream-colored panel showing demo login info |
| `app/src/components/auth/LoginForm.tsx` | Updated with new design elements |
| `app/src/components/auth/MagicLinkForm.tsx` | Updated to match login styling |
| `app/src/app/login/page.tsx` | Updated with gradient background |
| `app/src/app/magic-link-sent/page.tsx` | New confirmation page after magic link sent (if not exists) |

---

## Requirements

### 1. Create `AuthMethodToggle.tsx`

Pill-style toggle for authentication method selection:

**Design (from Figma screenshots):**
- NOT traditional tabs - pill/segmented control style
- Two options: "Password" and "Magic Link"
- Selected option has filled background
- Unselected option has transparent background
- Icons included:
  - Password mode: Lock icon
  - Magic Link mode: Sparkles icon (or Wand)
- Rounded container (rounded-full or rounded-lg)
- Subtle border or background for container

**Props:**
```typescript
interface AuthMethodToggleProps {
  value: 'password' | 'magic-link';
  onChange: (value: 'password' | 'magic-link') => void;
  className?: string;
}
```

**Behavior:**
- Controlled component (value + onChange)
- Visual feedback on selection
- Keyboard accessible

### 2. Create `DemoCredentialsPanel.tsx`

Reusable demo info panel:

**Design (from Figma screenshots):**
- Cream/beige background (#FEF9C3 / yellow-100)
- Rounded corners (rounded-lg)
- Padding (p-4)
- Icon: Wand emoji or magic wand icon
- Title: "Demo Mode" or "Test Credentials"
- Content: Display demo email and password
- Subtle text styling

**Props:**
```typescript
interface DemoCredentialsPanelProps {
  email?: string;
  password?: string;
  className?: string;
}
```

### 3. Update `LoginForm.tsx`

Complete redesign of login form:

**Layout Structure:**
```
[GradientLogo with LogIn icon]
[Welcome back - heading]
[Sign in to your Artifact Review account - subheading]

[AuthMethodToggle: Password | Magic Link]

[Email IconInput with Mail icon]
[Password IconInput with Lock icon] + [Forgot password? link]
  OR
[Magic Link info panel]

[Sign in Button with ArrowRight icon]

[DemoCredentialsPanel]

[Don't have an account? Sign up link]
[Terms footer]
```

**Specific Elements:**

1. **GradientLogo:**
   - Use GradientLogo component with LogIn icon
   - Centered above heading
   - Approximately 80px size

2. **Headings:**
   - "Welcome back" - large, bold (text-2xl font-bold)
   - "Sign in to your Artifact Review account" - gray, smaller

3. **AuthMethodToggle:**
   - Centered or full-width
   - Toggles between Password and Magic Link views

4. **Password Mode Inputs:**
   - Email field using IconInput with Mail icon
   - Password field using IconInput with Lock icon
   - "Forgot password?" link positioned to RIGHT of "Password" label (purple text)

5. **Magic Link Mode:**
   - Email field only
   - Info panel explaining magic link (purple-themed)

6. **Submit Button:**
   - Full-width
   - Blue gradient background (from-blue-600 to-blue-700)
   - White text
   - ArrowRight icon on right side
   - Text: "Sign in" or "Send Magic Link" depending on mode

7. **Demo Panel:**
   - Below submit button
   - DemoCredentialsPanel component
   - Show test@example.com and password

8. **Footer Links:**
   - "Don't have an account? Sign up" - link to /register
   - Terms text at very bottom (small, gray)

### 4. Update `MagicLinkForm.tsx`

Match styling with LoginForm when magic link mode is active:
- Same IconInput styling
- Purple-themed info box explaining magic link
- Consistent button styling

### 5. Update `login/page.tsx`

**Background:**
- Gradient background: `from-blue-50 via-white to-purple-50`
- Full viewport height (min-h-screen)
- Centered content

**Layout:**
- Centered card container
- Max-width (max-w-md or 400px)
- White background for card
- Rounded corners and shadow

### 6. Create Magic Link Sent Page (if needed)

**Path:** `/app/src/app/magic-link-sent/page.tsx`

**Design:**
- Similar centered layout to login
- GradientLogo with Mail icon
- Heading: "Check your email"
- Instructions explaining to click the magic link
- Option to resend link
- Back to login link

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/LoginPage.tsx`
- `/figma-designs/src/app/components/MagicLinkSentPage.tsx`

### Figma Screenshots
- `/temp figma screenshots/log-in-page.png` - Primary visual reference

### Current Implementation
- `/app/src/components/auth/LoginForm.tsx` - Current form to update
- `/app/src/components/auth/MagicLinkForm.tsx` - Current magic link form
- `/app/src/app/login/page.tsx` - Current login page

### Foundation Components
- `/app/src/components/shared/GradientLogo.tsx` - From Subtask 02
- `/app/src/components/shared/IconInput.tsx` - From Subtask 02
- `/app/src/components/ui/alert.tsx` - For error display

---

## Component Specifications

### AuthMethodToggle.tsx

```typescript
'use client';

import { Lock, Sparkles } from 'lucide-react';

interface AuthMethodToggleProps {
  value: 'password' | 'magic-link';
  onChange: (value: 'password' | 'magic-link') => void;
  className?: string;
}

// Visual structure
<div className="flex p-1 bg-gray-100 rounded-full">
  <button
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full",
      value === 'password' && "bg-white shadow"
    )}
  >
    <Lock className="w-4 h-4" />
    Password
  </button>
  <button ...>
    <Sparkles className="w-4 h-4" />
    Magic Link
  </button>
</div>
```

### Updated LoginForm.tsx

```typescript
// Key imports
import { GradientLogo } from '@/components/shared/GradientLogo';
import { IconInput } from '@/components/shared/IconInput';
import { AuthMethodToggle } from './AuthMethodToggle';
import { DemoCredentialsPanel } from './DemoCredentialsPanel';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';

// State
const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>('password');
```

---

## Acceptance Criteria

- [ ] GradientLogo displays with LogIn icon above heading
- [ ] "Welcome back" heading and subheading display correctly
- [ ] AuthMethodToggle switches between Password and Magic Link modes
- [ ] Toggle has pill-style design with icons
- [ ] Email input has Mail icon inside
- [ ] Password input has Lock icon inside
- [ ] "Forgot password?" link appears to right of Password label
- [ ] Submit button has gradient background and arrow icon
- [ ] DemoCredentialsPanel shows test credentials in cream box
- [ ] Magic Link mode shows appropriate info panel
- [ ] Page has gradient background (blue-50 to purple-50)
- [ ] Error states display with Alert component
- [ ] All existing authentication functionality preserved
- [ ] Responsive on mobile
- [ ] Keyboard accessible (tab order, focus states)

---

## Estimated Effort

3-4 hours

---

## How This Will Be Used

This subtask delivers a polished login experience:
- Establishes patterns reused in signup (Subtask 08)
- AuthMethodToggle, DemoCredentialsPanel reused directly
- GradientLogo and IconInput usage patterns established
- Login is the most common entry point for returning users
