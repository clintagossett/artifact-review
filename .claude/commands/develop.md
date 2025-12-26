# /develop - Feature Development Mode

Before implementing any feature, read and follow these development guides:

## Required Reading

1. **Workflow Guide** - `docs/development/workflow.md`
   - TDD cycle (Red-Green-Refactor)
   - Task folder structure
   - Test organization

2. **Testing Guide** - `docs/development/testing-guide.md`
   - Three-tier test system
   - convex-test patterns
   - E2E with Playwright

3. **Logging Guide** - `docs/development/logging-guide.md`
   - Structured JSON logging
   - Frontend: `@/lib/logger`
   - Backend: `convex/lib/logger`

4. **Convex Rules** - `docs/architecture/convex-rules.md`
   - Function syntax with validators
   - Use indexes, not filter
   - Actions cannot use ctx.db

## TDD Workflow Summary

```
1. READ task requirements
2. CREATE test files in tasks/XXXXX/tests/
3. WRITE failing test (RED)
4. IMPLEMENT minimal code (GREEN)
5. REFACTOR if needed
6. REPEAT until complete
7. GENERATE validation trace (Playwright trace.zip)
8. CREATE test-report.md
```

## Test Structure

```
tasks/XXXXX-feature/
├── tests/
│   ├── package.json           # E2E dependencies (Playwright)
│   ├── playwright.config.ts   # E2E test configuration
│   ├── node_modules/          # Gitignored
│   ├── convex/                # Convex function tests
│   ├── e2e/                   # Playwright E2E tests
│   └── validation-videos/
│       └── feature-trace.zip  # Playwright trace (PRIMARY)
└── test-report.md             # Coverage documentation
```

**Quick E2E Setup:** See `docs/development/TESTING-QUICK-START.md`

## Logging Pattern

```typescript
// Backend (Convex)
import { createLogger, Topics } from './lib/logger';
const log = createLogger('module.function');
log.info(Topics.Auth, 'Event description', { metadata });

// Frontend
import { logger, LOG_TOPICS } from '@/lib/logger';
logger.info(LOG_TOPICS.Auth, 'Component', 'Event', { metadata });
```

## Ready to Implement

After reading the guides, you should:

1. Understand what task you're implementing
2. Know where to put tests (`tasks/XXXXX/tests/`)
3. Follow TDD strictly (test first, always)
4. Use structured logging throughout
5. Deliver with:
   - Passing tests (backend + E2E)
   - Validation trace (`trace.zip`)
   - Test report (`test-report.md`)
