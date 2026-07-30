import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowLeftRight } from 'lucide-react'
import { getCompareList, removeFromCompare } from '../utils/compare'
import { formatPrice } from '../utils/format'

export default function CompareBar() {
  const [items, setItems] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    function sync() { setItems(getCompareList()) }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('compare-updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('compare-updated', sync)
    }
  }, [])

  if (items.length === 0) return null

  function handleRemove(id) {
    const updated = removeFromCompare(id)
    setItems(updated)
    window.dispatchEvent(new Event('compare-updated'))
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 bg-brand-bg rounded-lg px-2.5 py-1.5 border border-brand-border/50">
              {p.image_url && (
                <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover" />
              )}
              <span className="text-xs text-brand-text truncate max-w-[80px]">{p.title}</span>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="text-brand-muted hover:text-red-500 shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate('/compare')}
          className="shrink-0 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:brightness-90 transition-all"
        >
          <ArrowLeftRight size={14} />
          Bandingkan
        </button>
      </div>
    </div>
  )
}
