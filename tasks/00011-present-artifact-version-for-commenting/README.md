# Task 00011: Present Artifact Version for Commenting

**GitHub Issue:** #11

---

## Resume (Start Here)

**Last Updated:** 2025-12-26 (Session 4)

### Current Status: ✅ COMPLETE - ALL SUBTASKS DONE

**Phase:** Full implementation complete - backend and frontend ready.

### What We Did This Session (Session 4)

1. ✅ **Subtask 03 Complete** - Built ArtifactViewer components using TDD
   - Created ArtifactFrame (iframe wrapper with sandbox)
   - Created ArtifactHeader (title, version badge, metadata, read-only banner)
   - Created VersionSwitcher (ShadCN Select dropdown)
   - Created MultiPageNavigation (back/forward for ZIP artifacts)
   - Created ArtifactViewer (main layout component)
   - Created ArtifactViewerPage (data fetching wrapper)
   - All components tested: 14 tests passing
   - Files: `app/src/components/artifact/*.tsx`

2. ✅ **Subtask 04 Complete** - Added Next.js routes
   - Route: `/a/{shareToken}` - Latest version viewer
   - Route: `/a/{shareToken}/v/{version}` - Specific version viewer
   - Files: `app/src/app/a/[shareToken]/page.tsx` and nested v/[version]/page.tsx

3. ✅ **Subtask 05 Complete** - Version switching and multi-page navigation
   - Version switcher dropdown with date display
   - URL-based navigation (changes URL on version switch)
   - Multi-page navigation state management (history, forward/back)
   - Read-only banner for old versions

### Previous Sessions

**Session 3:** Backend implementation
- ✅ Subtask 01 - HTTP router for serving artifact files
- ✅ Subtask 02 - Convex queries for artifact/version data
- 12 backend tests passing

### All Subtasks

1. ~~**Subtask 01**~~ - ✅ Complete (HTTP Router)
2. ~~**Subtask 02**~~ - ✅ Complete (Convex Queries)
3. ~~**Subtask 03**~~ - ✅ Complete (ArtifactViewer Components)
4. ~~**Subtask 04**~~ - ✅ Complete (Next.js Routes)
5. ~~**Subtask 05**~~ - ✅ Complete (Version Switching & Navigation)

---

## Scope (THIS TASK)

Design and implement artifact presentation to users. This includes:

1. HTTP router to serve artifact files (HTML, assets from zips)
2. Artifact viewer component (iframe-based display)
3. Version switching/navigation UI
4. Multi-page navigation for zip artifacts with multiple HTML files

## NOT in scope (SEPARATE TASKS)

- Commenting functionality (Task 00012 or later)
- Sharing/permissions beyond basic shareToken access
- Upload functionality (Task 00010)

---

## Architecture Overview

### URL Structure

| URL Pattern | Purpose |
|-------------|---------|
| `/a/{shareToken}` | View latest version of artifact |
| `/a/{shareToken}/v{n}` | View specific version n |
| `{CONVEX_URL}/artifact/{shareToken}/v{n}/{filePath}` | Serve individual files via HTTP proxy |

### Component Hierarchy

```
/a/{shareToken}/page.tsx (Next.js App Router)
  └── ArtifactViewerPage (Server Component - fetches artifact metadata)
        └── ArtifactViewer (Client Component)
              ├── ArtifactHeader
              │     ├── Title + Version Badge
              │     ├── VersionSwitcher (dropdown)
              │     └── Metadata (file size, last modified)
              ├── MultiPageNavigation (for zip artifacts)
              │     ├── Back/Forward buttons
              │     └── URL bar showing current page
              └── ArtifactFrame (iframe wrapper)
                    └── <iframe src="{convex_url}/artifact/{token}/v{n}/{entryPoint}" />
```

### Data Flow

```
1. User visits /a/{shareToken}
2. Next.js page fetches artifact by shareToken
3. Determines latest version (or specific version from URL)
4. Renders ArtifactViewer with version data
5. ArtifactViewer creates iframe pointing to Convex HTTP route
6. Convex HTTP action serves files with proper MIME types
7. Multi-page navigation intercepts internal links
```

---

## Subtask Breakdown

### Subtask 01: HTTP Router for File Serving

**Location:** `app/convex/http.ts`

