import { useState, useRef } from 'react'
import PdfViewer from './components/PdfViewer'
import Sidebar from './components/Sidebar'

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
  const [pdfDimensions, setPdfDimensions] = useState({ width: 600, height: 800 })
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

  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // ──────────────────────────────────────────────────────────────────────────────
  // HANDLER STUBS — wire up the real logic here
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * handleFileUpload
   * Triggered when the user selects a PDF via the file input.
   * TODO: Load the file with pdf.js, render first page to <canvas>,
   *       and capture pdfDimensions from the viewport.
   */
  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    console.log('[handleFileUpload] File selected:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`)
    setPdfFile(file)
    // TODO: inject pdf.js rendering logic here
    // Example:
    //   const url = URL.createObjectURL(file)
    //   const pdf = await pdfjsLib.getDocument(url).promise
    //   const page = await pdf.getPage(1)
    //   const viewport = page.getViewport({ scale: 1 })
    //   setPdfDimensions({ width: viewport.width, height: viewport.height })
    //   const ctx = canvasRef.current.getContext('2d')
    //   await page.render({ canvasContext: ctx, viewport }).promise
  }

  /**
   * handleCanvasClick
   * Fires on every click of the canvas surface.
   * Native mouse coordinates are captured relative to the canvas element.
   * TODO: Convert browser coords → PDF coordinate space using pdfDimensions.
   */
  function handleCanvasClick(event) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const browserX = event.clientX - rect.left
    const browserY = event.clientY - rect.top

    console.log('[handleCanvasClick] Coords — browser:', { browserX, browserY })
    // TODO: convert to PDF-space:
    //   const pdfX = (browserX / rect.width)  * pdfDimensions.width
    //   const pdfY = (browserY / rect.height) * pdfDimensions.height
    //   console.log('[handleCanvasClick] Coords — pdf:', { pdfX, pdfY })

    setPendingPin({ x: browserX, y: browserY })
  }

  /**
   * handleStampAndDownload
   * Reads userInputs, overlays them at their mapped coordinates on the PDF,
   * then triggers a browser download of the stamped PDF.
   * TODO: inject pdf-lib logic here.
   */
  function handleStampAndDownload() {
    console.log('[handleStampAndDownload] Stamping fields:', mappedFields)
    console.log('[handleStampAndDownload] With inputs:', userInputs)
    // TODO: inject pdf-lib stamping logic here
    // Example:
    //   const existingPdfBytes = await pdfFile.arrayBuffer()
    //   const pdfDoc = await PDFDocument.load(existingPdfBytes)
    //   const page = pdfDoc.getPages()[0]
    //   mappedFields.forEach(field => {
    //     page.drawText(String(userInputs[field.name] ?? ''), {
    //       x: field.pdfX, y: field.pdfY, size: 12,
    //     })
    //   })
    //   const bytes = await pdfDoc.save()
    //   const blob = new Blob([bytes], { type: 'application/pdf' })
    //   const url = URL.createObjectURL(blob)
    //   const a = document.createElement('a'); a.href = url; a.download = 'stamped.pdf'; a.click()
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
