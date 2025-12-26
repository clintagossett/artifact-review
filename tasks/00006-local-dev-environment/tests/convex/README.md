# Task 00006: Convex Tests

## Test Location

Due to vitest path limitations with spaces, tests are run from:
- `app/convex/__tests__/users.test.ts`

## Run Tests

```bash
cd app
npx vitest run convex/__tests__/users.test.ts
```

## Tests Covered

| Test | Description | Status |
|------|-------------|--------|
| No auth returns null | `getCurrentUser` returns null when not authenticated | PASS |
| Anonymous user data | `getCurrentUser` returns anonymous user correctly | PASS |
| User with email | `getCurrentUser` includes email/name for verified users | PASS |

## What These Tests Validate

1. **Anonymous authentication flow works** - Users can sign in anonymously
2. **User data is correctly structured** - isAnonymous flag, optional email/name
3. **Auth context is properly passed** - withIdentity mocking works correctly

## Logging Verification

Structured JSON logs are emitted during tests:
```json
{"timestamp":"...","level":"debug","topic":"AUTH","context":"users","message":"getCurrentUser called"}
{"timestamp":"...","level":"info","topic":"AUTH","context":"users","message":"User retrieved successfully","metadata":{"userId":"...","isAnonymous":true}}
```
