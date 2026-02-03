# Database Schema Updates

## Goal
Update `convex/schema.ts` to support Organizations and granular RBAC.

## Tables (Simplified - No Workspaces)

### `organizations`
```typescript
organizations: defineTable({
  name: v.string(),
  slug: v.string(),
  type: v.union(v.literal("personal"), v.literal("team")),
  policies: v.object({
    allowAgents: v.boolean(),
  }),
  // Billing
  stripeCustomerId: v.optional(v.string()),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
```

### `members`
```typescript
members: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  roles: v.array(v.string()), // ["owner", "admin", "member", "guest"]
  createdAt: v.number(),
})
```

## Modifications

### `artifacts`
*   **ADD** `organizationId: v.id("organizations")` (Required).
*   **KEEP** `createdBy: v.id("users")`.

## Migration Plan
1.  Create Personal Org for each User.
2.  Assign existing Artifacts to their creator's Personal Org.
3.  Make `organizationId` required.
