# Mode Switching UX: Text vs. SVG/Image Annotation

**The Problem:** With Annotator.js (text) + Annotorious (SVG/images), you have two different selection mechanisms. Users need to switch between them somehow.

**The question:** Dynamic auto-detection? Explicit tool selector? Keyboard shortcuts?

---

## Option 1: Context-Aware Auto-Detection (Recommended)

**How it works:**
```
User clicks/drags on HTML
    ↓
Is it text? → Enable Annotator.js (text selection mode)
Is it SVG/image? → Enable Annotorious (region selection mode)
Is it something else? → Do nothing
```

**User experience:**
- User doesn't think about modes
- Just tries to select what they want
- System detects and enables the right tool
- Visual feedback shows which mode is active

**Technical implementation:**

```typescript
export function ArtifactViewer({ artifactId }) {
  const [activeMode, setActiveMode] = useState<'idle' | 'text' | 'svg'>('idle');
  const annotatorRef = useRef(null);
  const annotoriousRef = useRef(null);

  const handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Detect what user is clicking on
    if (isTextNode(target) || isTextContainer(target)) {
      // Enable text selection mode (Annotator.js)
      setActiveMode('text');
      // Annotator.js handles selection automatically
    } else if (isSVGElement(target) || isImageElement(target)) {
      // Enable SVG region mode (Annotorious)
      setActiveMode('svg');
      annotoriousRef.current?.enable();
    } else {
      setActiveMode('idle');
    }
  };

  const isTextNode = (el: HTMLElement) => {
    return el.nodeType === Node.TEXT_NODE || el.childNodes.some(n => n.nodeType === Node.TEXT_NODE);
  };

  const isSVGElement = (el: HTMLElement) => {
    return el.tagName?.toLowerCase() === 'svg' || el.closest('svg');
  };

  const isImageElement = (el: HTMLElement) => {
    return el.tagName?.toLowerCase() === 'img';
  };

  return (
    <div onMouseDown={handleMouseDown}>
      <div className={`artifact-viewer ${activeMode === 'text' ? 'mode-text' : ''}`}>
        {/* Text content with Annotator.js */}
        <ArticleHTML ref={annotatorRef} content={artifact} />
      </div>

      <div className={`svg-container ${activeMode === 'svg' ? 'mode-svg' : ''}`}>
        {/* SVG/images with Annotorious */}
        <Annotorious ref={annotoriousRef} images={svgImages} />
      </div>

      {/* Mode indicator */}
      {activeMode !== 'idle' && (
        <div className="mode-indicator">
          {activeMode === 'text' && '📝 Text selection mode'}
          {activeMode === 'svg' && '🎯 Region selection mode'}
        </div>
      )}
    </div>
  );
}
```

**Pros:**
- ✅ Seamless—no user friction
- ✅ Intuitive—natural to what they're clicking
- ✅ No extra UI elements
- ✅ Works automatically

**Cons:**
- ⚠️ User might not realize they're in a mode
- ⚠️ If they want text selection over SVG, might be blocked
- ⚠️ Edge case: What if text and SVG overlap?

---

## Option 2: Explicit Mode Selector (Clear But Extra UI)

**How it works:**
```
User clicks "Select Text" button
    ↓
Enable text selection mode → Any drag is treated as text selection
    ↓
User clicks "Select Region" button
    ↓
Switch to region mode → Any drag is treated as region selection
```

**UI Example:**
```
[📝 Text Mode] [🎯 Region Mode] [✕ Cancel]
```

**Technical implementation:**

```typescript
export function ArtifactViewer({ artifactId }) {
  const [mode, setMode] = useState<'text' | 'svg' | null>(null);
  const annotatorRef = useRef(null);
  const annotoriousRef = useRef(null);

  const enableTextMode = () => {
    setMode('text');
    annotoriousRef.current?.disable();
    annotatorRef.current?.enable();
  };

  const enableSVGMode = () => {
    setMode('svg');
    annotatorRef.current?.disable();
    annotoriousRef.current?.enable();
  };

  const cancelMode = () => {
    setMode(null);
    annotatorRef.current?.disable();
    annotoriousRef.current?.disable();
  };

  return (
    <div>
      <div className="mode-toolbar">
        <button
          onClick={enableTextMode}
          className={mode === 'text' ? 'active' : ''}
        >
          📝 Select Text
        </button>
        <button
          onClick={enableSVGMode}
          className={mode === 'svg' ? 'active' : ''}
        >
          🎯 Select Region
        </button>
        {mode && (
          <button onClick={cancelMode}>✕ Cancel</button>
        )}
      </div>

      {mode && (
        <div className="mode-help">
          {mode === 'text' && '👇 Drag to select text'}
          {mode === 'svg' && '👇 Click and drag to create region'}
        </div>
      )}

      <ArticleHTML ref={annotatorRef} content={artifact} />
      <Annotorious ref={annotoriousRef} images={svgImages} />
    </div>
  );
}
```

