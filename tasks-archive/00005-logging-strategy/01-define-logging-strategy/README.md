# Subtask 01: Define Logging Strategy

**Parent Task:** 00005-logging-strategy
**Status:** COMPLETE
**Created:** 2024-12-25
**Updated:** 2024-12-26

---

## TL;DR

Use `loglevel` for React frontend and a custom logger wrapper for Convex backend. Both output structured JSON logs. File-based logging via `tee` enables AI agent access during development. Log levels are controlled via environment variables with no code changes required for debugging.

## Quick Reference

| Layer | Library | File Logging | Default Dev Level | Default Prod Level |
|-------|---------|--------------|-------------------|-------------------|
| **Frontend (React)** | loglevel | via browser console capture | debug | warn |
| **Backend (Convex)** | Custom wrapper + console.* | `npx convex logs \| tee` | debug | info |

---

## Requirements

### Core Requirements (Satisfied)

| # | Requirement | Solution |
|---|-------------|----------|
| 1 | Configurable log levels (debug, verbose, info, warn, error) | Environment variables: `NEXT_PUBLIC_LOG_LEVEL`, `LOG_LEVEL` |
| 2 | No code changes for debugging | Permanent log statements at appropriate levels; change env var to adjust |
| 3 | Environment-aware | Different defaults: dev=debug, prod=warn (frontend), prod=info (backend) |
| 4 | Consistent patterns | Same structured JSON format, same log topics, same conventions |
| 5 | AI agent accessible | File-based via `npx convex logs \| tee logs/convex.log` |
| 6 | No log file bloat | Clear on dev restart; max file size rotation for long sessions |

### Nice to Have (Addressed)

| Feature | Approach |
|---------|----------|
| Structured logging (JSON) | Both frontend and backend output JSON |
| Correlation IDs | Request ID from Convex; frontend session ID |
| Log aggregation integration | Axiom/Datadog via Convex Log Streams (Pro plan, future) |

---

## Log Level Definitions

### Standard Levels (Priority Order)

| Level | When to Use | Examples |
|-------|-------------|----------|
| **error** | Failures requiring attention | API errors, auth failures, data corruption |
| **warn** | Degraded but recoverable states | Rate limiting, fallback behavior, deprecated usage |
| **info** | Significant business events | User actions, state changes, key milestones |
| **debug** | Development diagnostics | Function entry/exit, intermediate state, timing |
| **verbose** | Extremely detailed tracing | Loop iterations, all HTTP requests, raw payloads |

### Level Mapping

| Our Level | loglevel | Convex console.* |
|-----------|----------|------------------|
| error | error | console.error |
| warn | warn | console.warn |
| info | info | console.log |
| debug | debug | console.debug |
| verbose | trace | console.debug (filtered) |

---

## Library Choices

### Frontend: loglevel

**Why loglevel:**
- Tiny bundle (~1.5KB minified)
- Browser-first design with Node.js compatibility
- Drop-in console replacement
- Runtime level changes via browser DevTools
- Plugin ecosystem for future needs (remote transport, prefixes)

**Not chosen:**
- **Pino**: Excellent but Node.js optimized, larger bundle (35KB)
- **Winston**: Node.js only, pulls in `fs`
- **Custom**: More maintenance, less battle-tested

### Backend: Custom Wrapper

**Why custom wrapper over raw console.log:**
- Structured JSON output for log aggregation
- Log level filtering via environment variable
- Topic-based categorization for filtering
- Recovery hints for AI agent debugging
- Consistent format with frontend

**Why not a library:**
- Convex runtime limitations (no npm logging libraries designed for it)
- console.* methods work well; we just need structure
- Custom wrapper is <50 lines of code

---

## Structured Logging Format

### JSON Schema

Both frontend and backend use this structure:

