# Subtask 08: Signup Page Beautification

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Transform the signup page to match the Figma design with gradient logo, name field, password requirements checklist, and consistent styling with the login page.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires GradientLogo.tsx component
  - Requires IconInput.tsx component
  - Requires brand colors and Inter font
- **Subtask 07 (Login Beautification):** Should be complete
  - Requires AuthMethodToggle.tsx component
  - Requires DemoCredentialsPanel.tsx component
  - Establishes auth page patterns

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/auth/PasswordRequirements.tsx` | Visual checklist for password validation |
| `app/src/components/auth/RegisterForm.tsx` | Updated with new design elements |
| `app/src/app/register/page.tsx` | Updated with gradient background |

---

## Requirements

### 1. Create `PasswordRequirements.tsx`

Visual checklist showing password validation status:

**Design:**
- List of password requirements
- Each requirement shows:
  - Check icon (green) when met
  - X icon or empty circle (gray/red) when not met
- Real-time updates as user types

**Requirements to Display:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (optional based on current validation)

**Props:**
```typescript
interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

// Returns visual list based on password analysis
```

**Styling:**
- Small text (text-sm)
- Green text/icon for met requirements
- Gray or muted text/icon for unmet
- Compact vertical list
- Could use Check and X icons from Lucide

### 2. Update `RegisterForm.tsx`

Complete redesign of registration form:

**Layout Structure:**
```
[GradientLogo with UserPlus icon]
[Create your account - heading]
[Start reviewing AI artifacts with your team - subheading]

[AuthMethodToggle: Password | Magic Link]

[Full Name IconInput with User icon] (NEW)
[Email IconInput with Mail icon]

--- Password Mode ---
[Password IconInput with Lock icon]
[PasswordRequirements checklist]
[Confirm Password IconInput with Lock icon]
[Password match indicator]

--- Magic Link Mode ---
[Magic Link info panel]

[Create Account Button with ArrowRight icon]

[DemoCredentialsPanel - demo mode notice]

[Already have an account? Sign in link]
[Terms footer]
```

**Specific Elements:**

1. **GradientLogo:**
   - Use GradientLogo component with UserPlus icon
   - Centered above heading
   - Approximately 80px size (same as login)

2. **Headings:**
   - "Create your account" - large, bold (text-2xl font-bold)
   - "Start reviewing AI artifacts with your team" - gray, smaller

3. **AuthMethodToggle:**
   - Reuse from Subtask 07
   - Toggles between Password and Magic Link views

4. **Name Field (NEW):**
   - IconInput with User icon
   - Label: "Full Name"
   - Required field
   - Positioned before email

5. **Password Mode Fields:**
   - Email field using IconInput with Mail icon
   - Password field using IconInput with Lock icon
   - PasswordRequirements component below password field
   - Confirm Password field using IconInput with Lock icon
   - Visual indicator for password match (green check or red x)

6. **Magic Link Mode:**
   - Name and Email fields only
   - Info panel explaining magic link signup

7. **Submit Button:**
   - Full-width
   - Blue gradient background (from-blue-600 to-blue-700)
   - White text
   - ArrowRight icon on right side
   - Text: "Create Account" or "Send Magic Link" depending on mode

8. **Demo Panel:**
   - DemoCredentialsPanel component (reuse from Subtask 07)
   - Message about demo mode
   - Could show: "This is a demo environment. Use any email to sign up."

9. **Footer Links:**
   - "Already have an account? Sign in" - link to /login
   - Terms text at very bottom (small, gray)

### 3. Update `register/page.tsx`

**Background:**
- Gradient background: `from-blue-50 via-white to-purple-50`
- Full viewport height (min-h-screen)
- Centered content

**Layout:**
- Centered card container
- Max-width (max-w-md or 400px)
- White background for card
- Rounded corners and shadow
- Consistent with login page

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/SignupPage.tsx`

### Figma Screenshots
- `/temp figma screenshots/log-in-page.png` - Similar styling reference

### Current Implementation
- `/app/src/components/auth/RegisterForm.tsx` - Current form to update
- `/app/src/app/register/page.tsx` - Current register page

### Components from Previous Subtasks
- `/app/src/components/shared/GradientLogo.tsx` - From Subtask 02
- `/app/src/components/shared/IconInput.tsx` - From Subtask 02
- `/app/src/components/auth/AuthMethodToggle.tsx` - From Subtask 07
- `/app/src/components/auth/DemoCredentialsPanel.tsx` - From Subtask 07

---

## Component Specifications

### PasswordRequirements.tsx

```typescript
'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  return (
    <ul className={cn("space-y-1 text-sm", className)}>
      {requirements.map((req) => {
        const met = req.test(password);
        return (
          <li key={req.label} className="flex items-center gap-2">
            {met ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={met ? 'text-green-700' : 'text-gray-500'}>
              {req.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

### Updated RegisterForm.tsx

```typescript
// Key imports
import { GradientLogo } from '@/components/shared/GradientLogo';
import { IconInput } from '@/components/shared/IconInput';
import { AuthMethodToggle } from './AuthMethodToggle';
import { DemoCredentialsPanel } from './DemoCredentialsPanel';
import { PasswordRequirements } from './PasswordRequirements';
import { UserPlus, User, Mail, Lock, ArrowRight, Check, X } from 'lucide-react';

// State
const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>('password');
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

// Password match indicator
const passwordsMatch = password === confirmPassword && password.length > 0;
```

---

## Acceptance Criteria

- [ ] GradientLogo displays with UserPlus icon above heading
- [ ] "Create your account" heading and subheading display correctly
- [ ] AuthMethodToggle (reused from login) switches modes
- [ ] Full Name field appears with User icon (new requirement)
- [ ] Email input has Mail icon inside
- [ ] Password input has Lock icon inside
- [ ] PasswordRequirements shows real-time validation status
- [ ] Each requirement shows check (met) or x (unmet) icon
- [ ] Confirm Password field has match indicator
- [ ] Submit button has gradient background and arrow icon
- [ ] DemoCredentialsPanel shows demo mode info
- [ ] Magic Link mode shows name + email + info panel
- [ ] Page has gradient background (blue-50 to purple-50)
- [ ] Error states display with Alert component
- [ ] All existing registration functionality preserved
- [ ] Responsive on mobile
- [ ] Keyboard accessible

---

## Estimated Effort

2-3 hours (faster due to component reuse from Subtask 07)

---

## How This Will Be Used

This subtask delivers a polished signup experience:
- Consistent with login page (Subtask 07)
- Name field captures user identity for personalization
- Password requirements reduce signup friction
- Completes the authentication beautification
