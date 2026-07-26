import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getImageSrc } from '../utils/images'

function ArrowLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function StatusBadge({ status }) {
  const isPending = status === 'pending'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
      isPending
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {isPending ? 'Menunggu Verifikasi' : 'Terverifikasi'}
    </span>
  )
}

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

export default function MyListingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

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
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })

        if (!cancelled) {
          if (!error && data) setListings(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchListings()

    return () => { cancelled = true }
  }, [user])

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
            <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
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
              className="w-full bg-brand-surface rounded-2xl overflow-hidden border border-brand-border shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-200 text-left"
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
                  <p className="text-xs text-brand-muted mt-1 truncate">
                    {p.address || p.location || ''}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-brand-muted mt-2">
                    <span>{p.bedrooms} KT</span>
                    <span className="text-brand-border">&bull;</span>
                    <span>{p.bathrooms} KM</span>
                    <span className="text-brand-border">&bull;</span>
                    <span>{p.area_sqm || p.sqm} m&sup2;</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
