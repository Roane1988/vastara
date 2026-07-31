import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev) }}
        aria-label="Info"
        className="ml-1.5 p-0.5 text-brand-muted hover:text-brand-primary transition-colors rounded-full"
      >
        <Info size={14} />
      </button>
      {open && (
        <span className="absolute left-0 top-full mt-1.5 z-20 w-64 sm:w-72 rounded-xl bg-slate-900 text-white text-xs leading-relaxed p-3 shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}