**Routes to implement:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/artifact/{shareToken}/v{version}/{filePath}` | GET | Serve file from artifact version |

**Implementation details:**

1. Parse `shareToken`, `version`, `filePath` from URL
2. Look up artifact by shareToken using index `by_share_token`
3. Find version by `artifactId` + `versionNumber` using index `by_artifact_version`
4. Handle file type routing:
   - If `fileType === "html"`: Return `htmlContent` directly
   - If `fileType === "zip"`: Look up file in `artifactFiles` by `versionId` + `filePath`
5. Fetch file from Convex storage, return with proper headers

**Files to create/modify:**
- `app/convex/http.ts` - Add artifact serving routes
- `app/convex/artifactServing.ts` - Internal queries for file lookup

**Key patterns from reference (chef router.ts):**
```typescript
http.route({
  path: "/artifact/{shareToken}/v{version}/{filePath}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Parse URL, lookup file, serve with headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  }),
});
```

### Subtask 02: Convex Queries for Artifact Data

**Location:** `app/convex/artifacts.ts` (may already exist from Task 00010)

**Queries needed:**

| Query | Args | Returns | Purpose |
|-------|------|---------|---------|
| `getByShareToken` | `shareToken: string` | `Artifact | null` | Lookup artifact for viewing |
| `getVersions` | `artifactId: Id<"artifacts">` | `ArtifactVersion[]` | List all versions for switcher |
| `getVersion` | `artifactId, versionNumber` | `ArtifactVersion | null` | Get specific version |
| `getLatestVersion` | `artifactId` | `ArtifactVersion | null` | Get latest (highest) version |
| `listHtmlFiles` | `versionId` | `{ filePath, mimeType }[]` | List HTML files for multi-page nav |

**Internal queries (for HTTP actions):**

| Query | Args | Returns | Purpose |
|-------|------|---------|---------|
| `getFileByPath` | `versionId, filePath` | `{ storageId, mimeType } | null` | File lookup for serving |

**Schema validation:** These queries must use existing indexes:
- `artifacts.by_share_token` for token lookup
- `artifactVersions.by_artifact_version` for version lookup
- `artifactFiles.by_version_path` for O(1) file path resolution

### Subtask 03: ArtifactViewer Component

**Location:** `app/src/components/artifact/ArtifactViewer.tsx`

**ShadCN Components Required:**

| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| `Badge` | Version number display | `npx shadcn@latest add badge` |
| `Select` | Version switcher dropdown | `npx shadcn@latest add select` |
| `Skeleton` | Loading states | `npx shadcn@latest add skeleton` |
| `Tooltip` | Navigation hints | `npx shadcn@latest add tooltip` |

**Component Structure:**

```typescript
// app/src/components/artifact/ArtifactViewer.tsx
interface ArtifactViewerProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
  version: {
    _id: Id<"artifactVersions">;
    versionNumber: number;
    fileType: "html" | "zip" | "markdown";
    entryPoint?: string;
    fileSize: number;
    createdAt: number;
  };
  versions: Array<{
    versionNumber: number;
    createdAt: number;
  }>;
  isLatestVersion: boolean;
}

export function ArtifactViewer({ artifact, version, versions, isLatestVersion }: ArtifactViewerProps) {
  // State for multi-page navigation
  const [currentPage, setCurrentPage] = useState(version.entryPoint || "index.html");
  const [history, setHistory] = useState<string[]>([]);
  const [forwardHistory, setForwardHistory] = useState<string[]>([]);

  // Build iframe URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace("https://", "https://");
  const iframeSrc = `${convexSiteUrl}/artifact/${artifact.shareToken}/v${version.versionNumber}/${currentPage}`;

  return (
    <div className="flex flex-col h-screen">
      <ArtifactHeader ... />
      {version.fileType === "zip" && <MultiPageNavigation ... />}
      <ArtifactFrame src={iframeSrc} />
    </div>
  );
}
```

**Sub-components:**

1. **ArtifactHeader** (`app/src/components/artifact/ArtifactHeader.tsx`)
   - Title display
   - Version badge (purple: `bg-purple-100 text-purple-800`)
   - Version switcher dropdown
   - Metadata (file size, last modified)
   - Read-only banner for old versions

2. **MultiPageNavigation** (`app/src/components/artifact/MultiPageNavigation.tsx`)
   - Back/forward buttons with history
   - URL bar showing current page path
   - Page selector dropdown for multi-HTML zips
   - Link interception for in-iframe navigation

3. **ArtifactFrame** (`app/src/components/artifact/ArtifactFrame.tsx`)
   - Sandboxed iframe (`sandbox="allow-scripts allow-same-origin"`)
   - Loading skeleton during initial load
   - Error boundary for failed loads

### Subtask 04: Next.js Routes

**Location:** `app/src/app/a/[shareToken]/page.tsx`

**Routes to create:**

| File | Route | Purpose |
|------|-------|---------|
| `a/[shareToken]/page.tsx` | `/a/{shareToken}` | Latest version viewer |
| `a/[shareToken]/v/[version]/page.tsx` | `/a/{shareToken}/v/{n}` | Specific version viewer |

**Implementation pattern (following ADR 0008):**

```typescript
// app/src/app/a/[shareToken]/page.tsx
import { ArtifactViewerPage } from "@/components/artifact/ArtifactViewerPage";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function Page({ params }: Props) {
  const { shareToken } = await params;
  return <ArtifactViewerPage shareToken={shareToken} />;
}
```

**Client wrapper component:**

```typescript
// app/src/components/artifact/ArtifactViewerPage.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArtifactViewer } from "./ArtifactViewer";

