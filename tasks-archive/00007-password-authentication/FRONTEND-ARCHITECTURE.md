# Frontend Architecture: Password Authentication Integration with Figma Designs

**Task:** 00007-password-authentication
**Created:** 2025-12-26
**Status:** Design Complete - Ready for Implementation
**For:** tdd-developer agent

---

## Executive Summary

This document defines the frontend implementation strategy for integrating password authentication with Figma design components. The approach is phased: **Phase 1** delivers minimal functional authentication, **Phase 2** integrates full Figma design system, and **Phase 3** adds remaining application features.

**Key Architectural Decisions:**
- Use Next.js App Router file-based routing (per ADR 0008)
- Email-based authentication (email + password, not username)
- Adapt Figma components to Next.js structure (not direct copy)
- Leverage existing ShadCN components from production app
- Minimal UI first, design polish second

---

## Table of Contents

1. [Figma Design Analysis](#figma-design-analysis)
2. [Component Architecture](#component-architecture)
3. [Phased Implementation Strategy](#phased-implementation-strategy)
4. [Technical Decisions](#technical-decisions)
5. [Component Specifications](#component-specifications)
6. [Testing Strategy](#testing-strategy)
7. [File Structure](#file-structure)

---

## Figma Design Analysis

### Screens Available in Figma Designs

The `figma-designs/` submodule contains **7 pre-built authentication and application screens**:

| Screen | File | Purpose | Components |
|--------|------|---------|-----------|
| **Landing Page** | `LandingPage.tsx` | Marketing homepage | Hero, features, pricing, FAQ, footer |
| **Login Page** | `LoginPage.tsx` | Email + password sign in | Email input, password input, error handling |
| **Signup Page** | `SignupPage.tsx` | Account registration | Name, email, password, confirm password, validation |
| **Forgot Password** | `ForgotPasswordPage.tsx` | Password reset request | Email input, success state |
| **Reset Password** | `ResetPasswordPage.tsx` | Set new password | New password, confirm password |
| **Dashboard** | `Dashboard.tsx` | Authenticated home | Project cards, upload, search, activity feed |
| **Document Viewer** | `DocumentViewer.tsx` | HTML artifact viewer | Comment sidebar, version control, sharing |

### Figma Design System

From `figma-designs/DESIGN_SYSTEM.md`:

**Color Palette:**
- **Primary Blue:** `#2563EB` (blue-600) - CTAs, links
- **Secondary Purple:** `#7C3AED` (purple-600) - Accents, AI branding
- **Gradient:** `bg-gradient-to-br from-blue-600 to-purple-600`

**Typography:**
- Font: Inter (variable font)
- **CRITICAL:** Typography is defined in `theme.css` - DO NOT override with Tailwind font classes
- Use semantic HTML (`<h1>`, `<h2>`, `<p>`) and only add color/spacing classes

**Spacing:**
- 8px base grid: `p-2`, `p-4`, `p-6`, `p-8`
- Card padding: `p-6` to `p-8`
- Section padding: `py-16` to `py-24`

**Components Used:**
- ShadCN UI library (already installed in `app/src/components/ui/`)
- Icons: lucide-react
- Notifications: sonner (toast)

### Adapting Figma to Next.js

**Figma Designs Structure (React SPA):**
```tsx
// Single-page app with state routing
const [screen, setScreen] = useState('landing');
return screen === 'login' ? <LoginPage /> : <Dashboard />;
```

**Our Architecture (Next.js App Router):**
```tsx
app/src/app/
├── page.tsx              // Landing page (/)
├── login/page.tsx        // Login page (/login)
├── register/page.tsx     // Register page (/register)
└── dashboard/page.tsx    // Dashboard (/dashboard)
```

**Key Differences:**
- Figma uses `onNavigateToLogin()` callbacks → We use `<Link href="/login">` and `useRouter().push()`
- Figma uses `AuthContext` for demo → We use Convex Auth
- Figma has single `App.tsx` → We have file-based routing

---

## Component Architecture

### Page-Level Hierarchy

```
┌─────────────────────────────────────────────────────┐
│ Root Layout (app/src/app/layout.tsx)               │
│ - ConvexProvider, AuthProvider                      │
│ - Global fonts, Toaster                             │
└─────────────────────────────────────────────────────┘
           │
           ├──> / (Landing Page)
           │    └─> Links to /login, /register
           │
           ├──> /login (Login Page)
           │    └─> LoginForm component
           │        └─> Email input, password input, submit
           │        └─> Success → redirect to /dashboard
           │
           ├──> /register (Register Page)
           │    └─> RegisterForm component
           │        └─> Email, password, confirm password
           │        └─> Success → redirect to /dashboard
           │
           └──> /dashboard (Protected)
                └─> Authenticated layout
                    └─> User info, sign out
```

### Component Reuse Strategy

**From Figma Designs (Reference Only):**
- `/figma-designs/src/app/components/LoginPage.tsx` - **Inspiration**, not direct copy
- `/figma-designs/src/app/components/SignupPage.tsx` - **Inspiration**, not direct copy
- `/figma-designs/src/app/components/ui/*` - **ShadCN components** (already in our app)

**Reusable Patterns:**
1. **Form Layout:** Card with gradient background
2. **Input Style:** Icon prefix (Mail, Lock), focus states
3. **Buttons:** Blue-600 primary, outline secondary
4. **Errors:** Red-50 background with AlertCircle icon
5. **Validation:** Live feedback with CheckCircle icons

**DO NOT Copy Figma Components Directly:**
- Figma uses `useAuth()` hook → We use Convex Auth hooks
- Figma has demo-only localStorage auth → We have real backend
- Figma passes `onNavigateToX` props → We use Next.js navigation

---

## Phased Implementation Strategy

### Phase 1: Functional Auth (Minimal UI) ✅ PRIORITY

**Goal:** Get password authentication working end-to-end ASAP.

**Scope:**
- Basic forms with standard ShadCN styling
- Email + password inputs
- Error display
- Success redirects
- NO design polish, NO animations, NO fancy layouts

**Deliverables:**
```
app/src/app/
├── page.tsx (UPDATE)
│   └─> Add links: /login, /register
├── login/page.tsx (NEW)
│   └─> LoginForm component
├── register/page.tsx (NEW)
│   └─> RegisterForm component
└── dashboard/page.tsx (NEW)
    └─> Show email, sign out button
```

**Timeline:** 2-3 hours (per IMPLEMENTATION-PLAN.md Phase 5-8)

---

### Phase 2: Figma Design Integration 🎨

**Goal:** Apply Figma design system to auth pages.

**Tasks:**
1. **Landing Page Enhancement**
   - Port Figma hero section design
   - Add gradient backgrounds
   - Improve CTA buttons
   - Add social proof elements (avatar stack)

2. **Login Page Polish**
   - Gradient background (`bg-gradient-to-br from-blue-50 via-white to-purple-50`)
   - Centered card with logo/icon
   - Icon-prefixed inputs (Mail, Lock icons)
   - Loading states with spinner
   - Better error alerts (red-50 background)

3. **Register Page Polish**
   - Password strength indicator (live validation)
   - Confirm password match feedback
   - Name field addition (optional)
   - "Already have an account?" link styling

4. **Dashboard Layout**
   - Port Dashboard.tsx header design
   - Add project cards grid
   - Include search bar, upload button
   - Presence avatars

**Reference Components:**
```bash
# Study these for design patterns
figma-designs/src/app/components/LoginPage.tsx
figma-designs/src/app/components/SignupPage.tsx
figma-designs/src/app/components/Dashboard.tsx
```

**Styling Checklist:**
- [ ] Gradient backgrounds on auth pages
- [ ] Logo/icon in centered card
- [ ] Icon-prefixed input fields
- [ ] Blue-600 primary buttons with hover states
- [ ] Loading spinner animations
- [ ] Error alert styling (red-50 background)
- [ ] Password validation indicators
- [ ] Responsive design (mobile/tablet/desktop)

**Timeline:** 3-4 hours

---

### Phase 3: Full Application Features 🚀

**Goal:** Complete the application with document upload and review.

**Out of Scope for Task 7:**
- Document upload functionality
- Comment system
- Version management
- Share modal
- Multi-page navigation

**Note:** These features exist in Figma designs but are separate tasks.

---

## Technical Decisions

### 1. Routing Architecture

**Decision:** Next.js App Router with file-based routing (ADR 0008)

**Route Structure:**
```
/                    → Landing page (public)
/login               → Login page (public, redirects if authed)
/register            → Register page (public, redirects if authed)
/dashboard           → Dashboard (protected, requires auth)
/reset-password      → Password reset (future)
/verify-email        → Email verification (future)
```

**Route Protection:**
```tsx
// app/src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('convex_auth_token');

  // Protect dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authed users away from login/register
  if (['/login', '/register'].includes(request.nextUrl.pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

**Navigation Patterns:**
```tsx
// Static links
import Link from 'next/link';
<Link href="/login">Sign In</Link>

// Programmatic navigation
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/dashboard');
```

---

### 2. Form Validation Strategy

**Decision:** Client-side validation first, server validation via Convex

**Validation Rules (Email-based):**
```typescript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError("Please enter a valid email address");
}

// Password validation (min 8 chars)
if (password.length < 8) {
  setError("Password must be at least 8 characters");
}

// Confirm password match
if (password !== confirmPassword) {
  setError("Passwords must match");
}
```

**Live Validation (Phase 2):**
```tsx
// Password strength indicators (from Figma SignupPage)
const passwordRequirements = [
  { label: 'At least 8 characters', met: password.length >= 8 },
  { label: 'Contains a number', met: /\d/.test(password) },
  { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
];

// Display with CheckCircle icons
{password && passwordRequirements.map((req) => (
  <div key={req.label} className="flex items-center gap-2">
    {req.met ? (
      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
    ) : (
      <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
    )}
    <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
      {req.label}
    </span>
  </div>
))}
```

---

### 3. State Management

**Decision:** React useState + Convex hooks (no Redux/Zustand)

**Form State:**
```tsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Auth State:**
```tsx
// Via Convex Auth
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";

const { signIn, signOut } = useAuthActions();
const currentUser = useQuery(api.users.current);
```

---

### 4. Error Handling

**Decision:** Toast notifications for success, inline errors for forms

**Error Display Pattern:**
```tsx
// From Figma LoginPage - red alert box
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
    <p className="text-sm text-red-800">{error}</p>
  </div>
)}
```

**Success Notifications:**
```tsx
import { toast } from "sonner";

// After successful registration
toast.success("Account created! Redirecting...");
router.push('/dashboard');
```

---

### 5. ShadCN Component Usage

**Components Required (Phase 1):**
- `Button` - Submit buttons, links
- `Input` - Email, password fields
- `Label` - Form labels
- `Card` - Page containers

**Components Added (Phase 2):**
- `Badge` - Status indicators
- `Avatar` - User avatars on dashboard
- `Sonner` - Toast notifications

**Installation:**
```bash
cd app
npx shadcn@latest add button input label card
npx shadcn@latest add badge avatar sonner  # Phase 2
```

---

## Component Specifications

### 1. LoginForm Component

**File:** `app/src/components/auth/LoginForm.tsx`

**Props:**
```typescript
interface LoginFormProps {
  onSuccess: () => void;  // Called after successful login
}
```

**State:**
```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Behavior:**
1. User enters email + password
2. Client validates email format
3. Calls `signIn("password", { email, password, flow: "signIn" })`
4. On success: calls `onSuccess()` → parent redirects to /dashboard
5. On error: displays inline error message

**ShadCN Components:**
- `Card` (container)
- `Input` (email, password)
- `Label` (field labels)
- `Button` (submit)

**Design (Phase 1 - Minimal):**
```tsx
<Card className="w-[400px]">
  <CardHeader>
    <CardTitle>Sign In</CardTitle>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={...} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={...} />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  </CardContent>
</Card>
```

**Design (Phase 2 - Figma Polish):**
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
  <div className="w-full max-w-md">
    {/* Logo */}
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
        <LogIn className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-gray-900 mb-2">Welcome back</h1>
      <p className="text-gray-600">Sign in to your Artifact Review account</p>
    </div>

    {/* Form Card */}
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Email Field with Icon */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 border-gray-200 focus:border-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Password Field with Icon */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="pl-10 border-gray-200 focus:border-blue-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </Button>
      </form>
    </div>
  </div>
</div>
```

---

### 2. RegisterForm Component

**File:** `app/src/components/auth/RegisterForm.tsx`

**Props:**
```typescript
interface RegisterFormProps {
  onSuccess: () => void;
}
```

**State:**
```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Validation:**
```typescript
// Email format
if (!emailRegex.test(email)) {
  setError("Please enter a valid email");
  return;
}

// Password length
if (password.length < 8) {
  setError("Password must be at least 8 characters");
  return;
}

// Password match
if (password !== confirmPassword) {
  setError("Passwords must match");
  return;
}
```

**Behavior:**
1. User enters email, password, confirm password
2. Client validates all fields
3. Calls `signIn("password", { email, password, flow: "signUp" })`
4. On success: calls `onSuccess()` → redirects to /dashboard
5. On error: displays inline error

**Design (Phase 1 - Minimal):**
- Same structure as LoginForm
- Add confirm password field

**Design (Phase 2 - Figma Polish):**
- Add password strength indicators (CheckCircle icons)
- Live validation feedback
- Name field (optional)
- Icon-prefixed inputs

---

### 3. Landing Page Component

**File:** `app/src/app/page.tsx` (UPDATE EXISTING)

**Current State:**
```tsx
// Minimal landing with buttons
<main>
  <Unauthenticated>
    <Card>
      <CardHeader>
        <CardTitle>Artifact Review</CardTitle>
      </CardHeader>
      <CardContent>
        <Link href="/login"><Button>Sign In</Button></Link>
        <Link href="/register"><Button variant="outline">Create Account</Button></Link>
      </CardContent>
    </Card>
  </Unauthenticated>

  <Authenticated>
    {router.push('/dashboard')}
  </Authenticated>
</main>
```

**Phase 2 Enhancement:**
- Port Figma LandingPage.tsx hero section
- Add gradient backgrounds
- Include social proof (avatar stack)
- Feature showcase
- Pricing preview

---

### 4. Dashboard Page Component

**File:** `app/src/app/dashboard/page.tsx` (NEW)

**Phase 1 - Minimal:**
```tsx
export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);

  return (
    <main className="p-4">
      <Unauthenticated>
        {router.push('/')}
      </Unauthenticated>

      <Authenticated>
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Welcome to Artifact Review</CardTitle>
            <CardDescription>
              Signed in as: {currentUser?.email || "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => { signOut(); router.push('/'); }}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </Authenticated>
    </main>
  );
}
```

**Phase 2 Enhancement:**
- Port Figma Dashboard.tsx layout
- Add header with logo, search, upload button
- Project cards grid
- Recent activity feed
- User avatar dropdown with sign out

---

## Testing Strategy

### Unit Tests (Component Level)

**LoginForm Tests:**
```typescript
// app/src/components/auth/__tests__/LoginForm.test.tsx

describe('LoginForm', () => {
  it('should render email and password inputs');
  it('should show error for invalid email format');
  it('should call onSuccess after successful login');
  it('should show error for incorrect credentials');
  it('should disable submit button while loading');
});
```

**RegisterForm Tests:**
```typescript
// app/src/components/auth/__tests__/RegisterForm.test.tsx

describe('RegisterForm', () => {
  it('should render all registration fields');
  it('should validate email format');
  it('should require password min 8 characters');
  it('should show error when passwords do not match');
  it('should call onSuccess after successful registration');
});
```

### Integration Tests (Page Level)

**Login Page Tests:**
```typescript
// app/src/app/login/__tests__/page.test.tsx

describe('Login Page', () => {
  it('should render login form');
  it('should show link to register page');
  it('should redirect authenticated users to dashboard');
});
```

### E2E Tests (User Flows)

**Registration Flow:**
```typescript
// tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts

test('should register new user and navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Create Account');
  await expect(page).toHaveURL('/register');

  await page.fill('[id="email"]', 'test@example.com');
  await page.fill('[id="password"]', 'password123');
  await page.fill('[id="confirmPassword"]', 'password123');

  await page.click('button:has-text("Register")');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(/test@example.com/i)).toBeVisible();
});
```

**Login Flow:**
```typescript
test('should sign in with existing user', async ({ page }) => {
  // Register first
  await registerUser(page, 'login@example.com', 'password123');

  // Sign out
  await page.click('button:has-text("Sign Out")');

  // Navigate to login
  await page.goto('/login');

  // Sign in
  await page.fill('[id="email"]', 'login@example.com');
  await page.fill('[id="password"]', 'password123');
  await page.click('button:has-text("Sign In")');

  // Verify authenticated
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(/login@example.com/i)).toBeVisible();

  // Test session persistence
  await page.reload();
  await expect(page).toHaveURL('/dashboard');
});
```

---

## File Structure

### Phase 1 Implementation

```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx (UPDATE)
│   │   │   └─> Add links to /login, /register
│   │   │
│   │   ├── login/
│   │   │   ├── page.tsx (NEW)
│   │   │   └── __tests__/
│   │   │       └── page.test.tsx (NEW)
│   │   │
│   │   ├── register/
│   │   │   ├── page.tsx (NEW)
│   │   │   └── __tests__/
│   │   │       └── page.test.tsx (NEW)
│   │   │
│   │   └── dashboard/
│   │       ├── page.tsx (NEW)
│   │       └── __tests__/
│   │           └── page.test.tsx (NEW)
│   │
│   └── components/
│       └── auth/
│           ├── LoginForm.tsx (NEW)
│           ├── RegisterForm.tsx (NEW)
│           └── __tests__/
│               ├── LoginForm.test.tsx (NEW)
│               └── RegisterForm.test.tsx (NEW)
│
└── convex/
    └── (backend already complete)

tasks/00007-password-authentication/
├── tests/
│   ├── e2e/
│   │   └── password-auth.spec.ts (NEW)
│   ├── playwright.config.ts (NEW)
│   └── package.json (NEW)
│
├── FRONTEND-ARCHITECTURE.md (THIS FILE)
├── IMPLEMENTATION-PLAN.md (Backend complete)
└── PROGRESS.md (Track progress)
```

### Phase 2 Files Added

```
app/src/app/
├── page.tsx (ENHANCE)
│   └─> Port Figma LandingPage hero design
│
├── login/page.tsx (ENHANCE)
│   └─> Add gradient background, icons, loading states
│
├── register/page.tsx (ENHANCE)
│   └─> Add password strength indicators, name field
│
└── dashboard/page.tsx (ENHANCE)
    └─> Port full Figma Dashboard layout
```

---

## Implementation Sequence

### Step-by-Step Execution (For tdd-developer)

**Phase 1: Functional Auth (2-3 hours)**

1. **Create LoginForm Component**
   - Write tests (LoginForm.test.tsx)
   - Implement minimal UI
   - Wire up Convex Auth
   - Validate email format
   - Handle errors

2. **Create RegisterForm Component**
   - Write tests (RegisterForm.test.tsx)
   - Add email, password, confirm password fields
   - Client-side validation
   - Wire up Convex Auth
   - Handle errors

3. **Create Login Page**
   - Write tests (login/page.test.tsx)
   - Render LoginForm
   - Add link to register page
   - Handle successful login redirect

4. **Create Register Page**
   - Write tests (register/page.test.tsx)
   - Render RegisterForm
   - Add link to login page
   - Handle successful registration redirect

5. **Create Dashboard Page**
   - Write tests (dashboard/page.test.tsx)
   - Fetch current user
   - Display email
   - Add sign out button
   - Protect route (redirect if not authed)

6. **Update Landing Page**
   - Add links to /login and /register
   - Redirect authenticated users to /dashboard

7. **E2E Testing**
   - Setup Playwright
   - Write registration flow test
   - Write login flow test
   - Write error handling tests
   - Generate trace.zip validation artifact

---

**Phase 2: Design Integration (3-4 hours)**

1. **Enhance LoginForm**
   - Add gradient background
   - Logo/icon in card header
   - Icon-prefixed inputs (Mail, Lock)
   - Loading spinner animation
   - Better error alerts

2. **Enhance RegisterForm**
   - Password strength indicators
   - Live validation feedback
   - Name field (optional)
   - Icon-prefixed inputs

3. **Enhance Landing Page**
   - Port hero section from Figma
   - Add gradient backgrounds
   - Social proof elements
   - Feature showcase

4. **Enhance Dashboard**
   - Port header design
   - Add project cards grid
   - Search bar
   - Upload button
   - User avatar dropdown

---

## Component Contracts

### LoginForm Contract

```typescript
// app/src/components/auth/LoginForm.tsx

interface LoginFormProps {
  onSuccess: () => void;  // Called after successful authentication
}

interface FormState {
  email: string;          // Email input value
  password: string;       // Password input value
  error: string;          // Error message to display
  isLoading: boolean;     // Loading state during authentication
}

// ShadCN Components Used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lucide Icons (Phase 2)
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
```

### RegisterForm Contract

```typescript
// app/src/components/auth/RegisterForm.tsx

interface RegisterFormProps {
  onSuccess: () => void;  // Called after successful registration
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;
}

// ShadCN Components Used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lucide Icons (Phase 2)
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
```

---

## Design Token Reference

### Colors (From Figma)

```typescript
// Tailwind Classes
'bg-blue-600'          // Primary CTA (#2563EB)
'bg-purple-600'        // Secondary accent (#7C3AED)
'bg-gradient-to-br from-blue-600 to-purple-600'  // Primary gradient
'bg-gradient-to-br from-blue-50 via-white to-purple-50'  // Page background

'text-gray-900'        // Primary text
'text-gray-600'        // Secondary text
'text-gray-500'        // Tertiary text

'bg-red-50'            // Error alert background
'text-red-800'         // Error text
'border-red-200'       // Error border

'bg-green-50'          // Success background
'text-green-700'       // Success text
```

### Typography Rules

**CRITICAL: DO NOT override typography with Tailwind classes**

```tsx
// ✅ CORRECT
<h1 className="text-gray-900 mb-6">Welcome back</h1>
<p className="text-gray-600">Sign in to your account</p>

// ❌ WRONG - Don't add font-size, font-weight, line-height
<h1 className="text-4xl font-bold leading-tight text-gray-900">Welcome back</h1>
```

Typography is defined in `figma-designs/src/styles/theme.css` and should be inherited.

### Spacing

```tsx
// Form spacing
className="space-y-4"  // Between form fields (16px)
className="space-y-6"  // Between form sections (24px)

// Card padding
className="p-6"        // Small cards (24px)
className="p-8"        // Large cards (32px)

// Page padding
className="py-16"      // Section vertical padding (64px)
```

---

## Figma Component Mapping

| Figma Pattern | ShadCN Component | Customization |
|---------------|------------------|---------------|
| Logo in circle | `<div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">` | Add icon |
| Form card | `Card` | `rounded-2xl`, `shadow-sm` |
| Input with icon | `Input` + lucide icon | `relative` wrapper, icon `absolute left-3` |
| Error alert | `<div>` with classes | `bg-red-50 border border-red-200 rounded-lg p-4` |
| Primary button | `Button` | `bg-blue-600 hover:bg-blue-700` |
| Loading spinner | `<div>` with animation | `w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin` |
| Password indicator | CheckCircle icon | `text-green-600` if met, `border` circle if not |

---

## Key Constraints

1. **Email-based authentication only** - No username field
2. **Minimal UI first** - Phase 1 must be functional, not beautiful
3. **No direct Figma copy** - Adapt patterns, don't copy-paste components
4. **Use existing ShadCN** - Reuse components already in `/app/src/components/ui/`
5. **Follow TDD strictly** - Write tests before implementation
6. **Next.js routing only** - No client-side state routing
7. **Typography inheritance** - Don't override with Tailwind font classes

---

## Success Criteria

**Phase 1 Complete When:**
- [ ] User can register with email + password
- [ ] User can sign in with email + password
- [ ] Invalid credentials show error
- [ ] Successful auth redirects to /dashboard
- [ ] Dashboard shows user email
- [ ] User can sign out
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Validation trace.zip generated

**Phase 2 Complete When:**
- [ ] Gradient backgrounds on auth pages
- [ ] Icon-prefixed input fields
- [ ] Loading states with spinners
- [ ] Error alerts with red-50 styling
- [ ] Password strength indicators
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Landing page hero section ported
- [ ] Dashboard header matches Figma design

---

## Next Steps for tdd-developer

1. **Read this document fully**
2. **Review IMPLEMENTATION-PLAN.md** (backend context)
3. **Read PROGRESS.md** (current status)
4. **Start Phase 1, Cycle 5.1** (Landing Page Update)
5. **Follow TDD workflow** - RED → GREEN → REFACTOR
6. **Commit after each cycle** with descriptive messages
7. **Update PROGRESS.md** after each phase
8. **Generate trace.zip** after E2E tests pass

---

## Reference Files

**Backend (Already Complete):**
- `/app/convex/schema.ts` - Database schema
- `/app/convex/users.ts` - User queries
- `/app/convex/auth.ts` - Convex Auth config
- `/app/convex/__tests__/passwordAuth.test.ts` - Backend tests (6/6 passing)

**Figma Designs (Reference Only):**
- `/figma-designs/DESIGN_SYSTEM.md` - Design token guide
- `/figma-designs/src/app/components/LoginPage.tsx` - Login inspiration
- `/figma-designs/src/app/components/SignupPage.tsx` - Register inspiration
- `/figma-designs/src/app/components/Dashboard.tsx` - Dashboard inspiration
- `/figma-designs/src/app/components/ui/*` - ShadCN components

**ADRs:**
- `/docs/architecture/decisions/0008-nextjs-app-router-for-routing.md` - Routing strategy
- `/docs/architecture/decisions/0006-frontend-stack.md` - Next.js + React + Tailwind

**Development Guides:**
- `/docs/development/workflow.md` - TDD workflow
- `/docs/development/testing-guide.md` - How to write tests
- `/docs/development/logging-guide.md` - Structured logging

---

**Document Status:** Complete - Ready for Implementation
**Created:** 2025-12-26
**For Agent:** tdd-developer
**Estimated Implementation Time:** 5-7 hours (Phase 1: 2-3h, Phase 2: 3-4h)
