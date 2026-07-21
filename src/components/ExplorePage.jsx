import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Megaphone, Users, Calculator, TrendingDown, LayoutGrid, MessageCircle, ArrowLeftRight, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import MoreCategoriesDrawer from './MoreCategoriesDrawer'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

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

const QUICK_MENU = [
  { icon: Search, label: 'Carikan Properti', path: '/coming-soon' },
  { icon: Megaphone, label: 'Iklankan Properti', path: '/sell' },
  { icon: Users, label: 'Cari Agen', path: '/coming-soon' },
  { icon: Calculator, label: 'Kalkulator KPR', path: '/coming-soon' },
  { icon: TrendingDown, label: 'Turun Harga', path: '/coming-soon' },
  { icon: MessageCircle, label: 'Tanya Forum', path: '/coming-soon' },
  { icon: ArrowLeftRight, label: 'Pindah KPR', path: '/coming-soon' },
  { icon: LayoutGrid, label: 'Lainnya', drawer: true },
]

const POPULAR_SEARCHES = [
  {
    title: 'Rekomendasi Hunian Nyaman Dekat Kampus',
    tags: ['Kos Eksklusif', 'Apartemen', 'BSD', 'Budget Mahasiswa'],
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Kost Jakarta Nyaman dan Strategis',
    tags: ['Kost', 'Jakarta', 'Fasilitas Lengkap'],
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Cluster Mewah dengan Fasilitas Premium',
    tags: ['Cluster', 'Mewah', 'BSD City', 'Diskon 10%'],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Ruko & Ruang Usaha Strategis BSD',
    tags: ['Ruko', 'Kantor', 'BSD Central', 'Komersial'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  },
]

export default function ExplorePage({ onNavigate }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [saved, setSaved] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [searchCategory, setSearchCategory] = useState('dijual')
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false)

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const firstName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ')[0]
    : null

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
      }

      setLoading(false)
    }

    fetchProperties()
  }, [])

  const SORT_OPTIONS = ['Terbaru', 'Termurah', 'Termahal']

  const toggleSave = (id) => {
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const cycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length)
  }

  const filtered = properties.filter((p) => {
    if (activeCategory === 'Rumah Baru' && p.bedrooms < 3) return false
    if (activeCategory === 'Apartemen' && p.bedrooms > 2) return false
    if (filterType && p.title !== filterType) return false
    if (filterBeds) {
      const num = parseInt(filterBeds)
      if (filterBeds === '5+' ? (p.bedrooms || 0) < 5 : p.bedrooms !== num) return false
    }
    if (filterPrice) {
      const price = Number(p.price) || 0
      if (filterPrice === '0-1M' && price > 1_000_000_000) return false
      if (filterPrice === '1-3M' && (price < 1_000_000_000 || price > 3_000_000_000)) return false
      if (filterPrice === '3M+' && price < 3_000_000_000) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortIndex === 1) return (Number(a.price) || 0) - (Number(b.price) || 0)
    if (sortIndex === 2) return (Number(b.price) || 0) - (Number(a.price) || 0)
    return 0
  })

  const displayRecommendations = sorted.length > 0 ? sorted.slice(0, 4) : DUMMY_PROPERTIES.slice(0, 4)
  const displayListings = sorted.length > 0 ? sorted : DUMMY_PROPERTIES

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* ─── HERO BANNER ─── */}
      <div className="relative bg-brand-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]">
          <img
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-10 sm:pt-10 sm:pb-14">
          {user ? (
            <h1 className="text-2xl font-bold text-white">
              Selamat Datang{firstName ? `, ${firstName}` : ''}
            </h1>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">
                Selamat datang di Vastara!
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Jual Beli dan Sewa Properti Jadi Mudah
              </p>
            </>
          )}

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 mt-6">
            <div className="flex gap-6 mb-4 border-b border-slate-200">
              {[
                { key: 'dijual', label: 'Dijual' },
                { key: 'disewa', label: 'Disewa' },
                { key: 'baru', label: 'Properti Baru' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSearchCategory(tab.key)}
                  className={`pb-2 text-sm transition-colors ${
                    searchCategory === tab.key
                      ? 'text-brand-primary font-semibold border-b-2 border-brand-primary'
                      : 'text-brand-muted font-medium border-b-2 border-transparent hover:text-brand-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center px-3 py-2 bg-brand-bg rounded-xl gap-3">
              <span className="text-brand-muted shrink-0">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder={
                  searchCategory === 'dijual'
                    ? 'Cari lokasi atau nama properti...'
                    : searchCategory === 'disewa'
                    ? 'Cari properti untuk disewa...'
                    : 'Cari properti baru...'
                }
                aria-label="Cari properti"
                className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="text-brand-muted hover:text-brand-secondary transition-colors shrink-0"
              >
                <FilterIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── QUICK ACCESS GRID ─── */}
      <div className="max-w-7xl mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-brand-surface rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-4 gap-4">
            {QUICK_MENU.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.drawer) return setIsMoreDrawerOpen(true)
                    if (item.path) navigate(item.path)
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-secondary shadow-sm">
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] text-brand-text font-semibold text-center leading-tight">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── REKOMENDASI SESUAI PENCARIANMU ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            Rekomendasi Sesuai Pencarianmu
          </h2>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="text-sm font-semibold text-brand-secondary hover:text-brand-primary transition-colors"
          >
            Lihat Selengkapnya
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {displayRecommendations.map((p) => (
            <Link
              key={p.id}
              to={`/property/${p.id}`}
              className="min-w-[260px] w-[260px] shrink-0 group"
            >
              <div className="bg-brand-surface rounded-2xl shadow-sm overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={p.image_url || FALLBACK_IMAGE}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.status === 'verified' && (
                    <span className="absolute top-2 left-2 bg-brand-accent/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                      Verified Legal
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-base font-extrabold text-brand-primary">
                    {formatPrice(p.price)}
                  </p>
                  <p className="text-sm font-semibold text-brand-text mt-0.5 truncate">
                    {p.title}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1">
                    <MapPin size={12} />
                    {p.location || 'Indonesia'}
                  </p>
                  <div className="flex gap-3 text-[11px] text-brand-muted mt-2 pt-2 border-t border-brand-border">
                    <span>{p.bedrooms} Bed</span>
                    <span>{p.bathrooms} Bath</span>
                    <span>{p.sqm} m&sup2;</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── PENCARIAN PROPERTI POPULER ─── */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            Pencarian Properti Populer
          </h2>
          <button
            type="button"
            onClick={() => navigate('/coming-soon')}
            className="text-sm font-semibold text-brand-secondary hover:text-brand-primary transition-colors"
          >
            Acak Pencarian
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {POPULAR_SEARCHES.map((item) => (
            <Link
              key={item.title}
              to="/coming-soon"
              className="bg-brand-surface rounded-2xl shadow-sm overflow-hidden flex items-stretch group"
            >
              <div className="w-24 sm:w-32 shrink-0 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-brand-text group-hover:text-brand-secondary transition-colors">
                  {item.title}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── FULL PROPERTY LISTING ─── */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            Semua Properti
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className="text-sm font-semibold text-brand-secondary hover:text-brand-primary transition-colors"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={cycleSort}
              className="flex items-center gap-1 text-xs text-brand-muted bg-brand-surface border border-brand-border rounded-full px-3 py-1.5 font-medium hover:bg-slate-50 transition-colors"
            >
              Urutkan: {SORT_OPTIONS[sortIndex]}
              <ChevronDownIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {displayListings.map((p) => (
            <div key={p.id}>
              <Link to={`/property/${p.id}`} className="block group">
                <div className="bg-brand-surface rounded-2xl shadow-sm overflow-hidden">
                  <div className="relative aspect-[4/3] sm:aspect-[16/7]">
                    <img
                      src={p.image_url || FALLBACK_IMAGE}
                      alt={p.title}
                      onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.typeLabel && (
                        <span className="bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                          {p.typeLabel}
                        </span>
                      )}
                      {p.status === 'verified' && (
                        <span className="bg-brand-accent/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                          Verified Legal
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xl font-extrabold text-brand-primary">
                      {p.priceDisplay || formatPrice(p.price)}
                    </p>
                    <p className="text-base font-semibold text-brand-text mt-1 group-hover:text-brand-secondary transition-colors">
                      {p.title}
                    </p>
                    <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
                      <MapPin size={14} />
                      {p.location || 'Indonesia'}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                      <div className="flex gap-3 text-xs text-brand-muted">
                        <span>{p.bedrooms} Bed</span>
                        <span>{p.bathrooms} Bath</span>
                        <span>{p.sqm} m&sup2;</span>
                      </div>
                      {p.agent && (
                        <span className="text-xs font-medium text-brand-secondary">{p.agent}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleSave(p.id)}
                  className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-secondary transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#4A90E2' : 'none'} stroke={saved.includes(p.id) ? '#4A90E2' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {saved.includes(p.id) ? 'Disimpan' : 'Simpan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DRAWERS ─── */}
      <MoreCategoriesDrawer
        isOpen={isMoreDrawerOpen}
        onClose={() => setIsMoreDrawerOpen(false)}
      />

      {showFilter && (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && setShowFilter(false)}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={() => setShowFilter(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[110] bg-brand-surface border border-brand-border rounded-t-3xl p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-text">Filter</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFilterPrice(''); setFilterType(''); setFilterBeds('') }}
                  className="text-sm text-brand-muted hover:text-brand-text transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="text-brand-muted hover:text-brand-text transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">Tipe Properti</label>
                <div className="flex gap-2 flex-wrap">
                  {['Rumah', 'Apartemen', 'Villa', 'Tanah', 'Kantor'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(filterType === t ? '' : t)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        filterType === t
                          ? 'bg-brand-primary text-white'
                          : 'bg-brand-bg text-brand-muted border border-brand-border'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">Rentang Harga</label>
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
                          ? 'bg-brand-primary text-white'
                          : 'bg-brand-bg text-brand-muted border border-brand-border'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">Kamar Tidur</label>
                <div className="flex gap-2">
                  {['1', '2', '3', '4', '5+'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setFilterBeds(filterBeds === b ? '' : b)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        filterBeds === b
                          ? 'bg-brand-primary text-white'
                          : 'bg-brand-bg text-brand-muted border border-brand-border'
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
                className="w-full bg-brand-primary text-white rounded-xl py-3 font-bold text-sm mt-2 active:scale-[0.98] transition-transform"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
