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
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../utils/format'
import { getFinancialProfile } from '../utils/financialProfile'

const ALLOWED_MODEL = 'llama-3.3-70b-versatile'

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
    const { data, error } = await query.limit(8)
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
  const cancelledRef = useRef(false)
  const cardRef = useRef(null)

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

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
          title: property?.title || '',
          price: property?.price || 0,
          category: property?.category || '',
          property_type: property?.property_type || '',
          city: property?.city || '',
          district: property?.district || '',
          address: property?.address || '',
          bedrooms: property?.bedrooms || 0,
          bathrooms: property?.bathrooms || 0,
          area_sqm: property?.area_sqm || property?.sqm || 0,
          certificate_status: property?.certificate_status || '',
          created_at: property?.created_at || '',
          description: property?.description_id || property?.description || '',
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
      }

      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (cancelledRef.current) return

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error?.message || 'Gagal menganalisis properti')
        return
      }

      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) {
        setError('Respon AI kosong. Coba lagi.')
        return
      }

      const parsed = JSON.parse(cleanJson(rawContent))
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
