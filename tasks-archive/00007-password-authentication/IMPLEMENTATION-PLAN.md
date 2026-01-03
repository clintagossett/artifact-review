# TDD Implementation Plan: Task 7 - Password Authentication

**Task:** 00007-password-authentication
**Created:** 2025-12-26
**Last Updated:** 2025-12-26
**Status:** Planning - Awaiting Approval

---

## ⚠️ CRITICAL: USE EMAIL NOT USERNAME

**Throughout this plan where "username" is mentioned, USE EMAIL instead:**
- Replace "username" field with "email" field
- Replace "username" input with "email" input
- Replace username validation (3-20 chars) with email validation (email format)
- Replace by_username index with by_email index
- Use email@example.com format in all tests
- Forms should ask for "Email" not "Username"

**Rationale:** Email is modern standard, required for password reset/verification anyway, better UX.

---

## Overview

Implement password authentication (email + password) using TDD methodology. This follows Task 6's anonymous authentication and adds the ability for users to create accounts and sign in with credentials.

**Key Constraints:**
- Email-based authentication (email + password)
- No email verification yet (deferred to later task)
- Minimal UI (functional forms, not polished design)
- Strict TDD workflow (RED → GREEN → REFACTOR)
- Follow Convex rules exactly
- Use ShadCN components where available
- Structured logging throughout

---

## Architectural Approach: Page-Based Routing

**This plan uses Next.js App Router with separate pages instead of a single-page state toggle approach.**

### Page Structure

```
/ (Landing)          → Links to /login and /register
/login               → Login page with LoginForm
/register            → Registration page with RegisterForm
/dashboard           → Authenticated dashboard (shows username)
```

### Key Benefits

1. **Deep Linking Support**
   - Users can bookmark `/login` or `/register`
   - Direct URLs can be shared

2. **Email Link Routing Ready**
   - Future password reset emails can link to `/reset-password?token=xyz`
   - Email verification can link to `/verify?token=xyz`

3. **Better UX**
   - Browser back button works naturally
   - Clear URL indicates current location
   - No state management for view switching

4. **Navigation**
   - Next.js `<Link>` components for client-side routing
   - `useRouter().push()` for programmatic navigation after auth actions

5. **Redirect Logic**
   - Authenticated users accessing `/login` → redirect to `/dashboard`
   - Unauthenticated users accessing `/dashboard` → redirect to `/`
   - Post-login/register → redirect to `/dashboard`
   - Post-signout → redirect to `/`

This routing architecture makes the app more scalable for future features like magic links, password reset, and email verification

---

## Implementation Strategy

### TDD Approach

Each section follows this cycle:
1. **RED** - Write failing test
2. **GREEN** - Minimal implementation to pass
3. **REFACTOR** - Clean up while keeping tests green
4. **REPEAT** - Next test

**Critical Rule:** One test at a time. Never write multiple tests before implementing.

---

## Phase 1: Backend - Schema & Configuration

### Cycle 1.1: Schema Update for Email Index

**RED - Test First:**
```typescript
// File: app/convex/__tests__/passwordAuth.test.ts (NEW)

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";

describe("Password Authentication Schema", () => {
  it("should allow creating user with email", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        isAnonymous: false,
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("test@example.com");
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/convex/schema.ts (MODIFY)

import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Extend the default auth tables
const schema = defineSchema({
  ...authTables,
});

export default schema;
```

**Notes:**
- Convex Auth's authTables already includes email field
- Will add email index in next cycle for efficient lookups

**Files Modified:**
- `app/convex/schema.ts`
- `app/convex/__tests__/passwordAuth.test.ts` (NEW)

**Dependencies:** None

**Risks:**
- None - email field is standard in authTables

---

### Cycle 1.2: Email Index for Queries

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

it("should query user by email using index", async () => {
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "alice@example.com",
      isAnonymous: false,
    });
  });

  const user = await t.run(async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "alice@example.com"))
      .unique();
  });

  expect(user).not.toBeNull();
  expect(user?.email).toBe("alice@example.com");
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/convex/schema.ts (MODIFY)

import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  // Override users table to add email index
  users: defineTable({
    // ... authTables fields
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    image: v.optional(v.string()),
  }).index("by_email", ["email"]),
});

export default schema;
```

**Files Modified:**
- `app/convex/schema.ts`
- `app/convex/__tests__/passwordAuth.test.ts`

**Dependencies:** Cycle 1.1

---

## Phase 2: Backend - Password Registration

### Cycle 2.1: Basic Password Registration

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

describe("Password Registration", () => {
  it("should register user with username and password", async () => {
    const t = convexTest(schema);

    // Attempt registration
    await t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "newuser",
        password: "password123",
        flow: "signUp",
      },
    });

    // Verify user was created
    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", "newuser"))
        .unique();
    });

    expect(user).not.toBeNull();
    expect(user?.username).toBe("newuser");
    expect(user?.isAnonymous).toBe(false);
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/convex/auth.ts (ALREADY HAS Password PROVIDER)
// Convex Auth Password provider handles this automatically
// Just verify configuration is correct
```

