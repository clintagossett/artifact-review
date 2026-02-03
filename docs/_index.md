# Documentation Index

Project documentation for **Artifact Review**.

**Backend:** Convex

## Sections

| Section | Description |
|---------|-------------|
| [development/](./development/_index.md) | **TDD workflow, testing, and logging guides** |
| [setup/](./setup/) | Account setup, environment configuration, agent access |
| [market-intelligence/](./market-intelligence/_index.md) | Market analysis, competitive landscape, TAM/SAM/SOM |
| [marketing/](./marketing/_index.md) | Positioning, messaging, UVP, and go-to-market strategy |
| [personas/](./personas/_index.md) | User personas and target audience profiles |
| [journeys/](./journeys/_index.md) | User journey maps and workflows |
| [architecture/](./architecture/_index.md) | System architecture and technical decisions |
| [design/](./design/_index.md) | Design system, UI/UX decisions, legal documentation, and pricing presentation |

## Documentation Strategy: Decisions vs. Design

To keep our documentation clear, we distinguish between **Decisions** and **Designs**:

*   **[architecture/decisions (ADRs)](./architecture/decisions/):** Records of **architectural choices**.
    *   *Purpose:* explains **WHY** we chose a specific path over alternatives.
    *   *Content:* Trade-offs, constraints, and immutable records of agreement (e.g., "Why use W3C Annotations?", "Naming Conventions Decision").
*   **[design/](./design/):** Specifications for **systems and features**.
    *   *Purpose:* explains **WHAT** we are building and **HOW IT WORKS**.
    *   *Content:* Detailed specifications, wireframes, living documents, and business logic (e.g., "Pricing Strategy", "Privacy Policy", "Feature Specs").
*   **[development/](./development/):** Guides for **developer workflow**.
    *   *Purpose:* explains **HOW TO BUILD** it (Process).
    *   *Content:* Testing guides, TDD workflows, logging standards, and quick-start manuals.

## Recent Updates

**February 2, 2026** - Agent DX documentation:
- Comprehensive agent lifecycle guide (`docs/development/agent-dx-flow.md`)
- Script responsibilities and environment variable flow
- Service dependency graph and startup order
- Common operations (setup, daily startup, reset, secrets sync)
- Automated Novu workflow sync in `start-dev-servers.sh`

**December 25, 2025** - Setup documentation:
- Comprehensive account setup checklist
- Environment configuration guide for all services
- Agent access configuration (Claude Code)
- Complete verification and troubleshooting steps

**December 24, 2025** - Legal framework documentation:
- Privacy policy outline (GDPR/CCPA compliant)
- Terms of service outline (B2B SaaS)
- Data Processing Agreement outline (Enterprise/GDPR)
- Competitor legal frameworks research
