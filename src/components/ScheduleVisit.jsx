import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, X, Loader2, CheckCircle } from 'lucide-react'

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getMaxDate() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

function normalizeWhatsAppNumber(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  return digits
}

function formatDateForMessage(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function ScheduleVisit({ property, onClose }) {
  const { user, showToast } = useAuth()
  const [date, setDate] = useState(getMinDate())
  const [time, setTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [waLink, setWaLink] = useState('')

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-3xl p-6 pb-10 w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <p className="text-sm text-brand-muted text-center py-8">Silakan login untuk mengatur jadwal survei.</p>
        </div>
      </div>
    )
  }

  const isRent = property?.category === 'Disewa' || property?.typeLabel === 'Disewa'
  const visitTerm = isRent ? 'inspeksi' : 'survei'
  const visitorLabel = isRent ? 'Calon penyewa' : 'Calon pembeli'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.from('site_visits').insert({
        property_id: property.id,
        buyer_id: user.id,
        scheduled_date: date,
        scheduled_time: time,
        notes: notes.trim(),
      })
      if (error) {
        showToast(error.message, 'error')
      } else {
        setSuccess(true)
        const rawNumber = property?.seller_whatsapp || property?.agent_whatsapp
        const number = normalizeWhatsAppNumber(rawNumber)
        if (number) {
          const buyerName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || visitorLabel
          const msg = `Halo, saya ${buyerName} ingin mengatur jadwal ${visitTerm} untuk "${property?.title || 'properti'}" pada ${formatDateForMessage(date)} pukul ${time}.${notes ? ` Catatan: ${notes}` : ''}`
          const link = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
          setWaLink(link)
          window.open(link, '_blank', 'noopener')
        }
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengirim permintaan', 'error')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 pb-10 w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-brand-text">Atur Jadwal Survei</h2>
          <button type="button" onClick={onClose} className="text-brand-muted hover:text-brand-text">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-brand-text mb-1">Permintaan Terkirim!</p>
            <p className="text-sm text-brand-muted max-w-xs">
              Jadwal {visitTerm} kamu sudah dikirim. Agen akan mengonfirmasi melalui WhatsApp.
            </p>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:brightness-90 transition-all"
              >
                Lanjut ke WhatsApp
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">
                <Calendar size={14} className="inline mr-1 -mt-0.5" />
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                min={getMinDate()}
                max={getMaxDate()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">
                <Clock size={14} className="inline mr-1 -mt-0.5" />
                Waktu
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">Catatan (opsional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Misal: ingin lihat sore hari, atau tanya soal fasilitas..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-90 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Permintaan Survei'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
