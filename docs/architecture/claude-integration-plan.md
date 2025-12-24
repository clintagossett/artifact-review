# Claude Integration Plan

Strategic plan for MCP and API integration with Claude to enable direct artifact sharing from Claude Code and Claude.ai.

## Strategic Context

**Goal:** Allow users to share AI-generated artifacts directly from Claude to our platform with one click, eliminating manual download/upload friction.

**Competitive Advantage:** Makes our platform the default sharing destination for Claude users, creating tight integration that competitors (Notion, Google Docs) don't have.

---

## Integration Paths

### Path 1: MCP Server (Priority 1)

**What:** Build a Model Context Protocol (MCP) server that Claude Code and Claude.ai can connect to.

**User Flow:**
1. User generates artifact in Claude Code or Claude.ai
2. User invokes MCP command: "Share this artifact to [Platform]"
3. MCP server receives artifact content, creates new document in our platform
4. Returns shareable link to user
5. User can immediately invite reviewers

**Technical Approach:**
- Build MCP server using TypeScript SDK
- Expose endpoints for:
  - `shareArtifact` - Create new document from artifact content
  - `updateArtifact` - Update existing document
  - `listDocuments` - Show user's uploaded artifacts
  - `getComments` - Fetch comments for an artifact (optional)
- Integrate with Convex backend to store artifacts
- Handle authentication (API keys or OAuth)

**MCP Server Capabilities:**
- Tools: Actions the user can trigger (e.g., "share artifact")
- Resources: Data sources Claude can access (e.g., list of documents)
- Prompts: Templates for common workflows (e.g., "share and invite team")

**Availability:**
- Claude Code: All users (desktop only, Node.js 16+ required)
- Claude.ai: Pro, Max, Team, Enterprise plans only (MCP integration not available on Free tier)

**Timeline:** 6-8 weeks to MVP
- Week 1-2: MCP server scaffolding, basic `shareArtifact` tool
- Week 3-4: Convex integration, document creation flow
- Week 5-6: Authentication, user account linking
- Week 7-8: Testing, documentation, launch

---

### Path 2: Claude API Integration (Priority 2 / Future)

**What:** Use Claude API to programmatically access and share artifacts (when available).

**Current Status:** Anthropic's roadmap suggests "future integration with third-party apps via Claude API," but this is not yet available (as of December 2024).

**Potential User Flow (when available):**
1. User generates artifact in Claude.ai
2. User clicks "Share" → selects our platform from integrations list
3. OAuth flow authenticates user
4. Artifact exported via API to our platform
5. Shareable link returned

**Technical Approach (speculative):**
- OAuth integration with Claude
- API endpoints to receive artifact exports
- Webhook support for real-time sharing

**Blockers:**
- Claude API does not currently support artifact export to third parties
- No official timeline from Anthropic

**Decision:** Monitor Anthropic announcements; implement when API becomes available.

---

### Path 3: Browser Extension (Interim Solution)

**What:** Chrome/Firefox extension to capture artifact content and send to our platform.

**User Flow:**
1. User generates artifact in Claude.ai
2. Clicks extension icon
3. Extension scrapes artifact content from DOM
4. Sends to our platform API
5. Returns shareable link

**Pros:**
- Works with Free tier Claude users (MCP requires Pro+)
- Immediate availability (no waiting on Anthropic)
- Works with other AI tools (ChatGPT, Gemini) by adapting selectors

**Cons:**
- Fragile (breaks if Anthropic changes DOM structure)
- Manual user action required (less seamless than MCP)
- Doesn't work with Claude Code (desktop CLI tool)

**Decision:** Consider as fallback if MCP adoption is slow or for Free tier support.

---

## Recommended Approach

**Phase 1 (Months 1-2): MCP Server MVP**
- Build MCP server with `shareArtifact` tool
- Integrate with Convex backend
- Document setup for Claude Code users
- Launch to early adopters (Pro/Team Claude users)

**Phase 2 (Months 3-4): Enhance MCP Features**
- Add `updateArtifact` for versioning
- Add `listDocuments` and `getComments` for two-way sync
- Build admin dashboard to see MCP usage analytics