```json
{
  "timestamp": "2024-12-26T10:30:00.000Z",
  "level": "info",
  "topic": "ARTIFACT",
  "context": "uploadArtifact",
  "message": "Artifact uploaded successfully",
  "metadata": {
    "artifactId": "k97xb...",
    "userId": "j5n3m...",
    "fileSize": 12345
  }
}
```

### Log Topics

| Topic | Use For |
|-------|---------|
| AUTH | Authentication, authorization, sessions |
| ARTIFACT | Uploads, downloads, storage operations |
| REVIEW | Comments, annotations, feedback |
| USER | Profile, preferences, team membership |
| SYSTEM | Startup, shutdown, health, errors |

---

## File-Based Logging for AI Agents

### The Problem

When Convex and Next.js run in separate terminals, AI agents (Claude Code, etc.) cannot see terminal output. Logs must be persisted to readable files.

### Solution: tee + Log Directory

#### Setup

```bash
# Create logs directory (gitignored)
mkdir -p logs
echo "logs/" >> .gitignore
```

#### Development Startup

```bash
# Terminal 1: Convex with file logging
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log

# Terminal 2: Next.js with file logging
npm run dev 2>&1 | tee logs/nextjs.log

# Combined view (optional)
tail -f logs/convex.log logs/nextjs.log
```

#### AI Agent Access

AI agents can read log files at any time:

```bash
# Read recent Convex logs
tail -100 logs/convex.log

# Search for errors
grep -i error logs/convex.log

# Parse JSON logs
cat logs/convex.log | jq 'select(.level == "error")'
```

### Log Rotation / Bloat Prevention

#### Strategy: Clear on Dev Restart

```bash
# Startup script: scripts/dev.sh
#!/bin/bash

# Clear previous logs
> logs/convex.log
> logs/nextjs.log

# Start services with logging
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
npm run dev 2>&1 | tee logs/nextjs.log &

wait
```

#### Alternative: Size-Limited Rotation

For long debugging sessions, use `rotatelogs` or truncation:

```bash
# Keep only last 10000 lines
tail -10000 logs/convex.log > logs/convex.log.tmp && mv logs/convex.log.tmp logs/convex.log
```

---

## Implementation

### Frontend Logger (React/Next.js)

```typescript
// src/lib/logger.ts
import log from 'loglevel';

// Log topics for categorization
export const LOG_TOPICS = {
  Auth: 'AUTH',
  Artifact: 'ARTIFACT',
  Review: 'REVIEW',
  User: 'USER',
  System: 'SYSTEM',
} as const;

type LogTopic = typeof LOG_TOPICS[keyof typeof LOG_TOPICS];

interface LogMetadata {
  [key: string]: unknown;
}

// Configure level from environment
const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || DEFAULT_LEVEL;
log.setLevel(LOG_LEVEL as log.LogLevelDesc);

// Structured log helper
function structuredLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  topic: LogTopic,
  context: string,
  message: string,
  metadata?: LogMetadata
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    topic,
    context,
    message,
    ...(metadata && { metadata }),
  };

  // Use native loglevel method for level filtering
  log[level](JSON.stringify(entry));
}

// Export logger with topic support
export const logger = {
  debug: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) =>
    structuredLog('debug', topic, context, message, metadata),
  info: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) =>
    structuredLog('info', topic, context, message, metadata),
  warn: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) =>
    structuredLog('warn', topic, context, message, metadata),
  error: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) =>
    structuredLog('error', topic, context, message, metadata),

  // Expose raw loglevel for runtime level changes in DevTools
  setLevel: log.setLevel.bind(log),
};
```

### Backend Logger (Convex)

