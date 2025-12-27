# Screenshot Reference Guide

This directory contains visual references from Figma for implementing Task 10: Artifact Upload & Creation.

---

## Screenshot Index

### 1. `landing_page_logged_in.png` ⭐ PRIMARY REFERENCE

**What it shows:** Dashboard view when logged in

**Key UI elements:**
- ✅ Header with logo, "Invite Team", "Upload" (purple), user menu
- ✅ Search bar
- ✅ Upload dropzone (large, centered, dashed border)
- ✅ "Your Artifacts" section with cards
- ✅ Artifact cards with versions, file count, member avatars, timestamps
- ✅ Recent Activity feed

**Use for implementing:**
- `DashboardHeader` component
- `UploadDropzone` component
- `ArtifactList` component
- `ArtifactCard` component
- `RecentActivity` component

**Color reference:**
- Purple upload button: `bg-purple-600`
- Purple version badges: `bg-purple-100 text-purple-700`
- Card backgrounds: `bg-white`
- Card borders: `border-gray-200`

---

### 2. `artifact_upload-modal.png` ⭐ PRIMARY REFERENCE

**What it shows:** "Create New Artifact" modal dialog

**Key UI elements:**
- ✅ Modal with backdrop blur
- ✅ Header with folder icon + title
- ✅ Upload dropzone within modal
- ✅ "Project Name" input field with smart suggestion
- ✅ "Description (optional)" textarea
- ✅ Footer with Cancel + Create Project buttons

**Use for implementing:**
- `NewArtifactDialog` component
- Modal upload flow
- Form validation patterns

**Measurements:**
- Modal max-width: ~550px (`sm:max-w-[550px]`)
- Modal padding: 24px (`p-6`)
- Button gap: 12px (`gap-3`)

---

### 3. `home-page.png`

**What it shows:** Marketing landing page (pre-authentication)

**Key sections:**
- Hero with gradient background
- Feature showcase
- Pricing tiers ($0 Free, $19 Pro, $39 Team)
- FAQ section
- Footer

**Use for:**
- Reference only (not part of Task 10)
- Understanding overall brand/messaging
- Future marketing page implementation

---

### 4. `log-in-page.png`

**What it shows:** Sign-in page

**Key UI elements:**
- Centered auth card
- Password / Magic Link tabs
- Email + Password inputs
- "Sign in" button (blue)
- Demo credentials display
- Sign-up link

**Use for:**
- Reference only (auth already implemented in earlier tasks)
- Consistent styling across auth and dashboard

---

## Implementation Checklist

### From `landing_page_logged_in.png`:

- [ ] Header layout matches (logo, buttons, spacing)
- [ ] Upload dropzone matches visual design
- [ ] Artifact cards match layout and spacing
- [ ] Version badges use correct purple styling
- [ ] Avatar stacking (-space-x-2) matches design
- [ ] File count and member count icons match
- [ ] Timestamp styling matches ("2 hours ago")
- [ ] Grid layout: 2 columns shown, responsive to 3/2/1

### From `artifact_upload-modal.png`:

- [ ] Modal overlay and backdrop match
- [ ] Header with icon + title matches
- [ ] Upload dropzone within modal matches
- [ ] Input field styling matches
- [ ] Textarea styling matches
- [ ] Button colors and spacing match (outline + purple)
- [ ] Modal max-width and padding match

---

## Color Palette from Screenshots

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Upload button | Purple | `bg-purple-600 hover:bg-purple-700` |
| Version badges | Light purple bg, dark text | `bg-purple-100 text-purple-700` |
| Sign-in button | Blue | `bg-blue-600 hover:bg-blue-700` |
| Folder icons | Purple | `text-purple-600` |
| Body text | Dark gray | `text-gray-900` |
| Secondary text | Medium gray | `text-gray-600` |
| Tertiary text | Light gray | `text-gray-400` |
| Card borders | Very light gray | `border-gray-200` |
| Backgrounds | White/Off-white | `bg-white` / `bg-gray-50` |

---

## Typography from Screenshots

| Element | Size | Weight | Example |
|---------|------|--------|---------|
| Page title | ~32px | Bold | "Collaborative HTML Review Platform" |
| Section header | ~20px | Semibold | "Your Artifacts" |
| Card title | ~16px | Semibold | "Product Landing Pages" |
| Card description | ~14px | Regular | "AI-generated landing page reviews..." |
| Body text | ~14px | Regular | "Drop your files here" |
| Timestamps | ~12px | Regular | "2 hours ago" |

---

## Spacing from Screenshots

| Element | Padding/Gap | Tailwind |
|---------|-------------|----------|
| Header | 16px vertical | `py-4` |
| Upload zone | 48px all sides | `p-12` |
| Cards | 24px all sides | `p-6` |
| Card grid gap | 24px | `gap-6` |
| Modal | 24px all sides | `p-6` |
| Button gap | 12px | `gap-3` |

---

## Next Steps

1. ✅ Screenshots copied to `screenshots/` folder
2. ✅ Visual analysis documented in main README
3. ⏳ Use screenshots as visual reference during component implementation
4. ⏳ Compare implemented components to screenshots for visual QA
5. ⏳ Take validation screenshots after implementation for comparison

---

**Last Updated:** 2025-12-26
