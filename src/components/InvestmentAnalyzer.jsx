import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Info,
  Wallet,
  BarChart3,
  Percent,
  Banknote,
  Ruler,
  Hourglass,
  Target,
  ArrowUpRight,
  Shield,
  Database,
  User,
  Check,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../utils/format'
import { getFinancialProfile, computeAffordability, maxAffordablePrice, BUYING_POWER_ASSUMPTION } from '../utils/financialProfile'

const ALLOWED_MODEL = 'openai/gpt-oss-120b'

const HORIZON_OPTIONS = [5, 10, 15]
const INTENT_OPTIONS = [
  { value: 'rent', label: 'Disewakan' },
  { value: 'resale', label: 'Jual kembali' },
  { value: 'occupy', label: 'Ditempati' },
]
const INTENT_LABELS = INTENT_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc }, {})
const SCORE_META = { emerald: '#10b981', amber: '#f59e0b', rose: '#ef4444' }

function scoreColor(score) {
  if (score == null) return SCORE_META.emerald
  if (score >= 75) return SCORE_META.emerald
  if (score >= 50) return SCORE_META.amber
  return SCORE_META.rose
}

const SCORE_LABELS = [
  { key: 'affordability', label: 'Harga terjangkau' },
  { key: 'yield', label: 'Cocok target yield' },
  { key: 'appreciation', label: 'Potensi apresiasi' },
  { key: 'risk', label: 'Risiko terkendali' },
]

function cleanJson(raw) {
  return raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
}

function extractYieldValue(yieldStr) {
  if (!yieldStr) return null
  const nums = yieldStr.match(/\d+(\.\d+)?/g)
  if (!nums) return null
  const vals = nums.map(Number)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function getScoreMeta(avgYield) {
  if (avgYield == null) return { color: 'gray', label: 'Belum Dinilai', ringColor: '#9ca3af' }
  if (avgYield >= 7) return { color: 'emerald', label: 'Sangat Potensial', ringColor: '#10b981' }
  if (avgYield >= 4.5) return { color: 'emerald', label: 'Potensial', ringColor: '#10b981' }
  if (avgYield >= 3) return { color: 'amber', label: 'Cukup', ringColor: '#f59e0b' }
  return { color: 'red', label: 'Kurang', ringColor: '#ef4444' }
}

function getScoreCaption(avgYield) {
  if (avgYield == null) return 'Klik tombol analisis untuk menilai potensi properti ini.'
  if (avgYield >= 7) return 'Rendemen sewa sangat menarik — kandidat investasi kuat.'
  if (avgYield >= 4.5) return 'Rendemen sehat, di atas rata-rata pasar.'
  if (avgYield >= 3) return 'Cukup wajar — pertimbangkan negosiasi harga.'
  return 'Rendemen rendah — evaluasi kembali sebelum membeli.'
}

function normalizeRisk(level) {
  if (!level) return null
  const l = String(level).toLowerCase()
  if (l.includes('rendah') || l.includes('low')) return 'Rendah'
  if (l.includes('sedang') || l.includes('medium') || l.includes('moderat')) return 'Sedang'
  if (l.includes('tinggi') || l.includes('high')) return 'Tinggi'
  return null
}

const RISK_STYLES = {
  Rendah: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Sedang: 'bg-amber-50 text-amber-700 border-amber-200',
  Tinggi: 'bg-red-50 text-red-700 border-red-200',
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (value == null || value <= 0) { setDisplay(0); return }
    const start = performance.now()
    const duration = 800
    ref.current = requestAnimationFrame(function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    })
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])

  return <>{formatCurrency(display)}</>
}

function SectionLabel({ icon, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="text-brand-muted">{icon}</span>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">{children}</p>
    </div>
  )
}

function MetricCard({ icon, label, value, accent }) {
  const accentClass = accent === 'emerald'
    ? 'text-emerald-600'
    : accent === 'amber'
      ? 'text-amber-600'
      : accent === 'teal'
        ? 'text-teal-600'
        : 'text-brand-text'
  return (
    <div className="rounded-xl bg-white border border-brand-border p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={accentClass}>{icon}</span>
        <p className="text-[10px] font-medium uppercase tracking-wide text-brand-muted truncate">{label}</p>
      </div>
      <p className={`text-sm font-bold truncate ${accentClass}`}>{value}</p>
    </div>
  )
}

