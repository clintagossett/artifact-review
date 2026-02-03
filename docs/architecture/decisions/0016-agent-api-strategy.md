---
title: Agent API Strategy
status: Accepted
date: 2026-01-21
deciders: Clinta Gossett, Antigravity
---

# 16. Agent API Strategy

## Context

We are building an "Agent-First" collaboration platform where AI Agents need to review, comment on, and discuss artifacts just like human users. To enable this, we need a robust API strategy that allows agents to:
1.  **Discover** how to interact with the platform.
2.  **Authenticate** securely.
3.  **Interact** with specific versions of artifacts (since code/docs change over time).
4.  **Target** specific parts of the content (annotations).

## Decision

We have adopted the following strategies for the Agent API:

### 1. Two-Tiered OpenAPI Discovery
We use a two-tiered specifiction approach to handle discovery and security:
*   **Tier 1: Public Discovery (`/openapi.yaml`)**:
    *   **Access**: Public, Unauthenticated.
    *   **Purpose**: Bootstrapping. It tells the Agent *only* how to authenticate (via `X-API-Key` header) and where the production servers are.
    *   **Content**: Minimal. Contains Auth schemes and server URLs.
*   **Tier 2: Protected Capability Spec (`/api/v1/openapi.yaml`)**:
    *   **Access**: Protected (Requires valid API Key).
    *   **Purpose**: Full capability discovery.
    *   **Content**: The complete API definition including Artifact creation, Comment CRUD, Reply operations, and types. This allows us to expose rich functionality only to trusted agents.

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
    *   Secure discovery: We don't leak API surface area to unauthenticated scrapers.
    *   Robustness: Version pinning prevents agents from hallucinating feedback on the wrong file version.
    *   Standard Compliance: Using W3C standards makes our API compatible with other annotation tools/agents in the future.
*   **Negative**:
    *   Complexity: Agents must perform a two-step handshake (Read Public Spec -> Auth -> Read Protected Spec) to know full capabilities.
    *   Maintenance: We must ensure the `OPENAPI_SPEC` string in the backend (`app/convex/lib/openapi.ts`) is kept in sync with implementation.

## Implementation Details

*   **Public Spec**: Hosted at `app/public/openapi.yaml`.
*   **Protected Spec**: Served via `http.ts` from `app/convex/lib/openapi.ts`.
*   **Backwards Compatibility**: The API uses `/api/v1/` prefixing.
