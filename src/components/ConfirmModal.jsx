import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { lockScroll, unlockScroll } from '../utils/scrollLock'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin ingin melanjutkan?',
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  loading = false,
  danger = true,
  icon: Icon = Trash2,
  children,
  confirmDisabled = false,
  zIndex = 50,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
      if (e.key === 'Tab') trapFocus(e)
    }

    const trapFocus = (e) => {
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
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

    lockScroll()
    document.addEventListener('keydown', onKeyDown)
    // Focus the panel on open, then let the close (X) button receive focus.
    const t = setTimeout(() => dialogRef.current?.querySelector('button')?.focus(), 40)

    return () => {
      unlockScroll()
      document.removeEventListener('keydown', onKeyDown)
      clearTimeout(t)
    }
  }, [isOpen, onClose, loading])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ zIndex }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm bg-brand-surface rounded-2xl shadow-xl border border-brand-border p-6"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Tutup dialog"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <Icon size={24} className={danger ? 'text-red-500' : 'text-amber-500'} />
            </div>

            <h3 id="confirm-modal-title" className="text-lg font-bold text-brand-text text-center">{title}</h3>
            <p id="confirm-modal-desc" className="text-sm text-brand-muted text-center mt-2 leading-relaxed">{description}</p>

            {children && <div className="mt-4">{children}</div>}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-brand-text bg-brand-bg border border-brand-border hover:bg-brand-border active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || confirmDisabled}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-primary hover:brightness-90'}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}