# Convex Backend Logging Research Results

## Summary of Key Findings

Convex provides a straightforward logging experience using standard JavaScript console methods (`console.log`, `console.error`, `console.warn`, `console.debug`, `console.info`). Logs are viewable in the dashboard, CLI, and browser console (dev only). For production, Log Streams (Pro plan required) enable integration with Axiom, Datadog, or custom webhooks for historical retention and advanced querying. There is no built-in log level configuration via environment variables, but you can filter logs by severity in the dashboard and build custom structured logging utilities using `customFunctions` from `convex-helpers`.

---

## 1. How Does console.log Work in Convex Functions?

Standard JavaScript console methods work exactly as expected in Convex functions:

**Available Methods:**
- `console.log`, `console.info` - General information
- `console.warn` - Warnings
- `console.error` - Errors
- `console.debug` - Debug-level (can be filtered out)
- `console.trace` - Outputs with stack trace
- `console.time`, `console.timeLog`, `console.timeEnd` - Performance measurement

**Example:**
```typescript
export const myMutation = mutation({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    console.log("Received args", args);
    console.debug("Debug details:", { timestamp: Date.now() });
    console.time("operation");
    // ... your code
    console.timeEnd("operation");
  },
});
```

**Source:** [Debugging | Convex Developer Hub](https://docs.convex.dev/functions/debugging)

---

## 2. Where Do Logs Appear?

### Development
| Location | How to Access |
|----------|--------------|
| **Convex Dashboard** | Logs page at dashboard.convex.dev |
| **CLI** | `npx convex dev` (shows logs during development) |
| **CLI (logs only)** | `npx convex logs` (tail logs without deploying) |
| **Browser Console** | Logs forwarded to browser DevTools (dev deployments only) |

### Production
| Location | How to Access |
|----------|--------------|
| **Convex Dashboard** | Limited history (~1000 function executions) |
| **CLI** | `npx convex logs --prod` |
| **Log Streams** | Axiom, Datadog, or custom webhook (Pro plan required) |

**Important:** Production deployments do NOT send logs to the browser console.

**CLI Tips:**
```bash
# Tail logs with file output
npx convex logs | tee ./logs.txt

# Filter with grep
npx convex logs | grep "ERROR"

# Control log display during dev
npx convex dev --tail-logs always    # Show all logs
npx convex dev --tail-logs disable   # Hide logs
```

**Sources:**
- [Logs | Convex Developer Hub](https://docs.convex.dev/dashboard/deployments/logs)
- [CLI | Convex Developer Hub](https://docs.convex.dev/cli)

---

## 3. Can You Control Log Levels in Convex?

### Built-in Filtering (Dashboard Only)
The Convex dashboard allows filtering by severity: `debug`, `info`, `warn`, `error`. You can also filter by:
- Text search
- Function name
- Execution status (success/failure)

### No Runtime Log Level Configuration
There is **no built-in mechanism** to control log levels via environment variables at runtime. All console output is captured regardless of level.

### Workaround: Custom Logger
Build a wrapper that checks an environment variable:

```typescript
// convex/lib/logger.ts
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const levels = { debug: 0, info: 1, warn: 2, error: 3 };

export const logger = {
  debug: (...args: unknown[]) => {
    if (levels[LOG_LEVEL] <= levels.debug) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (levels[LOG_LEVEL] <= levels.info) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (levels[LOG_LEVEL] <= levels.warn) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (levels[LOG_LEVEL] <= levels.error) console.error(...args);
  },
};
```

**Caveat:** Environment variables are evaluated at deploy time, not runtime. Changing `LOG_LEVEL` requires redeployment.

**Source:** [Environment Variables | Convex Developer Hub](https://docs.convex.dev/production/environment-variables)

---

## 4. Environment Variables for Log Configuration

### Built-in Variables
Convex provides these automatically:
- `CONVEX_CLOUD_URL` - Deployment URL
- `CONVEX_SITE_URL` - Site URL for HTTP Actions

### Special Case: AUTH_LOG_LEVEL
For Convex Auth, set `AUTH_LOG_LEVEL=DEBUG` to enable verbose authentication logging. **Warning:** This logs tokens and sensitive data.

```bash
npx convex env set AUTH_LOG_LEVEL DEBUG
```

### Custom Log Level Variable
You can create your own:
```bash
npx convex env set LOG_LEVEL debug
```

Then use it in your custom logger implementation.

**Source:** [Debugging - Convex Auth](https://labs.convex.dev/auth/debugging)

---

## 5. Structured Logging Options

### Manual JSON Logging
```typescript
function logEvent(topic: string, metadata: object, message: string) {
  console.log(JSON.stringify({ topic, metadata, message }));
}

// Usage
logEvent("GAME", { gameId: "123" }, "Game started");
```

### Using customFunctions (Recommended Pattern)
The `convex-helpers` package enables a `ctx.logger` pattern:

```typescript
import { customMutation } from "convex-helpers/server/customFunctions";
import { mutation } from "./_generated/server";

// Define log topics
const LOG_TOPICS = {
  Game: "GAME",
  User: "USER",
  System: "SYSTEM",
} as const;

// Create logger utility
function createLogger(functionName: string) {
  return {
    log: (topic: string, metadata: object, message: string) => {
      console.log(JSON.stringify({
        topic,
        metadata: { ...metadata, function: functionName },
        message,
        timestamp: Date.now()
      }));
    },
    error: (topic: string, metadata: object, message: string) => {
      console.error(JSON.stringify({ topic, metadata, message }));
    },
  };
}

// Custom mutation with logger in context
export const myCustomMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    return {
      ctx: { logger: createLogger("myCustomMutation") },
      args: {},
    };
  },
});
```

### Log Stream Integration
When using Axiom, create virtual fields to parse JSON logs:
```
your_dataset
| extend parsed = parse_json(message)
| where parsed.topic == "GAME"
```

**Sources:**
- [Log Streams: Common uses](https://stack.convex.dev/log-streams-common-uses)
- [Customizing serverless functions](https://stack.convex.dev/custom-functions)

---

## 6. What Do Convex Users Recommend for Debugging?

### Community Best Practices

1. **Use Request IDs** - Every exception includes `[Request ID: <id>]`. Paste into dashboard to see full execution context.

2. **Leverage console.debug** - Use for verbose development logs, filter them out in dashboard when not needed.

3. **Set up Log Streams early** - Convex only keeps ~1000 function logs. Production apps need Axiom/Datadog.

4. **Use debugger statements in tests** - Add `debugger;` and step through code during test execution.

5. **Save logs locally** - `npx convex logs | tee ./logs.txt` for persistent local debugging.

6. **Structured logging from day one** - JSON format enables powerful filtering in log platforms.

7. **Integrate Sentry for exceptions** - Errors grouped by stack trace, with Slack/PagerDuty integration.

### Discord Community Insights
From [Discord Questions](https://discord-questions.convex.dev):
- Use `search.convex.dev` to search Docs, Stack, and Discord simultaneously
- For authentication issues, check `docs.convex.dev/auth/debug`
- Consider `--tail-logs always` as your default during development

**Sources:**
- [Observing your app in production](https://stack.convex.dev/observability-in-production)
- [Operational maturity for production](https://stack.convex.dev/operational-maturity-for-production)

---

## 7. Limitations of Logging in Convex

| Limitation | Details |
|------------|---------|
| **Retention** | Only ~1000 function executions retained in dashboard |
| **Log erasure** | Logs can be erased during Convex maintenance |
| **Production browser logs** | Not forwarded to client (security) |
| **Log line size** | Max 32KB per line (as of Convex 1.4) |
| **Log count per function** | Limited; excess logs are skipped with warning |
| **No runtime log level control** | Environment variable changes require redeployment |
| **Log Streams** | Requires Pro plan (~$25/month) |
| **Delivery guarantee** | Best-effort only; logs can be dropped under high throughput or duplicated |
| **Local dev logs** | Cleared on `npx convex dev` restart |

**Recent Improvements (Convex 1.4):**
- 8x increase in log limits (up to 32KB per line)
- Exceeding limits now truncates instead of erroring
- Warning log added when max log count exceeded

**Sources:**
- [Limits | Convex Developer Hub](https://docs.convex.dev/production/state/limits)
- [Announcing Convex 1.4](https://news.convex.dev/announcing-convex-1-4/)

---

## 8. Community-Built Logging Utilities

### convex-helpers Package
The `convex-helpers` package provides `customFunctions` for building custom logging:

```bash
npm install convex-helpers
```

**Features relevant to logging:**
- `customQuery`, `customMutation`, `customAction` - Add logging to context
- `onSuccess` callback - Log after successful execution

**No dedicated logging module exists** in convex-helpers. The recommended approach is building your own using `customFunctions`.

### Recommended Tool Stack

| Purpose | Tool | Notes |
|---------|------|-------|
| Log aggregation | [Axiom](https://axiom.co/docs/apps/convex) | Native Convex integration, auto-dashboard |
| Log aggregation | [Datadog](https://docs.convex.dev/production/integrations/log-streams/) | Enterprise option |
| Exception tracking | [Sentry](https://docs.convex.dev/production/integrations/exception-reporting) | Pro plan required |
| Alerting | PagerDuty, Slack | Via Axiom/Datadog integration |

**Source:** [convex-helpers GitHub](https://github.com/get-convex/convex-helpers)

---

## Recommendations for Artifact Review Project

### Immediate (Development Phase)
1. **Use console methods appropriately** - `console.debug` for verbose, `console.log` for info, `console.error` for errors
2. **Adopt JSON structured logging** - Prepare for future log stream integration
3. **Create a simple logger utility** - Wrap console methods with topic/metadata structure

### Short-term (Pre-Production)
1. **Build custom logger with customFunctions** - Add `ctx.logger` pattern for consistent logging
2. **Define log topics** - `AUTH`, `ARTIFACT`, `REVIEW`, `SYSTEM`, etc.
3. **Implement log level control** - Via environment variable with redeployment

### Production Readiness
1. **Set up Axiom integration** - When on Pro plan, for historical logs and dashboards
2. **Configure Sentry** - For exception tracking and alerting
3. **Create runbooks** - Document how to debug issues using Request IDs

### Example Logger for Artifact Review

```typescript
// convex/lib/logger.ts
export const LOG_TOPICS = {
  Auth: "AUTH",
  Artifact: "ARTIFACT",
  Review: "REVIEW",
  System: "SYSTEM",
} as const;

type LogTopic = typeof LOG_TOPICS[keyof typeof LOG_TOPICS];

interface LogMetadata {
  userId?: string;
  artifactId?: string;
  reviewId?: string;
  [key: string]: unknown;
}

export function createLogger(context: string) {
  const log = (
    level: "debug" | "info" | "warn" | "error",
    topic: LogTopic,
    metadata: LogMetadata,
    message: string
  ) => {
    const payload = JSON.stringify({
      level,
      topic,
      context,
      metadata,
      message,
      timestamp: new Date().toISOString(),
    });

    switch (level) {
      case "debug": console.debug(payload); break;
      case "info": console.log(payload); break;
      case "warn": console.warn(payload); break;
      case "error": console.error(payload); break;
    }
  };

  return {
    debug: (topic: LogTopic, metadata: LogMetadata, message: string) =>
      log("debug", topic, metadata, message),
    info: (topic: LogTopic, metadata: LogMetadata, message: string) =>
      log("info", topic, metadata, message),
    warn: (topic: LogTopic, metadata: LogMetadata, message: string) =>
      log("warn", topic, metadata, message),
    error: (topic: LogTopic, metadata: LogMetadata, message: string) =>
      log("error", topic, metadata, message),
  };
}
```

---

## Sources Summary

### Official Documentation
- [Debugging | Convex Developer Hub](https://docs.convex.dev/functions/debugging)
- [Logs | Convex Developer Hub](https://docs.convex.dev/dashboard/deployments/logs)
- [Log Streams | Convex Developer Hub](https://docs.convex.dev/production/integrations/log-streams/)
- [Environment Variables | Convex Developer Hub](https://docs.convex.dev/production/environment-variables)
- [Exception Reporting | Convex Developer Hub](https://docs.convex.dev/production/integrations/exception-reporting)
- [CLI | Convex Developer Hub](https://docs.convex.dev/cli)
- [Limits | Convex Developer Hub](https://docs.convex.dev/production/state/limits)

### Convex Stack Articles
- [Observing your app in production](https://stack.convex.dev/observability-in-production)
- [Log Streams: Common uses](https://stack.convex.dev/log-streams-common-uses)
- [Customizing serverless functions without middleware](https://stack.convex.dev/custom-functions)
- [Operational maturity for production](https://stack.convex.dev/operational-maturity-for-production)

### Community Resources
- [convex-helpers GitHub](https://github.com/get-convex/convex-helpers)
- [Convex Discord Questions Archive](https://discord-questions.convex.dev)
- [Axiom + Convex Integration](https://axiom.co/docs/apps/convex)
- [Announcing Convex 1.4](https://news.convex.dev/announcing-convex-1-4/)
