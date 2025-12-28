# Task 00018: Remove Unused User Fields (username, isAnonymous)

## Context

During schema documentation review, we discovered two unused fields in the `users` table that were planned but never fully implemented:
- `username` - Fully implemented infrastructure, zero actual usage
- `isAnonymous` - Partially implemented, no auth provider or business logic

## Research: Modern Apps Don't Need Usernames

### Key Findings

**Modern Pattern (Slack, Discord, Notion, Linear):**
- No unique usernames required
- Use **display names** (non-unique) + **email** for identity
- @mentions work via rich autocomplete → internal user IDs
- Slack deprecated usernames in 2017

**Legacy Pattern (GitHub, Twitter/X):**
- Still require unique usernames as public identifiers
- You @mention with `@username`
- Notifications route to email

### Why Modern Apps Don't Need Usernames

From Slack's 2017 API changelog:
> "Username advances made by Slack and Discord are only possible because they build rich text editors with embedded, autocompleted @mentions that don't rely on uniqueness of text tokens."

**Modern @mention flow (no username needed):**
1. User types `@john`
2. Autocomplete shows matching display names with context:
   - John Smith (john@company.com)
   - John Doe (john.doe@example.com)
3. User selects → stores internal `userId` in data
4. Renders as `@John Smith` in UI

**What you need for @mentions:**
- ✅ Display name (`users.name`)
- ✅ Email for uniqueness (`users.email`)
- ✅ Internal ID (`users._id`)
- ❌ Username (not needed)

