# Task 00039: AI Agent Collaboration Workflow

**GitHub Issue:** [#39](https://github.com/clintagossett/artifact-review/issues/39)
**Related Project:** Blocks #38 (Team Accounts & RBAC Planning)

---

## Resume (Start Here)

**Last Updated:** 2026-01-18 (Session 1)

### Current Status: 🔧 DESIGN & EXPLORATION

**Phase:** Understanding existing Convex APIs and designing the agent workflow.

### What We Did This Session (Session 1)

1. **Created task** - GitHub issue #39 and this task directory
2. **Defined the goal** - Use Artifact Review for human-AI collaboration on planning docs

### Next Steps

1. **Explore existing Convex mutations/queries** - What's already available for artifacts and comments?
2. **Design the workflow** - How will agent upload, human comment, agent retrieve?
3. **Build or extend APIs** - Create any missing endpoints
4. **Document the workflow** - Make it repeatable

---

## Objective

Create a workflow enabling AI agents to collaborate with humans using Artifact Review:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │     │  Artifact       │     │     Human       │
│                 │     │  Review         │     │                 │
│  1. Create/     │────▶│  Stores &       │◀────│  2. Views &     │
│     update      │     │  renders        │     │     comments    │
│     artifact    │     │  artifact       │     │                 │
│                 │◀────│                 │     │                 │
│  3. Fetch       │     │  Returns        │     │                 │
│     comments    │     │  comments       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Why This Matters

- **Dogfooding** - Use our own product for planning/documentation
- **Proves value** - AI-human collaboration is a core use case
- **Blocks #38** - We want to use this for Team Accounts planning

---

## Interface Approach Decision (Research Required)

> **Decision To Make:** How should the AI agent interact with Artifact Review?

### Option A: Direct Convex API Calls (Scripts)

**Description:** Node.js scripts that call Convex functions directly using the Convex client.

| Pros | Cons |
|------|------|
| Fastest to implement - APIs already exist | Requires managing auth tokens |
| Full access to all Convex functionality | Agent needs to run Node.js scripts |
| No additional infrastructure | Tightly coupled to Convex internals |
| Can leverage existing mutations/queries | Not portable to other AI agents |

**Auth approach:** Convex service tokens or user impersonation via stored JWT.

**Example usage:**
```bash
node scripts/agent-upload.js --file plan.md --name "RBAC Plan"
node scripts/agent-fetch-comments.js --artifact xyz123
```

---

### Option B: CLI Tool

**Description:** A proper CLI built with a framework (e.g., Commander, oclif) that wraps the Convex API.

| Pros | Cons |
|------|------|
| Clean, documented interface | More work to build and maintain |
| Portable - any AI agent can use it | Still requires Node.js runtime |
| Human-friendly for manual use too | Auth credential management |
| Versioned, installable via npm | Additional abstraction layer |

**Auth approach:** Config file (~/.artifact-review) or environment variables.

**Example usage:**
```bash
artifact-review upload --file plan.md --name "RBAC Plan"
artifact-review comments --artifact xyz123
artifact-review update --artifact xyz123 --file plan-v2.md
```

---

### Option C: MCP Server

**Description:** Model Context Protocol server that exposes Artifact Review as tools for AI agents.

| Pros | Cons |
|------|------|
| Native integration with Claude Desktop | **Context window consumption** - fills up context fast |
| Agent calls tools directly (no scripts) | Debugging is difficult (client-specific quirks) |
| Dynamic tool discovery at runtime | Auth is a known challenge for remote MCP |
| Anthropic-backed open standard | **Server sprawl** in enterprises (no central catalog) |
| OpenAI, Microsoft integrating MCP in 2025 | Developer experience still maturing |

**Research Findings (Jan 2025):**
> "The ease of creating MCP servers has led to 'server sprawl' within large organizations, resulting in a lack of central catalogs, consistent management, and observability." - a16z
>
> "Managing large context windows can be computationally expensive... Excessive token consumption from MCP tool definitions and intermediate results can decrease agent efficiency." - Anthropic docs

**Target User Fit:**
- ✅ Claude Desktop users - native support
- ✅ Claude Code users - works but context issues
- ❌ ChatGPT users - no MCP support
- ⚠️ Business users - setup complexity concerns

---

### Option D: HTTP REST API

**Description:** Add HTTP endpoints in Convex for external access.

| Pros | Cons |
|------|------|
| Standard interface - works everywhere | More attack surface to secure |
| **ChatGPT plugins use OpenAPI specs** | Need to build auth layer (API keys) |
| Works with curl, any language | Stateless - no context preservation |
| Can become a product feature | Duplicates some Convex function logic |
| **Portable: Cursor, Copilot, any agent** | Rate limiting needed |

**Research Findings:**
> "ChatGPT plugins offer solutions for... integration with CRM systems, databases, and custom APIs... Developers can create custom plugins by building an API, describing it with an OpenAPI Specification." - OpenAI

**Target User Fit:**
- ✅ ChatGPT users - via plugins (OpenAPI spec)
- ✅ Claude Code/Desktop - can call REST
- ✅ Cursor, Copilot, other agents
- ✅ Business users - simple auth (API key)

---

### Future: MCP as Wrapper (If Needed)

> "Many MCP servers can function as wrappers for traditional APIs, translating MCP calls into backend API requests." - a16z

**If MCP matures:**
- We can add an MCP server that wraps our REST API
- No rewrite needed - REST becomes the foundation
- MCP would just be an optional interface layer

**Decision:** Build REST first. MCP can wrap it later if demand exists.

---

## Research Summary: MCP vs REST for Target Users

### Your Target Audience
1. **Claude Code users** (developers)
2. **Claude Desktop users** (business/PM users)
3. **ChatGPT users** (if possible)

### Key Research Findings

| Factor | MCP | REST API |
|--------|-----|----------|
| **Claude Desktop** | ✅ Native support | ✅ Works (agent calls API) |
| **Claude Code** | ⚠️ Context consumption issues | ✅ Works well (your experience) |
| **ChatGPT** | ❌ No support | ✅ Via OpenAPI plugins |
| **Setup Complexity** | High (run MCP server) | Low (just API keys) |
| **Context Usage** | Heavy (tool defs in context) | Light (only results returned) |
| **Auth Robustness** | Still being solved | Well-established patterns |
| **Debugging** | Difficult | Easy (standard HTTP) |
| **Future Trajectory** | Growing adoption (2025) | Always supported |

### User Experience Reports

**MCP Issues (from research):**
- "Setup complexity... likened to assembling IKEA furniture"
- "Inconsistency... struggles with basic context switching"
- "Debugging due to client-specific quirks and absent client-side traces"
- "Authentication poses a significant challenge for remote MCP adoption"

**REST Advantages:**
- "Well-understood, programmatic way for AI agents to interact"
- "With proper documentation and standard auth flows (OAuth 2.0), REST APIs can be made accessible to AI agents"
- "ChatGPT plugins allow developers to extend functionality... using OpenAPI Specification"

## Preliminary Recommendation

Based on research and your stated goals:

### 🏆 Recommended: Option D (REST API) + Agent Profiles

**Architecture Decision (Session 2):**
- **Treat Agents as Profiles:** We upleveled Agents to "First-Class Entities" (`agents` table).
- **Stable Identity:** The Agent ID remains constant.
- **Rotatable Keys:** We can now rotate API keys endlessly without losing the Agent's comment history or identity. This confirms the **REST API** choice as the correct interface for these credentials.

**Phase 1 (Now - Dogfooding):**
- Build `agents` table and simple Node.js scripts
- Implement API Key generation for specific Agent Profiles
- Fast to implement, leverages existing Convex APIs

**Phase 2 (Product Feature):**
- Add public REST API with OpenAPI spec (Option D)
- Enables ChatGPT plugins, Cursor, any HTTP client
- Proper API key auth with rate limiting and rotation

**Why Not MCP (for now):**
- ❌ ChatGPT users can't use it
- ❌ Context consumption issues you've experienced
- ❌ Setup complexity for business users
- ⚠️ Still maturing, auth patterns unclear

**Why REST Wins:**
- ✅ Works with ALL your target users
- ✅ Easy auth (API keys)
- ✅ OpenAPI spec = ChatGPT plugin ready
- ✅ Standard, debuggable, well-understood
- ✅ You can dogfood with simple curl/scripts first

---

## Recommendation Criteria

| Criteria | Weight | Notes |
|----------|--------|-------|
| **Auth ease** | High | How easy is initial setup for the agent? |
| **Auth robustness** | High | Token refresh, expiry handling, security |
| Time to implement | High | We want to use this for #38 planning |
| AI agent compatibility | High | Must work with Antigravity/Gemini |
| Future extensibility | Medium | Other agents, public API |
| Maintainability | Medium | Who maintains this long-term? |

### Auth Workflow Comparison

| Option | Auth Ease | Auth Robustness | Notes |
|--------|-----------|-----------------|-------|
| **A) Direct API** | Medium | Low | Need to manage Convex tokens manually |
| **B) CLI** | High | Medium | Can store creds in config, handle refresh |
| **C) MCP** | ? | ? | Depends on how MCP handles auth |
| **D) REST API** | High | High | Standard API keys, can build revocation |

