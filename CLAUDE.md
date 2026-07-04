# CLAUDE.md — AppShotDeck

## What this is

AppShotDeck is a browser-only marketing screenshot composer for Play Store and App Store. No backend. Slide configs live in localStorage via Zustand persist. Screenshots live in IndexedDB. Export is DOM → PNG via html-to-image + WebGL compositing for 3D frames.

## Dev commands

```bash
npm run dev       # start dev server (Vite, port 5173)
npm run build     # tsc + vite build → dist/
npm run lint      # eslint
```

## Key architecture

### Frame system (`src/data/frames.ts`)

Two frame types, distinguished by whether `device3d` is present on the `FrameDef`:

- **Flat frames** (`outerRx` + optional `bezel`) — rendered via nested CSS divs in `SlideCanvas.tsx`.
- **3D frames** (`device3d: Device3DSpec`) — rendered via `Device3D.tsx` (WebGL). Body = `ExtrudeGeometry`, screen = `ShapeGeometry` with manually normalized UVs.

### SlideCanvas (`src/components/Canvas/SlideCanvas.tsx`)

- Always renders at full export resolution (e.g. 1080×1920). CSS `transform: scale()` shrinks it for preview.
- Branches on `frame.device3d` to choose flat CSS vs `<Device3D>`.
- `vbW` = viewBox width parsed from `frameViewBox` string — used to convert outerRx / bezelWidth from viewBox units to pixel units.
- `deviceScaleFactor = (slide.deviceScale ?? 100) / 100` — scales both slot dimensions uniformly.
- Portrait device Y: `Math.round((H - dSlotH) / 2) + Math.round(H * deviceOffset / 100)`. **0 = canvas center**, +30 = default layout position (below center).
- Landscape device X: same center-based formula using W. 0 = canvas center, +16 = default column position.
- Font sizes scale with canvas width: headline = `W * 0.063` (portrait) / `W * 0.036` (landscape), then multiplied by `headlineFontSize / 100`.
- Text shadow blur = `Math.round(W * 0.025)`. Color: dark bg → white glow, light bg → dark shadow (luminance from bg `from`/`color` hex).

### Device3D (`src/components/Canvas/Device3D.tsx`)

Critical details for the 3D renderer:

- `flat` prop on `<Canvas>` is **required** — sets `gl.toneMapping = NoToneMapping`. Removing it triggers ACESFilmic which darkens the screenshot color.
- ExtrudeGeometry with `depth=0.068, bevel=0.016`: body mesh at z=-(depth/2) → world z range [-0.050, +0.050]. Screen mesh must be at z > 0.050 → currently `depth/2 + bevel + 0.001 = 0.051`. **Do not move screen behind the body bevel tip** — transparent body renders after opaque screen and will overdraw it.
- `SizeEnforcer` compares `el.width !== Math.round(w * dpr)` (device pixels). Required to avoid infinite resize loop on retina.
- `preserveDrawingBuffer: true` — required so `toDataURL()` works for export.

### Export (`src/utils/export.ts`)

- For **flat frames**: `html-to-image` (`toPng`) captures the full-res DOM element directly.
- For **3D frames**: WebGL content can't be captured by html-to-image. Fix: call `webglCanvas.toDataURL()` first (before html-to-image runs), then composite it on top of the DOM PNG using a `<canvas>` + `drawImage()`. Position is derived from `getBoundingClientRect()` divided by the CSS scale factor.
- **Callouts + 3D frames**: the WebGL frame is drawn *over* the whole DOM capture, which would bury any zoom bubble overlapping the device. Fix: the bubbles are wrapped in a `[data-callout-layer]` div (`CalloutLayer.tsx`) and re-captured/re-drawn on top of the WebGL composite in `captureElement`. Flat frames don't hit this path (single DOM capture preserves stacking).
- **Critical**: the hidden export container in `App.tsx` must NOT use `visibility: hidden` — it's an inherited CSS property and makes html-to-image capture blank PNGs. Use `left: -9999px` only.
- **File naming / ordering** (`buildEntries` in `Header.tsx`): slides are numbered **per format**, zero-padded — `slide-01`, `slide-02`, … within each `<format-folder>`. The counter resets per format (`perFormatCount`), so a project mixing phone + tablet slides gets `phone/slide-01…` and `tablet-7/slide-01…` independently, not a global stride.
- **`addEntriesToZip(zip, entries, prefix?)` / `downloadZip(zip, name)`**: reusable helpers. `exportAll` wraps them for single-language export. "Export all languages" (`handleExportAll` in `Header.tsx`) builds **one** ZIP with per-language folders — `en/android/phone/…`, `es/android/phone/…` — by looping languages, `flushSync`-ing `exportLanguage`, and calling `addEntriesToZip` with the lang as prefix. Single-language exports still produce their own ZIP.