export function ArtifactViewerPage({ shareToken, versionNumber }: Props) {
  const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });
  const latestVersion = useQuery(
    api.artifacts.getLatestVersion,
    artifact ? { artifactId: artifact._id } : "skip"
  );
  // ... loading states, error handling, version resolution
  return <ArtifactViewer artifact={artifact} version={version} ... />;
}
```

### Subtask 05: Version Switching and Multi-Page Navigation

**Version Switching:**

1. Use ShadCN `Select` component for version dropdown
2. On version change, update URL to `/a/{shareToken}/v/{newVersion}`
3. Use Next.js `useRouter` for client-side navigation
4. Preserve any current page path when switching versions (if same file exists)

**Multi-Page Navigation (for ZIP artifacts):**

1. Fetch list of HTML files using `listHtmlFiles` query
2. Track navigation history in component state
3. Intercept link clicks in iframe using `postMessage` or iframe content access
4. Back/forward buttons navigate through history stack

**Link interception strategy:**

```typescript
// Option A: postMessage from injected script (more complex, cross-origin safe)
// Option B: Access iframe.contentWindow.document (same-origin only)

// Since Convex HTTP actions serve from same domain, Option B works:
useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe) return;

  const handleLoad = () => {
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && !href.startsWith("http")) {
          e.preventDefault();
          navigateToPage(href);
        }
      });
    });
  };

  iframe.addEventListener("load", handleLoad);
  return () => iframe.removeEventListener("load", handleLoad);
}, []);
```

---

## API Design

### Queries

```typescript
// convex/artifacts.ts

// Public: Get artifact by share token (for viewing)
export const getByShareToken = query({
  args: { shareToken: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("artifacts"),
      title: v.string(),
      description: v.optional(v.string()),
      shareToken: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .unique();

    if (!artifact) return null;

    return {
      _id: artifact._id,
      title: artifact.title,
      description: artifact.description,
      shareToken: artifact.shareToken,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    };
  },
});

