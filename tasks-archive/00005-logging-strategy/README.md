# Task 00005: Logging Strategy

**GitHub Issue:** #5
**Status:** IN PROGRESS

---

## Resume (Start Here)

**Last Updated:** 2024-12-25 (Session 1)

### Current Status: :clipboard: Defining Strategy

**Phase:** Researching and defining logging strategy for Convex backend and React frontend.

### What We Did This Session (Session 1)

1. **Created task** - Identified need for configurable log levels
2. **Defined goals** - No code changes for debugging, environment-aware, consistent patterns
3. **Added core requirements** - AI agent accessible logs, no log file bloat, permanent log statements
4. **Completed research** - 3 parallel agents researched AI logging, React logging, Convex logging
5. **Research outputs** - Each subtask produced results.md with community + authoritative findings

### Next Steps

1. **Review research results** - Read the 3 results.md files
2. **Merge into final strategy** - Subtask 01
3. **Define log levels** - When to use each level
4. **Update CLAUDE.md** - Logging conventions for AI agents

---

## Objective

Establish a logging strategy with configurable log levels for both Convex backend and React frontend that:

- Uses log frameworks with different log levels (debug, verbose, info, warn, error)
- Requires no code changes when debugging - just raise the log level
- Maintains consistent logging patterns across backend and frontend
- Is environment-aware (dev vs production log levels)

---

## Subtasks

| # | Name | Status | Description |
|---|------|--------|-------------|
| 01 | define-logging-strategy | COMPLETE | Final merged strategy document |
| 02 | research-ai-logging | COMPLETE | AI-assisted development logging patterns |
| 03 | research-react-logging | COMPLETE | React/frontend logging best practices |
| 04 | research-convex-logging | COMPLETE | Convex backend logging best practices |

---

## Key Questions to Answer

1. **Convex Backend:**
   - What logging is available in Convex functions?
   - Can we control log levels per environment?
   - How do logs appear in the Convex dashboard?
   - Are there structured logging options?

2. **React Frontend:**
   - Which logging library? (console wrapper, pino, loglevel, etc.)
   - How to configure log levels per environment?
   - Should logs be sent to a service in production?

3. **Cross-Cutting:**
   - Consistent log format (timestamp, level, context, message)?
   - Correlation IDs between frontend and backend?
   - What to log vs what NOT to log (PII, secrets)?

---

## Related

- Task 00004: Testing Strategy (observability complements testing)
