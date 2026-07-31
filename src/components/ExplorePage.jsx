import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, Megaphone, Users, Calculator, TrendingDown, LayoutGrid, MessageCircle, ArrowLeftRight, MapPin, Sparkles, XCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import { getFavorites, toggleFavorite as toggleFav } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import { batchTranslate } from '../hooks/useGroqTranslation'
import MoreCategoriesDrawer from './MoreCategoriesDrawer'
import RecentlyViewed from './RecentlyViewed'
import CompareBar from './CompareBar'
import { addToCompare, removeFromCompare, getCompareList } from '../utils/compare'


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
  { icon: Search, tKey: 'explore.quick_menu.find_property', path: '/coming-soon' },
  { icon: Megaphone, tKey: 'explore.quick_menu.advertise', path: '/sell-role' },
  { icon: Users, tKey: 'explore.quick_menu.find_agent', path: '/coming-soon' },
  { icon: Calculator, tKey: 'explore.quick_menu.mortgage', path: '/kpr' },
  { icon: TrendingDown, tKey: 'explore.quick_menu.price_drop', path: '/coming-soon' },
  { icon: MessageCircle, tKey: 'explore.quick_menu.forum', path: '/forum' },
  { icon: ArrowLeftRight, tKey: 'explore.quick_menu.refinance', path: '/coming-soon' },
  { icon: LayoutGrid, tKey: 'explore.quick_menu.more', drawer: true },
]

const PROPERTY_TYPE_OPTIONS = [
  { value: 'Rumah', tKey: 'explore.filter.property_types.house' },
  { value: 'Apartemen', tKey: 'explore.filter.property_types.apartment' },
  { value: 'Villa', tKey: 'explore.filter.property_types.villa' },
  { value: 'Tanah', tKey: 'explore.filter.property_types.land' },
  { value: 'Kantor', tKey: 'explore.filter.property_types.office' },
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

function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden">
      <div className="aspect-[4/3] bg-brand-bg animate-pulse" />
      <div className="p-4 space-y-2.5">
        <div className="h-5 w-2/3 bg-brand-bg rounded-md animate-pulse" />
        <div className="h-3.5 w-full bg-brand-bg rounded-md animate-pulse" />
        <div className="h-3.5 w-3/4 bg-brand-bg rounded-md animate-pulse" />
        <div className="h-3.5 w-1/2 bg-brand-bg rounded-md animate-pulse mt-2 pt-2 border-t border-brand-border" />
      </div>
    </div>
  )
}

