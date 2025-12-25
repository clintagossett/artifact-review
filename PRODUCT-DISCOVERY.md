# Product Discovery: Artifact Review

## Executive Summary

**Artifact Review** - A SaaS platform that allows teams to upload, share, and collaboratively review AI-generated artifacts (HTML, and future formats) from AI agents (Claude Code, Cursor, etc.). Solves the format mismatch between AI-native output and traditional collaboration tools (Google Docs, PowerPoint, etc.).

**Core Value Proposition:** "From AI output to stakeholder feedback in one click"

---

## Problem Statement

Product managers using Claude Code (and similar AI coding agents) generate artifacts—PRDs, one-pagers, strategy docs, presentations—as HTML. Currently they face a frustrating choice:

1. **Manually convert to Google Docs/Slides** - Loses formatting, wastes time
2. **Share raw HTML files** - Clunky, no collaboration features
3. **Screenshots** - No interactivity, can't comment on specific sections

### Why This Matters Now

- AI agents naturally produce HTML as their output format
- Enterprise collaboration tools (Google Workspace, Office 365) don't handle HTML well
- As AI-assisted workflows become standard, this friction multiplies across teams

### Target User

Product managers and their teams using AI coding agents for document generation. Initially focused on Claude Code users, but applicable to Cursor, Windsurf, Copilot Workspace, Devin, etc.

---

## Refined Hypothesis

> "PMs and knowledge workers using AI agents produce HTML artifacts (reports, specs, prototypes) that need lightweight review and approval from stakeholders who aren't on the AI platform. Today this requires manual conversion that loses fidelity or breaks workflow—creating a gap for a 'collaborative HTML staging tool' that preserves AI output quality while enabling async feedback."

---

## Research Findings

### Validation: The Pain is Real

- **Tools already exist for this problem** - MassiveMark, MD2Doc, AI Chat PDF Exporter built solely to convert AI outputs
- **Users report "formatting nightmares"** - Tables break, equations lost, structured content becomes jumbled
- **Even Google's Gemini has complaints** - "Text output formatting is terrible" and "broken output that does not carry well into MS Word"
- **Claude Code has formal feature request** for native Word support on GitHub
- **PM workflows explicitly generate HTML prototypes** - "Using Claude Code, you can generate a proof-of-life HTML prototype in minutes...ready for stakeholder review"

### Frequency/Volume

| Finding | Data Point |
|---------|------------|
| AI tool daily usage | 35.49% of knowledge workers use AI tools daily |
| Developer AI adoption | 84% use or plan to use AI tools, 51% daily |
| PM documentation time | Average PM spends 23 hours/week on documentation |
| Estimated artifact frequency | PMs generate 3-10 shareable artifacts per week |
| Review need frequency | ~1-3 "HTML staging" moments per week per PM |

### Competitive Timeline: Is Google/Microsoft Solving This?

**No visible roadmap.** Both are building moats, not bridges.

| Scenario | MS/Google Solution? | Timeline |
|----------|---------------------|----------|
| Generate doc inside Copilot/Gemini | Yes, today | Solved |
| Import Claude Code HTML artifact for review | No native support | No roadmap |
| Collaborate on external AI output with non-AI-users | Still requires manual conversion | No roadmap |

**Critical insight:** Neither company is building a bridge for external AI output (Claude, ChatGPT) to flow into their collaboration tools. They want generation to happen *inside* their ecosystem.

### The Deeper Gap: AI Can't Transform Documents

Even within ecosystems, AI collaboration is shallow:

**Microsoft Copilot confirmed limitations:**
- "Copilot currently has limitations that prevent it from making direct changes [to formatting]. This is a known restriction."
- "What is the point of a Microsoft Word AI assistant that cannot perform operations on a Word document?"
- Copilot-generated Word docs lack consistency, require manual formatting cleanup

**Google Docs Gemini limitations:**
- "Help me create is currently limited to content extraction...doesn't include structure or style"
- Cannot apply bulk formatting, change styles, or transform structure

**Key insight:** AI tools are *generative* (create new) but not *transformative* (modify existing). HTML is the only format where AI has full control over styling and structure.

### What Existing Solutions Miss

| Solution | Gap |
|----------|-----|
| Claude Team Projects | Requires reviewers to have Claude accounts |
| MassiveMark/MD2Doc | One-way conversion, no collaboration |
| Google Docs AI integration | Weak formatting preservation, not for HTML artifacts |
| n8n/Make automations | Technical setup, no review UX |

---

## Product Type: Team-First

