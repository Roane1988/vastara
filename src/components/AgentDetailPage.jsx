import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Building2, Star, MessageCircle, Phone, Briefcase, Crown, CalendarCheck, Pencil } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { formatPriceDisplay } from '../utils/format'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import useSEO from '../hooks/useSEO'
import NotFoundPage from './NotFoundPage'
import { useAuth } from '../context/AuthContext'

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-4">
      <div className="flex items-center gap-1.5 text-brand-muted mb-1.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-brand-text">{value}</p>
    </div>
  )
}

export default function AgentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language
  const cancelledRef = useRef(false)

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useSEO(profile
    ? { title: `${profile.full_name} — Agen Properti | HuniOne`, description: profile.bio || profile.full_name }
    : { title: 'Profil Agen — HuniOne' })

  useEffect(() => {
    cancelledRef.current = false
    async function fetchData() {
      try {
        const [agentRes, profileRes, statsRes, listingRes, reviewRes] = await Promise.all([
          supabase.from('agent_profiles').select('*').eq('user_id', id).maybeSingle(),
          supabase.from('profiles').select('first_name, role').eq('id', id).maybeSingle(),
          supabase.from('agent_stats').select('*').eq('agent_id', id).maybeSingle(),
          supabase.from('properties').select('*').eq('seller_id', id).eq('status', 'verified').order('created_at', { ascending: false }),
          supabase.from('agent_reviews').select('*, profiles!reviewer_id(first_name)').eq('agent_id', id).order('created_at', { ascending: false }),
        ])
        if (cancelledRef.current) return

        if (agentRes.error || profileRes.error) {
          setError('Agent tidak ditemukan.')
          return
        }

        const agent = agentRes.data || {}
        const base = profileRes.data || {}

        if (base.role && base.role !== 'agent') {
          setError('Agent tidak ditemukan.')
          return
        }
        if (!agentRes.data && !profileRes.data) {
          setError('Agent tidak ditemukan.')
          return
        }

        setProfile({
          ...agent,
          full_name: agent.full_name || base.first_name || 'Agent',
          whatsapp: agent.whatsapp || '',
          role: base.role || 'agent',
        })
        setStats(statsRes.data || null)
        setListings(listingRes.data || [])
        setReviews(reviewRes.data || [])
      } catch (err) {
        if (!cancelledRef.current) {
          console.warn('Gagal memuat profil agent:', err.message)
          setError('Terjadi kesalahan saat memuat profil agent.')
        }
      }
      if (!cancelledRef.current) setLoading(false)
    }
    fetchData()
    return () => { cancelledRef.current = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <NotFoundPage message={error} onBack={() => navigate(-1)} />
  }

  const waNumber = profile.whatsapp?.replace(/\D/g, '')
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        lang === 'en' ? `Hello ${profile.full_name}, I'd like to consult about properties on HuniOne.` : `Halo ${profile.full_name}, saya ingin berkonsultasi tentang properti di HuniOne.`
      )}`
    : null
  const isTop = (stats?.listing_score || 0) > 0

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="bg-gradient-to-br from-brand-primary via-brand-primary to-[#284D7A] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            {t('agents.back_to_directory')}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative w-fit">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: getAvatarColor(profile.user_id || id) }}
              >
                {getInitials(profile.full_name)}
              </div>
              {isTop && (
                <span className="absolute -top-1 -right-1 bg-brand-accent text-white rounded-full p-1.5 shadow-md" title={t('agents.top_badge')}>
                  <Crown size={14} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-white/80 text-sm">
                {profile.agency && (
                  <span className="flex items-center gap-1.5"><Building2 size={14} />{profile.agency}</span>
                )}
                {profile.region && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.region}</span>
                )}
                {profile.experience && (
                  <span className="flex items-center gap-1.5"><Briefcase size={14} />{profile.experience}</span>
                )}
              </div>
            </div>
            <div className="sm:ml-auto flex gap-2.5 flex-wrap">
              {user && id === user.id && (
                <Link
                  to="/agent-profile"
                  className="inline-flex items-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-white/25 active:scale-[0.98] transition-all"
                >
                  <Pencil size={16} />
                  {t('agents.edit_profile')}
                </Link>
              )}
              <button
                type="button"
                onClick={() => navigate(`/chat?user=${id}`)}
                className="inline-flex items-center gap-2 bg-white text-brand-primary px-5 py-3 rounded-xl text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all"
              >
                <MessageCircle size={16} />
                {t('agents.chat')}
              </button>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all"
                >
                  <Phone size={16} />
                  {t('agents.wa')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {profile.bio && (
          <div className="bg-white rounded-2xl border border-brand-border p-5 mb-6">
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Briefcase size={14} />}
            label={t('agents.stat_listings')}
            value={stats?.verified_listings || 0}
          />
          <StatCard
            icon={<Crown size={14} />}
            label={t('agents.stat_premium')}
            value={stats?.premium_listings || 0}
          />
          <StatCard
            icon={<CalendarCheck size={14} />}
            label={t('agents.stat_visits')}
            value={stats?.completed_visits || 0}
          />
          <StatCard
            icon={<Star size={14} />}
            label={t('agents.stat_rating')}
            value={stats?.review_count > 0 ? `${Number(stats.avg_rating).toFixed(1)} (${stats.review_count})` : '—'}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-brand-text mb-4">{t('agents.listings_title')}</h2>
          {listings.length === 0 ? (
            <p className="text-brand-muted text-sm py-8 text-center">{t('agents.no_listings')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((p) => (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  className="group bg-white rounded-2xl border border-brand-border overflow-hidden hover:shadow-xl hover:shadow-brand-primary/5 hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-brand-bg">
                    <img
                      src={getImageSrc(p.image_url)}
                      alt={p.title}
                      onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] text-brand-muted mb-1">{p.property_type} · {p.city || 'Indonesia'}</p>
                    <p className="text-sm font-bold text-brand-text truncate mb-1">{p.title}</p>
                    <p className="text-sm font-bold text-brand-accent">{formatPriceDisplay(p)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {reviews.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-brand-text mb-4">{t('agents.reviews_title')}</h2>
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
      </div>
    </div>
  )
}
