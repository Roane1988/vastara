import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice, formatPriceDisplay } from '../utils/format'
import { getFavorites, toggleFavorite } from '../utils/favorites'
import { estimateMonthlyInstallment } from '../utils/financialProfile'
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

function MarketPulse({ properties }) {
  const pulse = useMemo(() => {
    const byCity = {}
    for (const p of properties) {
      const city = (p.city || '').trim()
      const price = Number(p.price)
      if (!city || !(price > 0)) continue
      if (!byCity[city]) byCity[city] = []
      byCity[city].push(price)
    }
    const cities = Object.entries(byCity)
      .map(([name, prices]) => ({
        name,
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        count: prices.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    const overall = cities.length ? cities.reduce((s, c) => s + c.avg, 0) / cities.length : 0
    return cities.map((c) => ({
      ...c,
      delta: overall ? Math.round(((c.avg - overall) / overall) * 1000) / 10 : 0,
    }))
  }, [properties])

  if (pulse.length < 2) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <SectionHeader icon={TrendingUp} title="Market Pulse" sub="tren harga per kota" action="Analisis penuh" to="/price-trends" />
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
        {pulse.map((c) => {
          const up = c.delta >= 0.1
          const down = c.delta <= -0.1
          return (
            <Link
              key={c.name}
              to={`/explore?q=${encodeURIComponent(c.name)}`}
              className="min-w-[200px] w-[200px] shrink-0 bg-white rounded-2xl border border-brand-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <p className="text-sm font-bold text-brand-text">{c.name}</p>
              <p className="text-lg font-extrabold text-brand-primary mt-1">{formatPrice(c.avg)}</p>
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    up ? 'bg-emerald-50 text-emerald-700'
                      : down ? 'bg-red-50 text-red-600'
                      : 'bg-brand-bg text-brand-muted'
                  }`}
                >
                  {up ? <TrendingUp size={11} /> : down ? <TrendingDown size={11} /> : null}
                  {up ? `+${c.delta}%` : down ? `${c.delta}%` : 'stabil'}
                </span>
                <span className="text-[11px] text-brand-muted">{c.count} listing</span>
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

export default function ExploreInsights({ properties, excludeIds }) {
  const { t } = useTranslation()

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
      <MarketPulse properties={available} />

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
        <section className="max-w-7xl mx-auto px-4 mb-8">
          <SectionHeader icon={Building2} title="Kepercayaan HuniOne" sub="komunitas yang tumbuh" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Building2, label: 'Properti', value: available.length },
              { icon: MapPin, label: 'Kota', value: cities },
              { icon: Users, label: 'Agen & Pengembang', value: 0 },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-brand-border px-4 py-4 flex flex-col gap-1">
                <span className="text-2xl font-extrabold text-brand-primary">{s.value || '–'}</span>
                <span className="text-xs text-brand-muted">{s.label}</span>
              </div>
            ))}
            <div className="bg-brand-primary rounded-2xl px-4 py-4 flex flex-col gap-1 text-white">
              <span className="text-2xl font-extrabold">100%</span>
              <span className="text-xs text-white/80">Terverifikasi</span>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
