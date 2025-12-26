# React/Frontend Logging Best Practices Research

**Research Date:** 2025-12-26
**Status:** Complete

---

## Summary of Key Findings

1. **Do not use `console.log` directly in production** - Teams universally recommend using a logging abstraction layer for control, filtering, and environment awareness.

2. **`loglevel` is the community favorite for browser-side React apps** - Lightweight, battle-tested, and works identically in Node.js and browser environments.

3. **Pino is excellent but primarily optimized for Node.js** - Has browser support but is overkill for most frontend needs; better suited for Next.js API routes or Node backends.

4. **Error boundaries + error monitoring services are essential** - Use React ErrorBoundary with services like Sentry for production error tracking.

5. **Structured JSON logging is best practice** - Even on the frontend, structured logs enable better filtering, searching, and integration with log aggregation services.

6. **Environment-based log levels are critical** - Debug/trace in development, warn/error only in production.

7. **PII protection requires proactive design** - Use allow-lists, redaction, and never log request/response bodies by default.

---

## Community Insights

### Reddit / Developer Forums

While specific Reddit threads were not directly accessible, the aggregated community sentiment from developer blogs and forums shows:

- **Most teams start with `console.log`** and migrate to proper logging as projects mature
- **`loglevel`** is frequently recommended for its simplicity and browser compatibility
- **Sentry** is the most commonly mentioned production error tracking service
- **LogRocket** is popular for teams that need session replay alongside logging

