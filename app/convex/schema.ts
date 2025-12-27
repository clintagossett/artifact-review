import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Schema for Artifact Review
// Extending authTables to add email index for password authentication
const schema = defineSchema({
  ...authTables,
  // Override users table to add username field and indexes for password authentication
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    image: v.optional(v.string()),
    // Add username field for user-friendly display
    username: v.optional(v.string()),
  })
    .index("email", ["email"])  // Required by Convex Auth for email providers
    .index("by_username", ["username"]),

  // Artifacts - Container for artifact versions
  artifacts: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    shareToken: v.string(),              // nanoid(8) for /a/{token}
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_creator_active", ["creatorId", "isDeleted"])
    .index("by_share_token", ["shareToken"]),

  // Artifact Versions - Each version of an artifact
  artifactVersions: defineTable({
    artifactId: v.id("artifacts"),
    versionNumber: v.number(),           // Auto-increment: 1, 2, 3...
    fileType: v.union(
      v.literal("zip"),
      v.literal("html"),
      v.literal("markdown")
    ),

    // Type-specific fields
    htmlContent: v.optional(v.string()),      // For type="html"
    markdownContent: v.optional(v.string()),  // For type="markdown"
    entryPoint: v.optional(v.string()),       // For type="zip"

    fileSize: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_artifact", ["artifactId"])
    .index("by_artifact_active", ["artifactId", "isDeleted"])
    .index("by_artifact_version", ["artifactId", "versionNumber"]),

  // Artifact Files - Individual files within ZIP archives
  artifactFiles: defineTable({
    versionId: v.id("artifactVersions"),
    filePath: v.string(),                // "assets/logo.png"
    storageId: v.id("_storage"),
    mimeType: v.string(),
    fileSize: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_version", ["versionId"])
    .index("by_version_path", ["versionId", "filePath"])  // O(1) lookups
    .index("by_version_active", ["versionId", "isDeleted"]),
});

export default schema;