### Project save/load (`src/utils/project.ts`)

- Saves as ZIP: `config.json` (all slide settings) + `images/<id>.png` (one file per slide screenshot).
- Screenshots stored as real PNG files, not base64 in JSON.
- On load (`handleLoad` in Header.tsx): screenshots from ZIP are saved to IndexedDB immediately so they survive refreshes.

### Workspace save/load (`src/utils/workspace.ts`)

- Saves ALL projects as one ZIP: `workspace.json` + `images/{projectId}/{slideId}.png`.
- `workspace.json` schema: `{ version: 1, projects: [{ id, name, createdAt, slides: SlideConfig[], activeSlideId }] }` — each slide has an extra `image` field pointing to its PNG path in the ZIP.
- On save: active project uses live `slides` state; non-active projects use their stored `SlideConfig[]` from the Zustand store. All screenshots fetched from IndexedDB via `getScreenshot`.
- On load (`handleLoadAll` in Header.tsx): checks for ID conflicts. No conflicts → imports immediately. Conflicts → shows `WorkspaceImportDialog` with Skip/Replace choice.
- `doImportWorkspace(loadedProjects, replace)` — module-level function (not a hook) that writes to the store directly via `useEditorStore.setState`. Handles replacing the active project's live slides if it was among the replaced ones.

### Screenshot storage (`src/utils/db.ts`)

- IndexedDB database `appshotdeck`, object store `screenshots`.
- Keys: `${projectId}/${slideId}`.
- `saveScreenshot`, `getScreenshot`, `deleteScreenshot`, `copyScreenshot`, `deleteProjectScreenshots` — all async.
- `deleteProjectScreenshots` uses `openCursor()` to find all keys with prefix `${projectId}/`.

### State (`src/store/useEditorStore.ts`)

- Zustand with `persist` middleware → localStorage.
- `partialize` strips `screenshotDataUrl` from slides before persisting. Only configs go to localStorage.
- `onRehydrateStorage`: async — fetches screenshots from IndexedDB after hydration. Handles v1→v2 migration (old `slides` array at top level with inline base64).
- Key slide fields: `format`, `frame`, `frameTilt`, `background`, `headline`, `subtitle`, `textColor`, `subtitleColor`, `textPosition`, `deviceOffset`, `deviceScale`, `showHeadline`, `showSubtitle`, `headlineFontFamily`, `headlineFontWeight`, `headlineFontSize`, `subtitleFontFamily`, `subtitleFontWeight`, `subtitleFontSize`, `textAlign`, `textShadow`.
- `textShadow`: `'off' | 'dark' | 'light'` — default `'off'`.
- `textAlign`: `'left' | 'center' | 'right'` — default `'center'`.
- Font sizes: `headlineFontSize` / `subtitleFontSize` — percentage multiplier (60–140), default 100.
- Font weights: `headlineFontWeight` default 700, `subtitleFontWeight` default 400.
- Font families: `headlineFontFamily` / `subtitleFontFamily` — default `'Inter'`. Available: Inter, Poppins, Montserrat, Nunito, Space Grotesk (all via @fontsource, latin subset only, weights 300/400/600/700).
- Always add `?? default` fallbacks when reading new fields in components — old persisted slides won't have them.
- `applyToAllSlides(patch)` — merges patch into every slide in the active project.

### FramePanel device controls (`src/components/Sidebar/FramePanel.tsx`)

