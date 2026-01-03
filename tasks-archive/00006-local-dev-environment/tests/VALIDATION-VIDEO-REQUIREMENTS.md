# Validation Video Requirements

## Anonymous Authentication Flow

The validation video should demonstrate the following sequence:

### 1. Initial Page Load
- Navigate to http://localhost:3000
- Show the landing page with "Welcome to Artifact Review" heading
- Verify "Start Using Artifact Review" button is visible

### 2. Anonymous Sign-In
- Click "Start Using Artifact Review" button
- Observe the UI transition to authenticated state
- Verify "Anonymous session" text appears
- Verify User ID is displayed (format: `User ID: j9781...`)

### 3. Session Persistence
- Perform a full page refresh (Cmd+R or F5)
- Verify the authenticated state persists
- Verify the same User ID is displayed
- Confirm no re-authentication prompt appears

### 4. Token Storage
- Open browser DevTools → Application → Local Storage
- Show the `__convexAuthJWT_httpsmildptarmigan109convexcloud` token is present
- Close DevTools

### Success Criteria
✅ Anonymous sign-in completes without errors
✅ User ID is displayed and persists across refreshes
✅ JWT token is stored in localStorage
✅ No console errors during the flow

## Recording Details
- **Duration**: 30-60 seconds
- **Format**: GIF or MP4
- **Save Location**: `tasks/00006-local-dev-environment/tests/validation-videos/anonymous-auth-flow.gif`

## Notes
Screenshots captured during debugging session:
- `app/screenshot-after-signin.png` - Shows successful auth state
- Can be used as reference or included in documentation
