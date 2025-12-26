# Subtask 03: Research React/Frontend Logging

**Parent Task:** 00005-logging-strategy
**Status:** COMPLETE
**Created:** 2025-12-26
**Completed:** 2025-12-26

---

## Objective

Research React and frontend logging best practices from both community knowledge and authoritative sources to inform our logging strategy.

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `results.md` | Complete research findings with sources |

---

## Research Questions Answered

1. **Logging libraries** - `loglevel` recommended for browser; `pino` for Node.js/SSR
2. **Environment configuration** - Use `NODE_ENV` + custom env vars for log levels
3. **Structured logging** - JSON format recommended, even in browser
4. **Production log services** - Sentry for errors, LogRocket for session replay (optional)
5. **PII protection** - Use allow-lists, redaction libraries, disable breadcrumbs
6. **console.log vs library** - Teams migrate away from console.log for control
7. **React-specific patterns** - ErrorBoundary, useLogger hook, LoggerContext

---

## Key Recommendations

- **Library:** `loglevel` (1.5KB, browser-first, simple)
- **Error Tracking:** Sentry (free tier, excellent React integration)
- **Log Levels:** debug/trace in dev, warn/error in production
- **Pattern:** Wrapper function for structured logging + context

---

## How This Will Be Used

This research feeds into `01-define-logging-strategy` to create a unified logging strategy for both Convex backend and React frontend.
