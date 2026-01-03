# Subtask 04: Artifact List View

**Status:** Pending
**Estimated Effort:** 2-3 hours
**Owner:** TBD
**Prerequisites:** Subtask 02 (Backend) must be complete

## Purpose

Display user's artifacts in dashboard with quick actions and proper states.

## Design References

**Review Figma designs:**
- Check if artifact list is grid or table view
- Card design (thumbnail, title, metadata)
- Quick action buttons (open, copy link, delete)
- Empty state for new users
- Loading skeleton

## Components to Build

### 1. `ArtifactList.tsx`
**Location:** `app/src/components/artifacts/ArtifactList.tsx`

**Purpose:** Container for displaying user's artifacts.

**Props:**
```typescript
interface ArtifactListProps {
  onArtifactClick?: (artifactId: Id<"artifacts">) => void;
}
```

**Features:**
- Fetch user's artifacts using `listUserArtifacts` query
- Display in grid or table (per Figma)
- Sort by most recent first (`updatedAt DESC`)
- Loading state (skeleton cards)
- Empty state (first-time user)
- Error state (network failure)

**Implementation:**
```typescript
const artifacts = useQuery(api.artifacts.listUserArtifacts);

if (artifacts === undefined) {
  return <ArtifactListSkeleton />;
}

if (artifacts.length === 0) {
  return <EmptyState />;
}

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {artifacts.map(artifact => (
      <ArtifactCard key={artifact._id} artifact={artifact} />
    ))}
  </div>
);
```

### 2. `ArtifactCard.tsx`
**Location:** `app/src/components/artifacts/ArtifactCard.tsx`

**Purpose:** Display single artifact with metadata and actions.

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
    status: "draft" | "published";
  };
  onDelete?: (artifactId: Id<"artifacts">) => void;
}
```

**Display Elements:**
- Title (truncate if too long)
- Description (optional, truncate)
- Created date (relative: "2 hours ago", "Yesterday")
- Status badge (Draft/Published)
- Quick actions:
  - "Open" - View artifact
  - "Copy Link" - Copy share URL
  - "Delete" - Remove artifact (with confirmation)

**Figma Alignment:**
- Card border, shadow, padding
- Hover state (if applicable)
- Action button placement (overflow menu vs visible buttons)
- Thumbnail/preview (future: HTML screenshot)

**Implementation:**
```typescript
const shareUrl = `${window.location.origin}/a/${artifact.shareToken}`;

const handleCopyLink = async () => {
  await navigator.clipboard.writeText(shareUrl);
  toast.success('Link copied to clipboard');
};

const handleDelete = async () => {
  if (!confirm('Delete this artifact? This cannot be undone.')) return;

  try {
    await deleteArtifact({ artifactId: artifact._id });
    toast.success('Artifact deleted');
  } catch (error) {
    toast.error('Failed to delete artifact');
  }
};
```

### 3. `EmptyState.tsx`
**Location:** `app/src/components/artifacts/EmptyState.tsx`

**Purpose:** Encourage new users to create their first artifact.

**Design:**
- Illustration or icon
- Heading: "No artifacts yet"
- Subheading: "Upload your first AI-generated HTML artifact"
- CTA button: "Create New Artifact"

**Figma Alignment:**
- Check Figma for empty state design
- Icon choice
- Copy/messaging

### 4. `ArtifactListSkeleton.tsx`
**Location:** `app/src/components/artifacts/ArtifactListSkeleton.tsx`

**Purpose:** Loading state while fetching artifacts.

**Features:**
- Show 3-6 skeleton cards
- Match card layout exactly
- Pulse animation

## Dashboard Integration

**Update:** `app/src/app/dashboard/page.tsx`

### Layout Structure
```typescript
export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Artifacts</h1>
        <Button onClick={handleNewArtifact}>
          <Plus className="mr-2 h-4 w-4" />
          New Artifact
        </Button>
      </div>

      <ArtifactList />
    </div>
  );
}
```

## Quick Actions

### Copy Share Link
```typescript
const handleCopyLink = async (shareToken: string) => {
  const url = `${window.location.origin}/a/${shareToken}`;
  await navigator.clipboard.writeText(url);

  toast.success('Share link copied!');

  logger.info(LOG_TOPICS.Artifacts, 'ArtifactCard', 'Link copied', {
    shareToken,
  });
};
```

### Delete Artifact
```typescript
const handleDelete = async (artifactId: Id<"artifacts">) => {
  // Confirm before deleting
  const confirmed = confirm(
    'Are you sure you want to delete this artifact? This action cannot be undone.'
  );
  if (!confirmed) return;

  try {
    await deleteArtifact({ artifactId });

    toast.success('Artifact deleted successfully');

    logger.info(LOG_TOPICS.Artifacts, 'ArtifactCard', 'Artifact deleted', {
      artifactId,
    });
  } catch (error) {
    toast.error('Failed to delete artifact. Please try again.');

    logger.error(LOG_TOPICS.Artifacts, 'ArtifactCard', 'Delete failed', {
      artifactId,
      error,
    });
  }
};
```

### Open Artifact
```typescript
const handleOpen = (artifactId: Id<"artifacts">) => {
  // Navigate to artifact viewer page
  router.push(`/artifacts/${artifactId}`);
};
```

## Date Formatting

Use relative date formatting for better UX:

```typescript
import { formatDistanceToNow } from 'date-fns';

const formatDate = (timestamp: number) => {
  return formatDistanceToNow(timestamp, { addSuffix: true });
  // "2 hours ago", "3 days ago", "1 month ago"
};
```

## ShadCN UI Components

- `Card` - Artifact cards
- `Button` - Actions (open, copy, delete)
- `DropdownMenu` - Overflow menu for actions
- `Badge` - Status indicator
- `Skeleton` - Loading state
- `Toast` - Notifications

## Testing Requirements

### Component Tests
Create tests in `tasks/00010-artifact-upload-creation/tests/frontend/`:

**`ArtifactList.test.tsx`:**
- Renders list of artifacts
- Shows loading state while fetching
- Shows empty state when no artifacts
- Handles query errors gracefully

**`ArtifactCard.test.tsx`:**
- Displays artifact metadata correctly
- Copy link button works
- Delete button shows confirmation
- Delete button calls mutation
- Date formatted correctly

**`EmptyState.test.tsx`:**
- Renders CTA button
- Button triggers create flow

### Manual Testing
- [ ] Artifacts load correctly
- [ ] Cards match Figma design
- [ ] Copy link works and shows feedback
- [ ] Delete shows confirmation dialog
- [ ] Delete removes artifact from list
- [ ] Empty state displays for new users
- [ ] Loading skeleton matches card layout
- [ ] Responsive on mobile (cards stack properly)
- [ ] Dates format correctly

## Acceptance Criteria

- [ ] List displays all user's artifacts
- [ ] Cards match Figma design
- [ ] Sorted by most recent first
- [ ] Copy link works and shows toast
- [ ] Delete requires confirmation
- [ ] Delete removes artifact immediately (optimistic update)
- [ ] Empty state displays correctly
- [ ] Loading state shows skeleton cards
- [ ] Error state handles network failures
- [ ] Responsive design works on mobile
- [ ] Component tests pass
- [ ] No console errors

## Future Enhancements (Out of Scope)

- Artifact thumbnails/previews (HTML screenshot)
- Bulk operations (select multiple, delete all)
- Filtering (by status, date range)
- Search (by title, description)
- Sorting options (name, date, status)
- Pagination (for users with 100+ artifacts)

---

**Next:** Subtask 05 (E2E Testing)