```typescript
// convex/lib/logger.ts
export const LOG_TOPICS = {
  Auth: 'AUTH',
  Artifact: 'ARTIFACT',
  Review: 'REVIEW',
  User: 'USER',
  System: 'SYSTEM',
} as const;

type LogTopic = typeof LOG_TOPICS[keyof typeof LOG_TOPICS];

interface LogMetadata {
  userId?: string;
  artifactId?: string;
  reviewId?: string;
  [key: string]: unknown;
}

// Log levels with numeric priority
const LOG_LEVELS = {
  verbose: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get configured level (evaluated at deploy time)
const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'debug';
const currentPriority = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.debug;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentPriority;
}

function formatLog(
  level: LogLevel,
  topic: LogTopic,
  context: string,
  message: string,
  metadata?: LogMetadata
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    topic,
    context,
    message,
    ...(metadata && { metadata }),
  });
}

export function createLogger(context: string) {
  return {
    verbose: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog('verbose')) {
        console.debug(formatLog('verbose', topic, context, message, metadata));
      }
    },
    debug: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog('debug')) {
        console.debug(formatLog('debug', topic, context, message, metadata));
      }
    },
    info: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog('info')) {
        console.log(formatLog('info', topic, context, message, metadata));
      }
    },
    warn: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog('warn')) {
        console.warn(formatLog('warn', topic, context, message, metadata));
      }
    },
    error: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog('error')) {
        console.error(formatLog('error', topic, context, message, metadata));
      }
    },
  };
}

// Re-export topics for convenience
export { LOG_TOPICS as Topics };
```

### Usage Examples

#### Frontend Component

```typescript
import { logger, LOG_TOPICS } from '@/lib/logger';

function UploadButton({ onUpload }: Props) {
  const handleUpload = async (file: File) => {
    logger.debug(LOG_TOPICS.Artifact, 'UploadButton', 'Starting upload', {
      fileName: file.name,
      fileSize: file.size
    });

    try {
      const result = await onUpload(file);
      logger.info(LOG_TOPICS.Artifact, 'UploadButton', 'Upload complete', {
        artifactId: result.id
      });
    } catch (err) {
      logger.error(LOG_TOPICS.Artifact, 'UploadButton', 'Upload failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        recovery: 'Check file size limits and network connection'
      });
      throw err;
    }
  };

  // ...
}
```

#### Convex Mutation

```typescript
import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { createLogger, Topics } from './lib/logger';

export const uploadArtifact = mutation({
  args: {
    name: v.string(),
    storageId: v.id('_storage'),
  },
  returns: v.id('artifacts'),
  handler: async (ctx, args) => {
    const log = createLogger('artifacts.uploadArtifact');
    const userId = await ctx.auth.getUserIdentity();

    log.debug(Topics.Artifact, 'Handler invoked', {
      name: args.name,
      userId: userId?.subject
    });

    const artifactId = await ctx.db.insert('artifacts', {
      name: args.name,
      storageId: args.storageId,
      ownerId: userId!.subject,
      createdAt: Date.now(),
    });

    log.info(Topics.Artifact, 'Artifact created', {
      artifactId,
      userId: userId?.subject
    });

    return artifactId;
  },
});
```

---

## Environment Configuration

### Development (.env.local)

```bash
# Frontend logging
NEXT_PUBLIC_LOG_LEVEL=debug

# Backend logging (set via convex env)
# npx convex env set LOG_LEVEL debug
```

### Production (.env.production)

```bash
# Frontend: minimize noise
NEXT_PUBLIC_LOG_LEVEL=warn

# Backend: keep info for observability
# npx convex env set LOG_LEVEL info
```

### Changing Log Levels

```bash
# Frontend: update .env.local, restart dev server
NEXT_PUBLIC_LOG_LEVEL=verbose npm run dev

# Backend: update Convex env, redeploy
npx convex env set LOG_LEVEL verbose
npx convex deploy
```

### Runtime Level Changes (Frontend Only)

In browser DevTools console:

```javascript
// Temporarily enable all logs for debugging
import('@/lib/logger').then(m => m.logger.setLevel('trace'));

// Restore production level
import('@/lib/logger').then(m => m.logger.setLevel('warn'));
```

---