**Pros:**
- ✅ Crystal clear what mode you're in
- ✅ Intentional—can't accidentally trigger wrong mode
- ✅ Power users know exactly what happens
- ✅ Can add keyboard shortcuts (T for text, R for region)

**Cons:**
- ⚠️ Extra UI (toolbar clutters interface)
- ⚠️ Extra click required (friction)
- ⚠️ Feels like old annotation tools (Genius, Mendeley)
- ⚠️ User must remember to cancel mode after commenting

---

## Option 3: Intelligent Hover + Visual Feedback (Best Hybrid)

**How it works:**
```
User hovers over text
    ↓
Show "Click and drag to select text" hint
Cursor changes to text-select cursor
    ↓
User hovers over SVG
    ↓
Show "Click and drag to create region" hint
Cursor changes to crosshair
```

**Technical implementation:**

```typescript
export function ArtifactViewer({ artifactId }) {
  const [hoverMode, setHoverMode] = useState<'text' | 'svg' | null>(null);
  const [tooltip, setTooltip] = useState('');

  const handleMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (isSVGElement(target) || isImageElement(target)) {
      setHoverMode('svg');
      setTooltip('Click and drag to mark region');
      document.body.style.cursor = 'crosshair';
    } else if (isTextNode(target)) {
      setHoverMode('text');
      setTooltip('Click and drag to select text');
      document.body.style.cursor = 'text';
    } else {
      setHoverMode(null);
      setTooltip('');
      document.body.style.cursor = 'default';
    }
  };

  return (
    <div onMouseMove={handleMouseMove}>
      <ArticleHTML content={artifact} />
      <Annotorious images={svgImages} />

      {tooltip && (
        <div className="floating-hint" style={{ cursor: 'pointer' }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
```

**Pros:**
- ✅ Seamless like auto-detection
- ✅ Hint guides user ("Click and drag to...")
- ✅ Cursor change provides feedback (text cursor vs. crosshair)
- ✅ No extra UI elements
- ✅ Educational—user learns naturally

**Cons:**
- ⚠️ Hints can be subtle if user isn't paying attention
- ⚠️ Hover hints disappear quickly
- ⚠️ Cursor changes might not be enough feedback

---

## Option 4: Floating Toolbar (Like Google Docs Comments)

**How it works:**
```
User selects text
    ↓
Floating popup appears near selection
    ↓
"Comment" button in popup
User clicks it → Comment composer opens
```

**Technical implementation:**

```typescript
export function ArtifactViewer({ artifactId }) {
  const [selection, setSelection] = useState<{
    type: 'text' | 'svg';
    data: any;
    x: number;
    y: number;
  } | null>(null);

  const handleTextSelection = async (e: MouseEvent) => {
    const sel = window.getSelection();
    if (sel?.toString().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection({
        type: 'text',
        data: await createSelector(sel),
        x: rect.right,
        y: rect.top,
      });
    }
  };

  const handleSVGRegionSelected = (region: any) => {
    setSelection({
      type: 'svg',
      data: region,
      x: region.x + region.width / 2,
      y: region.y,
    });
  };

  return (
    <div>
      <ArticleHTML
        onTextSelect={handleTextSelection}
        content={artifact}
      />
      <Annotorious
        onRegionCreate={handleSVGRegionSelected}
        images={svgImages}
      />

      {selection && (
        <FloatingCommentToolbar
          x={selection.x}
          y={selection.y}
          onComment={() => openCommentComposer(selection)}
          onCancel={() => setSelection(null)}
        />
      )}
    </div>
  );
}
```

**Pros:**
- ✅ Google Docs pattern—familiar to users
- ✅ Clear action required (click "Comment" button)
- ✅ Confirms selection before committing
- ✅ Works for both text and SVG automatically

