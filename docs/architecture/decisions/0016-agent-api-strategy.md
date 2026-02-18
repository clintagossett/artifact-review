---
title: Agent API Strategy
status: Superseded (Two-Tier → Open Spec)
date: 2026-01-21
updated: 2026-02-17
deciders: Clinta Gossett, Antigravity
---

# 16. Agent API Strategy

> **Superseded (2026-02-17):** The two-tiered OpenAPI discovery model (Section 1) has been replaced with a single public spec. The full OpenAPI specification at `/api/v1/openapi.yaml` is now publicly accessible without authentication. Hiding the spec provided no real security benefit — authentication enforcement on the endpoints themselves is what matters. The previous Tier 1 bootstrap spec (`app/public/openapi.yaml`) has been removed. A public discovery endpoint at `GET /api/v1` now provides auth instructions and endpoint summary. All other decisions (version targeting, W3C annotations, CRUD) remain in effect.

## Context

We are building an "Agent-First" collaboration platform where AI Agents need to review, comment on, and discuss artifacts just like human users. To enable this, we need a robust API strategy that allows agents to:
1.  **Discover** how to interact with the platform.
2.  **Authenticate** securely.
3.  **Interact** with specific versions of artifacts (since code/docs change over time).
4.  **Target** specific parts of the content (annotations).

## Decision

We have adopted the following strategies for the Agent API:

### 1. Open API Specification
The full OpenAPI spec is publicly accessible at `/api/v1/openapi.yaml` — no authentication required. A discovery endpoint at `GET /api/v1` provides a lightweight JSON summary with auth instructions for agents that prefer a quick bootstrap.

**Rationale for replacing the two-tier model:**
*   Hiding the spec created a catch-22: agents couldn't learn the auth scheme without the spec, but needed auth to get it.
*   The spec describes request/response shapes — it doesn't grant access. Security comes from auth enforcement on endpoints, not from obscuring the API surface.
*   Public specs are industry standard (Stripe, GitHub, Twilio).

### 2. Explicit Version Targeting
Agents often work with historical context or need to reference a specific iteration of a document.
*   **Implicit Latest**: By default, API calls (GET/POST comments) target the **latest active version** of an artifact.
*   **Explicit Versioning**: Endpoints support a `?version=v{number}` query parameter (e.g., `?version=v2`).
*   **Response Metadata**: All comment fetch responses include a top-level `version` field (e.g., `"version": "v1"`) so the agent can unambiguously confirm which version context it is receiving.

### 3. W3C Annotation Model
To allow agents to comment on specific lines of code or text without fragile line numbers (which break easily):
*   We use the **W3C Web Annotation Data Model** (Selectors).
*   **Target Object**: Comments include a `target` object with `source` (file path) and `selector` (e.g., `TextQuoteSelector` with `exact`, `prefix`, `suffix`).
*   This generic structure supports future expansion to other selector types (CSS, XPath, Range) without breaking the API contract.

### 4. Full CRUD for Conversations
Agents must manage their own lifecycle of feedback.
*   **Comments**: Create, Read, Update (Content/Status), Delete.
*   **Replies**: Create, Update, Delete.
*   **Status**: Comments can be marked as `resolved`.

## Consequences

*   **Positive**:
    *   Zero-friction discovery: Agents can read the full spec and start using the API immediately.
    *   Robustness: Version pinning prevents agents from hallucinating feedback on the wrong file version.
    *   Standard Compliance: Using W3C standards makes our API compatible with other annotation tools/agents in the future.
    *   Industry standard: Matches how Stripe, GitHub, and other API-first platforms operate.
*   **Negative**:
    *   Maintenance: We must ensure the `OPENAPI_SPEC` string in the backend (`app/convex/lib/openapi.ts`) is kept in sync with implementation.

## Implementation Details

*   **Full Spec**: Served publicly via `http.ts` from `app/convex/lib/openapi.ts` at `/api/v1/openapi.yaml`.
*   **Discovery Endpoint**: `GET /api/v1` returns a lightweight JSON summary with auth instructions.
*   **Health Endpoint**: `GET /api/v1/health` for monitoring.
*   **Backwards Compatibility**: The API uses `/api/v1/` prefixing.