function Row({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className={`text-xs font-semibold text-right text-brand-text ${valueClass || ''}`}>{value}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-brand-border animate-pulse">
        <div className="w-28 h-28 rounded-full bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-2.5 w-24 rounded bg-slate-100" />
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="h-2.5 w-44 rounded bg-slate-100" />
          <div className="h-2.5 w-36 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[70px] rounded-xl bg-white border border-brand-border animate-pulse" />
        ))}
      </div>
      <div className="h-24 rounded-2xl bg-white border border-brand-border animate-pulse" />
    </div>
  )
}

async function fetchComparables(property) {
  if (!property?.id || !property?.price) return []
  try {
    const range = 0.3
    let query = supabase
      .from('properties')
      .select('title, price, category, property_type, city, district, bedrooms, bathrooms, area_sqm, certificate_status')
      .eq('status', 'verified')
      .neq('id', property.id)
      .gte('price', Math.max(0, property.price * (1 - range)))
      .lte('price', property.price * (1 + range))
    if (property.category) query = query.eq('category', property.category)
    if (property.city) query = query.ilike('city', `%${property.city}%`)
    const { data, error } = await query.limit(5)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export default function InvestmentAnalyzer({ property }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [targetYield, setTargetYield] = useState(6)
  const [horizonYears, setHorizonYears] = useState(10)
  const [intent, setIntent] = useState('rent')
  const [affordability, setAffordability] = useState(null)
  const cancelledRef = useRef(false)
  const cardRef = useRef(null)

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getFinancialProfile()
      .then(({ profile }) => {
        if (!cancelled) setAffordability(computeAffordability(profile))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const buyingPower = useMemo(() => {
    if (!affordability?.maxInstallment) return null
    return maxAffordablePrice(
      affordability.maxInstallment,
      BUYING_POWER_ASSUMPTION.interestRate,
      BUYING_POWER_ASSUMPTION.tenorYears,
      BUYING_POWER_ASSUMPTION.dpPercentage
    )
  }, [affordability])

  const buyingPowerPct = useMemo(() => {
    if (!buyingPower || buyingPower <= 0 || !property?.price) return null
    return Math.min(100, Math.round((property.price / buyingPower) * 100))
  }, [buyingPower, property])

  const avgYield = useMemo(() => extractYieldValue(analysis?.estimatedRentalYield), [analysis])
  const scoreMeta = useMemo(() => getScoreMeta(avgYield), [avgYield])

  const pricePerSqm = useMemo(() => {
    if (analysis?.pricePerSqm) return analysis.pricePerSqm
    if (property?.price && property?.area_sqm > 0) return Math.round(property.price / property.area_sqm)
    return null
  }, [analysis, property])

  const risk = useMemo(() => normalizeRisk(analysis?.riskLevel), [analysis])

  const comparableCount = useMemo(() => {
    if (analysis?.comparableCount != null) return analysis.comparableCount
    return null
  }, [analysis])

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const [comparables, { profile }] = await Promise.all([
        fetchComparables(property),
        getFinancialProfile().catch(() => ({ profile: null })),
      ])
      if (cancelledRef.current) return

      const payload = {
        model: ALLOWED_MODEL,
        purpose: 'investment',
        property: {
          id: property?.id || '',
          price: property?.price || 0,
          city: property?.city || '',
          property_type: property?.property_type || '',
          bedrooms: property?.bedrooms || 0,
          bathrooms: property?.bathrooms || 0,
          area_sqm: property?.area_sqm || property?.sqm || 0,
          address: property?.address || '',
          comparables,
        },
        financialProfile: profile
          ? {
              monthlyIncome: profile.monthly_income || 0,
              monthlyCommitments: profile.monthly_commitments || 0,
              monthlyBudget: profile.monthly_budget || 0,
              purchaseGoal: profile.purchase_goal || '',
            }
          : null,
        investmentGoals: {
          targetYield,
          horizonYears,
          intent,
        },
      }

      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (cancelledRef.current) return

      const data = await res.json()

      if (!res.ok) {
        const friendly = typeof data?.error === 'string' ? data.error : data?.error?.message
        setError(friendly || 'Gagal menganalisis properti')
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
        setError('Maaf, AI gagal merangkai format data dengan utuh karena antrean panjang. Silakan klik tombol analisis sekali lagi.')
        return
      }
      if (cancelledRef.current) return
      setAnalysis({ ...parsed, personalized: !!profile })
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Terjadi kesalahan. Coba lagi.')
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }

  const ringPct = avgYield != null ? Math.min(avgYield / 10, 1) : 0

  return (
    <div ref={cardRef} className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-text leading-tight">Analisis Prospek Investasi</h2>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <Sparkles size={11} />
              Ditenagai AI
            </div>
          </div>
        </div>
        {analysis && !loading && (
          <button
            type="button"
            onClick={handleAnalyze}
            title="Analisis ulang"
            className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-brand-border bg-white p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs font-bold text-brand-text">Preferensi Analisis</p>
          <p className="text-[10px] text-brand-muted">Hasil dinilai terhadap preferensi ini</p>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-brand-muted">Target rendemen sewa</p>
            <span className="text-xs font-bold text-emerald-600">{targetYield}%</span>
          </div>
          <input
            type="range"
            min="3"
            max="12"
            step="0.5"
            value={targetYield}
            onChange={(e) => setTargetYield(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-brand-border accent-emerald-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-brand-muted mt-1">
            <span>3%</span>
            <span>12%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <p className="text-[11px] font-semibold text-brand-muted mb-1.5">Horizon</p>
            <div className="flex gap-1.5">
              {HORIZON_OPTIONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setHorizonYears(y)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    horizonYears === y
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'bg-brand-bg border-brand-border text-brand-muted hover:border-emerald-300 hover:text-brand-text'
                  }`}
                >
                  {y} thn
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-brand-muted mb-1.5">Rencana</p>
            <div className="flex gap-1.5">
              {INTENT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setIntent(o.value)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    intent === o.value
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'bg-brand-bg border-brand-border text-brand-muted hover:border-emerald-300 hover:text-brand-text'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {!analysis && !loading && (
        <button
          type="button"
          onClick={handleAnalyze}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
        >
          <Sparkles size={16} />
          Analisis Prospek Investasi
        </button>
      )}

      {loading && !analysis && <SkeletonCard />}

      {loading && analysis && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-brand-muted" />
          <span className="ml-2 text-sm text-brand-muted">Menganalisis ulang...</span>
        </div>
      )}

      {analysis && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-5 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-brand-border"
          >
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={scoreMeta.ringColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: ringPct }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 5px ${scoreMeta.ringColor}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xl font-extrabold leading-none" style={{ color: scoreMeta.ringColor }}>
                  {avgYield != null ? `${avgYield.toFixed(1)}%` : '?'}
                </span>
                <span className="text-[9px] text-brand-muted mt-0.5">skor</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-brand-muted">Skor Investasi</p>
              <p className="text-xl font-extrabold" style={{ color: scoreMeta.ringColor }}>{scoreMeta.label}</p>
              <p className="text-xs text-brand-muted leading-relaxed mt-1">{getScoreCaption(avgYield)}</p>
              {comparableCount != null && comparableCount > 0 && (
                <p className="text-[11px] text-brand-muted mt-1.5 flex items-center gap-1">
                  <Database size={11} className="shrink-0" />
                  Dianalisis dari {comparableCount} properti pembanding di area serupa
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <SectionLabel icon={<Wallet size={13} />}>Estimasi Finansial</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCard
                icon={<Percent size={12} />}
                label="Rendemen Sewa"
                accent="emerald"
                value={analysis.estimatedRentalYield || '-'}
              />
              <MetricCard
                icon={<Banknote size={12} />}
                label="Sewa / Bulan"
                accent="teal"
                value={analysis.monthlyRentalEstimate ? <CountUp value={analysis.monthlyRentalEstimate} /> : '-'}
              />
              <MetricCard
                icon={<Ruler size={12} />}
                label="Harga / m²"
                accent="emerald"
                value={pricePerSqm != null ? <CountUp value={pricePerSqm} /> : '-'}
              />
              <MetricCard
                icon={<Hourglass size={12} />}
                label="Break-even"
                accent={analysis.breakEvenYears != null ? 'amber' : ''}
                value={analysis.breakEvenYears != null ? `${Number(analysis.breakEvenYears).toFixed(1)} tahun` : '-'}
              />
            </div>
          </motion.div>

          {buyingPower != null && property?.price > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <SectionLabel icon={<Wallet size={13} />}>Daya Beli Kamu</SectionLabel>
              <div className="rounded-2xl bg-white border border-brand-border p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <p className="text-sm font-bold text-brand-text">Harga properti ini</p>
                  <p className="text-sm font-extrabold text-brand-text">{formatCurrency(property.price)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <p className="text-[11px] text-brand-muted">Estimasi daya beli (KPR {BUYING_POWER_ASSUMPTION.tenorYears} thn · {BUYING_POWER_ASSUMPTION.interestRate}% · DP {BUYING_POWER_ASSUMPTION.dpPercentage}%)</p>
                  <p className={`text-[11px] font-bold ${buyingPowerPct > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(buyingPower)}</p>
                </div>
                <div className="h-2 rounded-full bg-brand-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${buyingPowerPct > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(buyingPowerPct, 100)}%` }}
                  />
                </div>
                <p className={`text-[11px] mt-2 flex items-center gap-1 ${buyingPowerPct > 100 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {buyingPowerPct > 100 ? <AlertTriangle size={11} /> : <Check size={11} />}
                  {buyingPowerPct > 100
                    ? `Properti ini di sekitar ${buyingPowerPct}% dari daya beli kamu — cicilan akan melebihi batas ideal.`
                    : `Masih dalam jangkauan daya beli kamu (${buyingPowerPct}% dari batas maksimum).`}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <SectionLabel icon={<BarChart3 size={13} />}>Pasar &amp; Pertumbuhan</SectionLabel>
            <div className="rounded-xl bg-white border border-brand-border divide-y divide-brand-border/70">
              <Row
                label="Target Pasar Utama"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Target size={11} className="text-brand-muted shrink-0" />
                    {analysis.targetMarket || '-'}
                  </span>
                }
              />
              <Row
                label="Potensi Kenaikan Harga"
                value={
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight size={11} className="text-emerald-600 shrink-0" />
                    {analysis.appreciationPotential || '-'}
                  </span>
                }
              />
              <Row
                label="Tingkat Risiko"
                value={risk
                  ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${RISK_STYLES[risk] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    <span className="inline-flex items-center gap-1">
                      <Shield size={11} />
                      {risk}
                    </span>
                  </span>
                  : '-'}
              />
            </div>
          </motion.div>

          {analysis.goalFitScores?.overall != null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <SectionLabel icon={<Target size={13} />}>Kecocokan dengan Preferensi Kamu</SectionLabel>
              <div className="rounded-2xl bg-white border border-brand-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-brand-text">Skor keseluruhan</p>
                  <span className="text-lg font-extrabold" style={{ color: scoreColor(analysis.goalFitScores.overall) }}>
                    {analysis.goalFitScores.overall}/100
                  </span>
                </div>
                <div className="space-y-2.5">
                  {SCORE_LABELS.map(({ key, label }) => {
                    const val = analysis.goalFitScores[key]
                    if (val == null) return null
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-brand-muted">{label}</span>
                          <span className="text-[11px] font-bold text-brand-text">{val}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${val}%`, backgroundColor: scoreColor(val) }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-brand-muted/70 mt-3 flex items-start gap-1">
                  <Info size={11} className="shrink-0 mt-0.5" />
                  Dinilai terhadap: target yield {targetYield}% · horizon {horizonYears} thn · {INTENT_LABELS[intent]}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white border border-emerald-100"
          >
            <Sparkles size={72} className="absolute -top-4 -right-4 text-emerald-100" />
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-600" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Kesimpulan Analis</p>
              </div>
              {analysis.personalized ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 border border-emerald-600/20 text-[10px] font-bold whitespace-nowrap">
                  <User size={10} />
                  Dipersonalisasi
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-financial-profile'))}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 text-brand-muted border border-brand-border text-[10px] font-semibold hover:border-emerald-300 hover:text-emerald-700 transition-colors whitespace-nowrap"
                  title="Analisis ini belum memakai profil keuangan kamu"
                >
                  <User size={10} />
                  Analisis generik
                </button>
              )}
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed relative">{analysis.verdict || '-'}</p>
          </motion.div>

          <p className="text-[10px] text-brand-muted/70 text-center leading-relaxed pt-1 flex items-start justify-center gap-1">
            <Info size={11} className="shrink-0 mt-0.5" />
            Analisis indikatif berbasis AI dan data pasar pembanding, bukan jaminan hasil aktual. Verifikasi dengan konsultan properti sebelum mengambil keputusan.
          </p>
        </motion.div>
      )}
    </div>
  )
}
