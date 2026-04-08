import { Trash2, Download, FileText, Layers, Edit3, ChevronRight, AlertCircle } from 'lucide-react'

// ─── Field type badge ─────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  text:     { label: 'Text',     bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  checkbox: { label: 'Check',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  radio:    { label: 'Radio',    bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.text
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center">
        <Icon size={11} className="text-amber-400" strokeWidth={2.5} />
      </div>
      <h2 className="font-syne text-[11px] font-bold uppercase tracking-widest text-slate-800">
        {title}
      </h2>
      {count !== undefined && (
        <span className="ml-auto font-mono text-[10px] text-sidebar-muted">
          {count} total
        </span>
      )}
    </div>
  )
}

// ─── Mapped field card ────────────────────────────────────────────────────────
function FieldCard({ field, onDelete }) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-sidebar-surface border border-sidebar-border
                    rounded-xl shadow-field-card hover:border-slate-300 hover:shadow-md
                    transition-all duration-200 animate-fade-in">
      {/* Type indicator dot */}
      <div
        className="flex-shrink-0 w-2 h-2 rounded-full"
        style={{
          backgroundColor:
            field.type === 'text' ? '#3B82F6' :
            field.type === 'checkbox' ? '#10B981' : '#A855F7'
        }}
      />

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{field.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <TypeBadge type={field.type} />
          <span className="font-mono text-[10px] text-sidebar-muted">
            {Math.round(field.browserX)}, {Math.round(field.browserY)}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(field.id)}
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                   text-slate-300 hover:text-red-500 hover:bg-red-50
                   opacity-0 group-hover:opacity-100 transition-all duration-150"
        title="Remove field"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Mock input for each field type ──────────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(field.name, e.target.checked)}
            className="peer sr-only"
          />
          <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-amber-500
                          peer-checked:bg-amber-500 transition-all duration-150 flex items-center justify-center">
            <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 hidden peer-checked:block" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* We re-render the check using a separate div since peer-checked doesn't work on children */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${value ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
          {value ? 'Checked' : 'Unchecked'}
        </span>
      </label>
    )
  }

  if (field.type === 'radio') {
    const options = ['Option A', 'Option B', 'Option C']
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <div className="relative w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center"
                 style={{ borderColor: value === opt ? '#F59E0B' : undefined }}>
              <input
                type="radio"
                name={`radio-${field.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(field.name, opt)}
                className="sr-only"
              />
              {value === opt && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="text-xs text-slate-600">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(field.name, e.target.value)}
      placeholder={`Enter ${field.name.toLowerCase()}…`}
      className="w-full bg-sidebar-bg border border-sidebar-border rounded-lg px-3 py-2
                 text-sm text-slate-700 placeholder-slate-400
                 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20
                 transition-all duration-150 font-figtree"
    />
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({
  mappedFields,
  userInputs,
  pdfFile,
  onDeleteField,
  onInputChange,
  onStampAndDownload,
  onOpenFilePicker,
}) {
  const hasFields = mappedFields.length > 0

  return (
    <div className="flex flex-col w-[40%] h-full bg-sidebar-bg border-l border-sidebar-border overflow-hidden">

      {/* ── Sidebar header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight leading-none">
              Field Dashboard
            </h1>
            <p className="text-xs text-sidebar-muted mt-1 font-figtree">
              Map, configure, and preview form fields
            </p>
          </div>
          {!pdfFile && (
            <button
              onClick={onOpenFilePicker}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700
                         text-white text-xs font-semibold px-3 py-1.5 rounded-lg
                         transition-colors duration-150 whitespace-nowrap mt-0.5"
            >
              <FileText size={11} strokeWidth={2.5} />
              Load PDF
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'Fields',    value: mappedFields.length },
            { label: 'Filled',    value: Object.values(userInputs).filter(v => v !== '' && v !== false && v !== undefined).length },
            { label: 'Type',      value: pdfFile ? 'PDF' : '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-sidebar-surface border border-sidebar-border rounded-xl px-3 py-2 text-center">
              <p className="font-syne text-lg font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="font-mono text-[10px] text-sidebar-muted uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-5 py-5 space-y-6">

        {/* ── Section 1: Mapped Fields list ── */}
        <section>
          <SectionHeader icon={Layers} title="Mapped Fields" count={mappedFields.length} />

          {hasFields ? (
            <div className="space-y-2">
              {mappedFields.map(field => (
                <FieldCard key={field.id} field={field} onDelete={onDeleteField} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-sidebar-border rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <AlertCircle size={18} className="text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-slate-500">No fields mapped yet</p>
              <p className="text-xs text-slate-400 mt-1">Click the PDF canvas to add pins</p>
            </div>
          )}
        </section>

        {/* ── Section 2: Mock form (live preview) ── */}
        {hasFields && (
          <section>
            <SectionHeader icon={Edit3} title="Preview Inputs" />

            <div className="space-y-4">
              {mappedFields.map(field => (
                <div key={field.id} className="animate-slide-in">
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">{field.name}</label>
                    <TypeBadge type={field.type} />
                  </div>
                  <FieldInput
                    field={field}
                    value={userInputs[field.name]}
                    onChange={onInputChange}
                  />
                </div>
              ))}
            </div>

            {/* Live JSON preview */}
            <div className="mt-5 bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-2">userInputs preview</p>
              <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
                {JSON.stringify(userInputs, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </div>

      {/* ── Stamp button (sticky footer) ── */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-sidebar-border bg-sidebar-bg">
        <button
          onClick={onStampAndDownload}
          disabled={!pdfFile || !hasFields}
          className="w-full group relative overflow-hidden flex items-center justify-center gap-3
                     py-3.5 rounded-2xl font-syne text-base font-bold tracking-wide
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-transform duration-150 active:scale-[0.98]"
          style={
            pdfFile && hasFields
              ? { background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #D97706 100%)' }
              : { background: '#E5E3DF' }
          }
        >
          {/* Shimmer overlay on hover */}
          {pdfFile && hasFields && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)', transform: 'translateX(-100%)', animation: 'none' }} />
          )}

          <Download
            size={18}
            strokeWidth={2.5}
            className={pdfFile && hasFields ? 'text-stone-900' : 'text-slate-400'}
          />
          <span className={pdfFile && hasFields ? 'text-stone-900' : 'text-slate-400'}>
            Stamp &amp; Download PDF
          </span>
          {pdfFile && hasFields && (
            <ChevronRight size={16} strokeWidth={2.5} className="text-stone-900 group-hover:translate-x-0.5 transition-transform duration-150" />
          )}
        </button>

        {!pdfFile && (
          <p className="text-center text-[11px] text-sidebar-muted mt-2">
            Load a PDF to enable stamping
          </p>
        )}
        {pdfFile && !hasFields && (
          <p className="text-center text-[11px] text-sidebar-muted mt-2">
            Add at least one field pin to stamp
          </p>
        )}

        <p className="text-center font-mono text-[10px] text-slate-300 mt-3">
          PDF Field Mapper · v0.1.0
        </p>
      </div>
    </div>
  )
}
