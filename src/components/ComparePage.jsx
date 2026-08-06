import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Info, Plus, Share2, Sparkles, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPriceDisplay, formatPrice } from '../utils/format'
import { usePropertyStore, MAX_ITEMS } from '../store/usePropertyStore'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import {
  getFinancialProfile,
  computeAffordability,
  maxAffordablePrice,
  estimateMonthlyInstallment,
  estimateMonthlyRent,
  isRentalProperty,
  BUYING_POWER_ASSUMPTION,
  formatRupiah,
} from '../utils/financialProfile'

const isRent = (p) => isRentalProperty(p)

function CompareSkeleton() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-32 h-6 bg-brand-border rounded shrink-0" />
          <div className="flex-1 h-6 bg-brand-border rounded" />
          <div className="flex-1 h-6 bg-brand-border rounded" />
          <div className="flex-1 h-6 bg-brand-border rounded" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default function ComparePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, showToast } = useAuth()
  const items = usePropertyStore((s) => s.compareList)
  const removeFromCompare = usePropertyStore((s) => s.removeFromCompare)
  const clearCompare = usePropertyStore((s) => s.clearCompare)
  const addToCompare = usePropertyStore((s) => s.addToCompare)
  const [searchParams, setSearchParams] = useSearchParams()
  const [fullData, setFullData] = useState([])
  const [loading, setLoading] = useState(true)
  const [finState, setFinState] = useState('loading')
  const [affordability, setAffordability] = useState(null)
  const requestRef = useRef(0)
  const renderedIdsRef = useRef([])

  useEffect(() => {
    let alive = true
    const loadFinancial = () => {
      setFinState('loading')
      getFinancialProfile()
        .then(({ profile }) => {
          if (!alive) return
          if (!profile) {
            setFinState('none')
            return
          }
          const aff = computeAffordability(profile)
          setAffordability(aff)
          setFinState(aff && aff.maxInstallment > 0 ? 'ready' : 'none')
        })
        .catch(() => { if (alive) setFinState('none') })
    }
    loadFinancial()
    window.addEventListener('financial-profile-saved', loadFinancial)
    return () => {
      alive = false
      window.removeEventListener('financial-profile-saved', loadFinancial)
    }
  }, [user?.id])

  const buyingPower = useMemo(() => {
    if (!affordability?.maxInstallment) return 0
    return maxAffordablePrice(
      affordability.maxInstallment,
      BUYING_POWER_ASSUMPTION.interestRate,
      BUYING_POWER_ASSUMPTION.tenorYears,
      BUYING_POWER_ASSUMPTION.dpPercentage
    )
  }, [affordability])

  const openFinancialProfile = () => {
    if (!user) { navigate('/login'); return }
    window.dispatchEvent(new Event('open-financial-profile'))
  }

  useEffect(() => {
    const raw = searchParams.get('ids')
    if (!raw) return
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
    setSearchParams({}, { replace: true })
    if (ids.length === 0) return
    ;(async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, price, image_url, category, price_period')
        .in('id', ids)
      if (!data || data.length === 0) return
      data.forEach((p) => addToCompare(p))
    })()
  }, [searchParams, setSearchParams, addToCompare])

  const shareCompare = async () => {
    const ids = fullData.map((p) => p.id)
    if (ids.length === 0) return
    const url = `${window.location.origin}/compare?ids=${ids.join(',')}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bandingkan properti HuniOne', url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link compare disalin', 'success')
      }
    } catch {
      /* user cancelled share sheet */
    }
  }

  useEffect(() => {
    renderedIdsRef.current = fullData.map(p => p.id)
  }, [fullData])

  useEffect(() => {
    let cancelled = false
    const ids = items

    async function load() {
      if (ids.length === 0) {
        requestRef.current += 1
        setFullData([])
        setLoading(false)
        return
      }

      const wanted = new Set(ids.map(p => p.id))
      const rendered = renderedIdsRef.current
      const isMismatch = rendered.length !== wanted.size || rendered.some(id => !wanted.has(id))
      if (!isMismatch) return

      setLoading(true)
      const requestId = ++requestRef.current

      const results = []

      try {
        if (ids.length > 0) {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .in('id', ids.map(p => p.id))
          if (error) {
            if (!cancelled && requestId === requestRef.current) {
              setFullData([])
              setLoading(false)
            }
            return
          }
          if (!error && data) results.push(...data)
        }
      } catch {
        if (!cancelled && requestId === requestRef.current) {
          setFullData([])
          setLoading(false)
        }
        return
      }

      if (!cancelled && requestId === requestRef.current) {
        setFullData(results)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [items])

  function handleRemove(id) {
    removeFromCompare(id)
    renderedIdsRef.current = renderedIdsRef.current.filter(rid => rid !== id)
    setFullData(prev => prev.filter(p => p.id !== id))
  }

  function handleClearAll() {
    clearCompare()
    setFullData([])
    requestRef.current += 1
    setLoading(false)
  }

  const validPrices = fullData
    .map(p => Number(p.price))
    .filter(n => Number.isFinite(n) && n > 0)
  const minPrice = validPrices.length ? Math.min(...validPrices) : null
  const maxPrice = validPrices.length ? Math.max(...validPrices) : 0

  const sqmValues = fullData
    .filter(p => !isRent(p))
    .map((p) => {
      const area = Number(p.area_sqm || p.sqm)
      const price = Number(p.price)
      return area > 0 && price > 0 ? Math.round(price / area) : null
    })
    .filter((n) => n !== null)
  const sqmMin = sqmValues.length ? Math.min(...sqmValues) : null

  const recommendation = useMemo(() => {
    if (fullData.length < 2) return null
    let best = null
    let bestPer = Infinity
    for (const p of fullData) {
      const area = Number(p.area_sqm || p.sqm)
      const price = Number(p.price)
      if (isRent(p) || !(area > 0 && price > 0)) continue
      const per = price / area
      if (per < bestPer) { bestPer = per; best = p }
    }
    if (!best) return null
    return { property: best, perSqm: Math.round(bestPer) }
  }, [fullData])

  const hasRent = fullData.some(isRent)

  const rows = [
    {
      label: t('compare.row.price'),
      render: (p) => {
        const value = Number(p.price)
        const isMin = minPrice !== null && value === minPrice
        return (
          <span className={`font-bold ${isMin ? 'text-brand-verified' : 'text-brand-text'}`}>
            {formatPriceDisplay(p)}
            {isMin && (
              <span className="ml-1.5 inline-flex align-middle items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-verified-bg text-brand-verified text-[9px] font-bold uppercase tracking-wide">
                <CheckCircle2 size={9} />
                {t('compare.cheapest')}
              </span>
            )}
          </span>
        )
      },
    },
    {
      label: t('compare.row.price_per_sqm'),
      render: (p) => {
        const area = Number(p.area_sqm || p.sqm)
        const price = Number(p.price)
        if (isRent(p) || !(area > 0 && price > 0)) return '-'
        const per = Math.round(price / area)
        const isMin = sqmMin !== null && per === sqmMin
        return (
          <span className={isMin ? 'font-bold text-brand-verified' : 'text-brand-text'}>
            {formatPrice(per)}/m²
            {isMin && (
              <span className="ml-1.5 inline-flex align-middle items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-verified-bg text-brand-verified text-[9px] font-bold uppercase tracking-wide">
                <CheckCircle2 size={9} />
                {t('compare.best_value')}
              </span>
            )}
          </span>
        )
      },
    },
    {
      label: hasRent ? 'Sewa/bln' : t('compare.row.installment'),
      render: (p) => {
        if (!Number(p.price)) return '-'
        if (isRent(p)) {
          const rent = estimateMonthlyRent(p)
          const over = finState === 'ready' && affordability.maxInstallment > 0 && rent > affordability.maxInstallment
          return (
            <span className={over ? 'text-brand-danger font-semibold' : 'text-brand-text'}>
              {formatRupiah(rent)}<span className="text-brand-muted text-xs">/bln</span>
            </span>
          )
        }
        const inst = estimateMonthlyInstallment(Number(p.price), BUYING_POWER_ASSUMPTION.interestRate, BUYING_POWER_ASSUMPTION.tenorYears, BUYING_POWER_ASSUMPTION.dpPercentage)
        const over = finState === 'ready' && affordability.maxInstallment > 0 && inst > affordability.maxInstallment
        return (
          <span className={over ? 'text-brand-danger font-semibold' : 'text-brand-text'}>
            {formatRupiah(inst)}
          </span>
        )
      },
    },
    { label: t('compare.row.property_type'), render: (p) => p.property_type || p.category || '-' },
    { label: t('compare.row.bedrooms'), render: (p) => (p.bedrooms ? `${p.bedrooms} KT` : '-') },
    { label: t('compare.row.bathrooms'), render: (p) => (p.bathrooms ? `${p.bathrooms} KM` : '-') },
    { label: t('compare.row.area'), render: (p) => (p.area_sqm || p.sqm ? `${p.area_sqm || p.sqm} m²` : '-') },
    { label: t('compare.row.city'), render: (p) => p.city || p.location?.split(',').pop()?.trim() || '-' },
    { label: t('compare.row.district'), render: (p) => p.district || '-' },
    { label: t('compare.row.address'), render: (p) => p.address || p.location || '-' },
    { label: t('compare.row.facilities'), render: (p) => (p.facilities ? <span className="text-xs leading-snug block max-w-[160px] mx-auto">{p.facilities}</span> : '-') },
    { label: t('compare.row.certificate_status'), render: (p) => p.certificate_status || '-' },
  ]

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-brand-border bg-brand-surface">
          <button type="button" onClick={() => navigate(-1)} aria-label={t('compare.back')} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-brand-text">{t('compare.title')}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-highlight flex items-center justify-center mb-4">
            <ArrowLeftRight size={24} className="text-brand-accent" />
          </div>
          <p className="text-sm text-brand-muted mb-5">{t('compare.empty')}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.97] transition-all duration-200"
          >
            <Plus size={16} />
            {t('compare.empty_cta')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-brand-border bg-brand-surface">
        <button type="button" onClick={() => navigate(-1)} aria-label={t('compare.back')} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-brand-text flex-1">{t('compare.title')}</h1>
        {fullData.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={shareCompare}
              aria-label={t('compare.share_aria')}
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-accent font-semibold transition-colors"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">{t('compare.share')}</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-brand-danger hover:text-red-600 font-semibold"
            >
              {t('compare.clear_all')}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-brand-surface border-b border-brand-border">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-brand-muted">
            {t('compare.count', { count: fullData.length, max: MAX_ITEMS })}
            {fullData.length > 0 && fullData.length < 2 && (
              <span className="block mt-0.5 text-[11px]">{t('compare.hint_few')}</span>
            )}
          </p>
          {fullData.length < MAX_ITEMS && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-highlight text-brand-primary text-xs font-bold hover:brightness-95 active:scale-[0.97] transition-all"
            >
              <Plus size={13} />
              {t('compare.add_more')}
            </button>
          )}
        </div>
      </div>

      {finState === 'none' && fullData.length > 0 && (
        <div className="px-4 pt-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-highlight/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-brand-text">
              <Info size={15} className="shrink-0 text-brand-accent" />
              <span>{t('compare.afford_cta_text')}</span>
            </div>
            <button
              type="button"
              onClick={openFinancialProfile}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:brightness-90 active:scale-[0.97] transition-all"
            >
              {t('compare.afford_cta')}
            </button>
          </div>
        </div>
      )}

      {finState === 'ready' && fullData.length > 0 && (
        <div className="px-4 pt-3">
          <div className="max-w-5xl mx-auto rounded-xl bg-brand-verified-bg/60 border border-brand-verified/20 px-4 py-3 text-xs text-brand-text">
            <div className="flex items-center gap-1.5 font-bold text-brand-verified mb-1">
              <CheckCircle2 size={14} />
              {t('compare.afford_title')}
            </div>
            <p>
              {t('compare.afford_body', {
                power: formatRupiah(buyingPower),
                maxInstallment: formatRupiah(affordability.maxInstallment),
              })}
            </p>
            <p className="text-[10px] text-brand-muted mt-1">
              {t('compare.afford_note', {
                tenor: BUYING_POWER_ASSUMPTION.tenorYears,
                rate: BUYING_POWER_ASSUMPTION.interestRate,
                dp: BUYING_POWER_ASSUMPTION.dpPercentage,
              })}
            </p>
          </div>
        </div>
      )}

      {recommendation && fullData.length >= 2 && (
        <div className="px-4 pt-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 rounded-xl border border-brand-verified/20 bg-brand-verified-bg/60 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-brand-verified mb-1">
                <Sparkles size={15} />
                {t('compare.recommend_title')}
              </div>
              <p className="text-xs text-brand-text leading-snug">
                {t('compare.recommend_body', {
                  title: recommendation.property.title,
                  price: formatPrice(recommendation.perSqm),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('open-hunibot-question', {
                  detail: { question: `Bandingkan ${fullData.map((p) => p.title).join(' vs ')} — mana yang lebih baik untuk dibeli dan mengapa?` },
                }))
              }
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:brightness-90 active:scale-[0.97] transition-all"
            >
              <Sparkles size={13} />
              {t('compare.ask_bot')}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[640px] max-w-5xl mx-auto p-4">
          {loading ? (
            <CompareSkeleton />
          ) : (
            <table className="w-full border-collapse" summary={t('compare.title')}>
              <caption className="sr-only">{t('compare.title')}</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-32 p-3 text-left text-xs font-bold text-brand-muted uppercase sticky left-0 z-20 bg-brand-bg border-r border-brand-border/50" />
                  {fullData.map(p => (
                    <th key={p.id} scope="col" className="p-3 text-center relative">
                      <button
                        type="button"
                        onClick={() => handleRemove(p.id)}
                        aria-label={t('compare.remove_aria')}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20 hover:text-red-600 flex items-center justify-center transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <Link to={`/property/${p.id}`} className="block">
                        <div className="h-28 rounded-xl overflow-hidden bg-brand-bg mb-2">
                          <img
                            src={getImageSrc(p.image_url)}
                            alt={p.title}
                            onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-sm font-semibold text-brand-text leading-tight line-clamp-2">
                          {p.title}
                          {p.status === 'verified' && (
                            <span className="ml-1 inline-flex align-middle items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-verified-bg text-brand-verified text-[9px] font-bold uppercase tracking-wide">
                              <CheckCircle2 size={9} />
                              {t('compare.verified')}
                            </span>
                          )}
                        </p>
                        {finState === 'ready' && !isRent(p) && Number(p.price) > 0 && buyingPower > 0 && (
                          <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(p.price) <= buyingPower
                              ? 'bg-brand-verified-bg text-brand-verified'
                              : 'bg-brand-danger/10 text-brand-danger'
                          }`}>
                            <CheckCircle2 size={10} />
                            {Number(p.price) <= buyingPower ? t('compare.afford_in_range') : t('compare.afford_over')}
                          </span>
                        )}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-t border-brand-border/50 text-xs font-bold text-brand-muted sticky left-0 z-10 bg-brand-bg border-r border-brand-border/50">
                    {t('compare.row.price_scale')}
                  </td>
                  {fullData.map(p => {
                    const price = Number(p.price)
                    const ratio = price > 0 && maxPrice > 0 ? Math.min(100, Math.round((price / maxPrice) * 100)) : 0
                    const isMax = maxPrice > 0 && price === maxPrice
                    return (
                      <td key={p.id} className="p-3 border-t border-brand-border/50 text-center">
                        <div className="max-w-[160px] mx-auto">
                          <div className="h-2.5 w-full rounded-full bg-brand-border/40 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isMax ? 'bg-brand-accent' : 'bg-gradient-to-r from-brand-accent to-brand-primary'}`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
                {rows.map(r => (
                  <tr key={r.label}>
                    <td className="p-3 border-t border-brand-border/50 text-xs font-bold text-brand-muted sticky left-0 z-10 bg-brand-bg border-r border-brand-border/50">{r.label}</td>
                    {fullData.map(p => (
                      <td key={p.id} className="p-3 border-t border-brand-border/50 text-sm text-brand-text text-center">
                        {r.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
