import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getFavorites } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice } from '../utils/format'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'

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
          .select('id, title, price, image_url')
          .in('id', favIds)
        if (!cancelled) {
          if (error) {
            setProperties(DUMMY_PROPERTIES.filter((p) => favIds.includes(p.id)))
          } else {
            setProperties(data || [])
          }
        }
      } catch {
        if (!cancelled) setProperties(DUMMY_PROPERTIES.filter((p) => favIds.includes(p.id)))
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
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
              {p.priceDisplay ? p.priceDisplay : formatPrice(p.price)}
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
