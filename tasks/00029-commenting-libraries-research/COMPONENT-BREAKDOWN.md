# Complete Component Breakdown: Annotator.js + Annotorious + Your System

## Your Core Requirement Map

### 1) **Comment Placement Selection**
User can select text/region and create comment

| Component | Annotator.js | Annotorious | Your System | Custom Build |
|-----------|--------------|-------------|------------|---|
| **Text selection UI** | ✅ | ❌ | ❌ | Need to build |
| **SVG/Image region UI** | ❌ | ✅ | ❌ | Need to build |
| **Event handling** | ✅ (text) | ✅ (images) | ❌ | Need to build |
| **Multiple selection types** | Limited | Single type | ❌ | Need to build |

**What you use from libraries:**
- **Annotator.js:** Text selection handler, event capture
- **Annotorious:** SVG/image region selection UI
- **You build:** Unified selection handler that routes to both

---

### 2) **Comment Placement Data**
Store WHERE the comment applies (selector/reference)

| Component | Annotator.js | Annotorious | Your System | Need to Build |
|-----------|--------------|-------------|------------|---|
| **TextQuoteSelector** | ✅ | ❌ | ❌ | Use Annotator.js |
| **SVGSelector** | ❌ | ✅ | ❌ | Use Annotorious |
| **Serialization** | ✅ (JSON) | ✅ (JSON) | ❌ | Use library output |
| **W3C compliance** | ✅ | ✅ | ❌ | Inherited from libs |
| **Storage (Convex)** | ❌ | ❌ | ✅ | You handle |
| **Indexing** | ❌ | ❌ | ✅ | You build |

**What you use from libraries:**
- **Annotator.js:** Text selector data structure
- **Annotorious:** SVG/image selector data structure
- **You build:** Convex schema to store both types, query them

---

### 3) **Comment Marker (Visual Indicator)**
Show WHERE the comment was made on the file

| Component | Annotator.js | Annotorious | Your System | Need to Build |
|-----------|--------------|-------------|------------|---|
| **Text highlighting** | ✅ | ❌ | ❌ | Use Annotator.js |
| **Region highlighting (SVG)** | ❌ | ✅ | ❌ | Use Annotorious |
| **Hover effects** | Partial | Partial | ❌ | Build custom |
| **Color coding** | ❌ | ❌ | ❌ | Build (by author/status) |
| **Animation** | ❌ | ❌ | ❌ | Build custom |
| **Permalink/deep link** | ❌ | ❌ | ❌ | Build custom |
| **Comment count badge** | ❌ | ❌ | ❌ | Build custom |

**What you use from libraries:**
- **Annotator.js:** Text highlight rendering
- **Annotorious:** SVG/image region highlight rendering
- **You build:** Tooltips, color schemes, hover states, animations, deep linking

---

### 4) **Comment with Reply Threading**
Nested comments/replies (YOU HAVE THIS ALREADY)

| Component | Annotator.js | Annotorious | Your System | Status |
|-----------|--------------|-------------|------------|---|
| **Threaded replies** | ❌ | ❌ | ✅ | Already done |
| **inReplyTo linking** | ❌ | ❌ | ✅ | Already done |
| **Reply count** | ❌ | ❌ | ✅ | Already done |
| **Nested UI rendering** | ❌ | ❌ | ✅ | Already done |

**What you use:** Nothing—you're done here

---

### 5) **Edit/Resolve/Delete Comment Interface**
Comment lifecycle management (YOU HAVE THIS ALREADY)

| Component | Annotator.js | Annotorious | Your System | Status |
|-----------|--------------|-------------|------------|---|
| **Edit form** | ❌ | ❌ | ✅ | Already done |
| **Delete button** | ❌ | ❌ | ✅ | Already done |
| **Resolve/close status** | ❌ | ❌ | ✅ | Already done |
| **Permissions checking** | ❌ | ❌ | ✅ | Already done |
| **Audit trail** | ❌ | ❌ | Partial | Maybe missing |
| **Soft delete** | ❌ | ❌ | ✅ | Already done |

**What you use:** Nothing—you're done here

---

## OTHER COMMENT COMPONENTS YOU Haven't Mentioned

