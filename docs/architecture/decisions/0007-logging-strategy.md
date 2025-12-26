# ADR 0007: Logging Strategy

**Status:** Accepted
**Date:** 2024-12-26
**Decision Maker:** Clint Gossett

## TL;DR

Use `loglevel` for React frontend and a custom logger wrapper for Convex backend. Both output structured JSON logs with configurable levels via environment variables. File-based logging via `tee` enables AI agent access during development.

## Quick Reference

| Item | Value |
|------|-------|
| **Frontend Library** | loglevel (~1.5KB) |
| **Backend Library** | Custom wrapper + console.* |
| **Log Format** | Structured JSON |
| **Level Config (Frontend)** | `NEXT_PUBLIC_LOG_LEVEL` |
| **Level Config (Backend)** | `LOG_LEVEL` (Convex env) |
| **Dev Default** | debug |
| **Prod Default** | warn (frontend), info (backend) |
| **AI Agent Access** | File logs via `tee` |

## Decision Drivers (Priority Order)

1. **No code changes for debugging** - Change log level via config, not by adding/removing console.logs
2. **AI agent accessibility** - Logs must be in files that AI agents can read
3. **Consistent patterns** - Same conventions across frontend and backend
4. **Environment-aware** - Different defaults for dev vs production
5. **No log file bloat** - Rotation or clearing strategy required

## Related Decisions

- [ADR 0006: Frontend Stack](./0006-frontend-stack.md) - Next.js + React context

## Context

### The Problem

During AI-assisted development (TDD with Claude Code, Cursor, etc.), debugging relies on reading logs. However:

1. **Terminal inaccessibility** - When Convex and Next.js run in separate terminals, AI agents cannot see the output
2. **Inconsistent logging** - Teams often add/remove `console.log` statements when debugging, creating noise and inconsistency
3. **No level control** - Raw console.log has no way to filter by severity
4. **Unstructured output** - Plain text logs are hard to parse programmatically

### Research Findings

Based on research into AI-assisted development logging, React frontend logging, and Convex backend logging:

**AI Development Patterns:**
- Error messages should read like "recovery scripts" with exact function names and steps
- Structured JSON logs parse better than unstructured text for AI consumption
- File-based log aggregation (`bun run dev > dev.log 2>&1`) is a powerful debugging pattern
- Balancing verbosity is crucial: informative yet concise logs optimize token usage

**React/Frontend:**
- `loglevel` is the community favorite: tiny (1.5KB), browser-first, runtime level changes
- Pino is excellent but Node.js optimized and larger (35KB)
- ErrorBoundary + Sentry recommended for production error tracking

**Convex Backend:**
- Standard console.* methods work (log, debug, warn, error, info)
- Dashboard filters by severity; no built-in runtime level control
- Environment variables evaluated at deploy time, not runtime
- Log Streams (Axiom, Datadog) available on Pro plan for production

## Decision

### Use loglevel (Frontend) + Custom Wrapper (Backend)

**Frontend: loglevel**
```typescript
import log from 'loglevel';

const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
log.setLevel(process.env.NEXT_PUBLIC_LOG_LEVEL || DEFAULT_LEVEL);
```

**Backend: Custom wrapper**
```typescript
const LOG_LEVELS = { verbose: 0, debug: 1, info: 2, warn: 3, error: 4 };
const currentLevel = process.env.LOG_LEVEL || 'debug';

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
```

### Structured JSON Format

Both layers output identical JSON structure:

```json
{
  "timestamp": "2024-12-26T10:30:00.000Z",
  "level": "info",
  "topic": "ARTIFACT",
  "context": "uploadArtifact",
  "message": "Artifact uploaded successfully",
  "metadata": { "artifactId": "k97xb...", "fileSize": 12345 }
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

### File-Based Logging for AI Agents

```bash
# Development startup
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log
npm run dev 2>&1 | tee logs/nextjs.log

