# ADR 0006: Frontend Stack

**Status:** Accepted
**Date:** 2024-12-25
**Decision Maker:** Clint Gossett

## TL;DR

Use Next.js 14 App Router with ShadCN UI components ported from Figma Make exports. Figma-generated code provides design system and component patterns; Next.js provides the framework for Convex integration and Vercel deployment.

## Quick Reference

| Item | Value |
|------|-------|
| **Framework** | Next.js 14 (App Router) |
| **UI Components** | ShadCN UI (from Figma export) |
| **Styling** | Tailwind CSS 4.x |
| **State Management** | Convex hooks (useQuery, useMutation) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Design Reference** | `figma-designs/` submodule (read-only) |

## Decision Drivers (Priority Order)

1. **Convex integration** - First-class Next.js support via `ConvexNextjsProvider`
2. **Vercel deployment alignment** - ADR 0003 assumes Next.js
3. **Design fidelity** - Preserve Figma Make components and design tokens
4. **Real-time architecture** - Convex reactive queries replace local state
5. **SSR capability** - Better SEO for landing page, faster initial load

## Related Decisions

- [ADR 0003: Deployment & Hosting](./0003-deployment-hosting-strategy.md) - Vercel + Next.js assumed
- [ADR 0001: Authentication](./0001-authentication-provider.md) - Convex Auth integration
- [ADR 0002: HTML Storage](./0002-html-artifact-storage.md) - Convex file storage

## Context

### Figma Make Export Analysis

The `figma-designs/` submodule contains Figma Make exports with:

**Existing Stack:**
- React 18 + TypeScript
- Vite (SPA bundler)
- Tailwind CSS 4.1
- ShadCN UI components (manually copied)
- Radix UI primitives (20+ packages)
- Lucide React icons
- Framer Motion animations

**What Works Well:**
- Complete design system documentation (`DESIGN_SYSTEM.md`)
- 40+ ShadCN components already styled
- Consistent color palette (blue primary, purple secondary)
- TypeScript interfaces for core data (Comment, Version, Project)
- Component patterns for Dashboard, DocumentViewer, CommentSidebar

**What Needs Change:**
- Vite SPA needs to become Next.js App Router
- Local `useState` needs to become Convex hooks
- Mock data needs real Convex backend
- No routing (state-based switching)
- MUI dependencies conflict with ShadCN (should remove)

### Why Not Keep Vite?

| Aspect | Vite SPA | Next.js |
|--------|----------|---------|
| Vercel optimization | Basic | First-class (edge, ISR, streaming) |
| Convex provider | Client-only | SSR + client hybrid |
| SEO (landing page) | Requires workarounds | Built-in |
| ADR 0003 alignment | Mismatch | Aligned |
| Code splitting | Manual | Automatic per route |

## Decision

### Use Next.js 14 App Router + Port ShadCN Components

**Framework Migration:**
```
Figma Export (Vite SPA) --> Next.js 14 App Router
```

**Component Strategy:**
```
Keep:
- All ShadCN UI components (/ui/*.tsx)
- Design tokens (colors, fonts, spacing)
- Component interfaces (TypeScript types)
- Lucide icons, Framer Motion

Remove:
- @mui/material, @emotion/* (conflict with ShadCN)
- Vite config (replaced by Next.js)
- Local state patterns (replaced by Convex hooks)
```

### Project Structure

The Next.js application lives in the `/app` subdirectory (not at repository root). This "monorepo-lite" structure separates application code from project management artifacts:

```
html-review-poc/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── layout.tsx        # Root layout with ConvexNextjsProvider
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in/page.tsx
│   │   │   │   └── sign-up/page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx    # Protected layout
│   │   │       ├── page.tsx      # Dashboard
│   │   │       └── documents/
│   │   │           └── [id]/page.tsx
│   │   ├── components/
│   │   │   ├── ui/               # ShadCN components
│   │   │   ├── dashboard/        # Feature components
│   │   │   └── viewer/
│   │   └── lib/
│   │       └── utils.ts          # cn() helper
│   ├── convex/                   # Convex backend
│   └── package.json
├── docs/                         # Architecture & documentation
├── tasks/                        # Task tracking
└── figma-designs/                # Design reference (submodule)
```

**Running commands:**
```bash
cd app
npm run dev          # Start Next.js
npx convex dev       # Start Convex
npm test             # Run tests
```