This is a **team product**, not an individual tool. Key implications:

- Collaboration is the core, not a feature
- Shared workspaces by team, project, or initiative
- Permissions matter from day one
- Value compounds with more users (network effect within org)
- Buyer is team lead/Head of Product, not individual PM
- Land-and-expand go-to-market motion

---

## User Journey

1. PM finishes generating HTML doc in Claude Code
2. Drags file into platform (or uses CLI/integration)
3. Doc renders beautifully, gets shareable link
4. PM invites teammates and stakeholders to review
5. Reviewers comment inline, @mention others
6. PM resolves comments, uploads revised version
7. Final approval, doc shared externally or archived

---

## MVP Feature Set

### Must-Have (v1)

| Category | Features |
|----------|----------|
| **Workspace** | Team workspace, invite via email/domain, role-based access (admin/editor/viewer) |
| **Upload & Publish** | Drag-drop HTML upload, instant shareable link, organize into folders or projects |
| **Review** | Inline commenting (highlight text → comment), @mentions, assign reviewers, resolve/unresolve threads |
| **Visibility** | Activity feed, notification preferences (email/Slack), "who's viewed this" |
| **Admin** | Seat management, basic usage dashboard |

### Nice-to-Have (v1.5)

- Light editing (fix typos, tweak copy—not full WYSIWYG)
- Comment resolution workflow with status tracking
- Slack/email notifications on new comments
- Export back to HTML (with edits baked in)
- Embed support (Notion, Confluence)
- Version history with diff view

### Future Differentiators

- "AI context" panel—show the prompt or conversation that generated the doc
- Template gallery—common PM artifacts optimized for this workflow
- Direct integrations—pull from Claude Code output directory, GitHub, etc.
- Analytics—who viewed, how long, what they clicked

---

## Review Workflow (Team Context)

For team use, review workflows need structure:

1. **Assign reviewers** to specific docs
2. **Due dates** for feedback
3. **Status tracking**: Draft → In Review → Approved
4. **Approval gates** before sharing externally (future)

---

## Pricing Model

### Proposed Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 docs, basic sharing, 7-day retention, limited reviewers |
| **Pro** | $15-25/user/mo | Unlimited docs, comments, version history, custom domains |
| **Team** | $30-50/user/mo | SSO, granular permissions, audit logs, integrations, priority support |

### Pricing Psychology

- Anchor: "Cheaper than the time I waste converting to Google Docs"
- Value: "More professional than sharing raw files"

---

## Technical Architecture

### Backend: Convex

Selected Convex as the backend platform.

**Advantages:**
- Real-time sync is native (comments, edits, presence "just work")
- Built-in authentication (Clerk, Auth0, or custom JWT)
- Row-level security via function-based model
- Managed infrastructure (less ops burden)
- Automatic backups with point-in-time recovery

**Out of the Box:**
- Encryption in transit (TLS)
- Encryption at rest
- Hosted on AWS infrastructure
- Automatic scaling

**Architecture Overview:**
```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│          (React, Next.js, etc.)                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                    Convex                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Documents  │  │  Comments   │  │    Users    │  │
│  │   (HTML +   │  │  (real-time │  │  (teams,    │  │
│  │  metadata)  │  │   threads)  │  │   roles)    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                     │
│  Functions: upload, share, comment, resolve, etc.   │
└─────────────────────────────────────────────────────┘
```

**Potential Constraints:**
- File storage: May need to pair with Cloudflare R2 or S3 for large files/assets
- Data residency: US-only hosting currently (could block some EU enterprise deals)
- Vendor lock-in: Migration would be non-trivial
- Self-hosted: Not available (blocks some enterprise requirements)

---

## Security & Compliance

### Security Tiers by Buyer Type

| Buyer Type | What They'll Ask For | Your Credibility Bar |
|------------|---------------------|----------------------|
| **Startup / Small Team** | "Is it reasonably secure?" | HTTPS, basic auth, clear privacy policy |
| **Mid-Market (50-500)** | "Do you have SOC 2?" | SOC 2 Type I minimum, SSO, audit logs |
| **Enterprise (500+)** | Security questionnaire | SOC 2 Type II, pen tests, DPA, GDPR/CCPA |

### Day 1 / MVP Security (Achievable Immediately)

- **Encryption in transit**: TLS/HTTPS everywhere (via Convex + Cloudflare)
- **Encryption at rest**: Inherited from Convex/AWS
- **Authentication**: OAuth via Google/Microsoft
- **Access controls**: Document-level permissions, invite-only sharing
- **No training on customer data**: Explicit policy statement
- **Privacy policy & ToS**: Clear, readable, covers data handling
- **Data residency disclosure**: "Stored in AWS US regions"

