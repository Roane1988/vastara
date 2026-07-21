import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Megaphone, Users, Calculator, TrendingDown, LayoutGrid, MessageCircle, ArrowLeftRight, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient'

const CATEGORIES = ['Semua', 'Rumah Baru', 'Apartemen', 'BSD City', 'Jakarta Selatan']
const SORT_OPTIONS = ['Terbaru', 'Termurah', 'Termahal']
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'

const DUMMY_PROPERTIES = [
  {
    id: 'dummy-1',
    title: 'Kos Eksklusif Mahasiswa — Free WiFi & Laundry',
    location: 'Dekat Kampus BSD, Tangerang',
    price: 2500000,
    priceDisplay: 'Rp 2.500.000 / bulan',
    typeLabel: 'Disewa',
    category: 'Kos',
    image_url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80',
    bedrooms: 1,
    bathrooms: 1,
    sqm: 24,
    agent: 'Aqsha (Marketing)',
    status: 'verified',
  },
  {
    id: 'dummy-2',
    title: 'Studio Apartemen BSD — Fully Furnished',
    location: 'BSD City, Tangerang',
    price: 4500000,
    priceDisplay: 'Rp 4.500.000 / bulan',
    typeLabel: 'Disewa',
    category: 'Apartemen',
    image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    bedrooms: 1,
    bathrooms: 1,
    sqm: 32,
    agent: 'Rina (Agent)',
    status: 'verified',
  },
  {
    id: 'dummy-3',
    title: 'Cluster Mewah Kavling 7 — BSD City',
    location: 'Pagedangan, BSD City',
    price: 1850000000,
    priceDisplay: 'Rp 1,85 M',
    typeLabel: 'Dijual',
    category: 'Rumah',
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    bedrooms: 4,
    bathrooms: 3,
    sqm: 150,
    agent: 'Aqsha (Senior Agent)',
    status: 'verified',
  },
  {
    id: 'dummy-4',
    title: 'Ruko 2 Lantai Strategis — BSD Central',
    location: 'BSD City, Tangerang',
    price: 15000000,
    priceDisplay: 'Rp 15.000.000 / bulan',
    typeLabel: 'Disewa',
    category: 'Kantor',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    bedrooms: 2,
    bathrooms: 2,
    sqm: 96,
    agent: 'Bambang (Agent)',
    status: null,
  },
  {
    id: 'dummy-5',
    title: 'Kos Putra/Putri — 5 Menit ke Kampus',
    location: 'Dekat Kampus BSD, Tangerang',
    price: 1200000,
    priceDisplay: 'Rp 1.200.000 / bulan',
    typeLabel: 'Disewa',
    category: 'Kos',
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    bedrooms: 1,
    bathrooms: 1,
    sqm: 18,
    agent: 'Dewi (Admin)',
    status: null,
  },
]

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

