# Markdown Rendering Library Comparison Report

**Date:** January 2026
**Purpose:** Evaluate React-compatible markdown rendering libraries for Artifact Review platform
**Critical Requirement:** Mermaid diagram support

---

## Table of Contents

1. [Complete Feature Checklist](#complete-feature-checklist)
2. [Library Overview](#library-overview)
3. [Library Comparison Table](#library-comparison-table)
4. [Mermaid Support Deep-Dive](#mermaid-support-deep-dive)
5. [Syntax Highlighting Options](#syntax-highlighting-options)
6. [Bundle Size Analysis](#bundle-size-analysis)
7. [Final Recommendation](#final-recommendation)

---

## Complete Feature Checklist

Based on research into technical documentation and review tools, the following features should be supported:

### Essential Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Mermaid Diagrams** | Flowcharts, sequence diagrams, class diagrams, etc. | CRITICAL |
| **Tables** | GFM-style tables with alignment | HIGH |
| **Code Blocks** | Fenced code blocks with syntax highlighting | HIGH |
| **Task Lists** | Checkboxes `[ ]` and `[x]` | HIGH |
| **Strikethrough** | `~~deleted text~~` | MEDIUM |
| **Autolink Literals** | Auto-linking URLs and emails | MEDIUM |

### Important Features (Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Footnotes** | `[^1]` reference-style footnotes | MEDIUM |
| **Math/LaTeX** | Inline `$...$` and display `$$...$$` equations | MEDIUM |
| **Heading Anchors** | Auto-generated anchor links for navigation | MEDIUM |
| **Image Handling** | Responsive images, lazy loading, error handling | MEDIUM |
| **Emoji Support** | `:emoji_name:` shortcodes | LOW |

### Nice-to-Have Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Admonitions/Callouts** | Note, warning, tip blocks | LOW |
| **Definition Lists** | Term/definition pairs | LOW |
| **Abbreviations** | `*[HTML]: Hyper Text Markup Language` | LOW |
| **Frontmatter Parsing** | YAML metadata extraction | LOW |
| **Subscript/Superscript** | `~sub~` and `^super^` | LOW |
| **Custom Containers** | Extensible block types | LOW |

---

## Library Overview

### 1. react-markdown (remarkjs)

**Repository:** [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown)
**Latest Version:** 10.1.0
**License:** MIT

**Overview:**
The most popular React-native markdown rendering solution. Built on the unified/remark/rehype ecosystem, it converts markdown to React components without using `dangerouslySetInnerHTML`, making it secure by default.

**Strengths:**
- Native React component output (no innerHTML)
- Extensive plugin ecosystem (remark/rehype)
- Strong security by default
- Active maintenance
- ESM-first, modern architecture
- CommonMark compliant with GFM support via plugin

**Weaknesses:**
- Larger bundle size (~43KB minified+gzipped)
- Plugin additions can significantly increase bundle
- Full re-parse on every render

---

### 2. marked + marked-react

**Repository:** [github.com/markedjs/marked](https://github.com/markedjs/marked)
**Latest Version:** 17.0.1
**GitHub Stars:** ~36,300
**License:** MIT

**Overview:**
Marked is a low-level, high-performance markdown parser. The `marked-react` package provides React integration by rendering output as React components.

**Strengths:**
- Very fast parsing
- Long history, mature project
- Lightweight core
- GFM support built-in
- Simple API

**Weaknesses:**
- Plugin ecosystem not as rich as remark
- React integration is secondary (via wrapper)
- TypeScript migration increased bundle size
- Mermaid support requires custom implementation

---

### 3. markdown-it + React Wrapper

**Repository:** [github.com/markdown-it/markdown-it](https://github.com/markdown-it/markdown-it)
**Latest Version:** 14.1.0
**GitHub Stars:** ~20,000
**License:** MIT

**Overview:**
A pluggable markdown parser with extensive customization options. Popular in Vue ecosystem, requires wrapper for React integration.

**Strengths:**
- Highly extensible plugin architecture
- Good performance
- CommonMark compliant
- Many community plugins

**Weaknesses:**
- React integration not native (requires wrapper)
- Plugins are always included even if disabled
- Larger than marked (~4x minified+gzipped)
- Mermaid plugins are fragmented (multiple competing options)

---

### 4. MDX (@mdx-js/mdx + @mdx-js/react)

**Repository:** [github.com/mdx-js/mdx](https://github.com/mdx-js/mdx)
**Documentation:** [mdxjs.com](https://mdxjs.com/)
**License:** MIT

**Overview:**
MDX allows embedding React components directly within markdown. It's a superset of markdown, ideal for documentation sites and blogs where interactive components are needed.

**Strengths:**
- Embed React components in markdown
- First-class Next.js support via `@next/mdx`
- Full remark/rehype plugin compatibility
- Compile-time optimization possible
- Perfect for documentation with interactive examples

**Weaknesses:**
- Cannot dynamically import components per-file (all must be bundled)
- Heavier learning curve
- Overkill for simple markdown rendering
- Build-time compilation required for optimal performance

---

### 5. @uiw/react-markdown-preview

**Repository:** [github.com/uiwjs/react-markdown-preview](https://github.com/uiwjs/react-markdown-preview)
**License:** MIT

**Overview:**
A ready-to-use markdown preview component with GitHub styling and built-in Mermaid support.

**Strengths:**
- **Built-in Mermaid support** (no extra config!)
- GitHub-style CSS included
- Syntax highlighting included
- Minimal setup required

**Weaknesses:**
- Less customizable than building from primitives
- Larger bundle (includes all features)
- Less community adoption than react-markdown

---

## Library Comparison Table

| Feature | react-markdown | marked-react | markdown-it | MDX | @uiw/react-markdown-preview |
|---------|---------------|--------------|-------------|-----|----------------------------|
| **Mermaid Support** | Plugin (rehype-mermaid) | Custom | Plugin (fragmented) | Plugin | **Built-in** |
| **Tables** | remark-gfm | Built-in | Plugin | remark-gfm | Built-in |
| **Task Lists** | remark-gfm | Built-in | Plugin | remark-gfm | Built-in |
| **Code Highlighting** | Plugin | Plugin | Plugin | Plugin | Built-in |
| **Math/LaTeX** | remark-math + rehype-katex | Plugin | Plugin | remark-math + rehype-katex | Plugin |
| **Footnotes** | remark-gfm | Plugin | Plugin | remark-gfm | Built-in |
| **Strikethrough** | remark-gfm | Built-in | Plugin | remark-gfm | Built-in |
| **Bundle Size (base)** | ~43KB | ~38KB* | ~100KB+ | ~45KB | ~150KB+ |
| **GitHub Stars** | ~15K | ~36K | ~20K | ~17K | ~3K |
| **Last Updated** | Active | Active | Active | Active | Active |
| **React Native** | Yes | Via wrapper | Via wrapper | Yes | Yes |
| **Security** | Excellent (default safe) | Requires sanitization | Requires sanitization | Good | Good |
| **Next.js SSR** | Excellent | Good | Good | Excellent | Good |
| **Plugin Ecosystem** | Excellent (unified) | Limited | Good | Excellent (unified) | Limited |

*Bundle sizes are approximate and vary based on configuration

---

## Mermaid Support Deep-Dive

### Critical Analysis

Mermaid diagram support is the **highest priority requirement**. Here's how each library handles it:

### Option 1: react-markdown + rehype-mermaid (RECOMMENDED)

**Plugin:** [rehype-mermaid](https://github.com/remcohaszing/rehype-mermaid)

```javascript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeMermaid from 'rehype-mermaid';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeMermaid]}
>
  {markdown}
</ReactMarkdown>
```

**Rendering Strategies:**
- `inline-svg` (default) - Renders as inline SVG
- `img-png` - Renders as PNG image
- `img-svg` - Renders as SVG image
- `pre-mermaid` - Keeps as `<pre>` for client-side rendering

**Pros:**
- Official unified ecosystem plugin
- Actively maintained
- Multiple rendering strategies
- Works with MDX
- Can pre-render on server (uses Playwright)

**Cons:**
- Requires Playwright for server-side rendering
- Adds significant bundle size if client-side

**Server vs Client Rendering:**

| Approach | Pros | Cons |
|----------|------|------|
| Server (Playwright) | No client JS, better perf, SEO | Requires Playwright, build complexity |
| Client (mermaid.js) | Simple setup | Large bundle (~2.7MB full), render delay |

---

### Option 2: @uiw/react-markdown-preview (BUILT-IN)

```javascript
import MarkdownPreview from '@uiw/react-markdown-preview';

<MarkdownPreview source={markdown} />
```

**Pros:**
- Zero configuration for Mermaid
- Works out of the box
- GitHub-style rendering included

**Cons:**
- Less control over rendering
- Larger base bundle
- Client-side rendering only

---

### Option 3: markdown-it + markdown-it-mermaid

**Multiple competing plugins:**
- `markdown-it-mermaid` (original)
- `@jsonlee_12138/markdown-it-mermaid`
- `markdown-it-mermaid-plugin`
- `@wekanteam/markdown-it-mermaid`

**Cons:**
- Fragmented ecosystem
- No clear "winner" plugin
- Quality varies

---

### Option 4: MDX + mdx-mermaid

**Plugin:** [mdx-mermaid](https://github.com/sjwall/mdx-mermaid)

```javascript
// mdx-components.jsx
import { Mermaid } from 'mdx-mermaid/Mermaid';

export const components = {
  Mermaid,
};
```

**Pros:**
- Works well with MDX content
- Component-based approach

**Cons:**
- Only works with MDX, not plain markdown
- Requires MDX infrastructure

---

### Mermaid Bundle Size Warning

**Full Mermaid.js:** ~2.7MB (significant increase since v9.4.0)

**Mermaid Tiny:** ~1.3MB (removes mindmap, architecture diagrams, KaTeX)

**Recommendation:** Always lazy-load Mermaid:

```javascript
// Lazy load Mermaid only when needed
const MermaidDiagram = React.lazy(() => import('./MermaidDiagram'));

// In your markdown renderer, detect mermaid code blocks
// and render them with lazy-loaded component
```

---

## Syntax Highlighting Options

### Shiki (RECOMMENDED for quality)

**Pros:**
- VS Code-quality highlighting
- TextMate grammar support
- Beautiful output
- Best TypeScript support

**Cons:**
- ~250KB + WASM dependency
- Best for server-side rendering

### Prism.js (via react-syntax-highlighter)

**Pros:**
- Smaller bundle
- Fast client-side
- Mature, widely used

**Cons:**
- PrismJS development stalled (v2 abandoned)
- TypeScript highlighting lacking
- Less accurate than Shiki

### Recommendation

- **SSR/SSG:** Use **Shiki** for superior highlighting quality
- **Client-heavy:** Use **Prism.js** for smaller bundle

---

## Bundle Size Analysis

### Base Library Sizes (minified + gzipped)

| Library | Base Size | With GFM | With Mermaid (client) |
|---------|-----------|----------|----------------------|
| react-markdown | ~43KB | ~60KB | ~2.8MB+ |
| marked-react | ~38KB | ~38KB | ~2.7MB+ |
| markdown-it | ~100KB | ~110KB | ~2.8MB+ |
| MDX | ~45KB | ~60KB | ~2.8MB+ |
| @uiw/react-markdown-preview | ~150KB | Included | Included |

**Note:** Mermaid adds ~2.7MB regardless of which markdown library you use.

### Optimization Strategies

1. **Lazy load Mermaid** - Only load when diagram detected
2. **Server-side render diagrams** - Eliminate client Mermaid entirely
3. **Use Mermaid Tiny** - If mindmaps not needed
4. **Code split** - Separate chunks for heavy features

---

## Final Recommendation

### Primary Recommendation: react-markdown + unified ecosystem

**For Artifact Review, I recommend:**

```
react-markdown + remark-gfm + rehype-mermaid + rehype-highlight (or shiki)
```

**Rationale:**

1. **Mermaid Support:** `rehype-mermaid` is the best-maintained, most flexible Mermaid plugin
   - Supports multiple rendering strategies
   - Can pre-render on server for zero client JS
   - Works with standard markdown code blocks

2. **Feature Coverage:** `remark-gfm` provides all GFM features in one plugin:
   - Tables
   - Task lists
   - Strikethrough
   - Footnotes
   - Autolink literals

3. **Ecosystem:** Unified/remark/rehype has the largest, most active plugin ecosystem

4. **Security:** No `dangerouslySetInnerHTML` - secure by default

5. **Next.js Integration:** Excellent SSR support, widely used in Next.js projects

6. **Bundle Optimization:**
   - Base react-markdown is reasonable (~43KB)
   - Mermaid can be lazy-loaded
   - Server-side Mermaid rendering eliminates client bundle

### Implementation Plan

```javascript
// dependencies
// npm install react-markdown remark-gfm rehype-mermaid rehype-highlight

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeMermaid from 'rehype-mermaid';
import rehypeHighlight from 'rehype-highlight';

// For math support (optional):
// npm install remark-math rehype-katex
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeMermaid, { strategy: 'inline-svg' }],
        rehypeHighlight,
        rehypeKatex
      ]}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### Alternative: @uiw/react-markdown-preview

If rapid development is prioritized over bundle optimization:

```javascript
import MarkdownPreview from '@uiw/react-markdown-preview';

function MarkdownRenderer({ content }) {
  return <MarkdownPreview source={content} />;
}
```

**Pros:** Zero config, Mermaid works immediately
**Cons:** Larger bundle, less control

---

## Summary Table

| Criteria | Recommendation | Rationale |
|----------|----------------|-----------|
| **Primary Library** | react-markdown | Best React integration, security, ecosystem |
| **GFM Features** | remark-gfm | Single plugin for all GFM extensions |
| **Mermaid** | rehype-mermaid | Flexible strategies, server-side option |
| **Syntax Highlighting** | rehype-highlight or Shiki | Depends on SSR needs |
| **Math/LaTeX** | remark-math + rehype-katex | Standard solution |
| **Bundle Strategy** | Lazy-load Mermaid | Critical for performance |

---

## Sources

- [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
- [marked GitHub](https://github.com/markedjs/marked)
- [markdown-it GitHub](https://github.com/markdown-it/markdown-it)
- [MDX Documentation](https://mdxjs.com/)
- [rehype-mermaid GitHub](https://github.com/remcohaszing/rehype-mermaid)
- [remark-gfm GitHub](https://github.com/remarkjs/remark-gfm)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Strapi React Markdown Guide](https://strapi.io/blog/react-markdown-complete-guide-security-styling)
- [npm-compare: Syntax Highlighters](https://npm-compare.com/highlight.js,prismjs,react-syntax-highlighter,shiki)
- [Bundlephobia](https://bundlephobia.com/)
