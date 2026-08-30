import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  TrendingDown,
  Home,
  ShieldCheck,
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
import { useAuth } from '../context/AuthContext'
import { useCompare } from '../hooks/useCompare'

export function CarouselPropertyCard({ p, t }) {
  const { showToast } = useAuth()
  const [saved, setSaved] = useState(getFavorites())
  const { compareSet, toggleCompare } = useCompare()

  const drop = p.original_price && Number(p.original_price) > Number(p.price)

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
          {/* Estimasi cicilan KPR — hidden temporarily
          {installment > 0 && (
            <p className="text-[11px] text-brand-muted mt-0.5">
              Estimasi cicilan <b className="text-brand-accent">{formatPrice(installment)}</b>/bulan
            </p>
          )} */}
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

  return (
    <>
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
    </>
  )
}
