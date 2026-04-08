# PDF Field Mapper — Architecture

## Overview

A client-side React/Vite application for visually mapping form fields onto a PDF document and stamping user-supplied values into it. No server. No AcroForm manipulation. The PDF is treated as a dumb background image; all field data is drawn as raw primitives.

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | React | 18.3 |
| Build tool | Vite | 6.0 |
| Styling | Tailwind CSS | 3.4 |
| Icons | lucide-react | 0.462 |
| PDF render | pdfjs-dist | 5.6 |
| PDF write | pdf-lib | 1.17 |

---

## File Structure

```
Pdf Filler/
├── index.html                  ← Google Fonts import (Syne, Figtree, IBM Plex Mono)
├── vite.config.js
├── tailwind.config.js          ← Custom design tokens (colors, fonts, shadows, animations)
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx                ← React root mount
    ├── index.css               ← Tailwind layers + custom CSS (dot-grid, ring pulse, shimmer)
    ├── App.jsx                 ← Root component: all state + all handler logic
    └── components/
        ├── PdfViewer.jsx       ← Left panel: canvas, field markers, pin popover, toolbar
        └── Sidebar.jsx         ← Right panel: field list, mock form, stamp button
```

---

## Component Tree

```
App (state owner)
├── PdfViewer                   60% width — dark canvas zone
│   ├── FieldMarker[]           absolute-positioned dot + tooltip per field
│   └── PinConfirmPopover       appears on canvas click; collects label + type
└── Sidebar                     40% width — light control panel
    ├── SectionHeader
    ├── FieldCard[]             one per mappedField; includes delete button
    ├── FieldInput[]            text input / checkbox / radio per field type
    └── Stamp button
```

All state lives in `App`. Components are pure receivers — they hold no state of their own and communicate only via callbacks passed as props.

---

## State

Defined in `App.jsx` with `useState`:

| Variable | Type | Purpose |
|---|---|---|
| `pdfFile` | `File \| null` | The uploaded PDF File object, kept for re-reading during stamping |
| `pdfDimensions` | `{ width: number, height: number }` | Canvas internal resolution after pdf.js renders; drives wrapper sizing |
| `mappedFields` | `Field[]` | All pinned fields with coordinates |
| `userInputs` | `Record<string, string \| boolean>` | Live form data keyed by field name |
| `pendingPin` | `{ x: number, y: number } \| null` | Temporary coordinates held between canvas click and pin confirmation |
| `newFieldLabel` | `string` | Controlled input for naming the pending pin |
| `newFieldType` | `'text' \| 'checkbox' \| 'radio'` | Type selector for the pending pin |

```ts
// Field shape
interface Field {
  id:       string                        // Date.now() string
  name:     string                        // user-supplied label
  type:     'text' | 'checkbox' | 'radio'
  browserX: number                        // canvas pixel X (= PDF point X at scale 1)
  browserY: number                        // canvas pixel Y from top (needs flip for PDF)
}
```

Two refs (`canvasRef`, `fileInputRef`) are forwarded to `PdfViewer` so `App`'s handlers can access the DOM directly.

---

## Data Flow

```
User selects file
  └─ handleFileUpload ──► setPdfFile, setPdfDimensions
                          writes pixels to canvasRef via pdf.js

User clicks canvas
  └─ handleCanvasClick ─► setPendingPin({ x, y })

User confirms pin label
  └─ handleConfirmPin ──► setMappedFields([...prev, newField])
                          setUserInputs({ ...prev, [name]: defaultValue })

User edits sidebar form
  └─ handleInputChange ─► setUserInputs({ ...prev, [name]: value })

User deletes field
  └─ handleDeleteField ─► setMappedFields(filtered)
                          setUserInputs(without deleted key)

User clicks Stamp
  └─ handleStampAndDownload ─► reads pdfFile → pdf-lib → drawText/drawCircle
                                → download blob
```

---

## Coordinate System

This is the most important piece of logic in the application.

### Two origins, two directions

| System | Origin | Y direction |
|---|---|---|
| Browser / Canvas (pdf.js) | Top-left `(0, 0)` | Increases **downward** |
| PDF document (pdf-lib) | Bottom-left `(0, 0)` | Increases **upward** |

Without correction, a stamp placed 180 px from the top of an 800 pt page would land 180 pt from the *bottom* — completely wrong.

### The flip formula

```
pdfY = page.getHeight() - field.browserY
```

Applied in `handleStampAndDownload` for every field before calling `drawText` / `drawCircle`.

