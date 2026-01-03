# Task 00029: Research Commenting Libraries for HTML/MD Files

**GitHub Issue:** #29

**Goal:** Investigate existing HTML/JS commenting libraries that could be used in Artifact Review for adding comments to HTML and Markdown files rendered in React.

## Research Summary

A comprehensive research agent reviewed 20+ commenting and annotation libraries across 6 categories:

### Categories Researched

1. **Specialized Annotation & Commenting Libraries** (Hypothesis, Genius, Annotator.js, Recogito)
2. **Blog/Forum-Style Comment Systems** (Utterances, Commento, Disqus, react-comments-section)
3. **Rich Text Editors with Commenting** (Tiptap, Slate, Quill, Lexical)
4. **Real-Time Collaboration** (Liveblocks, Yjs)
5. **Medium-Like Side Comments** (Side Comments, comment-on-highlight)
6. **Document Review Specific** (Review Board, doc-review)

---

## Key Findings: Common Features Across Libraries

### Universal Features
- **Text Highlighting/Selection** - Most libraries support selecting text and adding comments
- **Threading/Replies** - Many support nested/threaded discussions (though some require custom implementation)
- **User Attribution** - Author name and avatar support
- **Timestamps** - When comments were created/modified
- **Persistence** - Most assume backend storage (database)

### Advanced Features (Varying Support)
- **Markdown Support** - Tiptap, Lexical, Quill (Delta), Genius, Utterances excel here
- **Real-Time Sync** - Liveblocks, Yjs, Lexical, Tiptap have built-in collaboration
- **Mentions (@notifications)** - Liveblocks has this natively
- **Rich Text Formatting** - Tiptap, Quill, Lexical support WYSIWYG
- **Side Margin Comments** - Recogito, Side Comments, Hypothesis feature this
- **React Integration** - Tiptap, Lexical, Liveblocks have native React components

---

## Top 3 Recommendations for Artifact Review

### 🥇 **Best Match: Tiptap + Liveblocks**
- **Tiptap:** Modern editor framework with native Markdown and HTML support
- **Liveblocks:** Production-ready comment components with threading, mentions, real-time sync
- **Pros:** Complete solution, excellent React integration, scalable
- **Cons:** External service dependency (Liveblocks), higher complexity
- **Best for:** Full-featured artifact review with multiplayer support

### 🥈 **Alternative: Recogito + Custom Backend**
- **Recogito:** Purpose-built for text annotation with React components
- **Backend:** Custom Convex implementation for comments
- **Pros:** Lighter weight, lower cost, W3C standards-based
- **Cons:** Need to build threading and persistence
- **Best for:** Focused annotation workflow without real-time collaboration

### 🥉 **Lightweight: comment-on-highlight + Custom Backend**
- **Library:** Pure React, no dependencies, Medium-like UX
- **Backend:** Custom Convex implementation
- **Pros:** Minimal complexity, full control, lightweight
- **Cons:** Basic feature set, need custom threading/persistence
- **Best for:** MVP or simple review workflow

---

## Common Features Needed for Artifact Review

### Must-Haves
- ✅ Text selection and commenting
- ✅ Thread/reply support
- ✅ User attribution (author, avatar)
- ✅ Timestamps
- ✅ Edit/delete capability
- ✅ Both HTML and Markdown support

### Nice-to-Haves
- ⭐ Real-time multiplayer
- ⭐ Mentions/notifications
- ⭐ Side margin indicators
- ⭐ Rich text formatting in comments
- ⭐ Emoji reactions

---

## Next Steps

1. **Review recommendations** with product/design team
2. **Clarify feature priorities:**
   - Do you need real-time multiplayer commenting?
   - Side margin vs inline comments preference?
   - Threading complexity level?
3. **Prototype evaluation** - Try 2-3 libraries with sample artifacts
4. **Feature priority** - Decide on must-haves
5. **Integration path** - Plan Convex backend integration
6. **Create implementation task** for chosen approach

See `research-output.md` for detailed analysis of all 20+ libraries.
