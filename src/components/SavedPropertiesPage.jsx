import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const FILTERS = ['Semua', 'Tersedia', 'Sedang Nego']

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#183B63' : 'none'} stroke={filled ? '#183B63' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
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
  const colors = {
    Tersedia: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Sedang Nego': 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20',
  }
  const label = status === 'verified' ? 'Tersedia' : 'Sedang Nego'
  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${colors[label] || 'bg-brand-bg text-brand-muted border-brand-border'}`}>
      {label}
    </span>
  )
}

export default function SavedPropertiesPage({ onBack }) {
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState([])

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['verified', 'pending'])
        .order('created_at', { ascending: false })

      if (!error && data) {
        setProperties(data)
        setSavedIds(data.map((p) => p.id))
      }

      setLoading(false)
    }

    fetchProperties()
  }, [])

  const toggleSaved = (id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const displayed = properties.filter((p) => savedIds.includes(p.id))

  const filtered = displayed.filter((p) => {
    if (activeFilter === 'Semua') return true
    if (activeFilter === 'Tersedia') return p.status === 'verified'
    if (activeFilter === 'Sedang Nego') return p.status === 'pending'
    return true
  })

  return (
    <div className="min-h-screen bg-brand-surface">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="text-brand-muted hover:text-brand-text transition-colors -ml-1 p-1"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-lg font-semibold text-brand-text">Properti Disimpan</h1>
          <span className="text-sm text-brand-muted tabular-nums">
            {loading ? '...' : `${displayed.length} Item`}
          </span>
        </div>
      </header>

      <div className="overflow-x-auto scrollbar-none px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
               className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-colors outline-none border-none ring-0 ${
                 activeFilter === f
                   ? 'bg-brand-primary text-white'
                   : 'bg-brand-bg text-brand-muted hover:bg-brand-border'
               }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-8 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-brand-muted pt-10">
            Tidak ada properti dengan status ini.
          </p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-brand-surface rounded-2xl overflow-hidden border border-brand-border shadow-sm">
              <div className="relative aspect-[16/9] bg-brand-bg flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-brand-muted font-medium">Gambar Properti</span>
                )}
                <button
                  type="button"
                  onClick={() => toggleSaved(p.id)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-brand-surface/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-brand-surface transition-colors"
                >
                  <HeartIcon filled={savedIds.includes(p.id)} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <StatusBadge status={p.status} />
                  <span className="text-sm font-bold text-brand-text">{formatPrice(p.price)}</span>
                </div>
                <h3 className="text-base font-semibold text-brand-text mb-2">{p.title}</h3>
                <div className="flex items-center gap-1.5 text-sm text-brand-muted">
                  <span>{p.bedrooms} Bed</span>
                  <span className="text-brand-border">&bull;</span>
                  <span>{p.bathrooms} Bath</span>
                  <span className="text-brand-border">&bull;</span>
                  <span>{p.sqm} m&sup2;</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
