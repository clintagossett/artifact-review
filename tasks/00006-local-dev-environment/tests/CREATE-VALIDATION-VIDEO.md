# Creating the Validation Video

This guide walks you through creating the validation video for anonymous authentication.

## Prerequisites

- Dev server running at http://localhost:3000
- Screen recording tool installed (QuickTime Player, Kap, or Gifski)

## Recording Steps

### 1. Clear Browser State (Optional)
To show a fresh flow, clear localStorage:
```bash
# Open DevTools Console and run:
localStorage.clear()
```

### 2. Start Recording
Open your screen recording tool:
- **QuickTime Player**: File → New Screen Recording → Select area around browser
- **Kap** (recommended for GIFs): Launch Kap → Select area → Click record
- **Gifski**: Best for converting videos to high-quality GIFs

### 3. Record the Flow

Follow these exact steps while recording:

#### a. Initial Page Load
1. Navigate to http://localhost:3000
2. Wait for page to fully load
3. Show "Artifact Review" heading and "Start Using Artifact Review" button

#### b. Anonymous Sign-In
4. Click "Start Using Artifact Review" button
5. Wait for UI transition to authenticated state
6. Show "Anonymous session" text
7. Show User ID displayed (format: `User ID: j9781...`)

#### c. Session Persistence
8. Perform full page refresh (Cmd+R)
9. Wait for page to reload
10. Verify same User ID is still displayed
11. Confirm no re-authentication prompt

#### d. Token Storage (Optional but recommended)
12. Open DevTools (Cmd+Option+I)
13. Go to Application → Local Storage → http://localhost:3000
14. Show the `__convexAuthJWT_httpsmildptarmigan109convexcloud` token
15. Close DevTools

### 4. Stop Recording
- Stop the recording
- Duration should be 30-60 seconds

### 5. Convert to GIF (if needed)

If you recorded with QuickTime or another video tool:

```bash
# Using ffmpeg to convert to GIF
ffmpeg -i input.mov -vf "fps=10,scale=1200:-1:flags=lanczos" -loop 0 anonymous-auth-flow.gif

# Or use Gifski for better quality
gifski -o anonymous-auth-flow.gif input.mov --fps 10 --width 1200
```

### 6. Save to Correct Location

```bash
# Move the GIF to the validation-videos directory
mv anonymous-auth-flow.gif /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/tasks/00006-local-dev-environment/tests/validation-videos/
```

## Success Criteria

Your video should show:
- ✅ Anonymous sign-in completes without errors
- ✅ User ID is displayed and persists across refreshes
- ✅ JWT token is stored in localStorage
- ✅ No console errors during the flow

## Recommended Tools

| Tool | Purpose | Link |
|------|---------|------|
| Kap | Easy screen recording to GIF | https://getkap.co/ |
| Gifski | High-quality video to GIF conversion | https://gif.ski/ |
| QuickTime | Built-in macOS screen recorder | Pre-installed |

## Troubleshooting

**Issue: Recording is too large**
```bash
# Reduce file size with ffmpeg
ffmpeg -i large.gif -vf "fps=8,scale=800:-1:flags=lanczos" -loop 0 small.gif
```

**Issue: Recording is choppy**
- Lower the FPS to 8-10
- Reduce the scale/resolution
- Use a dedicated GIF tool like Kap

**Issue: Can't see the full flow**
- Zoom out browser window to fit everything in frame
- Use smaller browser window size
- Split recording into multiple steps if needed
