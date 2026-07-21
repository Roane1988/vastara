import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const CATEGORIES = ['Semua', 'Rumah Baru', 'Apartemen', 'BSD City', 'Jakarta Selatan']
const SORT_OPTIONS = ['Terbaru', 'Termurah', 'Termahal']
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

export default function ExplorePage({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [saved, setSaved] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [sortIndex, setSortIndex] = useState(0)

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalListings, setTotalListings] = useState(0)
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

      const { count, error: countError } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .in('status', ['verified', 'pending'])

      if (!countError) {
        setTotalListings(count || 0)
      }

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
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 pt-12 pb-4 px-4">
        {user ? (
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">
            Selamat Datang, {firstName}
          </h1>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Selamat datang di Vastara!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Jual/beli properti impian disini!
            </p>
          </>
        )}
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

      <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800/80 border border-orange-100 dark:border-slate-700 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Verified Listings</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalListings}</p>
        </div>
        <Link
          to="/sell"
          className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 active:scale-[0.97] transition-all shadow-md shadow-orange-500/20"
        >
          Jual Properti
        </Link>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="px-4 mb-6">
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800">
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
                    <span className="inline-block bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold mb-2">
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
                          ? 'w-4 h-1.5 bg-orange-500'
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white px-4 mb-3">
                Pilihan untuk {firstName}
              </h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
                {recommended.map((p) => (
                  <Link key={p.id} to={`/property/${p.id}`} className="w-[260px] shrink-0 group">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                      <img src={p.image_url || FALLBACK_IMAGE} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {p.status === 'verified' && (
                        <span className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                          Verified Legal
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); toggleSave(p.id) }}
                        className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-orange-500 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#FF6B00' : 'none'} stroke={saved.includes(p.id) ? '#FF6B00' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#FF6B00] transition-colors">{formatPrice(p.price)}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{p.title}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
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
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                    <img src={p.image_url || FALLBACK_IMAGE} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {p.status === 'verified' && (
                      <span className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        Verified Legal
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-[#FF6B00] transition-colors">{formatPrice(p.price)}</h3>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{p.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {p.bedrooms} Bed &bull; {p.bathrooms} Bath &bull; {p.sqm} m&sup2;
                  </p>
                </Link>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleSave(p.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#FF6B00' : 'none'} stroke={saved.includes(p.id) ? '#FF6B00' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {saved.includes(p.id) ? 'Disimpan' : 'Simpan'}
                  </button>
                </div>
              </div>
            ))}
            {sorted.length === 0 && !loading && (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-20">
                Tidak ada properti yang ditemukan.
              </p>
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
                    { label: 'Rp 1\u20133 M', value: '1-3M' },
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-around h-16">
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-orange-500 font-semibold hover:brightness-110"
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
