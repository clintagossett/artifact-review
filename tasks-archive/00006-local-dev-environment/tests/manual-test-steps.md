# Manual Validation Steps for Anonymous Auth

## Prerequisites
- Dev servers running at http://localhost:3000
- Browser with dev tools open

## Test 1: Anonymous Auth Works

1. Open http://localhost:3000 in browser
2. Open dev console (F12)
3. Verify you see the landing page with "Start Using Artifact Review" button
4. Look for console logs showing:
   ```
   [DEBUG] Auth state: {isLoading: false, isAuthenticated: false, currentUser: null}
   ```
5. Click "Start Using Artifact Review" button
6. Look for console logs:
   ```
   [DEBUG] Anonymous sign-in button clicked
   [DEBUG] Sign-in completed: ...
   ```
7. **EXPECTED:** Page should transition to dashboard showing:
   - "Welcome to Artifact Review" title
   - User ID field with a value
   - Status showing "Anonymous Session"
   - Sign Out button

## Test 2: No Convex Connection Errors

1. In browser dev console, check for any red errors
2. Look specifically for errors containing "convex" or "Convex"
3. **EXPECTED:** No Convex-related errors

## Test 3: Session Persists Across Refresh

1. While on the dashboard (after signing in), note the User ID
2. Press F5 or click browser refresh
3. **EXPECTED:**
   - Dashboard should load again (not landing page)
   - User ID should be the same as before refresh

## Test 4: Sign Out Creates New Session

1. While on dashboard, click "Sign Out" button
2. **EXPECTED:** Returns to landing page
3. Click "Start Using Artifact Review" again
4. **EXPECTED:**
   - Dashboard loads
   - User ID is DIFFERENT from the first session

## Troubleshooting

If auth doesn't complete:
- Check Convex dev server is running (`npx convex dev`)
- Check for errors in Convex logs
- Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly
- Check browser network tab for failed requests

## Recording Results

Note which tests pass/fail and any error messages observed.
