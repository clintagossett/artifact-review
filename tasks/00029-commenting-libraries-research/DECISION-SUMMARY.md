# Decision Summary: Annotation Library Selection

**Status:** Research complete. Ready for decision.

---

## Your Situation

✅ **You have:**
- Comment storage (Convex)
- Threading/replies
- Comment display UI
- Edit/delete interface
- Permissions system

❌ **You need:**
- Text selection handler
- SVG/image region selection handler
- W3C selector data storage
- Selector anchoring (relocation if document changes)

**This is a selection layer problem, not a complete system problem.**

---

## Your Options

### Option 1: Annotator.js + Annotorious ✅ RECOMMENDED

**What you get:**
- Annotator.js: Text selection + TextQuoteSelector + text highlighting
- Annotorious: SVG/image region selection + SVGSelector + region highlighting
- Both: W3C compliant, proven libraries, active(ish) communities

**What you build:**
- Unified selection handler (route to right library)
- Mode switching UX (hover hints + keyboard override)
- Store selector in comment model
- Anchor selectors back to HTML when displaying

**Complexity:** Medium
**Development time:** 3-4 weeks
**Risk:** Low (both libraries work well in their domain)
**Maintenance:** Low (you're using proven selector logic)

**Integration:**
```typescript
// User selects text
const selector = await annotator.createSelector(selection);
comment.selector = selector;

// User selects SVG region
const region = annotorious.createSelector(region);
comment.selector = region;

// When displaying comment, relocate selector
const range = await annotator.anchorSelector(comment.selector);
highlightRange(range);
```

---

### Option 2: Apache Annotator (Custom SVG)

**What you get:**
- Apache Annotator: Selector logic framework (doesn't assume UI)
- You build: Text + SVG selection handlers

**What you build:**
- Text selection handler using Apache Annotator
- SVG region selection handler (custom)
- Mode switching UX
- Store + anchor selectors

**Complexity:** Medium-High
**Development time:** 2-3 weeks
**Risk:** Medium (Apache Annotator in potential retirement)
**Maintenance:** Medium (you own SVG handler)

**When to choose:**
- Only if Apache Annotator project gets revived
- Or if you want to build SVG selection from scratch
- Not recommended given Annotorious exists

---

### Option 3: Custom React (Text + SVG)

**What you get:**
- Nothing from libraries
- Full control over selection logic

**What you build:**
- Text selection handler
- SVG region selection handler
- Mode switching UX
- Selector anchoring (the hard part)
- Store + display selectors

**Complexity:** High
**Development time:** 3-4 weeks
**Risk:** High (selector anchoring is tricky, lots of edge cases)
**Maintenance:** High (you own all the code)

**When to choose:**
- You want zero external dependencies
- You have custom annotation types not covered by standard selectors
- You have significant custom UX requirements

---

## Side-by-Side Comparison

| Aspect | Option 1 (Rec) | Option 2 | Option 3 |
|--------|---|---|---|
| **Libraries used** | Annotator.js + Annotorious | Apache Annotator | None |
| **Text selection** | ✅ Proven | ✅ Framework | ❌ You build |
| **SVG selection** | ✅ Proven | ❌ You build | ❌ You build |
| **Development time** | 3-4 weeks | 2-3 weeks | 3-4 weeks |
| **Maintenance burden** | Low | Medium | High |
| **Risk** | Low | Medium | High |
| **No dependencies** | ❌ | ⚠️ | ✅ |
| **Flexibility** | Medium | High | Very High |
| **Recommended** | ✅✅✅ | ⚠️ | ❌ |

---

## What Makes Option 1 Best

1. **Proven selector logic**
   - Annotator.js: 10+ years of text annotation in production
   - Annotorious: 5+ years, actively maintained, professional team
   - You don't reinvent the hard part

2. **Different problems solved by each**
   - Annotator.js specializes in text (why rebuild?)
   - Annotorious specializes in image/SVG (why rebuild?)
   - Minimal overlap to integrate

3. **Clear mode separation**
   - Libraries are orthogonal (don't compete)
   - User naturally switches based on what they're clicking
   - Integration is straightforward

4. **W3C compliance out-of-box**
   - Both libraries export W3C Web Annotation format
   - Your data is portable, future-proof
   - Can export all comments as JSON-LD

5. **Reasonable integration**
   - Mode switching: 3-4 patterns available
   - Selector storage: Add `selector` field to comment
   - Selector display: Use library's anchor function
   - ~1 week of integration work

---

## Implementation Roadmap (Option 1)

### Phase 1: Annotator.js Integration (1 week)
- [ ] Install Annotator.js
- [ ] Integrate into artifact viewer
- [ ] Create text selection handler
- [ ] Test with real HTML
- [ ] Store TextQuoteSelector in comment model
- [ ] Implement text highlighting on display

### Phase 2: Annotorious Integration (1 week)
- [ ] Install Annotorious
- [ ] Set up on SVG/image containers
- [ ] Create region selection handler
- [ ] Test with sample SVGs
- [ ] Store SVGSelector in comment model
- [ ] Implement region highlighting on display

### Phase 3: Mode Switching UX (1 week)
- [ ] Implement hover detection
- [ ] Add cursor changes
- [ ] Add hint tooltips
- [ ] Implement keyboard overrides (Shift, Alt)
- [ ] Add floating comment toolbar
- [ ] Test edge cases

### Phase 4: Testing & Polish (0.5-1 week)
- [ ] Test with real artifacts
- [ ] Test selector persistence (document changes)
- [ ] Test anchor relocations
- [ ] Performance testing (50+, 100+, 200+ annotations)
- [ ] Edge case handling

### Phase 5: Optional Enhancements (1+ week)
- [ ] Export all comments as W3C JSON-LD
- [ ] Import comments from W3C format
- [ ] Comment search/filtering
- [ ] Notifications/mentions
- [ ] Analytics/heatmaps

**Total MVP:** 3-4 weeks (Phases 1-3 + minimal Phase 4)

---

## How Mode Switching Works (Recommended Approach)

**Default behavior: Intelligent hover + hints**

```typescript
// Hover over text → Show text cursor + hint
// Hover over SVG → Show crosshair + hint
// User just... selects what they need

// Power users can override:
// Shift + drag → Force text selection
// Alt + drag → Force SVG region
```

**Why this works:**
- Seamless (no extra UI)
- Educational (hints teach behavior)
- Powerful (keyboard for edge cases)
- Discoverable (hover hints appear naturally)

See `MODE-SWITCHING-UX.md` for detailed UX patterns and code examples.

---

## Decision Checklist

Before proceeding with Option 1, confirm:

- [ ] You're comfortable with two separate libraries
- [ ] You're okay with managing jQuery (in Annotator.js)
- [ ] Your comment model can store W3C selector objects
- [ ] You understand the mode switching UX pattern
- [ ] You have test artifacts (complex HTML + SVGs)
- [ ] You can allocate 3-4 weeks for implementation

---

## Next Steps

1. **If choosing Option 1:**
   - Create new task for implementation
   - Start with Phase 1 (Annotator.js integration spike)
   - Run 1-week spike to validate approach

2. **If choosing Option 2 or 3:**
   - Need more research on Apache Annotator project status
   - Or proceed with custom React implementation

3. **Before starting:**
   - Review `MODE-SWITCHING-UX.md` for interaction design
   - Review `COMPONENT-BREAKDOWN.md` for data model
   - Verify Convex schema can store W3C selectors

---

## Risk Mitigation

### If Annotator.js proves problematic
- Fallback: Custom text selection (Medium effort)
- Keep Annotorious (SVG works well)
- Hybrid approach still viable

### If Annotorious React integration is hard
- Fallback: Use vanilla JS Annotorious
- Wrap in React via useEffect/refs (already done in examples)
- Or switch to custom SVG handler

### If selector anchoring breaks
- Detect broken selector early
- Show user: "Comment's location can't be found"
- Allow user to re-select text/region
- Store new selector alongside old one

---

## Success Criteria

Implementation is successful when:

✅ User can select text in HTML → creates comment with TextQuoteSelector
✅ User can select SVG region → creates comment with SVGSelector
✅ Selector auto-relocates when document changes (Annotator.js feature)
✅ Comments display with highlights in correct locations
✅ Mode switching is natural (hover-based with hints)
✅ Works with real artifacts (complex HTML + images + SVGs)
✅ Handles 50+ comments without performance issues
✅ W3C selectors exportable as JSON-LD

---

## Files to Review

- `README.md` - Summary of final four options
- `LAYER-ANALYSIS.md` - Why you only need selection layer
- `COMPONENT-BREAKDOWN.md` - What you have vs. what you need
- `MODE-SWITCHING-UX.md` - How users switch between text/SVG modes
- `research-output.md` - Deep evaluation of all approaches
