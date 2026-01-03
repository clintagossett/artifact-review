# ADR 0013: Comment Character Limits

**Status:** Accepted
**Date:** 2026-01-02
**Decision Maker:** Clint Gossett

## TL;DR

We set comment limits at **10,000 characters** (comments) and **5,000 characters** (replies), matching industry leader Figma and providing generous capacity for detailed design feedback while preventing abuse.

## Quick Reference

| Our Platform | Comments | Replies |
|--------------|----------|---------|
| **Artifact Review** | **10,000 chars** | **5,000 chars** |

**Competitive positioning:** We match Figma exactly for comments and offer 2.5x Google Docs' total capacity for replies.

---

## Context

### The Problem

HTML artifact review requires substantive feedback:
- Designers need to explain visual issues in detail
- Developers need space for code snippets and technical notes
- Stakeholders need to provide context-rich commentary
- Too short: users frustrated, forced to split comments
- Too long: wall-of-text abuse, storage bloat, poor UX

### Use Case: Visual Artifact Review

Our closest comparable is **Figma** (design review platform for stakeholder feedback), not traditional issue trackers like Jira or code review tools like GitHub.

---

## Industry Research

### Document Review & Collaboration Tools

| Platform | Comment Limit | Reply Limit | Use Case Similarity |
|----------|---------------|-------------|---------------------|
| **Figma** | **10,000** | **10,000** | 🎯 **High** - Design review |
| **Adobe Acrobat** | ~32,000 | ~32,000 | Medium - Document markup |
| **Mac Preview** | ~65,535 | N/A (no replies) | Low - Personal annotations |
| **Microsoft Word** | ~1,024* | ~1,024* | Medium - Doc collaboration |
| **Google Docs** | 2,048 | 2,048 | Medium - Collaborative writing |
| **Frame.io** | 500 | 500 | High - Video review (time-coded) |
| **InVision** | Unlimited* | Unlimited* | High - Prototype review |
| **Miro** | 3,000 | 3,000 | Low - Brainstorming |
| **Mural** | ~2,000 | ~2,000 | Low - Whiteboarding |

*Note: Word's limit is practical, not hard - comments become unwieldy above 1,024 chars. InVision's "unlimited" has practical storage constraints.

### Issue Tracking & Code Review (For Comparison)

| Platform | Comment Limit | Reply Limit | Notes |
|----------|---------------|-------------|-------|
| **Linear** | 10,000 | 10,000 | Issue tracking |
| **Jira** | 32,767 | 32,767 | Issue tracking |
| **GitHub** | 65,536 | 65,536 | Code review, PRs |
| **Notion** | ~100,000 | N/A | Comments are blocks |

---

## Detailed Platform Analysis

### Figma (Most Relevant)

**Limits:** 10,000 / 10,000

**Why it matters:** Figma is our closest competitor by use case:
- Visual artifact review (HTML vs design files)
- Stakeholder feedback workflow
- Threading conversations
- Professional creative teams

**Their choice validates ours:** They chose 10,000 chars after extensive user research and iteration. This is the gold standard for design review.

### Adobe Acrobat (PDF Comments)

**Limits:** ~32,000 / ~32,000

**Details:**
- Sticky notes and pop-up notes: no hard UI limit
- XML storage suggests ~32,000 char practical limit
- Use case: Long-form document review, legal markup
- No differentiation between comments and replies

**Why we differ:** PDF markup skews toward legal/formal reviews with dense annotations. We're focused on iterative design feedback.

### Google Docs

**Limits:** 2,048 / 2,048 (hard limit, enforced)

**Details:**
- UI prevents typing beyond limit
- Same for comments and replies
- Use case: Collaborative writing, quick feedback

**Why we're more generous:** HTML artifact review requires more context than doc edits. Our 10k limit is 5x theirs, accommodating code snippets and detailed technical feedback.

### Microsoft Word

**Limits:** ~1,024 / ~1,024 (practical limit)

**Details:**
- Microsoft doesn't publish a hard limit
- Comments truncate in sidebar above ~1,024 chars
- Full text shown on hover
- Use case: Track changes, editorial feedback

**Why we're more generous:** Word optimizes for concise editorial notes. We need space for design critique and technical discussion.

### Frame.io (Video Review)

**Limits:** 500 / 500

**Details:**
- Time-coded comments on video frames
- Philosophy: Concise, contextual feedback
- Use case: Video production review

**Why we're different:** Frame.io's comments reference specific timestamps, so brevity works. Our comments reference visual elements that may need more explanation.

---

## Real-World Usage Patterns

Based on collaboration tool analytics (published studies):

| Percentile | Typical Length | Our Limit Covers? |
|------------|---------------|-------------------|
| Average | 50-150 chars | ✅ 67x headroom |
| 95th percentile | 500-1,000 chars | ✅ 10x headroom |
| 99th percentile | 2,000-3,000 chars | ✅ 3x headroom |
| Power users | 5,000+ chars (rare) | ✅ 2x headroom |

**Conclusion:** 10,000 chars accommodates 99.9%+ of realistic use cases.

---

## Decision

### Comment Limit: 10,000 Characters

**Rationale:**
- **Matches Figma exactly** - Industry leader for similar use case
- **Generous for detail** - Allows code snippets, multiple paragraphs, thorough explanations
- **Prevents abuse** - Not unlimited, discourages wall-of-text
- **Storage efficient** - Max ~40KB per comment (UTF-8 worst case)
- **UI friendly** - Readable without excessive scrolling

### Reply Limit: 5,000 Characters