**Files Modified:**
- `app/convex/__tests__/passwordAuth.test.ts`
- `app/convex/auth.ts` (verify configuration)

**Dependencies:** Cycle 1.2

**Notes:**
- Convex Auth Password provider should handle registration
- May need to configure Password provider with username field
- Password hashing is automatic (bcrypt)

---

### Cycle 2.2: Duplicate Username Prevention

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

it("should reject duplicate username registration", async () => {
  const t = convexTest(schema);

  // First registration
  await t.mutation(api.auth.signIn, {
    provider: "password",
    params: {
      username: "duplicateuser",
      password: "password123",
      flow: "signUp",
    },
  });

  // Second registration with same username should fail
  await expect(
    t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "duplicateuser",
        password: "different456",
        flow: "signUp",
      },
    })
  ).rejects.toThrow(/username.*already.*exists/i);
});
```

**GREEN - Minimal Implementation:**
- Convex Auth should handle this automatically
- If not, add custom validation in Password provider configuration

**Files Modified:**
- `app/convex/__tests__/passwordAuth.test.ts`
- `app/convex/auth.ts` (if custom validation needed)

**Dependencies:** Cycle 2.1

---

## Phase 3: Backend - Password Sign-In

### Cycle 3.1: Successful Sign-In

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

describe("Password Sign-In", () => {
  it("should sign in with correct credentials", async () => {
    const t = convexTest(schema);

    // Register user first
    await t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "signinuser",
        password: "correctpassword",
        flow: "signUp",
      },
    });

    // Sign in with same credentials
    const result = await t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "signinuser",
        password: "correctpassword",
        flow: "signIn",
      },
    });

    // Verify sign-in succeeded (returns token or session)
    expect(result).toBeDefined();
  });
});
```

**GREEN - Minimal Implementation:**
- Convex Auth Password provider handles sign-in
- Verify flow parameter differentiates signUp vs signIn

**Files Modified:**
- `app/convex/__tests__/passwordAuth.test.ts`

**Dependencies:** Cycle 2.1

---

### Cycle 3.2: Invalid Password Rejection

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

it("should reject sign-in with incorrect password", async () => {
  const t = convexTest(schema);

  // Register user
  await t.mutation(api.auth.signIn, {
    provider: "password",
    params: {
      username: "secureuser",
      password: "correctpassword",
      flow: "signUp",
    },
  });

  // Attempt sign-in with wrong password
  await expect(
    t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "secureuser",
        password: "wrongpassword",
        flow: "signIn",
      },
    })
  ).rejects.toThrow(/invalid.*credentials/i);
});
```

**GREEN - Minimal Implementation:**
- Convex Auth handles password verification
- Verify error message format

**Files Modified:**
- `app/convex/__tests__/passwordAuth.test.ts`

**Dependencies:** Cycle 3.1

---

### Cycle 3.3: Non-Existent Username Rejection

**RED - Test First:**
```typescript
// Add to: app/convex/__tests__/passwordAuth.test.ts

it("should reject sign-in with non-existent username", async () => {
  const t = convexTest(schema);

  await expect(
    t.mutation(api.auth.signIn, {
      provider: "password",
      params: {
        username: "nonexistent",
        password: "anypassword",
        flow: "signIn",
      },
    })
  ).rejects.toThrow(/invalid.*credentials/i);
});
```

**GREEN - Minimal Implementation:**
- Convex Auth handles this
- Verify error message doesn't reveal whether username exists (security)

**Files Modified:**
- `app/convex/__tests__/passwordAuth.test.ts`

**Dependencies:** Cycle 3.1

---

## Phase 4: Backend - User Query Enhancement

### Cycle 4.1: Get User by Username

**RED - Test First:**
```typescript
// File: app/convex/__tests__/passwordAuth.test.ts

describe("User Queries", () => {
  it("should get user by username", async () => {
    const t = convexTest(schema);

    // Create user directly in DB
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        username: "queryuser",
        isAnonymous: false,
      });
    });

    // Query by username
    const user = await t.query(api.users.getByUsername, {
      username: "queryuser",
    });

    expect(user).not.toBeNull();
    expect(user?.username).toBe("queryuser");
  });

  it("should return null for non-existent username", async () => {
    const t = convexTest(schema);

    const user = await t.query(api.users.getByUsername, {
      username: "doesnotexist",
    });

    expect(user).toBeNull();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/convex/users.ts (NEW or MODIFY)

import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByUsername = query({
  args: {
    username: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      username: v.optional(v.string()),
      isAnonymous: v.optional(v.boolean()),
      // ... other user fields
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    return user;
  },
});
```

**Files Created/Modified:**
- `app/convex/users.ts` (NEW or MODIFY)
- `app/convex/__tests__/passwordAuth.test.ts`

**Dependencies:** Cycle 1.2

**Notes:**
- This function is for validation/debugging
- Not exposed to frontend (internal use)

---

## Phase 5: Frontend - Page Structure Setup

**Note:** Using Next.js App Router with page-based navigation for better UX, deep linking, and future email link routing.

### Cycle 5.0: Install ShadCN Components

**No test - this is setup:**
```bash
cd app
npx shadcn@latest add form input label
```

**Files Created:**
- `app/src/components/ui/form.tsx`
- `app/src/components/ui/input.tsx`
- `app/src/components/ui/label.tsx`

**Dependencies:** None

---

### Cycle 5.1: Create Landing Page (Root Route)

**RED - Test First:**
```typescript
// File: app/src/app/__tests__/landing-page.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LandingPage from "../page";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  Authenticated: () => null,
  Unauthenticated: ({ children }: any) => children,
}));

