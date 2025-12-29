import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Artifact Review Database Schema
 *
 * This schema defines the core data model for the Artifact Review platform,
 * a SaaS application for teams to upload, share, and collaboratively review
 * AI-generated artifacts (HTML, Markdown, ZIP bundles).
 *
 * ## Table Hierarchy
 *
 * ```
 * users (via authTables + extensions)
 *   └── artifacts (1:N - user creates many artifacts)
 *         ├── artifactVersions (1:N - artifact has many versions)
 *         │     └── artifactFiles (1:N - version has many files, for ZIP type only)
 *         └── artifactReviewers (1:N - artifact has many invited reviewers)
 * ```
 *
 * ## Key Design Decisions
 *
 * - **Soft Deletion**: All tables use `isDeleted` + `deletedAt` pattern (ADR 0011)
 * - **Flat File Storage**: ZIP contents stored as flat rows with path strings (ADR 0009)
 * - **Email-Based Linking**: Reviewers linked to users by email at signup (ADR 0010)
 * - **Versioned Artifacts**: Each upload creates a new version, not an update
 *
 * @see docs/architecture/decisions/0009-artifact-file-storage-structure.md
 * @see docs/architecture/decisions/0010-reviewer-invitation-account-linking.md
 * @see docs/architecture/decisions/0011-soft-delete-strategy.md
 */
