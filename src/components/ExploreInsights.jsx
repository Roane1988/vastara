import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Home,
  ShieldCheck,
  Building2,
  Users,
  MapPin,
  BadgeCheck,
  Star,
  Heart,
  Share2,
  ArrowLeftRight,
  MessageCircle,
} from 'lucide-react'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice, formatPriceDisplay, formatCount } from '../utils/format'
import { supabase } from '../supabaseClient'
import { getFavorites, toggleFavorite } from '../utils/favorites'
import { estimateMonthlyInstallment, isRentalProperty } from '../utils/financialProfile'
import { useAuth } from '../context/AuthContext'
import { useCompare } from '../hooks/useCompare'

export function CarouselPropertyCard({ p, t }) {
  const { showToast } = useAuth()
  const [saved, setSaved] = useState(getFavorites())
  const { compareSet, toggleCompare } = useCompare(showToast)

  const drop = p.original_price && Number(p.original_price) > Number(p.price)
  const isRent = p.category === 'Disewa' || p.typeLabel === 'Disewa'
  const installment =
    !isRent && Number(p.price) > 0 ? estimateMonthlyInstallment(p.price, 5.5, 20, 20) : 0

  async function toggleSave(id) {
    const updated = await toggleFavorite(id)
    setSaved(updated)
  }

  async function shareProperty(prop) {
    const url = `${window.location.origin}/property/${prop.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: prop.title, text: prop.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link properti disalin', 'success')
      }
    } catch {
      /* user cancelled share sheet */
    }
  }

  return (
    <div className="min-w-[260px] w-[260px] shrink-0 bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-primary/5">
      <Link to={`/property/${p.id}`} className="block group flex-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            loading="lazy"
            src={getImageSrc(p.image_url)}
            alt={p.title}
            onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {p.status === 'verified' && (
              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur text-brand-verified border border-brand-verified/20 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                <BadgeCheck size={11} />
                {t('explore.property_card.verified_legal')}
              </span>
            )}
            {p.is_premium && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                <Star size={11} className="fill-current" />
                {t('explore.filter.premium_badge')}
              </span>
            )}
          </div>
          {drop && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-brand-danger text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
              <TrendingDown size={11} />
              {t('explore.property_card.price_drop')}
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-end gap-2 flex-wrap">
            {drop && (
              <span className="text-sm font-semibold text-brand-muted line-through">
                {formatPrice(p.original_price)}
              </span>
            )}
            <p className="text-xl font-extrabold text-brand-primary">
              {formatPriceDisplay(p)}
            </p>
          </div>
          {installment > 0 && (
            <p className="text-[11px] text-brand-muted mt-0.5">
              Estimasi cicilan <b className="text-brand-accent">{formatPrice(installment)}</b>/bulan
            </p>
          )}
          <p className="text-base font-semibold text-brand-text mt-1 truncate">{p.title}</p>
          <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
            <MapPin size={14} />
            {p.address || p.location || p.city || 'Indonesia'}
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
      </Link>
      <div className="px-4 py-2.5 border-t border-brand-border flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleSave(p.id)}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            saved.includes(p.id) ? 'text-[#4A90E2] font-semibold' : 'text-brand-muted hover:text-brand-accent'
          }`}
        >
          <Heart size={15} className={saved.includes(p.id) ? 'fill-[#4A90E2] text-[#4A90E2]' : 'text-current'} />
          {saved.includes(p.id) ? t('explore.property_card.saved') : t('explore.property_card.save')}
        </button>
        <div className="flex items-center gap-2.5">
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
            onClick={() => shareProperty(p)}
            aria-label="Bagikan properti"
            title="Bagikan properti"
            className="text-brand-muted hover:text-brand-accent transition-colors"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, sub, to, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={17} className="text-brand-primary shrink-0" />
        <h2 className="text-lg font-bold text-brand-text">{title}</h2>
        {sub && <span className="hidden sm:block text-xs text-brand-muted mt-0.5">· {sub}</span>}
      </div>
      {to ? (
        <Link to={to} className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors shrink-0">
          {action}
        </Link>
      ) : action ? (
        <span className="text-sm font-semibold text-brand-muted shrink-0">{action}</span>
      ) : null}
    </div>
  )
}

