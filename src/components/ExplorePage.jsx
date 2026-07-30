import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Megaphone, Users, Calculator, TrendingDown, LayoutGrid, MessageCircle, ArrowLeftRight, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import { getFavorites, toggleFavorite as toggleFav } from '../utils/favorites'
import { getImageSrc } from '../utils/images'
import { formatPrice } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import { batchTranslate } from '../hooks/useGroqTranslation'
import MoreCategoriesDrawer from './MoreCategoriesDrawer'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'


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

export default function ExplorePage() {
  useSEO({ title: 'Cari Properti — Jual, Beli & Sewa', description: 'Temukan properti terbaik untuk dijual, disewa di HuniOne. Rumah, apartemen, villa, tanah, ruko dan lainnya.' })
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(getFavorites())
  const [showFilter, setShowFilter] = useState(false)
  const [filterPrice, setFilterPrice] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBeds, setFilterBeds] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const [searchCategory, setSearchCategory] = useState('dijual')
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false)

  const [showBackToTop, setShowBackToTop] = useState(false)
  const [properties, setProperties] = useState([])
  const { user } = useAuth()
  const cancelledRef = useRef(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = user?.user_metadata?.first_name || null

  async function fetchProperties(filters = {}) {
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

  const toggleSave = async (id) => {
    const updated = await toggleFav(id)
    setSaved(updated)
  }

  const cycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length)
  }

  const sorted = [...properties].filter((p) => {
    if (searchCategory === 'dijual') return p.category === 'Dijual'
    if (searchCategory === 'disewa') return p.category === 'Disewa'
    if (searchCategory === 'baru') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      return new Date(p.created_at).getTime() > weekAgo
    }
    return true
  }).sort((a, b) => {
    if (sortIndex === 1) return (Number(a.price) || 0) - (Number(b.price) || 0)
    if (sortIndex === 2) return (Number(b.price) || 0) - (Number(a.price) || 0)
    return 0
  })

  const displayRecommendations = sorted.length > 0 ? sorted.slice(0, 4) : DUMMY_PROPERTIES.slice(0, 4)
  const displayListings = sorted.length > 0 ? sorted : DUMMY_PROPERTIES

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
      <div className="relative bg-gradient-to-r from-[#1E3A5F] to-[#284D7A] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]">
          <img loading="lazy"
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-10 sm:pt-10 sm:pb-14">
          {user ? (
            <h1 className="text-2xl font-bold text-white">
              {t('explore.hero.welcome_with_name')}{firstName ? `, ${firstName}` : ''}
            </h1>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">
                {t('explore.hero.welcome')}
              </h1>
              <p className="text-white/75 text-sm mt-1">
                {t('explore.hero.tagline')}
              </p>
            </>
          )}

          {/* Search Card */}
          <div className="bg-brand-surface rounded-2xl shadow-sm p-4 mt-6">
            <div className="flex gap-6 mb-4 border-b border-brand-border">
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
            <div className="flex items-center px-3 py-2 bg-white border border-brand-border rounded-xl gap-3 focus-within:border-[#4A90E2] focus-within:shadow-[0_0_0_3px_rgba(74,144,226,0.15)] transition-all">
              <span className="text-brand-muted shrink-0">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder={
                  searchCategory === 'dijual'
                    ? t('explore.search.placeholder_sale')
                    : searchCategory === 'disewa'
                    ? t('explore.search.placeholder_rent')
                    : t('explore.search.placeholder_new')
                }
                aria-label={t('explore.search.aria_label')}
                className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="text-brand-muted hover:text-[#4A90E2] transition-colors shrink-0"
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
                  key={item.tKey}
                  type="button"
                  onClick={() => {
                    if (item.drawer) return setIsMoreDrawerOpen(true)
                    if (item.path) navigate(item.path)
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#1E3A5F] shadow-sm group-hover:bg-[#4A90E2] group-hover:text-white transition-colors duration-200">
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] text-brand-text font-semibold text-center leading-tight">
                    {t(item.tKey)}
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
            {t('explore.recommendations.title')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="text-sm font-semibold text-[#4A90E2] hover:text-brand-primary transition-colors"
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
              <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img loading="lazy"
                    src={getImageSrc(p.image_url)}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                  />
                  {p.status === 'verified' && (
                    <span className="absolute top-2 left-2 bg-[#EAF7EF] text-[#2E8B57] border border-[#2E8B57]/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
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
      </section>

      {/* ─── PENCARIAN PROPERTI POPULER ─── */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            {t('explore.popular_searches.title')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/coming-soon')}
            className="text-sm font-semibold text-[#4A90E2] hover:text-brand-primary transition-colors"
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
                <h3 className="text-sm sm:text-base font-bold text-brand-text group-hover:text-[#4A90E2] transition-colors">
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
      <section className="max-w-7xl mx-auto px-4 pb-24 bg-[#F8FAFC]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            {t('explore.all_properties.title')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className="text-sm font-semibold text-[#4A90E2] hover:text-brand-primary transition-colors"
            >
              {t('explore.all_properties.filter')}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayListings.map((p) => (
            <div key={p.id}>
              <Link to={`/property/${p.id}`} className="block group">
                <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden h-full">
                  <div className="relative aspect-[4/3]">
                    <img loading="lazy"
                      src={getImageSrc(p.image_url)}
                      alt={p.title}
                      onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.typeLabel && (
                        <span className="bg-[#1E3A5F] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                          {p.typeLabel}
                        </span>
                      )}
                      {p.status === 'verified' && (
                        <span className="bg-[#EAF7EF] text-[#2E8B57] border border-[#2E8B57]/20 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          {t('explore.property_card.verified_legal')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xl font-extrabold text-brand-primary">
                      {p.priceDisplay || formatPrice(p.price)}
                    </p>
                    <p className="text-base font-semibold text-brand-text mt-1 group-hover:text-[#4A90E2] transition-colors">
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
                        <span className="text-xs font-medium text-[#4A90E2]">{p.agent}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleSave(p.id)}
                  className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-[#4A90E2] transition-colors"
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
              <h2 className="text-lg font-bold text-brand-text">{t('explore.filter.title')}</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFilterPrice('')
                    setFilterType('')
                    setFilterBeds('')
                    fetchProperties()
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
                          ? 'bg-[#1E3A5F] text-white'
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
                          ? 'bg-[#1E3A5F] text-white'
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
                          ? 'bg-[#1E3A5F] text-white'
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
                onClick={() => {
                  fetchProperties({ type: filterType, beds: filterBeds, price: filterPrice })
                  setShowFilter(false)
                }}
                className="w-full bg-[#1E3A5F] text-white rounded-xl py-3 font-bold text-sm mt-2 hover:bg-[#284D7A] active:scale-[0.98] transition-transform"
              >
                {t('explore.filter.apply')}
              </button>
            </div>
          </div>
        </>
      )}

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