// Public: Get all versions for version switcher
export const getVersions = query({
  args: { artifactId: v.id("artifacts") },
  returns: v.array(v.object({
    _id: v.id("artifactVersions"),
    versionNumber: v.number(),
    fileType: v.union(v.literal("zip"), v.literal("html"), v.literal("markdown")),
    fileSize: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifactVersions")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", args.artifactId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();
  },
});

// Internal: Get file for HTTP serving
export const getFileByPath = internalQuery({
  args: {
    versionId: v.id("artifactVersions"),
    filePath: v.string(),
  },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      mimeType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("artifactFiles")
      .withIndex("by_version_path", (q) =>
        q.eq("versionId", args.versionId).eq("filePath", args.filePath)
      )
      .unique();

    if (!file || file.isDeleted) return null;

    return {
      storageId: file.storageId,
      mimeType: file.mimeType,
    };
  },
});
```

### HTTP Actions

```typescript
// convex/http.ts additions

http.route({
  path: "/artifact/{shareToken}/v{version}/{filePath}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // 1. Parse URL
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const shareToken = segments[2];
    const versionStr = segments[3]; // "v1", "v2", etc.
    const filePath = segments.slice(4).join("/") || "index.html";

    // 2. Validate version format
    const versionMatch = versionStr.match(/^v(\d+)$/);
    if (!versionMatch) {
      return new Response("Invalid version format", { status: 400 });
    }
    const versionNumber = parseInt(versionMatch[1]);

    // 3. Look up artifact
    const artifact = await ctx.runQuery(internal.artifacts.getByShareTokenInternal, {
      shareToken
    });
    if (!artifact) {
      return new Response("Artifact not found", { status: 404 });
    }

    // 4. Look up version
    const version = await ctx.runQuery(internal.artifacts.getVersionByNumber, {
      artifactId: artifact._id,
      versionNumber,
    });
    if (!version) {
      return new Response("Version not found", { status: 404 });
    }

    // 5. Handle by file type
    if (version.fileType === "html" && version.htmlContent) {
      // Inline HTML - serve directly
      return new Response(version.htmlContent, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    if (version.fileType === "zip") {
      // Look up file in artifactFiles
      const file = await ctx.runQuery(internal.artifacts.getFileByPath, {
        versionId: version._id,
        filePath: decodeURIComponent(filePath),
      });

      if (!file) {
        return new Response("File not found", { status: 404 });
      }

      // Fetch from storage
      const fileUrl = await ctx.storage.getUrl(file.storageId);
      if (!fileUrl) {
        return new Response("File not accessible", { status: 500 });
      }

      const fileResponse = await fetch(fileUrl);
      const fileBuffer = await fileResponse.arrayBuffer();

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mimeType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    return new Response("Unsupported file type", { status: 400 });
  }),
});
```

---

## Component Design

### ShadCN Components to Install

```bash
cd app
npx shadcn@latest add badge
npx shadcn@latest add select
npx shadcn@latest add skeleton
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
```

### Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| `ArtifactViewerPage` | `src/components/artifact/ArtifactViewerPage.tsx` | Client wrapper with data fetching |
| `ArtifactViewer` | `src/components/artifact/ArtifactViewer.tsx` | Main viewer layout |
| `ArtifactHeader` | `src/components/artifact/ArtifactHeader.tsx` | Title, version, metadata |
| `VersionSwitcher` | `src/components/artifact/VersionSwitcher.tsx` | Version dropdown |
| `MultiPageNavigation` | `src/components/artifact/MultiPageNavigation.tsx` | Back/forward, URL bar |
| `ArtifactFrame` | `src/components/artifact/ArtifactFrame.tsx` | Sandboxed iframe |

### Design Tokens (from Figma DESIGN_SYSTEM.md)

| Element | Tailwind Classes |
|---------|------------------|
| Version badge | `px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded` |
| Card container | `bg-white border border-gray-200 rounded-xl p-8 shadow-sm` |
| Primary button | `bg-blue-600 hover:bg-blue-700 text-white` |
| Secondary text | `text-gray-600` |
| Locked version banner | `bg-yellow-50 border-b border-yellow-200 p-4` |

---

## File Structure

After implementation:

```
app/
├── convex/
│   ├── http.ts                    # Add artifact serving routes
│   ├── artifacts.ts               # Queries for artifact data (may exist)
│   └── artifactServing.ts         # Internal queries for HTTP serving
├── src/
│   ├── app/
│   │   └── a/
│   │       └── [shareToken]/
│   │           ├── page.tsx       # /a/{shareToken} route
│   │           └── v/
│   │               └── [version]/
│   │                   └── page.tsx  # /a/{shareToken}/v/{n} route
│   └── components/
│       └── artifact/
│           ├── index.ts           # Barrel export
│           ├── ArtifactViewerPage.tsx
│           ├── ArtifactViewer.tsx
│           ├── ArtifactHeader.tsx
│           ├── VersionSwitcher.tsx
│           ├── MultiPageNavigation.tsx
│           └── ArtifactFrame.tsx
```

---

## Testing Strategy

### Unit Tests

| Test | File | Purpose |
|------|------|---------|
| HTTP route parsing | `convex/__tests__/http.test.ts` | Verify URL parsing |
| Query behavior | `convex/__tests__/artifacts.test.ts` | Verify query logic |

### Integration Tests

| Test | Purpose |
|------|---------|
| Serve HTML artifact | Upload HTML, verify serving via HTTP route |
| Serve ZIP artifact | Upload ZIP, verify all files served correctly |
| Version switching | Navigate between versions, verify content changes |
| Multi-page nav | Click links in ZIP artifact, verify navigation |

### Manual Validation

1. Upload single HTML file, verify it displays at `/a/{token}`
2. Upload ZIP with multiple pages, verify navigation works
3. Switch between versions, verify content updates
4. Verify old versions show read-only banner

---

## Dependencies

### Blocked By

- Task 00010 (Artifact Upload) - Need artifacts in database to display
  - **Workaround:** Can create test data directly in Convex dashboard for development

### Enables

- Task 00012+ (Commenting) - Commenting needs a working viewer

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Cross-origin iframe access blocked | Convex HTTP routes serve from same domain |
| Large files slow to load | Add loading skeleton, consider lazy loading |
| Link interception misses some links | Test with various HTML patterns, add fallback |
| Version switching loses navigation state | Consider persisting current page across versions |

---

## Implementation Order

1. **Subtask 01** (HTTP Router) - Foundation for serving files
2. **Subtask 02** (Convex Queries) - Data access layer
3. **Subtask 03** (ArtifactViewer) - Core UI component
4. **Subtask 04** (Next.js Routes) - URL structure
5. **Subtask 05** (Version/Navigation) - Enhanced UX

Each subtask should be implementable independently with stub data, then integrated.

---

## Acceptance Criteria

- [ ] `/a/{shareToken}` displays latest version of artifact
- [ ] `/a/{shareToken}/v{n}` displays specific version n
- [ ] HTML artifacts render correctly in iframe
- [ ] ZIP artifacts serve all files with correct MIME types
- [ ] Version switcher shows all versions and navigates correctly
- [ ] Old versions show read-only indicator
- [ ] Multi-page ZIP artifacts allow navigation between pages
- [ ] Back/forward navigation works for multi-page artifacts
- [ ] Loading states show skeleton during data fetch
- [ ] 404 page for invalid shareTokens or versions
