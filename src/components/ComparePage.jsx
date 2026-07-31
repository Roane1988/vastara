import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Plus, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import { formatPrice } from '../utils/format'
import { getCompareList, removeFromCompare, clearCompare, MAX_ITEMS } from '../utils/compare'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'

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
  const [items, setItems] = useState([])
  const [fullData, setFullData] = useState([])
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)
  const requestRef = useRef(0)
  const renderedIdsRef = useRef([])

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

  useEffect(() => {
    renderedIdsRef.current = fullData.map(p => p.id)
  }, [fullData])

  useEffect(() => {
    async function load(ids) {
      const requestId = ++requestRef.current
      const dummies = ids.filter(p => p.id.startsWith('dummy-'))
      const real = ids.filter(p => !p.id.startsWith('dummy-'))

      const results = []

      for (const d of dummies) {
        const match = DUMMY_PROPERTIES.find(p => p.id === d.id)
        if (match) results.push(match)
      }

      try {
        if (real.length > 0) {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .in('id', real.map(p => p.id))
          if (!error && data) results.push(...data)
        }
      } catch {
        /* keep only dummy results; page still renders */
      }

      if (!cancelledRef.current && requestId === requestRef.current) {
        setFullData(results)
      }
      if (!cancelledRef.current && requestId === requestRef.current) {
        setLoading(false)
      }
    }

    function sync() {
      const ids = Array.isArray(getCompareList()) ? getCompareList() : []
      setItems(ids)

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
      load(ids)
    }

    sync()
    window.addEventListener('compare-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      cancelledRef.current = true
      window.removeEventListener('compare-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function handleRemove(id) {
    removeFromCompare(id)
    const updated = getCompareList()
    setItems(updated)
    renderedIdsRef.current = renderedIdsRef.current.filter(rid => rid !== id)
    setFullData(prev => prev.filter(p => p.id !== id))
    window.dispatchEvent(new Event('compare-updated'))
  }

  function handleClearAll() {
    clearCompare()
    setItems([])
    setFullData([])
    requestRef.current += 1
    setLoading(false)
    window.dispatchEvent(new Event('compare-updated'))
  }

  const validPrices = fullData
    .map(p => Number(p.price))
    .filter(n => Number.isFinite(n) && n > 0)
  const minPrice = validPrices.length ? Math.min(...validPrices) : null

  const rows = [
    {
      label: t('compare.row.price'),
      render: (p) => {
        const value = Number(p.price)
        const isMin = minPrice !== null && value === minPrice
        return (
          <span className={`font-bold ${isMin ? 'text-brand-verified' : 'text-brand-text'}`}>
            {p.priceDisplay || formatPrice(p.price)}
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
    { label: t('compare.row.property_type'), render: (p) => p.property_type || p.category || '-' },
    { label: t('compare.row.bedrooms'), render: (p) => (p.bedrooms ? `${p.bedrooms} KT` : '-') },
    { label: t('compare.row.bathrooms'), render: (p) => (p.bathrooms ? `${p.bathrooms} KM` : '-') },
    { label: t('compare.row.area'), render: (p) => (p.area_sqm || p.sqm ? `${p.area_sqm || p.sqm} m²` : '-') },
    { label: t('compare.row.city'), render: (p) => p.city || p.location?.split(',').pop()?.trim() || '-' },
    { label: t('compare.row.address'), render: (p) => p.address || p.location || '-' },
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
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-brand-danger hover:text-red-600 font-semibold"
          >
            {t('compare.clear_all')}
          </button>
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

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[640px] max-w-5xl mx-auto p-4">
          {loading ? (
            <CompareSkeleton />
          ) : (
            <table className="w-full border-collapse" summary={t('compare.title')}>
              <caption className="sr-only">{t('compare.title')}</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-32 p-3 text-left text-xs font-bold text-brand-muted uppercase" />
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
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.label}>
                    <td className="p-3 border-t border-brand-border/50 text-xs font-bold text-brand-muted">{r.label}</td>
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
