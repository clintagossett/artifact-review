# Task 00029: Research Commenting Libraries for HTML/MD Files

**GitHub Issue:** #29

**Goal:** Investigate existing HTML/JS commenting libraries that could be used in Artifact Review for adding comments to complex HTML artifacts with text, images, charts, SVGs, and Mermaid diagrams.

---

## Research Summary

Comprehensive research of 20+ commenting and annotation libraries resulted in narrowing to **4 final options** that meet constraints:
- ✅ 100% open source (no vendor lock-in)
- ✅ Own your data (no external services)
- ✅ W3C Web Annotation compliant
- ✅ Support mixed content (text, images, SVGs)
- ✅ React compatible

---

## Final Four Options

**Your artifact type:** Complex HTML with text, images, charts, tables, SVG/Mermaid diagrams
**Primary requirement:** Strong text annotation with image/SVG region support

**Critical Context:** You already have threading and comment display built. You need the **annotation/selection layer** (selecting text/regions in HTML and associating them with existing comments).

| Tool | Purpose | What You Build | Complexity | Time | Best For |
|------|---------|---|---|---|---|
| **Apache Annotator** | Core selector logic | UI, storage, display, threading | Medium | 2-3 weeks | Mixed content, modern React |
| **Annotator.js** | Complete solution | Minimal—just Convex backend | Low | 1-2 weeks | Text-focused, quick launch |
| **Annotorious** | Image annotation | Unified UI for text+images | Medium | 2-3 weeks | SVG/image-primary projects |
| **Custom React** | Build from scratch | Everything from the ground up | High | 3-4 weeks | Maximum control, no constraints |

---

## Option Details

### 🥇 Apache Annotator
**Core selector logic framework**

What you get:
- Proven algorithms for creating and anchoring selectors
- Handles TextQuoteSelector, SVGSelector, RangeSelector, FragmentSelector
- Works with mixed content (text, images, SVGs)
- Modern JavaScript/TypeScript
- No jQuery dependencies

What you build:
- React UI components
- Comment display/threading
- Storage layer (Convex mutations)
- Integration glue code

**Good for:** You want modern tech stack + full control + mixed content support
**Risk:** More code to write, more to maintain

---

### 🥈 Annotator.js
**Complete annotation application**

What you get:
- Full UI out-of-the-box
- Comment display, threading, user management
- Works with text and DOM
- 10+ years of production use (MIT, Harvard, edX, Hypothes.is with 5M+ annotations)
- W3C compliant
- Battle-tested reliability

What you build:
- Just custom Convex backend integration
- Styling/theming to match your design

**Good for:** You want to move fast, proven reliability, text is primary
**Risk:** jQuery dependency (legacy), less ideal for SVG regions

---

### 🥉 Annotorious
**Complete image/SVG annotation**

What you get:
- Full image annotation UI
- SVG region selection and highlighting
- Works with high-resolution images via IIIF
- React components available
- W3C compliant
- Part of same ecosystem as Annotator.js

What you build:
- Text annotation layer (use Annotator.js or custom)
- Unified comment UI for both text and images
- Convex backend integration

**Good for:** SVG/image regions are primary need, complex diagrams
**Risk:** Opposite problem—text annotation not as strong

---

### Custom React + W3C
**Build from scratch**

What you get:
- Absolute flexibility
- No library constraints
- Modern JavaScript throughout
- Full control of UX/DX

What you build:
- Text selection handler
- SVG/image region selection
- Comment UI and display
- Threading logic
- Convex backend
- Selector anchoring (text relocation)

**Good for:** No constraints fit, you need completely custom behavior
**Risk:** Significant development effort, selector logic is hard to get right

---

## Key W3C Web Annotation Benefits

All four options support W3C standard for future-proofing:

1. **Data Portability** - Annotations can move to other systems
2. **Interoperability** - Different tools can read the same data
3. **Standards Compliance** - Neutral standard maintained by W3C
4. **Industry Adoption** - 40+ cultural heritage institutions (IIIF), MIT, Harvard, etc.

**Data format (JSON-LD):**
```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "anno1",
  "type": "Annotation",
  "created": "2024-01-03T12:30:00Z",
  "creator": { "id": "user1", "name": "Alice" },
  "body": { "type": "TextualBody", "value": "Comment text" },
  "target": {
    "source": "artifact-id",
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "highlighted text",
      "prefix": "before ",
      "suffix": " after"
    }
  },
  "inReplyTo": "anno0" // for threading
}
```

---

## Next Steps

1. **Decision task** - Research and evaluate these 4 options specifically
2. **Prototype spikes** - Test 2-3 approaches with real artifacts
3. **Make decision** - Choose based on tradeoffs
4. **Start implementation** - Create follow-up task

See `research-output.md` for detailed information on:
- W3C Web Annotation standard deep dive
- Each library's features and architecture
- Production examples and use cases
- Implementation guidance