**Why this structure:**
- Clear separation between app code and project artifacts
- Accommodates future multi-package scenarios (CLI, workers, shared libs)
- Documentation and tasks are first-class citizens at repo root
- Vercel supports subdirectory configuration

### State Management Pattern

**Before (Figma export - local state):**
```tsx
const [comments, setComments] = useState<Comment[]>([]);

const handleAddComment = (comment: Comment) => {
  setComments([...comments, comment]);
};
```

**After (Convex hooks - real-time):**
```tsx
const comments = useQuery(api.comments.list, { documentId });
const addComment = useMutation(api.comments.create);

const handleAddComment = async (content: string) => {
  await addComment({ documentId, content });
  // No manual state update - Convex subscription auto-updates
};
```

### Design Token Preservation

Port these from Figma's `theme.css` and Tailwind config:

```css
/* Keep these color definitions */
--primary: #2563EB;      /* Blue - CTAs, links */
--secondary: #7C3AED;    /* Purple - accents, AI-native */
--background: #FFFFFF;
--foreground: #111827;
```

### ShadCN Component Configuration

```json
// components.json (initialize with these settings)
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## Implementation Order

### Phase 0: Foundation (Before Features)

1. Create Next.js 14 project
2. Initialize Convex
3. Set up ShadCN UI
4. Port design tokens from Figma
5. Configure Convex Auth (per ADR 0001)

### Phase 1: Landing + Auth

1. Port `LandingPage.tsx` to `/app/page.tsx`
2. Add sign-in/sign-up routes
3. Create protected dashboard layout

### Phase 2: Dashboard + Upload

1. Port `Dashboard.tsx` components
2. Implement Convex storage upload (per ADR 0002)
3. Wire to real project/version data

### Phase 3: Document Viewer + Comments

1. Port `DocumentViewer.tsx` and `CommentSidebar.tsx`
2. Implement real-time comments via Convex
3. Add presence indicators

## Consequences

### Positive

- **Aligned with ADR 0003** - Vercel + Next.js deployment works as planned
- **Convex-native** - useQuery/useMutation replace prop drilling
- **Design preserved** - ShadCN components port cleanly
- **Real-time out of box** - Convex subscriptions handle collaboration
- **SSR landing page** - Better SEO and performance
- **Type safety** - Convex schema generates TypeScript types

### Negative

- **Migration effort** - Must refactor Vite SPA to Next.js
- **Learning curve** - App Router patterns differ from Pages Router
- **ShadCN reconfiguration** - Need to reinitialize for Next.js RSC
- **Some components need updates** - Client/server component boundaries

### Neutral

- Figma exports remain read-only reference (submodule)
- Component patterns transfer directly, just framework changes
- Design system documentation (`DESIGN_SYSTEM.md`) still applies

## Migration Checklist

- [ ] Create Next.js 14 project with `--app --src-dir --typescript --tailwind`
- [ ] Run `npx convex dev --once` to initialize Convex
- [ ] Run `npx shadcn@latest init` with custom config
- [ ] Copy design tokens from `figma-designs/src/styles/theme.css`
- [ ] Port utility functions (`cn()` helper)
- [ ] Configure `ConvexNextjsProvider` in root layout
- [ ] Set up Convex Auth per ADR 0001
- [ ] Remove MUI dependencies (not needed)
- [ ] Port components in order: ui/ -> pages -> features

## Alternatives Considered

### Alt 1: Keep Vite SPA

**Approach:** Use Figma export as-is, add Convex client

**Rejected because:**
- Misaligned with ADR 0003 (Vercel assumes Next.js)
- No SSR for landing page
- More configuration for production deployment
- Convex provider less integrated

### Alt 2: Remix

**Approach:** Use Remix instead of Next.js

**Considered but not chosen:**
- Less Convex documentation/examples
- Vercel supports but not optimized for Remix
- Smaller ecosystem for ShadCN patterns
- **Verdict:** Valid but more friction

### Alt 3: Rewrite from Scratch

**Approach:** Ignore Figma export, start fresh

**Rejected because:**
- Design system already comprehensive
- 40+ components ready to port
- Figma export represents validated UX
- Would take significantly longer

## References

- [Convex + Next.js Quickstart](https://docs.convex.dev/quickstart/nextjs)
- [ShadCN UI Installation](https://ui.shadcn.com/docs/installation/next)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Figma Make Design System](/figma-designs/DESIGN_SYSTEM.md) (local reference)
- [ADR 0003: Deployment Strategy](./0003-deployment-hosting-strategy.md)