- **Pos slider** (-30 to +30): vertical offset for portrait (phones/iPad), horizontal for landscape (tablets). 0 = canvas center.
- **Size slider** (60–100%): scales device slot uniformly.
- **Center button**: sets deviceOffset = 0. `AlignCenterVertical` for portrait, `AlignCenterHorizontal` for landscape.
- **Reset button**: restores default offset (30 for phones/iPad, 16 for tablets).
- `DEFAULT_OFFSET` map drives reset values. `RESIZABLE_FORMATS` and `PORTRAIT_PHONE_FORMATS` sets control which controls appear.

### Multi-project (`src/components/Header.tsx`)

- Project switcher: colored pill button (color derived from hash of project ID mod palette) opens dropdown.
- Dropdown: lists all projects with color dot + checkmark for active. Rename (pencil) and delete (trash) per project.
- Delete project shows `ConfirmDialog` before calling `deleteProject`.
- Project names are included in export ZIP filenames: `${name}-screenshots.zip` and `appshotdeck-${name}.zip`.
- **Save / Load** buttons are dropdowns: Save Project / Save All Projects and Load Project / Load All Projects.
- Errors use `useToastStore.getState().addToast(msg, 'error')` — never `alert()`.

### Toast notifications (`src/store/useToastStore.ts`, `src/components/ToastContainer.tsx`)

- Zustand store (no persist). `addToast(message, type?)` — auto-dismisses after 4s, caps at 3 visible toasts.
- Types: `'error'` (red) | `'success'` (green) | `'info'` (dark). Default: `'info'`.
- `<ToastContainer />` is rendered at the root in `App.tsx`. Positioned `top-4 right-4` (above the slide strip).
- Call from anywhere via `useToastStore.getState().addToast(...)` — no hook required outside React components.

### Tooltip (`src/components/Tooltip.tsx`)

- Renders an `ⓘ` icon (Info, 13px) with `ml-1` left margin. Shows a popover on hover with a small arrow.
- `side` prop: `'top-start'` (default, left-aligns to icon — for sidebar labels), `'top-end'` (right-aligns — for centered buttons like Apply to all), `'top-center'`, `'bottom-start'`.
- Used in FramePanel (Pos, Size, Tilt labels), BackgroundPanel (Apply to all), TextPanel (Apply to all).

### Zoom Callouts (`src/components/Canvas/CalloutLayer.tsx`, `src/components/Sidebar/CalloutPanel.tsx`)

- **State**: `callouts: Callout[]` on each `Slide`. Max 3 per slide. Persisted to localStorage via `SlideConfig`.
- **Callout fields**: `selX/Y/W/H` (% of slot), `bubbleX/Y` (% of canvas, center), `bubbleSize` (% of canvas width), `shape: 'circle'|'rect'`, `showLine: boolean`.
- **Creating**: Full-canvas transparent overlay (`zIndex: 35`) detects mouse position. Crosshair cursor only when hovering over the slot. Drag creates a selection rect; on mouseup creates a `Callout` with `bubbleX/Y: 50` (canvas center).
- **Moving**: `onMouseDown` hit-tests all bubbles in reverse order (topmost first). If hit → starts `bubbleDragRef` drag via `window` listeners. `useEditorStore.getState()` reads fresh state inside the listener to avoid stale closures.
- **Rendering (zoom bubble)**: Auto-fit zoom = `bubW / selPixW`. The screenshot `<img>` is positioned at `imgLeft = bubW/2 - selCenterX * effectiveZoom` to center the selection in the bubble. `maxWidth: 'none'` overrides Tailwind's global `max-width: 100%` which would otherwise kill the zoom. Rect shape: `bubH = bubD / selAspect` so the bubble matches the selection's aspect ratio.
- **Selection**: `selectedId` state in `CalloutLayer`. Click bubble → select (indigo inset ring). Click outside overlay or outside canvas (document `mousedown` listener) → deselect. `Delete`/`Backspace` with `stopImmediatePropagation` (capture phase) removes selected callout without triggering slide deletion in `App.tsx`.
- **Export**: `interactive={false}` on hidden export canvases skips the overlay but renders bubbles normally. `html-to-image` captures them as DOM elements.
- **Panel controls**: Shape toggle, size slider (40–90%), and per-callout center-H / center-V / center-both buttons.

