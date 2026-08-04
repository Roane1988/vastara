import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const REASONS = [
  { key: 'penipuan', label: 'Iklan penipuan / palsu' },
  { key: 'harga', label: 'Harga tidak wajar' },
  { key: 'terjual', label: 'Properti sudah terjual / tidak tersedia' },
  { key: 'duplikat', label: 'Iklan duplikat' },
  { key: 'lokasi', label: 'Lokasi / foto tidak sesuai' },
  { key: 'lainnya', label: 'Lainnya' },
]

export default function ReportListingModal({ isOpen, onClose, propertyId, propertyTitle, onSubmitted }) {
  const { user, showToast } = useAuth()
  const cancelledRef = useRef(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  async function handleSubmit() {
    if (!reason) {
      setError('Pilih alasan pelaporan terlebih dahulu.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('property_reports').insert({
        property_id: propertyId,
        reporter_id: user?.id,
        reason,
        note: note.trim(),
      })
      if (cancelledRef.current) return
      if (insertError) {
        if (insertError.message && insertError.message.toLowerCase().includes('duplicate')) {
          setError('Anda sudah melaporkan iklan ini sebelumnya.')
        } else {
          setError(insertError.message)
        }
      } else {
        showToast('Laporan terkirim. Terima kasih atas laporannya!', 'success')
        onSubmitted?.()
        onClose()
      }
    } catch (err) {
      if (!cancelledRef.current) setError(err.message || 'Terjadi kesalahan, coba lagi.')
    }
    if (!cancelledRef.current) setSubmitting(false)
  }

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
            onClick={() => !submitting && onClose()}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md bg-brand-surface rounded-2xl shadow-xl border border-brand-border p-6"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Tutup dialog"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Flag size={24} className="text-red-500" />
            </div>

            <h3 className="text-lg font-bold text-brand-text text-center">Laporkan Iklan</h3>
            <p className="text-sm text-brand-muted text-center mt-2 leading-relaxed">
              Bantu kami menjaga kualitas iklan. Laporan akan ditinjau oleh admin.
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold text-brand-muted mb-2">
                {propertyTitle ? <span className="text-brand-text">{propertyTitle}</span> : null}
              </p>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                      reason === r.key
                        ? 'bg-red-50 border-red-300 text-brand-text'
                        : 'bg-brand-bg border-brand-border text-brand-muted hover:border-brand-accent/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.key}
                      checked={reason === r.key}
                      onChange={() => setReason(r.key)}
                      className="accent-red-500"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan tambahan (opsional)..."
                rows={3}
                className="mt-3 w-full py-3 px-4 text-sm text-brand-text bg-brand-bg border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
              />
              {error && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-brand-text bg-brand-bg border border-brand-border hover:bg-brand-border active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !reason}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Kirim Laporan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
