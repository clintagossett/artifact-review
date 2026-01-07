# ADR 12 Compliance Report: Full Schema Audit

**Date:** 2026-01-06
**Standard:** [ADR 0012: Backend Naming Conventions](file:///Users/clintgossett/Documents/personal/personal%20projects/artifact-review/docs/architecture/decisions/0012-naming-conventions.md)
**Status:** DRAFT

## Executive Summary

A comprehensive audit of the entire Convex database schema reveals several areas of non-compliance with ADR 12. While newer tables follow the standards well, legacy tables and specific fields in newer tables require refactoring to achieve 100% compliance.

**Key Violation Types Found:**
1.  **Property Redundancy**: Fields repeating table context (e.g., `filePath` in `artifactFiles`).
2.  **Inconsistent Timestamps**: Using `*Time` or no suffix instead of the mandatory `*At`.
3.  **Missing Audit Fields**: Required `createdAt` field missing in some tables.
4.  **Index Naming**: Missing `by_` prefix or mismatching field names.

---

## Detailed Table Analysis

### 1. `users` ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | `emailVerificationTime` | `emailVerifiedAt` | Audit Timestamps (`*At` suffix) |
| Field | `phoneVerificationTime` | `phoneVerifiedAt` | Audit Timestamps (`*At` suffix) |
| Field | `isAnonymous` | *Deleted* | Deprecated / No longer used |
| Index | `email` | `by_email` | Index Naming (`by_` prefix) |

> [!CAUTION]
> Renaming `emailVerificationTime` and `phoneVerificationTime` may conflict with the `@convex-dev/auth` library expectations. We should verify if the library allows custom field names for verification timestamps before renaming.


### 2. `artifacts` ✅
**Status:** 100% Compliant.

### 3. `artifactVersions` ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | `fileSize` | `size` | Property Redundancy (avoid "file" prefix) |

### 4. `artifactFiles` ❌
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | `filePath` | `path` | Property Redundancy (avoid "file" prefix) |
| Field | `fileSize` | `size` | Property Redundancy (avoid "file" prefix) |
| Field | *Missing* | `createdAt` | Required Audit Field |
| Index | `by_versionId_filePath` | `by_versionId_path` | Index Naming (must match fields) |

### 5. `comments` ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | `resolvedChangedBy` | `resolvedBy` | Consistency / Conciseness |
| Field | `resolvedChangedAt` | `resolvedAt` | Audit Timestamps (`*At` suffix) |

### 6. `commentReplies` ✅
**Status:** 100% Compliant.

### 7. `userInvites` ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | *Missing* | `createdAt` | Required Audit Field |

### 8. `artifactAccess` ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | *Missing* | `createdAt` | Required Audit Field |

### 9. `presence` (Ephemeral) ⚠️
| Field/Index | Current | Proposed | ADR 12 Rule |
| :--- | :--- | :--- | :--- |
| Field | `lastSeen` | `lastSeenAt` | Audit Timestamps (`*At` suffix) |
| Field | *Missing* | `createdAt` | Required Audit Field |
| Index | `by_artifactId_lastSeen` | `by_artifactId_lastSeenAt` | Index Naming |

---

## Summary of Changes Required

### Field Renames
- `users.emailVerificationTime` → `emailVerifiedAt`
- `users.phoneVerificationTime` → `phoneVerifiedAt`
- `artifactVersions.fileSize` → `size`
- `artifactFiles.filePath` → `path`
- `artifactFiles.fileSize` → `size`
- `comments.resolvedChangedBy` → `resolvedBy`
- `comments.resolvedChangedAt` → `resolvedAt`
- `presence.lastSeen` → `lastSeenAt`

### New Audit Fields
- `artifactFiles.createdAt`
- `userInvites.createdAt`
- `artifactAccess.createdAt`
- `presence.createdAt`

### Index Renames
- `users: email` → `by_email`
- `artifactFiles: by_versionId_filePath` → `by_versionId_path`
- `presence: by_artifactId_lastSeen` → `by_artifactId_lastSeenAt`

---

## Implementation Strategy

Since the user has approved **starting from scratch** (emptying the database), we can apply these breaking changes in a single pass without data migration scripts.

### Task Consolidation
1.  **Close Task 26** (Index Naming) - Absorb into the global compliance task.
2.  **Adopt Task 28** (Add `createdAt` to `artifactFiles`) - Expand this task to cover the entire schema compliance OR create a new Task 31 for "Global ADR 12 Compliance" and close both 26 and 28.

**Recommendation:** Create **Task 00031: Global Schema ADR-0012 Compliance** and close 26 and 28.
