# Subtask 01: Define Initial Test Strategy

**Parent Task:** 00004-testing-strategy
**Status:** COMPLETE
**Completed:** 2024-12-25
**Created:** 2024-12-25

---

## Objective

Document the testing and validation strategy developed through collaborative discussion with TDD expert, incorporating best practices for AI-assisted development.

---

## Context: The Problems We're Solving

### 1. Test Bloat Risk
When AI agents generate tests during development, you can end up with a wall of tests you haven't reviewed, with no idea of their value and massive maintenance burden.

### 2. Dev-Time vs Project Tests
AI development creates an expanded need for tests during feature development, but not all should be uplifted to the project. Need clear separation between:
- Tests used to validate during development (ephemeral)
- Tests that provide ongoing regression protection (permanent)

### 3. Test Taxonomy Confusion
Unclear boundaries between unit tests, integration tests, E2E tests, validation tests. Need a clear strategy across all types that the developer understands.

### 4. Human Validation Need
Want a feature validation step after each AI coding completion that provides **video evidence** of the feature working, showing various validation angles. For human consumption, not just pass/fail automation.

---

## The Strategy: Three-Tier Testing System

### Tier 1: Task-Level Tests (Dev-Time, Ephemeral)

**Location:** `tasks/XXXXX-feature/tests/`

**Purpose:** Validate feature during AI development, document test angles explored

**Characteristics:**
- Written by AI agent during feature development
- Live alongside feature context (requirements, decisions)
- May include many edge case tests used during development
- NOT automatically part of the project codebase

**Lifespan:** Until feature review/promotion

**Structure:**
```
tasks/XXXXX-feature/
├── tests/
│   ├── convex/
│   │   └── feature.test.ts
│   ├── e2e/
│   │   └── feature-flow.spec.ts
│   └── validation-videos/
│       └── feature-demo.mp4
├── test-report.md
└── PROMOTION.md
```

### Tier 2: Project-Level Tests (Promoted, Maintained)

**Location:**
- `convex/__tests__/` - Convex function tests
- `src/__tests__/` - Component tests (if any)
- `e2e/critical-paths/` - E2E regression tests

**Purpose:** Prevent regressions, document contracts, catch future breaks

**Characteristics:**
- Curated from task-level tests after human review
- Only tests that provide ongoing value
- Run automatically (Convex/unit on commit, E2E on deploy)
- Maintained as part of the codebase

**Lifespan:** Permanent (until feature removed)

### Tier 3: Validation Artifacts (Human Review)

**Location:** `tasks/XXXXX-feature/tests/validation-videos/`

**Purpose:** Prove feature works for human review, baseline for future comparison

**Characteristics:**
- Video recording of E2E test or manual walkthrough
- Shows feature working from user perspective
- Includes relevant context (e.g., email received for magic link flow)
- Archived with task as historical record

**Audience:** Developer (also acting as product manager)

**Lifespan:** Archived with task folder

---

## Test Taxonomy (Plain Terms)

| Type | What It Tests | Speed | When to Use |
|------|---------------|-------|-------------|
| **Unit** | One function does what it says | Fast (ms) | Pure logic, validators, utilities |
| **Integration** | Pieces work together | Medium | Convex functions with DB operations |
| **E2E** | Full user flow in real browser | Slow | Critical paths, user journeys |
| **Validation** | Human-reviewable proof it works | Variable | Feature completion, handoff |

### For Artifact Review Specifically:

| Layer | Test Approach |
|-------|---------------|
| Convex functions | `convex-test` + Vitest for integration tests |
| React components | Light touch - E2E covers most; unit test complex logic only |
| User flows | Playwright E2E with video recording |
| Auth (magic link) | E2E happy path + Convex token logic tests |

---

## Agent Workflow Per Feature

```
1. READ requirements
   └── Draft test plan (what angles to test)

2. WRITE tests first in tasks/XXXXX/tests/
   └── TDD: Red → Green → Refactor

3. IMPLEMENT feature until tests pass
   └── Iterate with tests as guardrails

4. RUN E2E test with video recording
   └── Save to validation-videos/

5. GENERATE test-report.md
   └── What was tested, coverage, results

6. DEVELOPER REVIEWS
   └── Watch video, read report
   └── Decide which tests to promote

7. PROMOTE tests to main codebase
   └── Copy/move valuable tests

8. CLOSE task
   └── Archive becomes historical record
```

---

## Auth Testing Sweet Spot

For magic link authentication, the minimum viable coverage:

### Keep (High Value, Low Maintenance)

| Test | Type | Run When | Why |
|------|------|----------|-----|
| Full signup/signin flow | E2E (Playwright) | Deploy | Catches 80% of auth breaks |
| `generateMagicLinkToken` | Convex unit | Commit | Token bugs are silent killers |
| `verifyMagicLinkToken` - valid | Convex unit | Commit | Core happy path |
| `verifyMagicLinkToken` - expired | Convex unit | Commit | Critical security edge |
| `verifyMagicLinkToken` - used | Convex unit | Commit | Prevent token reuse |
| Full flow validation video | Artifact | Feature completion | Human confidence |

### Skip (Overkill for Solo Developer)

- Component tests for sign-in form (E2E covers it)
- Every input validation edge case (hit during development)
- Mocking Convex auth internals (trust the framework)
- Performance tests (premature optimization)

**Time Investment:** ~2-3 hours to write once. ~5 min/month maintenance.

---

## Open Questions (Answered)

