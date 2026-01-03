# Subtask 01: Architecture Decisions

**Status:** Pending
**Estimated Effort:** 1-2 hours
**Owner:** TBD

## Purpose

Make key technical decisions before implementation to avoid costly rewrites and ensure security.

## Decisions Required

### 1. HTML Storage Strategy

**Question:** Where and how should we store HTML content?

**Options:**

#### Option A: Convex File Storage
```typescript
// artifacts table stores reference to file
{
  _id: Id<"artifacts">,
  title: string,
  htmlFileId: Id<"_storage">,  // Reference to Convex File Storage
  // ... other metadata
}
```

**Pros:**
- Scalable for large HTML files (no document size limits)
- CDN delivery available
- Efficient storage for binary/large content
- Better separation of concerns

**Cons:**
- More complex upload flow (multi-step: upload file, then create artifact)
- Requires file cleanup on artifact deletion
- Additional API calls to retrieve content

#### Option B: Embedded in Document
```typescript
// artifacts table stores HTML directly
{
  _id: Id<"artifacts">,
  title: string,
  htmlContent: string,  // HTML stored as string
  // ... other metadata
}
```

**Pros:**
- Simpler implementation (single mutation)
- Atomic operations (HTML + metadata together)
- Easier queries and access
- No orphaned files

**Cons:**
- Convex document size limit (1MB)
- Less efficient for very large HTML
- Harder to migrate to file storage later

**Recommendation:**
Start with **Option B (Embedded)** for MVP because:
- Most Claude Code HTML artifacts are < 100KB
- Simpler to implement and test
- Can migrate to File Storage later if needed
- Atomic operations reduce edge cases

**Decision:** _[TBD - discuss with team]_

---

### 2. HTML Sanitization & Security

**Question:** How do we prevent XSS and other security issues when storing/rendering user-uploaded HTML?

**Security Threats:**
1. **XSS via `<script>` tags:** Malicious JavaScript execution
2. **Event handlers:** `onclick`, `onerror`, etc.
3. **External resources:** Malicious `<iframe>`, `<object>`, external scripts
4. **CSS injection:** Exfiltrating data via CSS
5. **Form hijacking:** Phishing via embedded forms

**Strategy:**

#### Server-Side Sanitization (Required)
- Use **DOMPurify** (or similar) on backend during upload
- Strip dangerous tags: `<script>`, `<iframe>`, `<object>`, `<embed>`
- Remove event handlers: `onclick`, `onerror`, `onload`, etc.
- Whitelist safe tags and attributes
- Validate before storage

```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
  });
};
```

#### Client-Side Sandboxing (Defense in Depth)
- Render in `<iframe>` with `sandbox` attribute
- Disable JavaScript: `sandbox="allow-same-origin"`
- Set strict CSP headers
- Isolate rendering domain (future: `artifacts.example.com`)

```html
<iframe
  sandbox="allow-same-origin"
  src={artifactUrl}
  style={{ border: 'none', width: '100%', height: '100%' }}
/>
```

**Decision:** _[TBD - confirm sanitization library and whitelist]_

---

### 3. File Size Limits

**Question:** What's the maximum HTML file size we should accept?

**Considerations:**
- Convex document limit: 1MB (if embedding HTML)
- User experience: Upload time, rendering performance
- Cost: Storage and bandwidth
- Typical Claude Code output: 10KB - 200KB

**Proposal:**
- **Initial limit:** 5MB
- **Rationale:**
  - Covers 99% of AI-generated HTML artifacts
  - Prevents abuse/DoS
  - Leaves room for embedded assets (inline images, CSS)
- **Enforcement:**
  - Frontend: Immediate validation before upload
  - Backend: Hard limit in mutation (security boundary)

**Implementation:**
```typescript
// Frontend validation
if (file.size > 5 * 1024 * 1024) {
  throw new Error('File size exceeds 5MB limit');
}

// Backend validation
const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB
if (htmlContent.length > MAX_HTML_SIZE) {
  throw new Error('HTML content too large');
}
```

**Decision:** ✅ **Accepted** - Use limits from ADR 0002

---

### 6. Frontend ZIP Validation

**Question:** Should frontend peek at ZIP contents before upload?

**Options:**

#### Option A: No Frontend Validation
- Upload ZIP blindly, validate on backend
- Simpler, smaller bundle
- Slower feedback, wasted bandwidth on invalid ZIPs

