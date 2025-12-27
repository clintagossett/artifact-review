# Subtask 05: Dashboard & List View

**Parent Task:** 00010 - Artifact Upload & Creation
**Status:** Ready for Implementation (after Subtask 04)
**Priority:** High
**Owner:** TDD Developer Agent

---

## Overview

Implement the **dashboard view** - displaying and managing artifacts. This covers the header, artifact cards, list view, empty states, and share functionality.

**Core User Story:**
"As a user, I want to see all my artifacts in one place so I can quickly access and share them."

---

## Components to Implement

### 1. **DashboardHeader**
**File:** `app/src/components/artifacts/DashboardHeader.tsx`

**Purpose:** Top navigation with branding, actions, and user menu

**Props:**
```typescript
interface DashboardHeaderProps {
  onUploadClick: () => void;
  onInviteClick?: () => void;
}
```

**Layout:**
```
[Logo + "Artifact Review"] ---- [Invite Team] [Upload] [User Menu]
```

**Features:**
- Logo: 40x40 gradient square with FileText icon
- Brand text: "Artifact Review" (font-semibold)
- "Invite Team" button (outline, with Users icon) - Optional for MVP
- "Upload" button (purple, bg-purple-600)
- User dropdown menu:
  - User name
  - Email
  - Divider
  - Settings
  - Sign out

**Responsive:**
- Desktop: All items visible
- Tablet: Hide "Invite Team"
- Mobile: Show only Upload + User menu

**Visual Reference:** `03-frontend-design-analysis/screenshots/landing_page_logged_in.png`

**Tests:**
- Render all elements
- Upload button click
- User menu open/close
- Sign out action
- Responsive behavior

---

### 2. **ArtifactCard**
**File:** `app/src/components/artifacts/ArtifactCard.tsx`

**Purpose:** Display individual artifact with metadata, versions, and members

**Props:**
```typescript
interface ArtifactCardProps {
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    description?: string;
    shareToken: string;
    createdAt: number;
    updatedAt: number;
  };
  versions: Array<{
    versionNumber: number;
    fileType: "html" | "markdown" | "zip";
  }>;
  fileCount?: number; // For ZIP artifacts
  memberCount?: number; // Future: team members
  onClick: () => void;
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│ [FolderIcon] Title                   │
│ Description text...                  │
│                                      │
│ [v1] [v2] [v3] ...                  │
│                                      │
│ [FileIcon] 3  [UsersIcon] 2         │
│                                      │
│ [Avatar] [Avatar] [Avatar]  2h ago  │
└──────────────────────────────────────┘
```

**Features:**
- FolderOpen icon (text-purple-600)
- Title (font-semibold)
- Description (text-gray-600, truncate after 2 lines)
- Version badges (purple: bg-purple-100 text-purple-700)
- File count icon (only for ZIP)
- Member count icon (static for MVP, show 0)
- Avatar group (stacked, -space-x-2, max 3 visible + "+N")
- Timestamp (relative: "2 hours ago", "1 day ago")
- Hover: shadow-lg, cursor-pointer
- Click: Navigate to artifact viewer

**Visual Reference:** `03-frontend-design-analysis/screenshots/landing_page_logged_in.png`

**Tests:**
- Render all metadata
- Display version badges
- Truncate long descriptions
- Format timestamp correctly
- Hover state
- Click navigation
- Handle missing description

---

### 3. **ArtifactList**
**File:** `app/src/components/artifacts/ArtifactList.tsx`

**Purpose:** Grid layout of artifact cards with section header

**Props:**
```typescript
interface ArtifactListProps {
  artifacts: Artifact[];
  onArtifactClick: (id: Id<"artifacts">) => void;
  onNewArtifact: () => void;
}
```

**Layout:**
```
Your Artifacts                    [+ New Artifact]

┌─────────┐  ┌─────────┐  ┌─────────┐
│ Card 1  │  │ Card 2  │  │ Card 3  │
└─────────┘  └─────────┘  └─────────┘

┌─────────┐  ┌─────────┐
│ Card 4  │  │ Card 5  │
└─────────┘  └─────────┘
```

**Features:**
- Section header: "Your Artifacts" (font-semibold, text-xl)
- "+ New Artifact" button (text-purple-600, hover:text-purple-700)
- Grid: 3 columns (desktop), 2 (tablet), 1 (mobile)
- Gap: 24px (gap-6)
- Cards sorted by updatedAt (newest first)

