import { useState } from 'react'
import { motion } from 'framer-motion'

// TODO: Fetch user's saved properties from Supabase joining 'users' and 'properties' tables
const SAVED_PROPERTIES = [
  {
    id: 1,
    name: 'Rumah BSD Minimalis',
    price: 'Rp 1,2 M',
    fullPrice: 'Rp 1.200.000.000',
    status: 'Tersedia',
    beds: 4,
    baths: 3,
    sqm: 150,
  },
  {
    id: 2,
    name: 'Apartemen SCBD 2BR',
    price: 'Rp 850 Jt',
    fullPrice: 'Rp 850.000.000',
    status: 'Sedang Nego',
    beds: 2,
    baths: 1,
    sqm: 68,
  },
  {
    id: 3,
    name: 'Villa Puncak Hijau',
    price: 'Rp 2,1 M',
    fullPrice: 'Rp 2.100.000.000',
    status: 'Tersedia',
    beds: 5,
    baths: 3,
    sqm: 200,
  },
  {
    id: 4,
    name: 'Townhouse Kemang Selatan',
    price: 'Rp 1,8 M',
    fullPrice: 'Rp 1.800.000.000',
    status: 'Tersedia',
    beds: 3,
    baths: 2,
    sqm: 120,
  },
]

const FILTERS = ['Semua', 'Tersedia', 'Sedang Nego']

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#FF6B00' : 'none'} stroke={filled ? '#FF6B00' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    'Sedang Nego': 'bg-orange-50 text-orange-600 border-orange-100',
  }
  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${colors[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {status}
    </span>
  )
}

export default function SavedPropertiesPage({ onBack }) {
  const [activeFilter, setActiveFilter] = useState('Semua')
  // TODO: Create a DELETE function to remove a property from the wishlist when the Heart icon is clicked
  const [saved, setSaved] = useState(SAVED_PROPERTIES.map((p) => p.id))

  const filtered = SAVED_PROPERTIES.filter((p) => {
    if (activeFilter === 'Semua') return true
    return p.status === activeFilter
  })

  const toggleSaved = (id) => {
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="min-h-screen bg-white"
    >
      {/* ─── Sticky Header ──────────────────────────────────── */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={onBack}
            className="text-slate-700 hover:text-slate-900 transition-colors -ml-1 p-1"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Properti Disimpan</h1>
          <span className="text-sm text-slate-400 tabular-nums">{SAVED_PROPERTIES.length} Item</span>
        </div>
      </header>

      {/* ─── Filter Chips ───────────────────────────────────── */}
      <div className="overflow-x-auto scrollbar-none px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-colors outline-none border-none ring-0 ${
                activeFilter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Property List ──────────────────────────────────── */}
      <div className="px-4 pt-2 pb-8 space-y-5">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
            {/* Image */}
            <div className="relative aspect-[16/9] bg-slate-100 flex items-center justify-center">
              <span className="text-xs text-slate-400 font-medium">Gambar Properti</span>
              <button
                type="button"
                onClick={() => toggleSaved(p.id)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <HeartIcon filled={saved.includes(p.id)} />
              </button>
            </div>

            {/* Details */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <StatusBadge status={p.status} />
                <span className="text-sm font-bold text-slate-900">{p.price}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{p.name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <span>{p.beds} Bed</span>
                <span className="text-slate-300">•</span>
                <span>{p.baths} Bath</span>
                <span className="text-slate-300">•</span>
                <span>{p.sqm} m&sup2;</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 pt-10">
            Tidak ada properti dengan status ini.
          </p>
        )}

        {/* TODO: Fetch user's saved properties from Supabase joining 'users' and 'properties' tables */}
      </div>
    </motion.div>
  )
}
