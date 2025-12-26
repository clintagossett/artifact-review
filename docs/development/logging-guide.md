# Logging Guide

How to use structured logging in Artifact Review.

## Quick Reference

| Layer | Library | Import |
|-------|---------|--------|
| Frontend | loglevel | `import { logger, LOG_TOPICS } from '@/lib/logger'` |
| Backend | Custom | `import { createLogger, Topics } from './lib/logger'` |

## Log Levels

| Level | When to Use | Frontend | Backend |
|-------|-------------|----------|---------|
| **error** | Failures requiring attention | `logger.error(...)` | `log.error(...)` |
| **warn** | Degraded but recoverable | `logger.warn(...)` | `log.warn(...)` |
| **info** | Significant business events | `logger.info(...)` | `log.info(...)` |
| **debug** | Development diagnostics | `logger.debug(...)` | `log.debug(...)` |
| **verbose** | Extremely detailed tracing | N/A | `log.verbose(...)` |

## Log Topics

Use these categories for filtering:

| Topic | Use For |
|-------|---------|
| AUTH | Authentication, authorization, sessions |
| ARTIFACT | Uploads, downloads, storage |
| REVIEW | Comments, annotations, feedback |
| USER | Profile, preferences, team membership |
| SYSTEM | Startup, shutdown, health, errors |

## Frontend Usage

```typescript
import { logger, LOG_TOPICS } from '@/lib/logger';

// In a component or function
logger.debug(LOG_TOPICS.Artifact, 'UploadButton', 'Starting upload', {
  fileName: file.name,
  fileSize: file.size
});

logger.info(LOG_TOPICS.Auth, 'LoginForm', 'User signed in', {
  userId: user.id
});

logger.error(LOG_TOPICS.System, 'ErrorBoundary', 'Uncaught error', {
  error: err.message,
  recovery: 'Refresh the page or contact support'
});
```

## Backend Usage (Convex)

```typescript
import { createLogger, Topics } from './lib/logger';

export const myMutation = mutation({
  args: { name: v.string() },
  returns: v.id('artifacts'),
  handler: async (ctx, args) => {
    const log = createLogger('artifacts.myMutation');

    log.debug(Topics.Artifact, 'Handler invoked', { name: args.name });

    const artifactId = await ctx.db.insert('artifacts', {
      name: args.name,
      createdAt: Date.now(),
    });

    log.info(Topics.Artifact, 'Artifact created', { artifactId });

    return artifactId;
  },
});
```

## AI-Friendly Error Messages

Include recovery hints for debugging:

```typescript
// Bad - AI doesn't know how to fix
logger.error(Topics.Artifact, 'handler', 'Upload failed');

// Good - AI has actionable steps
logger.error(Topics.Artifact, 'handler', 'Upload failed: File exceeds size limit', {
  fileSize: file.size,
  maxSize: MAX_FILE_SIZE,
  recovery: 'Reduce file size or increase MAX_FILE_SIZE in constants.ts'
});
```

## What to Log

### DO Log

| Category | Level | Example |
|----------|-------|---------|
| User auth events | info | Login, logout, session refresh |
| Resource CRUD | info | Upload, update, delete |
| API errors with context | error | Failed ops with request details |
| Unexpected states | warn | Missing data, fallback behavior |
| Function entry (complex ops) | debug | Handler start with args |

### DO NOT Log

| Never Log | Reason |
|-----------|--------|
| Passwords, tokens, API keys | Security |
| Full artifact content | Size, potential PII |
| Email addresses (in debug) | Privacy |
| Credit card or financial data | Compliance |

## File-Based Logging

During development, logs are persisted for AI agent access:

### Start Dev with File Logging

```bash
# Terminal 1: Convex
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log

# Terminal 2: Next.js
npm run dev 2>&1 | tee logs/nextjs.log
```

### Read Logs

```bash
# Recent Convex logs
tail -100 logs/convex.log

# Search for errors
grep -i error logs/convex.log

# Parse JSON logs
cat logs/convex.log | jq 'select(.level == "error")'
```

## Configuration

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_LOG_LEVEL=debug   # debug | info | warn | error

# Backend (Convex env)
npx convex env set LOG_LEVEL debug
```

### Defaults

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Development | debug | debug |
| Production | warn | info |

### Runtime Level Change (Frontend Only)

In browser DevTools:

```javascript
// Enable all logs
import('@/lib/logger').then(m => m.logger.setLevel('trace'));

// Restore production level
import('@/lib/logger').then(m => m.logger.setLevel('warn'));
```

## JSON Log Format

Both frontend and backend output this structure:

```json
{
  "timestamp": "2024-12-26T10:30:00.000Z",
  "level": "info",
  "topic": "ARTIFACT",
  "context": "uploadArtifact",
  "message": "Artifact uploaded successfully",
  "metadata": {
    "artifactId": "k97xb...",
    "fileSize": 12345
  }
}
```