const MIN_CITY_LISTINGS = 2

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function MarketPulse({ properties }) {
  const pulse = useMemo(() => {
    const byCity = {}
    for (const p of properties) {
      if (isRentalProperty(p)) continue
      const city = (p.city || '').trim()
      const price = Number(p.price)
      if (!city || !(price > 0)) continue
      if (!byCity[city]) byCity[city] = { prices: [], perSqm: [] }
      byCity[city].prices.push(price)
      const area = Number(p.area_sqm || p.sqm) || 0
      if (area > 0) byCity[city].perSqm.push(price / area)
    }
    const cities = Object.entries(byCity)
      .filter(([, v]) => v.prices.length >= MIN_CITY_LISTINGS)
      .map(([name, v]) => ({
        name,
        median: median(v.prices),
        perSqm: v.perSqm.length > 0 ? median(v.perSqm) : 0,
        count: v.prices.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    if (cities.length === 0) return []
    const overall = cities.reduce((s, c) => s + c.median, 0) / cities.length
    const maxMedian = Math.max(...cities.map((c) => c.median))
    return cities.map((c) => ({
      ...c,
      delta: overall ? Math.round(((c.median - overall) / overall) * 1000) / 10 : 0,
      barPct: Math.max(8, Math.round((c.median / maxMedian) * 100)),
    }))
  }, [properties])

  if (pulse.length < 2) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader icon={TrendingUp} title="Market Pulse" sub="median harga & per m² per kota · perbandingan, bukan tren" action="Analisis penuh" to="/price-trends" />
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {pulse.map((c) => {
          const up = c.delta >= 0.1
          const down = c.delta <= -0.1
          const initial = (c.name.trim()[0] || '?').toUpperCase()
          return (
            <Link
              key={c.name}
              to={`/explore?q=${encodeURIComponent(c.name)}`}
              className="relative min-w-[220px] w-[220px] shrink-0 rounded-2xl border border-brand-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="h-1.5 bg-gradient-to-r from-brand-accent to-brand-primary" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-extrabold text-sm shrink-0">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate">{c.name}</p>
                      <p className="text-[11px] text-brand-muted truncate">{c.count} listing aktif</p>
                    </div>
                  </div>
                  <span
                    title={up ? 'Di atas rata-rata kota lain' : down ? 'Di bawah rata-rata kota lain' : 'Sekitar rata-rata kota lain'}
                    className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      up ? 'bg-brand-primary/10 text-brand-primary'
                        : down ? 'bg-gray-100 text-gray-500'
                        : 'bg-brand-bg text-brand-muted'
                    }`}
                  >
                    {up ? `+${c.delta}%` : down ? `${c.delta}%` : 'rata-rata'}
                  </span>
                </div>

                <p className="text-2xl font-extrabold text-brand-text mt-3">{formatPrice(c.median)}</p>
                {c.perSqm > 0 && (
                  <p className="text-xs text-brand-muted mt-0.5">{formatPrice(Math.round(c.perSqm))}/m²</p>
                )}

                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-brand-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-primary"
                      style={{ width: `${c.barPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-brand-muted mt-1">posisi harga vs rata-rata kota lain</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function CollectionRow({ title, sub, icon: Icon, to, items, t }) {
  if (!items || items.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader icon={Icon} title={title} sub={sub} action="Lihat semua" to={to} />
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {items.map((p) => (
          <CarouselPropertyCard key={p.id} p={p} t={t} />
        ))}
      </div>
    </section>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border px-4 py-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-extrabold text-brand-primary">{formatCount(value)}</span>
        <Icon size={18} className="text-brand-muted/60 shrink-0" />
      </div>
      <span className="text-xs text-brand-muted">{label}</span>
    </div>
  )
}

function TrustSection({ available, cities, stats }) {
  const cards = [
    { icon: Building2, label: 'Properti', value: available.length },
    { icon: MapPin, label: 'Kota', value: cities },
    { icon: BadgeCheck, label: 'Agen Terverifikasi', value: stats?.agents || 0 },
    { icon: Users, label: 'Pengguna', value: stats?.users || 0 },
    { icon: MessageCircle, label: 'Diskusi Forum', value: stats?.forum || 0 },
  ]
  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader
        icon={Building2}
        title="Kepercayaan HuniOne"
        sub="komunitas yang tumbuh"
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats ? (
          <>
            {cards.map((s) => <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />)}
            <div className="bg-brand-primary rounded-2xl px-4 py-4 flex flex-col gap-1.5 text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-extrabold">100%</span>
                <ShieldCheck size={18} className="text-white/70 shrink-0" />
              </div>
              <span className="text-xs text-white/80">Listing terverifikasi</span>
            </div>
          </>
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-brand-border px-4 py-4 animate-pulse">
              <div className="h-7 w-14 bg-brand-bg rounded-md" />
              <div className="h-3 w-20 bg-brand-bg rounded-md mt-2" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default function ExploreInsights({ properties, excludeIds }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        const [agents, users, forum] = await Promise.all([
          supabase.from('agent_profiles').select('id', { count: 'exact', head: true }).eq('is_visible', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('forum_posts').select('id', { count: 'exact', head: true }),
        ])
        if (!cancelled) setStats({ agents: agents.count ?? 0, users: users.count ?? 0, forum: forum.count ?? 0 })
      } catch {
        if (!cancelled) setStats({ agents: 0, users: 0, forum: 0 })
      }
    }
    fetchStats()
    const onRefresh = () => fetchStats()
    window.addEventListener('focus', onRefresh)
    window.addEventListener('kepercayaan-updated', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener('kepercayaan-updated', onRefresh)
    }
  }, [])

  const available = useMemo(
    () => properties.filter((p) => !excludeIds?.has(p.id)),
    [properties, excludeIds]
  )

  const drops = useMemo(() =>
    available
      .filter((p) => p.original_price && Number(p.original_price) > Number(p.price))
      .sort((a, b) => Number(b.original_price) / Number(b.price) - Number(a.original_price) / Number(a.price))
      .slice(0, 8),
  [available])

  const dropIds = useMemo(() => new Set(drops.map((p) => p.id)), [drops])

  const starter = useMemo(() =>
    available
      .filter((p) => p.property_type === 'Rumah' && (Number(p.price) || 0) <= 1_500_000_000 && !dropIds.has(p.id))
      .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
      .slice(0, 8),
  [available, dropIds])

  const starterIds = useMemo(() => new Set(starter.map((p) => p.id)), [starter])

  const premium = useMemo(() =>
    available
      .filter((p) => p.is_premium && !dropIds.has(p.id) && !starterIds.has(p.id))
      .slice(0, 8),
  [available, dropIds, starterIds])

  const cities = useMemo(() => new Set(available.map((p) => p.city).filter(Boolean)).size, [available])

  return (
    <>
      <MarketPulse properties={properties} />

      <CollectionRow
        title="Baru Turun Harga"
        sub="jangan sampai kehabisan"
        icon={Flame}
        to="/price-drop"
        items={drops}
        t={t}
      />

      <CollectionRow
        title="Rumah Pertama"
        sub="mulai dari harga terendah"
        icon={Home}
        to="/explore?type=Rumah"
        items={starter}
        t={t}
      />

      <CollectionRow
        title="Rumah Premium"
        sub="kualitas terbaik"
        icon={ShieldCheck}
        to="/explore?premium=1"
        items={premium}
        t={t}
      />

      {(available.length > 0 || cities > 0) && (
        <TrustSection available={available} cities={cities} stats={stats} />
      )}
    </>
  )
}
