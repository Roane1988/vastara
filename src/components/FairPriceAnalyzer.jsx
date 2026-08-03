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
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatCompact } from '../utils/format'
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

const VERDICT_HERO = {
  Wajar: 'from-emerald-500/10 via-emerald-400/5 to-transparent border-emerald-200',
  'Di Atas Pasar': 'from-red-500/10 via-orange-400/5 to-transparent border-red-200',
  'Di Bawah Pasar': 'from-emerald-500/10 via-teal-400/5 to-transparent border-emerald-200',
  'Data Terbatas': 'from-slate-500/10 to-transparent border-slate-200',
}

const VERDICT_TEXT = {
  Wajar: 'text-emerald-700',
  'Di Atas Pasar': 'text-red-600',
  'Di Bawah Pasar': 'text-emerald-700',
  'Data Terbatas': 'text-slate-600',
}

const HERO_ICON = {
  Wajar: { bg: 'bg-emerald-100 text-emerald-700', Icon: Scale },
  'Di Atas Pasar': { bg: 'bg-red-100 text-red-600', Icon: TrendingUp },
  'Di Bawah Pasar': { bg: 'bg-emerald-100 text-emerald-700', Icon: TrendingDown },
  'Data Terbatas': { bg: 'bg-slate-100 text-slate-600', Icon: Info },
}

const VERDICT_HEADLINES = {
  Wajar: 'Harga properti ini berada dalam kisaran wajar pasar.',
  'Data Terbatas': 'Data pasar masih terbatas — analisis ini bersifat indikatif.',
}

const REC_SUPPORT = {
  'Worth It': 'Harga kompetitif dibanding pasar. Layak dipertimbangkan.',
  Nego: 'Sesuaikan penawaran mendekati kisaran wajar sebelum memutuskan.',
  Tunda: 'Harga terpaut jauh di atas pasar. Pertimbangkan menunggu atau cari alternatif lain.',
  'Data Terbatas': 'Saran ditangguhkan sampai data pembanding mencukupi.',
}

function buildHeadline(verdict, dev) {
  if (verdict === 'Di Atas Pasar') {
    const pct = dev != null ? ` ${Math.abs(dev)}%` : ''
    return `Harga${pct} di atas median pasar — masih ada ruang untuk negosiasi.`
  }
  if (verdict === 'Di Bawah Pasar') {
    const pct = dev != null ? ` ${Math.abs(dev)}%` : ''
    return `Harga${pct} di bawah median pasar — peluang menarik.`
  }
  return VERDICT_HEADLINES[verdict] || 'Analisis harga wajar berdasarkan data pasar.'
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

function ComparableTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const v = payload[0].value
  return (
    <div className="bg-white rounded-xl border border-brand-border shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-brand-text mb-1">{label}</p>
      <p className="text-brand-muted">{formatCompact(v)} / m²</p>
      {label === 'Properti ini' && (
        <p className="text-[10px] text-brand-accent mt-0.5 font-semibold">Harga target</p>
      )}
    </div>
  )
}

