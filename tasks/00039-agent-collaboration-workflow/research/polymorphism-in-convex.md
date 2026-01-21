# Research: Polymorphic Data Structures in Convex

**Date:** 2026-01-19
**Purpose:** Evaluate the viability, benefits, and pitfalls of polymorphic data structures for the Agent Collaboration API (e.g., `actor` being User OR Agent).

## Executive Summary

**Is Convex poised for this?** **YES.**
Convex handles polymorphism better than SQL databases because it supports **Union Types** (`v.union`) natively in the schema. This gives you the flexibility of NoSQL with the type safety of TypeScript.

---

## 3 Approaches to "Who did this?"

### Option 1: The "Union" Approach (True Polymorphism)
A single field that can be one of multiple ID types.

```typescript
// Schema
actorId: v.union(v.id("users"), v.id("apiKeys"))

// Data
{ actorId: "u123" } // Valid (User)
{ actorId: "k456" } // Valid (ApiKey)
```

| **Pros** | **Cons** |
| :--- | :--- |
| ✅ **Clean Data Model:** One field accurately represents "The Actor". | ⚠️ **Indexing Complexity:** You cannot create a single index that efficiently covers both tables if you need to sort/filter differently. |
| ✅ **Type Safe:** Convex generates strict TS types `Id<"users"> | Id<"apiKeys">`. | ⚠️ **Querying:** `q.eq("actorId", someId)` works, but knowing *which* table to join requires runtime type checking. |

### Option 2: The "Sparse Fields" Approach (Recommended for Indexing)
Separate optional fields for each type.

```typescript
// Schema
userId: v.optional(v.id("users")),
apiKeyId: v.optional(v.id("apiKeys")),
// *Application logic ensures exactly one is set*
```

| **Pros** | **Cons** |
| :--- | :--- |
| ✅ **Perfect Indexing:** Index `by_userId` and `by_apiKeyId` are simple and fast. | ⚠️ **"Messy" Schema:** Multiple nullable columns for the same logical concept. |
| ✅ **Easy Joins:** You know exactly which field to look at for joining. | ⚠️ **Application Logic:** Must enforce "exactly one" rule in code. |

### Option 3: The "Split" Approach (Data + Type)
Generic ID string + Type discriminator (Common in SQL/Rails).

```typescript
// Schema
actorType: v.string(), // "user" or "agent"
actorId: v.string(),   // Generic string, loses v.id() validation!
```

| **Pros** | **Cons** |
| :--- | :--- |
| ✅ **Generic:** Works for infinite future types without schema changes. | ⛔️ **No Type Safety:** You lose `v.id()` validation. `actorId` could be "junk". |
| | ⛔️ **No Joins:** Convex cannot automatically join distinct tables from a generic string. |

---

## Pitfalls & "Gotchas"

1.  **Lost Referential Integrity (Option 3):** If you use generic strings, the database doesn't know `actorId` points to the `users` table. If you delete the user, the DB won't warn you.
2.  **Complex Permissions:** Polymorphism makes RLS (Row Level Security) harder. "Allow if `actorId` is me" requires checking `actorId` against `ctx.auth.getUserIdentity()`, which might not match if the actor is an API key representing you.
3.  **The "User via Agent" Nuance:**
    *   **Problem:** If you just store `actorId = apiKeyId`, you lose the quick link to the *User* who owns that key. You'd always have to `db.get(apiKeyId)` to find the `userId`.
    *   **Solution:** Store **Both**. The `userId` (who is responsible) and the `apiKeyId` (the mechanism). This isn't strict polymorphism, but it's often more practical for audit logs.

## Recommendation for Agent API

**Use Option 2 (Sparse Fields) + "User via Agent" Pattern.**

Don't just say *who* (polymorphic actor). Say *who* (User) AND *how* (Agent/Key).

```typescript
// Comments Table
userId: v.id("users"),              // The legal "owner" (Always present)
creationApiKeyId: v.optional(v.id("apiKeys")) // The mechanism (Optional)
```

**Why?**
1.  **Query Efficiency:** You almost always want to query "All comments by User X". Option 2 makes this a simple index on `userId`.
2.  **Audit Trail:** You preserve the full context. "Clint (User)" did this using "Claude (Agent)".
3.  **Simplicity:** No need to handle union types in every query.
