import { Upload, MapPin, CheckCircle, XCircle, MousePointerClick } from 'lucide-react'

// ─── Field type badge colors ──────────────────────────────────────────────────
const TYPE_COLORS = {
  text:     { dot: '#3B82F6', ring: 'rgba(59,130,246,0.3)',  label: 'bg-blue-600'  },
  checkbox: { dot: '#10B981', ring: 'rgba(16,185,129,0.3)',  label: 'bg-emerald-600' },
  radio:    { dot: '#A855F7', ring: 'rgba(168,85,247,0.3)',  label: 'bg-purple-600' },
}

// ─── Single field marker overlay ─────────────────────────────────────────────
function FieldMarker({ field }) {
  const colors = TYPE_COLORS[field.type] ?? TYPE_COLORS.text
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-default select-none z-10"
      style={{ top: field.browserY, left: field.browserX }}
    >
      {/* Outer pulse ring */}
      <span
        className="marker-ring absolute inset-0 rounded-full"
        style={{
          width: 20, height: 20,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colors.ring,
        }}
      />

      {/* Center dot */}
      <span
        className="relative block rounded-full border-2 border-white transition-transform duration-150 group-hover:scale-125"
        style={{
          width: 12,
          height: 12,
          backgroundColor: colors.dot,
          boxShadow: `0 0 0 3px ${colors.ring}, 0 2px 8px rgba(0,0,0,0.5)`,
        }}
      />

      {/* Tooltip label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none
                   opacity-0 group-hover:opacity-100 transition-all duration-200
                   bottom-[calc(100%+6px)] whitespace-nowrap"
      >
        <div className="bg-canvas-surface border border-canvas-border rounded-md px-2 py-1 shadow-lg">
          <span className="font-mono text-[10px] text-slate-300 tracking-wide">{field.name}</span>
          <span
            className={`ml-1.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white ${colors.label}`}
          >
            {field.type}
          </span>
        </div>
        {/* Arrow */}
        <div className="mx-auto mt-0.5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-canvas-border" />
      </div>
    </div>
  )
}