**Responsive:**
```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

**Tests:**
- Render grid layout
- Display all cards
- Sort by updatedAt
- New artifact button click
- Responsive grid columns

---

### 4. **EmptyState**
**File:** `app/src/components/artifacts/EmptyState.tsx`

**Purpose:** Show when user has no artifacts

**Props:**
```typescript
interface EmptyStateProps {
  onCreateFirst: () => void;
}
```

**Layout:**
```
        ┌─────────────┐
        │  [Icon]     │
        └─────────────┘

    Create your first artifact

    Upload HTML, Markdown, or ZIP files
    to start reviewing with your team.

        [Create Artifact]
```

**Features:**
- Large upload icon (64x64, text-purple-600)
- Heading: "Create your first artifact" (text-2xl, font-semibold)
- Subtitle: Multi-line description (text-gray-600)
- CTA button: "Create Artifact" (purple, bg-purple-600)
- Center aligned
- Generous padding (p-12)

**Visual Reference:** Not in Figma - custom design

**Tests:**
- Render empty state
- Click CTA button
- Proper text alignment

---

### 5. **ShareModal**
**File:** `app/src/components/artifacts/ShareModal.tsx`

**Purpose:** Share artifact and manage permissions

**Props:**
```typescript
interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
}
```

**Layout:**
```
Share "Artifact Title"

Share Link
┌────────────────────────────────────┐
│ [Link] https://...com/a/abc12345   │
│                           [Copy ✓] │
└────────────────────────────────────┘

[i] Anyone with this link can view this artifact.

Permissions (future):
- Email invite section
- User list with role management
```

**Features:**
- Title: "Share \"{artifact.title}\""
- Share link input (read-only, full URL)
- Link icon prefix
- Copy button:
  - Default: "Copy"
  - Copied: Checkmark icon + "Copied" (2s timeout)
- Info box: Blue bg-blue-50, text explaining link access
- Footer: Close button

**Share Link Format:**
```typescript
const shareUrl = `${window.location.origin}/a/${artifact.shareToken}`;
```

**Copy to Clipboard:**
```typescript
await navigator.clipboard.writeText(shareUrl);
```

**Visual Reference:** `figma-designs/src/app/components/ShareModal.tsx`

**Tests:**
- Display share link
- Copy to clipboard
- Show "Copied" state
- Reset after 2 seconds
- Close modal

---

### 6. **AvatarGroup** (Helper Component)
**File:** `app/src/components/ui/avatar-group.tsx`

**Purpose:** Display stacked avatars with overflow count

**Props:**
```typescript
interface AvatarGroupProps {
  users: Array<{
    name?: string;
    image?: string;
  }>;
  max?: number; // Default: 3
  size?: "sm" | "md" | "lg"; // Default: "md"
}
```

**Features:**
- Stack avatars with -space-x-2
- Show first N avatars
- Show "+X" for overflow
- Gradient fallback for avatars without images
- Size variants: sm (24px), md (32px), lg (40px)

**Tests:**
- Display avatars
- Show overflow count
- Use gradient fallback
- Respect max prop

---

### 7. **Dashboard Page**
**File:** `app/src/app/dashboard/page.tsx`

**Purpose:** Main dashboard page composing all components

**Layout:**
```
┌────────────────────────────────────────┐
│ DashboardHeader                        │
├────────────────────────────────────────┤
│                                        │
│ [Search bar] (optional for MVP)        │
│                                        │
│ UploadDropzone                         │
│                                        │
│ ArtifactList OR EmptyState             │
│                                        │
│ RecentActivity (optional for MVP)      │
│                                        │
└────────────────────────────────────────┘
```

**Features:**
- Fetch artifacts: `useQuery(api.artifacts.list)`
- Show EmptyState if no artifacts
- Show ArtifactList if artifacts exist
- Include UploadDropzone at top
- SearchInput (optional, can defer to later)
- RecentActivity feed (optional, can defer)

**State Management:**
```typescript
const artifacts = useQuery(api.artifacts.list);
const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
const [isShareModalOpen, setIsShareModalOpen] = useState(false);
const [selectedArtifact, setSelectedArtifact] = useState<Id<"artifacts"> | null>(null);
```

**Tests:**
- Fetch and display artifacts
- Show empty state correctly
- Open upload dialog
- Open share modal
- Navigate to artifact

---

## Backend Integration

### Queries to Use

```typescript
// List user's artifacts
const artifacts = useQuery(api.artifacts.list);

