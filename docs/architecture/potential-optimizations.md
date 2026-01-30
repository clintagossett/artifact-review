# Potential Architecture Optimizations

This document tracks architectural improvements that could be made but aren't currently prioritized.

## Summary

| Service | Decision | Status | Reason |
|---------|----------|--------|--------|
| **Novu** | ✅ Shared (standard) | ✅ **Implemented** | Login pain, 1GB cost, infrastructure data |
| **Mailpit** | ❌ Per-agent | N/A | Debugging clarity, only 20MB |
| **Convex** | ❌ Per-agent | N/A | Data isolation critical, only 100MB |

**Design Pattern:** All configurations use [DNS Indirection](../../../../../docs/DESIGN-PATTERN-DNS-INDIRECTION.md) for port independence.

---

## Shared Novu Instance ✅ IMPLEMENTED (Standard)

### Implementation Status
**Shared Novu is now the standard approach** - all agents use a single Novu instance.

### Problem Solved
**Novu requires manual login on every restart** via the web UI (port 4200). Per-agent Novu instances were painful:
- Each agent restart required re-login
- No persistent authentication
- Not designed for frequent restarts
- ~1GB memory per agent

### Solution
Single shared Novu instance for all agents:

```
/home/clint-gossett/Documents/agentic-dev/
├── services/novu/
│   ├── docker-compose.yml        # Shared Novu stack
│   └── start.sh                  # Novu management script
├── orchestrator/
│   ├── shared-proxy.js           # DNS → Port routing
│   └── proxy-config.json         # Port mappings
└── agents/
    ├── default/
    │   └── .env.local            # NOVU_API_URL=https://api.novu.loc
    └── mark/
        └── .env.local            # NOVU_API_URL=https://api.novu.loc
```

**Benefits:**
1. **Single login point** - Only need to login once for all agents
2. **Resource savings** - ~1GB saved per additional agent
3. **Multi-tenancy support** - Novu has built-in Organizations/Environments
4. **Realistic architecture** - Mirrors production (one notification service, multiple apps)
5. **DNS indirection** - Port changes don't affect agent configuration

**Key Design Decision:**
Agents use `https://api.novu.loc` instead of `http://localhost:3002`. This provides:
- Port independence (infrastructure changes isolated)
- Environment portability (same config across dev/staging/prod)
- Easy service switching (shared ↔ per-agent via proxy config only)

**Trade-offs:**
- Single point of failure (one Novu down = all agents affected - acceptable for local dev)
- Shared MongoDB/Redis could have contention (minimal in practice)
- Shared login (feature, not bug - avoids per-agent authentication pain)

### Usage

**Start shared Novu:**
```bash
cd /home/clint-gossett/Documents/agentic-dev/services/novu
./start.sh
```

**Agent environments auto-detect:**
When you start an agent, it automatically detects and uses shared Novu if available:
```bash
cd agents/mark/artifact-review
./scripts/start-dev-servers.sh --agent mark --port 3010
# Output: [FOUND] Shared Novu is running - using shared instance
```

**See full documentation:**
- [SHARED-NOVU.md](../../../../../docs/SHARED-NOVU.md) in docs directory

### Status
**Shared Novu is the standard** - all new agent setups should use it.

If shared Novu is not running, agents will detect this and skip Novu-dependent features. Start shared Novu with:
```bash
cd /home/clint-gossett/Documents/agentic-dev/services/novu
./start.sh
```

---

## Convex Backend - Keep Per-Agent (Decision: Don't Share)

### Current State
Each agent runs its own Convex backend Docker container:
- mark: ports 3220 (admin), 3221 (HTTP)
- default: ports 3210 (admin), 3211 (HTTP)
- ~100MB memory per instance

### Why NOT to Share

**Critical difference: Convex stores application data, not just infrastructure.**

1. **Data Isolation is Critical**
   - Each agent needs isolated test users, artifacts, reviews
   - Prevent cross-contamination between agent experiments
   - Clean slate for testing migrations and schema changes

2. **Independent Schema Evolution**
   - Test schema migrations on one agent without affecting others
   - Different schema versions during development
   - Safe to experiment with breaking changes

3. **Parallel Development**
   - Multiple agents can work independently without conflicts
   - No database state collisions
   - True independence for experimentation

4. **No Login Pain**
   - Unlike Novu, Convex has no authentication UI
   - Admin key is in env vars - no manual login required
   - No consolidation benefit

5. **Reasonable Resource Cost**
   - Only ~100MB per backend (vs Novu's ~1GB)
   - Cost/benefit heavily favors isolation

**Even if deployment names worked:** Would still share the same database instance, risking query leaks and performance issues.

**Decision:** Keep separate Convex backends per agent. Data isolation is worth the minimal resource cost.

---

## Mailpit - Keep Per-Agent (Decision: Don't Share)

### Current State
Each agent has its own Mailpit instance:
- mark: 8035 (web), 4035 (SMTP)
- default: 8025 (web), 1025 (SMTP)
- ~10-20MB memory per instance

### Why NOT to Share

**Considered sharing a single Mailpit instance but decided against it because:**

1. **Isolation is valuable** - When debugging one agent, you want a clean inbox showing only that agent's emails
2. **Resource cost is minimal** - Unlike Novu (~1GB), Mailpit is only ~20MB per instance
3. **No login pain** - Mailpit has no authentication, so no benefit from consolidation
4. **Development tool** - Only used during active development, not production infrastructure

**Decision:** Keep per-agent Mailpit instances for debugging clarity.

---

## Related Documentation

- [DNS Indirection Design Pattern](../../../../../docs/DESIGN-PATTERN-DNS-INDIRECTION.md) - Core pattern for port independence
- [Shared Novu Setup](../../../../../docs/SHARED-NOVU.md) - Implementation details and usage guide

## Future Considerations

Other potential optimizations to evaluate:
- Shared Redis for session storage across agents
- Shared proxy service instead of per-agent proxies
- Central logging/monitoring for all agent environments
