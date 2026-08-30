import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { usePropertyStore, MAX_ITEMS } from '../store/usePropertyStore'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'

export default function CompareBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const items = usePropertyStore((s) => s.compareList)
  const removeFromCompare = usePropertyStore((s) => s.removeFromCompare)
  const compareNotice = usePropertyStore((s) => s.compareNotice)
  const clearCompareNotice = usePropertyStore((s) => s.clearCompareNotice)
  const noticeTimer = useRef(null)

  useEffect(() => {
    if (!compareNotice) return
    noticeTimer.current = setTimeout(clearCompareNotice, 4000)
    return () => clearTimeout(noticeTimer.current)
  }, [compareNotice, clearCompareNotice])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {compareNotice && (
        <div className="max-w-7xl mx-auto px-4 mb-2 animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-500/40 text-red-700 shadow-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-sm font-medium flex-1">
              {compareNotice === 'type_mismatch' ? t('compare.toast_type_mismatch') : t('compare.toast_max', { max: MAX_ITEMS })}
            </p>
            <button
              type="button"
              onClick={clearCompareNotice}
              aria-label="Tutup"
              className="shrink-0 text-brand-muted hover:text-brand-danger transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="bg-brand-surface border-t border-brand-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            {items.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 bg-brand-bg rounded-lg px-2.5 py-1.5 border border-brand-border/50">
                <img
                  src={getImageSrc(p.image_url)}
                  alt=""
                  onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }}
                  className="w-6 h-6 rounded object-cover"
                />
                <span className="text-xs text-brand-text truncate max-w-[80px]">{p.title}</span>
                <button
                  type="button"
                  onClick={() => removeFromCompare(p.id)}
                  aria-label={t('compare.remove_aria')}
                  className="text-brand-muted hover:text-brand-danger shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <span className="text-[10px] font-bold text-brand-muted whitespace-nowrap">
              {items.length}/{MAX_ITEMS}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/compare')}
            className="shrink-0 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:brightness-90 transition-all"
          >
            <ArrowLeftRight size={14} />
            {t('compare.bar_compare')}
          </button>
        </div>
      </div>
    </div>
  )
}