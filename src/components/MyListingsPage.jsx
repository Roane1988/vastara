import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getImageSrc } from '../utils/images'
import { formatPrice } from '../utils/format'
import ConfirmModal from './ConfirmModal'
import { Check, Clock, X, Users } from 'lucide-react'

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
          .select('id, title, price, status, image_url, address, bedrooms, bathrooms, area_sqm, created_at, price_requested, price_change_status, price_reviewed_at')
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
                    {formatPrice(p.price)}
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
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-accent bg-brand-accent/5 border border-brand-accent/20 rounded-lg px-2 py-0.5 mt-2 w-fit">
                      <Users size={12} />
                      {leadCounts[p.id]} orang tertarik
                    </p>
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
    </div>
  )
}
