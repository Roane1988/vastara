import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X, AlertTriangle } from 'lucide-react'

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
}) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm bg-brand-surface rounded-2xl shadow-xl border border-brand-border p-6"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
            >
              <X size={16} />
            </button>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <Icon size={24} className={danger ? 'text-red-500' : 'text-amber-500'} />
            </div>

            <h3 className="text-lg font-bold text-brand-text text-center">{title}</h3>
            <p className="text-sm text-brand-muted text-center mt-2 leading-relaxed">{description}</p>

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