#### Option B: Lightweight Metadata Peek (RECOMMENDED)
- Use jszip to read file list (metadata only, no extraction)
- Fast (~1ms), minimal memory
- Immediate feedback, entry point preview

#### Option C: Full Extraction
- Extract all files in browser
- Browser freeze on large ZIPs, memory intensive
- Rejected - too slow/heavy

**Decision:** ✅ **Option B - Lightweight Metadata Peek**

**Rationale:**
- User gets instant validation (file count, HTML detection)
- Can show entry point selector immediately
- Minimal performance impact (~50KB bundle)
- Backend still validates everything (security boundary)

**Implementation:**
```typescript
const peekZip = async (file: File) => {
  const zip = await JSZip.loadAsync(file);
  const fileList = Object.keys(zip.files).filter(p => !zip.files[p].dir);

  if (fileList.length > 500) {
    throw new Error('ZIP contains too many files (max 500)');
  }

  const htmlFiles = fileList.filter(p => p.toLowerCase().endsWith('.html'));
  if (htmlFiles.length === 0) {
    throw new Error('No HTML files found in ZIP');
  }

  return { htmlFiles, needsEntryPointSelection: !hasIndexOrMain(htmlFiles) };
};
```

---

### 4. Share URL Strategy

**Question:** What format should shareable URLs use?

**Options:**

#### Option A: Short Codes
- Format: `/a/abc123`
- Length: 6-8 characters (alphanumeric)
- Example: `https://app.example.com/a/xJ4k2P`

**Pros:**
- Clean, memorable URLs
- Easy to share verbally or in screenshots
- Professional appearance

**Cons:**
- Requires collision detection and retry logic
- Potential for enumeration attacks (if sequential)
- Need to track used codes

**Implementation:**
```typescript
import { nanoid } from 'nanoid';

const generateShareToken = (): string => {
  return nanoid(8); // 8-char random alphanumeric
};
```

#### Option B: UUIDs
- Format: `/artifacts/550e8400-e29b-41d4-a716-446655440000`
- Length: 36 characters
- Example: `https://app.example.com/artifacts/550e8400-e29b-41d4-a716-446655440000`

**Pros:**
- Guaranteed unique (no collisions)
- No retry logic needed
- Standards-compliant

**Cons:**
- Long, ugly URLs
- Hard to share verbally
- Less user-friendly

**Recommendation:** **Option A (Short Codes)** because:
- Better UX for sharing
- Collision risk is negligible with 8-char nanoid (208 trillion combinations)
- Can add uniqueness check in mutation

**Decision:** _[TBD - confirm short code approach]_

---

### 5. Schema Design

**Question:** What fields should the `artifacts` table have?

**Proposed Schema:**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  artifacts: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    htmlContent: v.string(),           // Or htmlFileId if using File Storage
    creatorId: v.id("users"),
    shareToken: v.string(),             // Unique short code
    status: v.union(
      v.literal("draft"),
      v.literal("published")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_share_token", ["shareToken"]),

  // ... other tables
});
```

**Field Justification:**
- `title`: Required, user-provided name
- `description`: Optional, helps organize artifacts
- `htmlContent`: The actual HTML (sanitized)
- `creatorId`: Owner (for auth and filtering)
- `shareToken`: Unique code for public URL
- `status`: Future-proofing for review workflow
- `createdAt`/`updatedAt`: Audit trail

**Indexes:**
- `by_creator`: Fast lookup of user's artifacts
- `by_share_token`: Fast public access via share link

**Decision:** _[TBD - review and approve schema]_

---

## Outputs

Create the following ADR documents in `docs/architecture/decisions/`:

1. **`XXXX-html-storage-strategy.md`**
   - Decision: Embedded vs File Storage
   - Rationale and trade-offs
   - Migration path if needed

2. **`XXXX-html-sanitization-security.md`**
   - Sanitization library choice
   - Whitelist/blacklist rules
   - Rendering sandbox strategy
   - CSP headers

3. **`artifacts-schema.ts`** (draft in this folder)
   - Complete schema definition
   - Index justification
   - Field descriptions

## Next Steps

1. Review existing chef implementation for patterns
2. Review Figma designs for UX requirements
3. Discuss decisions with team
4. Create ADR documents
5. Get approval to proceed to subtask 02 (backend implementation)

---

**Status:** Awaiting team review
