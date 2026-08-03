import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, SlidersHorizontal, MapPin } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'
import { formatPrice } from '../utils/format'

const PROPERTY_TYPES = [
  { value: 'all', label: 'Semua' },
  { value: 'Rumah', label: 'Rumah' },
  { value: 'Apartemen', label: 'Apartemen' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Tanah', label: 'Tanah' },
  { value: 'Kantor', label: 'Kantor' },
  { value: 'Ruko', label: 'Ruko' },
]

const MONTH_FMT = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' })

const NOW_MS = Date.now()
const RECENT_CUT = NOW_MS - 60 * 24 * 60 * 60 * 1000
const PRIOR_CUT = NOW_MS - 120 * 24 * 60 * 60 * 1000

function normCity(c) {
  return String(c || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function avg(nums) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function median(nums) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function PriceTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="bg-white rounded-xl border border-brand-border shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-brand-text">{row.label}</p>
      <p className="text-brand-muted mt-1">{formatPrice(row.avgPrice)} <span className="text-[10px]">rata-rata</span></p>
      {row.count > 0 && <p className="text-brand-muted">{row.count} listing</p>}
    </div>
  )
}

export default function PriceTrendPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Dijual')
  const [city, setCity] = useState('all')
  const [type, setType] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, original_price, property_type, category, address, city, district, bedrooms, bathrooms, area_sqm, image_url, created_at')
          .eq('status', 'verified')
          .neq('price_change_status', 'pending')
          .order('created_at', { ascending: false })
        if (cancelled) return
        if (error) throw error
        setProperties(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) console.warn('Gagal memuat data tren:', err.message)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const cities = useMemo(() => {
    const map = new Map()
    properties.forEach((p) => {
      if (!p.city) return
      const key = normCity(p.city)
      const label = p.city.trim()
      if (!map.has(key)) map.set(key, label)
    })
    return [...map.values()].sort()
  }, [properties])

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (p.category !== category) return false
      if (city !== 'all' && normCity(p.city) !== normCity(city)) return false
      if (type !== 'all' && p.property_type !== type) return false
      return true
    })
  }, [properties, category, city, type])

  const summary = useMemo(() => {
    const prices = filtered.map((p) => Number(p.price) || 0).filter(Boolean)
    const dropped = filtered.filter((p) => p.original_price && p.price && Number(p.original_price) > Number(p.price))
    return {
      count: filtered.length,
      avg: avg(prices),
      median: median(prices),
      min: prices.length ? Math.min(...prices) : 0,
      dropped,
    }
  }, [filtered])

  const monthly = useMemo(() => {
    const map = new Map()
    filtered.forEach((p) => {
      const d = new Date(p.created_at)
      if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(Number(p.price) || 0)
    })
    const rows = [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, prices]) => {
        const nums = prices.filter(Boolean)
        const [y, m] = key.split('-').map(Number)
        const date = new Date(y, m - 1, 1)
        return {
          key,
          label: MONTH_FMT.format(date),
          avgPrice: avg(nums),
          count: nums.length,
        }
      })
    return rows
  }, [filtered])

  const byDistrict = useMemo(() => {
    const recentCut = RECENT_CUT
    const priorCut = PRIOR_CUT
    const map = new Map()
    filtered.forEach((p) => {
      const key = (p.district || 'Lainnya').trim()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(p)
    })
    return [...map.entries()]
      .map(([district, list]) => {
        const prices = list.map((p) => Number(p.price) || 0).filter(Boolean)
        const recent = list.filter((p) => new Date(p.created_at).getTime() >= recentCut)
        const prior = list.filter((p) => {
          const t = new Date(p.created_at).getTime()
          return t >= priorCut && t < recentCut
        })
        const recentAvg = avg(recent.map((p) => Number(p.price) || 0).filter(Boolean))
        const priorAvg = avg(prior.map((p) => Number(p.price) || 0).filter(Boolean))
        const change = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null
        return {
          district,
          count: list.length,
          avgPrice: avg(prices),
          change,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [filtered])

  const hasArea = filtered.length > 0

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" aria-label="Kembali" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-brand-text flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-accent" />
              Tren Harga
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              {loading ? 'Memuat…' : `${filtered.length} listing di area terpilih`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasArea ? (
          <div className="text-center py-24">
            <TrendingUp size={40} className="mx-auto text-brand-muted/40 mb-3" />
            <p className="text-sm font-semibold text-brand-text">Belum ada data tren untuk filter ini</p>
            <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">
              Data tren dihitung dari listing terverifikasi. Tambahkan lebih banyak properti untuk melihat pergerakannya.
            </p>
            <button type="button" onClick={() => navigate('/explore')} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all">
              Jelajahi Semua Properti
            </button>
          </div>
        ) : (
          <>
            {/* KONTROL */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-wrap gap-2">
                {['Dijual', 'Disewa'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      category === c ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-muted border border-brand-border hover:text-brand-text'
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                  <SlidersHorizontal size={15} className="text-brand-muted shrink-0" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl bg-brand-surface border border-brand-border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  >
                    <option value="all">Semua Kota</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                      type === t.value
                        ? 'bg-brand-accent text-white border-brand-accent'
                        : 'bg-brand-surface text-brand-muted border-brand-border hover:text-brand-text'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* RINGKASAN */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-brand-border p-4">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Listing</p>
                <p className="text-xl font-extrabold text-brand-text mt-1">{summary.count}</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border p-4">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Harga Rata-rata</p>
                <p className="text-xl font-extrabold text-brand-primary mt-1">{formatPrice(summary.avg)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border p-4">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Median</p>
                <p className="text-xl font-extrabold text-brand-text mt-1">{formatPrice(summary.median)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border p-4">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Turun Harga</p>
                <p className={`text-xl font-extrabold mt-1 flex items-center gap-1 ${summary.dropped.length ? 'text-red-600' : 'text-brand-text'}`}>
                  <TrendingDown size={16} />
                  {summary.dropped.length}
                </p>
              </div>
            </div>

            {/* GRAFIK */}
            <div className="bg-white rounded-2xl border border-brand-border p-4 sm:p-5 mb-6">
              <h2 className="text-sm font-bold text-brand-text mb-1">Pergerakan Harga per Bulan</h2>
              <p className="text-xs text-brand-muted mb-4">Rata-rata harga listing baru yang masuk setiap bulan</p>
              {monthly.length > 0 ? (
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="avgPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2E86DE" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#2E86DE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatPrice(v)}
                        width={64}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Area type="monotone" dataKey="avgPrice" name="Rata-rata" stroke="#2E86DE" strokeWidth={2.5} fill="url(#avgPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-brand-muted py-10 text-center">Belum ada data rentang waktu yang cukup.</p>
              )}
            </div>

            {/* TABEL PER KECAMATAN */}
            {byDistrict.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-brand-border">
                  <h2 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                    <MapPin size={15} className="text-brand-accent" />
                    Perbandingan per Kecamatan
                  </h2>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {city === 'all' ? 'Semua kota' : city} · {category} · {type === 'all' ? 'semua tipe' : type}
                  </p>
                </div>
                <div className="divide-y divide-brand-border">
                  {byDistrict.map((d) => (
                    <div key={d.district} className="px-4 sm:px-5 py-3.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-brand-text truncate">{d.district}</p>
                        <p className="text-xs text-brand-muted">{d.count} listing</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-brand-primary">{formatPrice(d.avgPrice)}</p>
                        {d.change !== null && d.change !== 0 && (
                          <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${d.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {d.change > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {d.change > 0 ? '+' : ''}{d.change.toFixed(1)}%
                          </p>
                        )}
                        {d.change === 0 && <p className="text-[11px] text-brand-muted">±0%</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
