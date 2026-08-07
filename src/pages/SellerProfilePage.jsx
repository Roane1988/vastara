import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getAvatarColor, getInitials } from '../utils/avatar'
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
  const [category, setCategory] = useState('dijual')

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

        const [agentRes, statsRes, listingRes] = await Promise.all([
          isAgent
            ? supabase.from('agent_profiles').select('*').eq('user_id', id).eq('is_visible', true).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          isAgent
            ? supabase.from('agent_stats').select('*').eq('agent_id', id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('properties')
            .select('id, title, price, original_price, price_period, property_type, category, address, city, district, bedrooms, bathrooms, area_sqm, image_url, is_premium, seller_whatsapp, created_at')
            .eq('seller_id', id)
            .eq('status', 'verified')
            .order('created_at', { ascending: false }),
        ])

        if (isAgent && agentRes?.error) throw new Error(agentRes.error.message)
        if (isAgent && statsRes?.error) throw new Error(statsRes.error.message)
        if (listingRes.error) throw new Error(listingRes.error.message)

        if (!cancelled) {
          setProfile(base)
          setAgentProfile(agentRes?.data || null)
          setStats(statsRes?.data || null)
          setListings(listingRes.data || [])
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Gagal memuat profil.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const isAgent = profile?.role === 'agent'
  const displayName = isAgent ? (agentProfile?.full_name || profile?.first_name) : profile?.first_name

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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="relative z-10 -mt-12 sm:-mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-lg shadow-brand-primary/10">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Home size={20} className="text-blue-600" />
              </span>
              <span className="text-xs text-brand-muted">Listing Aktif</span>
            </div>
            <p className="text-xl font-bold text-brand-text">{listings.length}</p>
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

        {/* Portfolio */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-brand-text">
              {lang === 'en' ? 'Portfolio' : 'Portofolio'}
            </h2>
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
              {shown.map((p) => (
                <PropertyGridCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}