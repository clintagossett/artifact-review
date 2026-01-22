# API Update Plan: Annotation System Exposure

## Objective
Update the Agent API to expose the new W3C-compatible Annotation system introduced in Task 29. This will allow AI agents to read rich annotations (including text selection context), post new annotations with precise targeting, reply to existing comments, and manage resolution status.

## 1. OpenAPI Specification Update
**File**: `tasks/00039-agent-collaboration-workflow/api-spec/openapi.yaml`

### Changes:
1.  **GET /api/v1/artifacts/{shareToken}/comments**
    *   Update response schema to include `target` (W3C Selector).
    *   Add `replies` array to the comment object.
    *   Add `context` (source text quote) to the schema.
    *   Deprecate/Remove legacy `x`, `y` fields.

2.  **POST /api/v1/artifacts/{shareToken}/comments**
    *   **New Endpoint**: Allow agents to create comments.
    *   **Request Body**:
        ```json
        {
          "content": "Fixed typo",
          "target": {
            "source": "index.html",
            "selector": {
               "type": "TextQuoteSelector",
               "exact": "typo",
               "prefix": "This is a ",
               "suffix": "."
            }
          }
        }
        ```

3.  **POST /api/v1/comments/{commentId}/replies**
    *   **New Endpoint**: Allow agents to reply to a specific comment.
    *   **Request Body**:
        ```json
        {
          "content": "Thank you for the feedback."
        }
        ```
    *   **Response**: 201 Created with JSON `{ "id": "..." }`.

4.  **PATCH /api/v1/comments/{commentId}**
    *   **New Endpoint**: Update comment status (resolve/unresolve).
    *   **Request Body**:
        ```json
        {
          "resolved": true
        }
        ```
    *   **Response**: 200 OK.

## 2. Backend Implementation
**File**: `app/convex/agentApi.ts`

### Changes:
1.  **Refactor `getComments`**:
    *   Update logic to fetch all replies for each comment.
    *   Map the database `target` object to dimensions expected by `AnnotationTarget`.
    *   Ensure strict typing for the W3C selector fields.
    *   Return the full nested structure (Comment + Replies).

2.  **Add `createComment` mutation**:
    *   Internal mutation to be called by HTTP `POST`.
    *   Accepts `versionId`, `content`, `target` (validated).
    *   Handles Agent attribution (`agentId`, `agentName`).

3.  **Add `createReply` mutation**:
    *   Internal mutation wrapping `commentReplies.createReply` logic.
    *   Accepts `commentId`, `content`.
    *   Handles Agent attribution.

4.  **Add `updateCommentStatus` mutation**:
    *   Internal mutation.
    *   Accepts `commentId`, `resolved` (boolean).
    *   Checks current status and calls `toggleResolved` logic if different.
    *   Handles permissions checks internally (or relies on helper).

**File**: `app/convex/http.ts`

### Changes:
1.  **Update `GET` handler**:
    *   Use the updated `getComments` query.
    *   Return JSON matching the new OpenAPI spec.
    *   Ensure `target` is correctly serialized.

2.  **Implement `POST` handler for Comments**:
    *   Validate API Key.
    *   Resolve `shareToken` to `latestVersionId`.
    *   Parse and validate body (especially `target` structure).
    *   Call `agentApi.createComment`.
    *   Return 201 Created with the new comment ID.

3.  **Implement `POST` handler for Replies**:
    *   Route: `/api/v1/comments/{commentId}/replies`
    *   Validate API Key.
    *   Call `agentApi.createReply`.
    *   Return 201 Created.

4.  **Implement `PATCH` handler for Comments**:
    *   Route: `/api/v1/comments/{commentId}`
    *   Validate API Key.
    *   Parse body for `resolved` boolean.
    *   Call `agentApi.updateCommentStatus`.
    *   Return 200 OK.

## 3. Shared Logic Consideration
The `convexToAnnotation` adapter currently resides in `app/src/lib/annotation/adapters/`. Since Convex functions cannot easily import from `src/`, we will replicate the necessary transformation logic within `app/convex/lib/` or directly in `agentApi.ts` to ensure isolation and stability.

## 4. Verification
1.  Verify `GET` returns `target` with `TextQuoteSelector`.
2.  Verify `POST` creates a comment that is visible in the UI with correct highlighting.
3.  Verify replies are included in `GET`.
4.  Verify `POST` reply adds a reply visible in the UI.
5.  Verify `PATCH` resolves/unresolves the comment in the UI.
