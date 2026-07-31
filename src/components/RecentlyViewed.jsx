import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, X, Eye, ChevronLeft, ChevronRight, ArrowLeftRight, Trash2 } from 'lucide-react'
import { getRecentlyViewed, removeRecentlyViewed, clearRecentlyViewed, CHANGE_EVENT } from '../utils/recentlyViewed'
import { getCompareList, addToCompare, removeFromCompare, MAX_ITEMS } from '../utils/compare'
import { formatPrice } from '../utils/format'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { timeAgo } from '../utils/time'
import { useAuth } from '../context/AuthContext'

function PriceLabel({ p }) {
  return p.priceDisplay || (p.category === 'Disewa' && p.price ? `${formatPrice(p.price)} /bulan` : formatPrice(p.price))
}

export default function RecentlyViewed() {
  const { t } = useTranslation()
  const { showToast } = useAuth()
  const [items, setItems] = useState(() => getRecentlyViewed())
  const [compareSet, setCompareSet] = useState(() => new Set(getCompareList().map(p => p.id)))
  const scrollerRef = useRef(null)

  useEffect(() => {
    function sync() { setItems(getRecentlyViewed()) }
    function syncCompare() { setCompareSet(new Set(getCompareList().map(p => p.id))) }
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    window.addEventListener('compare-updated', syncCompare)
    window.addEventListener('storage', syncCompare)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('compare-updated', syncCompare)
      window.removeEventListener('storage', syncCompare)
    }
  }, [])

  function handleRemove(id) {
    removeRecentlyViewed(id)
  }

  function handleClear() {
    clearRecentlyViewed()
  }

  function handleToggleCompare(p) {
    if (compareSet.has(p.id)) {
      removeFromCompare(p.id)
      setCompareSet(prev => { const s = new Set(prev); s.delete(p.id); return s })
    } else {
      const updated = addToCompare(p)
      if (!updated.some(x => x.id === p.id)) {
        showToast(t('compare.toast_max', { max: MAX_ITEMS }), 'error')
      }
      setCompareSet(new Set(updated.map(x => x.id)))
    }
    window.dispatchEvent(new Event('compare-updated'))
  }

  function scrollBy(direction) {
    scrollerRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' })
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-muted" />
          <h2 className="text-sm font-bold text-brand-text">{t('recently.title')}</h2>
          {items.length > 0 && (
            <span className="text-[10px] font-bold text-brand-muted bg-brand-bg border border-brand-border rounded-full px-2 py-0.5">
              {t('recently.count', { count: items.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label={t('recently.scroll_left')}
                className="hidden md:flex w-7 h-7 rounded-full border border-brand-border bg-white text-brand-muted hover:text-brand-text hover:border-brand-accent items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label={t('recently.scroll_right')}
                className="hidden md:flex w-7 h-7 rounded-full border border-brand-border bg-white text-brand-muted hover:text-brand-text hover:border-brand-accent items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-brand-muted hover:text-brand-danger transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
                {t('recently.clear')}
              </button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-brand-border bg-brand-bg/50 px-4 py-4">
          <Eye size={16} className="text-brand-muted/60" />
          <p className="text-xs text-brand-muted">{t('recently.empty')}</p>
        </div>
      ) : (
        <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {items.map((p) => {
            const inCompare = compareSet.has(p.id)
            return (
              <div key={p.id} className="relative shrink-0 w-40 bg-white border border-brand-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow group">
                <Link to={`/property/${p.id}`} className="block">
                  <div className="relative aspect-[4/3] bg-brand-bg overflow-hidden">
                    {p.image_url ? (
                      <img src={getImageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-muted/40 text-xs">
                        No Image
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {p.category}
                      </span>
                    )}
                    {p.viewed_at && (
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold text-white/90 bg-black/40 rounded px-1.5 py-0.5">
                        {t('recently.viewed')} {timeAgo(p.viewed_at)}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-brand-text truncate leading-tight">{p.title}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">
                      {p.bedrooms} KT &middot; {p.bathrooms} KM &middot; {p.area_sqm} m&sup2;
                    </p>
                    <p className="text-[11px] font-bold text-brand-primary mt-0.5 truncate">
                      <PriceLabel p={p} />
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  aria-label={t('recently.remove_aria')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 hover:bg-brand-danger text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                >
                  <X size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCompare(p)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold transition-colors border-t cursor-pointer ${
                    inCompare
                      ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                      : 'bg-brand-bg/60 text-brand-muted border-brand-border hover:text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  <ArrowLeftRight size={11} />
                  {inCompare ? t('recently.in_compare') : t('recently.compare')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
