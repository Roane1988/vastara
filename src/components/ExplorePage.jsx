import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, Megaphone, Users, TrendingDown, TrendingUp, LayoutGrid, MessageCircle, ArrowLeftRight, MapPin, Sparkles, XCircle, Wallet, X, Filter, ChevronDown, Bell, Check, Plus, Home, MessageSquare } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getFavorites } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPriceDisplay, formatCount } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import { batchTranslate } from '../hooks/useGroqTranslation'
import { useCompare } from '../hooks/useCompare'
import { serializeFilters, isNewListing } from '../utils/savedSearch'
import MoreCategoriesDrawer from './MoreCategoriesDrawer'
import RecentlyViewed from './RecentlyViewed'
import CompareBar from './CompareBar'
import PopularSearches from './PopularSearches'
import ExploreInsights from './ExploreInsights'
import ExplorePhase2 from './ExplorePhase2'
import { useSavedSearchAlerts } from '../context/SavedSearchAlertsContext'
import { getFinancialProfile, computeAffordability, maxAffordablePrice, estimateMonthlyRent, isRentalProperty } from '../utils/financialProfile'
import { getAuthHeaders } from '../utils/groqClient'
import PropertyGridCard from './PropertyGridCard'



const QUICK_MENU = [
  { icon: Search, tKey: 'explore.quick_menu.find_property', action: 'search' },
  { icon: Megaphone, tKey: 'explore.quick_menu.advertise', path: '/sell-role' },
  { icon: Users, tKey: 'explore.quick_menu.find_agent', path: '/agents' },
  { icon: TrendingDown, tKey: 'explore.quick_menu.price_drop', path: '/price-drop' },
  { icon: TrendingUp, tKey: 'explore.quick_menu.price_trends', path: '/price-trends' },
  { icon: MessageCircle, tKey: 'explore.quick_menu.forum', path: '/forum' },
  { icon: LayoutGrid, tKey: 'explore.quick_menu.more', drawer: true },
]