### 6) **Comment Anchor Persistence**
Relocate comment if HTML changes (text moves, DOM restructures)

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **Selector relocation** | ✅ `anchorSelector()` | ✅ (implicit) | ❌ | YES—critical |
| **Fuzzy matching** | ✅ (prefix/suffix) | ⚠️ (limited) | ❌ | YES |
| **Version tracking** | ❌ | ❌ | ❌ | Maybe |
| **Broken anchor detection** | ❌ | ❌ | ❌ | Maybe |

**What you use from libraries:**
- **Annotator.js:** `anchorSelector()` to relocate text highlights
- **Annotorious:** Region relocation (implicit with SVG)
- **You build:** Detect when selectors break, notify user, offer manual fixing

---

### 7) **Comment Search & Filtering**
Find comments by text, author, status

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **Full-text search** | ❌ | ❌ | ❌ | Maybe |
| **Filter by author** | ❌ | ❌ | ❌ | Maybe |
| **Filter by status** | ❌ | ❌ | ❌ | Maybe |
| **Filter by selection type** | ❌ | ❌ | ❌ | Maybe (text vs SVG) |
| **Timeline view** | ❌ | ❌ | ❌ | Maybe |

**What you use from libraries:** Nothing
**You build if needed:** Convex queries with filters

---

### 8) **Comment Notifications/Mentions**
@ mentions, reply notifications, digest emails

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **@mention parsing** | ❌ | ❌ | ❌ | Maybe |
| **User notifications** | ❌ | ❌ | ❌ | Maybe |
| **Email delivery** | ❌ | ❌ | ❌ | Maybe |
| **Notification digest** | ❌ | ❌ | ❌ | Maybe |
| **Watch/unwatch** | ❌ | ❌ | ❌ | Maybe |

**What you use from libraries:** Nothing
**You build if needed:** Custom system

---

### 9) **Comment Reactions/Sentiment**
Emoji reactions, +1, likes, disagreement

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **Emoji reactions** | ❌ | ❌ | ❌ | Maybe (nice-to-have) |
| **Vote/consensus** | ❌ | ❌ | ❌ | Maybe |
| **Sentiment tracking** | ❌ | ❌ | ❌ | Maybe |

**What you use from libraries:** Nothing
**You build if needed:** Convex backend + React UI

---

### 10) **Comment Export & Portability**
Export comments as W3C JSON-LD, move to other systems

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **W3C export** | ✅ | ✅ | ❌ | YES (for future-proofing) |
| **Bulk export** | ❌ | ❌ | ❌ | Maybe |
| **Import from W3C** | ⚠️ (partial) | ⚠️ (partial) | ❌ | Maybe |

**What you use from libraries:**
- **Annotator.js:** Selector export as W3C
- **Annotorious:** Selector export as W3C
- **You build:** Convex query to export all comments as W3C JSON-LD

---

### 11) **Comment Status & Workflow**
Open, resolved, disputed, rejected states

| Component | Annotator.js | Annotorious | Your System | Status |
|-----------|--------------|-------------|------------|---|
| **Status field** | ❌ | ❌ | ✅ | Already done |
| **Status transitions** | ❌ | ❌ | ❌ | Need to build |
| **Workflow rules** | ❌ | ❌ | ❌ | Need to build |
| **Permissions by status** | ❌ | ❌ | ❌ | Need to build |

**What you use:** Your status field if you have it
**You build:** Status transition logic

---

### 12) **Comment Permissions & Access Control**
Who can view, edit, delete, resolve

| Component | Annotator.js | Annotorious | Your System | Status |
|-----------|--------------|-------------|------------|---|
| **Can view comment** | ❌ | ❌ | ✅ | Already done |
| **Can edit comment** | ❌ | ❌ | ✅ | Already done |
| **Can resolve/close** | ❌ | ❌ | ✅ | Already done |
| **Can delete** | ❌ | ❌ | ✅ | Already done |
| **Creator only edits** | ❌ | ❌ | ✅ | Already done |

**What you use:** Your existing permission system

---

### 13) **Selection Conflict Handling**
What if two users select overlapping regions?

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **Overlap detection** | ❌ | ❌ | ❌ | Maybe |
| **Conflict visualization** | ❌ | ❌ | ❌ | Maybe |
| **Nesting rules** | ❌ | ❌ | ❌ | Maybe |