### HelpPanel (`src/components/HelpPanel.tsx`)

- Slide-in panel from the right. Fixed position, full height, `w-72`, `z-50`. Backdrop closes it.
- Opened via `HelpCircle` button in the header (next to the theme toggle).
- Sections: Getting Started (4 steps), Keyboard Shortcuts (← →, ⌘D, ⌫), Pro Tips (4 items).
- Detects Mac vs Windows via `navigator.platform` to show `⌘` or `Ctrl`.

### Keyboard shortcuts (`src/App.tsx`)

- `←` / `→` — navigate between slides (suppressed when typing in input/textarea).
- `Cmd+D` / `Ctrl+D` — duplicate active slide.
- `Delete` / `Backspace` — opens `ConfirmDialog` to remove active slide (only if >1 slide, suppressed when typing).

### ConfirmDialog (`src/components/ConfirmDialog.tsx`)

- Reusable modal with backdrop click to cancel, Cancel and red Remove buttons.
- Used for slide deletion (keyboard) and project deletion (header dropdown).

## Format configs (SlideCanvas.tsx)

| Format | Canvas W×H | Slot W×H | ViewBox W |
|---|---|---|---|
| phone | 1080×1920 | 780×1686 | 390 |
| iphone-69 | 1320×2868 | 990×2148 | 393 |
| iphone-65 | 1242×2688 | 930×2020 | 393 |
| ipad-13 | 2048×2732 | 1440×1897 | 820 |
| tablet-7 | 1920×1080 | 1000×625 | 960 |
| tablet-10 | 2560×1440 | 1360×850 | 960 |

### Slide Translations (`src/utils/translate.ts`, `src/components/AddLanguageDialog.tsx`, `src/components/Sidebar/TranslationsSection.tsx`)

- **Data model**: each `Slide` has `textVariants?: Record<string, TextVariant>`. `TextVariant` = `{ headline, subtitle, status, fromHeadline?, fromSubtitle? }`. `status`: `'ok' | 'empty' | 'error' | 'stale'`.
- `fromHeadline`/`fromSubtitle` store the EN source text at translation time — used to auto-clear `stale` when the user restores the original text.
- **Store fields** (top-level, per-project): `languages: string[]`, `activeLanguage: string`, `protectedWords: string[]`. All saved into `ProjectMeta` and restored on `switchProject`/`createProject`.
- **API**: MyMemory free REST (`https://api.mymemory.translated.net/get?q=...&langpair=en|{to}&de={email}`). No key required; `de=email` doubles daily limit (500→1000 words). Quota detected via `data.quotaFinished === true` → shows `QuotaDialog`.
- **Protected words**: tokenized before sending (`XPROT0X`, `XPROT1X`, …), restored after. Case-insensitive match. Stored as `string[]` in store — chips UI in `TranslationsSection`.
- **Stale detection**: editing EN headline/subtitle calls `markVariantsStale` unless the new value matches `variant.fromHeadline` → then calls `updateTextVariant(..., { status: 'ok' })` to restore.
- **Canvas preview**: `activeLanguage` controls which text `displaySlide` shows in the main canvas. Language switcher dropdown (`LangDropdown`) always visible above canvas; `+` button opens `AddLanguageDialog`.
- **Export**: `exportLanguage` state in `App.tsx` controls what `HiddenExportCanvases` renders. Uses `flushSync` to force re-render before `html-to-image` captures. Export button becomes dropdown when `languages.length > 0`: per-language + "Export all languages".
- **Email storage key**: `appshotdeck-translate-email` in localStorage.

### Multi-language Screenshot Variants (`src/components/Canvas/ReplaceButton.tsx`, `src/utils/db.ts`)

