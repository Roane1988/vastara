import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, MapPin } from 'lucide-react'
import { loadRegencies, loadDistricts, cleanCityName } from '../utils/wilayah'

export default function LocationAutocomplete({
  mode,
  value,
  onChange,
  onPickCity,
  selectedCityCode,
  placeholder,
  required,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef(null)

  useEffect(() => {
    let active = true
    ;(mode === 'kota' ? loadRegencies() : loadDistricts())
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [mode])

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const suggestions = useMemo(() => {
    if (!data || !open) return []
    const q = (value || '').trim().toLowerCase()
    let list
    if (mode === 'kota') {
      list = data
        .filter((r) => !q || r.name.toLowerCase().includes(q))
        .slice(0, 12)
        .map((r) => ({ key: r.code, label: cleanCityName(r.name), payload: r }))
    } else {
      if (!selectedCityCode) return []
      list = data
        .filter((d) => d.regency_code === selectedCityCode && (!q || d.name.toLowerCase().includes(q)))
        .slice(0, 12)
        .map((d) => ({ key: d.code, label: d.name, payload: d }))
    }
    return list
  }, [data, mode, value, selectedCityCode, open])

  function pick(item) {
    onChange(item.label)
    if (mode === 'kota') {
      onPickCity?.(item.payload.code)
    } else {
      onPickCity?.(item.payload.regency_code)
    }
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = suggestions[activeIndex >= 0 ? activeIndex : 0]
      if (item) pick(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showHint = mode === 'kecamatan' && !selectedCityCode

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          onChange(e.target.value)
          if (mode === 'kota') onPickCity?.('')
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full py-4 px-4 pr-9 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
      />
      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-brand-border bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-brand-muted">
              <Loader2 size={14} className="animate-spin" /> Memuat daftar wilayah...
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  activeIndex === i ? 'bg-brand-bg text-brand-text' : 'text-brand-text hover:bg-brand-bg'
                }`}
              >
                <MapPin size={14} className="text-brand-muted shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            ))
          )}
        </div>
      )}

      {showHint && !open && (
        <p className="text-[11px] text-brand-muted mt-1">Pilih kota terlebih dahulu agar saran kecamatan muncul.</p>
      )}
    </div>
  )
}
