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
- **Critical**: the hidden export container in `App.tsx` must NOT use `visibility: hidden` — it's an inherited CSS property and makes html-to-image capture blank PNGs. Use `left: -9999px` only.

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

## Conventions

- No comments unless the WHY is non-obvious.
- Prefer editing existing files over creating new ones.
- Tailwind CSS v3 (not v4) — `tailwind.config.ts` is present.
- i18n via react-i18next — add new strings to both `src/locales/en/translation.json` and `src/locales/es/translation.json`.
- Background presets: `GRADIENT_PRESETS` (dark), `LIGHT_GRADIENT_PRESETS` (light), `SOLID_PRESETS` in `src/data/backgrounds.ts`.
