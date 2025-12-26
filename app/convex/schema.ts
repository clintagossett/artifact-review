import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

// Schema for Artifact Review - Step 1: Anonymous Authentication
// Using default authTables which includes the users table with all required fields
export default defineSchema({
  ...authTables,
});