1. **Test email service for magic link testing**
   - Use `convex-test` with `withIdentity()` for unit testing token logic
   - For E2E, consider: Mailosaur, Ethereal Email, or test-specific email addresses
   - Decision: Start with unit tests for token logic; add E2E email testing if needed later

2. **Playwright video recording config**
   - Playwright has native video recording: `video: 'on'` in config
   - Store in `tasks/XXXXX/tests/validation-videos/`
   - Quality/size tradeoff: use `'retain-on-failure'` for CI, `'on'` for validation artifacts

3. **Promotion automation**
   - Start manual (copy/move files)
   - If pattern emerges, create simple script
   - Decision: Manual for now, revisit after 5-10 promotions

4. **CI/CD integration**
   - GitHub Actions workflow
   - Convex/unit tests: run on every commit
   - E2E tests: run on deploy (or PR to main)
   - See CI config in Research Findings below

---

## Research Findings

Research completed 2024-12-25. Two research efforts conducted:
1. TDD + AI Agents best practices (community, Kent Beck, Anthropic guidance)
2. Convex-specific testing patterns (official docs, stack.convex.dev)

### Key Insight: TDD is MORE Important with AI, Not Less

**Kent Beck** (creator of TDD) calls TDD a "superpower" with AI agents because agents can and do introduce regressions. He noted trouble with AI agents trying to **delete tests to make them pass** - highlighting the need for guardrails.

**Anthropic's official guidance** calls TDD an "Anthropic-favorite workflow" because Claude performs best with a clear target to iterate against.

### Agentic TDD Best Practices

The Red-Green-Refactor cycle applies at "AI speed":

**Critical instructions for AI agents:**
- Always start with a failing test (for the correct reason)
- Write only one test at a time
- Single assertion per test
- Implement only minimal code to pass
- Never delete tests to make them pass

**Watch out for:**
- Shortcut-taking (disabling linting, reverting upgrades)
- Test deletion to "pass"
- Context pollution (implementation bleeding into test logic)

### Managing AI-Generated Test Volume

| Problem | Data |
|---------|------|
| PR volume increase | 10x from AI agents |
| Flaky tests | 10% (2022) → 26% (2025) |

**Strategies:**
- Progressive rollout (suggestion mode → staging → production)
- Quality gates (80% pass rate before blocking deploys)
- Aim for >95% reliability before focusing on coverage
- **Our task-folder approach directly addresses this**

### Convex Testing Stack

**Official tools:**

| Tool | Purpose | Docs |
|------|---------|------|
| `convex-test` | Fast unit/integration tests | docs.convex.dev/testing/convex-test |
| Local Backend | Production parity testing | docs.convex.dev/testing/convex-backend |
| `ConvexReactClientFake` | React component testing | convex-helpers package |

**Setup:**
```bash
npm install --save-dev convex-test vitest @edge-runtime/vm
```

**Basic pattern:**
```typescript
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

test("creating artifact", async () => {
  const t = convexTest(schema);
  await t.mutation(api.artifacts.create, { title: "Test" });
  const artifacts = await t.query(api.artifacts.list);
  expect(artifacts).toHaveLength(1);
});
```

**Auth testing with `withIdentity`:**
```typescript
const asSarah = t.withIdentity({ name: "Sarah", email: "sarah@example.com" });
await asSarah.mutation(api.artifacts.create, { title: "Sarah's artifact" });
```

### Convex Team's Testing Philosophy

> "Attitudes like aiming for 100% code coverage... often don't do much to improve actual correctness despite consuming a lot of engineering effort."

**Their recommendations (align with ours):**
1. Start with manual testing, document in PRs
2. Unit test core business logic (security, auth, critical paths)
3. Add E2E smoke tests for obvious breakage
4. Use preview deployments for stakeholder review

### Convex-test Limitations

- Does NOT enforce size/time limits
- No cron job support (trigger manually)
- Error messages may differ from production
- Use local backend when production parity matters

### CI/CD Configuration

**GitHub Actions workflow (`.github/workflows/test.yml`):**
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run test
```

### Visual Testing Tools

For validating AI-generated UI:
- **Playwright** - Built-in video recording + visual comparison
- **Percy**, **Applitools** - AI-powered screenshot comparison (if needed later)

### Spec-Driven Development (Emerging)

GitHub released **Spec Kit** (Sept 2025) as complementary approach:
1. Specify → AI generates detailed spec
2. Tasks → AI breaks spec into reviewable chunks
3. Implement → Agent tackles tasks one by one

May be worth exploring for complex features.

### Sources

**TDD + AI Agents:**
- [TDD, AI agents and coding with Kent Beck - Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent)
- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Agentic TDD - Nizar's Blog](https://nizar.se/agentic-tdd/)
- [TDD Guard - GitHub](https://github.com/nizos/tdd-guard)

**Convex Testing:**
- [Testing Overview - Convex Docs](https://docs.convex.dev/testing)
- [convex-test Documentation](https://docs.convex.dev/testing/convex-test)
- [Testing Patterns - Stack](https://stack.convex.dev/testing-patterns)
- [Testing React Components - Stack](https://stack.convex.dev/testing-react-components-with-convex)
- [convex-test GitHub](https://github.com/get-convex/convex-test)

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file - strategy documentation |

---

## How This Will Be Used

This document serves as the reference for:
1. AI agents building features (follow the workflow)
2. Developer reviewing test output (understand the tiers)
3. Future team members (understand the testing philosophy)
