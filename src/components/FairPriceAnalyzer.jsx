import { useState, useEffect, useRef } from 'react'
import {
  Scale,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
  Lock,
  Info,
  Target,
  Database,
  ArrowDownRight,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'
import { getAuthHeaders } from '../utils/groqClient'
import { computeMarketStats, verdictFromMarket } from '../utils/fairPrice'

const ALLOWED_MODEL = 'openai/gpt-oss-120b'

const COMPARABLE_FIELDS = 'title, price, category, property_type, city, district, bedrooms, bathrooms, area_sqm, certificate_status'

function cleanJson(raw) {
  return raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
}

async function fetchComparables(property) {
  if (!property?.id || !property?.price) return []
  try {
    const base = () => supabase
      .from('properties')
      .select(COMPARABLE_FIELDS)
      .eq('status', 'verified')
      .neq('id', property.id)

    const run = async (q) => {
      const { data, error } = await q.limit(8)
      return error ? [] : (data || [])
    }

    let q1 = base()
      .gte('price', Math.max(0, property.price * 0.6))
      .lte('price', property.price * 1.4)
    if (property.category) q1 = q1.eq('category', property.category)
    if (property.city) q1 = q1.ilike('city', `%${property.city}%`)
    if (property.property_type) q1 = q1.eq('property_type', property.property_type)
    const r1 = await run(q1)
    if (r1.length >= 3) return r1

    let q2 = base()
      .gte('price', Math.max(0, property.price * 0.4))
      .lte('price', property.price * 1.6)
    if (property.category) q2 = q2.eq('category', property.category)
    if (property.city) q2 = q2.ilike('city', `%${property.city}%`)
    const r2 = await run(q2)
    if (r2.length >= 3) return r2

    let q3 = base()
    if (property.category) q3 = q3.eq('category', property.category)
    if (property.city) q3 = q3.ilike('city', `%${property.city}%`)
    const r3 = await run(q3)
    if (r3.length) return r3

    return r1.length ? r1 : r2
  } catch {
    return []
  }
}

const VERDICT_STYLES = {
  Wajar: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Di Atas Pasar': 'bg-red-50 text-red-700 border-red-200',
  'Di Bawah Pasar': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Data Terbatas': 'bg-gray-100 text-gray-600 border-gray-200',
}

const REC_STYLES = {
  'Worth It': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Nego: 'bg-amber-50 text-amber-700 border-amber-200',
  Tunda: 'bg-red-50 text-red-700 border-red-200',
  'Data Terbatas': 'bg-gray-100 text-gray-600 border-gray-200',
}

const CONF_STYLES = {
  Tinggi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Sedang: 'bg-amber-50 text-amber-700 border-amber-200',
  Rendah: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function FairPriceAnalyzer({ property }) {
  const { user } = useAuth()
  const [market, setMarket] = useState(null)
  const [comparables, setComparables] = useState([])
  const [loadingMarket, setLoadingMarket] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const cardRef = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!property?.id) {
        setLoadingMarket(false)
        return
      }
      const comps = await fetchComparables(property)
      if (cancelled) return
      setComparables(comps)
      setMarket(computeMarketStats(property, comps))
      setLoadingMarket(false)
    })()
    return () => { cancelled = true }
  }, [property])

  async function handleAnalyze() {
    if (loading) return
    if (!user) {
      setError('Silakan masuk terlebih dahulu untuk menganalisis harga.')
      return
    }
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const payload = {
        model: ALLOWED_MODEL,
        purpose: 'fair_price',
        property: {
          id: property?.id || '',
          price: property?.price || 0,
          city: property?.city || '',
          district: property?.district || '',
          property_type: property?.property_type || '',
          bedrooms: property?.bedrooms || 0,
          bathrooms: property?.bathrooms || 0,
          area_sqm: property?.area_sqm || property?.sqm || 0,
          address: property?.address || '',
          category: property?.category || '',
          certificate_status: property?.certificate_status || '',
          original_price: property?.original_price || null,
          price_change_status: property?.price_change_status || 'none',
          comparables,
          market: market || {},
        },
      }

      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (cancelledRef.current) return

      const data = await res.json()
      if (!res.ok) {
        const friendly = typeof data?.error === 'string' ? data.error : data?.error?.message
        setError(friendly || 'Gagal menganalisis harga. Coba lagi.')
        return
      }

      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) {
        setError('Respon AI kosong. Coba lagi.')
        return
      }

      let parsed
      try {
        parsed = JSON.parse(cleanJson(rawContent))
      } catch {
        if (cancelledRef.current) return
        setError('Maaf, AI gagal merangkai format data dengan utuh karena antrean panjang. Silakan klik analisis sekali lagi.')
        return
      }
      if (cancelledRef.current) return
      setAnalysis(parsed)
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Terjadi kesalahan. Coba lagi.')
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  const det = market ? verdictFromMarket(market) : null
  const aiVerdict = analysis?.fairVerdict
  const aiColor = aiVerdict && VERDICT_STYLES[aiVerdict] ? aiVerdict : null

  return (
    <div ref={cardRef} className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shadow-md shadow-brand-accent/20">
            <Scale size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-text leading-tight">Penilaian Harga Wajar</h2>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-accent">
              <Sparkles size={11} />
              Ditenagai AI
            </div>
          </div>
        </div>
      </div>

      {/* Bencmark pasar (deterministik, tanpa biaya AI) */}
      {loadingMarket ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-7 h-7 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl bg-brand-bg/60 border border-brand-border p-4">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-brand-muted uppercase tracking-wide">
            <Database size={13} className="text-brand-accent" />
            Benchmark Pasar
          </div>
          {det && det.verdict !== 'Data Terbatas' ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-brand-border p-3">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Harga Target</p>
                  <p className="text-sm font-extrabold text-brand-text mt-0.5">{market.targetPricePerSqm != null ? formatCurrency(market.targetPricePerSqm) + '/m²' : '-'}</p>
                </div>
                <div className="bg-white rounded-xl border border-brand-border p-3">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Median Pasar</p>
                  <p className="text-sm font-extrabold text-brand-primary mt-0.5">{market.medianPricePerSqm != null ? formatCurrency(market.medianPricePerSqm) + '/m²' : '-'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  det.verdict === 'Wajar'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {market.deltaPct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {market.deltaPct > 0 ? '+' : ''}{market.deltaPct}% dari median pasar
                </span>
                <span className="text-[11px] text-brand-muted">
                  {market.comparableCount} properti pembanding
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-brand-muted">
              <Info size={15} className="shrink-0 mt-0.5 text-brand-accent" />
              <p>
                Data pembanding di area serupa masih terbatas{market?.comparableCount ? ` (${market.comparableCount} dengan luas tersedia)` : ''}. Analisis AI akan tetap mencoba menilai dari data yang ada.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tombol analisis AI */}
      <div className="mt-4">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || loadingMarket}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary text-white text-sm font-bold hover:brightness-95 active:scale-[0.99] transition-all disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Target size={16} />
          )}
          {loading ? 'Menganalisis harga…' : loadingMarket ? 'Menyiapkan data pasar…' : 'Analisis Harga Wajar'}
        </button>
        {!user && (
          <p className="flex items-center gap-1 text-[11px] text-brand-muted mt-2">
            <Lock size={11} className="shrink-0" />
            Masuk untuk melihat analisis AI.
          </p>
        )}
      </div>

      {/* Hasil AI */}
      {analysis && (
        <div className="mt-5 pt-5 border-t border-brand-border space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {aiVerdict && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border ${aiColor ? VERDICT_STYLES[aiVerdict] : 'bg-brand-bg text-brand-text border-brand-border'}`}>
                <Scale size={12} />
                {aiVerdict}
              </span>
            )}
            {analysis.buyRecommendation && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border ${REC_STYLES[analysis.buyRecommendation] || 'bg-brand-bg text-brand-text border-brand-border'}`}>
                <Check size={12} />
                {analysis.buyRecommendation}
              </span>
            )}
            {analysis.confidence && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONF_STYLES[analysis.confidence] || 'bg-brand-bg text-brand-text border-brand-border'}`}>
                Keyakinan: {analysis.confidence}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.deviationPct != null && analysis.fairVerdict !== 'Data Terbatas' && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Deviasi Harga</p>
                <p className={`text-sm font-extrabold mt-0.5 ${analysis.deviationPct > 8 ? 'text-red-600' : analysis.deviationPct < -8 ? 'text-emerald-600' : 'text-brand-text'}`}>
                  {analysis.deviationPct > 0 ? '+' : ''}{analysis.deviationPct}%
                </p>
              </div>
            )}
            {analysis.suggestedOffer != null && analysis.suggestedOffer > 0 && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide flex items-center gap-1">
                  <ArrowDownRight size={11} className="text-brand-accent" />
                  Saran Penawaran
                </p>
                <p className="text-sm font-extrabold text-brand-accent mt-0.5">{formatCurrency(analysis.suggestedOffer)}</p>
              </div>
            )}
            {analysis.pricePerSqm != null && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Harga /m²</p>
                <p className="text-sm font-extrabold text-brand-text mt-0.5">{formatCurrency(analysis.pricePerSqm)}</p>
              </div>
            )}
            {analysis.fairPriceRange && (analysis.fairPriceRange.low || analysis.fairPriceRange.median) && analysis.fairVerdict !== 'Data Terbatas' && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Kisaran Wajar</p>
                <p className="text-sm font-extrabold text-brand-text mt-0.5">
                  {analysis.fairPriceRange.low ? formatCurrency(analysis.fairPriceRange.low) : '-'} – {analysis.fairPriceRange.median ? formatCurrency(analysis.fairPriceRange.median) : '-'}
                </p>
              </div>
            )}
          </div>

          {analysis.priceHistoryNote && analysis.priceHistoryNote !== '-' && (
            <div className="flex items-start gap-2 text-xs text-brand-muted bg-amber-50/70 border border-amber-200/60 rounded-xl px-3 py-2.5">
              <TrendingDown size={13} className="shrink-0 mt-0.5 text-amber-600" />
              <span>{analysis.priceHistoryNote}</span>
            </div>
          )}

          {analysis.explanation && (
            <p className="text-sm text-brand-muted leading-relaxed">{analysis.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}