### Scale correction on click

`getBoundingClientRect()` returns CSS pixel dimensions. If the browser has scaled the canvas element (e.g., the canvas is 600 px wide but displayed at 540 CSS px), raw offsets are wrong. Corrected in `handleCanvasClick`:

```js
const scaleX = canvas.width  / rect.width
const scaleY = canvas.height / rect.height
const browserX = (event.clientX - rect.left) * scaleX
const browserY = (event.clientY - rect.top)  * scaleY
```

At render `scale: 1`, canvas pixels are 1-to-1 with PDF points, so `browserX` flows directly into `drawText`'s `x` without further conversion.

### Full coordinate pipeline

```
mouse click (CSS px)
  ──► subtract rect offset
  ──► multiply by canvas/rect ratio     → canvas pixels = PDF points (scale 1)
  ──► store as field.browserX / browserY

on stamp:
  browserX  ─────────────────────────►  pdfX  (no change)
  browserY  ──► pageHeight - browserY ► pdfY  (Y-axis flip)
```

---

## PDF Libraries

### pdfjs-dist — rendering

- Used only in `handleFileUpload`
- Worker is configured at module level using Vite's `import.meta.url` URL resolution:
  ```js
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  ```
- Page is rendered at `scale: 1` (default). Increase to e.g. `1.5` for higher-res display.
- `pdfDimensions` state is synced from `viewport.width / viewport.height` after render.

### pdf-lib — writing

- Used only in `handleStampAndDownload`
- Loads a fresh `ArrayBuffer` from `pdfFile` each time (avoids detached buffer issues)
- Helvetica is embedded before any `drawText` call — pdf-lib throws without it
- `ignoreEncryption: true` is passed to `PDFDocument.load` so most read-only PDFs still open
- Drawing primitives used:

| Field type | Condition | pdf-lib call |
|---|---|---|
| `text` | value is non-empty | `page.drawText(value, { x, y, size: 12, font, color })` |
| `checkbox` | value is `true` | `page.drawText('X', { x, y, size: 14, font, color })` |
| `radio` | value is truthy | `page.drawCircle({ x, y, size: 4, color })` |

---

## Design System

### Colors (Tailwind custom tokens)

| Token | Hex | Usage |
|---|---|---|
| `canvas-bg` | `#0D1117` | Left panel background |
| `canvas-surface` | `#161B22` | Raised surfaces in viewer |
| `canvas-border` | `#21262D` | Borders in dark zone |
| `sidebar-bg` | `#FAF9F7` | Right panel background |
| `sidebar-surface` | `#FFFFFF` | Cards, inputs |
| `sidebar-border` | `#E8E6E1` | Dividers in light zone |
| `amber-500` | `#F59E0B` | Primary accent; stamp button |
| marker blue | `#3B82F6` | Text field dots |
| marker emerald | `#10B981` | Checkbox dots |
| marker purple | `#A855F7` | Radio dots |

### Typography

| Font | Weights | Usage |
|---|---|---|
| Syne | 600 / 700 / 800 | Headings, labels, button text |
| Figtree | 400 / 500 / 600 | Body copy, sidebar content |
| IBM Plex Mono | 400 / 500 | Coordinates, code, status bar |

All loaded from Google Fonts CDN in `index.html`.

### Custom CSS classes (`src/index.css`)

| Class | Effect |
|---|---|
| `.dot-grid` | 24 px radial-gradient dot grid on the canvas background |
| `.sidebar-scroll` | Thin 4 px scrollbar styling for the sidebar overflow region |
| `.marker-ring` | `ringPulse` keyframe — scales and fades the outer ring of field dots |
| `.amber-shimmer` | Animated gradient for the stamp button |

---

## Extension Points

| What to change | Where |
|---|---|
| Render scale (default `1`) | `handleFileUpload` — change `const scale = 1` |
| Multi-page support | `handleFileUpload` — add page selector state; `handleCanvasClick` — record page number per pin |
| Font choice | `handleStampAndDownload` — swap `StandardFonts.Helvetica` for an embedded custom font |
| Stamp color | `handleStampAndDownload` — change `rgb(0, 0, 0)` |
| Coordinate display units | `handleCanvasClick` — convert `browserX/Y` to inches: divide by 72 |
| Export field map as JSON | Add a button that calls `JSON.stringify(mappedFields)` and downloads as `.json` |
| Import field map | Parse saved JSON and call `setMappedFields` |
