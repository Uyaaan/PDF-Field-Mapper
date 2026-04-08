import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import PdfViewer from './components/PdfViewer'
import Sidebar from './components/Sidebar'

// ─── pdf.js worker (Vite-compatible ESM URL resolution) ──────────────────────
// new URL(..., import.meta.url) lets Vite bundle the worker as a static asset
// so it works correctly in both dev and production builds.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

// ─── Mock seed data so the UI is non-empty on first load ─────────────────────
const SEED_FIELDS = [
  { id: 'f1', name: 'First Name', type: 'text',     browserX: 142, browserY: 180 },
  { id: 'f2', name: 'Last Name',  type: 'text',     browserX: 380, browserY: 180 },
  { id: 'f3', name: 'Agreed',     type: 'checkbox', browserX: 88,  browserY: 520 },
  { id: 'f4', name: 'Plan',       type: 'radio',    browserX: 220, browserY: 620 },
]

export default function App() {
  // ─── Core State ─────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile]             = useState(null)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 600, height: 800 }) // updated by handleFileUpload after render
  const [mappedFields, setMappedFields]   = useState(SEED_FIELDS)
  const [userInputs, setUserInputs]       = useState({
    'First Name': 'John Doe',
    'Agreed': true,
    'Plan': 'Standard',
  })

  // ─── Pending field label (used when adding a new pin) ───────────────────────
  const [pendingPin, setPendingPin]       = useState(null) // { x, y } or null
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType]   = useState('text')

  const canvasRef   = useRef(null)
  const fileInputRef = useRef(null)

  // ──────────────────────────────────────────────────────────────────────────────
  // HANDLER IMPLEMENTATIONS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * handleFileUpload
   * Reads the selected PDF as an ArrayBuffer, parses it with pdf.js, renders
   * page 1 onto the <canvas> ref at scale=1, then syncs pdfDimensions state
   * so the canvas wrapper resizes to match the document exactly.
   */
  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    console.log('[handleFileUpload] File selected:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`)

    // Store the File object so the stamper can read it later
    setPdfFile(file)

    // Read file bytes — getDocument() accepts an ArrayBuffer directly
    const arrayBuffer = await file.arrayBuffer()

    // Parse with pdf.js (returns a LoadingTask; .promise resolves to PDFDocumentProxy)
    const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    console.log('[handleFileUpload] pdf.js parsed — pages:', pdfDocument.numPages)

    // Grab page 1 (pdf.js pages are 1-indexed)
    const page = await pdfDocument.getPage(1)

    // scale: 1 → 1 canvas pixel = 1 PDF point (72 points per inch)
    // Increase scale (e.g. 1.5) if the PDF needs to appear larger on screen.
    const scale    = 1
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    canvas.width  = viewport.width
    canvas.height = viewport.height

    // Sync state so the wrapper <div> and field-marker positioning are correct
    setPdfDimensions({ width: viewport.width, height: viewport.height })

    // Render the page into the canvas
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    console.log('[handleFileUpload] Page rendered —', viewport.width, '×', viewport.height, 'px')
  }

  /**
   * handleCanvasClick
   * Captures the click position relative to the canvas element.
   *
   * SCALE CORRECTION: getBoundingClientRect() returns the canvas's *CSS* pixel
   * size, which may differ from its internal resolution (canvas.width/height).
   * Multiplying by (canvas.width / rect.width) maps CSS pixels → canvas pixels,
   * which at scale=1 rendering equals PDF points 1-to-1.
   *
   * The corrected browserX/Y are stored directly and reused as PDF coordinates
   * during stamping (after the Y-axis flip described in handleStampAndDownload).
   */
  function handleCanvasClick(event) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // CSS → canvas pixel space correction
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height

    const browserX = (event.clientX - rect.left) * scaleX
    const browserY = (event.clientY - rect.top)  * scaleY

    console.log('[handleCanvasClick] Coords — canvas px (= PDF pts at scale 1):', { browserX: Math.round(browserX), browserY: Math.round(browserY) })

    setPendingPin({ x: browserX, y: browserY })
  }

  /**
   * handleStampAndDownload
   * Loads the original PDF bytes into pdf-lib, draws primitives at each mapped
   * field's coordinate, then triggers a browser download.
   *
   * ── Y-AXIS FLIP EXPLANATION ──────────────────────────────────────────────────
   * Web browsers (and pdf.js canvas rendering) place the origin (0, 0) at the
   * TOP-LEFT corner of the page.  Y increases DOWNWARD.
   *
   * PDF coordinate space (per the ISO 32000 spec, used by pdf-lib) places the
   * origin at the BOTTOM-LEFT corner of the page.  Y increases UPWARD.
   *
   * So a dot that appears 180 px from the top of a 792 pt tall page lives at:
   *   browser Y = 180   →   pdf Y = 792 − 180 = 612
   *
   * General formula:   pdfY = firstPage.getHeight() − field.browserY
   *
   * Without this flip, every stamp would appear mirrored vertically — text meant
   * for the top of the page would land near the bottom and vice-versa.
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async function handleStampAndDownload() {
    if (!pdfFile || mappedFields.length === 0) return
    console.log('[handleStampAndDownload] Stamping fields:', mappedFields)
    console.log('[handleStampAndDownload] With inputs:', userInputs)

    // Read a fresh ArrayBuffer — never reuse a previously-consumed one
    const existingPdfBytes = await pdfFile.arrayBuffer()

    // Load into pdf-lib (ignoreEncryption: true handles most read-only PDFs)
    const pdfDoc   = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true })
    const firstPage = pdfDoc.getPages()[0]
    const pageHeight = firstPage.getHeight()

    // Embed Helvetica — pdf-lib requires an embedded font before drawText
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    for (const field of mappedFields) {
      const rawInput = userInputs[field.name]

      // ── THE Y-AXIS FLIP ──────────────────────────────────────────────────────
      // browserY is measured from the top; PDF Y is measured from the bottom.
      const pdfX =  field.browserX
      const pdfY =  pageHeight - field.browserY
      // ─────────────────────────────────────────────────────────────────────────

      console.log(`[stamp] "${field.name}" type=${field.type} browserY=${Math.round(field.browserY)} → pdfY=${Math.round(pdfY)}`)

      if (field.type === 'text') {
        const text = String(rawInput ?? '')
        if (!text) continue
        firstPage.drawText(text, {
          x:    pdfX,
          y:    pdfY,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        })
      }

      else if (field.type === 'checkbox') {
        // Only stamp an "X" when the checkbox is checked
        if (!rawInput) continue
        const fontSize = 14
        // Center the "X" on the marker dot (marker is placed at the checkbox center)
        const centerOffsetX = font.widthOfTextAtSize('X', fontSize) / 2
        const centerOffsetY = fontSize * 0.35
        firstPage.drawText('X', {
          x:    pdfX - centerOffsetX,
          y:    pdfY - centerOffsetY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      }

      else if (field.type === 'radio') {
        // Only stamp the filled circle when a value is selected
        if (!rawInput) continue
        firstPage.drawCircle({
          x:           pdfX,
          y:           pdfY,
          size:        4,              // radius in PDF points
          color:       rgb(0, 0, 0),
          borderWidth: 0,
        })
      }
    }

    // Serialize to bytes and trigger download
    const pdfBytes = await pdfDoc.save()
    const blob     = new Blob([pdfBytes], { type: 'application/pdf' })
    const url      = URL.createObjectURL(blob)

    const anchor       = document.createElement('a')
    anchor.href        = url
    anchor.download    = 'stamped_document.pdf'
    anchor.click()

    // Clean up the object URL after the download is initiated
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    console.log('[handleStampAndDownload] Download triggered.')
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  function handleConfirmPin() {
    if (!newFieldLabel.trim() || !pendingPin) return
    const newField = {
      id: `f${Date.now()}`,
      name: newFieldLabel.trim(),
      type: newFieldType,
      browserX: pendingPin.x,
      browserY: pendingPin.y,
    }
    setMappedFields(prev => [...prev, newField])
    setUserInputs(prev => ({ ...prev, [newField.name]: newField.type === 'checkbox' ? false : '' }))
    setPendingPin(null)
    setNewFieldLabel('')
    setNewFieldType('text')
    console.log('[handleConfirmPin] Added field:', newField)
  }

  function handleCancelPin() {
    setPendingPin(null)
    setNewFieldLabel('')
    setNewFieldType('text')
  }

  function handleDeleteField(id) {
    const field = mappedFields.find(f => f.id === id)
    setMappedFields(prev => prev.filter(f => f.id !== id))
    if (field) {
      setUserInputs(prev => {
        const next = { ...prev }
        delete next[field.name]
        return next
      })
    }
    console.log('[handleDeleteField] Removed field id:', id)
  }

  function handleInputChange(fieldName, value) {
    setUserInputs(prev => ({ ...prev, [fieldName]: value }))
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas-bg font-figtree">
      {/* ── Left: Canvas Viewer (60%) ── */}
      <PdfViewer
        canvasRef={canvasRef}
        fileInputRef={fileInputRef}
        pdfFile={pdfFile}
        pdfDimensions={pdfDimensions}
        mappedFields={mappedFields}
        pendingPin={pendingPin}
        newFieldLabel={newFieldLabel}
        newFieldType={newFieldType}
        onFileUpload={handleFileUpload}
        onCanvasClick={handleCanvasClick}
        onNewFieldLabel={setNewFieldLabel}
        onNewFieldType={setNewFieldType}
        onConfirmPin={handleConfirmPin}
        onCancelPin={handleCancelPin}
      />

      {/* ── Right: Sidebar Dashboard (40%) ── */}
      <Sidebar
        mappedFields={mappedFields}
        userInputs={userInputs}
        pdfFile={pdfFile}
        onDeleteField={handleDeleteField}
        onInputChange={handleInputChange}
        onStampAndDownload={handleStampAndDownload}
        onOpenFilePicker={() => fileInputRef.current?.click()}
      />
    </div>
  )
}
