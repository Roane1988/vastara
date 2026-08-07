import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Star,
  MessageCircle,
  Phone,
  CalendarCheck,
  Crown,
  ShieldCheck,
  Home,
  Share2,
  ExternalLink,
  Pencil,
  MessageSquare,
  Sparkles,
  Lock,
  Check,
  Wallet,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import {
  getFinancialProfile,
  computeAffordability,
  maxAffordablePrice,
  estimateMonthlyRent,
  isRentalProperty,
  formatRupiah,
  BUYING_POWER_ASSUMPTION,
} from '../utils/financialProfile'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import NotFoundPage from '../components/NotFoundPage'
import PropertyGridCard from '../components/PropertyGridCard'

const PROFILE_FIELDS = 'id, first_name, role'

function cleanWaNumber(raw) {
  let n = (raw || '').replace(/\D/g, '')
  if (!n) return null
  if (n.startsWith('0')) n = '62' + n.slice(1)
  return n
}

function SellerSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg animate-pulse">
      <div className="bg-brand-border/40 h-56" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          <div className="w-20 h-20 rounded-2xl bg-brand-border" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-6 w-56 bg-brand-border rounded" />
            <div className="h-4 w-72 bg-brand-border rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-brand-border p-4 h-28" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SellerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { user, showToast } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [agentProfile, setAgentProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [forumPosts, setForumPosts] = useState([])
  const [category, setCategory] = useState('dijual')
  const [showSticky, setShowSticky] = useState(false)
  const [finStatus, setFinStatus] = useState('loading')
  const [fin, setFin] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const profileRes = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', id).maybeSingle()
        if (profileRes.error) throw new Error(profileRes.error.message)
        if (!profileRes.data) {
          setError('notfound')
          return
        }
        const base = profileRes.data
        const isAgent = base.role === 'agent'

        const [agentRes, statsRes, listingRes, reviewRes, forumRes] = await Promise.all([
          isAgent
            ? supabase.from('agent_profiles').select('*').eq('user_id', id).eq('is_visible', true).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          isAgent
            ? supabase.from('agent_stats').select('*').eq('agent_id', id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('properties')
            .select('id, title, price, original_price, price_period, property_type, category, address, city, district, bedrooms, bathrooms, area_sqm, image_url, is_premium, seller_whatsapp, status, created_at')
            .in('status', ['verified', 'sold'])
            .eq('seller_id', id)
            .order('created_at', { ascending: false }),
          isAgent
            ? supabase.from('agent_reviews').select('*, profiles!reviewer_id(first_name)').eq('agent_id', id).order('created_at', { ascending: false })
            : Promise.resolve({ data: null, error: null }),
          supabase.from('forum_posts').select('id, title, category, created_at').eq('author_id', id).order('created_at', { ascending: false }).limit(3),
        ])

        if (isAgent && agentRes?.error) throw new Error(agentRes.error.message)
        if (isAgent && statsRes?.error) throw new Error(statsRes.error.message)
        if (listingRes.error) throw new Error(listingRes.error.message)
        if (isAgent && reviewRes?.error) throw new Error(reviewRes.error.message)
        if (forumRes?.error) throw new Error(forumRes.error.message)

        if (!cancelled) {
          setProfile(base)
          setAgentProfile(agentRes?.data || null)
          setStats(statsRes?.data || null)
          setListings(listingRes.data || [])
          setReviews(reviewRes?.data || [])
          setForumPosts(forumRes?.data || [])
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Gagal memuat profil.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { profile, isAuthenticated } = await getFinancialProfile()
        if (cancelled) return
        if (!isAuthenticated) { setFinStatus('anonymous'); return }
        if (!profile) { setFinStatus('no_profile'); return }
        const aff = computeAffordability(profile)
        if (!aff || aff.maxInstallment <= 0) { setFinStatus('no_profile'); return }
        setFin({
          ...aff,
          maxPrice: maxAffordablePrice(
            aff.maxInstallment,
            BUYING_POWER_ASSUMPTION.interestRate,
            BUYING_POWER_ASSUMPTION.tenorYears,
            BUYING_POWER_ASSUMPTION.dpPercentage
          ),
          goal: profile.purchase_goal,
        })
        setFinStatus('ready')
      } catch {
        if (!cancelled) setFinStatus('anonymous')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isAgent = profile?.role === 'agent'
  const displayName = isAgent ? (agentProfile?.full_name || profile?.first_name) : profile?.first_name
  const isOwnProfile = !!user && user.id === profile?.id

  const joinedAt = useMemo(() => {
    if (agentProfile?.created_at) return agentProfile.created_at
    if (listings.length > 0) return listings.reduce((a, b) => (a < b.created_at ? a : b.created_at), listings[0].created_at)
    return null
  }, [agentProfile, listings])

  const waNumber = isAgent
    ? cleanWaNumber(agentProfile?.whatsapp)
    : cleanWaNumber(listings[0]?.seller_whatsapp)
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        lang === 'en'
          ? `Hello ${displayName}, I'd like to consult about your properties on HuniOne.`
          : `Halo ${displayName}, saya ingin berkonsultasi tentang properti Anda di HuniOne.`
      )}`
    : null

  const soldListings = useMemo(() => listings.filter((p) => p.category !== 'Disewa'), [listings])
  const rentListings = useMemo(() => listings.filter((p) => p.category === 'Disewa'), [listings])
  const shown = category === 'disewa' ? rentListings : soldListings
  const soldCount = soldListings.length
  const rentCount = rentListings.length
  const activeCount = useMemo(() => listings.filter((p) => p.status === 'verified').length, [listings])

  useEffect(() => {
    function onScroll() { setShowSticky(window.scrollY > 300) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useSEO(profile
    ? { title: `${displayName} — Profil Penjual Properti | HuniOne`, description: `Lihat properti yang dijual & disewa oleh ${displayName} di HuniOne.` }
    : { title: 'Profil Penjual — HuniOne' })

  async function handleWhatsApp() {
    if (!waLink || listings.length === 0) return
    try {
      await supabase.from('whatsapp_leads').insert({
        property_id: listings[0].id,
        seller_id: id,
        buyer_id: user?.id || null,
      })
    } catch {
      /* best-effort lead */
    }
    window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/seller/${id}` : ''

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} — Profil Penjual | HuniOne`,
          text: `${displayName} — ${listings.length} properti terverifikasi di HuniOne.`,
          url: profileUrl,
        })
      } catch {
        /* user cancelled share sheet */
      }
      return
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(profileUrl)
        showToast('Link profil disalin', 'success')
      } catch {
        showToast('Gagal menyalin link. Coba lagi.', 'error')
      }
    }
  }

  const budgetHintFor = useCallback((p) => {
    if (finStatus !== 'ready' || !fin) return null
    if (isRentalProperty(p)) {
      const rent = estimateMonthlyRent(p)
      const limit = fin.budget || fin.maxInstallment
      if (rent <= 0 || limit <= 0) return null
      return rent <= limit ? 'green' : 'rose'
    }
    const price = Number(p.price) || 0
    if (price <= 0 || fin.maxPrice <= 0) return null
    if (price <= fin.maxPrice) return 'green'
    if (price <= fin.maxPrice * 1.15) return 'amber'
    return 'rose'
  }, [finStatus, fin])

  const budgetLabelFor = (tone) =>
    tone === 'green'
      ? (lang === 'en' ? 'Within your budget' : 'Dalam anggaranmu')
      : tone === 'amber'
        ? (lang === 'en' ? 'Slightly above budget' : 'Sedikit di atas budget')
        : (lang === 'en' ? 'Beyond your budget' : 'Di luar anggaranmu')

  const [sortByBudget, setSortByBudget] = useState(false)

  const budgetScoreFor = useCallback((p) => {
    const tone = budgetHintFor(p)
    if (tone === 'green') return 0
    if (tone === 'amber') return 1
    if (tone === 'rose') return 2
    return 3
  }, [budgetHintFor])

  const orderedShown = useMemo(() => {
    if (!sortByBudget || finStatus !== 'ready') return shown
    return [...shown].sort((a, b) => budgetScoreFor(a) - budgetScoreFor(b))
  }, [shown, sortByBudget, finStatus, budgetScoreFor])

  const withinBudgetCount = useMemo(
    () => listings.filter((p) => budgetHintFor(p) === 'green').length,
    [listings, budgetHintFor]
  )

  const affordableSale = useMemo(() => {
    if (finStatus !== 'ready' || !fin) return null
    return listings
      .filter((p) => !isRentalProperty(p) && p.status === 'verified' && Number(p.price) > 0)
      .filter((p) => Number(p.price) <= fin.maxPrice)
      .sort((a, b) => Number(a.price) - Number(b.price))[0] || null
  }, [finStatus, fin, listings])

  const closestSale = useMemo(() => {
    if (finStatus !== 'ready' || !fin) return null
    const verified = listings.filter((p) => !isRentalProperty(p) && p.status === 'verified' && Number(p.price) > 0)
    if (!verified.length) return null
    return verified.reduce((best, p) =>
      Math.abs(Number(p.price) - fin.maxPrice) < Math.abs(Number(best.price) - fin.maxPrice) ? p : best,
      verified[0]
    )
  }, [finStatus, fin, listings])

  if (loading) return <SellerSkeleton />

  if (error || !profile) {
    return <NotFoundPage message={error === 'notfound' ? (lang === 'en' ? 'Seller not found.' : 'Penjual tidak ditemukan.') : (error || 'Gagal memuat profil.')} onBack={() => navigate(-1)} />
  }

  const joinedMonth = joinedAt
    ? new Date(joinedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Cover */}
      <div className="bg-gradient-to-r from-brand-primary via-brand-primary to-blue-800 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-24 sm:pb-20">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={16} />
            {lang === 'en' ? 'Back to home' : 'Kembali ke beranda'}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative w-fit">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: getAvatarColor(id) }}
              >
                {getInitials(displayName)}
              </div>
              {isAgent && (
                <span className="absolute -top-1 -right-1 bg-brand-accent text-white rounded-full p-1.5 shadow-md" title="Top Agent">
                  <Crown size={14} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                {isAgent ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950">
                    <Star size={12} className="fill-current" />
                    Agen Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-brand-accent/20 text-white border border-brand-accent/30">
                    <ShieldCheck size={12} />
                    Pemilik Properti
                  </span>
                )}
                {isAgent && agentProfile?.agency && (
                  <span className="flex items-center gap-1.5 text-white/85 text-sm">
                    <Building2 size={14} />
                    {agentProfile.agency}
                  </span>
                )}
                {isAgent && stats?.review_count > 0 && (
                  <span className="flex items-center gap-1 text-amber-300 text-sm font-semibold">
                    <Star size={14} className="fill-current" />
                    {Number(stats.avg_rating).toFixed(1)}
                  </span>
                )}
              </div>
              {isAgent && agentProfile?.region && (
                <span className="flex items-center gap-1 text-white/75 text-sm mt-1.5">
                  <MapPin size={14} />
                  {agentProfile.region}
                </span>
              )}
              {joinedMonth && (
                <span className="flex items-center gap-1 text-white/75 text-sm mt-1">
                  <CalendarCheck size={14} />
                  {lang === 'en' ? 'Member since' : 'Bergabung'} {joinedMonth}
                </span>
              )}
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5 sm:ml-auto">
              {isOwnProfile && isAgent && (
                <button
                  type="button"
                  onClick={() => navigate('/agent-profile')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white/25 active:scale-[0.98] transition-all"
                >
                  <Pencil size={16} />
                  {lang === 'en' ? 'Edit Directory Profile' : 'Edit Profil Direktori'}
                </button>
              )}
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => navigate('/my-listings')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-brand-primary px-5 py-3 rounded-xl text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all"
                >
                  <Home size={16} />
                  {lang === 'en' ? 'Manage My Listings' : 'Kelola Iklan Saya'}
                </button>
              )}
              {isAgent && (
                <Link
                  to={`/agents/${id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white/25 active:scale-[0.98] transition-all"
                >
                  <ExternalLink size={16} />
                  {lang === 'en' ? 'Agent Directory' : 'Direktori Agen'}
                </Link>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white/25 active:scale-[0.98] transition-all"
              >
                <Share2 size={16} />
                {lang === 'en' ? 'Share' : 'Bagikan'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/chat?user=${id}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-brand-primary px-5 py-3 rounded-xl text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all"
              >
                <MessageCircle size={16} />
                {t('agents.chat')}
              </button>
              {waLink && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all"
                >
                  <Phone size={16} />
                  WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24 lg:pb-8">
        {/* Stats */}
        <div className="relative z-10 -mt-12 sm:-mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Home size={20} className="text-blue-600" />
              </span>
              <span className="text-xs text-brand-muted">Listing Aktif</span>
            </div>
            <p className="text-xl font-bold text-brand-text">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-10 h-10 rounded-xl bg-brand-highlight flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-brand-accent" />
              </span>
              <span className="text-xs text-brand-muted">Dijual</span>
            </div>
            <p className="text-xl font-bold text-brand-text">{soldCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-green-600" />
              </span>
              <span className="text-xs text-brand-muted">Disewa</span>
            </div>
            <p className="text-xl font-bold text-brand-text">{rentCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Crown size={20} className="text-orange-500" />
              </span>
              <span className="text-xs text-brand-muted">Premium</span>
            </div>
            <p className="text-xl font-bold text-brand-text">{listings.filter((p) => p.is_premium).length}</p>
          </div>
        </div>

        {isAgent && agentProfile?.bio && (
          <div className="bg-white rounded-2xl border border-brand-border p-5 mb-6">
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-line">{agentProfile.bio}</p>
          </div>
        )}

        {isAgent && agentProfile?.bio && (
          <div className="bg-white rounded-2xl border border-brand-border p-5 mb-6">
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-line">{agentProfile.bio}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-brand-accent" />
            <h2 className="text-sm font-bold text-brand-text">
              {lang === 'en' ? 'Personalized for you' : 'Dipersonalisasi untuk Kamu'}
            </h2>
          </div>

          {finStatus === 'loading' && (
            <div className="bg-white rounded-2xl border border-brand-border p-5 animate-pulse">
              <div className="h-4 w-56 bg-brand-border rounded" />
              <div className="h-4 w-80 bg-brand-border rounded mt-3" />
            </div>
          )}

          {finStatus === 'anonymous' && (
            <div className="bg-white rounded-2xl border border-brand-border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-brand-highlight flex items-center justify-center shrink-0">
                <Lock size={20} className="text-brand-muted" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-text">
                  {lang === 'en' ? 'Personalized recommendations require login' : 'Rekomendasi personal butuh login'}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {lang === 'en'
                    ? 'Log in and fill your financial profile to see which of these listings fit your budget.'
                    : 'Masuk dan lengkapi profil keuangan untuk melihat properti mana yang sesuai budgetmu.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
              >
                {lang === 'en' ? 'Log in' : 'Masuk'}
              </button>
            </div>
          )}

          {finStatus === 'no_profile' && (
            <div className="bg-white rounded-2xl border border-brand-border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-brand-highlight flex items-center justify-center shrink-0">
                <Wallet size={20} className="text-brand-accent" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-text">
                  {lang === 'en' ? 'Lengkapi profil keuanganmu' : 'Lengkapi profil keuanganmu'}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {lang === 'en'
                    ? 'Add your income & budget to see which listings fit, and get AI. matched picks, '
                    : 'Isi pendapatan & budget untuk melihat properti yang terjangkau, plus rekomendasi AI yang dipersonalisasi.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/financial-profile')}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
              >
                {lang === 'en' ? 'Fill Profile' : 'Isi sekarang'}
              </button>
            </div>
          )}

          {finStatus === 'ready' && fin && (
            <div className="bg-white rounded-2xl border border-brand-border p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check size={20} className="text-emerald-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-text">
                    {lang === 'en' ? 'Estimated buying power' : 'Perkiraan daya beli kamu'}:{' '}
                    <span className="text-brand-accent">{formatRupiah(fin.maxPrice)}</span>
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {lang === 'en'
                      ? 'Computed from your income, commitments & monthly budget. Matched listings are marked green below.'
                      : 'Dihitung dari pendapatan, komitmen & budget bulananmu. Listing yang pas ditandai hijau di bawah.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                    {lang === 'en' ? 'Within budget' : 'Dalam anggaran'}
                  </p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{withinBudgetCount}</p>
                </div>
                <div className="rounded-xl bg-brand-highlight border border-brand-border p-3">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">
                    {lang === 'en' ? 'Max price' : 'Harga maks'}
                  </p>
                  <p className="text-sm font-extrabold text-brand-text mt-0.5">{formatRupiah(fin.maxPrice)}</p>
                </div>
              </div>

              {(affordableSale || closestSale) && (
                <div className="mt-4 border-t border-brand-border pt-4">
                  <p className="text-xs font-bold text-brand-text uppercase tracking-wide mb-2">
                    {affordableSale
                      ? (lang === 'en' ? 'Best match for your budget' : 'Paling pas untuk budgetmu')
                      : (lang === 'en' ? 'Closest to your budget' : 'Paling dekat dengan budgetmu')}
                  </p>
                  <Link
                    to={`/property/${(affordableSale || closestSale).id}`}
                    className="block bg-brand-highlight/40 border border-brand-accent/25 rounded-xl p-3.5 hover:border-brand-accent transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-brand-text truncate">{(affordableSale || closestSale).title}</p>
                      <span className="text-sm font-extrabold text-brand-primary shrink-0">
                        {formatRupiah(Number((affordableSale || closestSale).price) || 0)}
                      </span>
                    </div>
                    <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      budgetHintFor(affordableSale || closestSale) === 'green'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {budgetLabelFor(budgetHintFor(affordableSale || closestSale))}
                    </span>
                    <p className="text-xs text-brand-muted mt-1.5">
                      {lang === 'en' ? 'View this listing' : 'Lihat properti ini'} →
                    </p>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {isAgent && reviews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-text">
                {lang === 'en' ? 'Buyer Reviews' : 'Ulasan Pembeli'}
              </h2>
              {stats?.review_count > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-500">
                  <Star size={15} className="fill-current" />
                  {Number(stats.avg_rating).toFixed(1)}
                  <span className="text-xs font-medium text-brand-muted">({stats.review_count})</span>
                </span>
              )}
            </div>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-brand-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-brand-text">{r.profiles?.first_name || 'Pembeli'}</span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-brand-border'}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-brand-text leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-brand-text">
                {lang === 'en' ? 'Portfolio' : 'Portofolio'}
              </h2>
              {finStatus === 'ready' && fin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                  <Check size={11} />
                  {lang === 'en' ? 'Budget' : 'Budget'}: {formatRupiah(fin.maxPrice)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {finStatus === 'ready' && (
                <button
                  type="button"
                  onClick={() => setSortByBudget((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    sortByBudget
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-brand-muted border-brand-border hover:text-brand-text'
                  }`}
                >
                  <Check size={13} />
                  {lang === 'en' ? 'Budget first' : 'Sesuai budget dulu'}
                </button>
              )}
              <div className="inline-flex rounded-xl bg-white border border-brand-border p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setCategory('dijual')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    category === 'dijual' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  {lang === 'en' ? 'For Sale' : 'Dijual'} ({soldCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('disewa')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    category === 'disewa' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  {lang === 'en' ? 'For Rent' : 'Disewa'} ({rentCount})
                </button>
              </div>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-border p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-highlight flex items-center justify-center mb-4">
                <Building2 size={24} className="text-brand-accent" />
              </div>
              <h3 className="text-base font-bold text-brand-text mb-1">
                {lang === 'en' ? 'No listings in this category' : 'Belum ada properti di kategori ini'}
              </h3>
              <p className="text-sm text-brand-muted">
                {category === 'disewa'
                  ? (lang === 'en' ? 'No properties are currently for rent from this seller.' : 'Belum ada properti yang disewa dari penjual ini.')
                  : (lang === 'en' ? 'No properties are currently for sale from this seller.' : 'Belum ada properti yang dijual dari penjual ini.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {orderedShown.map((p) => (
                <PropertyGridCard key={p.id} p={p} budgetHint={budgetHintFor(p)} budgetLabel={budgetLabelFor(budgetHintFor(p))} />
              ))}
            </div>
          )}
        </div>

        {forumPosts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <MessageSquare size={17} className="text-brand-accent" />
                {lang === 'en' ? 'Forum Discussions & Contributions' : 'Diskusi & Kontribusi Forum'}
              </h2>
              <Link to={`/forum?author=${id}`} className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors shrink-0">
                {lang === 'en' ? 'All posts' : 'Semua utas'} →
              </Link>
            </div>
            <div className="space-y-3">
              {forumPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/forum/${post.id}`}
                  className="block bg-white rounded-2xl border border-brand-border p-4 hover:border-brand-accent hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-brand-text truncate group-hover:text-brand-accent">{post.title}</p>
                    <span className="text-xs text-brand-muted shrink-0">{timeAgo(post.created_at, lang)}</span>
                  </div>
                  {post.category && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-brand-accent bg-brand-highlight px-2 py-0.5 rounded-full">
                      {post.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar (mobile) */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-brand-border p-3 shadow-[0_-4px_16px_rgba(30,58,95,0.10)] transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/chat?user=${id}`)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} />
            {t('agents.chat')}
          </button>
          {waLink && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all"
            >
              <Phone size={16} />
              WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}