---

## Questions to Resolve

1. **Does Antigravity support MCP?** If yes, Option C is compelling.
2. **Do we want other users to have API access?** If yes, Option D becomes important eventually.
3. **Is this just for internal dogfooding or a product feature?** Affects investment level.
4. **What auth token do we have access to in this context?** Affects all options.

---

## Design Questions (Separate from Interface)

### 1. Authentication
**Question:** How should the AI agent authenticate to Convex?

**Options:**
- **A) Service token** - Convex supports service tokens for backend access
- **B) User impersonation** - Agent logs in as a specific user account
- **C) API key** - Custom API key system (more work)

### 2. Artifact Format
**Question:** What format should the agent upload?

**Options:**
- **A) Raw markdown** - Store as `.md`, render in viewer (current support)
- **B) Pre-rendered HTML** - Convert markdown to HTML before upload
- **C) Both** - Upload markdown, let server render to HTML

### 3. Comment Retrieval
**Question:** How should agent get comments?

**Options:**
- **A) Direct Convex query** - Call `comments.list` directly
- **B) HTTP endpoint** - Create REST-style endpoint for external access
- **C) Export action** - Add mutation that exports comments as structured data

---

## Proposed Workflow

```bash
# 1. Agent creates/updates planning document
node scripts/agent-upload.js --file planning.md --artifact-name "Team RBAC Plan"

# 2. Agent gets shareable link
# Output: https://artifact.review/a/xyz123abc

# 3. Human opens link, reviews, and comments in UI

# 4. Agent fetches comments
node scripts/agent-fetch-comments.js --artifact xyz123abc

# 5. Agent updates document based on feedback
node scripts/agent-upload.js --file planning.md --artifact xyz123abc --new-version
```

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `scripts/agent-upload.js` | Upload markdown as artifact |
| `scripts/agent-fetch-comments.js` | Retrieve comments for artifact |
| `scripts/agent-workflow.js` | Combined workflow runner |

---

## Testing

1. **Upload test** - Upload a markdown file, verify it renders in UI
2. **Comment test** - Add comment via UI, verify script can retrieve it
3. **Version test** - Upload new version, verify comments on old version preserved
4. **E2E test** - Full workflow from agent perspective
