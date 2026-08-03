import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingDown, MapPin, Search, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice } from '../utils/format'

const PROPERTY_TYPES = [
  { value: 'all', label: 'Semua' },
  { value: 'Rumah', label: 'Rumah' },
  { value: 'Apartemen', label: 'Apartemen' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Tanah', label: 'Tanah' },
  { value: 'Kantor', label: 'Kantor' },
  { value: 'Ruko', label: 'Ruko' },
]

function dropPct(p) {
  if (!p?.original_price || !p?.price || p.original_price <= p.price) return 0
  return (p.original_price - p.price) / p.original_price * 100
}

export default function PriceDropPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('pct')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, original_price, property_type, category, address, city, district, bedrooms, bathrooms, area_sqm, image_url, status, price_change_status, created_at')
          .neq('price_change_status', 'pending')
          .neq('status', 'sold')
          .not('original_price', 'is', null)
          .order('created_at', { ascending: false })

        if (cancelled) return
        if (error) throw error
        setProperties(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) console.error('Gagal memuat properti:', err)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const dropped = properties
    .filter((p) => dropPct(p) > 0)
    .filter((p) => type === 'all' || p.property_type === type)
    .filter((p) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [p.title, p.address, p.city, p.district].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (sort === 'drop') return dropPct(b) - dropPct(a)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" aria-label="Kembali" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-brand-text flex items-center gap-2">
              <TrendingDown size={18} className="text-brand-accent" />
              Turun Harga
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              {loading ? 'Memuat…' : `${dropped.length} properti turun harganya`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* KONTROL */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ruang oleh, kecamatan, atau tipe…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-brand-muted shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl bg-brand-surface border border-brand-border text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="drop">Penurunan terbesar</option>
              <option value="newest">Terbaru</option>
            </select>
          </div>
        </div>

        {/* CHIP TYPE */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                type === t.value
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-surface text-brand-muted border-brand-border hover:text-brand-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* LISTING */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dropped.length === 0 ? (
          <div className="text-center py-24">
            <TrendingDown size={40} className="mx-auto text-brand-muted/40 mb-3" />
            <p className="text-sm font-semibold text-brand-text">Belum ada properti turun harga</p>
            <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">
              Setiap kali seller menurunkan harga, propertinya akan muncul di sini.
            </p>
            <button type="button" onClick={() => navigate('/explore')} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all">
              Jelajahi Semua Properti
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {dropped.map((p) => {
              const pct = dropPct(p)
              return (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  className="group bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-primary/5"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      loading="lazy"
                      src={getImageSrc(p.image_url)}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                    />
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow">
                      <TrendingDown size={12} />
                      Turun {pct.toFixed(1)}%
                    </span>
                    {p.property_type && (
                      <span className="absolute top-2 right-2 bg-black/50 backdrop-blur text-white text-[10px] font-semibold px-2 py-1 rounded-md">
                        {p.property_type}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-base font-extrabold text-brand-primary">{formatPrice(p.price)}</p>
                      <p className="text-xs text-brand-muted line-through">{formatPrice(p.original_price)}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-text mt-0.5 truncate">{p.title}</p>
                    <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />
                      {[p.address, p.city, p.district].filter(Boolean).join(', ') || '-'}
                    </p>
                    <div className="flex gap-3 text-[11px] text-brand-muted mt-2.5 pt-2 border-t border-brand-border">
                      <span>{p.bedrooms} KT</span>
                      <span>{p.bathrooms} KM</span>
                      <span>{p.area_sqm || '-'} m&sup2;</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}