describe("Landing Page", () => {
  it("should render welcome message for unauthenticated users", () => {
    render(<LandingPage />);

    expect(screen.getByText(/artifact review/i)).toBeInTheDocument();
  });

  it("should show links to login and register", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create account/i })).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/app/page.tsx (MODIFY)

"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Authenticated>
        {/* Redirect to dashboard if authenticated */}
        {router.push("/dashboard")}
      </Authenticated>

      <Unauthenticated>
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Artifact Review</CardTitle>
            <CardDescription>
              Collaborative review for AI-generated artifacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">Create Account</Button>
            </Link>
          </CardContent>
        </Card>
      </Unauthenticated>
    </main>
  );
}
```

**Files Modified:**
- `app/src/app/page.tsx`
- `app/src/app/__tests__/landing-page.test.tsx` (NEW)

**Dependencies:** Cycle 5.0

---

### Cycle 5.2: Registration Form Rendering

**RED - Test First:**
```typescript
// File: app/src/components/auth/__tests__/RegisterForm.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RegisterForm } from "../RegisterForm";

describe("RegisterForm", () => {
  it("should render username input", () => {
    render(<RegisterForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it("should render password input", () => {
    render(<RegisterForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("should render confirm password input", () => {
    render(<RegisterForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("should render register button", () => {
    render(<RegisterForm onSuccess={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /register/i })
    ).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/components/auth/RegisterForm.tsx (NEW)

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RegisterFormProps {
  onSuccess: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit">Register</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Files Created:**
- `app/src/components/auth/RegisterForm.tsx`
- `app/src/components/auth/__tests__/RegisterForm.test.tsx`

**Dependencies:** Cycle 5.0

---

### Cycle 5.2: Registration Form Submission

**RED - Test First:**
```typescript
// Add to: app/src/components/auth/__tests__/RegisterForm.test.tsx

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should call onSuccess when form is submitted with valid data", async () => {
  const user = userEvent.setup();
  const handleSuccess = vi.fn();

  render(<RegisterForm onSuccess={handleSuccess} />);

  await user.type(screen.getByLabelText(/username/i), "testuser");
  await user.type(screen.getByLabelText(/^password$/i), "password123");
  await user.type(screen.getByLabelText(/confirm password/i), "password123");

  await user.click(screen.getByRole("button", { name: /register/i }));

  await waitFor(() => {
    expect(handleSuccess).toHaveBeenCalled();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// Update: app/src/components/auth/RegisterForm.tsx

import { useAuthActions } from "@convex-dev/auth/react";

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signIn } = useAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn("password", {
        username,
        password,
        flow: "signUp",
      });
      onSuccess();
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... form JSX with onSubmit={handleSubmit}
  );
}
```

**Files Modified:**
- `app/src/components/auth/RegisterForm.tsx`
- `app/src/components/auth/__tests__/RegisterForm.test.tsx`

**Dependencies:** Cycle 5.1

---

### Cycle 5.3: Registration Form Validation

**RED - Test First:**
```typescript
// Add to: app/src/components/auth/__tests__/RegisterForm.test.tsx

it("should show error when passwords don't match", async () => {
  const user = userEvent.setup();
  render(<RegisterForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText(/username/i), "testuser");
  await user.type(screen.getByLabelText(/^password$/i), "password123");
  await user.type(screen.getByLabelText(/confirm password/i), "different");

  await user.click(screen.getByRole("button", { name: /register/i }));

  expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument();
});

it("should show error for short username", async () => {
  const user = userEvent.setup();
  render(<RegisterForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText(/username/i), "ab");
  await user.click(screen.getByRole("button", { name: /register/i }));

  expect(
    await screen.findByText(/username must be.*3.*characters/i)
  ).toBeInTheDocument();
});

it("should show error for short password", async () => {
  const user = userEvent.setup();
  render(<RegisterForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText(/username/i), "testuser");
  await user.type(screen.getByLabelText(/^password$/i), "short");
  await user.type(screen.getByLabelText(/confirm password/i), "short");
  await user.click(screen.getByRole("button", { name: /register/i }));

  expect(
    await screen.findByText(/password must be.*8.*characters/i)
  ).toBeInTheDocument();
});
```

**GREEN - Minimal Implementation:**
```typescript
// Update: app/src/components/auth/RegisterForm.tsx

const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  // Client-side validation
  if (username.length < 3 || username.length > 20) {
    setError("Username must be 3-20 characters");
    return;
  }

  if (password.length < 8) {
    setError("Password must be at least 8 characters");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords must match");
    return;
  }

  // ... rest of submission logic
};

// Add error display in JSX
{error && <p className="text-sm text-destructive">{error}</p>}
```

**Files Modified:**
- `app/src/components/auth/RegisterForm.tsx`
- `app/src/components/auth/__tests__/RegisterForm.test.tsx`

**Dependencies:** Cycle 5.2

---

## Phase 6: Frontend - Registration Page

### Cycle 6.1: Create Registration Page Route

**RED - Test First:**
```typescript
// File: app/src/app/register/__tests__/page.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RegisterPage from "../page";

vi.mock("@convex-dev/auth/react", () => ({
  Authenticated: () => null,
  Unauthenticated: ({ children }: any) => children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Register Page", () => {
  it("should render registration form", () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("should show link to login page", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("link", { name: /already have.*account/i })).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/app/register/page.tsx (NEW)

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "@convex-dev/auth/react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Authenticated>
        {/* Redirect to dashboard if already authenticated */}
        {router.push("/dashboard")}
      </Authenticated>

      <Unauthenticated>
        <div className="space-y-4">
          <RegisterForm onSuccess={() => router.push("/dashboard")} />
          <Card className="w-[400px]">
            <CardContent className="pt-6 text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                Already have an account? Sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </main>
  );
}
```

**Files Created:**
- `app/src/app/register/page.tsx`
- `app/src/app/register/__tests__/page.test.tsx`

**Dependencies:** Cycle 5.3 (RegisterForm component)

---

## Phase 7: Frontend - Login Page

### Cycle 7.1: Create Login Page Route

**RED - Test First:**
```typescript
// File: app/src/app/login/__tests__/page.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "../page";

vi.mock("@convex-dev/auth/react", () => ({
  Authenticated: () => null,
  Unauthenticated: ({ children }: any) => children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Login Page", () => {
  it("should render login form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should show link to register page", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: /need.*account/i })).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/app/login/page.tsx (NEW)

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "@convex-dev/auth/react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Authenticated>
        {/* Redirect to dashboard if already authenticated */}
        {router.push("/dashboard")}
      </Authenticated>

      <Unauthenticated>
        <div className="space-y-4">
          <LoginForm onSuccess={() => router.push("/dashboard")} />
          <Card className="w-[400px]">
            <CardContent className="pt-6 text-center">
              <Link href="/register" className="text-sm text-muted-foreground hover:underline">
                Need an account? Register
              </Link>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </main>
  );
}
```

**Files Created:**
- `app/src/app/login/page.tsx`
- `app/src/app/login/__tests__/page.test.tsx`

**Dependencies:** Cycle 5.2 (LoginForm rendering test exists)

---

### Cycle 7.2: LoginForm Component Rendering

**RED - Test First:**
```typescript
// File: app/src/components/auth/__tests__/LoginForm.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "../LoginForm";

describe("LoginForm", () => {
  it("should render username input", () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it("should render password input", () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should render sign in button", () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/components/auth/LoginForm.tsx (NEW)

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit">Sign In</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Files Created:**
- `app/src/components/auth/LoginForm.tsx`
- `app/src/components/auth/__tests__/LoginForm.test.tsx`

**Dependencies:** Cycle 7.1

---

### Cycle 7.3: Login Form Submission

**RED - Test First:**
```typescript
// Add to: app/src/components/auth/__tests__/LoginForm.test.tsx

import userEvent from "@testing-library/user-event";
import { waitFor } from "@testing-library/react";

it("should call onSuccess when form is submitted", async () => {
  const user = userEvent.setup();
  const handleSuccess = vi.fn();

  render(<LoginForm onSuccess={handleSuccess} />);

  await user.type(screen.getByLabelText(/username/i), "testuser");
  await user.type(screen.getByLabelText(/password/i), "password123");

  await user.click(screen.getByRole("button", { name: /sign in/i }));

  await waitFor(() => {
    expect(handleSuccess).toHaveBeenCalled();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// Update: app/src/components/auth/LoginForm.tsx

import { useAuthActions } from "@convex-dev/auth/react";

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn("password", {
        username,
        password,
        flow: "signIn",
      });
      onSuccess();
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... form JSX with onSubmit={handleSubmit}
  );
}
```

**Files Modified:**
- `app/src/components/auth/LoginForm.tsx`
- `app/src/components/auth/__tests__/LoginForm.test.tsx`

**Dependencies:** Cycle 7.2

---

### Cycle 7.4: Login Form Error Handling

**RED - Test First:**
```typescript
// Add to: app/src/components/auth/__tests__/LoginForm.test.tsx

it("should show error for invalid credentials", async () => {
  const user = userEvent.setup();
  render(<LoginForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText(/username/i), "baduser");
  await user.type(screen.getByLabelText(/password/i), "wrongpass");

  await user.click(screen.getByRole("button", { name: /sign in/i }));

  expect(
    await screen.findByText(/invalid username or password/i)
  ).toBeInTheDocument();
});
```

**GREEN - Minimal Implementation:**
```typescript
// Update: app/src/components/auth/LoginForm.tsx

const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    await signIn("password", {
      username,
      password,
      flow: "signIn",
    });
    onSuccess();
  } catch (error) {
    setError("Invalid username or password");
  } finally {
    setIsLoading(false);
  }
};

// Add error display in JSX
{error && <p className="text-sm text-destructive">{error}</p>}
```

**Files Modified:**
- `app/src/components/auth/LoginForm.tsx`
- `app/src/components/auth/__tests__/LoginForm.test.tsx`

**Dependencies:** Cycle 7.3

---

## Phase 8: Frontend - Dashboard Page

### Cycle 8.1: Create Dashboard Page Route

**RED - Test First:**
```typescript
// File: app/src/app/dashboard/__tests__/page.test.tsx (NEW)

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardPage from "../page";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  Authenticated: ({ children }: any) => children,
  Unauthenticated: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Dashboard Page", () => {
  it("should show username for password-authenticated user", () => {
    const { useQuery } = require("convex/react");
    useQuery.mockReturnValue({
      _id: "user123",
      username: "johndoe",
      isAnonymous: false,
    });

    render(<DashboardPage />);

    expect(screen.getByText(/signed in as @johndoe/i)).toBeInTheDocument();
  });

  it("should show anonymous session for anonymous user", () => {
    const { useQuery } = require("convex/react");
    useQuery.mockReturnValue({
      _id: "user123",
      isAnonymous: true,
    });

    render(<DashboardPage />);

    expect(screen.getByText(/anonymous session/i)).toBeInTheDocument();
  });

  it("should show sign out button", () => {
    const { useQuery } = require("convex/react");
    useQuery.mockReturnValue({
      _id: "user123",
      username: "johndoe",
      isAnonymous: false,
    });

    render(<DashboardPage />);

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
```

**GREEN - Minimal Implementation:**
```typescript
// File: app/src/app/dashboard/page.tsx (NEW)

"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Unauthenticated>
        {/* Redirect to landing if not authenticated */}
        {router.push("/")}
      </Unauthenticated>

      <Authenticated>
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Welcome to Artifact Review</CardTitle>
            <CardDescription>
              {currentUser?.username
                ? `Signed in as @${currentUser.username}`
                : "Anonymous session"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </Authenticated>
    </main>
  );
}
```

**Files Created:**
- `app/src/app/dashboard/page.tsx`
- `app/src/app/dashboard/__tests__/page.test.tsx`

**Dependencies:** None (can be done in parallel with forms)

---

## Phase 9: Structured Logging

### Cycle 9.1: Add Logging to Backend Functions

**No tests - logging is observability, not behavior:**

1. Check if logger exists in convex/lib/logger.ts
2. If not, create simple logger based on logging guide
3. Add logging to auth functions

```typescript
// File: app/convex/lib/logger.ts (CREATE if needed)

export const Topics = {
  Auth: "AUTH",
  User: "USER",
  System: "SYSTEM",
} as const;

export function createLogger(context: string) {
  return {
    info: (topic: string, message: string, metadata?: any) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        topic,
        context,
        message,
        metadata,
      }));
    },
    // ... error, warn, debug
  };
}
```

**Files Created/Modified:**
- `app/convex/lib/logger.ts` (NEW)
- `app/convex/auth.ts` (add logging)

**Dependencies:** None (can be done anytime)

---

### Cycle 9.2: Add Logging to Frontend Components

**No tests - logging is observability:**

1. Check if logger exists in src/lib/logger.ts
2. If not, create simple logger based on logging guide
3. Add logging to RegisterForm and LoginForm

```typescript
// In RegisterForm and LoginForm
import { logger, LOG_TOPICS } from '@/lib/logger';

logger.info(LOG_TOPICS.Auth, 'RegisterForm', 'Registration attempt', {
  username
});

logger.error(LOG_TOPICS.Auth, 'RegisterForm', 'Registration failed', {
  error: error.message
});
```

**Files Created/Modified:**
- `app/src/lib/logger.ts` (NEW if needed)
- `app/src/components/auth/RegisterForm.tsx`
- `app/src/components/auth/LoginForm.tsx`

**Dependencies:** None

---

## Phase 10: E2E Testing

### Cycle 10.1: Setup E2E Test Structure

**No test - this is setup:**
```bash
cd tasks/00007-password-authentication
mkdir -p tests/e2e tests/validation-videos

cd tests
cat > package.json << 'EOF'
{
  "name": "task-00007-tests",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.57.0"
  }
}
EOF

# Create playwright.config.ts
# Install dependencies
npm install
```

**Files Created:**
- `tasks/00007-password-authentication/tests/package.json`
- `tasks/00007-password-authentication/tests/playwright.config.ts`

**Dependencies:** None

---

### Cycle 10.2: E2E Test - Registration Flow

**RED - Test First:**
```typescript
// File: tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Password Authentication', () => {
  test('should register new user and navigate to dashboard', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto('/');

    // 2. Verify landing page loaded
    await page.waitForSelector('text=Artifact Review');

    // 3. Click to navigate to registration page
    await page.click('text=Create Account');

    // 4. Verify on registration page
    await expect(page).toHaveURL('/register');

    // 5. Fill registration form
    await page.fill('[id="username"]', 'e2euser');
    await page.fill('[id="password"]', 'password123');
    await page.fill('[id="confirmPassword"]', 'password123');

    // 6. Submit registration
    await page.click('button:has-text("Register")');

    // 7. Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // 8. Verify username is shown
    await expect(page.getByText(/signed in as @e2euser/i)).toBeVisible();

    // 9. Sign out
    await page.click('button:has-text("Sign Out")');

    // 10. Verify redirected to landing page
    await expect(page).toHaveURL('/');
  });
});
```

**GREEN - Run test and make it pass:**
- Ensure all components are integrated correctly
- Fix any issues found by E2E test

**Files Created:**
- `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts`

**Dependencies:** Phase 8

---

### Cycle 10.3: E2E Test - Login Flow

**RED - Test First:**
```typescript
// Add to: tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts

test('should sign in with existing user via login page', async ({ page }) => {
  // 1. Register a user first
  await page.goto('/register');
  await page.fill('[id="username"]', 'logintest');
  await page.fill('[id="password"]', 'password123');
  await page.fill('[id="confirmPassword"]', 'password123');
  await page.click('button:has-text("Register")');
  await expect(page).toHaveURL('/dashboard');

  // 2. Sign out
  await page.click('button:has-text("Sign Out")');
  await expect(page).toHaveURL('/');

  // 3. Navigate to login page
  await page.click('text=Sign In');
  await expect(page).toHaveURL('/login');

  // 4. Sign in with same credentials
  await page.fill('[id="username"]', 'logintest');
  await page.fill('[id="password"]', 'password123');
  await page.click('button:has-text("Sign In")');

  // 5. Verify authenticated and redirected
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(/signed in as @logintest/i)).toBeVisible();

  // 6. Refresh page to test session persistence
  await page.reload();
  await expect(page).toHaveURL('/dashboard');

  // 7. Verify still signed in
  await expect(page.getByText(/signed in as @logintest/i)).toBeVisible();
});
```

**GREEN - Run test and make it pass:**
- Verify session persistence works
- Fix any issues

**Files Modified:**
- `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts`

**Dependencies:** Cycle 10.2

---

### Cycle 10.4: E2E Test - Error Cases

**RED - Test First:**
```typescript
// Add to: tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts

test('should show error for invalid login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[id="username"]', 'nonexistent');
  await page.fill('[id="password"]', 'wrongpass');
  await page.click('button:has-text("Sign In")');

  await expect(
    page.getByText(/invalid username or password/i)
  ).toBeVisible();

  // Verify stayed on login page
  await expect(page).toHaveURL('/login');
});

test('should show error for duplicate username', async ({ page }) => {
  // Register first user
  await page.goto('/register');
  await page.fill('[id="username"]', 'duplicate');
  await page.fill('[id="password"]', 'password123');
  await page.fill('[id="confirmPassword"]', 'password123');
  await page.click('button:has-text("Register")');
  await expect(page).toHaveURL('/dashboard');
  await page.click('button:has-text("Sign Out")');

  // Try to register same username
  await page.goto('/register');
  await page.fill('[id="username"]', 'duplicate');
  await page.fill('[id="password"]', 'password456');
  await page.fill('[id="confirmPassword"]', 'password456');
  await page.click('button:has-text("Register")');

  await expect(
    page.getByText(/username.*already.*exists/i)
  ).toBeVisible();

  // Verify stayed on register page
  await expect(page).toHaveURL('/register');
});

test('should support deep linking to login and register pages', async ({ page }) => {
  // Direct navigation to login page
  await page.goto('/login');
  await expect(page.getByLabelText(/username/i)).toBeInTheDocument();

  // Direct navigation to register page
  await page.goto('/register');
  await expect(page.getByLabelText(/confirm password/i)).toBeInTheDocument();
});
```

**GREEN - Run test and make it pass:**
- Ensure error handling works correctly

**Files Modified:**
- `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts`

**Dependencies:** Cycle 10.3

---

### Cycle 10.5: Generate Validation Trace

**No test - this is validation artifact:**
```bash
cd tasks/00007-password-authentication/tests

# Run tests (generates trace.zip automatically)
npx playwright test

# Copy trace to validation-videos/
cp test-results/*/trace.zip validation-videos/password-auth-trace.zip

# Verify trace works
npx playwright show-trace validation-videos/password-auth-trace.zip
```

**Files Created:**
- `tasks/00007-password-authentication/tests/validation-videos/password-auth-trace.zip`

**Dependencies:** Cycle 10.4

---

## Phase 11: Test Report & Documentation

### Final Step: Create Test Report

**No test - this is documentation:**

Create comprehensive test report documenting:
- All tests written (backend + frontend + E2E)
- Test coverage achieved
- Acceptance criteria mapping
- Known limitations
- Commands to run tests

**File Created:**
- `tasks/00007-password-authentication/test-report.md`

**Dependencies:** All previous cycles complete

---

## Summary of Files

### New Files Created

**Backend:**
- `app/convex/__tests__/passwordAuth.test.ts`
- `app/convex/users.ts` (if doesn't exist)
- `app/convex/lib/logger.ts` (if doesn't exist)

**Frontend Pages:**
- `app/src/app/login/page.tsx` - Login page route
- `app/src/app/login/__tests__/page.test.tsx`
- `app/src/app/register/page.tsx` - Registration page route
- `app/src/app/register/__tests__/page.test.tsx`
- `app/src/app/dashboard/page.tsx` - Dashboard page route
- `app/src/app/dashboard/__tests__/page.test.tsx`
- `app/src/app/__tests__/landing-page.test.tsx` - Landing page tests

**Frontend Components:**
- `app/src/components/auth/RegisterForm.tsx`
- `app/src/components/auth/LoginForm.tsx`
- `app/src/components/auth/__tests__/RegisterForm.test.tsx`
- `app/src/components/auth/__tests__/LoginForm.test.tsx`
- `app/src/lib/logger.ts` (if doesn't exist)

**ShadCN UI:**
- `app/src/components/ui/form.tsx` (ShadCN)
- `app/src/components/ui/input.tsx` (ShadCN)
- `app/src/components/ui/label.tsx` (ShadCN)

**E2E:**
- `tasks/00007-password-authentication/tests/package.json`
- `tasks/00007-password-authentication/tests/playwright.config.ts`
- `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts`
- `tasks/00007-password-authentication/tests/validation-videos/password-auth-trace.zip`

**Documentation:**
- `tasks/00007-password-authentication/test-report.md`

### Modified Files

**Backend:**
- `app/convex/schema.ts` - Add username index
- `app/convex/auth.ts` - Possibly configure Password provider (may already be done)

**Frontend:**
- `app/src/app/page.tsx` - Update landing page with navigation links to /login and /register

---

## Dependency Graph

```
Phase 1 (Schema)
  └─> Phase 2 (Backend Registration)
       └─> Phase 3 (Backend Sign-In)
            └─> Phase 10 (E2E Tests)

Phase 4 (User Query) - Independent, can be done anytime

Phase 5 (Page Structure Setup)
  ├─> 5.0 Install ShadCN components
  ├─> 5.1 Landing page (/)
  ├─> 5.2 RegisterForm component
  └─> 5.3 RegisterForm validation

Phase 6 (Registration Page)
  └─> Depends on Phase 5.2, 5.3
       └─> 6.1 /register page route

Phase 7 (Login Page)
  ├─> 7.1 /login page route
  ├─> 7.2 LoginForm component
  ├─> 7.3 LoginForm submission
  └─> 7.4 LoginForm error handling

Phase 8 (Dashboard Page)
  └─> 8.1 /dashboard page route (independent)

Phase 9 (Logging) - Independent, can be done anytime

Phase 10 (E2E) - Depends on Phases 2, 3, 5, 6, 7, 8
  ├─> 10.1 Setup E2E infrastructure
  ├─> 10.2 Registration flow test (navigates /, /register, /dashboard)
  ├─> 10.3 Login flow test (navigates /login, /dashboard)
  ├─> 10.4 Error cases + deep linking
  └─> 10.5 Generate validation trace

Phase 11 (Report) - Depends on all tests passing

**Key Routing Benefits:**
- Deep linking support: Can link directly to /login or /register
- Email link routing ready: Future password reset links can route to specific pages
- Browser back button works naturally
- Better UX: Clear URL indicates user's location
- Easier testing: Can navigate directly to pages in E2E tests
```

---

## Risks & Unknowns

### High Risk

1. **Convex Auth Password Provider Configuration**
   - **Risk:** May need specific configuration for username-based auth
   - **Mitigation:** Check Convex Auth docs early, write minimal test first
   - **Impact:** Could block Phase 2

2. **ShadCN Form Component**
   - **Risk:** Form component may have complex API we're not familiar with
   - **Mitigation:** Start with simple Input/Label, add Form wrapper later if needed
   - **Impact:** May need to simplify form implementation

3. **authTables Schema Structure**
   - **Risk:** May already have username field, or may conflict with custom definition
   - **Mitigation:** Inspect schema early in Phase 1
   - **Impact:** Could require schema refactor

### Medium Risk

1. **Frontend Test Setup**
   - **Risk:** React Testing Library may need mocking for Convex hooks
   - **Mitigation:** Follow existing test pattern from users.test.ts
   - **Impact:** Slower test writing in Phase 5-6

2. **Password Hashing Verification**
   - **Risk:** Can't directly test password hashing in convex-test
   - **Mitigation:** Trust Convex Auth implementation, test behavior only
   - **Impact:** No direct test for password security

3. **E2E Test Timing**
   - **Risk:** Authentication state changes may have timing issues
   - **Mitigation:** Use waitForSelector, generous timeouts
   - **Impact:** Flaky tests that need retry logic

### Low Risk

1. **Logger Implementation**
   - **Risk:** Logger may not exist yet
   - **Mitigation:** Simple console.log wrapper works for MVP
   - **Impact:** Easy to implement, low complexity

2. **Validation Error Messages**
   - **Risk:** Convex Auth error messages may not match expected format
   - **Mitigation:** Adjust test expectations to match actual errors
   - **Impact:** Test updates only

---

## Open Questions

1. **Does Convex Auth Password provider require specific configuration for username-based auth?**
   - Need to check: https://labs.convex.dev/auth/config/passwords
   - Answer determines Phase 2 implementation

2. **Does authTables already include username field?**
   - Need to inspect: convex-dev/auth package source or docs
   - Answer affects Phase 1 schema changes

3. **Should we use react-hook-form with ShadCN Form component?**
   - Simpler: Plain controlled inputs
   - More robust: react-hook-form + zod validation
   - Decision: Start simple, refactor later if needed

4. **Do we need case-insensitive username matching?**
   - Requirement says "username only" but doesn't specify case sensitivity
   - Decision: Implement case-sensitive first (simpler), add case-insensitive later if requested

5. **Should registration auto-sign-in the user?**
   - Assumption: Yes (better UX)
   - Convex Auth likely handles this automatically
   - Verify in Phase 2

---

## Test Execution Strategy

### Running Tests During Development

**Backend Tests (Fast - Run Often):**
```bash
cd app
npx vitest run convex/__tests__/passwordAuth.test.ts --watch
```

**Frontend Tests (Fast - Run Often):**
```bash
cd app
npx vitest run src/components/auth/__tests__/ --watch
```

**E2E Tests (Slow - Run at Milestones):**
```bash
cd tasks/00007-password-authentication/tests
npx playwright test --headed
```

### Test Milestones

1. **Phase 1-3 Complete:** All backend tests passing
2. **Phase 5-6 Complete:** All frontend tests passing
3. **Phase 8 Complete:** Integration ready for E2E
4. **Phase 10 Complete:** All E2E tests passing, trace generated

---

## Success Criteria

### Functional Requirements

- [ ] User can register with unique username + password
- [ ] User can sign in with correct credentials
- [ ] Invalid credentials show appropriate error
- [ ] Passwords are securely hashed
- [ ] Session persists across page refreshes
- [ ] User can sign out successfully
- [ ] Duplicate username registration is prevented

### Technical Requirements

- [ ] All backend tests passing (passwordAuth.test.ts)
- [ ] All frontend tests passing (RegisterForm, LoginForm, page)
- [ ] E2E test with Playwright validating full flow
- [ ] Validation trace generated (trace.zip)
- [ ] Test report documenting coverage
- [ ] Structured logging throughout auth flow
- [ ] Code follows Convex rules (validators, args, returns)

### Deliverables

- [ ] Working password authentication feature
- [ ] Test suite (backend + frontend + E2E)
- [ ] Validation trace.zip
- [ ] Test report (test-report.md)
- [ ] Structured logging implemented
- [ ] All tests passing

---

## Time Estimates

| Phase | Cycles | Est. Time | Notes |
|-------|--------|-----------|-------|
| 1 - Schema | 2 | 30 min | Simple schema updates |
| 2 - Registration | 2 | 1 hour | May need Convex Auth docs |
| 3 - Sign-In | 3 | 1 hour | Testing edge cases |
| 4 - User Query | 1 | 30 min | Simple query function |
| 5 - Register Form | 4 | 2 hours | Includes validation, tests |
| 6 - Login Form | 3 | 1.5 hours | Simpler than registration |
| 7 - Dashboard | 1 | 30 min | Minimal changes |
| 8 - Integration | 1 | 30 min | Wire up components |
| 9 - Logging | 2 | 1 hour | Add structured logging |
| 10 - E2E | 5 | 2 hours | Includes trace generation |
| 11 - Report | 1 | 1 hour | Documentation |
| **TOTAL** | **25** | **12 hours** | With unknowns/debugging |

**Note:** Estimates assume familiarity with tech stack. Add 50% buffer for unknowns.

---

## Next Steps

**After Approval:**

1. Start with Phase 1, Cycle 1.1
2. Follow TDD strictly: RED → GREEN → REFACTOR
3. One test at a time, no batching
4. Update RESUME.md after each phase
5. Commit after each phase with descriptive message
6. Generate trace.zip after all E2E tests pass
7. Create test report when feature complete

**Before Starting:**
- Get approval on this plan
- Clarify any open questions
- Ensure dev environment is running
- Review Convex Auth Password docs

---

## Approval Checklist

Before proceeding with implementation, confirm:

- [ ] TDD approach is acceptable (test-first, one at a time)
- [ ] File structure and organization looks correct
- [ ] Test coverage is sufficient
- [ ] Dependency graph makes sense
- [ ] Risk mitigation strategies are sound
- [ ] Success criteria are clear
- [ ] Any open questions are resolved

---

**Plan Status:** Ready for Review
**Next Action:** Await approval to begin Phase 1, Cycle 1.1