function ComparableChart({ comparables, market }) {
  const targetPsqm = market?.targetPricePerSqm
  const medianPsqm = market?.medianPricePerSqm
  const deltaPct = market?.deltaPct

  const rows = (comparables || [])
    .map((c) => {
      const price = Number(c?.price)
      const area = Number(c?.area_sqm || c?.sqm)
      if (!price || price <= 0 || !area || area <= 0) return null
      return { label: c.district || c.city || 'Area lain', psqm: Math.round(price / area) }
    })
    .filter(Boolean)

  if (rows.length < 2 || !targetPsqm) {
    return (
      <div className="rounded-2xl bg-brand-bg/50 border border-dashed border-brand-border p-4 text-center">
        <Info size={20} className="mx-auto text-brand-muted/40 mb-2" />
        <p className="text-xs font-semibold text-brand-text">Belum cukup data pembanding</p>
        <p className="text-[11px] text-brand-muted mt-1 max-w-xs mx-auto leading-relaxed">
          Perlu minimal 2 properti pembanding dengan luas area untuk membandingkan harga per m².
        </p>
      </div>
    )
  }

  const chartData = [...rows, { label: 'Properti ini', psqm: targetPsqm, target: true }]
  const domainMax = Math.max(...chartData.map((d) => d.psqm), 1)

  return (
    <div className="rounded-2xl bg-white border border-brand-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-xs font-bold text-brand-text">Sebaran harga pembanding (per m²)</p>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-brand-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#CBD5E1] inline-block" />
            Pembanding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2E86DE] inline-block" />
            Properti ini
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-amber-500 inline-block" />
            Median pasar
          </span>
        </div>
      </div>

      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, domainMax]}
              tickFormatter={formatCompact}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={94}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ComparableTooltip />} />
            {medianPsqm != null && (
              <ReferenceLine x={medianPsqm} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
            )}
            <Bar dataKey="psqm" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.target ? '#2E86DE' : '#CBD5E1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {deltaPct != null && (
        <div className="mt-3 rounded-xl bg-brand-bg/60 border border-brand-border px-3.5 py-2.5 flex items-start gap-2">
          <Scale size={14} className="shrink-0 mt-0.5 text-brand-accent" />
          <p className="text-xs text-brand-muted leading-relaxed">
            Harga properti ini <span className={`font-bold ${deltaPct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{deltaPct > 0 ? 'lebih tinggi' : 'lebih rendah'} {Math.abs(deltaPct)}%</span>{' '}
            dari median pasar {medianPsqm != null ? `(${formatCompact(medianPsqm)}/m²)` : ''}.
          </p>
        </div>
      )}

      <p className="text-[10px] text-brand-muted/70 mt-2.5 flex items-start gap-1">
        <Info size={11} className="shrink-0 mt-0.5" />
        Nilai dihitung dari harga dibagi luas (Rp/m²) properti pembanding terverifikasi di area serupa. Garis putus-putus = median pasar.
      </p>
    </div>
  )
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
  const dev = analysis?.deviationPct
  const headline = buildHeadline(aiVerdict, dev)
  const targetPrice = Number(property?.price) || 0
  const medianTotal = analysis?.fairPriceRange?.median
    ? Number(analysis.fairPriceRange.median)
    : market?.medianPricePerSqm && Number(property?.area_sqm)
      ? market.medianPricePerSqm * Number(property.area_sqm)
      : null
  const hasCompare = targetPrice > 0 && medianTotal != null && medianTotal > 0
  const barMax = hasCompare ? Math.max(targetPrice, medianTotal) * 1.05 : 1

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

      {!loadingMarket && (
        <div className="mt-4">
          <ComparableChart comparables={comparables} market={market} />
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
          <div className={`rounded-2xl border bg-gradient-to-br ${VERDICT_HERO[aiVerdict] || VERDICT_HERO['Data Terbatas']} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${HERO_ICON[aiVerdict]?.bg || HERO_ICON['Data Terbatas'].bg}`}>
                  {(() => {
                    const I = HERO_ICON[aiVerdict]?.Icon || Info
                    return <I size={20} />
                  })()}
                </div>
                <div>
                  <p className={`text-lg font-extrabold leading-tight ${VERDICT_TEXT[aiVerdict] || VERDICT_TEXT['Data Terbatas']}`}>
                    {aiVerdict || 'Hasil Analisis'}
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Hasil penilaian AI</p>
                </div>
              </div>
              {analysis.confidence && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full border ${CONF_STYLES[analysis.confidence] || CONF_STYLES.Rendah}`}>
                  <Sparkles size={11} />
                  Keyakinan {analysis.confidence}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-brand-text mt-3 leading-relaxed">{headline}</p>

            {analysis.buyRecommendation && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/70 border border-brand-border/70 px-3.5 py-2.5">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 mt-0.5 ${REC_STYLES[analysis.buyRecommendation] || REC_STYLES['Data Terbatas']}`}>
                  <Check size={11} />
                  {analysis.buyRecommendation}
                </span>
                <p className="text-xs text-brand-muted leading-relaxed">{REC_SUPPORT[analysis.buyRecommendation]}</p>
              </div>
            )}
          </div>

          {hasCompare && (
            <div className="rounded-2xl bg-white border border-brand-border p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <p className="text-xs font-bold text-brand-text">Harga vs median pasar</p>
                {analysis.deviationPct != null && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    analysis.deviationPct > 8
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {analysis.deviationPct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {analysis.deviationPct > 0 ? '+' : ''}{analysis.deviationPct}% vs median
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-brand-muted">Harga properti ini</span>
                    <span className="text-[11px] font-bold text-brand-text">{formatCurrency(targetPrice)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-bg overflow-hidden">
                    <div className="h-full rounded-full bg-[#2E86DE]" style={{ width: `${Math.min(100, (targetPrice / barMax) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-brand-muted">Median pasar</span>
                    <span className="text-[11px] font-bold text-brand-text">{formatCurrency(medianTotal)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-bg overflow-hidden">
                    <div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.min(100, (medianTotal / barMax) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {analysis.suggestedOffer != null && analysis.suggestedOffer > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-brand-accent to-brand-primary p-3 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 opacity-90">
                  <ArrowDownRight size={11} />
                  Saran Penawaran
                </p>
                <p className="text-base font-extrabold mt-1">{formatCurrency(analysis.suggestedOffer)}</p>
              </div>
            )}
            {analysis.fairPriceRange && (analysis.fairPriceRange.low || analysis.fairPriceRange.high) && aiVerdict !== 'Data Terbatas' && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Kisaran Wajar</p>
                <p className="text-sm font-extrabold text-brand-text mt-1">
                  {analysis.fairPriceRange.low ? formatCurrency(analysis.fairPriceRange.low) : '-'}
                  {' – '}
                  {analysis.fairPriceRange.high ? formatCurrency(analysis.fairPriceRange.high) : '-'}
                </p>
              </div>
            )}
            {analysis.pricePerSqm != null && (
              <div className="bg-brand-bg/60 rounded-xl border border-brand-border p-3">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Harga /m²</p>
                <p className="text-sm font-extrabold text-brand-text mt-1">{formatCurrency(analysis.pricePerSqm)}</p>
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
            <div className="rounded-2xl bg-brand-bg/50 border border-brand-border p-4">
              <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-brand-accent" />
                Alasan Analisis
              </p>
              <p className="text-sm text-brand-text leading-relaxed">{analysis.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
