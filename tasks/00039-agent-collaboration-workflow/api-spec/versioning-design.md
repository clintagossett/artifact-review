# Version Identification Design

## The Problem

How do AI agents unambiguously reference a specific version of content?

**Scenario:**
```
Agent: "I updated the RBAC plan based on your feedback"
Human: "Which version are you talking about?"
Agent: "Version 3" or "abc123hash" ?
```

---

## Options

### Option A: Sequential Version Numbers (Current)

| Identifier | Example | Usage |
|------------|---------|-------|
| Number | `v1`, `v2`, `v3` | `/artifacts/{token}/versions/3` |

**Pros:**
- Simple, human-readable
- Already implemented
- Natural ordering

**Cons:**
- Not content-addressable (same content = different version if uploaded twice)
- Agent can't verify "is this the version I uploaded?"

---

### Option B: Content Hash (Git-style)

| Identifier | Example | Usage |
|------------|---------|-------|
| SHA-256 (short) | `a3f8c2b` | `/artifacts/{token}/versions/a3f8c2b` |

**How Git Does It:**
- Hash the content bytes
- Same content = same hash (content-addressable)
- First 7 chars usually sufficient for uniqueness

**Pros:**
- Content-addressable: Agent can verify upload succeeded
- Idempotent: Re-uploading same content doesn't create duplicate
- Universal: Works across systems

**Cons:**
- Hashes are sensitive to any byte difference
- Newline differences (CRLF vs LF) = different hash
- Encoding differences = different hash
- Less human-friendly

---

### Option C: Hybrid (Both)

| Field | Value | Purpose |
|-------|-------|---------|
| `number` | `3` | Human-friendly, ordering |
| `contentHash` | `a3f8c2b` | Content verification |

**API Response:**
```json
{
  "versionNumber": 3,
  "contentHash": "a3f8c2b1d4e5f6",
  "createdAt": "2025-01-18T21:50:00Z"
}
```

**Agent workflow:**
1. Agent uploads content, calculates local hash
2. Server returns `contentHash` in response
3. Agent verifies: "My hash matches server's hash ✓"
4. Later, agent refers to `v3` or `a3f8c2b`

---

## Hash Sensitivity Analysis

### What Changes the Hash?

| Change | Hash Changes? | Mitigation |
|--------|---------------|------------|
| Content edit | ✅ Yes (expected) | None needed |
| CRLF → LF | ✅ Yes | Normalize on upload |
| Encoding (UTF-8 vs UTF-16) | ✅ Yes | Force UTF-8 |
| Trailing whitespace | ✅ Yes | Trim on upload |
| BOM (byte order mark) | ✅ Yes | Strip on upload |

**Solution:** Normalize before hashing

```typescript
function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')     // CRLF → LF
    .replace(/\r/g, '\n')       // CR → LF
    .trimEnd();                  // Remove trailing whitespace
}

function contentHash(content: string): string {
  const normalized = normalizeContent(content);
  const hash = sha256(normalized);
  return hash.substring(0, 12);  // First 12 chars
}
```

---

## ✅ Final Decision

### Now: Sequential Version Numbers Only

**Keep it simple:**
- `v1`, `v2`, `v3` - works, already implemented
- Human-readable, natural ordering
- Agent refers to "v3" - clear and unambiguous

**Skip content hashing for now:**
- Adds complexity without immediate value
- Normalization edge cases
- Can add later if needed

### Future: Git Integration

When GitHub integration comes, link versions to commits:

```json
{
  "versionNumber": 3,
  "gitCommit": "a3f8c2b1",      // Optional: linked commit hash
  "gitBranch": "main",          // Optional: branch name
  "gitRepo": "user/repo"        // Optional: source repo
}
```

**Benefits of deferring to Git:**
- Git already solves the hash problem
- Users familiar with git commit hashes
- Ties artifacts to actual source of truth
- We don't reinvent the wheel

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Primary identifier? | Sequential version number (v1, v2, v3) |
| Content hashing? | ❌ Skip for now - adds complexity |
| Git integration? | Future: link to git commit hashes |
| Verification? | Agent trusts API response for now |
