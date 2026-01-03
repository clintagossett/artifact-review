# Parallel Execution Plan

**Task:** 00014 - Settings Page Implementation
**Status:** Ready for parallel execution
**Date:** 2025-12-27

---

## Overview

The implementation has been split into 3 subtasks that can be worked on in parallel by different agents.

```
┌─────────────────────────────────────────────────────────┐
│  Subtask 01: Architecture & Planning                   │
│  Status: ✅ COMPLETE                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Subtask 02:         │         │  Subtask 03:         │
│  Backend Settings    │◄────────│  Frontend Settings   │
│  API                 │         │  Page UI             │
│                      │         │                      │
│  Agent: TDD          │         │  Agent: TDD/Frontend │
│  Type: Convex        │         │  Type: React/Next.js │
│  Complexity: Medium  │         │  Complexity: Medium  │
│  Status: READY       │         │  Status: READY*      │
└──────────────────────┘         └──────────────────────┘
        │                                   │
        │                                   │
        │                         ┌─────────▼──────────┐
        │                         │  Subtask 04:       │
        └─────────────────────────┤  Frontend Forgot   │
                                  │  Password Flow     │
                                  │                    │
                                  │  Agent: TDD/FE     │
                                  │  Type: React       │
                                  │  Complexity: Simple│
                                  │  Status: READY*    │
                                  └────────────────────┘

* Can start with mocked APIs, swap for real once 02 is complete
```

---

## Execution Strategy

### Option 1: Sequential (Single Agent)

**Timeline:** ~3-4 sessions
1. Session 1: Subtask 02 (Backend)
2. Session 2: Subtask 03 (Frontend Settings)
3. Session 3: Subtask 04 (Frontend Forgot Password)
4. Session 4: Integration testing & polish

### Option 2: Parallel (2 Agents)

**Timeline:** ~2 sessions

**Agent A (TDD - Backend):**
1. Start subtask 02 immediately
2. Complete all backend functions

**Agent B (TDD/Frontend):**
1. Start subtask 03 with mocked APIs
2. Build UI and components
3. Once Agent A completes, swap mocks for real APIs
4. Move to subtask 04

**Total time:** 2 sessions (with integration in session 2)

### Option 3: Parallel (3 Agents)

**Timeline:** ~1-2 sessions

**Agent A (TDD - Backend):**
- Subtask 02: Backend Settings API

**Agent B (Frontend):**
- Subtask 03: Frontend Settings Page

**Agent C (Frontend):**
- Subtask 04: Frontend Forgot Password

**Total time:** 1-2 sessions (plus integration)

---

## Subtask Breakdown

### Subtask 02: Backend Settings API

**Directory:** `tasks/00014-settings-page-implementation/02-backend-settings-api/`

**Agent:** TDD Developer
**Can Start:** Immediately (no dependencies)

**Deliverables:**
| Function | Type | Description |
|----------|------|-------------|
| `settings.getGracePeriodStatus` | Query | Check grace period status |
| `users.updateName` | Mutation | Update user's name |
| `settings.changePassword` | Mutation | Change password with grace period |
| `settings.sendReauthMagicLink` | Action | Send re-auth magic link |

**Tests:** `app/convex/__tests__/settings.test.ts`

**Complexity:** Medium
- Requires research on Convex Auth password API
- Grace period calculation logic
- Session access

**Estimated Time:** 1 focused session

---

### Subtask 03: Frontend Settings Page UI

**Directory:** `tasks/00014-settings-page-implementation/03-frontend-settings-page/`

**Agent:** TDD Developer or Frontend Specialist
**Can Start:** With mocked APIs (parallel with 02)

**Deliverables:**
| Component | Description |
|-----------|-------------|
| `settings/page.tsx` | Settings route |
| `AccountInfoSection.tsx` | Account info UI |
| `PasswordSection.tsx` | Password change form |
| `GracePeriodBanner.tsx` | Fresh/stale banners |
| `DebugToggle.tsx` | Dev-only debug controls |
| `useGracePeriod.ts` | Grace period hook |

**Critical:**
- **Reuse `PasswordStrengthIndicator`** from RegisterForm
- **Match password validation** exactly (8 chars, number, letter)
- **Debug toggle only in development**

**Tests:** `app/src/__tests__/settings/*.test.tsx`

**Complexity:** Medium
- Multiple interconnected components
- Grace period timer logic
- Conditional UI based on state

**Estimated Time:** 1 focused session

---

### Subtask 04: Frontend Forgot Password Flow

**Directory:** `tasks/00014-settings-page-implementation/04-frontend-forgot-password/`

**Agent:** TDD Developer or Frontend Specialist
**Can Start:** In parallel with 02 & 03

