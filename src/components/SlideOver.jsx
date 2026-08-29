import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { lockScroll, unlockScroll } from '../utils/scrollLock'

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function SlideOver({
  isOpen,
  onClose,
  title,
  width = 'max-w-md',
  zIndex = 100,
  headerExtras,
  footer,
  children,
}) {
  const panelRef = useRef(null)
  const { t } = useTranslation()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement
    panelRef.current?.focus()
    lockScroll()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockScroll()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex }}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed inset-y-0 right-0 w-full ${width} bg-brand-surface flex flex-col shadow-xl border-l border-brand-border outline-none`}
            style={{ zIndex }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-border">
              <h2 className="text-2xl font-bold text-brand-text">{title}</h2>
              <div className="flex items-center gap-2">
                {headerExtras}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="p-1 text-brand-muted hover:text-brand-text transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">{children}</div>
            {footer && (
              <div className="mt-auto sticky bottom-0 bg-brand-surface p-4 border-t border-brand-border">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