const schema = defineSchema({
  ...authTables,

  // ============================================================================
  // USERS TABLE
  // ============================================================================
  /**
   * Extended users table from Convex Auth.
   *
   * ## Purpose
   * Stores user account information for authentication and display.
   * Extends the base `authTables.users` with additional fields for the application.
   *
   * ## Lifecycle
   * - **Created**: Automatically by Convex Auth on first sign-in (magic link, password, or anonymous)
   * - **Updated**: Via `users.updateName` mutation, or by Convex Auth on subsequent logins
   * - **Deleted**: Never (accounts are not deleted in current implementation)
   *
   * ## Authentication Methods (ADR 0001)
   * - Magic link via Resend email
   * - Password (with email as identifier)
   *
   * ## Relationships
   * - `artifacts.creatorId` -> users._id (1:N - user owns many artifacts)
   * - `artifactReviewers.invitedBy` -> users._id (1:N - user invites reviewers)
   * - `artifactReviewers.userId` -> users._id (1:N - user is invited to artifacts)
   *
   * @see convex/auth.ts - Authentication configuration
   * @see convex/users.ts - User queries and mutations
   */
  users: defineTable({
    /**
     * User's display name.
     * Optional - may not be set for magic link users until they update profile.
     * Max length: 100 characters (enforced in `users.updateName`).
     */
    name: v.optional(v.string()),

    /**
     * User's email address.
     * Used as primary identifier for account linking across auth providers.
     * Normalized to lowercase for consistent lookups.
     */
    email: v.optional(v.string()),

    /**
     * Timestamp when email was verified.
     * Set when user completes magic link flow or OAuth with verified email.
     * Unix timestamp in milliseconds.
     */
    emailVerificationTime: v.optional(v.number()),

    /**
     * User's phone number.
     * Reserved for future phone auth support. Not currently used.
     */
    phone: v.optional(v.string()),

    /**
     * Timestamp when phone was verified.
     * Reserved for future phone auth support. Not currently used.
     */
    phoneVerificationTime: v.optional(v.number()),

    /**
     * URL to user's profile image.
     * Typically populated from OAuth provider (future) or left empty.
     */
    image: v.optional(v.string()),
  })
    /**
     * Lookup user by email address.
     * Required by Convex Auth for email-based authentication.
     * Used in auth callbacks for account linking.
     * @example ctx.db.query("users").withIndex("email", q => q.eq("email", "user@example.com"))
     */
    .index("email", ["email"]),

  // ============================================================================
  // ARTIFACTS TABLE
  // ============================================================================
  /**
   * Container for artifact versions - the top-level entity users create.
   *
   * ## Purpose
   * Represents a reviewable artifact that can have multiple versions.
   * Each artifact has a unique share token for public/semi-public access.
   *
   * ## Lifecycle
   * - **Created**: `artifacts.create` mutation (with initial version 1)
   * - **Updated**: `artifacts.addVersion` updates `updatedAt` timestamp
   * - **Deleted**: `artifacts.softDelete` sets `isDeleted=true` and cascades to versions/files
   *
   * ## Access Model
   * - **Owner**: Full control (creatorId matches authenticated user)
   * - **Reviewer**: Can view/comment (invited via artifactReviewers)
   * - **Public**: Can view via shareToken URL (no auth required)
   *
   * ## URL Pattern
   * Artifacts are accessed at `/a/{shareToken}` (e.g., `/a/abc123xy`)
   *
   * @see convex/artifacts.ts - CRUD operations
   * @see convex/sharing.ts - Reviewer invitations and permissions
   */
  artifacts: defineTable({
    /**
     * Display title for the artifact.
     * Required. Shown in dashboard, share emails, and viewer header.
     */
    title: v.string(),

    /**
     * Optional description of the artifact.
     * For user's own reference. Not prominently displayed in current UI.
     */
    description: v.optional(v.string()),

    /**
     * Reference to the user who created this artifact.
     * Determines ownership and edit permissions.
     * @see artifacts.softDelete - Only creator can delete
     * @see artifacts.addVersion - Only creator can add versions
     */
    creatorId: v.id("users"),

    /**
     * Unique URL-safe token for public sharing.
     * Generated with `nanoid(8)` at creation time.
     * Used in URL path: `/a/{shareToken}`
     * @example "abc123xy"
     */
    shareToken: v.string(),

    /**
     * Soft deletion flag.
     * When true, artifact is hidden from lists and viewer returns 404.
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds. Undefined when not deleted.
     * Used for potential future restore window or permanent deletion policy.
     */
    deletedAt: v.optional(v.number()),

    /**
     * Timestamp when artifact was created.
     * Unix timestamp in milliseconds.
     * Set once at creation, never updated.
     */
    createdAt: v.number(),

    /**
     * Timestamp of last modification.
     * Unix timestamp in milliseconds.
     * Updated when new versions are added.
     */
    updatedAt: v.number(),
  })
    /**
     * List all artifacts for a user (including deleted).
     * Used for admin/debug views.
     * @example ctx.db.query("artifacts").withIndex("by_creator", q => q.eq("creatorId", userId))
     */
    .index("by_creator", ["creatorId"])

    /**
     * List active artifacts for a user's dashboard.
     * Primary query pattern for artifact listing.
     * @example ctx.db.query("artifacts").withIndex("by_creator_active", q => q.eq("creatorId", userId).eq("isDeleted", false))
     */
    .index("by_creator_active", ["creatorId", "isDeleted"])

    /**
     * Lookup artifact by share token for public access.
     * Used by viewer page and HTTP file serving.
     * Token is unique across all artifacts.
     * @example ctx.db.query("artifacts").withIndex("by_share_token", q => q.eq("shareToken", "abc123xy"))
     */
    .index("by_share_token", ["shareToken"]),

  // ============================================================================
  // ARTIFACT VERSIONS TABLE
  // ============================================================================
  /**
   * Individual versions of an artifact - each upload creates a new version.
   *
   * ## Purpose
   * Tracks each iteration of an artifact. Supports version switching in the viewer.
   * Different file types have different content storage patterns.
   *
   * ## Lifecycle
   * - **Created**: `artifacts.create` (version 1) or `artifacts.addVersion` (version N+1)
   * - **Updated**: `zipProcessorMutations.markProcessingComplete` sets entryPoint for ZIPs
   * - **Deleted**: `artifacts.softDeleteVersion` or cascade from parent artifact deletion
   *
   * ## File Type Storage Patterns
   * | Type | Content Storage | Files |
   * |------|-----------------|-------|
   * | html | `htmlContent` field (inline) | None |
   * | markdown | `markdownContent` field (inline) | None |
   * | zip | `artifactFiles` table | 1-500 files |
   *
   * ## Version Numbering
   * - Starts at 1, auto-increments per artifact
   * - Gaps allowed (if version is deleted)
   * - Displayed as "v1", "v2", etc. in UI
   *
   * @see convex/artifacts.ts - Version CRUD
   * @see convex/zipProcessor.ts - ZIP extraction logic
   * @see ADR 0009 - Artifact File Storage Structure
   */
  artifactVersions: defineTable({
    /**
     * Reference to parent artifact.
     * All versions belong to exactly one artifact.
     */
    artifactId: v.id("artifacts"),

    /**
     * Sequential version number within the artifact.
     * Starts at 1, increments by 1 for each new version.
     * Unique per artifact (enforced by application logic, not DB constraint).
     */
    versionNumber: v.number(),

    /**
     * Type of artifact content.
     * Determines which content field is populated and how content is served.
     * - `zip`: Multi-file HTML project (uses artifactFiles table)
     * - `html`: Single HTML file (content in htmlContent field)
     * - `markdown`: Markdown document (content in markdownContent field)
     */
    fileType: v.union(
      v.literal("zip"),
      v.literal("html"),
      v.literal("markdown")
    ),

    /**
     * Inline HTML content for fileType="html".
     * Contains the full HTML document as a string.
     * Undefined for zip/markdown types.
     */
    htmlContent: v.optional(v.string()),

    /**
     * Inline Markdown content for fileType="markdown".
     * Contains the full Markdown source as a string.
     * Undefined for zip/html types.
     */
    markdownContent: v.optional(v.string()),

    /**
     * Entry point file path for fileType="zip".
     * Relative path to the main HTML file (e.g., "index.html" or "src/index.html").
     * Set after ZIP extraction by `zipProcessorMutations.markProcessingComplete`.
     * Undefined until processing completes, and for html/markdown types.
     */
    entryPoint: v.optional(v.string()),

    /**
     * Total size of the version content in bytes.
     * For zip: size of original ZIP file
     * For html/markdown: length of content string in bytes
     */
    fileSize: v.number(),

    /**
     * Soft deletion flag.
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds.
     */
    deletedAt: v.optional(v.number()),

    /**
     * Timestamp when version was created/uploaded.
     * Unix timestamp in milliseconds.
     */
    createdAt: v.number(),
  })
    /**
     * List all versions for an artifact (including deleted).
     * Used for calculating next version number.
     * @example ctx.db.query("artifactVersions").withIndex("by_artifact", q => q.eq("artifactId", artifactId))
     */
    .index("by_artifact", ["artifactId"])

    /**
     * List active versions for version switcher UI.
     * Primary query pattern for version listing.
     * @example ctx.db.query("artifactVersions").withIndex("by_artifact_active", q => q.eq("artifactId", artifactId).eq("isDeleted", false))
     */
    .index("by_artifact_active", ["artifactId", "isDeleted"])

    /**
     * Lookup specific version by number.
     * Used for deep links like `/a/{token}/v2`.
     * Compound index enables O(1) lookup.
     * @example ctx.db.query("artifactVersions").withIndex("by_artifact_version", q => q.eq("artifactId", artifactId).eq("versionNumber", 2))
     */
    .index("by_artifact_version", ["artifactId", "versionNumber"]),

  // ============================================================================
  // ARTIFACT FILES TABLE
  // ============================================================================
  /**
   * Individual files extracted from ZIP artifacts.
   *
   * ## Purpose
   * Stores metadata for each file extracted from a ZIP upload.
   * File content is stored in Convex File Storage; this table holds references.
   * Only used for `fileType="zip"` versions.
   *
   * ## Lifecycle
   * - **Created**: `zipProcessorMutations.createArtifactFileRecord` during ZIP extraction
   * - **Updated**: Never (files are immutable once created)
   * - **Deleted**: Cascade from version soft-delete in `artifacts.softDeleteVersion`
   *
   * ## File Serving (HTTP Routes)
   * Files are served at: `GET /api/files/{shareToken}/v{version}/{filePath}`
   * The `by_version_path` index enables O(1) path lookups for serving.
   *
   * ## Constraints
   * - Max 500 files per version (application limit, not DB constraint)
   * - Max 5MB per file (application limit)
   * - Paths are case-sensitive
   *
   * @see convex/zipProcessor.ts - ZIP extraction and file creation
   * @see convex/http.ts - HTTP file serving routes
   * @see ADR 0009 - Artifact File Storage Structure
   */
  artifactFiles: defineTable({
    /**
     * Reference to parent version.
     * All files belong to exactly one version.
     */
    versionId: v.id("artifactVersions"),

    /**
     * Relative file path within the ZIP archive.
     * Preserves original directory structure as path string.
     * @example "index.html"
     * @example "assets/styles/main.css"
     * @example "images/logo.png"
     */
    filePath: v.string(),

    /**
     * Reference to file content in Convex File Storage.
     * Use `ctx.storage.getUrl(storageId)` to get downloadable URL.
     */
    storageId: v.id("_storage"),

    /**
     * MIME type of the file.
     * Determined during extraction based on file extension.
     * Used for Content-Type header when serving files.
     * @example "text/html"
     * @example "application/javascript"
     * @example "image/png"
     */
    mimeType: v.string(),

    /**
     * Size of the file in bytes.
     * Used for upload limit validation and display.
     */
    fileSize: v.number(),

    /**
     * Soft deletion flag.
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds.
     */
    deletedAt: v.optional(v.number()),
  })
    /**
     * List all files for a version (including deleted).
     * Used for soft-delete cascade operations.
     * @example ctx.db.query("artifactFiles").withIndex("by_version", q => q.eq("versionId", versionId))
     */
    .index("by_version", ["versionId"])

    /**
     * O(1) file lookup by path for HTTP serving.
     * Critical for performance - enables instant file resolution.
     * @example ctx.db.query("artifactFiles").withIndex("by_version_path", q => q.eq("versionId", versionId).eq("filePath", "assets/logo.png"))
     */
    .index("by_version_path", ["versionId", "filePath"])

    /**
     * List active files for a version (for viewer UI).
     * Excludes soft-deleted files.
     * @example ctx.db.query("artifactFiles").withIndex("by_version_active", q => q.eq("versionId", versionId).eq("isDeleted", false))
     */
    .index("by_version_active", ["versionId", "isDeleted"]),

  // ============================================================================
  // ARTIFACT REVIEWERS TABLE
  // ============================================================================
  /**
   * Email invitations for artifact collaboration.
   *
   * ## Purpose
   * Tracks who has been invited to review/comment on artifacts.
   * Supports invite-before-signup pattern where invitees may not have accounts yet.
   *
   * ## Lifecycle
   * - **Created**: `sharing.inviteReviewer` mutation (triggers email via Resend)
   * - **Updated**: `sharing.linkPendingInvitations` links userId when invitee signs up
   * - **Deleted**: `sharing.removeReviewer` soft-deletes the invitation
   *
   * ## Invitation Flow (ADR 0010)
   * 1. Owner invites `reviewer@email.com` -> record created with `userId: null`, `status: "pending"`
   * 2. Email sent via Resend with artifact link
   * 3. If invitee already has account -> `userId` set immediately, `status: "accepted"`
   * 4. If invitee signs up later -> auth callback links via `linkPendingInvitations`
   *
   * ## Permission Levels
   * Currently only one level exists:
   * - `can-comment`: Can view artifact and add comments (future feature)
   *
   * @see convex/sharing.ts - Invitation CRUD and permission checks
   * @see convex/auth.ts - Account linking callback
   * @see ADR 0010 - Reviewer Invitation Account Linking
   */
  artifactReviewers: defineTable({
    /**
     * Reference to the artifact being shared.
     * One artifact can have many reviewers.
     */
    artifactId: v.id("artifacts"),

    /**
     * Invitee's email address.
     * Normalized to lowercase for consistent matching.
     * Primary identifier before user account exists.
     */
    email: v.string(),

    /**
     * Reference to user account, if invitee has signed up.
     * Null when invitation is pending (user hasn't created account yet).
     * Linked automatically when user signs up with matching email.
     */
    userId: v.union(v.id("users"), v.null()),

    /**
     * Reference to user who sent the invitation.
     * Always the artifact owner (enforced by mutation).
     */
    invitedBy: v.id("users"),

    /**
     * Timestamp when invitation was created/sent.
     * Unix timestamp in milliseconds.
     */
    invitedAt: v.number(),

    /**
     * Invitation status.
     * - `pending`: Email sent, waiting for user to sign up or click link
     * - `accepted`: User has account and can access artifact
     *
     * Note: Status changes from pending to accepted when userId is linked.
     */
    status: v.union(v.literal("pending"), v.literal("accepted")),

    /**
     * Soft deletion flag.
     * When true, invitation is revoked (reviewer loses access).
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when invitation was revoked.
     * Unix timestamp in milliseconds.
     */
    deletedAt: v.optional(v.number()),
  })
    /**
     * List all reviewers for an artifact (including deleted).
     * Used for admin views and debugging.
     * @example ctx.db.query("artifactReviewers").withIndex("by_artifact", q => q.eq("artifactId", artifactId))
     */
    .index("by_artifact", ["artifactId"])

    /**
     * List active reviewers for artifact settings UI.
     * Excludes revoked invitations.
     * @example ctx.db.query("artifactReviewers").withIndex("by_artifact_active", q => q.eq("artifactId", artifactId).eq("isDeleted", false))
     */
    .index("by_artifact_active", ["artifactId", "isDeleted"])

    /**
     * Check if email is already invited to artifact.
     * Used to prevent duplicate invitations.
     * @example ctx.db.query("artifactReviewers").withIndex("by_artifact_email", q => q.eq("artifactId", artifactId).eq("email", "user@example.com"))
     */
    .index("by_artifact_email", ["artifactId", "email"])

    /**
     * Find pending invitations for an email address.
     * Used by auth callback to link invitations when user signs up.
     * @example ctx.db.query("artifactReviewers").withIndex("by_email", q => q.eq("email", "user@example.com"))
     */
    .index("by_email", ["email"])

    /**
     * List artifacts a user has been invited to.
     * Used for "Shared with me" view (future feature).
     * @example ctx.db.query("artifactReviewers").withIndex("by_user", q => q.eq("userId", userId))
     */
    .index("by_user", ["userId"]),

  // ============================================================================
  // COMMENTS
  // ============================================================================
  /**
   * Comments on artifact versions - top-level feedback with replies.
   *
   * ## Purpose
   * Enables collaborative review by allowing owners and reviewers to leave
   * feedback on specific parts of artifacts. Each comment can have multiple replies.
   *
   * ## Lifecycle
   * - **Created**: `comments.create` mutation
   * - **Updated**: `comments.updateContent` (content), `comments.toggleResolved` (resolution)
   * - **Deleted**: `comments.softDelete` sets `isDeleted=true` and cascades to replies
   *
   * ## Permission Model
   * - **Owner**: Can view, create, edit own, delete any, resolve/unresolve
   * - **Reviewer**: Can view, create, edit own, delete own, resolve/unresolve
   * - **Outsider**: No access
   *
   * ## Target Metadata
   * The `target` field is self-describing JSON with `_version` field inside.
   * Backend stores without validation; frontend interprets for positioning.
   *
   * @see convex/comments.ts - Comment CRUD operations
   * @see convex/lib/commentPermissions.ts - Permission helpers
   */
  comments: defineTable({
    /**
     * Reference to artifact version being commented on.
     * All comments belong to exactly one version.
     */
    versionId: v.id("artifactVersions"),

    /**
     * Reference to user who created the comment.
     * Determines edit permissions (only author can edit content).
     */
    authorId: v.id("users"),

    /**
     * Comment text content.
     * Required, max 10,000 characters, trimmed before storage.
     */
    content: v.string(),

    /**
     * Resolution status.
     * Can be toggled by owner or reviewer.
     * Defaults to false on creation.
     */
    resolved: v.boolean(),

    /**
     * User who last changed resolution status.
     * Set on first toggle, updated on subsequent toggles.
     * Never cleared once set.
     */
    resolvedChangedBy: v.optional(v.id("users")),

    /**
     * Timestamp when resolution status last changed.
     * Unix timestamp in milliseconds.
     * Never cleared once set.
     */
    resolvedChangedAt: v.optional(v.number()),

    /**
     * Self-describing JSON target metadata.
     * Contains `_version` field inside the object.
     * Backend stores as-is; frontend interprets for positioning.
     * @example { _version: 1, type: "text", selectedText: "...", page: "/index.html" }
     */
    target: v.any(),

    /**
     * Edit tracking flag.
     * Set to true when content is updated after creation.
     */
    isEdited: v.boolean(),

    /**
     * Timestamp of last content edit.
     * Unix timestamp in milliseconds.
     * Undefined until first edit.
     */
    editedAt: v.optional(v.number()),

    /**
     * Soft deletion flag.
     * When true, comment and all replies are hidden.
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * User who soft deleted the comment.
     * Used for audit trail (author or artifact owner).
     * Undefined when not deleted.
     */
    deletedBy: v.optional(v.id("users")),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds.
     * Undefined when not deleted.
     */
    deletedAt: v.optional(v.number()),

    /**
     * Timestamp when comment was created.
     * Unix timestamp in milliseconds.
     * Set once at creation, never updated.
     */
    createdAt: v.number(),
  })
    /**
     * List active comments for a version (primary query).
     * Used by viewer to display comments.
     * @example ctx.db.query("comments").withIndex("by_version_active", q => q.eq("versionId", versionId).eq("isDeleted", false))
     */
    .index("by_version_active", ["versionId", "isDeleted"])

    /**
     * List all comments for a version (including deleted).
     * Used for cascade soft delete operations.
     * @example ctx.db.query("comments").withIndex("by_version", q => q.eq("versionId", versionId))
     */
    .index("by_version", ["versionId"])

    /**
     * List comments by author (all artifacts).
     * Used for user comment history.
     * @example ctx.db.query("comments").withIndex("by_author", q => q.eq("authorId", userId))
     */
    .index("by_author", ["authorId"])

    /**
     * List active comments by author.
     * Used for user dashboard.
     * @example ctx.db.query("comments").withIndex("by_author_active", q => q.eq("authorId", userId).eq("isDeleted", false))
     */
    .index("by_author_active", ["authorId", "isDeleted"]),

  // ============================================================================
  // COMMENT REPLIES
  // ============================================================================
  /**
   * Replies to comments - enables threaded discussions.
   *
   * ## Purpose
   * Allows back-and-forth discussion on comments.
   * Separate table enables independent CRUD without array mutation issues.
   *
   * ## Lifecycle
   * - **Created**: `commentReplies.createReply` mutation
   * - **Updated**: `commentReplies.updateReply` (content only)
   * - **Deleted**: `commentReplies.softDeleteReply` or cascade from parent comment
   *
   * ## Permission Model
   * Same as comments (inherits from parent comment's version).
   *
   * ## Cascade Behavior
   * When parent comment is soft deleted, all replies are also soft deleted.
   *
   * @see convex/commentReplies.ts - Reply CRUD operations
   */
  commentReplies: defineTable({
    /**
     * Reference to parent comment.
     * All replies belong to exactly one comment.
     */
    commentId: v.id("comments"),

    /**
     * Reference to user who created the reply.
     * Determines edit permissions (only author can edit content).
     */
    authorId: v.id("users"),

    /**
     * Reply text content.
     * Required, max 5,000 characters, trimmed before storage.
     */
    content: v.string(),

    /**
     * Edit tracking flag.
     * Set to true when content is updated after creation.
     */
    isEdited: v.boolean(),

    /**
     * Timestamp of last content edit.
     * Unix timestamp in milliseconds.
     * Undefined until first edit.
     */
    editedAt: v.optional(v.number()),

    /**
     * Soft deletion flag.
     * @see ADR 0011 - Soft Delete Strategy
     */
    isDeleted: v.boolean(),

    /**
     * User who soft deleted the reply.
     * Used for audit trail (author or artifact owner).
     * Undefined when not deleted.
     */
    deletedBy: v.optional(v.id("users")),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds.
     * Undefined when not deleted.
     */
    deletedAt: v.optional(v.number()),

    /**
     * Timestamp when reply was created.
     * Unix timestamp in milliseconds.
     * Set once at creation, never updated.
     */
    createdAt: v.number(),
  })
    /**
     * List active replies for a comment (primary query).
     * Used by viewer to display reply threads.
     * @example ctx.db.query("commentReplies").withIndex("by_comment_active", q => q.eq("commentId", commentId).eq("isDeleted", false))
     */
    .index("by_comment_active", ["commentId", "isDeleted"])

    /**
     * List all replies for a comment (including deleted).
     * Used for cascade soft delete operations.
     * @example ctx.db.query("commentReplies").withIndex("by_comment", q => q.eq("commentId", commentId))
     */
    .index("by_comment", ["commentId"])

    /**
     * List replies by author (all comments).
     * Used for user reply history.
     * @example ctx.db.query("commentReplies").withIndex("by_author", q => q.eq("authorId", userId))
     */
    .index("by_author", ["authorId"])

    /**
     * List active replies by author.
     * Used for user dashboard.
     * @example ctx.db.query("commentReplies").withIndex("by_author_active", q => q.eq("authorId", userId).eq("isDeleted", false))
     */
    .index("by_author_active", ["authorId", "isDeleted"]),
});

export default schema;