- **Storage**: Per-language custom screenshots stored in IndexedDB with composite keys `${projectId}/${slideId}/${language}`. Falls back to EN screenshot if language variant is unavailable.
- **Replace button**: Persistent button below canvas (in `App.tsx`) lets users quickly replace the active language's screenshot. Updates EN screenshot directly if `activeLanguage === 'en'`, otherwise calls `updateSlideVariantScreenshot()` to save language variant.
- **UI indicators**: 
  - Language label below Replace/Export buttons shows which language variant is being replaced (e.g., "ES · Español · Spanish").
  - Language dropdown shows asterisk (*) for languages with custom screenshots (e.g., "ES · Español * Spanish").
  - Label always visible (never disappears on language switch) to prevent layout jumps.
- **Export**: `HiddenExportCanvases` reads `screenshotVariants?.[exportLanguage]` and uses it if available, otherwise falls back to EN screenshot.

## Save / Load checklist

After every feature that adds new slide fields, project-level fields, or screenshot storage, verify:

1. **Save Project** (`saveProject` in `src/utils/project.ts`) — new fields included in `ProjectConfig` and written to ZIP.
2. **Load Project** (`loadProject` + `handleLoad` in `Header.tsx`) — new fields read back from ZIP and restored into store state AND `projects` list.
3. **Save Workspace** (`saveWorkspace` in `src/utils/workspace.ts`) — new fields included in `WorkspaceProject` and written to ZIP.
4. **Load Workspace** (`loadWorkspace` + `doImportWorkspace` in `Header.tsx`) — new fields read back and restored for all projects, including the active one.
5. **Old ZIPs** — missing fields must fall back gracefully (`?? default`), never throw.

Fields that must round-trip through both formats: `languages`, `protectedWords`, `textVariants` (per slide), `screenshotVariants` / `imageVariants` (per slide per lang), `activeSlideId`.

### Compatibility rules

Every schema change must be backward AND forward compatible:

- **Old ZIP → new code (backward compat)**: new code must load ZIPs saved before the feature existed. Always use `?? default` when reading any field. Never assume a field is present. Test by loading a ZIP produced by the previous version.
- **New ZIP → old code (forward compat)**: old code loading a newer ZIP should degrade gracefully — unknown fields are ignored, known fields still work. Achieve this by only adding fields, never renaming or removing them.
- **Zustand localStorage (backward compat)**: persisted state from before the feature has no new fields. `onRehydrateStorage` and any component reading new store fields must use `?? default` fallbacks.
- **Do not use a `version` check as the only guard** — fields can be missing from same-version ZIPs too (e.g. optional fields). Always guard every field individually.
- **`PROJECT_VERSION`** in `project.ts` — bump when the `ProjectConfig` schema changes so old ZIPs can be detected.
- **Zustand `partialize`** in `useEditorStore.ts` — new slide fields that are runtime-only (like `screenshotDataUrl`, `screenshotVariants`) must be stripped before localStorage persist; new fields that should survive refresh must be left in.
- **`onRehydrateStorage`** in `useEditorStore.ts` — new top-level store fields need a default here for users upgrading from old localStorage data.
- **`switchProject`** in `useEditorStore.ts` — new project-level fields must be saved to the outgoing project and restored from the incoming one.
- **`duplicateSlide`** in `useEditorStore.ts` — new slide fields must be copied into the duplicate (and new screenshot variants must be copied in IndexedDB via `copyScreenshot`/`copyScreenshotVariants`).
- **Export** (`HiddenExportCanvases` in `App.tsx`) — new per-language visual data must be applied when `exportLanguage` is set.

## Conventions

- No comments unless the WHY is non-obvious.
- Prefer editing existing files over creating new ones.
- Tailwind CSS v3 (not v4) — `tailwind.config.ts` is present.
- **i18n is mandatory** — every user-visible string (button labels, placeholders, titles, tooltips, error messages, helper text) must use `t()` from `react-i18next`. Never hardcode text in JSX. Always add the key to **both** `src/locales/en/translation.json` and `src/locales/es/translation.json` at the same time. For JSX with embedded links/components use `<Trans i18nKey="..." components={{ ... }} />`. Components that don't already import `useTranslation` must add it.
- Background presets: `GRADIENT_PRESETS` (dark), `LIGHT_GRADIENT_PRESETS` (light), `SOLID_PRESETS` in `src/data/backgrounds.ts`.
