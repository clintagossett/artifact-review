# Task 00029: Annotation Libraries Research - Complete Summary

**Status:** Research complete. Ready for spike.

---

## The Problem We Started With

You need to add annotations (text selection + comments) to complex HTML artifacts with text, images, charts, and SVG diagrams. But you already have:
- ✅ Threading (replies to comments)
- ✅ Comment display UI
- ✅ Edit/delete/resolve interface
- ✅ Permissions system

You just needed the **selection layer** (user selects text/regions and links them to comments).

---

## The Research Journey

### Phase 1: Market Survey
Researched 20+ commenting libraries across 6 categories.
- Liveblocks (SaaS - ruled out, need to own data)
- Tiptap + rich editors (too much, you don't need a full editor)
- Apache Annotator (framework, not a product)
- Recogito (text-only)
- **Annotator.js** (text selection ✅)
- **Annotorious** (SVG/image regions ✅)
- Custom React (possible but more work)

**Winner:** Annotator.js + Annotorious combo

### Phase 2: W3C Web Annotation Standard
Researched the W3C standard for portable annotations.
- JSON-LD format (future-proof)
- TextQuoteSelector (text with prefix/suffix context)
- SVGSelector (regions on images/diagrams)
- inReplyTo property (threading)

**Key insight:** Your data will be portable and compatible with other tools.

### Phase 3: Architecture Analysis
Discovered what you actually need vs. what libraries provide.
- You have: threading, display, permissions, storage
- Libraries provide: text selection, SVG selection, selectors
- You need: mode switching UI (how do users switch between text/SVG?)

**Key insight:** This is a "selection layer" problem, not a full system rebuild.

### Phase 4: Component Breakdown
Mapped all 14 comment system components and who owns what.
- You own: threading, display, edit/delete, permissions
- Libraries own: text selection, SVG selection
- Gaps to address later: search, notifications, export, analytics

**Key insight:** Clean separation of concerns.

### Phase 5: Mode Switching UX
Designed 5 different ways users could switch between text/SVG modes.
- Auto-detect (hover-based)
- Explicit buttons (clear but cluttered)
- Intelligent hints (best)
- Floating toolbar (familiar from Google Docs)
- Keyboard override (power users)

**Recommendation:** Hover + hints + keyboard override (seamless with escape hatches)

### Phase 6: Spike Planning
Planned 3-5 day spike to validate the approach with browser storage.

---

## Key Findings

### ✅ Your Comment Schema Already Supports This!

```typescript
// In convex/schema.ts
comments: defineTable({
  target: v.any(),  // <-- Perfect for W3C selectors!
  // ... rest of fields
})
```

**Status:** No schema changes needed. Your `target` field was designed for exactly this.

### ✅ Annotator.js is Battle-Tested

- 10+ years in production
- Used by MIT, Harvard, edX
- 5+ million annotations on Hypothes.is
- Proven TextQuoteSelector algorithm

**Risk:** Low

### ✅ Annotorious is Actively Maintained

- Latest release 1 month ago
- Professional team (Recogito)
- Native React support
- Excellent for SVG/image regions

**Risk:** Low

### ✅ Mode Switching is Solvable

- Hover detection is reliable
- Cursor changes provide feedback
- Keyboard overrides handle edge cases
- No extra UI button clutter required

**Risk:** Low

---

## The Recommendation

**Use Annotator.js + Annotorious together**

```
Text selection → Annotator.js (TextQuoteSelector)
SVG regions → Annotorious (SVGSelector)
Both → Store in comment.target field (W3C format)
```

**Implementation timeline:**
- Spike: 3-5 days (validate approach)
- Full implementation: 3-4 weeks (build production system)
- Total effort: ~1 month

**Risk level:** Low (proven libraries, clear architecture)

---

## What the Spike Will Prove

1. **Does Annotator.js work with your complex HTML?** ✓ Will test
2. **Does Annotorious work with your SVG diagrams?** ✓ Will test
3. **Does mode switching feel natural?** ✓ Will test
4. **Can we store W3C selectors in `target` field?** ✓ Will test
5. **Can we relocate selectors on display?** ✓ Will test

**Spike location:** `/app/src/components/spike/AnnotatedArtifactViewer.tsx`
**Storage:** Browser localStorage (temporary, not Convex)
**Scope:** Limited to proving the concept works

---

## Files in This Task

| File | Purpose | Read If |
|------|---------|---------|
| **00-READ-ME-FIRST.md** | This file | You want overview |
| **README.md** | Executive summary | You want quick ref |
| **DECISION-SUMMARY.md** | Why we chose this approach | You want detail on decision |
| **SPIKE-PLAN.md** | How to run the spike | You're running the spike |
| **COMPONENT-BREAKDOWN.md** | What each library provides | You want technical detail |
| **LAYER-ANALYSIS.md** | Why selection layer is key | You want architecture |
| **MODE-SWITCHING-UX.md** | How users switch modes | You want UX details |
| **research-output.md** | Deep technical evaluation | You want all the research |

---

## Next Steps

### To Start Spike:
1. Read `SPIKE-PLAN.md`
2. Create spike branch: `git checkout -b spike/annotation-libraries`
3. Follow Day 1 checklist (Annotator.js integration)
4. Build incrementally day-by-day

### After Spike:
1. Document findings
2. Record video walkthrough
3. Decide: proceed with full implementation or iterate?
4. Create implementation task (if green light)

---

## Critical Points About Your Schema

Your comment schema **already supports W3C selectors** in the `target` field:

```javascript
// When user selects text and creates comment:
{
  versionId: "abc123",
  createdBy: "user456",
  content: "This needs revision",
  target: {
    selector: {
      type: "TextQuoteSelector",
      exact: "selected text",
      prefix: "context before ",
      suffix: " context after"
    },
    version: 1,
    pageUrl: "/index.html"
  },
  // ... rest of fields (resolved, isEdited, etc.)
}
```

**When user selects SVG region:**
```javascript
{
  versionId: "abc123",
  createdBy: "user456",
  content: "Fix this diagram section",
  target: {
    selector: {
      type: "SVGSelector",
      value: "<svg><polygon points='...'></polygon></svg>"
    },
    version: 1,
    pageUrl: "/index.html"
  },
  // ... rest of fields
}
```

No schema changes needed. The spike will prove this works.

---

## Why This Is The Right Choice

### vs. Custom React
- ✅ Don't reinvent text selection (hard problem)
- ✅ Don't reinvent SVG regions (hard problem)
- ✅ Proven selector algorithms
- ✅ Same development time, lower risk

### vs. Apache Annotator Only
- ✅ Apache Annotator is in potential retirement
- ✅ Would still need custom SVG handler
- ✅ Annotorious is actively maintained

### vs. Single Library (Text OR SVG)
- ✅ Need both for your mixed-content artifacts
- ✅ These libraries don't compete (orthogonal)
- ✅ Clean integration (each does one thing well)

---

## The Vision

After the spike and implementation, your artifact review system will have:

```
User uploads HTML artifact with text, images, SVG diagrams
    ↓
User clicks to review
    ↓
Can select text → Comment appears
Can select image region → Comment appears
Can select SVG area → Comment appears
    ↓
Comments thread, can be resolved
    ↓
Artifact owner sees all feedback
    ↓
Export comments as W3C JSON-LD (portability!)
```

---

## Questions?

- **How much code is the spike?** ~500-1000 lines (browser-only, temporary)
- **How long does spike take?** 3-5 days
- **Does it affect production?** No (isolated in /spike/ folder)
- **When do we switch to Convex?** After spike, during full implementation
- **What if spike fails?** Documented in SPIKE-PLAN.md - we have fallback approaches

---

## Status

✅ Research complete
✅ Decision made (Annotator.js + Annotorious)
✅ Schema verified (target: v.any() is ready)
✅ UX designed (hover + hints + keyboard)
✅ Spike planned (3-5 days, browser storage)

**Ready to proceed:** Yes, create spike implementation task

---

## TL;DR

**What:** Add text + SVG annotation to artifact review
**How:** Annotator.js (text) + Annotorious (SVG)
**Storage:** Browser localStorage for spike, then Convex
**Timeline:** Spike 3-5 days, then 3-4 weeks full implementation
**Risk:** Low (proven libraries, clear architecture)
**Schema:** Already supports it (no changes needed)

Start the spike when ready!