## What to Log

### DO Log

| Category | Level | Example |
|----------|-------|---------|
| User authentication events | info | Login, logout, session refresh |
| Resource creation/modification | info | Upload, update, delete |
| API errors with context | error | Failed operations with request details |
| Unexpected states | warn | Missing data, fallback behavior |
| Function entry (complex operations) | debug | Handler start with args |
| Performance timing | debug | Operation duration |

### DO NOT Log

| Never Log | Reason |
|-----------|--------|
| Passwords, tokens, API keys | Security |
| Full artifact content | Size, potential PII |
| Email addresses (in debug) | Privacy |
| Credit card or financial data | Compliance |
| Full request/response bodies | May contain sensitive data |
| Convex internal IDs in error messages | Security |

### Error Message Format for AI Agents

Include recovery hints for AI-assisted debugging:

```typescript
// Bad: AI doesn't know how to fix
logger.error(Topics.Artifact, 'handler', 'Upload failed');

// Good: AI has actionable recovery steps
logger.error(Topics.Artifact, 'handler', 'Upload failed: File exceeds size limit', {
  fileSize: file.size,
  maxSize: MAX_FILE_SIZE,
  recovery: 'Reduce file size or increase MAX_FILE_SIZE in constants.ts'
});
```

---

## CLAUDE.md Conventions

Add this to the project's CLAUDE.md:

```markdown
## Logging Conventions

### Using the Logger

- Import logger from `@/lib/logger` (frontend) or `convex/lib/logger` (backend)
- Always use structured logging - never raw `console.log`
- Include a topic (AUTH, ARTIFACT, REVIEW, USER, SYSTEM)
- Include a context (component or function name)

### Log Levels

| Level | When to Use |
|-------|-------------|
| error | Something failed and needs attention |
| warn | Degraded state, recoverable issue |
| info | Significant business event |
| debug | Development diagnostics (default in dev) |
| verbose | Extremely detailed tracing |

### Log File Access

During development, logs are written to:
- `logs/convex.log` - Backend logs
- `logs/nextjs.log` - Frontend/SSR logs

Read logs when debugging:
```bash
tail -100 logs/convex.log
grep "ERROR" logs/convex.log
```

### AI-Friendly Error Messages

When logging errors, include recovery hints:

```typescript
logger.error(Topics.System, 'handler', 'Database connection failed', {
  error: err.message,
  recovery: 'Check database URL in environment variables'
});
```

### What NOT to Log

- Passwords, tokens, API keys
- Full artifact content
- Email addresses in debug logs
- Any PII without explicit need
```

---

## Production Considerations

### Short-Term (Pre-Production)

1. **Set appropriate levels** - Frontend: warn, Backend: info
2. **Test log output** - Verify JSON parsing works in dashboard
3. **Add ErrorBoundary** - Wrap app sections with React ErrorBoundary
4. **Configure Sentry** - Error tracking with stack traces

### Long-Term (Production Scale)

1. **Enable Log Streams** - Axiom or Datadog (Pro plan required)
2. **Create dashboards** - Topic-based filtering, error rate monitoring
3. **Set up alerts** - Slack/PagerDuty for error spikes
4. **Document runbooks** - How to investigate issues using Request IDs

---

## Related Documents

- [ADR 0007: Logging Strategy](../../../docs/architecture/decisions/0007-logging-strategy.md)
- [Research: AI Logging](../02-research-ai-logging/results.md)
- [Research: React Logging](../03-research-react-logging/results.md)
- [Research: Convex Logging](../04-research-convex-logging/results.md)

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file - complete strategy documentation |

---

## Deliverables Checklist

- [x] Logging strategy document (this README)
- [x] Log level definitions with examples
- [x] Code patterns for backend and frontend
- [x] CLAUDE.md conventions for AI agents
- [x] File-based logging for AI agent access
- [x] Log rotation/bloat prevention strategy