export default function ExplorePage() {
  useSEO({ title: 'Cari Properti — Jual, Beli & Sewa', description: 'Temukan properti terbaik untuk dijual, disewa di HuniOne. Rumah, apartemen, villa, tanah, ruko dan lainnya.' })
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(getFavorites())
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [searchCategory, setSearchCategory] = useState('dijual')
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false)
  const [compareSet, setCompareSet] = useState(new Set(getCompareList().map(p => p.id)))

  function toggleCompare(p) {
    if (compareSet.has(p.id)) {
      removeFromCompare(p.id)
      setCompareSet(prev => { const s = new Set(prev); s.delete(p.id); return s })
    } else {
      const updated = addToCompare(p)
      setCompareSet(new Set(updated.map(x => x.id)))
    }
    window.dispatchEvent(new Event('compare-updated'))
  }

  const [showBackToTop, setShowBackToTop] = useState(false)
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [isSmartSearching, setIsSmartSearching] = useState(false)
  const { user, showToast } = useAuth()
  const cancelledRef = useRef(false)
  const listingRef = useRef(null)
  const searchInputRef = useRef(null)
  const isAiSearchRef = useRef(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = user?.user_metadata?.first_name || null

  async function fetchProperties(filters = {}) {
    setLoadingProperties(true)
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'verified')

      if (filters.type) {
        query = query.eq('property_type', filters.type)
      }

      if (filters.beds) {
        if (filters.beds === '5+') {
          query = query.gte('bedrooms', 5)
        } else {
          query = query.eq('bedrooms', parseInt(filters.beds))
        }
      }

      if (filters.price) {
        if (filters.price === '0-1M') {
          query = query.lt('price', 1_000_000_000)
        } else if (filters.price === '1-3M') {
          query = query.gte('price', 1_000_000_000).lte('price', 3_000_000_000)
        } else if (filters.price === '3M+') {
          query = query.gt('price', 3_000_000_000)
        }
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (cancelledRef.current) return

      if (!error && data) {
        setProperties(data)
      } else if (error) {
        console.warn('Gagal memuat properti:', error.message)
      }
    } catch (err) {
      if (cancelledRef.current) return
      console.warn('Gagal memuat properti:', err.message)
    }
    if (!cancelledRef.current) setLoadingProperties(false)
  }

  useEffect(() => {
    cancelledRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProperties().catch(() => {})
    return () => { cancelledRef.current = true }
  }, [])

  const SORT_OPTIONS = [
    t('explore.all_properties.sort_newest'),
    t('explore.all_properties.sort_cheapest'),
    t('explore.all_properties.sort_expensive'),
  ]

  async function runSmartSearch(text) {
    if (!text.trim()) {
      showToast('Silakan ketik kriteria pencarian terlebih dahulu.', 'error')
      return
    }
    setIsSmartSearching(true)

    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          purpose: 'smart_search',
          messages: [{ role: 'user', content: text.trim() }],
        }),
      })

      if (!response.ok) throw new Error('Gagal terhubung ke AI')

      const data = await response.json()
      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) throw new Error('AI tidak mengembalikan data')

      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      if (cancelledRef.current) return

      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'verified')

      if (parsed.maxPrice) query = query.lte('price', parsed.maxPrice)
      if (parsed.minPrice) query = query.gte('price', parsed.minPrice)
      if (parsed.city) query = query.ilike('city', `%${parsed.city}%`)
      if (parsed.category) query = query.eq('category', parsed.category)
      if (parsed.propertyType) query = query.eq('property_type', parsed.propertyType)
      if (parsed.bedrooms) query = query.gte('bedrooms', parsed.bedrooms)
      if (parsed.bathrooms) query = query.gte('bathrooms', parsed.bathrooms)
      if (parsed.keyword) {
        query = query.or(`title.ilike.%${parsed.keyword}%,description_id.ilike.%${parsed.keyword}%`)
      }

      query = query.order('created_at', { ascending: false })

      const { data: results, error } = await query

      if (cancelledRef.current) return

      if (!error && results) {
        isAiSearchRef.current = true
        setProperties(results)
        listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (error) {
        throw new Error(error.message)
      }
    } catch (err) {
      if (cancelledRef.current) return
      try {
        const { data: fallback, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'verified')
          .ilike('title', `%${text.trim()}%`)
          .order('created_at', { ascending: false })
        if (!error && fallback) {
          isAiSearchRef.current = true
          setProperties(fallback)
        }
      } catch { /* silent */ }
      showToast('Gagal memproses pencarian AI. Menampilkan hasil pencarian biasa.', 'error')
    }
    setIsSmartSearching(false)
  }

  function handleAiSearch() {
    runSmartSearch(searchText)
    searchInputRef.current?.blur()
  }

  function resetAllSearch() {
    isAiSearchRef.current = false
    setSearchText('')
    setFilterType('')
    setFilterPrice('')
    setFilterBeds('')
    setProperties([])
    fetchProperties().catch(() => {})
    searchInputRef.current?.focus()
  }

  const toggleSave = async (id) => {
    const updated = await toggleFav(id)
    setSaved(updated)
  }

  const cycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length)
  }

  const filterCount = [filterType, filterPrice, filterBeds].filter(Boolean).length
  const hasActiveSearch = searchText.trim() !== '' || filterCount > 0

  const heroStats = useMemo(() => {
    const total = properties.length
    const cities = new Set(properties.map((p) => p.city || p.district).filter(Boolean)).size
    const types = new Set(properties.map((p) => p.property_type).filter(Boolean)).size
    return { total, cities, types }
  }, [properties])

  const sorted = [...properties].filter((p) => {
    if (searchCategory === 'dijual' && p.category !== 'Dijual') return false
    if (searchCategory === 'disewa' && p.category !== 'Disewa') return false
    if (searchCategory === 'baru') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      if (new Date(p.created_at).getTime() <= weekAgo) return false
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      const haystack = [p.title, p.address, p.location, p.city, p.district, p.description_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }

    if (filterType && p.property_type !== filterType) return false

    if (filterBeds) {
      const beds = Number(p.bedrooms) || 0
      const match = filterBeds === '5+' ? beds >= 5 : beds === parseInt(filterBeds, 10)
      if (!match) return false
    }

    if (filterPrice) {
      const price = Number(p.price) || 0
      if (filterPrice === '0-1M' && price >= 1_000_000_000) return false
      if (filterPrice === '1-3M' && (price < 1_000_000_000 || price > 3_000_000_000)) return false
      if (filterPrice === '3M+' && price <= 3_000_000_000) return false
    }

    return true
  }).sort((a, b) => {
    if (sortIndex === 1) return (Number(a.price) || 0) - (Number(b.price) || 0)
    if (sortIndex === 2) return (Number(b.price) || 0) - (Number(a.price) || 0)
    return 0
  })

  const isSearching = hasActiveSearch || isAiSearchRef.current
  const isSearchEmpty = isSearching && sorted.length === 0
  const showSkeleton = loadingProperties && !isSearching
  const displayRecommendations = sorted.length > 0 ? sorted.slice(0, 4) : (isSearching ? [] : DUMMY_PROPERTIES.slice(0, 4))
  const displayListings = sorted.length > 0 ? sorted : (isSearching ? [] : DUMMY_PROPERTIES)

  const translationRef = useRef({})
  const lang = i18n.language

  useEffect(() => {
    if (lang !== 'en') {
      translationRef.current = {}
      return
    }
    const allProps = [...new Map([...displayListings, ...displayRecommendations].map((p) => [p.id, p])).values()]
    const controller = new AbortController()
    batchTranslate(allProps, controller.signal)
      .then((result) => {
        if (result) translationRef.current = { ...translationRef.current, ...result }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [lang, displayListings, displayRecommendations])

  const getTranslated = useCallback((prop, field, fallback) => {
    if (lang !== 'en') return fallback
    return translationRef.current[prop.id]?.[field] ?? fallback
  }, [lang])

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* ─── HERO BANNER ─── */}
      <div className="relative bg-gradient-to-br from-brand-primary via-brand-primary to-[#284D7A] overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-brand-accent/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute inset-0 opacity-[0.07]">
          <img loading="lazy"
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {user ? (
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {t('explore.hero.welcome_with_name')}{firstName ? `, ${firstName}` : ''}
              </h1>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {t('explore.hero.welcome')}
                </h1>
                <p className="text-white/75 text-sm sm:text-base mt-2 max-w-2xl">
                  {t('explore.hero.tagline')}
                </p>
              </>
            )}
          </motion.div>

          {heroStats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-white/70 text-xs sm:text-sm"
            >
              <span><b className="text-white font-bold text-sm sm:text-base">{heroStats.total}</b> properti</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span><b className="text-white font-bold text-sm sm:text-base">{heroStats.cities}</b> kota</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span><b className="text-white font-bold text-sm sm:text-base">{heroStats.types}</b> tipe</span>
            </motion.div>
          )}

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
            className="bg-white/95 backdrop-blur rounded-3xl shadow-xl shadow-brand-primary/15 border border-white/60 p-4 sm:p-5 mt-7"
          >
            <div className="flex gap-5 sm:gap-6 mb-4 border-b border-brand-border/70">
              {[
                { key: 'dijual', tKey: 'explore.search.tab_sale' },
                { key: 'disewa', tKey: 'explore.search.tab_rent' },
                { key: 'baru', tKey: 'explore.search.tab_new' },
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
                  {t(tab.tKey)}
                </button>
              ))}
            </div>
            <div className="flex items-center px-3.5 py-2 bg-white border border-brand-border rounded-2xl gap-2.5 focus-within:border-brand-accent focus-within:ring-4 focus-within:ring-brand-accent/10 transition-all">
              <span className="text-brand-muted shrink-0">
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={
                  searchCategory === 'dijual'
                    ? t('explore.search.placeholder_sale')
                    : searchCategory === 'disewa'
                    ? t('explore.search.placeholder_rent')
                    : t('explore.search.placeholder_new')
                }
                aria-label={t('explore.search.aria_label')}
                className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none min-w-0"
              />
              {searchText.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setSearchText(''); searchInputRef.current?.focus() }}
                  className="shrink-0 text-brand-muted/60 hover:text-brand-text transition-colors p-1"
                  aria-label="Hapus pencarian"
                >
                  <XCircle size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleAiSearch}
                disabled={!searchText.trim() || isSmartSearching}
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-brand-accent bg-brand-highlight hover:bg-brand-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-xl px-3 py-2"
                title="Cari dengan AI"
              >
                {isSmartSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span className="hidden sm:inline">{isSmartSearching ? 'Memproses' : 'Cari AI'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="relative text-brand-muted hover:text-brand-accent transition-colors shrink-0"
                aria-label={t('explore.filter.title')}
              >
                <FilterIcon />
                {filterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {filterCount}
                  </span>
                )}
              </button>
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-brand-muted mt-3 pt-3 border-t border-brand-border/60">
              <Sparkles size={11} className="text-brand-accent shrink-0" />
              <span>Tips: coba <span className="font-medium text-brand-text">"rumah di BSD harga di bawah 2M"</span> untuk pencarian AI</span>
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── QUICK ACCESS GRID ─── */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="bg-white/95 backdrop-blur rounded-2xl shadow-lg shadow-brand-primary/5 border border-brand-border p-4"
        >
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-2">
            {QUICK_MENU.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.tKey}
                  type="button"
                  onClick={() => {
                    if (item.drawer) return setIsMoreDrawerOpen(true)
                    if (item.path) navigate(item.path)
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform group"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-brand-bg flex items-center justify-center text-brand-primary shadow-sm group-hover:bg-brand-accent group-hover:text-white group-hover:-translate-y-0.5 group-hover:shadow-md transition-all duration-200">
                    <Icon size={20} />
                  </div>
                  <span className="text-[11px] text-brand-text font-semibold text-center leading-tight">
                    {t(item.tKey)}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── TERAKHIR DILIHAT ─── */}
      <section className="max-w-7xl mx-auto px-4 mt-8 mb-4">
        <RecentlyViewed />
      </section>

      {/* ─── REKOMENDASI SESUAI PENCARIANMU ─── */}
      {showSkeleton ? (
      <section className="max-w-7xl mx-auto px-4 mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-44 bg-brand-bg rounded-md animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="min-w-[260px] w-[260px] shrink-0">
              <PropertyCardSkeleton />
            </div>
          ))}
        </div>
      </section>
      ) : displayRecommendations.length > 0 && (
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 mt-8 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            {t('explore.recommendations.title')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors"
          >
            {t('explore.recommendations.view_all')}
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {displayRecommendations.map((p) => (
            <Link
              key={p.id}
              to={`/property/${p.id}`}
              className="min-w-[260px] w-[260px] shrink-0 group"
            >
              <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-brand-primary/5">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img loading="lazy"
                    src={getImageSrc(p.image_url)}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                  />
                  {p.status === 'verified' && (
                    <span className="absolute top-2 left-2 bg-brand-verified-bg text-brand-verified border border-brand-verified/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {t('explore.property_card.verified_legal')}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-base font-extrabold text-brand-primary">
                    {formatPrice(p.price)}
                  </p>
                  <p className="text-sm font-semibold text-brand-text mt-0.5 truncate">
                    {getTranslated(p, 'title', p.title)}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1">
                    <MapPin size={12} />
                    {getTranslated(p, 'address', p.address || p.location || t('explore.location_fallback'))}
                  </p>
                  <div className="flex gap-3 text-[11px] text-brand-muted mt-2 pt-2 border-t border-brand-border">
                    <span>{p.bedrooms} {t('explore.property_card.bed')}</span>
                    <span>{p.bathrooms} {t('explore.property_card.bath')}</span>
                    <span>{p.area_sqm || p.sqm || '-'} m&sup2;</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>
      )}

      {/* ─── PENCARIAN PROPERTI POPULER ─── */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            {t('explore.popular_searches.title')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/coming-soon')}
            className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors"
          >
            {t('explore.popular_searches.shuffle')}
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
                <img loading="lazy"
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">
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
      <motion.section
        ref={listingRef}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 pb-24 bg-brand-bg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            {t('explore.all_properties.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className="relative text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors"
            >
              {t('explore.all_properties.filter')}
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={cycleSort}
              className="flex items-center gap-1 text-xs text-brand-muted bg-brand-surface border border-brand-border rounded-full px-3 py-1.5 font-medium hover:bg-brand-bg transition-colors"
            >
              {t('explore.all_properties.sort')}: {SORT_OPTIONS[sortIndex]}
              <ChevronDownIcon />
            </button>
          </div>
        </div>

        {showSkeleton ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <PropertyCardSkeleton />
              </div>
            ))}
          </div>
        ) : isSearchEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-brand-muted/40" />
            </div>
            <p className="text-base font-semibold text-brand-text mb-1">
              Properti dengan kriteria tersebut belum ditemukan
            </p>
            <p className="text-sm text-brand-muted mb-6 max-w-xs">
              Coba ubah kata kunci pencarian, filter, atau gunakan kata yang lebih umum.
            </p>
            <button
              type="button"
              onClick={resetAllSearch}
              className="px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayListings.map((p) => (
              <div key={p.id}>
                <Link to={`/property/${p.id}`} className="block group">
                  <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-brand-primary/5">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img loading="lazy"
                        src={getImageSrc(p.image_url)}
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
                          <span className="bg-brand-verified-bg text-brand-verified border border-brand-verified/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                            {t('explore.property_card.verified_legal')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-xl font-extrabold text-brand-primary">
                        {p.priceDisplay || formatPrice(p.price)}
                      </p>
                      <p className="text-base font-semibold text-brand-text mt-1 group-hover:text-brand-accent transition-colors">
                        {getTranslated(p, 'title', p.title)}
                      </p>
                      <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
                        <MapPin size={14} />
                        {getTranslated(p, 'address', p.address || p.location || t('explore.location_fallback'))}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                        <div className="flex gap-3 text-xs text-brand-muted">
                          <span>{p.bedrooms} {t('explore.property_card.bed')}</span>
                          <span>{p.bathrooms} {t('explore.property_card.bath')}</span>
                          <span>{p.area_sqm || p.sqm || '-'} m&sup2;</span>
                        </div>
                        {p.agent && (
                          <span className="text-xs font-medium text-brand-accent">{p.agent}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleCompare(p)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      compareSet.has(p.id)
                        ? 'text-brand-primary font-semibold'
                        : 'text-brand-muted hover:text-brand-primary'
                    }`}
                  >
                    <ArrowLeftRight size={14} />
                    {compareSet.has(p.id) ? 'Terseleksi' : 'Bandingkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSave(p.id)}
                    className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-accent transition-colors"
                  >
                     <svg width="16" height="16" viewBox="0 0 24 24" fill={saved.includes(p.id) ? '#4A90E2' : 'none'} stroke={saved.includes(p.id) ? '#4A90E2' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {saved.includes(p.id) ? t('explore.property_card.saved') : t('explore.property_card.save')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

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
              <h2 className="text-lg font-bold text-brand-text">{t('explore.filter.title')}</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFilterPrice('')
                    setFilterType('')
                    setFilterBeds('')
                  }}
                  className="text-sm text-brand-muted hover:text-brand-text transition-colors"
                >
                  {t('explore.filter.reset')}
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
                <label className="text-sm font-semibold text-brand-text mb-2 block">{t('explore.filter.property_type')}</label>
                <div className="flex gap-2 flex-wrap">
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilterType(filterType === opt.value ? '' : opt.value)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        filterType === opt.value
                          ? 'bg-brand-primary text-white'
                          : 'bg-brand-bg text-brand-muted border border-brand-border'
                      }`}
                    >
                      {t(opt.tKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">{t('explore.filter.price_range')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { labelKey: 'explore.filter.price_options.under_1b', value: '0-1M' },
                    { labelKey: 'explore.filter.price_options.one_to_3b', value: '1-3M' },
                    { labelKey: 'explore.filter.price_options.above_3b', value: '3M+' },
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
                      {t(r.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">{t('explore.filter.bedrooms')}</label>
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
                className="w-full bg-brand-primary text-white rounded-xl py-3 font-bold text-sm mt-2 hover:bg-[#284D7A] active:scale-[0.98] transition-transform"
              >
                {t('explore.filter.apply')}
              </button>
            </div>
          </div>
        </>
      )}

      <CompareBar />

      {showBackToTop && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-5 z-40 w-11 h-11 rounded-full bg-brand-primary text-white shadow-lg flex items-center justify-center hover:brightness-90 active:scale-90 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  )
}