**What you use:** Nothing
**You build if needed:** Custom logic

---

### 14) **Comment Analytics & Metrics**
Heatmaps, most-commented sections, comment velocity

| Component | Annotator.js | Annotorious | Your System | Need? |
|-----------|--------------|-------------|------------|---|
| **Comment heatmap** | ❌ | ❌ | ❌ | Nice-to-have |
| **Most-commented sections** | ❌ | ❌ | ❌ | Nice-to-have |
| **Metrics/reporting** | ❌ | ❌ | ❌ | Nice-to-have |

**What you use:** Nothing
**You build if needed:** Custom queries + visualization

---

## Annotator.js + Annotorious Architecture

```
User Action Layer (React)
    ↓
Selection Layer (Annotator.js for text, Annotorious for SVG/images)
    ↓
Selector Data (W3C JSON-LD)
    ↓
Your Comment System
    ├── Create comment with selector → Convex
    ├── Display comments → React
    ├── Threading (inReplyTo) → Convex
    ├── Edit/delete → Your UI
    ├── Resolve/status → Your UI
    ├── Permissions → Your auth system
    └── Export → W3C format
```

---

## Real Integration Example

```typescript
// Convex schema addition
export default defineSchema({
  comments: defineTable({
    // Your existing fields
    id: v.string(),
    text: v.string(),
    authorId: v.string(),
    inReplyTo: v.optional(v.string()),
    status: v.enum("open", "resolved", "disputed"),
    created: v.number(),

    // NEW: Selector from Annotator.js or Annotorious
    selector: v.object({
      type: v.enum("TextQuoteSelector", "SVGSelector"),

      // TextQuoteSelector (from Annotator.js)
      exact: v.optional(v.string()),
      prefix: v.optional(v.string()),
      suffix: v.optional(v.string()),

      // SVGSelector (from Annotorious)
      svgPath: v.optional(v.string()),
      polygon: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
    }),

    artifactId: v.string(),
  }),
});
```

---

## What Each Library ACTUALLY Provides

### Annotator.js
```
✅ Text selection handler
✅ TextQuoteSelector creation
✅ Text highlight rendering
✅ anchorSelector() - relocate text if HTML changes
✅ W3C data format
❌ Threading
❌ Comment display UI
❌ Edit/delete interface
❌ Status management
```

### Annotorious
```
✅ SVG/image region selection UI
✅ SVGSelector creation
✅ Region highlight rendering
✅ Region relocation
✅ W3C data format
❌ Text annotation (experimental)
❌ Threading
❌ Comment display UI
❌ Edit/delete interface
❌ Status management
```

### Your System
```
✅ Comment storage (Convex)
✅ Threading (inReplyTo)
✅ Comment display UI
✅ Edit/delete interface
✅ Status management
✅ Permissions
✅ User authentication
❌ Text selection
❌ SVG region selection
❌ Selector creation/relocation
```

---

## Decision: Using Both Together

**YES, using both together makes sense IF:**
1. You have both text-heavy documents AND SVG/image content
2. Text selection is a high priority (not an afterthought)
3. You want battle-tested selection logic (not custom)
4. You're willing to manage two separate libraries

**Integration effort:** ~3-4 weeks
- Annotator.js for text: 1-2 weeks
- Annotorious for SVG: 1-2 weeks
- Glue/unified UI: 1 week

**Alternative: Custom text selection + Annotorious**
- Annotorious for SVG: 1-2 weeks
- Custom text selection: 1-2 weeks
- Combined: 2-3 weeks

---

## Unaddressed Gaps

You might also need:

1. **Broken selector detection** - What if text changes and selector can't be found?
2. **Selection conflict visualization** - Show overlapping comments somehow
3. **Deep linking** - Link to specific artifact + comment
4. **Bulk actions** - Resolve all comments, export all, etc.
5. **Comment moderation** - Report/flag inappropriate comments
6. **Comment versioning** - Track edit history
7. **Concurrent editing** - Handle real-time multiplayer comments
8. **Performance** - What happens with 500+ comments on one artifact?

These aren't from the libraries—they're from your product requirements.
