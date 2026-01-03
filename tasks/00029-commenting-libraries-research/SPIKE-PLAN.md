# Spike Plan: Text + SVG Annotation Libraries (Browser Storage Only)

**Goal:** Validate Annotator.js + Annotorious integration with your comment system using browser-only storage.

**Duration:** 3-5 days
**Scope:** Limited to spike; not production quality yet

---

## What We're Testing

1. **Can Annotator.js select text in complex HTML?**
2. **Can Annotorious select SVG/image regions?**
3. **Does mode switching (hover-based) feel natural?**
4. **Can we store W3C selectors in your comment model?**
5. **Can we relocate selectors when displaying comments?**

---

## Current State Assessment

### Your Comment Schema ✅ READY

```typescript
// In convex/schema.ts, comments table already has:
target: v.any(),  // Perfect for W3C selectors!
```

**Status:** No schema changes needed! Your `target` field was designed for exactly this.

**Example stored data:**
```javascript
{
  selector: {
    type: "TextQuoteSelector",
    exact: "highlighted text",
    prefix: "context before ",
    suffix: " context after"
  },
  version: 1,
  pageUrl: "/index.html"
}
```

### Current Threading ✅ READY

```typescript
commentReplies: defineTable({
  commentId: v.id("comments"),
  // ... threading already works!
})
```

**Status:** Replies are separate table. Threading is done. We just add selections to comments.

### Current Edit/Delete ✅ READY

```typescript
// Comments already have:
isEdited, isDeleted, resolvedBy, resolvedChangedAt, etc.
```

**Status:** All comment lifecycle operations exist. We just add selectors.

---

## Spike Architecture

```
New Test Viewer Component
  ├── HTML/SVG artifact loaded
  ├── Annotator.js integrated (text selection)
  ├── Annotorious integrated (SVG/image regions)
  ├── Mode switching (hover + hints)
  ├── Comment composer (on selection)
  ├── Comments list (sidebar)
  ├── Comment display with highlighting
  └── Browser localStorage (not Convex)
```

**Not touching:**
- Convex schema (already good)
- Threading system (already works)
- Permissions system (already works)
- Comment CRUD (already works)

---

## Spike Deliverables

### Day 1: Annotator.js Integration
- [ ] Create new `/app/src/components/spike/AnnotatedArtifactViewer.tsx`
- [ ] Install Annotator.js
- [ ] Text selection working
- [ ] TextQuoteSelector being created
- [ ] Test with sample HTML

**Proof of concept:**
- User can select text in HTML
- See console output showing W3C selector object
- Selector contains exact, prefix, suffix

### Day 2: Annotorious Integration
- [ ] Install Annotorious + React bindings
- [ ] SVG/image regions working
- [ ] SVGSelector being created
- [ ] Test with sample SVGs/images

**Proof of concept:**
- User can draw region on SVG
- See console output showing SVG selector
- Selector contains polygon/bounding box

### Day 3: Mode Switching + UI
- [ ] Hover detection working
- [ ] Cursor changes (text vs. crosshair)
- [ ] Hint tooltips showing
- [ ] Keyboard override (Shift/Alt) working
- [ ] Comment composer opens after selection
- [ ] User can type comment text

**Proof of concept:**
- Seamless switching between text and SVG
- User experience feels natural
- No extra UI clutter

### Day 4: Browser Storage + Display
- [ ] localStorage integration (not Convex)
- [ ] Store selection + comment together
- [ ] Display comments with highlights
- [ ] Relocate selectors using Annotator.js `anchorSelector()`
- [ ] Show comment count per selection

**Proof of concept:**
- Select text → add comment → refresh page → comment still there
- Comment displays with text highlighted
- Same with SVG regions

### Day 5: Testing + Refinement
- [ ] Test with real artifact samples
- [ ] Handle edge cases (overlapping selections, document changes)
- [ ] Performance testing (50+ comments)
- [ ] Write findings document
- [ ] Screenshot/video walkthrough

---

## Code Structure (Spike Only)

```
app/src/components/spike/
├── AnnotatedArtifactViewer.tsx    # Main spike component
├── useAnnotatorTextSelection.ts   # Text selection hook
├── useAnnotoriousRegions.ts       # SVG region hook
├── useAnnotationMode.ts           # Mode detection hook
├── useCommentStorage.ts           # Browser localStorage hook
├── CommentComposer.tsx            # Comment creation UI
├── CommentsList.tsx               # Comment display UI
├── ModeIndicator.tsx              # Hover mode indicator
└── test-artifacts/
    ├── complex-html.html          # Test with tables, nested elements
    └── sample.svg                 # Test SVG diagram
```

**Important:** Keep spike code in `/spike/` folder, separate from main app.

---

## Browser Storage Implementation (Temporary)

```typescript
// useCommentStorage.ts
export function useCommentStorage(artifactId: string) {
  const [comments, setComments] = useState<Comment[]>(() => {
    const stored = localStorage.getItem(`spike_comments_${artifactId}`);
    return stored ? JSON.parse(stored) : [];
  });

  const addComment = (comment: Comment) => {
    const updated = [...comments, comment];
    setComments(updated);
    localStorage.setItem(`spike_comments_${artifactId}`, JSON.stringify(updated));
  };

  const deleteComment = (id: string) => {
    const updated = comments.filter(c => c.id !== id);
    setComments(updated);
    localStorage.setItem(`spike_comments_${artifactId}`, JSON.stringify(updated));
  };

  return { comments, addComment, deleteComment };
}
```

