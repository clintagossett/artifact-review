# Frontend Design Analysis: Artifact Upload & Creation

**Subtask:** 03-frontend-design-analysis
**Status:** Complete
**Date:** 2025-12-26
**Source:** `figma-designs/` submodule (Figma Make export)

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Component Breakdown](#2-component-breakdown)
3. [User Flows](#3-user-flows)
4. [Design Tokens](#4-design-tokens)
5. [ShadCN Component Mapping](#5-shadcn-component-mapping)
6. [Mobile Responsiveness](#6-mobile-responsiveness)
7. [Accessibility Considerations](#7-accessibility-considerations)
8. [Screenshots/References](#8-screenshotsreferences)
9. [Design Gaps and Clarifications Needed](#9-design-gaps-and-clarifications-needed)
10. [Testing Considerations](#10-testing-considerations)

---

## 1. Design Overview

### Visual Style

The Figma designs follow a **modern SaaS aesthetic** with:

- **Primary Color:** Blue (`#2563EB` / `bg-blue-600`) - CTAs, links, primary actions
- **Secondary Color:** Purple (`#7C3AED` / `bg-purple-600`) - Accents, AI-native messaging, brand
- **Neutral palette:** Gray scale from `gray-50` to `gray-900`
- **Clean whitespace:** Generous padding (8px grid system)
- **Subtle shadows:** `shadow-sm` for cards, `shadow-lg` for elevated elements
- **Rounded corners:** `rounded-lg` to `rounded-xl` throughout

### Typography

- **Font:** Inter (Google Fonts - variable font)
- **Base size:** 16px (`--font-size: 16px`)
- **Hierarchy defined in `theme.css`** - DO NOT override with Tailwind text classes
- **Font weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Layout Structure

Three main screens implemented in Figma:

1. **Landing Page** - Marketing, pre-auth
2. **Dashboard** - Logged-in user's artifact list
3. **Document Viewer** - Full artifact display with comments

---

## 2. Component Breakdown

### Components to Build for Task 10

Based on Figma analysis, these components need to be implemented:

| Component | Purpose | Priority | Reference File |
|-----------|---------|----------|----------------|
| `DashboardHeader` | Top navigation with branding, upload button, user menu | High | `Dashboard.tsx` |
| `ArtifactCard` | Card showing artifact metadata, versions, members | High | `Dashboard.tsx` |
| `ArtifactList` | Grid layout of artifact cards | High | `Dashboard.tsx` |
| `UploadDropzone` | Drag-and-drop upload area | High | `Dashboard.tsx` |
| `NewArtifactDialog` | Modal for creating new artifact | High | `NewProjectDialog.tsx` |
| `EntryPointDialog` | Modal for selecting ZIP entry point | Medium | `EntryPointDialog.tsx` |
| `ShareModal` | Modal for sharing and permissions | Medium | `ShareModal.tsx` |
| `EmptyState` | Empty state for new users | Medium | (not in Figma) |
| `UploadProgress` | Upload progress indicator | Medium | (partial in Figma) |
| `RecentActivity` | Activity feed on dashboard | Low | `Dashboard.tsx` |

### Component Hierarchy

```
Dashboard
  +-- DashboardHeader
  |     +-- Logo
  |     +-- Button (Invite Team)
  |     +-- Button (Upload)
  |     +-- DropdownMenu (User)
  |
  +-- SearchInput
  |
  +-- UploadDropzone
  |     +-- Upload icon
  |     +-- Text instructions
  |     +-- Button (Choose File)
  |
  +-- ArtifactList
  |     +-- SectionHeader ("Your Artifacts" + New Artifact button)
  |     +-- ArtifactCard[]
  |           +-- FolderIcon
  |           +-- Title + Description
  |           +-- Badge[] (version badges)
  |           +-- Stats (file count, member count)
  |           +-- AvatarGroup
  |           +-- Timestamp
  |
  +-- RecentActivity (optional for MVP)
  |     +-- ActivityItem[]
  |
  +-- NewArtifactDialog (modal)
  |     +-- UploadDropzone (within modal)
  |     +-- Input (Project Name)
  |     +-- Textarea (Description)
  |     +-- Button (Cancel, Create)
  |
  +-- EntryPointDialog (modal, for ZIP files)
        +-- ScrollArea
        +-- FileSelectionList
        +-- Button (Cancel, Confirm)
```

---

## 3. User Flows

### Flow 1: Upload Artifact via Dashboard Dropzone

```
1. User lands on Dashboard (logged in)
2. User drags file onto upload zone OR clicks "Choose File"
3. File type detection:
   a. HTML file: Direct upload, navigate to viewer
   b. MD file: Direct upload, navigate to viewer
   c. ZIP file: Show EntryPointDialog
4. For ZIP:
   a. Dialog shows list of HTML files in ZIP
   b. User selects entry point (index.html pre-selected if exists)
   c. User clicks "Confirm"
5. Upload completes
6. New artifact card appears in grid (with animation)
7. User can click card to open viewer
```

### Flow 2: Create New Artifact via "New Artifact" Button

```
1. User clicks "New Artifact" button in section header
2. NewArtifactDialog opens
3. User drops/selects file in dialog dropzone
4. File name auto-suggests project name (smart parsing)
5. User edits name (optional)
6. User adds description (optional)
7. For ZIP files:
   a. Dialog closes
   b. EntryPointDialog opens
   c. User selects entry point
8. User clicks "Create Project"
9. Artifact created, card appears in grid
```

### Flow 3: Upload via Header Button

```
1. User clicks "Upload" button in header
2. File picker opens
3. Same file processing as Flow 1
```

### Flow 4: Copy Share Link

```
1. User is in Document Viewer or Dashboard
2. User clicks "Share" button
3. ShareModal opens
4. User clicks "Copy" button next to share link
5. Link copied to clipboard
6. Button shows checkmark with "Copied" text (2s timeout)
7. User can also adjust permissions and invite via email
```

---

## 4. Design Tokens

### Colors

```css
/* Primary Colors */
--primary-blue: #2563EB;       /* Tailwind: bg-blue-600 */
--primary-blue-hover: #1D4ED8; /* Tailwind: bg-blue-700 */
--primary-purple: #7C3AED;     /* Tailwind: bg-purple-600 */
--primary-purple-hover: #6D28D9; /* Tailwind: bg-purple-700 */

/* Neutral Colors */
--text-primary: #111827;       /* Tailwind: text-gray-900 */
--text-secondary: #6B7280;     /* Tailwind: text-gray-600 */
--text-tertiary: #9CA3AF;      /* Tailwind: text-gray-400 */
--background: #FFFFFF;         /* Tailwind: bg-white */
--background-alt: #F9FAFB;     /* Tailwind: bg-gray-50 */
--border: #E5E7EB;             /* Tailwind: border-gray-200 */

/* Semantic Colors */
--success: #10B981;            /* Tailwind: bg-green-600 */
--warning: #F59E0B;            /* Tailwind: bg-yellow-500 */
--error: #EF4444;              /* Tailwind: bg-red-500 */
--info: #3B82F6;               /* Tailwind: bg-blue-500 */
```

### Gradients

```css
/* Brand gradient (logo, CTAs) */
.gradient-primary {
  background: linear-gradient(to bottom right, #2563EB, #7C3AED);
  /* Tailwind: bg-gradient-to-br from-blue-600 to-purple-600 */
}

/* Avatar gradient */
.gradient-avatar {
  background: linear-gradient(to bottom right, #3B82F6, #8B5CF6);
  /* Tailwind: bg-gradient-to-br from-blue-500 to-purple-600 */
}
```

### Spacing (8px Grid)

| Name | Value | Tailwind |
|------|-------|----------|
| xs | 4px | `p-1`, `gap-1` |
| sm | 8px | `p-2`, `gap-2` |
| md | 16px | `p-4`, `gap-4` |
| lg | 24px | `p-6`, `gap-6` |
| xl | 32px | `p-8`, `gap-8` |
| 2xl | 48px | `p-12`, `gap-12` |

### Shadows

| Usage | Tailwind Class |
|-------|----------------|
| Cards (default) | `shadow-sm` |
| Cards (hover) | `shadow-lg` |
| Modals | `shadow-2xl` |
| Dropdowns | `shadow-lg` |

### Border Radius

| Usage | Tailwind Class |
|-------|----------------|
| Buttons | `rounded-md` |
| Cards | `rounded-xl` |
| Inputs | `rounded-md` |
| Avatars | `rounded-full` |
| Modals | `rounded-xl` |
| Dropzone | `rounded-xl` |

---

## 5. ShadCN Component Mapping

### Components Already in App

Located in `app/src/components/ui/`:

- `button.tsx` - Button component
- `card.tsx` - Card component
- `input.tsx` - Input component
- `label.tsx` - Label component
- `form.tsx` - Form component with react-hook-form

### Components Needed from ShadCN

Install these via CLI:

```bash
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add scroll-area
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add toast
npx shadcn@latest add skeleton
npx shadcn@latest add progress
```

### Component Mapping Table

| UI Need | ShadCN Component | Customization Needed |
|---------|------------------|---------------------|
| Upload button | `Button` | Purple variant: `bg-purple-600 hover:bg-purple-700` |
| Artifact cards | `Card` | Add hover shadow, cursor-pointer |
| Version badges | `Badge` | `bg-purple-100 text-purple-700` |
| User avatars | `Avatar` | With gradient fallback |
| Create dialog | `Dialog` | Standard usage |
| Entry point list | `ScrollArea` | For long file lists |
| Permission select | `Select` | With items |
| Feedback toasts | `Toast` (sonner) | For copy confirmation |
| Loading states | `Skeleton` | For card placeholders |
| Upload progress | `Progress` | Linear progress bar |
| Description input | `Textarea` | Standard with resize-none |
| Dropdowns | `DropdownMenu` | For user menu |

### Custom Components Needed

These are NOT in ShadCN and must be built:

1. **UploadDropzone** - Drag-and-drop file upload area
   - States: default, drag-active, file-selected, uploading, error
   - Use native drag-and-drop API

2. **AvatarGroup** - Stacked avatar display with overflow count
   - Show first N avatars
   - Show `+X` count for overflow

3. **FileSelector** - Radio-style file selection list for EntryPointDialog
   - Custom styling with purple accent

---

## 6. Mobile Responsiveness

### Breakpoints (Tailwind defaults)

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Dashboard Layout

```
Desktop (lg+):  3-column grid for artifact cards
Tablet (md):    2-column grid
Mobile (sm):    1-column stack
```

### Header Responsive Behavior

```tsx
// Desktop: All items visible inline
// Mobile: Consider hamburger menu or simplified header
<header className="...">
  <div className="flex items-center gap-3">
    {/* Logo - always visible */}
  </div>
  <div className="flex items-center gap-3">
    {/* Desktop: all buttons */}
    <Button variant="outline" size="sm" className="hidden md:flex">
      <Users /> Invite Team
    </Button>
    {/* Mobile: just Upload and User menu */}
    <Button size="sm">Upload</Button>
    <DropdownMenu>...</DropdownMenu>
  </div>
</header>
```

### Upload Zone Responsive

```tsx
// Desktop: larger padding, horizontal layout
// Mobile: smaller padding, stacked layout
<div className="p-8 md:p-12">
  <div className="flex flex-col items-center gap-4">
    ...
  </div>
</div>
```

### Dialog Responsive

```tsx
// Dialog should be full-width on mobile with max-width on desktop
<DialogContent className="sm:max-w-[550px]">
  ...
</DialogContent>
```

---

## 7. Accessibility Considerations

### Keyboard Navigation

- All interactive elements must be focusable
- Tab order follows visual order
- Dialogs trap focus
- `Escape` key closes dialogs

### ARIA Labels

```tsx
// Upload zone should announce its purpose
<div
  role="button"
  aria-label="Drop zone for file upload"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && triggerUpload()}
>

// File input should have label
<label htmlFor="file-upload" className="sr-only">
  Upload artifact file
</label>
<input id="file-upload" type="file" ... />
```

### Color Contrast

- Text meets WCAG AA standards (4.5:1 for normal text)
- `text-gray-600` on white passes
- `text-gray-500` on white is borderline - use sparingly

### Focus States

```tsx
// ShadCN handles this, but verify:
// - Visible focus ring on buttons
// - Focus ring on inputs
// - Focus ring on file selection items in EntryPointDialog
```

### Screen Reader Support

- Announce upload progress
- Announce success/error states
- Describe file type requirements in labels

---

## 8. Screenshots/References

### Visual Screenshots from Figma

The following screenshots are located in `screenshots/`:

1. **`home-page.png`** - Marketing landing page (pre-auth)
   - Full-page hero with "From AI output to stakeholder feedback in one click" messaging
   - Feature sections with screenshots
   - Pricing tiers ($0, $19, $39)
   - FAQ section
   - Footer with CTA

2. **`landing_page_logged_in.png`** - Dashboard (logged-in state) ⭐ **PRIMARY REFERENCE FOR TASK 10**
   - Header: Logo + "Invite Team" + "Upload" (purple) + User menu
   - Search bar
   - **Upload dropzone** with purple upload icon, "Drop your files here" text, "Choose File" button
   - **"Your Artifacts" section** with "+ New Artifact" button
   - **Two artifact cards shown:**
     - "Product Landing Pages" - with v1, v2, v3 badges, 3 files, 3 members, avatar group, "2 hours ago"
     - "Interactive UI Components" - with v1 badge, 1 file, 2 members, avatar group, "30 mins ago"
   - **Recent Activity feed** showing comments and uploads

3. **`artifact_upload-modal.png`** - "Create New Artifact" dialog ⭐ **PRIMARY REFERENCE FOR UPLOAD FLOW**
   - Modal overlay with backdrop blur
   - Title: "Create New Artifact" with folder icon
   - Subtitle: "Upload an HTML, Markdown, or ZIP package to start reviewing with your team."
   - **Upload File section** with dropzone ("Drop file here or click to browse")
   - **Project Name** input with example placeholder
   - **Description (optional)** textarea
   - Footer: "Cancel" (outline) + "Create Project" (purple)

4. **`log-in-page.png`** - Sign-in page
   - Centered card with gradient purple icon
   - "Welcome back" heading
   - Tabs: "Password" and "Magic Link"
   - Email + Password inputs
   - "Forgot password?" link
   - Blue "Sign in" button
   - Demo account credentials shown
   - "Don't have an account? Sign up" link

### Key Visual Observations

#### Color Usage in Screenshots
- **Purple (#7C3AED)** used for:
  - Upload button in header
  - Upload icon in dropzone
  - Version badges (v1, v2, v3) with purple-100 background
  - "Create Project" button
  - Folder icons in artifact cards

- **Blue (#2563EB)** used for:
  - "Sign in" button
  - Links and accents

- **Gradients:**
  - Logo uses blue-to-purple gradient
  - User avatars use gradient backgrounds

#### Typography Hierarchy Observed
- **Page title:** Large, bold, ~32px
- **Section headers:** "Your Artifacts" - Semibold, ~20px
- **Card titles:** Semibold, ~16px
- **Card descriptions:** Regular, ~14px, gray-600
- **Body text:** Regular, ~14px

#### Spacing Patterns
- **Cards:** 24px padding (p-6)
- **Header:** 16px vertical padding
- **Upload zone:** 48px padding (p-12)
- **Card grid gap:** 24px
- **Modal padding:** 24px

#### Component States Visible
- **Artifact cards:**
  - Default state with shadow-sm
  - Hover state would add shadow-lg (not visible in static screenshot)
  - Cursor-pointer indicated by design

- **Upload dropzone:**
  - Default: Dashed gray border, white background
  - (Drag-active state not shown but documented in code analysis)

#### Mobile Considerations
- Screenshots show desktop view (3704px wide)
- Grid would collapse to 2-column at tablet, 1-column at mobile
- Header would need simplified version on mobile

### Key Design Patterns from Figma

#### Dashboard Header Pattern
```
Location: figma-designs/src/app/components/Dashboard.tsx lines 253-301

Key elements:
- Logo: 40x40 gradient square with FileText icon
- Brand text: "Artifact Review" (font-semibold text-gray-900)
- Upload button: Purple (bg-purple-600)
- User dropdown: Ghost button with User icon
```

#### Upload Dropzone Pattern
```
Location: figma-designs/src/app/components/Dashboard.tsx lines 319-353

Key elements:
- Border: 2px dashed, gray-300 default, purple-500 on drag
- Background: white default, purple-50 on drag
- Icon: 64x64 gradient circle with Upload icon
- Text: "Drop your files here" + supported formats
- Button: outline variant "Choose File"
```

#### Artifact Card Pattern
```
Location: figma-designs/src/app/components/Dashboard.tsx lines 366-435

Key elements:
- Container: Card with p-6, hover:shadow-lg, cursor-pointer
- Header: FolderOpen icon (purple-600) + title (font-semibold)
- Description: text-gray-600
- Version badges: Badge with bg-purple-100 text-purple-700
- Stats: FileText count, Users count
- Footer: AvatarGroup (stacked, -space-x-2) + Clock timestamp
```

#### NewArtifactDialog Pattern
```
Location: figma-designs/src/app/components/NewProjectDialog.tsx

Key elements:
- Dialog max-width: sm:max-w-[550px]
- Header: FolderPlus icon (purple-600) + title
- Upload area: Same dropzone pattern but smaller (p-8)
- File selected state: green border, FileText icon, file name, size, Remove button
- Name input: required, with placeholder
- Description: Textarea, optional, rows=3, resize-none
- Footer: Cancel (outline) + Create (purple-600)
```

#### EntryPointDialog Pattern
```
Location: figma-designs/src/app/components/EntryPointDialog.tsx

Key elements:
- Dialog max-width: sm:max-w-[500px]
- Title: "Select Entry Point"
- Description: Shows zip file name
- File count: "Found X HTML files:"
- ScrollArea: h-[300px]
- File items: Button-like, border-2, selected state with purple border
- Selected indicator: CheckCircle2 icon
- Auto-select: index.html if exists
```

#### ShareModal Pattern
```
Location: figma-designs/src/app/components/ShareModal.tsx

Key elements:
- Manual modal (not Dialog) with backdrop
- Max-width: max-w-2xl
- Invite section: Email input with Mail icon, permission Select, Invite button
- User list: Avatar, name, email, role Badge, permission Select
- Share link: Input with Link icon, Copy button with copied state
- Permission info: Blue info box with permission descriptions
```

---

### Visual vs Code Analysis Alignment

Comparing screenshots to code analysis:

| Element | Screenshot Shows | Code Analysis | Status |
|---------|------------------|---------------|--------|
| Upload button color | Purple | Purple (bg-purple-600) | ✅ Match |
| Version badges | Purple bg, dark text | bg-purple-100 text-purple-700 | ✅ Match |
| Card layout | Grid with 2 cards | Grid layout code | ✅ Match |
| Avatar stacking | Overlapping (-space-x-2) | -space-x-2 in code | ✅ Match |
| Upload dropzone | Dashed border, centered | Dashed border pattern | ✅ Match |
| Modal structure | Title, upload, fields, buttons | Same structure in code | ✅ Match |
| Activity feed | Shows in screenshot | Marked as "Low priority" | 📝 Note |

**Key Insight:** Screenshots validate the code analysis. All major patterns match between visual design and code implementation.

---

## 9. Design Gaps and Clarifications Needed

### Missing from Figma Screenshots

1. **Empty State** - What to show when user has no artifacts
   - Screenshot shows dashboard with 2 artifacts already
   - Recommendation: Large illustration, centered upload dropzone with "Create your first artifact" messaging, hide "Your Artifacts" header until first artifact exists

2. **Error States for Upload**
   - File too large
   - Invalid file type
   - Network error
   - Recommendation: Use red border, error icon, descriptive message

3. **Upload Progress UI**
   - Screenshots show static states, not upload in progress
   - Recommendation: Add linear Progress bar component below "Choose File" button during upload, show percentage and file name

4. **Markdown File Handling**
   - Designs show .md support but no specific UI
   - Recommendation: Same flow as HTML, add MD icon variant

5. **Loading States**
   - No explicit loading skeleton shown
   - Recommendation: Use Skeleton component for cards, lists

### Design Questions for Clarification

1. **Should "New Artifact" button always show, or only when artifacts exist?**
   - Current: Always shows
   - Consider: Hide and use empty state CTA for first artifact

2. **Post-upload behavior** ✅
   - Screenshot context: Dashboard shows existing artifacts
   - Recommendation based on design: Stay on dashboard, new card appears at top of grid with slide-in animation, show success toast "Artifact created successfully"

3. **Share link format?**
   - Figma shows: `artifactreview.com/share/abc123`
   - Backend uses: `/a/{shareToken}` (8-char nanoid)
   - Need to align on final URL format

4. **File size in artifact cards** ✅
   - Screenshot shows: Only file COUNT shown (e.g., "3" files icon)
   - Not shown: Total file size
   - Decision: Follow design, show file count only. Size can be shown in details view.

---

## 10. Testing Considerations

### Testable User Interactions

1. **File Upload via Dropzone**
   - Drop valid HTML file
   - Drop valid ZIP file
   - Drop valid MD file
   - Drop invalid file type
   - Drop file exceeding size limit
   - Click "Choose File" button

2. **New Artifact Dialog**
   - Open dialog
   - Upload file in dialog
   - Auto-populate name from filename
   - Edit name manually
   - Add description
   - Submit with missing required fields
   - Cancel and lose changes

3. **Entry Point Selection**
   - Open with ZIP containing multiple HTML files
   - Pre-select index.html if exists
   - Select different entry point
   - Confirm selection
   - Cancel selection

4. **Artifact Card Interactions**
   - Click to navigate to viewer
   - Verify correct data displayed
   - Hover state animations

5. **Share Flow**
   - Copy link to clipboard
   - Verify toast appears
   - Change permissions

### Component Unit Tests

```tsx
// Example test structure
describe('UploadDropzone', () => {
  it('shows default state initially');
  it('shows drag-active state on drag enter');
  it('shows file-selected state after drop');
  it('calls onFileSelect with correct file');
  it('rejects invalid file types');
  it('rejects files over size limit');
});

describe('NewArtifactDialog', () => {
  it('opens when triggered');
  it('auto-suggests name from filename');
  it('disables submit without file');
  it('disables submit without name');
  it('calls onCreate with correct data');
});

describe('EntryPointDialog', () => {
  it('shows all HTML files in list');
  it('pre-selects index.html');
  it('allows selecting different file');
  it('calls onSelect with chosen file');
});

describe('ArtifactCard', () => {
  it('displays artifact title');
  it('displays version badges');
  it('displays member avatars');
  it('displays last activity time');
  it('navigates on click');
});
```

---

## Summary

This design analysis provides a comprehensive guide for implementing the frontend components for Task 10 (Artifact Upload & Creation). The Figma designs in `figma-designs/` provide clear patterns for:

- **Dashboard layout** with header, upload zone, and artifact grid
- **Upload flows** for HTML, MD, and ZIP files
- **Modal dialogs** for artifact creation and entry point selection
- **Share functionality** with permissions

Key next steps:
1. Install missing ShadCN components
2. Build custom components (UploadDropzone, AvatarGroup)
3. Implement Dashboard page
4. Implement NewArtifactDialog
5. Implement EntryPointDialog (for ZIP files)
6. Connect to backend mutations/queries
7. Add loading, empty, and error states
8. Write component tests

---

**Document Author:** Software Architect Agent
**Last Updated:** 2025-12-26
