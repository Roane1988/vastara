import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Star,
  TrendingDown,
  MapPin,
  Heart,
  Share2,
  ArrowLeftRight,
  Check,
  X,
} from 'lucide-react'
import { getFavorites, toggleFavorite as toggleFav } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPriceDisplay, formatPrice } from '../utils/format'
import {
  estimateMonthlyInstallment,
  estimateMonthlyRent,
  isRentalProperty,
} from '../utils/financialProfile'
import { useAuth } from '../context/AuthContext'
import { useCompare } from '../hooks/useCompare'

export default function PropertyGridCard({ p, getTranslated = null, maxRent = 0 }) {
  const { showToast } = useAuth()
  const { t } = useTranslation()
  const [saved, setSaved] = useState(getFavorites())
  const { compareSet, toggleCompare } = useCompare(showToast)

  const drop = p.original_price && Number(p.original_price) > Number(p.price)
  const isRent = isRentalProperty(p)
  const installment =
    !isRent && Number(p.price) > 0 ? estimateMonthlyInstallment(p.price, 5.5, 20, 20) : 0
  const rentPerMonth = isRent && Number(p.price) > 0 ? estimateMonthlyRent(p) : 0
  const rentAffordable = rentPerMonth > 0 && maxRent > 0 && rentPerMonth <= maxRent

  async function toggleSave(id) {
    const updated = await toggleFav(id)
    setSaved(updated)
  }

  async function shareProperty() {
    const url = `${window.location.origin}/property/${p.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text: p.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link properti disalin', 'success')
      }
    } catch {
      /* user cancelled share sheet */
    }
  }

  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-brand-border overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-primary/5">
      <Link to={`/property/${p.id}`} className="block group flex-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            loading="lazy"
            src={getImageSrc(p.image_url)}
            alt={p.title}
            onError={(e) => { e.target.src = FALLBACK_IMAGE }}
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
          {p.status === 'sold' && (
            <div className="absolute inset-0 bg-gray-100/70 flex items-center justify-center">
              <span className="inline-flex items-center bg-gray-600/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md">
                Terjual
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-end gap-2 flex-wrap">
            {drop && (
              <span className="text-sm font-semibold text-brand-muted line-through">
                {formatPrice(p.original_price)}
              </span>
            )}
            <p className="text-xl font-extrabold text-brand-primary">{formatPriceDisplay(p)}</p>
          </div>
          {installment > 0 && (
            <p className="text-[11px] text-brand-muted mt-0.5">
              Estimasi cicilan <b className="text-brand-accent">{formatPrice(installment)}</b>/bulan
            </p>
          )}
          {isRent && rentPerMonth > 0 && maxRent > 0 && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg mt-1.5 border ${
              rentAffordable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {rentAffordable ? <Check size={12} /> : <X size={12} />}
              {rentAffordable ? 'Sewa dalam jangkauan' : 'Sewa di atas budget'}
            </span>
          )}
          <p className="text-base font-semibold text-brand-text mt-1 group-hover:text-brand-accent transition-colors">
            {getTranslated ? getTranslated(p, 'title', p.title) : p.title}
          </p>
          <p className="text-sm text-brand-muted mt-1 flex items-center gap-1">
            <MapPin size={14} />
            {getTranslated
              ? getTranslated(p, 'address', p.address || p.location || 'Indonesia')
              : p.address || p.location || p.city || 'Indonesia'}
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
            onClick={shareProperty}
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