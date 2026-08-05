import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, TrendingUp, MessageCircle, Star, Building2, MapPin, Eye } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getInitials, getAvatarColor } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { formatCount, formatPrice } from '../utils/format'
import { CarouselPropertyCard } from './ExploreInsights'

function SectionHeader({ icon: Icon, title, sub, to, action, accent }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`p-1.5 rounded-lg shrink-0 ${accent ? 'bg-brand-highlight text-brand-accent' : 'bg-brand-bg text-brand-primary'}`}>
          <Icon size={16} />
        </span>
        <h2 className="text-lg font-bold text-brand-text truncate">{title}</h2>
        {sub && <span className="hidden sm:inline text-xs text-brand-muted mt-0.5 truncate">· {sub}</span>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors shrink-0">
          {action}
        </Link>
      )}
    </div>
  )
}

function TopAgents() {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: list }, { data: stats }] = await Promise.all([
        supabase.from('agent_profiles').select('*').eq('is_visible', true).limit(50),
        supabase.from('agent_stats').select('*').limit(200),
      ])
      if (cancelled || !list) return
      const statsMap = {}
      for (const s of stats || []) statsMap[s.agent_id] = s
      const merged = list
        .map((a) => ({ ...a, stats: statsMap[a.user_id] }))
        .map((a) => ({
          ...a,
          score: (a.stats?.verified_listings || 0) + (a.stats?.avg_rating || 0),
          verified: a.stats?.verified_listings || 0,
          rating: a.stats?.avg_rating || 0,
          reviews: a.stats?.review_count || 0,
        }))
        .sort((x, y) => y.score - x.score || y.verified - x.verified)
        .slice(0, 6)
      setAgents(merged)
    })()
    return () => { cancelled = true }
  }, [])

  if (agents.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader icon={Building2} title="Agen Terpercaya" sub="paling aktif & terverifikasi" to="/agents" action="Semua agen" />
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {agents.map((a) => (
          <Link
            key={a.user_id}
            to={`/agents/${a.user_id}`}
            className="min-w-[250px] w-[250px] shrink-0 bg-white rounded-2xl border border-brand-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: getAvatarColor(a.user_id) }}
              >
                {getInitials(a.full_name || 'Agent')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-text truncate">{a.full_name || 'Agent'}</p>
                <p className="text-xs text-brand-muted truncate">
                  {a.agency && <span className="inline-flex items-center gap-1"><Building2 size={11} />{a.agency}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {a.rating ? a.rating.toFixed(1) : 'Baru'}
              </span>
              <span className="text-[11px] text-brand-muted">
                {a.verified > 0 ? `${formatCount(a.verified)} terjual` : `${a.reviews || 0} ulasan`}
              </span>
            </div>
            {a.region && (
              <p className="text-[11px] text-brand-muted flex items-center gap-1 mt-1.5">
                <MapPin size={11} />
                {a.region}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

function ForumHighlights() {
  const { i18n } = useTranslation()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('forum_posts')
        .select('id, title, content, category, created_at, views, is_pinned, profiles(first_name), forum_replies(id)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4)
      if (!cancelled && data) setPosts(data)
    })()
    return () => { cancelled = true }
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader icon={MessageCircle} title="Diskusi Trending" sub="bincang & tanya jawab" to="/forum" action="Lihat forum" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {posts.map((post) => {
          const author = post.profiles?.first_name || 'Anonymous'
          const comments = post.forum_replies?.length || 0
          const hot = post.is_pinned || comments >= 5
          return (
            <Link
              key={post.id}
              to={`/forum/${post.id}`}
              className="bg-white rounded-2xl border border-brand-border p-4 flex flex-col hover:shadow-md hover:border-brand-accent/30 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                {post.category && (
                  <span className="text-[10px] font-bold text-brand-accent bg-brand-highlight rounded-full px-2 py-0.5">
                    {post.category}
                  </span>
                )}
                {hot && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-danger bg-red-50 rounded-full px-2 py-0.5">
                    <Flame size={10} />
                    {post.is_pinned ? 'Pinned' : 'Hot'}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-brand-text leading-snug line-clamp-2">{post.title}</h3>
              <p className="text-xs text-brand-muted line-clamp-2 mt-1.5 flex-1">{post.content}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-muted truncate">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0" style={{ backgroundColor: getAvatarColor(post.author_id) }}>
                    {getInitials(author)}
                  </span>
                  <span className="truncate">{author} · {timeAgo(post.created_at, i18n.language)}</span>
                </span>
                <span className="flex items-center gap-2 text-[11px] text-brand-muted shrink-0">
                  <span className="inline-flex items-center gap-0.5"><MessageCircle size={11} />{comments}</span>
                  <span className="inline-flex items-center gap-0.5"><Eye size={11} />{formatCount(post.views || 0)}</span>
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function InvestmentPicks({ properties }) {
  const { t } = useTranslation()
  const picks = useMemo(() =>
    [...properties]
      .map((p) => {
        const area = Number(p.area_sqm || p.sqm) || 0
        const price = Number(p.price) || 0
        return { ...p, perSqm: area > 0 && price > 0 ? price / area : 0 }
      })
      .filter((p) => p.perSqm > 0)
      .sort((a, b) => a.perSqm - b.perSqm)
      .slice(0, 8),
  [properties])

  if (picks.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader
        icon={TrendingUp}
        title="Pilihan Investasi"
        sub="nilai terbaik per m²"
        accent
        to="/explore"
        action="Lihat semua"
      />
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {picks.map((p) => (
          <div key={p.id} className="min-w-[260px] w-[260px] shrink-0">
            <CarouselPropertyCard p={p} t={t} />
            <p className="text-[11px] text-brand-muted mt-1.5 px-0.5">
              <b className="text-brand-primary">{formatPrice(p.perSqm)}</b> / m²
              {p.property_type === 'Apartemen' && <span className="text-brand-accent"> · potensi sewa</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ExplorePhase2({ properties }) {
  return (
    <>
      <TopAgents />
      <ForumHighlights />
      <InvestmentPicks properties={properties} />
    </>
  )
}