**Cons:**
- ⚠️ Extra UI popup (can feel cluttered)
- ⚠️ Popup can appear in awkward places
- ⚠️ Dismisses if user scrolls

---

## Option 5: Keyboard Shortcut Override (Power User Feature)

**How it works:**
```
By default: Auto-detect based on hover (Option 3)
Hold Shift + drag → Force text selection
Hold Alt + drag → Force region selection
```

**Technical implementation:**

```typescript
const handleMouseDown = (e: MouseEvent) => {
  if (e.shiftKey) {
    // Force text mode
    setMode('text');
  } else if (e.altKey) {
    // Force SVG mode
    setMode('svg');
  } else {
    // Auto-detect
    const target = e.target as HTMLElement;
    setMode(isSVGElement(target) ? 'svg' : 'text');
  }
};
```

**Pros:**
- ✅ Handles edge cases (e.g., text over SVG)
- ✅ Power users can override auto-detection
- ✅ Not visible to casual users

**Cons:**
- ⚠️ Shortcuts not discoverable
- ⚠️ Adds complexity
- ⚠️ Most users won't know about it

---

## Recommendation for Artifact Review

I'd suggest **Option 3 + Option 5:**

```
Base behavior: Intelligent hover with visual feedback
  - Hover over text → text cursor, hint "drag to select"
  - Hover over SVG → crosshair cursor, hint "drag to create region"
  - User just... does it naturally

Power user override: Keyboard shortcuts
  - Hold Shift + drag → Force text
  - Hold Alt + drag → Force SVG
  - For edge cases (text over SVG, etc.)

Optional enhancement: Floating toolbar
  - After selection, show "Comment" button
  - Confirms selection before opening composer
  - Feels like Google Docs
```

**Why this combo:**
- 🎯 Default case is seamless (most users just select and comment)
- 🎓 Hints educate users naturally (no tooltip spam)
- ⚡ Keyboard overrides handle edge cases
- 💬 Floating button confirms selection + opens composer

---

## Code Architecture

```typescript
// useAnnotationMode.ts
export function useAnnotationMode() {
  const [hoverMode, setHoverMode] = useState<'text' | 'svg' | null>(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const handleMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Detect mode based on hover
    if (isSVGElement(target)) {
      setHoverMode('svg');
    } else if (isTextElement(target)) {
      setHoverMode('text');
    }
  };

  const handleTextSelection = async (selection: Selection) => {
    // Only if hoverMode is 'text' or Shift key pressed
    if (hoverMode === 'text' || (event as KeyboardEvent).shiftKey) {
      const selector = await annotator.createSelector(selection);
      setSelectedRange(selector);
      showFloatingToolbar(selection);
    }
  };

  const handleSVGRegionCreate = (region: any) => {
    // Only if hoverMode is 'svg' or Alt key pressed
    if (hoverMode === 'svg' || (event as KeyboardEvent).altKey) {
      setSelectedRegion(region);
      showFloatingToolbar(region);
    }
  };

  return {
    hoverMode,
    selectedRange,
    selectedRegion,
    handleMouseMove,
    handleTextSelection,
    handleSVGRegionCreate,
  };
}
```

---

## Edge Cases

### What if text overlaps SVG?
**Solution:** Use keyboard modifiers
- Hover shows both are available
- Shift + drag → text only
- Alt + drag → region only

### What if user accidentally selects?
**Solution:** Floating toolbar with Cancel
- Shows selection confirmation
- Allows undo before committing

### What if user wants to comment on same text twice?
**Solution:** Each comment is independent
- User can select same text multiple times
- Different comments, different positions in thread

### What if document changes and selections break?
**Solution:** Anchor persistence
- Annotator.js relocates text selectors
- Show warning if selector can't be found
- Offer manual re-selection

---

## Summary Table

| Approach | Seamless | Clear | Discoverable | Power User | Recommend |
|----------|----------|-------|--------------|------------|-----------|
| Auto-detect | ✅ | ⚠️ | ⚠️ | ❌ | Good |
| Explicit mode | ⚠️ | ✅ | ✅ | ❌ | Okay |
| Hover hints | ✅ | ✅ | ✅ | ❌ | Best |
| Floating toolbar | ✅ | ✅ | ✅ | ⚠️ | Very Good |
| Keyboard override | ✅ | ⚠️ | ❌ | ✅ | Add to other |
| **Combo (3+5)** | ✅ | ✅ | ✅ | ✅ | **Recommended** |