const PROPERTY_TYPE_OPTIONS = [
  { value: 'Rumah', tKey: 'explore.filter.property_types.house' },
  { value: 'Apartemen', tKey: 'explore.filter.property_types.apartment' },
  { value: 'Villa', tKey: 'explore.filter.property_types.villa' },
  { value: 'Tanah', tKey: 'explore.filter.property_types.land' },
  { value: 'Kantor', tKey: 'explore.filter.property_types.office' },
  { value: 'Ruko', tKey: 'explore.filter.property_types.ruko' },
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
  const location = useLocation()
  const { user, showToast } = useAuth()
  const [saved] = useState(getFavorites)
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [filterPremium, setFilterPremium] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [searchCategory, setSearchCategory] = useState('dijual')
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false)
  const [properties, setProperties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [isSmartSearching, setIsSmartSearching] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savingSearch, setSavingSearch] = useState(false)
  const [savedSearchOk, setSavedSearchOk] = useState(false)
  const cancelledRef = useRef(false)
  const listingRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchCardRef = useRef(null)
  const [isAiSearch, setIsAiSearch] = useState(false)
  const [showFinBanner, setShowFinBanner] = useState(false)
  const [finProfile, setFinProfile] = useState(null)
  const [stickySearch, setStickySearch] = useState(false)
  const { compareSet, toggleCompare } = useCompare(showToast)
  const { totalNew } = useSavedSearchAlerts()
  const [ctaOpen, setCtaOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem('vastara_fin_profile_banner_dismissed') === '1') return
    let cancelled = false
    ;(async () => {
      try {
        const { profile } = await getFinancialProfile()
        if (!cancelled && !profile) setShowFinBanner(true)
        if (!cancelled && profile) setFinProfile(profile)
      } catch {
        /* keep banner hidden on error */
      }
    })()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    const onScroll = () => setStickySearch(window.scrollY > 520)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = user?.user_metadata?.first_name || null

  async function fetchProperties() {
    setLoadingProperties(true)
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'verified')
        .order('created_at', { ascending: false })

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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let changed = false
    const setIf = (v) => v && v.length > 0
    const q = params.get('q')
    /* eslint-disable react-hooks/set-state-in-effect */
    if (setIf(q)) { setSearchText(q); changed = true }
    const type = params.get('type')
    if (setIf(type)) { setFilterType(type); changed = true }
    const price = params.get('price')
    if (setIf(price)) { setFilterPrice(price); changed = true }
    const beds = params.get('beds')
    if (setIf(beds)) { setFilterBeds(beds); changed = true }
    if (params.get('premium')) { setFilterPremium(true); changed = true }
    const category = params.get('category')
    if (category === 'dijual' || category === 'disewa' || category === 'baru') {
      setSearchCategory(category)
      changed = true
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    if (changed) {
      setTimeout(() => scrollToSearch(), 300)
    }
  }, [location.search])

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
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          purpose: 'smart_search',
          messages: [{ role: 'user', content: text.trim() }],
        }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(typeof errBody?.error === 'string' ? errBody.error : (errBody?.error?.message || 'Gagal terhubung ke AI'))
      }

      const data = await response.json()
      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) throw new Error('AI tidak mengembalikan data')

      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        if (cancelledRef.current) return
        showToast('Maaf, AI gagal merangkai format data dengan utuh karena antrean panjang. Silakan coba pencarian sekali lagi.', 'error')
        return
      }

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
        setIsAiSearch(true)
        setProperties(results)
        listingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (error) {
        throw new Error(error.message)
      }
    } catch {
      if (cancelledRef.current) return
      try {
        const { data: fallback, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'verified')
          .ilike('title', `%${text.trim()}%`)
          .order('created_at', { ascending: false })
        if (!error && fallback) {
          setIsAiSearch(true)
          setProperties(fallback)
        }
      } catch { /* silent */ }
      showToast('Gagal memproses pencarian AI. Menampilkan hasil pencarian biasa.', 'error')
    }
    if (!cancelledRef.current) setIsSmartSearching(false)
  }

  function handleAiSearch() {
    runSmartSearch(searchText)
    searchInputRef.current?.blur()
  }

  function scrollToSearch() {
    const el = searchCardRef.current
    const top = el?.getBoundingClientRect().top ?? 0
    if (el && top < 80) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    setTimeout(() => searchInputRef.current?.focus(), 300)
  }

  function resetAllSearch() {
    setIsAiSearch(false)
    setSearchText('')
    setFilterType('')
    setFilterPrice('')
    setFilterBeds('')
    setFilterPremium(false)
    setProperties([])
    fetchProperties().catch(() => {})
    searchInputRef.current?.focus()
  }

  async function handleSaveSearch() {
    if (savingSearch) return
    if (!user) {
      showToast('Silakan login terlebih dahulu untuk menyimpan pencarian.', 'error')
      return
    }
    const filters = serializeFilters({
      searchCategory,
      searchText,
      filterType,
      filterPrice,
      filterBeds,
      filterPremium,
    })
    const hasCriteria = Object.keys(filters).length > 0
    const name = saveName.trim() || (hasCriteria ? searchText.trim() : 'Pencarian saya')

    if (!hasCriteria && !saveName.trim()) {
      showToast('Atur minimal satu kriteria pencarian dulu agar alert bermanfaat.', 'error')
      return
    }

    setSavingSearch(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        showToast('Sesi kamu sudah berakhir. Silakan login ulang.', 'error')
        return
      }
      const { error } = await supabase
        .from('saved_searches')
        .insert({ user_id: authUser.id, name, filters })
      if (error) throw error
      setSavedSearchOk(true)
      setSaveName('')
      window.dispatchEvent(new Event('saved-searches-updated'))
      showToast('Pencarian disimpan! Kamu akan dapat notifikasi properti baru yang cocok.', 'success')
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pencarian. Coba lagi.', 'error')
    } finally {
      setSavingSearch(false)
    }
  }

  const cycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length)
  }

  const filterCount = [filterType, filterPrice, filterBeds, filterPremium].filter(Boolean).length
  const hasActiveSearch = searchText.trim() !== '' || filterCount > 0

  const priceBands = useMemo(() => {
    if (searchCategory === 'disewa') {
      return [
        { labelKey: 'explore.filter.price_options.rent_under_1jt', value: '0-1jt', min: 0, max: 1_000_000 },
        { labelKey: 'explore.filter.price_options.rent_1_3jt', value: '1-3jt', min: 1_000_000, max: 3_000_000 },
        { labelKey: 'explore.filter.price_options.rent_above_3jt', value: '3jt+', min: 3_000_000, max: Infinity },
      ]
    }
    return [
      { labelKey: 'explore.filter.price_options.under_1b', value: '0-1M', min: 0, max: 1_000_000_000 },
      { labelKey: 'explore.filter.price_options.one_to_3b', value: '1-3M', min: 1_000_000_000, max: 3_000_000_000 },
      { labelKey: 'explore.filter.price_options.above_3b', value: '3M+', min: 3_000_000_000, max: Infinity },
    ]
  }, [searchCategory])

  const sorted = useMemo(() => {
    return [...properties].filter((p) => {
      if (searchCategory === 'dijual' && p.category !== 'Dijual') return false
      if (searchCategory === 'disewa' && p.category !== 'Disewa') return false
      if (searchCategory === 'baru' && !isNewListing(p)) return false

      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase()
        const haystack = [p.title, p.address, p.location, p.city, p.district, p.description_id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      if (filterType && p.property_type !== filterType) return false

      if (filterPremium && !p.is_premium) return false

      if (filterBeds) {
        const beds = Number(p.bedrooms) || 0
        const match = filterBeds === '5+' ? beds >= 5 : beds === parseInt(filterBeds, 10)
        if (!match) return false
      }

      if (filterPrice) {
        const norm = isRentalProperty(p) ? estimateMonthlyRent(p) : Number(p.price) || 0
        const band = priceBands.find((b) => b.value === filterPrice)
        if (band && !(norm >= band.min && norm < band.max)) return false
      }

      return true
    }).sort((a, b) => {
      if (sortIndex === 0) return 0
      const normalized = (p) =>
        isRentalProperty(p) ? estimateMonthlyRent(p) : Number(p.price) || 0
      if (sortIndex === 1) return normalized(a) - normalized(b)
      return normalized(b) - normalized(a)
    })
  }, [properties, searchCategory, searchText, filterType, filterBeds, filterPrice, filterPremium, sortIndex, priceBands])

  const isSearching = hasActiveSearch || isAiSearch
  const isSearchEmpty = isSearching && sorted.length === 0
  const showSkeleton = loadingProperties && !isSearching

  const favCities = useMemo(() => {
    const set = new Set()
    for (const id of saved) {
      const p = properties.find((x) => x.id === id)
      if (p?.city) set.add(p.city.trim().toLowerCase())
    }
    return set
  }, [saved, properties])

  const maxAffordable = useMemo(() => {
    if (!finProfile) return 0
    const aff = computeAffordability(finProfile)
    if (!aff || !aff.maxInstallment) return 0
    return maxAffordablePrice(aff.maxInstallment, 5.5, 15, 20)
  }, [finProfile])

  const maxRent = useMemo(() => {
    if (!finProfile) return 0
    return computeAffordability(finProfile)?.maxInstallment || 0
  }, [finProfile])

  const recommended = useMemo(() => {
    const source = sorted.length > 0 ? sorted : properties
    if (source.length === 0) return []
    const ranked = source.map((p) => {
      let score = 0
      const isRentProp = isRentalProperty(p)
      const price = Number(p.price) || 0
      const monthlyRent = isRentProp ? estimateMonthlyRent(p) : 0
      if (favCities.has((p.city || '').trim().toLowerCase())) score += 4
      if (isRentProp) {
        if (maxRent > 0 && monthlyRent > 0 && monthlyRent <= maxRent) score += 3
      } else if (maxAffordable > 0 && price > 0 && price <= maxAffordable) {
        score += 3
      }
      if (p.is_premium) score += 1
      return { p, score }
    })
    ranked.sort((a, b) => b.score - a.score || new Date(b.p.created_at || 0) - new Date(a.p.created_at || 0))
    return ranked.slice(0, 6).map((x) => x.p)
  }, [sorted, properties, favCities, maxAffordable, maxRent])

  const recommendationChips = useMemo(() => {
    const chips = []
    if (favCities.size > 0) chips.push('Kota favoritmu')
    if (maxAffordable > 0) chips.push('Cocok dengan budget')
    return chips.slice(0, 3)
  }, [favCities, maxAffordable])

  const displayListings = useMemo(
    () => (sorted.length > 0 ? sorted : []),
    [sorted]
  )

  const featuredIds = useMemo(() => new Set(recommended.map((p) => p.id)), [recommended])

  const [translations, setTranslations] = useState({})
  const lang = i18n.language

  useEffect(() => {
    if (lang !== 'en') return
    const allProps = [...new Map([...displayListings, ...recommended].map((p) => [p.id, p])).values()]
    const controller = new AbortController()
    batchTranslate(allProps, controller.signal)
      .then((result) => {
        if (result) setTranslations(prev => ({ ...prev, [lang]: { ...(prev[lang] || {}), ...result } }))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [lang, displayListings, recommended])

  const getTranslated = useCallback((prop, field, fallback) => {
    if (lang !== 'en') return fallback
    return translations[lang]?.[prop.id]?.[field] ?? fallback
  }, [lang, translations])

  return (
    <div className="min-h-screen bg-brand-bg pb-36">
      {/* ─── STICKY SEARCH ─── */}
      {stickySearch && !isSearching && (
        <div className="fixed top-14 inset-x-0 z-[60] bg-white/95 backdrop-blur border-b border-brand-border px-4 py-2.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToSearch}
              className="flex-1 flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-brand-muted hover:border-brand-accent transition-colors min-w-0"
            >
              <Search size={16} className="shrink-0" />
              <span className="truncate">Cari properti, kota, atau tipe...</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/price-trends')}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent bg-brand-highlight hover:bg-brand-accent hover:text-white transition-colors rounded-xl px-3 py-2.5"
            >
              <TrendingUp size={14} />
              <span className="hidden sm:inline">Analisis Harga</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/price-drop')}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-danger bg-red-50 hover:bg-brand-danger hover:text-white transition-colors rounded-xl px-3 py-2.5"
            >
              <TrendingDown size={14} />
              <span className="hidden sm:inline">Harga Turun</span>
            </button>
          </div>
        </div>
      )}

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
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-10 sm:pt-12 sm:pb-14">
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

          {/* Search Card */}
          <motion.div
            ref={searchCardRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
            className="bg-white/95 backdrop-blur rounded-3xl shadow-xl shadow-brand-primary/15 border border-white/60 p-4 sm:p-5 mt-9 scroll-mt-24"
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
                <Search size={18} />
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
                <Filter size={18} />
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
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-muted mb-3">
            Layanan cepat
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-2">
            {QUICK_MENU.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.tKey}
                  type="button"
                  onClick={() => {
                    if (item.drawer) return setIsMoreDrawerOpen(true)
                    if (item.action === 'search') return scrollToSearch()
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

      {/* ─── MARKET PULSE / COLLECTIONS / TRUST ─── */}
      {!isSearching && <ExploreInsights properties={properties} excludeIds={featuredIds} />}

      {/* ─── AGEN / FORUM / INVESTASI ─── */}
      {!isSearching && <ExplorePhase2 properties={properties} excludeIds={featuredIds} />}

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
      ) : recommended.length > 0 && (
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 mt-8 mb-8"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
            <Sparkles size={17} className="text-brand-accent" />
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
        {recommendationChips.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {recommendationChips.map((c) => (
              <span key={c} className="text-[11px] font-semibold text-brand-accent bg-brand-highlight border border-brand-accent/15 rounded-full px-3 py-1">
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {recommended.map((p) => (
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
                  {p.seller_type === 'agent' && (
                    <span className="absolute top-2 right-2 bg-brand-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {t('explore.property_card.seller_agent')}
                    </span>
                  )}
                  {p.seller_type === 'developer' && (
                    <span className="absolute top-2 right-2 bg-[#284D7A] text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {t('explore.property_card.seller_developer')}
                    </span>
                  )}
                  {isRentalProperty(p) && maxRent > 0 && estimateMonthlyRent(p) > 0 && (
                    <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm ${
                      estimateMonthlyRent(p) <= maxRent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {estimateMonthlyRent(p) <= maxRent ? <Check size={10} /> : <X size={10} />}
                      {estimateMonthlyRent(p) <= maxRent ? 'Sewa Terjangkau' : 'Sewa di Atas Budget'}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-base font-extrabold text-brand-primary">
                    {formatPriceDisplay(p)}
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
      <PopularSearches />

      {showFinBanner && user && (
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <div className="relative flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-4 sm:px-6 py-4 shadow-lg shadow-emerald-600/15 overflow-hidden">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm sm:text-base leading-tight">
                Simulasi &amp; rekomendasi AI jadi lebih akurat, {firstName || 'kamu'}
              </p>
              <p className="text-emerald-50/85 text-xs sm:text-sm mt-0.5 truncate">
                Isi profil keuangan — cek kemampuan beli properti sesuai budget kamu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-financial-profile'))}
              className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-emerald-50 transition-colors"
            >
              Isi profil keuangan
              <ArrowLeftRight size={14} className="rotate-90" />
            </button>
            <button
              type="button"
              aria-label="Tutup pengingat"
              onClick={() => {
                localStorage.setItem('vastara_fin_profile_banner_dismissed', '1')
                setShowFinBanner(false)
              }}
              className="shrink-0 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ─── SAVED SEARCH REMINDER ─── */}
      {user && totalNew > 0 && !isSearching && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <Link
            to="/saved-searches"
            className="flex items-center gap-3 bg-white rounded-2xl border border-brand-accent/30 px-4 py-3 hover:border-brand-accent hover:shadow-md transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-brand-highlight flex items-center justify-center shrink-0">
              <Bell size={16} className="text-brand-accent" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-brand-text">
                Ada {formatCount(totalNew)} properti baru yang cocok dengan alert kamu
              </span>
              <span className="block text-xs text-brand-muted">Cek alert pencarianmu sekarang</span>
            </span>
            <span className="text-sm font-semibold text-brand-accent shrink-0">Lihat</span>
          </Link>
        </div>
      )}

      {/* ─── REALTIME FOOTER ─── */}
      {!isSearching && properties.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-[11px] text-brand-muted bg-brand-surface border border-brand-border rounded-full px-4 py-2">
            <span className="flex items-center gap-1.5">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
              </span>
              {properties.length} properti tersedia
            </span>
            <span className="hidden sm:inline text-brand-border">•</span>
            <span>Agen siap bantu</span>
            <span className="hidden sm:inline text-brand-border">•</span>
            <span>Harga selalu diperbarui</span>
          </div>
        </div>
      )}

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
              <ChevronDown size={14} />
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
        ) : displayListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-brand-muted/40" />
            </div>
            <p className="text-base font-semibold text-brand-text mb-1">
              Belum ada properti di HuniOne
            </p>
            <p className="text-sm text-brand-muted mb-6 max-w-xs">
              Jadilah yang pertama menawarkan properti Anda di platform ini.
            </p>
            <button
              type="button"
              onClick={() => navigate('/sell-role')}
              className="px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200"
            >
              Jual Properti
            </button>
            <p className="text-xs text-brand-muted mt-3">
              Punya pertanyaan?{" "}
              <Link to="/forum" className="text-brand-accent font-semibold hover:underline">
                Diskusikan di forum
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayListings.map((p) => (
              <PropertyGridCard key={p.id} p={p} getTranslated={getTranslated} maxRent={maxRent} />
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── COMPARE PROMPT ─── */}
      {!isSearching && displayListings.length > 0 && compareSet.size === 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white rounded-2xl border border-brand-border p-4">
            <div className="flex-1 w-full min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-highlight flex items-center justify-center shrink-0">
                <ArrowLeftRight size={18} className="text-brand-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-text">Cocokkan properti</p>
                <p className="text-xs text-brand-muted">
                  Pilih hingga 3 properti untuk dibandingkan berdampingan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                displayListings.slice(0, Math.min(3, displayListings.length)).forEach((p) => toggleCompare(p))
              }}
              className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-primary active:scale-[0.98] transition-all"
            >
              <ArrowLeftRight size={14} />
              Pilih 3 teratas
            </button>
          </div>
        </section>
      )}

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
                    setFilterPremium(false)
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
                  <X size={20} />
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
                  {priceBands.map((r) => (
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

              <div>
                <label className="text-sm font-semibold text-brand-text mb-2 block">{t('explore.filter.premium')}</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterPremium(!filterPremium)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      filterPremium
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-muted border border-brand-border'
                    }`}
                  >
                    {t('explore.filter.premium_badge')}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="w-full bg-brand-primary text-white rounded-xl py-3 font-bold text-sm mt-2 hover:bg-[#284D7A] active:scale-[0.98] transition-transform"
              >
                {t('explore.filter.apply')}
              </button>

              <div className="pt-5 mt-2 border-t border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={15} className="text-brand-accent shrink-0" />
                  <p className="text-sm font-semibold text-brand-text">
                    {t('explore.save_search.title')}
                  </p>
                </div>
                <p className="text-xs text-brand-muted mb-3">
                  {t('explore.save_search.desc')}
                </p>
                {savedSearchOk ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <Check size={15} />
                      {t('explore.save_search.saved')}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSavedSearchOk(false); setShowFilter(false) }}
                      className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                    >
                      {t('explore.save_search.close')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder={t('explore.save_search.name_placeholder')}
                      maxLength={60}
                      className="flex-1 min-w-0 rounded-xl bg-brand-bg border border-brand-border px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent placeholder:text-brand-muted"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSearch}
                      disabled={savingSearch}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand-accent text-white px-3.5 py-2.5 text-sm font-bold hover:bg-brand-primary active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      {savingSearch ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Bell size={14} />
                      )}
                      {t('explore.save_search.save')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── FLOATING CTA ─── */}
      {!isSearching && compareSet.size === 0 && (
        <div className="fixed bottom-28 right-6 z-40 flex flex-col items-end gap-3">
          {ctaOpen && (
            <div className="flex flex-col items-stretch gap-2 animate-fadeIn">
              {[
                { icon: Home, label: 'Jual Properti', path: '/sell-role' },
                { icon: MessageSquare, label: 'Tanya Forum', path: '/forum' },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => { setCtaOpen(false); navigate(m.path) }}
                  className="flex items-center gap-2 bg-white border border-brand-border rounded-xl px-3.5 py-2.5 shadow-lg text-sm font-semibold text-brand-text hover:border-brand-accent hover:text-brand-accent transition-all"
                >
                  <m.icon size={16} className="text-brand-accent" />
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCtaOpen(!ctaOpen)}
            aria-label="Aksi cepat"
            className="w-14 h-14 rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/25 hover:bg-[#284D7A] transition-all active:scale-95 flex items-center justify-center"
          >
            <Plus size={22} className={`transition-transform duration-300 ${ctaOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>
      )}

      <CompareBar />
    </div>
  )
}
