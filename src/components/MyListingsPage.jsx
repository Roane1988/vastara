import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getImageSrc } from '../utils/images'
import { formatPrice, formatPriceDisplay } from '../utils/format'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import ConfirmModal from './ConfirmModal'
import { Check, Clock, X, Users, MessageCircle, CalendarClock, Loader2 } from 'lucide-react'

const VISIT_STATUS = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Dikonfirmasi', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-600 border-red-100' },
  completed: { label: 'Selesai', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function formatVisitDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function ArrowLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function StatusBadge({ status }) {
  if (status === 'sold') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-gray-100 text-gray-700 border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Terjual
      </span>
    )
  }
  const isPending = status === 'pending'
  const isReview = status === 'in_review'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
      isPending
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : isReview
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : isReview ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
      {isPending ? 'Menunggu Verifikasi' : isReview ? 'Sedang Survei' : 'Terverifikasi'}
    </span>
  )
}

const PROGRESS_STAGES = [
  { key: 'pending', label: 'Menunggu Verifikasi' },
  { key: 'in_review', label: 'Survei Lokasi' },
  { key: 'verified', label: 'Tayang' },
]

function StatusTimeline({ status }) {
  const currentIndex = PROGRESS_STAGES.findIndex((s) => s.key === status)
  const hint = status === 'pending'
    ? 'Iklan akan tayang setelah diverifikasi admin.'
    : status === 'in_review'
      ? 'Tim survei HuniOne akan menghubungi Anda untuk peninjauan lokasi.'
      : status === 'verified'
        ? 'Iklan Anda tayang dan dilihat pembeli.'
        : ''

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1.5">
        {PROGRESS_STAGES.map((stage, i) => {
          const done = i <= currentIndex
          return (
            <div key={stage.key} className="flex items-center gap-1.5 sm:flex-1 sm:min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-brand-accent' : 'bg-brand-border'}`} />
              <span className={`text-[11px] sm:text-[10px] sm:truncate ${done ? 'text-brand-accent font-semibold' : 'text-brand-muted'}`}>{stage.label}</span>
              {i < PROGRESS_STAGES.length - 1 && (
                <div className={`hidden sm:block flex-1 h-px mx-1 ${i < currentIndex ? 'bg-brand-accent' : 'bg-brand-border'}`} />
              )}
            </div>
          )
        })}
      </div>
      {hint && <p className="text-[10px] text-brand-muted mt-1.5">{hint}</p>}
    </div>
  )
}