// ─── Pin-confirmation popover ─────────────────────────────────────────────────
function PinConfirmPopover({ pin, label, type, onLabel, onType, onConfirm, onCancel }) {
  const offset = 16
  return (
    <div
      className="absolute z-20 animate-fade-in"
      style={{ top: pin.y + offset, left: pin.x + offset }}
    >
      <div className="bg-canvas-surface border border-amber-500/60 rounded-xl shadow-2xl p-4 w-64">
        <p className="font-syne text-[11px] font-semibold uppercase tracking-widest text-amber-400 mb-3">
          New Field Pin
        </p>

        <label className="block text-[11px] text-slate-400 mb-1">Field Label</label>
        <input
          autoFocus
          value={label}
          onChange={e => onLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
          placeholder="e.g. First Name"
          className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2
                     text-sm text-slate-200 placeholder-slate-600 font-mono
                     focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30
                     transition-colors duration-150 mb-3"
        />

        <label className="block text-[11px] text-slate-400 mb-1">Field Type</label>
        <div className="flex gap-1.5 mb-4">
          {['text', 'checkbox', 'radio'].map(t => (
            <button
              key={t}
              onClick={() => onType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 ${
                type === t
                  ? 'bg-amber-500 text-canvas-bg'
                  : 'bg-canvas-bg border border-canvas-border text-slate-400 hover:border-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!label.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-canvas-bg text-xs font-semibold py-2 rounded-lg transition-colors duration-150"
          >
            <CheckCircle size={12} />
            Add Pin
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 border border-canvas-border
                       text-slate-400 hover:text-slate-200 hover:border-slate-500
                       text-xs font-semibold px-3 py-2 rounded-lg transition-colors duration-150"
          >
            <XCircle size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main PdfViewer component ─────────────────────────────────────────────────
export default function PdfViewer({
  canvasRef,
  fileInputRef,
  pdfFile,
  pdfDimensions,
  mappedFields,
  pendingPin,
  newFieldLabel,
  newFieldType,
  onFileUpload,
  onCanvasClick,
  onNewFieldLabel,
  onNewFieldType,
  onConfirmPin,
  onCancelPin,
}) {
  return (
    <div className="relative flex flex-col w-[60%] h-full bg-canvas-bg dot-grid overflow-hidden">

      {/* ── Top toolbar bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-canvas-border bg-canvas-bg/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center shadow-amber-glow">
            <MapPin size={13} className="text-canvas-bg" strokeWidth={2.5} />
          </div>
          <span className="font-syne text-sm font-bold text-slate-100 tracking-wide">
            PDF Field Mapper
          </span>
        </div>

        <div className="flex items-center gap-3">
          {pdfFile && (
            <div className="flex items-center gap-2 bg-canvas-surface border border-canvas-border rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                {pdfFile.name}
              </span>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-canvas-surface hover:bg-canvas-hover border border-canvas-border
                       hover:border-slate-500 text-slate-300 hover:text-slate-100
                       text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            <Upload size={12} strokeWidth={2.5} />
            {pdfFile ? 'Replace PDF' : 'Load PDF'}
          </button>
        </div>
      </div>

      {/* ── Instruction hint ── */}
      <div className="flex items-center justify-center gap-2 py-2 bg-amber-500/8 border-b border-amber-500/15 flex-shrink-0">
        <MousePointerClick size={12} className="text-amber-400" />
        <span className="text-[11px] text-amber-400/80 font-medium">
          Click anywhere on the PDF to pin a new form field
        </span>
      </div>

      {/* ── Canvas scroll container ── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        <div className="relative inline-block shadow-lg">

          {/* The PDF canvas — sized to pdfDimensions */}
          <canvas
            ref={canvasRef}
            width={pdfDimensions.width}
            height={pdfDimensions.height}
            onClick={onCanvasClick}
            className="block cursor-crosshair"
            style={{
              background: pdfFile
                ? '#FFFFFF'
                : 'linear-gradient(145deg, #F8F8F6 0%, #EEEDE9 100%)',
              display: 'block',
            }}
          />

          {/* Empty state overlay — shown when no PDF is loaded */}
          {!pdfFile && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4
                         pointer-events-none select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-canvas-bg/60 border border-canvas-border
                              flex items-center justify-center mb-1 backdrop-blur-sm">
                <Upload size={28} className="text-slate-500" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-syne text-slate-400 text-sm font-semibold mb-1">No PDF loaded</p>
                <p className="text-slate-500 text-xs">Load a PDF to begin mapping fields</p>
              </div>
              <div
                className="border-2 border-dashed border-slate-600/40 rounded-xl
                           absolute inset-6 pointer-events-none"
              />
            </div>
          )}

          {/* Field markers */}
          {mappedFields.map(field => (
            <FieldMarker key={field.id} field={field} />
          ))}

          {/* Pending pin crosshair */}
          {pendingPin && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{ top: pendingPin.y, left: pendingPin.x }}
            >
              <div className="absolute -translate-x-1/2 -translate-y-1/2">
                {/* Crosshair lines */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-5 bg-amber-400 opacity-80" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] w-5 bg-amber-400 opacity-80" />
                <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/30
                                absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
              </div>
            </div>
          )}
        </div>

        {/* Pin confirmation popover (outside the inline-block wrapper to allow overflow) */}
        {pendingPin && (
          <div className="absolute" style={{ top: 0, left: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: pendingPin.y + 96, left: pendingPin.x + 32, pointerEvents: 'all' }}>
              <PinConfirmPopover
                pin={pendingPin}
                label={newFieldLabel}
                type={newFieldType}
                onLabel={onNewFieldLabel}
                onType={onNewFieldType}
                onConfirm={onConfirmPin}
                onCancel={onCancelPin}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-canvas-border bg-canvas-bg/90 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-slate-600">
            CANVAS {pdfDimensions.width} × {pdfDimensions.height}px
          </span>
          <span className="font-mono text-[10px] text-slate-600">
            {mappedFields.length} FIELD{mappedFields.length !== 1 ? 'S' : ''} MAPPED
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  )
}
