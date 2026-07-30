import { useState, useEffect, useRef, useMemo } from 'react'
import { TrendingUp, Loader2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../utils/format'

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

function SkeletonCard() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded-full bg-gray-200" />
        </div>
      ))}
      <div className="py-4 px-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
        <div className="h-3 w-24 rounded bg-gray-200 mb-2" />
        <div className="h-4 w-full rounded bg-gray-200" />
      </div>
    </div>
  )
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

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const payload = {
        model: ALLOWED_MODEL,
        purpose: 'investment',
        property: {
          title: property?.title || '',
          price: property?.price || 0,
          property_type: property?.property_type || '',
          city: property?.city || '',
          bedrooms: property?.bedrooms || 0,
          bathrooms: property?.bathrooms || 0,
          area_sqm: property?.area_sqm || property?.sqm || 0,
          description: property?.description_id || property?.description || '',
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
      setAnalysis(parsed)
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Terjadi kesalahan. Coba lagi.')
      }
    }

    if (!cancelledRef.current) setLoading(false)
  }

  return (
    <div ref={cardRef} className="bg-brand-highlight/40 border border-brand-accent/30 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <TrendingUp size={18} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">Analisis Prospek Investasi AI</h2>
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
          className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <TrendingUp size={16} />
          Analisis Properti Ini
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
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white border border-brand-border">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={scoreMeta.ringColor} strokeWidth="3"
                  strokeDasharray={`${(avgYield != null ? Math.min(avgYield / 10, 1) : 0) * 97.4} 97.4`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: scoreMeta.ringColor }}>
                {avgYield != null ? `${avgYield.toFixed(1)}%` : '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted">Skor Investasi</p>
              <p className="text-sm font-bold" style={{ color: scoreMeta.ringColor }}>{scoreMeta.label}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Estimasi Yield Rental</span>
            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {analysis.estimatedRentalYield || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Potensi Sewa Bulanan</span>
            <span className="text-sm font-bold text-brand-text">
              {analysis.monthlyRentalEstimate ? <CountUp value={analysis.monthlyRentalEstimate} /> : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Target Pasar Utama</span>
            <span className="text-sm font-semibold text-brand-text text-right max-w-[60%]">
              {analysis.targetMarket || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Potensi Kenaikan Harga</span>
            <span className="text-sm font-semibold text-brand-text text-right max-w-[60%]">
              {analysis.appreciationPotential || '-'}
            </span>
          </div>

          <div className="py-4 px-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-800 mb-1">Kesimpulan Analis</p>
            <p className="text-sm text-emerald-900 leading-relaxed">
              {analysis.verdict || '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2 px-4 rounded-xl border border-brand-border text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
          >
            Analisis Ulang
          </button>

          <p className="text-[10px] text-brand-muted/60 text-center leading-relaxed">
            Analisis ini bersifat indikatif dan tidak menjamin hasil aktual. Data diproses oleh AI dan sebaiknya diverifikasi dengan konsultan properti.
          </p>
        </div>
      )}
    </div>
  )
}