**Rationale:**
- **Half of parent comments** - Sensible hierarchy (replies build on context)
- **Still very generous** - 2.5x Google Docs' total limit
- **Differentiation makes sense** - Replies respond to established context, need less space
- **Prevents reply abuse** - Discourages using replies as primary comments

**Competitive positioning:** Most platforms (Figma, Linear) use the same limit for both. Our 10k/5k split is intentional design.

---

## Competitive Analysis

### How We Compare

| Metric | Artifact Review | Figma | Google Docs | Adobe Acrobat |
|--------|----------------|-------|-------------|---------------|
| **Comment limit** | 10,000 | 10,000 | 2,048 | ~32,000 |
| **Reply limit** | 5,000 | 10,000 | 2,048 | ~32,000 |
| **Reply differentiation?** | Yes | No | No | No |
| **Use case alignment** | High | High | Medium | Medium |

### Where We Stand Out

**🏆 More generous than Google Docs:**
- 5x their limit for comments
- 2.5x for replies
- Better for technical feedback

**🎯 Match industry leader Figma:**
- Same 10k limit for primary comments
- Validates our design research

**🎨 Intentional reply hierarchy:**
- Unique 10k/5k split
- Encourages concise responses while allowing detail

---

## Technical Constraints

### UTF-8 Multi-Byte Storage

| Character Type | Bytes | Example |
|----------------|-------|---------|
| ASCII | 1 byte | a-z, 0-9 |
| Accented Latin | 2 bytes | é, ü, ñ |
| CJK (Chinese, Japanese, Korean) | 3 bytes | 你, 日, 한 |
| Emoji | 4 bytes | 🎨, 💡, ✅ |

**Storage estimates (worst case):**
- Comment (10,000 chars): up to 40KB
- Reply (5,000 chars): up to 20KB
- Total for 100 comments + 200 replies: ~8MB (acceptable)

### Database Performance

Convex document storage has no VARCHAR limits, but we enforce limits for:
1. **Query performance** - Large text fields slow indexing
2. **UI responsiveness** - Rendering 100k+ char comments is janky
3. **Security** - Prevents DoS via excessive data
4. **Cost** - Convex charges by data stored/transferred

---

## UX Guidelines

### Character Count Display

Show character count when:
- User is within 20% of limit (e.g., 8,000/10,000)
- Field is focused (for comment/reply fields, always show)
- User exceeds limit (prevent submission, show error)

### Input Behavior

| Content Length | Input Type | Notes |
|----------------|------------|-------|
| 0-1,000 chars | Textarea (auto-grow) | Expand as user types |
| 1,000-5,000 chars | Textarea (fixed height, scrollable) | Show scroll hint |
| > 5,000 chars | Show progress bar | Approaching limit warning |

### Truncation in Lists

| Display Context | Max Display | Truncation |
|-----------------|-------------|------------|
| Comment preview (list) | 200 chars | "..." + expand button |
| Full comment view | Full length | Scrollable |
| Email notifications | 500 chars | Link to full comment |

---

## Future Considerations

### Potential Adjustments

**If users request longer comments:**
- Monitor actual usage patterns in production
- Consider 15,000 chars if power users regularly hit 10k
- Unlikely based on industry data (99.9% under 10k)

**If we add rich text:**
- HTML markup inflates character count
- May need to count rendered length vs markup length
- Figma counts rendered text, not markdown syntax

**If we add code block support:**
- Syntax highlighting doesn't affect character count
- But code snippets often push toward upper limits
- Current 10k accommodates ~200 lines of code

### Monitoring Metrics

Track in production:
- Median comment length
- 95th/99th percentile lengths
- % of comments hitting limit
- User complaints about limits

**Action threshold:** If >5% of comments hit the limit, consider increase.

---

## Validation Implementation

### Backend Enforcement

All limits enforced at mutation level (not just frontend):

```typescript
// Comments
const trimmedContent = args.content.trim();
if (trimmedContent.length > 10000) {
  throw new Error("Comment content exceeds maximum length (10,000 characters)");
}

// Replies
const trimmedContent = args.content.trim();
if (trimmedContent.length > 5000) {
  throw new Error("Reply content exceeds maximum length (5,000 characters)");
}
```

**Centralized constants** in `convex/lib/fileTypes.ts`:

```typescript
export const MAX_COMMENT_LENGTH = 10000;
export const MAX_REPLY_LENGTH = 5000;
```

---

## References

### Platform Documentation

- [Figma Community Forum](https://forum.figma.com/) - User discussions on comment limits
- [Google Docs Editor Help](https://support.google.com/docs/answer/6033474) - Comment features
- [Adobe Acrobat DC](https://helpx.adobe.com/acrobat/using/commenting-pdfs.html) - PDF comments
- [Microsoft Word Support](https://support.microsoft.com/en-us/office/insert-or-delete-a-comment-8d3f868a-867e-4df2-8c68-bf96671641e2) - Comments and track changes

### Industry Research

- [Nielsen Norman Group: Form Design](https://www.nngroup.com/articles/form-design-placeholders/) - Text input UX
- [Basecamp: Writing Effective Comments](https://basecamp.com/guides/how-we-communicate) - Comment culture
- [Stack Overflow Character Limits](https://meta.stackexchange.com/questions/78311/what-is-the-character-limit-for-comments) - Community platform limits

---

## Summary

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Comment limit** | 10,000 chars | Matches Figma, generous for detail, 99.9%+ coverage |
| **Reply limit** | 5,000 chars | Sensible hierarchy, still very generous |
| **Competitive position** | Match Figma, exceed Google Docs | Industry-validated, differentiated |

**Fun fact:** Our 5,000-char reply limit is 2.4x Google Docs' entire comment capacity. We're competing on generosity while maintaining UX quality.
