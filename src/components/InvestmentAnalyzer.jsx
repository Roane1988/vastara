import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { formatCurrency } from '../utils/format'

const ALLOWED_MODEL = 'llama-3.3-70b-versatile'

function cleanJson(raw) {
  return raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
}

export default function InvestmentAnalyzer({ property }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

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
          price: property?.price || 0,
          property_type: property?.property_type || '',
          city: property?.city || '',
          bedrooms: property?.bedrooms || 0,
          bathrooms: property?.bathrooms || 0,
          area_sqm: property?.area_sqm || property?.sqm || 0,
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
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Terjadi kesalahan. Coba lagi.')
      }
    }

    if (!cancelledRef.current) setLoading(false)
  }

  return (
    <div className="bg-brand-highlight/40 border border-brand-accent/30 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <TrendingUp size={18} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">Analisis Prospek Investasi AI</h2>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!analysis && (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <TrendingUp size={16} />
              Analisis Properti Ini
            </>
          )}
        </button>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Estimasi Yield Rental</span>
            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {analysis.estimatedRentalYield || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-brand-border">
            <span className="text-sm text-brand-muted">Potensi Sewa Bulanan</span>
            <span className="text-sm font-bold text-brand-text">
              {analysis.monthlyRentalEstimate ? formatCurrency(analysis.monthlyRentalEstimate) : '-'}
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
            {loading ? 'Menganalisis ulang...' : 'Analisis Ulang'}
          </button>
        </div>
      )}
    </div>
  )
}