# AI agent reads logs
tail -100 logs/convex.log
grep -i error logs/convex.log
```

### Log Rotation

Clear logs on dev restart (simplest approach):

```bash
#!/bin/bash
> logs/convex.log
> logs/nextjs.log
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
npm run dev 2>&1 | tee logs/nextjs.log &
wait
```

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| error | Failures requiring attention | API errors, auth failures |
| warn | Degraded but recoverable | Rate limiting, fallback behavior |
| info | Significant business events | User actions, state changes |
| debug | Development diagnostics | Function entry/exit, timing |
| verbose | Extremely detailed tracing | Loop iterations, raw payloads |

## Consequences

### Positive

- **No code changes for debugging** - Raise log level via env var, not code edits
- **AI agent accessible** - File logs readable by Claude Code, Cursor, etc.
- **Consistent format** - Same JSON structure across frontend and backend
- **Lightweight** - loglevel is 1.5KB; custom backend wrapper is ~50 lines
- **Future-ready** - JSON format works with Axiom/Datadog when we upgrade to Pro
- **Recovery-oriented** - Error messages can include actionable hints for AI debugging

### Negative

- **Deploy required for backend level change** - Convex env vars evaluated at deploy time
- **Manual file logging setup** - Developers must use `tee` for file output
- **No automatic rotation** - Must clear logs manually or via script
- **Topic discipline required** - Team must consistently use correct topics

### Neutral

- Frontend can change levels at runtime via DevTools; backend cannot
- Log Streams require Convex Pro plan (~$25/month) for production aggregation
- Custom wrapper means no community library updates for backend

## Implementation

See full implementation details in: `tasks/00005-logging-strategy/01-define-logging-strategy/README.md`

### Quick Start

1. Install loglevel:
   ```bash
   npm install loglevel
   ```

2. Create frontend logger: `src/lib/logger.ts`

3. Create backend logger: `convex/lib/logger.ts`

4. Set up log directory:
   ```bash
   mkdir -p logs
   echo "logs/" >> .gitignore
   ```

5. Update CLAUDE.md with logging conventions

## Alternatives Considered

### Alt 1: Pino for Both Layers

**Approach:** Use Pino browser mode for frontend, Pino for any Node.js API routes

**Rejected because:**
- Larger bundle size (35KB vs 1.5KB)
- Convex functions run in a custom runtime, not Node.js
- Over-engineered for our current scale

### Alt 2: Raw console.log + Dashboard Filtering

**Approach:** Use console.* directly, filter in Convex dashboard

**Rejected because:**
- No structured format for log aggregation
- No level control in code
- AI agents cannot read dashboard
- Encourages add/remove debugging pattern

### Alt 3: Winston

**Approach:** Use Winston logging library

**Rejected because:**
- Node.js only (pulls in `fs`)
- Does not work in browser
- Does not work in Convex runtime

### Alt 4: External Logging Service from Day 1

**Approach:** Set up Axiom/Datadog/LogRocket immediately

**Deferred because:**
- Adds cost and complexity before we have users
- Convex Pro plan required for Log Streams
- Can add later when production-ready

## References

### Research Documents

- [AI Logging Research](../../../tasks/00005-logging-strategy/02-research-ai-logging/results.md)
- [React Logging Research](../../../tasks/00005-logging-strategy/03-research-react-logging/results.md)
- [Convex Logging Research](../../../tasks/00005-logging-strategy/04-research-convex-logging/results.md)

### External Sources

- [Agentic Coding Recommendations - Armin Ronacher](https://lucumr.pocoo.org/2025/6/12/agentic-coding/)
- [How I use Claude Code - Christian Houmann](https://bagerbach.com/blog/how-i-use-claude-code)
- [Convex Debugging Documentation](https://docs.convex.dev/functions/debugging)
- [loglevel npm](https://www.npmjs.com/package/loglevel)
- [Convex Log Streams](https://docs.convex.dev/production/integrations/log-streams/)
