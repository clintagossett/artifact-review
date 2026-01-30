# SESSION-RESUME.md Template

This is a reference template for the `SESSION-RESUME.md` file that lives at the project root. Copy this structure when creating or updating the session resume.

---

```markdown
# Session Resume

**Last Updated:** YYYY-MM-DD HH:MM
**Branch:** branch-name
**Agent:** james/mark/etc

## Status: [READY | WIP | BLOCKED]

---

## Current Work

### Task #XX - Task Name
**Status:** [Planning | Implementation | Testing | Complete | Blocked]

**Completed:**
- Item 1
- Item 2

**Next:**
1. Next step
2. Following step

**Blockers (if any):**
- Blocker description (link to issue if applicable)

---

### Task #YY - Another Task (if multiple)
**Status:** Status

**Context:**
- Relevant context

**Next:**
1. Steps

---

## Environment State

**Last verified:**
| Component | Status |
|-----------|--------|
| Docker (agent-backend) | Running/Stopped |
| Orchestrator proxy | Running/Stopped |
| Dev servers (tmux) | Running/Stopped |
| https://agent.loc | Accessible/Down |

---

## Key Files

| File | Purpose |
|------|---------|
| `path/to/file` | Why it matters |
| `another/file` | Purpose |

---

## Commands to Resume

```bash
# 1. Verify environment
source .env.docker.local
docker ps --filter "name=${AGENT_NAME}"
tmux list-sessions

# 2. Task-specific commands
cd app && npm run test:e2e -- specific-test.spec.ts

# 3. Other helpful commands
```

---

## Session History

### YYYY-MM-DD (agent) - Brief Description
- What was done
- Key outcomes

### YYYY-MM-DD (agent) - Previous Session
- Previous work
- Outcomes

---

**Next agent:** Clear instruction for what to do first.
```

---

## Guidelines

### When to Update

- **Start of session:** Read existing file, verify still accurate
- **During session:** Update as significant progress is made
- **End of session:** Always update before stopping work

### Status Values

| Status | Meaning |
|--------|---------|
| `READY` | Environment verified, baseline green, ready to start new work |
| `WIP` | Work in progress, resume from where left off |
| `BLOCKED` | Cannot proceed, blocker must be resolved first |

### What to Include

**Always:**
- Current branch and agent name
- Active task(s) with status
- Next steps (clear, actionable)
- Commands to resume

**When relevant:**
- Blockers with links to issues
- Environment state if recently changed
- Key files being worked on
- Session history for context

### What NOT to Include

- Extensive logs or debug output (put in task folder)
- Full test results (put in test-report.md)
- Implementation details (put in task README)
- Sensitive information (credentials, keys)

### Location

Always at project root: `/SESSION-RESUME.md`

This ensures any agent starting a session can immediately find and read it.
