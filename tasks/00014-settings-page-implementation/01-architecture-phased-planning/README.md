# Subtask 01: Architecture and Phased Planning

## Objective

Review the authentication design documentation and Figma reference implementation to create a comprehensive, phased implementation plan for the Settings page.

## Status

**COMPLETED** - 2025-12-27

## Scope Completed

The architect agent:
1. Reviewed `figma-designs/AUTHENTICATION.md` for the 15-minute grace period system
2. Reviewed `figma-designs/src/app/components/SettingsPage.tsx` for the UI design
3. Analyzed integration points with existing Convex backend (auth.ts, users.ts, schema.ts)
4. Created a phased implementation plan for:
   - Settings page UI components
   - Backend mutations and queries
   - Email templates
   - Forgot password flow
   - Testing strategy
5. Identified risks, dependencies, and technical decisions

## Deliverables

- [x] Architecture analysis document - [ARCHITECTURE.md](./ARCHITECTURE.md)
- [x] Phased implementation plan with clear milestones - [PHASED-PLAN.md](./PHASED-PLAN.md)
- [x] Technical decisions documented in ARCHITECTURE.md
- [x] Risk assessment in PHASED-PLAN.md
- [x] Integration points documented in ARCHITECTURE.md

## Key Findings

### Current Infrastructure
- Convex Auth already implemented with Password + Magic Link providers
- Session tracking via `authSessions` table (managed by Convex Auth)
- User management via extended `users` table
- Magic link emails via Resend (working)

### Architecture Decision: Server-Side Grace Period
- Grace period tied to session `_creationTime`, not user-level timestamp
- Server validates grace period status; client caches for UI
- Each session has independent grace period (multi-device friendly)

### Implementation Plan Summary
| Phase | Name | Complexity |
|-------|------|------------|
| 1 | Basic Settings Page Shell | Simple |
| 2 | Account Info Section | Simple |
| 3 | Grace Period Infrastructure | Medium |
| 4 | Password Change (Fresh Auth) | Medium |
| 5 | Password Change (Stale Auth) | Medium |
| 6 | Forgot Password Flow | Simple |

### Technical Investigations Needed
Before Phase 3-4:
1. Verify `getAuthSessionId` API from Convex Auth
2. Research password update mechanism in Convex Auth

## Open Questions (For User Decision)

1. **Email Template Approach** - Use distinct forgot password email or reuse standard magic link?
2. **Debug Toggle in Production** - Remove completely or feature flag?
3. **Password Strength Requirements** - Min 8 chars only, or add strength meter?

## Next Steps

1. Hand off to TDD Developer for Phase 1 implementation
2. Conduct technical research before Phase 3

## Files Created

- `ARCHITECTURE.md` - Full system design and technical decisions
- `PHASED-PLAN.md` - Detailed 6-phase implementation roadmap