Source: [DEV Community - Logging for your frontend apps](https://dev.to/parseable/logging-for-your-frontend-apps-28pj)

### Hacker News Discussions

Key insights from HN discussions on frontend observability:

- **Structured logging is a massive improvement** to observability that is easy to implement
- **Logs vs Traces distinction matters** - Logs can be sampled/dropped; traces need all correlated events or none
- **Frontend devs think in "sessions"** - 1-10 minute blocks of user activity, different from backend request-based thinking
- **Grafana Faro** was mentioned as an open source frontend observability tool

Sources:
- [HN: Structured logging is such an easy to gain, massive improvement](https://news.ycombinator.com/item?id=37226560)
- [HN: Grafana Faro for frontend observability](https://news.ycombinator.com/item?id=33439799)
- [swyx.io: Observability for Frontend Developers](https://www.swyx.io/frontend-observability)

### Developer Blog Consensus

From Medium, DEV.to, and engineering blogs:

> "Outside of ad-hoc logging for debugging purposes, you mustn't use console.log directly. Using console.log restricts you from pre-processing and aggregating logs."
> - [Gajus Kuizinas, Logging in Browser](https://gajus.medium.com/logging-in-browser-2f053dbe69df)

> "Leaving console.log statements in production code can lead to several issues including performance impacts, exposed sensitive data, and an unprofessional user experience."
> - [DEV Community - Stop Using console.log() in 2025](https://dev.to/meganpropps/stop-using-consolelog-in-2025-do-this-instead-24g6)

---

## Authoritative Guidance

### Official React Documentation

React does not prescribe a specific logging library. The official guidance focuses on:

- **ErrorBoundary** - Class components with `componentDidCatch(error, info)` for catching render errors
- ErrorBoundaries cannot catch: async errors, event handlers, SSR errors, or errors within the boundary itself

Source: [React Docs - Error Boundaries](https://legacy.reactjs.org/docs/error-boundaries.html)

### Create React App Environment Variables

- `NODE_ENV` is automatically set: `'development'` for `npm start`, `'production'` for `npm run build`
- Cannot override `NODE_ENV` manually (prevents accidental slow dev builds in prod)
- Custom env vars must be prefixed with `REACT_APP_`

Source: [Create React App - Adding Custom Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)

### Better Stack / LogRocket Guides

**On log levels:**
> "You can filter logging by level (trace/debug/info/warn/error), so you can disable all but error logging in production, and then run `log.setLevel('trace')` in your console to turn it all back on for debugging."

**On structured logging:**
> "It's important to use a structured format that is easy to parse by machines. JSON is a universal favorite for structured log entries because it is ubiquitous and easily readable by humans."

Sources:
- [Better Stack - Best Logging Practices for Sensitive Data](https://betterstack.com/community/guides/logging/sensitive-data/)
- [Loggly - Best Practices for Client-Side Logging](https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/)

---

## Library Comparison

### Recommended: `loglevel`

| Aspect | Details |
|--------|---------|
| **npm** | [loglevel](https://www.npmjs.com/package/loglevel) |
| **Size** | ~1.5KB minified |
| **Browser Support** | Excellent - designed for browser first |
| **Log Levels** | trace, debug, info, warn, error, silent |
| **Structured Logging** | Via plugins (`loglevel-plugin-prefix`, etc.) |
| **Remote Transport** | Via `loglevel-plugin-remote` |
| **Pros** | Dead simple, zero config, drop-in console replacement |
| **Cons** | Less feature-rich than Pino/Winston |

**Best for:** Browser-only React apps, simple setups

### Alternative: `pino` (browser mode)

| Aspect | Details |
|--------|---------|
| **npm** | [pino](https://www.npmjs.com/package/pino) |
| **Size** | ~35KB (larger, Node.js optimized) |
| **Browser Support** | Yes, via `browser` option |
| **Log Levels** | trace, debug, info, warn, error, fatal |
| **Structured Logging** | JSON by default |
| **Remote Transport** | Via `pino-transmit-http` |
| **Pros** | Fastest, structured JSON, redaction built-in |
| **Cons** | Larger bundle, primarily Node.js focused |

**Best for:** Next.js apps, isomorphic code, when you need JSON logs

Source: [Pino Browser Documentation](https://github.com/pinojs/pino/blob/main/docs/browser.md)

### Other Options

| Library | Use Case |
|---------|----------|
| `debug` | Namespaced debug logs, toggle via env var |
| `roarr` | Structured logging, no initialization required |
| `structured-log` | Serilog-inspired, browser compatible |
| `winston` | **NOT recommended for browser** - pulls in `fs`, Node.js only |

### Error Monitoring Services

| Service | Type | Best For |
|---------|------|----------|
| **Sentry** | Error tracking | Stack traces, error grouping, breadcrumbs |
| **LogRocket** | Session replay | Debugging UI issues, Redux state |
| **Datadog** | Full observability | Enterprise, infrastructure + frontend |
| **Bugfender** | Remote logging | Mobile/web apps, real-time log streaming |

Sources:
- [SigNoz - Best Frontend Cloud Logging Tools](https://signoz.io/comparisons/best-frontend-cloud-logging-tools/)
- [Medium - Front-End Logging: Sentry vs. Datadog](https://medium.com/@pottavijay/front-end-logging-error-handling-sentry-vs-datadog-e327668da048)

---

## React-Specific Patterns

### 1. ErrorBoundary with Logging

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    // Log to your service
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack
    });

    // Send to Sentry/LogRocket
    Sentry.captureException(error, { extra: info });
  }
}
```

**Best Practice:** Wrap specific feature areas, not the entire app. Facebook wraps sidebar, info panel, conversation log, and message input separately.

Source: [Smashing Magazine - React Error Handling with Sentry](https://www.smashingmagazine.com/2020/06/react-error-handling-reporting-error-boundary-sentry/)

### 2. useLogger Hook

Popular community hook for lifecycle logging:

```javascript
import { useEffect, useRef } from 'react';

function useLogger(name, props) {
  const prevProps = useRef(props);

  useEffect(() => {
    console.log(`${name} mounted`, props);
    return () => console.log(`${name} unmounted`);
  }, []);

  useEffect(() => {
    console.log(`${name} updated`, { prev: prevProps.current, next: props });
    prevProps.current = props;
  });
}
```

Available in libraries:
- [react-use/useLogger](https://github.com/streamich/react-use/blob/master/docs/useLogger.md)
- [Mantine/use-logger](https://mantine.dev/hooks/use-logger/)
- [useHooks/useLogger](https://usehooks.com/uselogger)

### 3. Logger Context Provider

For apps needing consistent logging across components:

```javascript
const LoggerContext = React.createContext(null);

function LoggerProvider({ children, logger }) {
  return (
    <LoggerContext.Provider value={logger}>
      {children}
    </LoggerContext.Provider>
  );
}

function useLog() {
  return useContext(LoggerContext);
}
```

Source: [Slack Engineering - Creating a React Analytics Logging Library](https://slack.engineering/creating-a-react-analytics-logging-library/)

---

## Environment Configuration Best Practices

### Log Levels by Environment

| Environment | Recommended Level | Rationale |
|-------------|------------------|-----------|
| Development | `debug` or `trace` | See everything |
| Staging | `info` | Verify production behavior with visibility |
| Production | `warn` or `error` | Minimize noise, capture issues |

### Implementation Pattern

```javascript
import log from 'loglevel';

// Set based on environment
if (process.env.NODE_ENV === 'production') {
  log.setLevel('warn');
} else {
  log.setLevel('debug');
}

// Or use custom env var
const LOG_LEVEL = process.env.REACT_APP_LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
log.setLevel(LOG_LEVEL);
```

### Runtime Level Changes

With `loglevel`, you can change levels at runtime in the browser console:

```javascript
// In browser DevTools console
log.setLevel('trace'); // Turn on all logs for debugging
```

---

## Avoiding Sensitive Data in Logs

### What NOT to Log

- Passwords, tokens, API keys
- Full credit card numbers, SSNs
- Health/medical information
- PII: full names + addresses, email addresses (sometimes)
- Full request/response bodies (may contain anything)

### Best Practices

1. **Use allow-lists, not block-lists** - Define what CAN be logged, reject everything else
2. **Implement redaction** - Use libraries like `redact-pii` for automatic scrubbing
3. **Configure error services** - Sentry recommends disabling breadcrumbs if you `console.log` PII
4. **Audit regularly** - Set up monitoring to detect PII leaks in logs

### Pino Redaction Example

```javascript
const logger = pino({
  redact: ['password', 'token', '*.creditCard', 'user.email']
});
```

### Custom Redaction Wrapper

```javascript
const sensitiveKeys = ['password', 'token', 'ssn', 'creditCard'];

function redact(obj) {
  if (typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key of sensitiveKeys) {
    if (key in result) result[key] = '[REDACTED]';
  }
  return result;
}
```

Sources:
- [Skyflow - How to Keep Sensitive Data Out of Your Logs](https://www.skyflow.com/post/how-to-keep-sensitive-data-out-of-your-logs-nine-best-practices)
- [DEV Community - 8 Best Logging Practices](https://dev.to/pragativerma18/8-best-logging-practices-to-keep-sensitive-data-out-39p9)

---

## Should Frontend Logs Go to a Service?

### Arguments FOR Remote Logging

1. **Visibility** - Errors in user browsers are invisible without remote logging
2. **Debugging** - Reproduce issues without user reports
3. **Analytics** - Understand user behavior patterns
4. **Compliance** - Audit trails when required

### Arguments AGAINST (or Caution)

1. **Privacy** - More data collection = more risk
2. **Cost** - Log volume can be expensive
3. **Performance** - HTTP calls for every log can slow the app
4. **Noise** - Too many logs make finding real issues harder

### Recommended Approach for Artifact Review

Given this is a SaaS platform with team collaboration:

1. **Errors** - Always send to Sentry (or similar)
2. **Warnings** - Send in production, useful for degraded states
3. **Info** - Send only critical business events (session start, uploads)
4. **Debug/Trace** - Never send remotely, console only

### Cost-Effective Options

- **Sentry** - Free tier: 5K errors/month
- **LogRocket** - Free tier: 1K sessions/month
- **Bugfender** - Free tier: 100K logs/day

---

## Recommendations for Artifact Review

### 1. Library Choice: `loglevel`

**Why:**
- Tiny bundle size (~1.5KB)
- Simple API, drop-in `console` replacement
- Works in browser and Node (for any SSR/build scripts)
- Runtime level changes for debugging
- Plugin ecosystem for remote transport if needed later

### 2. Error Tracking: Sentry

**Why:**
- De facto standard, huge community
- Free tier sufficient for MVP
- Excellent React integration (`@sentry/react`)
- ErrorBoundary integration built-in
- PII scrubbing by default (unlike LogRocket)

### 3. Log Level Configuration

```javascript
// src/lib/logger.ts
import log from 'loglevel';

const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || DEFAULT_LEVEL;

log.setLevel(LOG_LEVEL as log.LogLevelDesc);

export default log;
```

### 4. Structured Log Wrapper (Optional Enhancement)

```javascript
// src/lib/logger.ts
import log from 'loglevel';

const structuredLog = (level: string, message: string, context?: object) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  log[level](JSON.stringify(entry));
};

export const logger = {
  debug: (msg: string, ctx?: object) => structuredLog('debug', msg, ctx),
  info: (msg: string, ctx?: object) => structuredLog('info', msg, ctx),
  warn: (msg: string, ctx?: object) => structuredLog('warn', msg, ctx),
  error: (msg: string, ctx?: object) => structuredLog('error', msg, ctx),
};
```

### 5. React-Specific Implementation

- Wrap app sections with ErrorBoundary (not entire app)
- Use `useLogger` hook for component lifecycle debugging in dev
- Create a LoggerContext if logging configuration needs to be dynamic

### 6. What to Log

| What | Level | Example |
|------|-------|---------|
| API errors | error | `logger.error('Upload failed', { artifactId, status })` |
| Unexpected states | warn | `logger.warn('Review not found', { reviewId })` |
| User actions | info | `logger.info('Artifact uploaded', { artifactId })` |
| Component lifecycle | debug | `logger.debug('ReviewPanel mounted')` |
| State changes | trace | `logger.trace('State update', { prev, next })` |

### 7. What NOT to Log

- User emails, names (unless explicitly needed)
- Auth tokens, session IDs
- Full artifact content
- Any Convex internal IDs that could leak info

---

## References

### Official Documentation
- [React Error Boundaries](https://legacy.reactjs.org/docs/error-boundaries.html)
- [Create React App - Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Pino Browser Support](https://github.com/pinojs/pino/blob/main/docs/browser.md)
- [loglevel npm](https://www.npmjs.com/package/loglevel)

### Best Practice Guides
- [Loggly - Best Practices for Client-Side Logging in React](https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/)
- [Better Stack - Logging Sensitive Data](https://betterstack.com/community/guides/logging/sensitive-data/)
- [Meticulous - Logging in React In-Depth Guide](https://www.meticulous.ai/blog/getting-started-with-react-logging)
- [Last9 - React Logging: How to Implement It Right](https://last9.io/blog/react-logging/)

### Community Articles
- [Medium - Why You Should Use a Logger Service Instead of Console](https://medium.com/web-tech-journals/why-you-should-use-a-logger-service-instead-of-console-in-your-react-app-7c996714cfc3)
- [Medium - Logging in Browser](https://gajus.medium.com/logging-in-browser-2f053dbe69df)
- [Smashing Magazine - React Error Handling with Sentry](https://www.smashingmagazine.com/2020/06/react-error-handling-reporting-error-boundary-sentry/)
- [DEV Community - Stop Using console.log() in 2025](https://dev.to/meganpropps/stop-using-consolelog-in-2025-do-this-instead-24g6)

### Library Comparisons
- [Better Stack - Top 8 Node.js Logging Libraries](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/)
- [SigNoz - Best Frontend Cloud Logging Tools](https://signoz.io/comparisons/best-frontend-cloud-logging-tools/)
- [npm trends - Logging library comparison](https://npmtrends.com/log4js-vs-loglevel-vs-minilog-vs-pino-vs-react-native-log-level-vs-react-native-logger-vs-reactotron-react-native-vs-winston)

### React Hooks
- [useHooks - useLogger](https://usehooks.com/uselogger)
- [react-use - useLogger](https://github.com/streamich/react-use/blob/master/docs/useLogger.md)
- [Mantine - use-logger](https://mantine.dev/hooks/use-logger/)
