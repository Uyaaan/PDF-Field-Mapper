# CLAUDE.md — PDF Field Mapper

## Project Summary

A fully client-side React/Vite app for coordinate-based PDF form stamping. The user loads a PDF, clicks the canvas to pin named fields, fills in values, and downloads a stamped copy. No server, no AcroForms — all drawing is done with raw pdf-lib primitives.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design document.

---

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → /dist
npm run preview   # serve /dist locally
```

---

## Key Files

| File | Role |
|---|---|
| [src/App.jsx](src/App.jsx) | All state, all handler logic — the only place that touches PDF libraries |
| [src/components/PdfViewer.jsx](src/components/PdfViewer.jsx) | Left panel: canvas, field dot overlays, pin popover |
| [src/components/Sidebar.jsx](src/components/Sidebar.jsx) | Right panel: field list, live form, stamp button |
| [src/index.css](src/index.css) | Tailwind layers + custom keyframes and utility classes |
| [tailwind.config.js](tailwind.config.js) | All custom design tokens (colors, fonts, shadows, animations) |

---

## Architecture Constraints

**Single state owner.** All `useState` lives in `App.jsx`. Components are props-only — no local state, no context, no Zustand. Keep it this way unless the component tree grows significantly deeper.

**No AcroForm manipulation.** Do not call `pdfDoc.getForm()`, `getTextField()`, or any pdf-lib AcroForm API. The PDF is treated as a background image. All field values are drawn as raw text/shapes.

**No server.** Everything runs in the browser. `pdfFile.arrayBuffer()` is called fresh each time the stamper runs to avoid detached buffer errors — do not cache it.

---

## The Y-Axis Flip (Critical)

Every time you draw to the PDF, this conversion is required:

```js
// In handleStampAndDownload:
const pdfY = firstPage.getHeight() - field.browserY
```

- **Browser / canvas:** Y=0 is top-left, increases downward
- **PDF (pdf-lib):** Y=0 is bottom-left, increases upward

Without this flip, stamps appear mirrored vertically.

---

## Coordinate Pipeline

```
mouse click (CSS px)
  └─ subtract getBoundingClientRect() offset
  └─ multiply by (canvas.width / rect.width)   ← corrects CSS-vs-canvas scale
  └─► stored as field.browserX / browserY      ← canvas pixels = PDF points at scale 1

on stamp:
  pdfX = field.browserX
  pdfY = page.getHeight() - field.browserY
```

The render scale is `1` (set in `handleFileUpload`). At scale 1, one canvas pixel equals one PDF point (1/72 inch). If you change the render scale, the click-coordinate math must be updated accordingly.

---

## Adding Features

### Support more field types
1. Add the new type to the union in `newFieldType` state and the `PinConfirmPopover` buttons
2. Add a rendering branch in `handleStampAndDownload`
3. Add a new `FieldInput` branch in `Sidebar.jsx`
4. Add a color entry to `TYPE_COLORS` in `PdfViewer.jsx` and `TYPE_CONFIG` in `Sidebar.jsx`

### Multi-page PDFs
1. Add `currentPage` state (number, default 1) in `App.jsx`
2. Add a page number field to the `Field` type
3. In `handleFileUpload`, expose `pdfDocument.numPages` and allow page switching
4. Re-render the canvas when `currentPage` changes
5. In `handleStampAndDownload`, group fields by page and draw to the correct page index

### Save / load a field map
```js
// Save
const json = JSON.stringify(mappedFields)
// restore
setMappedFields(JSON.parse(savedJson))
```
Wire to Import/Export buttons in the sidebar.

### Higher-resolution rendering
Change `const scale = 1` in `handleFileUpload` to e.g. `1.5`. The stamper math is unaffected because it reads `page.getHeight()` directly from the PDF — it does not use the canvas scale.

---

## pdf.js Worker

Configured once at module scope in `App.jsx`:

```js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href
```

`new URL(..., import.meta.url)` is Vite's approved pattern for bundling static workers. Do not change this to a bare string path — it will break in production builds.

---

## Design Tokens

All tokens are in [tailwind.config.js](tailwind.config.js). Use them via Tailwind classes; do not hardcode hex values in components.

| Group | Prefix | Zone |
|---|---|---|
| Dark canvas zone | `canvas-*` | Left panel |
| Light sidebar zone | `sidebar-*` | Right panel |
| Accent | `amber-{400,500,600}` | Buttons, active states |
| Field markers | `marker-*` | Dot overlays on canvas |

---

## Do Not

- Do not install additional PDF libraries — the `pdfjs-dist` + `pdf-lib` split (render vs. write) is intentional and sufficient
- Do not move state out of `App.jsx` into components without a clear reason
- Do not use `window.prompt` for pin labeling — the `PinConfirmPopover` component already handles this inline
- Do not alter `className` strings on existing components without checking `tailwind.config.js` for custom token names first
- Do not call `pdfFile.arrayBuffer()` more than once per operation and then reuse the result — `ArrayBuffer` is consumed after transfer
