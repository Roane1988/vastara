import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { usePropertyStore, MAX_ITEMS } from '../store/usePropertyStore'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice } from '../utils/format'
import { lockScroll, unlockScroll } from '../utils/scrollLock'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function CompareBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const items = usePropertyStore((s) => s.compareList)
  const removeFromCompare = usePropertyStore((s) => s.removeFromCompare)
  const clearCompare = usePropertyStore((s) => s.clearCompare)
  const compareNotice = usePropertyStore((s) => s.compareNotice)
  const clearCompareNotice = usePropertyStore((s) => s.clearCompareNotice)
  const noticeTimer = useRef(null)
  const panelRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!compareNotice) return
    noticeTimer.current = setTimeout(clearCompareNotice, 4000)
    return () => clearTimeout(noticeTimer.current)
  }, [compareNotice, clearCompareNotice])

  useEffect(() => {
    if (!isOpen) return
    lockScroll()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 0)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      unlockScroll()
    }
  }, [isOpen])

  useEffect(() => {
    if (items.length === 0 && isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false)
    }
  }, [items.length, isOpen])

  if (items.length === 0) return null

  const handleRemove = (id) => {
    removeFromCompare(id)
    if (items.length <= 1) setIsOpen(false)
  }

  const handleClear = () => {
    clearCompare()
    setIsOpen(false)
  }

  const handleCompareNow = () => {
    setIsOpen(false)
    navigate('/compare')
  }

  return (
    <>
      {compareNotice && (
        <div className="fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[10.25rem] sm:bottom-[10.5rem] z-40 animate-fadeIn">
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-50 px-4 py-2.5 text-red-700 shadow-sm sm:max-w-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="flex-1 text-sm font-medium">
              {compareNotice === 'type_mismatch' ? t('compare.toast_type_mismatch') : t('compare.toast_max', { max: MAX_ITEMS })}
            </p>
            <button
              type="button"
              onClick={clearCompareNotice}
              aria-label={t('common.close')}
              className="shrink-0 text-brand-muted transition-colors hover:text-brand-danger cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`${t('compare.bar_compare')} (${items.length}/${MAX_ITEMS})`}
        aria-expanded={isOpen}
        aria-controls="compare-sheet"
        className="fixed right-4 bottom-[5.75rem] z-40 inline-flex items-center gap-2.5 rounded-full bg-brand-primary py-2.5 pl-3.5 pr-2.5 text-white shadow-xl shadow-brand-primary/25 ring-1 ring-white/10 transition-all hover:bg-[#284D7A] active:scale-[0.97] sm:right-6 sm:bottom-24 sm:py-3 sm:pl-4 sm:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          <ArrowLeftRight size={16} />
        </span>
        <span className="whitespace-nowrap text-sm font-bold">{t('compare.bar_compare')}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-brand-primary">
          {items.length}/{MAX_ITEMS}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="compare-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              key="compare-sheet"
              id="compare-sheet"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-sheet-title"
              tabIndex={-1}
              initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-brand-border bg-brand-surface shadow-2xl outline-none sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[70vh] sm:w-[380px] sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-brand-border px-5 pb-4 pt-5">
                <div className="min-w-0">
                  <h2 id="compare-sheet-title" className="text-base font-bold text-brand-text">
                    {t('compare.title')}
                  </h2>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {t('compare.count', { count: items.length, max: MAX_ITEMS })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('common.close')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-bg hover:text-brand-text cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
                {items.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-3 rounded-xl border border-brand-border/70 bg-brand-bg/60 p-2.5"
                  >
                    <img
                      src={getImageSrc(property.image_url)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE
                        event.currentTarget.onerror = null
                      }}
                      className="h-14 w-14 shrink-0 rounded-lg border border-brand-border/50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-brand-text">
                        {property.title}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-brand-primary">
                        {formatPrice(property.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(property.id)}
                      aria-label={`${t('compare.remove_aria')}: ${property.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-red-50 hover:text-brand-danger cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="shrink-0 rounded-xl border border-brand-border px-3.5 py-3 text-sm font-semibold text-brand-danger transition-colors hover:bg-red-50 active:scale-[0.98] cursor-pointer"
                  >
                    {t('compare.clear_all')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCompareNow}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#284D7A] active:scale-[0.98]"
                  >
                    <ArrowLeftRight size={16} />
                    {t('compare.cta_now')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
