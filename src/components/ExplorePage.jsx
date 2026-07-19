import { useState, useEffect } from 'react'

const userName = 'Roane'
const location = 'BSD City'

const PROMO_BANNERS = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    badge: 'Diskon KPR',
    title: 'Cashback 50 Juta untuk Cluster X',
    subtitle: 'Syarat mudah, bunga flat 4.99%',
    agentName: 'Aqsha',
    agentPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    badge: 'Hot Deal',
    title: 'Early Bird BSD Phase 3',
    subtitle: 'Only 5 units left — grab yours now!',
    agentName: 'Rina',
    agentPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80',
    badge: 'Bebas Biaya',
    title: 'Hunian Siap Huni, Legalitas 100%',
    subtitle: 'Booking sekarang, move-in minggu depan',
    agentName: 'Budi',
    agentPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
  },
]

// TODO: Fetch from Supabase 'properties' table
const PROPERTIES = [
  {
    id: 1,
    title: 'Modern Tropical House BSD',
    price: 'Rp 1,8 M',
    beds: 4,
    baths: 3,
    sqm: 150,
    verified: true,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Apartemen Premium SCBD 2BR',
    price: 'Rp 950 Jt',
    beds: 2,
    baths: 1,
    sqm: 68,
    verified: true,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Cluster Mewah Citra Raya',
    price: 'Rp 2,5 M',
    beds: 5,
    baths: 4,
    sqm: 220,
    verified: true,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    title: 'Villa Green Lake Puncak',
    price: 'Rp 1,3 M',
    beds: 3,
    baths: 2,
    sqm: 120,
    verified: false,
    image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80',
  },
]

// TODO: Fetch from Supabase with user preference scoring
const RECOMMENDED = [
  {
    id: 101,
    title: 'The Lavande BSD',
    price: 'Rp 2,1 M',
    beds: 4,
    baths: 3,
    sqm: 175,
    verified: true,
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 102,
    title: 'Apartemen Southgate 2BR',
    price: 'Rp 1,2 M',
    beds: 2,
    baths: 1,
    sqm: 72,
    verified: true,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 103,
    title: 'Grand Whiz City BSD',
    price: 'Rp 3,4 M',
    beds: 5,
    baths: 4,
    sqm: 250,
    verified: true,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 104,
    title: 'Cluster Emerald Serpong',
    price: 'Rp 1,7 M',
    beds: 3,
    baths: 2,
    sqm: 135,
    verified: false,
    image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=400&q=80',
  },
]

const CATEGORIES = ['Semua', 'Rumah Baru', 'Apartemen', 'BSD City', 'Jakarta Selatan']

const SORT_OPTIONS = ['Terbaru', 'Termurah', 'Termahal']

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="12" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function ExplorePage({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [saved, setSaved] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [sortIndex, setSortIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_BANNERS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const toggleSave = (id) => {
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const cycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 pt-12 pb-4 px-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Selamat datang kembali, {userName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Ada 12 properti baru di{' '}
          <span className="text-orange-500 font-semibold">{location}</span>{' '}
          untuk Anda.
        </p>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center px-4 py-3 gap-3 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 dark:text-slate-500">
          <SearchIcon />
          <input
            type="text"
            placeholder="Cari lokasi atau nama properti..."
            aria-label="Cari properti"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowFilter(true)}
            className="text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors"
          >
            <FilterIcon />
          </button>
        </div>
      </header>

      {/* ─── Categories + Sort ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="overflow-x-auto no-scrollbar flex-1">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                  activeCategory === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={cycleSort}
          className="shrink-0 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-full px-3.5 py-1.5 text-xs text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Urutkan: {SORT_OPTIONS[sortIndex]}
          <ChevronDownIcon />
        </button>
      </div>

      {/* ─── Promo Carousel ────────────────────────────────────── */}
      <div className="px-4 mb-6">
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md">
          {PROMO_BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img src={banner.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

              {/* Agent — top right */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                <img
                  src={banner.agentPhoto}
                  alt={banner.agentName}
                  className="w-5 h-5 rounded-full object-cover border border-white/50"
                />
                <span className="text-[10px] text-white font-medium">Ref: {banner.agentName}</span>
              </div>

              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <span className="inline-block bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold mb-2">
                  {banner.badge}
                </span>
                <h3 className="text-lg font-extrabold text-white leading-tight">{banner.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{banner.subtitle}</p>
              </div>
            </div>
          ))}

          {/* Pagination Dots */}
          <div className="flex gap-1.5 absolute bottom-3 left-1/2 -translate-x-1/2">
            {PROMO_BANNERS.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentSlide(index)}
                className={`transition-all rounded-full ${
                  index === currentSlide
                    ? 'w-4 h-1.5 bg-orange-500'
                    : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Rekomendasi untuk Anda ────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white px-4 mb-3">
          Pilihan untuk {userName}
        </h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
          {RECOMMENDED.map((p) => (
            <div key={p.id} className="w-[260px] shrink-0">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                {p.verified && (
                  <span className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                    Verified Legal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleSave(p.id)}
                  className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#FF6B00' : 'none'} stroke={saved.includes(p.id) ? '#FF6B00' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.price}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{p.title}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {p.beds} Bed • {p.baths} Bath • {p.sqm} m&sup2;
              </p>
            </div>
          ))}
        </div>
        {/* TODO: Fetch recommendations from Supabase with user preference scoring */}
      </div>

      {/* ─── Property Feed ─────────────────────────────────────── */}
      <div className="flex flex-col gap-6 px-4 pb-24">
        {PROPERTIES.filter((p) => {
          if (activeCategory === 'Semua') return true
          if (activeCategory === 'Rumah Baru') return p.beds >= 3
          if (activeCategory === 'Apartemen') return p.beds <= 2
          return true
        }).map((p) => (
          <div key={p.id}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
              <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              {p.verified && (
                <span className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                  Verified Legal
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleSave(p.id)}
                className="absolute top-3 right-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors shadow-md"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#FF6B00' : 'none'} stroke={saved.includes(p.id) ? '#FF6B00' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{p.price}</h3>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-1">{p.title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {p.beds} Bed • {p.baths} Bath • {p.sqm} m&sup2;
            </p>
          </div>
        ))}
      </div>

      {/* ─── Filter Drawer ────────────────────────────────────── */}
      {showFilter && (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && setShowFilter(false)}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={() => setShowFilter(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[110] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Filter</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFilterPrice(''); setFilterType(''); setFilterBeds('') }}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Tipe Properti</label>
                <div className="flex gap-2 flex-wrap">
                  {['Rumah', 'Apartemen', 'Villa', 'Tanah', 'Kantor'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(filterType === t ? '' : t)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        filterType === t
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Rentang Harga</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '< Rp 1 M', value: '0-1M' },
                    { label: 'Rp 1–3 M', value: '1-3M' },
                    { label: '> Rp 3 M', value: '3M+' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setFilterPrice(filterPrice === r.value ? '' : r.value)}
                      className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        filterPrice === r.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Kamar Tidur</label>
                <div className="flex gap-2">
                  {['1', '2', '3', '4', '5+'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setFilterBeds(filterBeds === b ? '' : b)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        filterBeds === b
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold text-sm mt-2 active:scale-[0.98] transition-transform"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Bottom Navbar ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-around h-16">
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-orange-500 font-semibold"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-[10px] font-medium">Eksplor</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('chat')}
            className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 relative"
          >
            <div className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </div>
            <span className="text-[10px] font-medium">Chat</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