// Get artifact details
const artifact = useQuery(api.artifacts.get, { id });

// Get artifact by share token (public)
const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });

// Get versions for artifact
const versions = useQuery(api.artifacts.getVersionsByArtifact, { artifactId });
// Note: This query may need to be added to backend
```

---

## User Flows

### Flow 1: First Time User (Empty State)
```
1. User logs in for first time
2. Dashboard shows EmptyState component
3. Large "Create Artifact" CTA visible
4. User clicks CTA
5. NewArtifactDialog opens
6. User uploads file
7. Success: EmptyState replaced with ArtifactList
```

### Flow 2: View Existing Artifacts
```
1. User navigates to dashboard
2. ArtifactList loads with cards
3. Cards show: title, description, versions, timestamp
4. User clicks card
5. Navigate to artifact viewer: /a/{shareToken}
```

### Flow 3: Share Artifact
```
1. User clicks "Share" on artifact card (future)
2. ShareModal opens
3. Share link displays
4. User clicks "Copy"
5. Link copied to clipboard
6. Button shows "Copied ✓"
7. Toast: "Link copied to clipboard"
```

---

## Design Tokens

### Layout
```typescript
// Dashboard container
maxWidth: 'max-w-7xl'
padding: 'px-4 sm:px-6 lg:px-8'
margin: 'mx-auto'

// Section spacing
gap: 'space-y-8'
```

### Grid
```typescript
// Artifact grid
grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
gap: 'gap-6'
```

### Cards
```typescript
// Card styling
background: 'bg-white'
border: 'border border-gray-200'
borderRadius: 'rounded-xl'
padding: 'p-6'
shadow: 'shadow-sm hover:shadow-lg'
transition: 'transition-shadow duration-200'
```

---

## Accessibility

- **Header:**
  - Semantic `<header>` element
  - Skip to main content link
  - Keyboard navigation

- **Cards:**
  - `<article>` semantic elements
  - Descriptive aria-labels
  - Keyboard accessible (focusable, Enter to open)

- **Share modal:**
  - Focus trap
  - Announce "Copied" state
  - Close on Escape

- **Empty state:**
  - Semantic heading hierarchy
  - Clear CTA button

---

## Testing Strategy

### Unit Tests
- Individual component rendering
- Props handling
- Event handlers
- State management

### Integration Tests
- Dashboard data fetching
- Empty state toggle
- Share flow
- Navigation

### Component Tests Location
`tasks/00010-artifact-upload-creation/tests/frontend/dashboard/`

Files:
- `DashboardHeader.test.tsx`
- `ArtifactCard.test.tsx`
- `ArtifactList.test.tsx`
- `EmptyState.test.tsx`
- `ShareModal.test.tsx`
- `AvatarGroup.test.tsx`
- `Dashboard.test.tsx`

---

## Success Criteria

- [ ] Dashboard displays user's artifacts
- [ ] Empty state shows for new users
- [ ] Artifact cards match Figma design
- [ ] Cards show correct metadata
- [ ] Version badges display correctly
- [ ] Timestamps format correctly (relative)
- [ ] Grid is responsive (3/2/1 columns)
- [ ] Share link copies to clipboard
- [ ] "Copied" state shows and resets
- [ ] Navigate to artifact on card click
- [ ] All components match Figma designs
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Accessibility requirements met

---

## Deliverables

1. **Components:**
   - `DashboardHeader.tsx`
   - `ArtifactCard.tsx`
   - `ArtifactList.tsx`
   - `EmptyState.tsx`
   - `ShareModal.tsx`
   - `AvatarGroup.tsx`
   - `dashboard/page.tsx`

2. **Tests:**
   - Unit tests for all components
   - Integration tests for dashboard
   - All tests passing

3. **Documentation:**
   - Component usage examples
   - Props documentation (TSDoc comments)

4. **Validation:**
   - Screen recording of dashboard flows
   - Screenshots matching Figma

---

## Dependencies

**Requires Subtask 04 to be complete:**
- Needs working upload flow to create test artifacts
- Uses same backend queries
- Shares design tokens and patterns

---

## References

- **Design Analysis:** `03-frontend-design-analysis/README.md`
- **Screenshots:** `03-frontend-design-analysis/screenshots/`
- **Backend API:** `app/convex/artifacts.ts`
- **Subtask 04:** Upload flow components
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **Testing Guide:** `docs/development/testing-guide.md`

---

**Ready for TDD Developer Agent (after Subtask 04)**
