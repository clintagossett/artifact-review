# Task 00047: Build Agent & Skills Workflow System

**GitHub Issue:** #47

---

## Resume (Start Here)

**Last Updated:** 2026-01-29 (Session 1)

### Current Status: IN PROGRESS

**Phase:** Designing session startup flow and skill architecture.

### What We Did This Session (Session 1)

1. **Created GitHub issue** - #47 with full scope and deliverables
2. **Created task folder** - `tasks/00047-test-fixer-agent-skills/`
3. **Verified environment** - Spawned background agent to start Docker/dev servers
4. **Designed session startup flow** - Two-step process documented below
5. **Created all skills:**
   - `/ready-environment` - Step 1: verify/start infrastructure + smoke tests
   - `/check-branch-state` - Step 2: detect new dev vs WIP, validate baseline
   - `/run-tests` - Execute test suites (unit, e2e, smoke, all)
   - `/analyze-failures` - Categorize failures by type
   - `/e2e-fixes` - E2E timing fix patterns
6. **Created test-fixer agent** - `.claude/agents/test-fixer.md`

### Next Steps

1. **Validate skills work** - Test each skill can be invoked
2. **Test the full flow** - Session startup → ready to dev
3. **Test the test-fixer agent** - Spawn and verify it can use skills
4. **Consider wrapper skill** - `/start-dev-session` that runs both steps

---

## Objective

Create a composable agent + skills architecture that enables:
1. **Session startup flow** - Verify environment and branch state before development
2. **Test validation system** - Specialized agent for diagnosing and fixing test failures

---

## Session Startup Flow (Ready to Dev)

Every development session must pass through two sequential gates before work begins.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Session Starts                                       │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Environment Check (/ready-environment)             │
│                                                             │
│  ├── Start what's stopped (not recreate)                    │
│  │   ├── Docker containers (docker start, not compose up)   │
│  │   ├── Orchestrator proxy                                 │
│  │   └── Dev servers (tmux sessions)                        │
│  ├── Verify connectivity                                    │
│  │   ├── curl https://james.loc                             │
│  │   ├── curl https://api.james.loc                         │
│  │   └── curl https://james.convex.cloud.loc                │
│  └── Run smoke tests (proves systems work together)         │
│                                                             │
│  Output: PASS (environment ready) or FAIL (fix issues)      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼ PASS
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Branch State (/check-branch-state)                 │
│                                                             │
│  Detect branch state:                                       │
│  ├── New Development (clean branch, starting fresh)         │
│  │   └── Run FULL test suite                                │
│  │       └── All green? → Ready to dev                      │
│  │       └── Failures? → STOP. Fix baseline first.          │
│  │                                                          │
│  └── WIP (development in progress)                          │
│      └── Load context (SESSION-RESUME.md, git log)          │
│      └── Report what's in progress                          │
│      └── Ready to continue                                  │
│                                                             │
│  Output: "Ready to work on [task]" or "Baseline broken"     │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Ready to Dev                                               │
│                                                             │
│  - Environment verified                                     │
│  - Baseline validated (new dev) or context loaded (WIP)     │
│  - Agent ready to receive instructions                      │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters

| Problem | Solution |
|---------|----------|
| Debugging tests when environment is broken | Step 1 catches this early |
| Starting new work on broken baseline | Step 2 runs full tests first |
| Wasting context on infra issues | Background agents handle Step 1 |
| Not knowing what to resume | Step 2 loads WIP context |

### Key Principles

1. **Start existing services, don't recreate them** - `docker start` not `docker compose up`
2. **Smoke tests prove connectivity** - Not just "is it running" but "does it work"
3. **New dev requires clean baseline** - All tests must pass before starting new work
4. **WIP just needs systems connected** - Resume where you left off

---

## Test-Fixer Agent Architecture

```
orchestrating agent (james/mark)
    └── spawns: test-fixer agent
                    ├── uses: /run-tests (skill)
                    ├── uses: /analyze-failures (skill)
                    └── uses: /e2e-fixes (skill)
```

**Philosophy:**
- **Agent** = judgment, decision-making, knows when to escalate
- **Skills** = reusable patterns/workflows any agent can invoke

---

## Deliverables

### Session Startup Skills

| File | Purpose |
|------|---------|
| `.claude/commands/ready-environment.md` | Step 1: Start services, verify connectivity, run smoke tests |
| `.claude/commands/check-branch-state.md` | Step 2: Detect new dev vs WIP, validate baseline or load context |

### Test-Fixer Agent & Skills

| File | Purpose |
|------|---------|
| `.claude/agents/test-fixer.md` | Specialized agent for diagnosing and fixing test failures |
| `.claude/commands/run-tests.md` | Skill for running test suites and capturing output |
| `.claude/commands/analyze-failures.md` | Skill for categorizing failures by type |
| `.claude/commands/e2e-fixes.md` | Skill for E2E timing fix patterns |

---

## Success Criteria

### Session Startup
- [x] `/ready-environment` skill created
- [x] `/check-branch-state` skill created
- [ ] Flow tested: environment down → ready to dev

### Test-Fixer
- [x] `test-fixer.md` agent created with proper frontmatter
- [x] `/run-tests` skill created
- [x] `/analyze-failures` skill created
- [x] `/e2e-fixes` skill created
- [ ] Test-fixer agent can be spawned and use skills

---

## Reference

Source: `orchestrator-artifact-review/tasks/test-fixer-workflow.md`
