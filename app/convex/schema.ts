import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Schema for Artifact Review - Step 1: Anonymous Authentication
export default defineSchema({
  // Convex Auth tables (includes sessions, authAccounts, etc.)
  ...authTables,

  // User table with anonymous flag
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.boolean(), // true for anonymous users
  }).index("by_email", ["email"]),
});