export default function MyListingsPage() {
  const navigate = useNavigate()
  const { user, showToast } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSoldModal, setShowSoldModal] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState(null)
  const [soldLoading, setSoldLoading] = useState(false)
  const [leadCounts, setLeadCounts] = useState({})
  const [leadModal, setLeadModal] = useState(null)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [visits, setVisits] = useState([])
  const [visitCounts, setVisitCounts] = useState({})
  const [visitsModal, setVisitsModal] = useState(null)
  const [updatingVisitId, setUpdatingVisitId] = useState(null)

  const openLeadModal = async (p) => {
    setLeadModal({ propertyId: p.id, title: p.title })
    setLeadsLoading(true)
    setLeads([])
    try {
      const { data, error } = await supabase
        .from('whatsapp_leads')
        .select('id, buyer_id, created_at, profiles!buyer_id(first_name)')
        .eq('property_id', p.id)
        .order('created_at', { ascending: false })
      if (!error && data) setLeads(data)
    } catch {
      /* ignore */
    }
    setLeadsLoading(false)
  }

  const handleConfirmSold = async () => {
    if (!selectedPropertyId) return
    setSoldLoading(true)
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'sold' })
        .eq('id', selectedPropertyId)

      if (error) throw error

      setListings((prev) =>
        prev.map((p) =>
          p.id === selectedPropertyId ? { ...p, status: 'sold' } : p
        )
      )

      showToast('Properti berhasil ditandai sebagai terjual', 'success')
      setShowSoldModal(false)
      setSelectedPropertyId(null)
    } catch {
      showToast('Gagal menandai properti. Silakan coba lagi.', 'error')
    } finally {
      setSoldLoading(false)
    }
  }

  const handleVisitStatus = async (visit, status) => {
    setUpdatingVisitId(visit.id)
    try {
      const { error } = await supabase
        .from('site_visits')
        .update({ status })
        .eq('id', visit.id)
      if (error) throw error
      setVisits((prev) => prev.map((v) => (v.id === visit.id ? { ...v, status } : v)))
      const label = VISIT_STATUS[status]?.label || status
      showToast(`Jadwal survei ditandai "${label}"`, 'success')
    } catch {
      showToast('Gagal mengubah status jadwal. Coba lagi.', 'error')
    }
    setUpdatingVisitId(null)
  }

  useEffect(() => {
    const ids = listings.map((p) => p.id)
    if (!user || ids.length === 0) return

    const channel = supabase
      .channel('seller-visits')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'site_visits', filter: `property_id=in.(${ids.join(',')})` },
        async (payload) => {
          const v = payload.new
          showToast('Ada permintaan jadwal survei baru untuk properti Anda.', 'info')
          const { data: full, error } = await supabase
            .from('site_visits')
            .select('id, property_id, scheduled_date, scheduled_time, notes, status, created_at, profiles!buyer_id(first_name)')
            .eq('id', v.id)
          if (!error && full?.[0]) {
            setVisits((prev) => [full[0], ...prev])
            setVisitCounts((prev) => ({ ...prev, [v.property_id]: (prev[v.property_id] || 0) + 1 }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [listings, user, showToast])

  useEffect(() => {
    let cancelled = false

    async function fetchListings() {
      if (!cancelled) setLoading(true)
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, price_period, category, status, image_url, address, bedrooms, bathrooms, area_sqm, created_at, price_requested, price_change_status, price_reviewed_at')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })

        if (!cancelled) {
          if (error) {
            showToast('Gagal memuat iklan. Silakan coba lagi.', 'error')
          } else if (data) {
            setListings(data)
            const ids = data.map((p) => p.id)
            if (ids.length > 0) {
              const { data: leads, error: leadsError } = await supabase
                .from('whatsapp_leads')
                .select('property_id')
                .in('property_id', ids)
              if (!cancelled && !leadsError && leads) {
                const counts = {}
                leads.forEach((l) => {
                  counts[l.property_id] = (counts[l.property_id] || 0) + 1
                })
                setLeadCounts(counts)
              }

              const { data: visitData, error: visitError } = await supabase
                .from('site_visits')
                .select('id, property_id, scheduled_date, scheduled_time, notes, status, created_at, profiles!buyer_id(first_name)')
                .in('property_id', ids)
                .order('scheduled_date', { ascending: false })
              if (!cancelled && !visitError && visitData) {
                setVisits(visitData)
                const counts = {}
                visitData.forEach((v) => {
                  counts[v.property_id] = (counts[v.property_id] || 0) + 1
                })
                setVisitCounts(counts)
              }
            }
          }
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          showToast('Gagal memuat iklan. Silakan coba lagi.', 'error')
          setLoading(false)
        }
      }
    }

    fetchListings()

    return () => { cancelled = true }
  }, [user, showToast])

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-brand-muted hover:text-brand-text transition-colors -ml-1 p-1"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-lg font-semibold text-brand-text">Iklan Saya</h1>
          <span className="text-sm text-brand-muted tabular-nums">
            {loading ? '...' : `${listings.length} Properti`}
          </span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/50">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-sm text-brand-muted mt-4">Belum ada properti yang diiklankan.</p>
            <button
              type="button"
              onClick={() => navigate('/sell-role')}
              className="mt-4 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
            >
              + Iklankan Properti
            </button>
          </div>
        ) : (
          listings.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/property/${p.id}`)}
              className={`w-full bg-brand-surface rounded-2xl overflow-hidden border border-brand-border shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-200 text-left ${
                p.status === 'sold' ? 'opacity-70 grayscale' : ''
              }`}
            >
              <div className="flex items-stretch gap-0">
                <div className="w-28 sm:w-36 shrink-0 bg-brand-bg flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={getImageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-muted/30">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-brand-text leading-snug line-clamp-2">{p.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-base font-extrabold text-brand-primary mt-1">
                    {formatPriceDisplay(p)}
                  </p>
                  {p.price_change_status === 'pending' && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 mt-1.5 w-fit">
                      <Clock size={12} />
                      Menunggu persetujuan harga ({formatPrice(p.price_requested)})
                    </p>
                  )}
                  {p.price_change_status === 'rejected' && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5 mt-1.5 w-fit">
                      <X size={12} />
                      Permintaan ubah harga ditolak · harga tetap {formatPrice(p.price)}
                    </p>
                  )}
                  {p.price_change_status === 'approved' && p.price_requested === null && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 mt-1.5 w-fit">
                      <Check size={12} />
                      Perubahan harga disetujui
                    </p>
                  )}
                  <p className="text-xs text-brand-muted mt-1 truncate">
                    {p.address || ''}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-brand-muted mt-2">
                    <span>{p.bedrooms} KT</span>
                    <span className="text-brand-border">&bull;</span>
                    <span>{p.bathrooms} KM</span>
                    <span className="text-brand-border">&bull;</span>
                    <span>{p.area_sqm} m&sup2;</span>
                  </div>
                  {leadCounts[p.id] > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openLeadModal(p) }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-accent bg-brand-accent/5 border border-brand-accent/20 rounded-lg px-2 py-0.5 mt-2 w-fit hover:bg-brand-accent/10 transition-colors"
                    >
                      <Users size={12} />
                      {leadCounts[p.id]} orang tertarik
                    </button>
                  )}
                  {(visitCounts[p.id] || 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setVisitsModal(p) }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 rounded-lg px-2 py-0.5 mt-2 w-fit hover:bg-brand-primary/10 transition-colors"
                    >
                      <CalendarClock size={12} />
                      Jadwal Survei ({visitCounts[p.id]})
                    </button>
                  )}
                  {p.status !== 'sold' && <StatusTimeline status={p.status} />}
                  {p.status === 'sold' && (
                    <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                      <Check size={12} />
                      Iklan telah ditandai terjual
                    </p>
                  )}
                  {p.status !== 'sold' && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/sell?edit=${p.id}`)}
                        className="text-xs font-semibold text-brand-accent hover:text-brand-primary border border-brand-accent/30 hover:border-brand-primary rounded-lg px-3 py-1.5 transition-colors mr-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPropertyId(p.id)
                          setShowSoldModal(true)
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Tandai Terjual
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showSoldModal}
        onClose={() => { setShowSoldModal(false); setSelectedPropertyId(null) }}
        onConfirm={handleConfirmSold}
        title="Tandai Properti Terjual"
        description="Apakah Anda yakin properti ini sudah laku? Iklan akan diturunkan dari pencarian publik dan tidak bisa dibatalkan sendiri."
        confirmText="Ya, Tandai Terjual"
        cancelText="Batal"
        loading={soldLoading}
      />

      <AnimatePresence>
        {leadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setLeadModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Orang yang tertarik"
              className="w-full sm:max-w-md bg-brand-surface rounded-t-3xl sm:rounded-3xl shadow-2xl border border-brand-border overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-border">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-brand-text">Orang yang Tertarik</h3>
                  <p className="text-xs text-brand-muted truncate mt-0.5">{leadModal.title}</p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup"
                  onClick={() => setLeadModal(null)}
                  className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {leadsLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <div className="w-7 h-7 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-14">
                    <Users size={32} className="mx-auto text-brand-muted/40 mb-3" />
                    <p className="text-sm font-semibold text-brand-text">Belum ada data minat</p>
                    <p className="text-xs text-brand-muted mt-1">Saat pembeli menghubungi via WhatsApp, mereka akan muncul di sini.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {leads.map((lead) => {
                      const buyerName = lead.profiles?.first_name || null
                      return (
                        <li key={lead.id} className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3">
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: getAvatarColor(lead.buyer_id || lead.id) }}
                          >
                            {getInitials(buyerName || 'P')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-brand-text truncate">
                              {buyerName || 'Pengunjung'}
                            </p>
                            <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1.5">
                              <MessageCircle size={11} />
                              Menghubungi via WhatsApp · {timeAgo(lead.created_at)}
                            </p>
                          </div>
                          {buyerName && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              Terdaftar
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="px-5 py-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setLeadModal(null)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visitsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setVisitsModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Jadwal survei"
              className="w-full sm:max-w-md bg-brand-surface rounded-t-3xl sm:rounded-3xl shadow-2xl border border-brand-border overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-border">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                    <CalendarClock size={18} className="text-brand-primary" />
                    Jadwal Survei
                  </h3>
                  <p className="text-xs text-brand-muted truncate mt-0.5">{visitsModal.title}</p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup"
                  onClick={() => setVisitsModal(null)}
                  className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {visits.filter((v) => v.property_id === visitsModal.id).length === 0 ? (
                  <div className="text-center py-14">
                    <CalendarClock size={32} className="mx-auto text-brand-muted/40 mb-3" />
                    <p className="text-sm font-semibold text-brand-text">Belum ada jadwal survei</p>
                    <p className="text-xs text-brand-muted mt-1">Pembeli yang memesan kunjungan akan muncul di sini.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {visits
                      .filter((v) => v.property_id === visitsModal.id)
                      .map((visit) => {
                        const buyerName = visit.profiles?.first_name || null
                        const st = VISIT_STATUS[visit.status] || VISIT_STATUS.pending
                        const busy = updatingVisitId === visit.id
                        return (
                          <li key={visit.id} className="rounded-2xl border border-brand-border bg-brand-bg/50 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                style={{ backgroundColor: getAvatarColor(visit.buyer_id || visit.id) }}
                              >
                                {getInitials(buyerName || 'P')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-brand-text truncate">
                                    {buyerName || 'Calon pembeli'}
                                  </p>
                                  <span className={`shrink-0 text-[10px] font-bold border rounded-full px-2 py-0.5 ${st.cls}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <p className="text-xs text-brand-muted mt-1 flex items-center gap-1.5">
                                  <CalendarClock size={11} />
                                  {formatVisitDate(visit.scheduled_date)} · {visit.scheduled_time?.slice(0, 5)}
                                </p>
                                {visit.notes && (
                                  <p className="text-xs text-brand-muted mt-1 italic truncate">“{visit.notes}”</p>
                                )}
                              </div>
                            </div>

                            {visit.status === 'pending' && (
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleVisitStatus(visit, 'confirmed')}
                                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  Terima
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleVisitStatus(visit, 'cancelled')}
                                  className="flex-1 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  <X size={13} />
                                  Tolak
                                </button>
                              </div>
                            )}
                            {visit.status === 'confirmed' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleVisitStatus(visit, 'completed')}
                                className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Tandai Selesai
                              </button>
                            )}
                          </li>
                        )
                      })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