**Why browser-only for spike?**
- Fast iteration (no Convex deployment)
- Easy to test without backend changes
- Can replay behavior (localStorage persists)
- Clear separation: this is about the selection UI, not persistence

**Conversion to Convex later:**
- Switch `localStorage` calls to `useMutation("comments.create")`
- Remove browser storage code
- Keep all selection logic (it doesn't care where data is stored)

---

## What We'll Learn From Spike

### Does Annotator.js work with your artifacts?
- Test with real artifact HTML (complex tables, nested elements)
- Check if text selection is robust
- Verify TextQuoteSelector has good prefix/suffix

### Does Annotorious work with your artifacts?
- Test with embedded SVGs and images
- Check region selection UX
- Verify SVGSelector is accurate

### Is mode switching natural?
- Watch how users click on text vs. SVG
- Does hover detection work reliably?
- Do cursor changes provide enough feedback?
- Do hints help or clutter?

### Can we store selectors in your comment model?
- Verify `target: v.any()` is flexible enough
- Check if selector data structure is clean
- Ensure selectors are serializable

### Can we relocate selectors reliably?
- Does `anchorSelector()` find text if HTML changes?
- How robust is fuzzy matching?
- What happens if text is deleted?

---

## Questions to Answer During Spike

1. **Text Selection Edge Cases**
   - Can Annotator.js handle text in tables?
   - Can it handle text in nested/styled elements?
   - Does it work with dynamic content (JS-rendered)?

2. **SVG Selection Edge Cases**
   - Can Annotorious handle complex SVG structures?
   - What about Mermaid diagrams (are they SVG)?
   - Does region selection work on transformed elements?

3. **Mode Switching Reality**
   - Does hover detection work on all content types?
   - Any false positives (detecting wrong mode)?
   - What about text overlapping SVG?

4. **Performance**
   - How fast is text selection on large documents?
   - Does Annotorious slow down with many regions?
   - Can we handle 50+ comments without lag?

5. **Data Structure**
   - Is `target: v.any()` sufficient, or need type safety?
   - Should we update Convex schema now or wait?
   - How do we version selectors (if format changes)?

---

## Spike Failure Scenarios (What Would Kill It)

❌ **Text selection doesn't work with your HTML**
- Nested tables, complex structure breaks it
- Solution: Custom text selection layer needed

❌ **SVG selection doesn't work with your diagrams**
- Mermaid diagrams aren't selectable
- Solution: Different approach for diagrams

❌ **Mode switching is confusing/unreliable**
- Users can't tell which mode they're in
- Solution: Explicit mode selector button (uglier UX)

❌ **Selector anchoring is too fragile**
- Text changes → can't find original selection
- Solution: Version-locked artifacts, no updates

❌ **Performance is bad with 50+ comments**
- Selection logic creates lag
- Solution: Virtual scrolling, chunking

---

## Success Criteria

✅ **Text selection works**
- User selects text → TextQuoteSelector created
- Selector has exact + prefix/suffix
- Shows in console/debug view

✅ **SVG selection works**
- User draws region → SVGSelector created
- Selector stores polygon/box coordinates
- Shows in console/debug view

✅ **Mode switching is natural**
- Hover over text → text cursor + hint
- Hover over SVG → crosshair + hint
- No explicit button required

✅ **Comment storage works**
- localStorage persists comments on refresh
- Comments display with selections highlighted
- Can edit/delete comments

✅ **Selector relocation works**
- Create comment on text
- Refresh page (artificial reload)
- Comment still highlights same text

✅ **No schema changes needed**
- Existing `target: v.any()` field is sufficient
- W3C selectors fit naturally

---

## Not In Scope For Spike

❌ Convex persistence (browser storage only)
❌ Production-quality error handling
❌ Performance optimization
❌ Responsive design (desktop only)
❌ Accessibility improvements
❌ Export/import of comments
❌ Real-time multiplayer
❌ Deep linking
❌ Analytics

---

## How to Run Spike

```bash
# Clone/checkout spike branch
git checkout -b spike/annotation-libraries

# Install dependencies
cd app
npm install annotator quill @annotorious/core @annotorious/react

# Start dev server
npm run dev

# Navigate to new test viewer
# http://localhost:3000/spike/annotation-test

# Use localStorage for storage
# Reload page to see persistence
```

---

## Output From Spike

### Technical Findings
- Document what works/breaks
- Performance metrics (time to select, time to display)
- Edge cases discovered

### Code Example
- Sample implementation for reference
- Mode switching pattern
- Browser storage pattern

### Decision Input
- Can we use these libraries?
- Any blockers?
- Estimate for real implementation

### Video Walkthrough
- Record 2-3 minute demo showing:
  - Text selection + commenting
  - SVG region selection
  - Mode switching
  - Comment persistence (localStorage)