### Sources
- [A lingering farewell to the username | Slack](https://api.slack.com/changelog/2017-09-the-one-about-usernames)
- [Identity Beyond Usernames – Lord.io](https://lord.io/usernames/)
- [Mention @somebody. They're notified. - The GitHub Blog](https://github.blog/2011-03-23-mention-somebody-they-re-notified/)
- [Slack – Linear Docs](https://linear.app/docs/slack)

## Current State Analysis

### `isAnonymous` Field

**Exists in:**
- ✅ `app/convex/schema.ts:102` - Schema definition
- ✅ `app/convex/users.ts` - Returned in all user queries (lines 45, 53, 94, 137)
- ✅ `app/convex/sharing.ts:379` - Included in return types
- ✅ Tests in `app/convex/__tests__/users.test.ts` (lines 22, 32, 41, 54)

**Missing/Unused:**
- ❌ No Convex Auth Anonymous provider configured
- ❌ No business logic checks `isAnonymous` for permissions
- ❌ Not used in any mutations for actual functionality
- ❌ No UI displays or uses this field

**Origin:** Task 00006 (local-dev-environment) planned anonymous auth but never completed the auth integration.

**Verdict:** Dead field - planned but never integrated.

### `username` Field

**Exists in:**
- ✅ `app/convex/schema.ts:114, 129` - Field + `by_username` index
- ✅ `app/convex/users.ts:99-137` - Complete `getByUsername` query function
- ✅ Tests in `app/convex/__tests__/passwordAuth.test.ts`
- ✅ One test helper auto-generates: `username: email.split("@")[0]` (task 15)

**Missing/Unused:**
- ❌ No UI displays username
- ❌ No mutation sets username (except test helpers)
- ❌ Not used for authentication (email-based instead)
- ❌ Not used for @mentions (as schema doc admits: "Not currently used in UI")

**Origin:** Task 00007 (password-authentication) pivoted from username auth to email auth mid-implementation but left the infrastructure in place.

**Verdict:** Fully implemented infrastructure with zero actual usage.

## Impact Analysis

### Safe to Remove

1. **`isAnonymous` field** - No auth provider, no logic depends on it
2. **`username` field** - No UI, no setters, helper can use `name` instead
3. **`by_username` index** - No queries use it (except one test)
4. **`getByUsername` query** - No callers in production code

### What Will Break

**Production Tests:** 10 test files in `app/convex/__tests__/` set `isAnonymous: false` in fixtures
- `app/convex/__tests__/artifacts-queries.test.ts`
- `app/convex/__tests__/artifacts.test.ts`
- `app/convex/__tests__/magicLinkAuth.test.ts`
- `app/convex/__tests__/passwordAuth.test.ts`
- `app/convex/__tests__/settings.test.ts`
- `app/convex/__tests__/sharing.test.ts`
- `app/convex/__tests__/softDeletion.test.ts`
- `app/convex/__tests__/users.test.ts`
- `app/convex/__tests__/zipProcessor.test.ts`
- `app/convex/__tests__/zipUpload.test.ts`

**Note:** Tests in `tasks/*/tests/` folders are historical records and NOT updated (off-limits unless working in that specific task).

**TypeScript:** Return types include these fields
- `users.ts` return types
- `sharing.ts` return types
- Frontend code expecting these fields (if any)

**Test Helper (if exists):**
- `app/convex/__tests__/task-15-version-management/helpers.ts` (if it exists outside tasks/)
- Currently generates: `username: email.split("@")[0]`
- Can switch to: `name: email.split("@")[0]` or just use email

### Database Considerations

**Production Data Check:**
- Need to verify if any production users have `isAnonymous: true`
- Need to verify if any production users have `username` values set
- If data exists, add migration note (fields will be ignored, not migrated)

## Implementation Plan

### Phase 1: Grep and Understand Full Impact

1. ✅ Already grepped for `isAnonymous` - found 100+ references
2. ✅ Already grepped for `username` - found 100+ references
3. ✅ Already grepped for `by_username` - found 9 references
4. Grep for TypeScript types that reference these fields
5. Grep for frontend components that might expect these fields

### Phase 2: Schema Changes

**Files to modify:**
1. `app/convex/schema.ts`
   - Remove `isAnonymous: v.optional(v.boolean())`
   - Remove `username: v.optional(v.string())`
   - Remove `.index("by_username", ["username"])`
   - Update JSDoc comments to remove references

2. `app/convex/users.ts`
   - Remove `isAnonymous` from all return types
   - Remove `username` from all return types
   - Remove `getByUsername` query function entirely (lines 99-137)

3. `app/convex/sharing.ts`
   - Remove `isAnonymous` from return types (line 379)
   - Remove `username` from return types (line 381)

### Phase 3: Test Fixture Updates

**Strategy:** Use find/replace to remove these fields from test fixtures

**Pattern to find:**
```typescript
isAnonymous: false,
isAnonymous: true,
username: "...",
```

**Files to update (10 production test files only):**
- `app/convex/__tests__/artifacts-queries.test.ts`
- `app/convex/__tests__/artifacts.test.ts`
- `app/convex/__tests__/magicLinkAuth.test.ts`
- `app/convex/__tests__/passwordAuth.test.ts`
- `app/convex/__tests__/settings.test.ts`
- `app/convex/__tests__/sharing.test.ts`
- `app/convex/__tests__/softDeletion.test.ts`
- `app/convex/__tests__/users.test.ts`
- `app/convex/__tests__/zipProcessor.test.ts`
- `app/convex/__tests__/zipUpload.test.ts`

**IMPORTANT:** Do NOT update any test files in `tasks/` folders - they are historical records and off-limits unless working in that specific task.

### Phase 4: Test Helper Updates (If Needed)

**Check if this file exists:**
- `app/convex/__tests__/task-15-version-management/helpers.ts`

**If it exists:**
- Change `username: email.split("@")[0]` to `name: email.split("@")[0]` or remove the field

**IMPORTANT:** Do NOT update `tasks/00015/.../helpers.ts` - it's in a task folder and off-limits.

### Phase 5: Remove Username-Specific Tests

**File to modify:**
- `app/convex/__tests__/passwordAuth.test.ts`
  - Remove tests that specifically test username functionality:
    - "should allow creating user with username and email"
    - "should query user by username using index"
    - "should get user by username"
    - "should return null for non-existent username"
  - Keep email-based tests

### Phase 6: Documentation Updates

1. Update `app/convex/schema.ts` JSDoc to remove all references to:
   - Anonymous users
   - Username field
   - `by_username` index
   - `getByUsername` query

2. Update any ADRs or docs that reference these fields (if any)

3. Update `CLAUDE.md` if it references username or anonymous auth

### Phase 7: Frontend Type Updates (If Needed)

**Check for:**
- TypeScript interfaces expecting `username` or `isAnonymous`
- React components reading these fields
- Forms or UI that might reference these fields

**Files to check:**
- `app/src/**/*.tsx`
- `app/src/**/*.ts`

### Phase 8: Run Full Test Suite

1. Run Convex backend tests: `cd app && npm test`
2. Check for any TypeScript compilation errors
3. Verify no references remain with grep

### Phase 9: Database Migration Note

**Create migration note documenting:**
- These fields exist in production DB but will be ignored
- No data migration needed (fields will remain in DB but unused)
- Future schema evolution will not include these fields
- If we ever need to clean the DB, fields can be safely removed

## Testing Strategy

### Unit Tests
- Update all test fixtures to remove `isAnonymous` and `username`
- Remove username-specific tests in `passwordAuth.test.ts`
- Verify remaining tests pass

### Integration Tests
- Verify user creation still works
- Verify email-based auth still works
- Verify sharing/reviewer invitations still work (they use email)

### Grep Verification
After implementation:
```bash
# Should return NO results in production code:
grep -r "isAnonymous" app/convex/*.ts
grep -r "username" app/convex/*.ts --exclude="*test.ts"
grep -r "by_username" app/convex/*.ts

# Should return NO results in production tests:
grep -r "isAnonymous" app/convex/__tests__/*.ts
grep -r "username" app/convex/__tests__/*.ts

# Historical tests in tasks/ will still have these fields (expected and acceptable):
grep -r "isAnonymous" tasks/*/tests/*.ts  # Will show results - this is OK
grep -r "username" tasks/*/tests/*.ts      # Will show results - this is OK
```

## Success Criteria

- [ ] `isAnonymous` field removed from schema
- [ ] `username` field removed from schema
- [ ] `by_username` index removed from schema
- [ ] `getByUsername` query removed
- [ ] All return types updated (3 files: schema.ts, users.ts, sharing.ts)
- [ ] All production test fixtures updated (10 files in app/convex/__tests__/)
- [ ] Test helpers updated to use `name` instead of `username` (if they exist outside tasks/)
- [ ] All tests pass
- [ ] No TypeScript compilation errors
- [ ] Grep verification shows clean removal from production code
- [ ] Schema JSDoc documentation updated
- [ ] Migration note created

## Risk Assessment

**Low Risk:**
- These fields are truly unused in production code
- Only 10 production test files need updating (manageable scope)
- No user-facing functionality depends on these fields
- Email-based identity already works without them
- Historical tests in `tasks/` folders are left unchanged (preserved for reference)

**Potential Issues:**
- Production DB may have these fields populated - need migration note
- TypeScript types might be referenced in frontend (need to check)

## Future: How We'll Do @Mentions (When Commenting Launches)

When we implement Task 00017 (commenting), we'll use the **modern pattern**:

**Data Model:**
```typescript
// In comments table:
{
  text: "Hey @john, check this out!",
  mentions: [{ userId: "abc123", displayName: "John Smith" }]
}
```

**UI Flow:**
1. User types `@` in comment box
2. Autocomplete queries users by `name` or `email`
3. Dropdown shows: "John Smith (john@company.com)"
4. On select, insert mention with `userId`
5. Render as `@John Smith` in UI

**What we need (already have):**
- ✅ `users._id` (internal ID)
- ✅ `users.name` (display name)
- ✅ `users.email` (uniqueness + context in dropdown)

**No username needed.**

## Related Tasks

- Task 00006 - Local dev environment (planned anonymous auth, never completed)
- Task 00007 - Password authentication (pivoted from username to email auth)
- Task 00017 - Implement commenting (will need @mentions without username)

## References

- [Slack's 2017 username deprecation](https://api.slack.com/changelog/2017-09-the-one-about-usernames)
- [Identity Beyond Usernames – Lord.io](https://lord.io/usernames/)
- `app/convex/schema.ts` - Current schema with unused fields
- `app/convex/users.ts` - User queries returning unused fields