function PromoBanner({ agent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg min-h-[220px] sm:min-h-[260px] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/30" />
      <div className="relative z-10 p-6 sm:p-8">
        <span className="inline-block bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">
          Hot Deal
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-white">Cluster Mewah BSD Diskon 10%</h3>
        <p className="text-sm sm:text-base text-slate-300 mt-1 mb-5">Terbatas hanya minggu ini.</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-sm font-bold">
              {agent?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-xs text-slate-300">Direkomendasikan oleh</p>
              <p className="text-sm font-bold text-white">{agent || 'Aqsha (Senior Agent)'}</p>
            </div>
          </div>
          <button
            type="button"
            className="bg-white text-slate-900 rounded-xl px-5 py-2.5 text-sm font-bold active:scale-95 transition-transform hover:bg-slate-100"
          >
            Lihat Promo
          </button>
        </div>
      </div>
    </div>
  )
}

const QUICK_MENU = [
  { icon: Search, label: 'Carikan Properti', action: 'coming-soon' },
  { icon: Megaphone, label: 'Iklankan Properti', action: 'sell' },
  { icon: Users, label: 'Cari Agen', action: 'coming-soon' },
  { icon: Calculator, label: 'Kalkulator KPR', action: 'coming-soon' },
  { icon: TrendingDown, label: 'Turun Harga', action: 'coming-soon' },
  { icon: MessageCircle, label: 'Tanya Forum', action: 'coming-soon' },
  { icon: ArrowLeftRight, label: 'Pindah KPR', action: 'coming-soon' },
  { icon: LayoutGrid, label: 'Lainnya', action: 'coming-soon' },
]

export default function ExplorePage({ onNavigate }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [saved, setSaved] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [searchCategory, setSearchCategory] = useState('dijual')

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
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.max(properties.length, 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [properties.length])

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

  const recommended = [...properties]
    .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-14 bg-brand-surface/90 backdrop-blur-md z-30 pt-4 pb-4 px-4">
        {user ? (
          <h1 className="text-2xl font-bold text-brand-text mb-5">
            Selamat Datang, {firstName}
          </h1>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-brand-text mb-1">
              Selamat datang di Vastara!
            </h1>
            <p className="text-sm text-brand-muted mb-4">
              Jual/beli properti impian disini!
            </p>
          </>
        )}
        <div className="bg-brand-primary rounded-2xl shadow-lg p-4 mt-4">
          <div className="flex space-x-6 mb-4 border-b border-white/20">
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
                    ? 'text-white font-semibold border-b-2 border-white'
                    : 'text-white/70 font-medium border-b-2 border-transparent hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl flex items-center px-3 py-2">
            <SearchIcon />
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
              className="text-brand-muted hover:text-brand-secondary transition-colors"
            >
              <FilterIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 px-4 py-4">
        {QUICK_MENU.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => item.action && navigate(`/${item.action}`)}
              className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
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
                    ? 'bg-brand-primary text-white'
                    : 'border border-brand-border text-brand-muted hover:bg-slate-100'
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
          className="shrink-0 flex items-center gap-1.5 border border-brand-border bg-brand-surface rounded-full px-3.5 py-1.5 text-xs text-brand-text font-medium hover:bg-slate-50 transition-colors"
        >
          Urutkan: {SORT_OPTIONS[sortIndex]}
          <ChevronDownIcon />
        </button>
      </div>

      <div className="px-4 mb-6">
        <PromoBanner agent="Aqsha (Senior Agent)" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="px-4 mb-6">
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md bg-slate-100 ">
              {properties.slice(0, 3).map((p, index) => (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={p.image_url || FALLBACK_IMAGE}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <span className="inline-block bg-brand-primary text-white text-[10px] px-2 py-1 rounded-full font-bold mb-2">
                      {p.status === 'verified' ? 'Verified Legal' : 'Listing Baru'}
                    </span>
                    <h3 className="text-lg font-extrabold text-white leading-tight">{p.title}</h3>
                    <p className="text-xs text-slate-300 mt-1">{p.location}</p>
                  </div>
                </Link>
              ))}
              {properties.length > 0 && (
                <div className="flex gap-1.5 absolute bottom-3 left-1/2 -translate-x-1/2">
                  {properties.slice(0, 3).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all rounded-full ${
                        index === currentSlide
                          ? 'w-4 h-1.5 bg-brand-primary'
                          : 'w-1.5 h-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {recommended.length > 0 && user && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-brand-text px-4 mb-3">
                Pilihan untuk {firstName}
              </h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
                {recommended.map((p) => (
                  <Link key={p.id} to={`/property/${p.id}`} className="w-[260px] shrink-0 group">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-slate-100 ">
                      <img src={p.image_url || FALLBACK_IMAGE} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {p.status === 'verified' && (
                        <span className="absolute top-2 left-2 bg-brand-accent/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                          Verified Legal
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); toggleSave(p.id) }}
                        className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full text-brand-muted hover:text-brand-secondary transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#4A90E2' : 'none'} stroke={saved.includes(p.id) ? '#4A90E2' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-brand-text group-hover:text-brand-secondary transition-colors">{formatPrice(p.price)}</h3>
                    <p className="text-xs text-brand-muted mt-0.5 group-hover:text-brand-secondary transition-colors">{p.title}</p>
                    <p className="text-[11px] text-brand-muted mt-0.5">
                      {p.bedrooms} Bed &bull; {p.bathrooms} Bath &bull; {p.sqm} m&sup2;
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 px-4 pb-24">
            {sorted.map((p) => (
              <div key={p.id}>
                <Link to={`/property/${p.id}`} className="block group">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-slate-100 ">
                    <img src={p.image_url || FALLBACK_IMAGE} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {p.status === 'verified' && (
                      <span className="absolute top-3 left-3 bg-brand-accent/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        Verified Legal
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-brand-text group-hover:text-brand-secondary transition-colors">{formatPrice(p.price)}</h3>
                  <p className="text-base font-semibold text-brand-text mt-1 group-hover:text-brand-secondary transition-colors">{p.title}</p>
                  <p className="text-sm text-brand-muted mt-1">
                    {p.bedrooms} Bed &bull; {p.bathrooms} Bath &bull; {p.sqm} m&sup2;
                  </p>
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
            {sorted.length === 0 && !loading && (
              <div className="flex flex-col gap-6">
                {DUMMY_PROPERTIES.map((p) => (
                  <Link key={p.id} to={`/property/${p.id}`} className="block group">
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="relative aspect-[4/3]">
                        <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                            {p.typeLabel}
                          </span>
                          {p.status === 'verified' && (
                            <span className="bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                              Verified Legal
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-extrabold text-brand-primary">{p.priceDisplay}</h3>
                        <p className="text-base font-semibold text-brand-text mt-1">{p.title}</p>
                        <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
                          <MapPin size={14} /> {p.location}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div className="flex gap-3 text-xs text-brand-muted">
                            <span>{p.bedrooms} Bed</span>
                            <span>{p.bathrooms} Bath</span>
                            <span>{p.sqm} m&sup2;</span>
                          </div>
                          <span className="text-xs font-medium text-brand-secondary">{p.agent}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