**Phase 3 (Months 5-6): Browser Extension (Optional)**
- Build extension for Free tier users and other AI tools
- Test with Claude.ai, ChatGPT, Gemini

**Phase 4 (Future): Claude API Integration**
- Monitor Anthropic API roadmap
- Implement when artifact export API becomes available

---

## Technical Requirements

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────┐
│              Claude Code / Claude.ai                │
│               (MCP Client)                          │
└───────────────────┬─────────────────────────────────┘
                    │ MCP Protocol (JSON-RPC)
                    ▼
┌─────────────────────────────────────────────────────┐
│              Our MCP Server (TypeScript)            │
│  ┌─────────────────────────────────────────────┐    │
│  │  Tools:                                     │    │
│  │  - shareArtifact(content, title, metadata) │    │
│  │  - updateArtifact(id, content)             │    │
│  │  - listDocuments()                         │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  Resources:                                 │    │
│  │  - documents://list (user's docs)          │    │
│  │  - document://{id} (specific doc)          │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS API
                    ▼
┌─────────────────────────────────────────────────────┐
│                   Convex Backend                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │  Documents   │  │  Comments    │  │  Users   │   │
│  │  (HTML +     │  │  (threads)   │  │  (auth)  │   │
│  │  metadata)   │  │              │  │          │   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────┘
```

### MCP Server Stack
- **Language:** TypeScript (Anthropic provides official SDK)
- **Framework:** Express or Fastify for HTTP server
- **Hosting:** Deploy alongside main app (or separate service)
- **Authentication:** API keys or OAuth (link Claude user to platform account)
- **Rate Limiting:** Prevent abuse, track usage per user

### Convex Integration Points
- **Mutations:**
  - `createDocumentFromArtifact(userId, content, title, metadata)`
  - `updateDocument(documentId, content)`
- **Queries:**
  - `listUserDocuments(userId)`
  - `getDocument(documentId)`
- **Actions:**
  - Generate shareable link
  - Send notification to user (email/Slack)

---

## User Experience

### For Claude Code Users

**Setup (One-Time):**
1. User installs our MCP server via npm or downloads binary
2. Adds configuration to Claude Code's MCP settings:
   ```json
   {
     "mcpServers": {
       "platform-name": {
         "command": "npx",
         "args": ["@platform/mcp-server"],
         "env": {
           "API_KEY": "user_api_key_here"
         }
       }
     }
   }
   ```
3. Restarts Claude Code

**Usage:**
1. User generates HTML artifact in conversation
2. Types: "Share this artifact to [Platform] for team review"
3. Claude Code invokes MCP tool, uploads artifact
4. Returns: "✓ Shared! View at: https://platform.com/docs/abc123"
5. User copies link, shares with team

---

### For Claude.ai Users (Pro/Team/Enterprise)

**Setup (One-Time):**
1. User goes to Claude.ai Settings → Integrations
2. Enables our MCP server integration
3. Authenticates via OAuth (links Claude account to platform account)

**Usage:**
1. User generates artifact in Claude.ai
2. Clicks "Share" button in artifact panel
3. Selects our platform from integrations menu
4. Artifact auto-uploads, shareable link displayed
5. User shares link with team

---

## Authentication Strategy

### Option A: API Keys (Simpler)
- User generates API key in our platform dashboard
- Adds API key to MCP server config
- MCP server authenticates requests using API key
- **Pros:** Simple, no OAuth flow needed
- **Cons:** Less secure (key stored in config), manual setup

### Option B: OAuth (Better UX)
- User clicks "Connect Claude" in our dashboard
- OAuth flow links Claude account to platform account
- MCP server uses OAuth token to authenticate
- **Pros:** More secure, better UX, automatic linking
- **Cons:** More complex to implement

**Recommendation:** Start with API keys (MVP), add OAuth in Phase 2.

---

## Success Metrics

### Adoption Metrics
- **MCP Server Installs:** # of users who configure MCP integration
- **Artifacts Shared via MCP:** # of documents created via MCP vs. manual upload
- **MCP Active Users:** # of users who share at least 1 artifact/week via MCP

### Engagement Metrics
- **MCP Share Rate:** % of Claude Code users who use MCP vs. manual upload
- **Time to Share:** Avg. time from artifact generation to platform upload (should be <30 seconds)
- **Retention:** Do MCP users share more artifacts than manual users?

### Competitive Metrics
- **Claude Code Market Share:** % of Claude Code users who use our platform vs. competitors
- **Referral Source:** How many new signups come from "Shared via Claude MCP"?

---

## Risks & Mitigations

### Risk 1: Low MCP Adoption (Pro/Team Plans Only)
**Impact:** MCP only works on Claude Pro+ ($20-60/mo), limiting reach to Free tier users

**Mitigation:**
- Build browser extension for Free tier users (Path 3)
- Market heavily to Pro/Team users (our target segment already)
- Positioning: MCP integration as premium feature that justifies Pro subscription

---

### Risk 2: Anthropic Builds Native Sharing
**Impact:** If Claude adds "Share to External Review Tool" natively, our MCP integration becomes redundant

**Mitigation:**
- Move fast—launch MCP server before Anthropic builds native feature
- Differentiate on workflow depth (review, comments, approvals) beyond just sharing
- Build relationships with Anthropic (potential partnership?)

---

### Risk 3: MCP Protocol Changes
**Impact:** Anthropic updates MCP spec, breaking our server

**Mitigation:**
- Use official TypeScript SDK (handles protocol changes)
- Monitor MCP GitHub repo for updates
- Automated tests to detect breaking changes

---

### Risk 4: Security/Abuse
**Impact:** Malicious users spam platform via MCP, or steal API keys

**Mitigation:**
- Rate limiting per API key (e.g., 10 artifacts/hour)
- API key rotation/revocation in dashboard
- Monitor for suspicious patterns (same content uploaded 100x)
- OAuth preferred over API keys for better security

---

## Open Questions

1. **Pricing:** Should MCP integration be a paid feature, or free for all users?
   - **Recommendation:** Free for Pro plan, included in Team plan (drives adoption)

2. **Multi-User Support:** If a team shares one MCP server, how do we handle user attribution?
   - **Recommendation:** Each user needs individual API key (links to their account)

3. **Content Limits:** Should we limit artifact size via MCP? (e.g., max 5MB HTML)
   - **Recommendation:** Start with 10MB limit, monitor usage

4. **Versioning:** If user shares same artifact twice, create new doc or update existing?
   - **Recommendation:** Ask user via prompt ("Update existing or create new?")

5. **Metadata:** What metadata should we capture from Claude? (conversation ID, timestamp, model used)
   - **Recommendation:** Store conversation ID (for future "view in Claude" link), timestamp, model

---

## Next Steps

1. **Research Phase (Week 1)**
   - Review official MCP TypeScript SDK documentation
   - Study existing MCP servers (Notion, Slack, GitHub examples)
   - Prototype basic MCP server (hello world)

2. **Architecture Design (Week 2)**
   - Design Convex schema for MCP-created documents
   - Define authentication flow (API keys vs. OAuth)
   - Write ADR (Architecture Decision Record) for MCP integration

3. **MVP Development (Weeks 3-6)**
   - Build MCP server with `shareArtifact` tool
   - Integrate with Convex mutations
   - Test with Claude Code locally
   - Write documentation for user setup

4. **Beta Launch (Week 7)**
   - Deploy MCP server
   - Invite 10-20 early adopters to test
   - Collect feedback, iterate

5. **Public Launch (Week 8)**
   - Publish MCP server to npm
   - Write blog post: "Share Claude Artifacts in One Click"
   - Update marketing site with MCP integration feature
   - Track adoption metrics

---

## References

- [Model Context Protocol (MCP) - Claude Docs](https://docs.claude.com/en/docs/mcp)
- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [MCP Servers Repository (GitHub)](https://github.com/modelcontextprotocol/servers)
- [Build and share AI-powered apps with Claude](https://www.anthropic.com/news/claude-powered-artifacts)
- [What are artifacts and how do I use them?](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [Publishing, remixing, and sharing artifacts](https://support.anthropic.com/en/articles/9547008-publishing-remixing-and-sharing-artifacts)

---

_Last updated: December 2024_
_Status: Planning - Not yet implemented_
