import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getFavorites } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPriceDisplay } from '../utils/format'

export default function SavedPropertiesList({ showAddress = false, emptyText, emptyCtaLabel, onEmptyCta, onItemClick }) {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const favIds = getFavorites()
    if (favIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, image_url, category, price_period')
          .in('id', favIds)
        if (!cancelled) {
          if (error) {
            setProperties([])
          } else {
            setProperties(data || [])
          }
        }
      } catch {
        if (!cancelled) setProperties([])
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-brand-border shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-brand-border rounded w-3/4" />
              <div className="h-2.5 bg-brand-border rounded w-1/3" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-4">
        {emptyText && <p className="text-sm text-brand-muted mb-3">{emptyText}</p>}
        {onEmptyCta && emptyCtaLabel && (
          <button
            type="button"
            onClick={onEmptyCta}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:brightness-90 transition-all"
          >
            {emptyCtaLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {properties.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => (onItemClick ? onItemClick(`/property/${p.id}`) : navigate(`/property/${p.id}`))}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-bg transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-brand-bg flex-shrink-0 overflow-hidden">
            {p.image_url ? (
              <img src={getImageSrc(p.image_url)} alt="" onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">img</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-text truncate">{p.title}</p>
            <p className="text-xs text-brand-muted mt-0.5">
              {formatPriceDisplay(p)}
            </p>
            {showAddress && (p.address || p.location) && (
              <p className="text-[11px] text-brand-muted mt-0.5 truncate">{p.address || p.location}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