**Deliverables:**
| Component | Description |
|-----------|-------------|
| `forgot-password/page.tsx` | Forgot password route |
| `ForgotPasswordForm.tsx` | Email input & instructions |
| Update `LoginForm.tsx` | Add "Forgot password?" link |

**Critical:**
- Reuses standard magic link (no custom email)
- Redirects to `/settings` after auth
- Clear step-by-step instructions for users

**Tests:** `app/src/__tests__/auth/ForgotPassword*.test.tsx`

**Complexity:** Simple
- Single form component
- Uses existing magic link infrastructure
- Straightforward flow

**Estimated Time:** 0.5-1 session

---

## API Dependencies

### Frontend → Backend

Subtasks 03 & 04 depend on these APIs from Subtask 02:

| Frontend Component | Backend API |
|--------------------|-------------|
| AccountInfoSection | `api.users.getCurrentUser` (exists) |
| AccountInfoSection | `api.users.updateName` (new) |
| useGracePeriod hook | `api.settings.getGracePeriodStatus` (new) |
| PasswordSection | `api.settings.changePassword` (new) |
| GracePeriodBanner | `api.settings.sendReauthMagicLink` (new) |
| ForgotPasswordForm | Uses `signIn("resend")` (exists) |

**Mocking Strategy:**

Frontend can start with mocked responses:

```typescript
// Mock during development
const mockGracePeriodStatus = {
  isWithinGracePeriod: true,
  expiresAt: Date.now() + 15 * 60 * 1000,
  sessionCreatedAt: Date.now(),
};

// Swap for real API when backend ready
const gracePeriodStatus = useQuery(api.settings.getGracePeriodStatus);
```

---

## Technical Investigations

### Before Starting Subtask 02 (Backend)

Research required:
1. **Convex Auth Session API**
   - Verify `getAuthSessionId()` function
   - Test accessing `authSessions` table
   - Confirm session structure

2. **Convex Auth Password API**
   - How to verify current password
   - How to update password hash
   - Options: Internal API vs direct table access

**Time:** 15-30 minutes research

---

## Integration Point

### After All Subtasks Complete

**Integration Session:**
1. Remove mocked APIs from frontend
2. Test full flow end-to-end:
   - Name update
   - Password change (fresh state)
   - Password change (stale state)
   - Magic link re-auth
   - Forgot password flow
3. Manual testing checklist
4. Create validation videos for each flow
5. Update task README with completion status

**Estimated Time:** 0.5-1 session

---

## Recommended Approach

**For maximum speed:** Option 2 (2 agents in parallel)

1. **Launch TDD Agent for Backend** (Subtask 02)
   - Handles all Convex work
   - Researches password APIs
   - Completes in 1 session

2. **Launch Frontend Agent** (Subtasks 03 & 04)
   - Starts with mocked APIs
   - Builds all UI components
   - Swaps mocks for real APIs when backend ready
   - Completes both subtasks in 1-1.5 sessions

3. **Integration** (0.5 sessions)
   - Connect frontend to backend
   - E2E testing
   - Validation videos

**Total Timeline:** 2-3 sessions vs 4-5 sequential sessions

---

## Handoff Checklist

### For Backend Agent (Subtask 02)

- [ ] `tasks/00014-settings-page-implementation/02-backend-settings-api/README.md`
- [ ] `docs/architecture/convex-rules.md`
- [ ] `tasks/00014-settings-page-implementation/01-architecture-phased-planning/ARCHITECTURE.md`
- [ ] `app/convex/auth.ts` (existing code reference)

### For Frontend Agent (Subtasks 03 & 04)

- [ ] `tasks/00014-settings-page-implementation/03-frontend-settings-page/README.md`
- [ ] `tasks/00014-settings-page-implementation/04-frontend-forgot-password/README.md`
- [ ] `tasks/00014-settings-page-implementation/01-architecture-phased-planning/DECISIONS.md`
- [ ] `app/src/components/auth/RegisterForm.tsx` (password validation reference)
- [ ] `app/src/components/auth/PasswordStrengthIndicator.tsx` (reuse component)

---

## Success Metrics

- [ ] All backend functions implemented with >90% test coverage
- [ ] All frontend components implemented with tests
- [ ] Password validation matches RegisterForm exactly
- [ ] Grace period timer accurate to the second
- [ ] Debug toggle only in development
- [ ] E2E flows work correctly
- [ ] Validation videos created for each flow
- [ ] No console errors
- [ ] Mobile responsive

---

## Next Actions

**To start implementation:**

```bash
# Option 1: Start backend first
# Launch TDD agent with subtask 02

# Option 2: Start in parallel
# Launch TDD agent with subtask 02 (background)
# Launch Frontend agent with subtask 03 (background or sequential)
# Launch Frontend agent with subtask 04 (after 03 or parallel)
```

Choose your parallelization strategy and launch agents!
