import { formatIDR } from '../utils/format'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all'

export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  classNameLabel = 'block text-[11px] font-semibold text-brand-muted mb-1.5',
  previewClass = 'text-xs text-emerald-600 font-medium mt-1',
}) {
  return (
    <div>
      {label && <label className={classNameLabel}>{label}</label>}
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {onChange && (
        <p className={previewClass}>
          {formatIDR(value)}
        </p>
      )}
      {hint && <p className="text-xs text-brand-muted mt-1">{hint}</p>}
    </div>
  )
}
