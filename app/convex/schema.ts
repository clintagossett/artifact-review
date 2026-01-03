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
 *         └── artifactAccess (1:N - artifact has many access grants for reviewers)
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
   * - `artifacts.createdBy` -> users._id (1:N - user owns many artifacts)
   * - `artifactAccess.createdBy` -> users._id (1:N - user grants access to reviewers)
   * - `artifactAccess.userId` -> users._id (1:N - user has access to artifacts)
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

    /**
     * Whether this is an anonymous user.
     * Legacy field from previous auth implementation.
     */
    isAnonymous: v.optional(v.boolean()),
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
   * - **Reviewer**: Can view/comment (invited via artifactAccess)
   * - **Public**: Can view via shareToken URL (no auth required)
   *
   * ## URL Pattern
   * Artifacts are accessed at `/a/{shareToken}` (e.g., `/a/abc123xy`)
   *
   * @see convex/artifacts.ts - CRUD operations
   * @see convex/access.ts - Access grants and permissions
   */
  artifacts: defineTable({
    /**
     * Display name for the artifact.
     * Required. Shown in dashboard, share emails, and viewer header.
     * Renamed from title (ADR 12: avoid redundancy with table context).
     * Max length: 100 characters (enforced in mutations).
     */
    name: v.string(),

    /**
     * Optional description of the artifact.
     * For user's own reference. Not prominently displayed in current UI.
     * Max length: 500 characters (enforced in mutations).
     */
    description: v.optional(v.string()),

    /**
     * Reference to the user who created this artifact.
     * Determines ownership and edit permissions.
     * Renamed from creatorId (ADR 12: standard creator field across all tables).
     * @see artifacts.softDelete - Only creator can delete
     * @see artifacts.addVersion - Only creator can add versions
     */
    createdBy: v.id("users"),

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

    /**
     * User who soft deleted the artifact.
     * Used for audit trail (owner only can delete).
     * Undefined when not deleted.
     * Task 00018 - Phase 1 - Step 2
     */
    deletedBy: v.optional(v.id("users")),
  })
    /**
     * List all artifacts for a user (including deleted).
     * Used for admin/debug views.
     * @example ctx.db.query("artifacts").withIndex("by_createdBy", q => q.eq("createdBy", userId))
     */
    .index("by_createdBy", ["createdBy"])

    /**
     * List active artifacts for a user's dashboard.
     * Primary query pattern for artifact listing.
     * @example ctx.db.query("artifacts").withIndex("by_createdBy_active", q => q.eq("createdBy", userId).eq("isDeleted", false))
     */
    .index("by_createdBy_active", ["createdBy", "isDeleted"])

    /**
     * Lookup artifact by share token for public access.
     * Used by viewer page and HTTP file serving.
     * Token is unique across all artifacts.
     * @example ctx.db.query("artifacts").withIndex("by_shareToken", q => q.eq("shareToken", "abc123xy"))
     */
    .index("by_shareToken", ["shareToken"]),

  // ============================================================================
  // ARTIFACT VERSIONS TABLE
  // ============================================================================
  /**
   * Individual versions of an artifact - each upload creates a new version.
   *
   * ## Purpose
   * Tracks each iteration of an artifact. Supports version switching in the viewer.
   * All file content is now stored in artifactFiles table (unified storage pattern).
   *
   * ## Lifecycle
   * - **Created**: `artifacts.create` (version 1) or `artifacts.addVersion` (version N+1)
   * - **Deleted**: `artifacts.softDeleteVersion` or cascade from parent artifact deletion
   *
   * ## File Type Storage Pattern (Task 00018 - Phase 2)
   * All content stored in `artifactFiles` table with storageId reference.
   * | Type | Files | Entry Point |
   * |------|-------|-------------|
   * | html | 1 file | index.html (or custom) |
   * | markdown | 1 file | document.md (or custom) |
   * | zip | 1-500 files | Detected HTML file |
   *
   * ## Version Numbering
   * - Starts at 1, auto-increments per artifact
   * - Gaps allowed (if version is deleted)
   * - Displayed as "v1", "v2", etc. in UI
   *
   * @see convex/artifacts.ts - Version CRUD
   * @see Task 00018 - Unified Storage Pattern
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
     * Renamed from versionNumber in Task 00021 for cleaner API (version.number vs version.versionNumber).
     */
    number: v.number(),

    /**
     * User who created this version.
     * Required for permission checks and audit trail.
     * Task 00018 - Phase 2 - Step 8: Made required
     */
    createdBy: v.id("users"),

    /**
     * Optional version label/name.
     * User-friendly name like "Initial draft", "Final v2", etc.
     * Max 100 characters (enforced in updateName mutation).
     * Renamed from versionName in Task 00021 for cleaner API (version.name vs version.versionName).
     */
    name: v.optional(v.string()),

    /**
     * User who soft deleted the version.
     * Used for audit trail (owner only can delete).
     * Undefined when not deleted.
     * Task 00018 - Phase 1 - Step 2
     */
    deletedBy: v.optional(v.id("users")),

    /**
     * Type of artifact content.
     * Determines how content is served and which file is the entry point.
     * - `html`: Single HTML file
     * - `markdown`: Markdown document
     * - `zip`: Multi-file HTML project (future)
     *
     * Changed from union to string for extensibility (Task 00018 - Phase 1 - Step 3).
     * Application-level validation in lib/fileTypes.ts ensures only supported types.
     */
    fileType: v.string(),

    /**
     * Entry point file path (relative path within version).
     * Points to the main file to serve for this version.
     * Required - all versions must have an entry point.
     * Examples: "index.html", "document.md", "src/main.html"
     * Task 00018 - Phase 2 - Step 8: Made required
     */
    entryPoint: v.string(),

    /**
     * Total size of the version content in bytes.
     * For single files: size of the file
     * For zip: size of original ZIP file
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
     * @example ctx.db.query("artifactVersions").withIndex("by_artifactId", q => q.eq("artifactId", artifactId))
     */
    .index("by_artifactId", ["artifactId"])

    /**
     * List active versions for version switcher UI.
     * Primary query pattern for version listing.
     * @example ctx.db.query("artifactVersions").withIndex("by_artifactId_active", q => q.eq("artifactId", artifactId).eq("isDeleted", false))
     */
    .index("by_artifactId_active", ["artifactId", "isDeleted"])

    /**
     * Lookup specific version by number.
     * Used for deep links like `/a/{token}/v2`.
     * Compound index enables O(1) lookup.
     * @example ctx.db.query("artifactVersions").withIndex("by_artifactId_number", q => q.eq("artifactId", artifactId).eq("number", 2))
     */
    .index("by_artifactId_number", ["artifactId", "number"])

    /**
     * List versions by creator (for permission checks).
     * Used to verify user created this version.
     * Task 00018 - Phase 1 - Step 2
     * @example ctx.db.query("artifactVersions").withIndex("by_createdBy", q => q.eq("createdBy", userId))
     */
    .index("by_createdBy", ["createdBy"]),

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

    /**
     * User who soft deleted the file.
     * Used for audit trail (cascades from version deletion).
     * Undefined when not deleted.
     * Task 00018 - Phase 1 - Step 2
     */
    deletedBy: v.optional(v.id("users")),
  })
    /**
     * List all files for a version (including deleted).
     * Used for soft-delete cascade operations.
     * @example ctx.db.query("artifactFiles").withIndex("by_versionId", q => q.eq("versionId", versionId))
     */
    .index("by_versionId", ["versionId"])

    /**
     * O(1) file lookup by path for HTTP serving.
     * Critical for performance - enables instant file resolution.
     * @example ctx.db.query("artifactFiles").withIndex("by_versionId_filePath", q => q.eq("versionId", versionId).eq("filePath", "assets/logo.png"))
     */
    .index("by_versionId_filePath", ["versionId", "filePath"])

    /**
     * List active files for a version (for viewer UI).
     * Excludes soft-deleted files.
     * @example ctx.db.query("artifactFiles").withIndex("by_versionId_active", q => q.eq("versionId", versionId).eq("isDeleted", false))
     */
    .index("by_versionId_active", ["versionId", "isDeleted"]),

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
     * Determines edit permissions (only creator can edit content).
     */
    createdBy: v.id("users"),

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
     * @example ctx.db.query("comments").withIndex("by_versionId_active", q => q.eq("versionId", versionId).eq("isDeleted", false))
     */
    .index("by_versionId_active", ["versionId", "isDeleted"])

    /**
     * List all comments for a version (including deleted).
     * Used for cascade soft delete operations.
     * @example ctx.db.query("comments").withIndex("by_versionId", q => q.eq("versionId", versionId))
     */
    .index("by_versionId", ["versionId"])

    /**
     * List comments by creator (all artifacts).
     * Used for user comment history.
     * @example ctx.db.query("comments").withIndex("by_createdBy", q => q.eq("createdBy", userId))
     */
    .index("by_createdBy", ["createdBy"])

    /**
     * List active comments by creator.
     * Used for user dashboard.
     * @example ctx.db.query("comments").withIndex("by_createdBy_active", q => q.eq("createdBy", userId).eq("isDeleted", false))
     */
    .index("by_createdBy_active", ["createdBy", "isDeleted"]),

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
     * Determines edit permissions (only creator can edit content).
     */
    createdBy: v.id("users"),

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
     * @example ctx.db.query("commentReplies").withIndex("by_commentId_active", q => q.eq("commentId", commentId).eq("isDeleted", false))
     */
    .index("by_commentId_active", ["commentId", "isDeleted"])

    /**
     * List all replies for a comment (including deleted).
     * Used for cascade soft delete operations.
     * @example ctx.db.query("commentReplies").withIndex("by_commentId", q => q.eq("commentId", commentId))
     */
    .index("by_commentId", ["commentId"])

    /**
     * List replies by creator (all comments).
     * Used for user reply history.
     * @example ctx.db.query("commentReplies").withIndex("by_createdBy", q => q.eq("createdBy", userId))
     */
    .index("by_createdBy", ["createdBy"])

    /**
     * List active replies by creator.
     * Used for user dashboard.
     * @example ctx.db.query("commentReplies").withIndex("by_createdBy_active", q => q.eq("createdBy", userId).eq("isDeleted", false))
     */
    .index("by_createdBy_active", ["createdBy", "isDeleted"]),

  // ============================================================================
  // USER INVITES
  // ============================================================================
  /**
   * Pending user invitations - email addresses not yet signed up.
   *
   * ## Purpose
   * Tracks email invitations to the platform before user signup.
   * Supports invite-before-signup pattern for artifact sharing.
   * One userInvite per (email, createdBy) pair - reused across multiple artifacts.
   *
   * ## Lifecycle
   * - **Created**: `access.grant` mutation when inviting non-existent email
   * - **Converted**: `access.linkInvitesToUserInternal` sets convertedToUserId on signup
   * - **Deleted**: Soft-deleted when user requests removal (not currently implemented)
   *
   * ## Relationship to artifactAccess
   * - One userInvite can have many artifactAccess records (invited to multiple artifacts)
   * - When user signs up, convertedToUserId is set and all artifactAccess records are updated
   *
   * @see convex/access.ts - Invitation system
   * @see Task 00020 - Two-table invitation refactor
   */
  userInvites: defineTable({
    /**
     * Invitee's email address.
     * Normalized to lowercase for consistent matching.
     * Combined with createdBy forms compound key for deduplication.
     */
    email: v.string(),

    /**
     * Optional name for the invitee.
     * Can be provided by inviter when sending invitation.
     * Used for display before user signs up and sets their own name.
     */
    name: v.optional(v.string()),

    /**
     * Reference to user who created this invitation.
     * Scopes invitations per-inviter (same email can be invited by different users).
     */
    createdBy: v.id("users"),

    /**
     * Reference to user account after signup.
     * Set by linkInvitesToUserInternal when user signs up with this email.
     * Once set, this invite is "converted" and all associated access grants work.
     */
    convertedToUserId: v.optional(v.id("users")),

    /**
     * Soft deletion flag.
     * Currently not used - invites persist indefinitely.
     * Reserved for future "uninvite all" feature.
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when soft deleted.
     * Unix timestamp in milliseconds.
     */
    deletedAt: v.optional(v.number()),
  })
    /**
     * Compound key for deduplication.
     * One invite per (email, createdBy) pair - reused across artifacts.
     * @example ctx.db.query("userInvites").withIndex("by_email_createdBy", q => q.eq("email", "user@example.com").eq("createdBy", inviterId))
     */
    .index("by_email_createdBy", ["email", "createdBy"])

    /**
     * Find all invites for an email (across all inviters).
     * Used by linkInvitesToUserInternal to link pending invites on signup.
     * @example ctx.db.query("userInvites").withIndex("by_email", q => q.eq("email", "user@example.com"))
     */
    .index("by_email", ["email"])

    /**
     * Find user by their converted invite.
     * Used for reverse lookups (which invites led to this user).
     * @example ctx.db.query("userInvites").withIndex("by_convertedToUserId", q => q.eq("convertedToUserId", userId))
     */
    .index("by_convertedToUserId", ["convertedToUserId"]),

  // ============================================================================
  // ARTIFACT ACCESS
  // ============================================================================
  /**
   * Access grants for artifact sharing.
   *
   * ## Purpose
   * Tracks who has access to view/comment on artifacts.
   * Links artifacts to users (existing accounts) or userInvites (pending signups).
   * Tracks email send count, view timestamps, and soft-deletion for revocation.
   *
   * ## Lifecycle
   * - **Created**: `access.grant` mutation (owner invites reviewer)
   * - **Linked**: `access.linkInvitesToUserInternal` links userInviteId to userId on signup
   * - **Revoked**: `access.revoke` soft-deletes record (user loses access)
   * - **Re-granted**: `access.grant` un-deletes existing record if re-inviting
   *
   * ## Email Tracking
   * - lastSentAt: Timestamp of most recent invitation email
   * - sendCount: Number of times invitation email was sent (initial + resends)
   *
   * ## View Tracking
   * - firstViewedAt: Timestamp of first artifact view by reviewer
   * - lastViewedAt: Timestamp of most recent view
   *
   * @see convex/access.ts - Access control mutations and queries
   */
  artifactAccess: defineTable({
    /**
     * Reference to artifact being shared.
     * All access records belong to exactly one artifact.
     */
    artifactId: v.id("artifacts"),

    /**
     * Reference to user account (for existing users).
     * Set immediately if inviting existing user.
     * Set by linkInvitesToUserInternal when pending user signs up.
     * Mutually exclusive path: EITHER userId OR userInviteId (not both).
     */
    userId: v.optional(v.id("users")),

    /**
     * Reference to pending invitation (for non-existent users).
     * Set when inviting email address with no account.
     * Cleared by linkInvitesToUserInternal when user signs up (moved to userId).
     * Mutually exclusive path: EITHER userId OR userInviteId (not both).
     */
    userInviteId: v.optional(v.id("userInvites")),

    /**
     * Reference to user who granted access.
     * Always the artifact owner (permission-checked in grant mutation).
     */
    createdBy: v.id("users"),

    /**
     * Timestamp when invitation email was last sent.
     * Unix timestamp in milliseconds.
     * Updated on grant (initial send) and resend operations.
     */
    lastSentAt: v.number(),

    /**
     * Number of times invitation email was sent.
     * Starts at 1 on grant, incremented by resend mutation.
     * Used to track "nagging" behavior and limit resends.
     */
    sendCount: v.number(),

    /**
     * Timestamp of first view by reviewer.
     * Unix timestamp in milliseconds.
     * Set by recordView mutation on first access.
     * Never updated after initial set.
     */
    firstViewedAt: v.optional(v.number()),

    /**
     * Timestamp of most recent view by reviewer.
     * Unix timestamp in milliseconds.
     * Updated by recordView mutation on each access.
     */
    lastViewedAt: v.optional(v.number()),

    /**
     * Soft deletion flag.
     * When true, access is revoked (user loses view/comment permissions).
     * Can be un-deleted by re-granting access.
     */
    isDeleted: v.boolean(),

    /**
     * Timestamp when access was revoked.
     * Unix timestamp in milliseconds.
     */
    deletedAt: v.optional(v.number()),
  })
    /**
     * List active access grants for an artifact.
     * Primary query for "who has access to this artifact".
     * @example ctx.db.query("artifactAccess").withIndex("by_artifactId_active", q => q.eq("artifactId", artifactId).eq("isDeleted", false))
     */
    .index("by_artifactId_active", ["artifactId", "isDeleted"])

    /**
     * O(1) lookup for permission check (existing user).
     * Check if specific user has access to artifact.
     * @example ctx.db.query("artifactAccess").withIndex("by_artifactId_userId", q => q.eq("artifactId", artifactId).eq("userId", userId))
     */
    .index("by_artifactId_userId", ["artifactId", "userId"])

    /**
     * Lookup by userInvite (for pending users).
     * Used to find access grants for a pending invitation.
     * @example ctx.db.query("artifactAccess").withIndex("by_artifactId_userInviteId", q => q.eq("artifactId", artifactId).eq("userInviteId", inviteId))
     */
    .index("by_artifactId_userInviteId", ["artifactId", "userInviteId"])

    /**
     * List artifacts shared with a user.
     * Powers "Shared with me" view.
     * @example ctx.db.query("artifactAccess").withIndex("by_userId_active", q => q.eq("userId", userId).eq("isDeleted", false))
     */
    .index("by_userId_active", ["userId", "isDeleted"])

    /**
     * Find all access grants for a userInvite.
     * Used by linkInvitesToUserInternal to update all grants when user signs up.
     * @example ctx.db.query("artifactAccess").withIndex("by_userInviteId", q => q.eq("userInviteId", inviteId))
     */
    .index("by_userInviteId", ["userInviteId"]),
});

export default schema;