### 3-6 Months Post-Revenue

- **SOC 2 Type I**: Point-in-time audit (~$20-50K via Vanta/Drata/Secureframe, 2-3 months)
- **SSO (SAML/OIDC)**: Required for companies with IT policies
- **Audit logs**: Who accessed what, when
- **2FA**: For admin accounts minimum
- **Vulnerability scanning**: Snyk, Dependabot
- **Incident response plan**: Documented process

### 12+ Months (Enterprise Scale)

- **SOC 2 Type II**: 6-12 month audit period
- **Penetration testing**: Annual third-party, shareable report
- **GDPR/CCPA compliance**: Deletion requests, export, consent
- **Data Processing Agreement (DPA)**: Standard contract addendum
- **BAA**: If healthcare customers (HIPAA)
- **Self-hosted / VPC options**: For enterprises requiring data in their cloud

### Sample Security Page Copy (Day 1)

> **Infrastructure**: Hosted on Convex, which runs on AWS infrastructure with SOC 2 compliant controls.
>
> **Encryption**: All data encrypted in transit (TLS 1.3) and at rest (AES-256).
>
> **Authentication**: Secure sign-in via Google or Microsoft accounts. SSO available for team plans.
>
> **Access Control**: Document-level permissions. Only invited collaborators can view or comment.
>
> **Data Handling**: We do not access, sell, or train on your content. You can request deletion at any time.

### Convex-Specific Security Notes

**Verify with Convex directly:**
- Current SOC 2 status (Type I vs Type II)
- Availability of their security report for your customers
- GDPR DPA availability
- Data residency options/roadmap

---

## Go-to-Market Strategy

### Land-and-Expand Motion

1. One PM discovers the tool, uploads a few docs
2. Invites teammates to review (low friction)
3. Team realizes "we should all be using this"
4. Team lead becomes champion, purchases seats
5. Expand to adjacent teams (Design, Eng, etc.)

### Requirements for This Motion

- Frictionless invite flow (can reviewers comment without accounts?)
- Clear "upgrade to team" prompt when usage patterns suggest it
- Compelling reason for the *second* PM to start uploading, not just reviewing

---

## Risks & Open Questions

### Competitive Risk

- **Will Google/Microsoft just fix this?** If Docs gets native HTML import with formatting fidelity, does this become unnecessary?
- **Notion/Coda expansion**: Could they add this as a feature?

### Product Risk

- **Is review the right wedge?** Maybe the real product is "AI artifact hosting + analytics"
- **Workflow depth**: How structured do review workflows need to be?

### Market Risk

- **Enterprise sales motion**: If reviewers are executives, polish matters enormously
- **AI agent fragmentation**: Will the market consolidate around a few agents, or stay fragmented?

### Technical Risk

- **Large file handling**: HTML with embedded images/assets could get heavy
- **Rendering fidelity**: Can you render arbitrary HTML safely and beautifully?

### Window of Opportunity

- **Estimated runway:** 12-24 months before native solutions mature
- **Risk factors:**
  - Claude/ChatGPT could add native export-to-Google-Docs/Word
  - "Universal AI output viewer" could become table stakes if demand grows

---

## Naming / Positioning Ideas

For a team-oriented, AI-native collaboration tool:

- **Shiproom** — where work gets ready to ship
- **Draftlink** — share drafts, get links
- **Reviewkit** — toolkit for review
- **Artifact** — direct reference to AI terminology
- **Renderbase** — where renders live

Positioning should signal: collaboration, speed/lightweight, AI-native.

---

## Next Steps

1. **Validate demand**: Talk to 10+ PMs using Claude Code about their current workflow
2. **Confirm Convex security posture**: Get their latest compliance docs
3. **Design core data model**: Documents, comments, teams, permissions in Convex schema
4. **Prototype MVP**: Upload → render → share → comment flow
5. **Security page**: Draft trust/security content for day 1
6. **Pricing page**: Test positioning with potential customers

---

## Appendix: Questions for Customer Discovery

1. How often do you generate HTML documents with AI agents?
2. What do you currently do with those documents?
3. Who needs to review your work before it ships?
4. What tools do you use for that review process today?
5. What's most frustrating about the current workflow?
6. Would you pay for a tool that solved this? How much?
7. What security/compliance requirements does your company have for new tools?
8. Who would need to approve purchasing this tool?

---

*Source: Product discovery conversations, December 2024*
