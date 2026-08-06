import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, SlidersHorizontal, MapPin, Trophy, Info, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'
import { formatPrice } from '../utils/format'
import { estimateMonthlyRent } from '../utils/financialProfile'

const PROPERTY_TYPES = [
  { value: 'all', label: 'Semua' },
  { value: 'Rumah', label: 'Rumah' },
  { value: 'Apartemen', label: 'Apartemen' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Tanah', label: 'Tanah' },
  { value: 'Kantor', label: 'Kantor' },
  { value: 'Ruko', label: 'Ruko' },
]

const CHART_METRICS = [
  { key: 'avgPrice', label: 'Rata-rata' },
  { key: 'medianPrice', label: 'Median' },
  { key: 'count', label: 'Jumlah' },
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

function TrendTooltip({ active, payload, metric }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  const value = row[metric]
  return (
    <div className="bg-white rounded-xl border border-brand-border shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-brand-text">{row.label}</p>
      {metric === 'count' ? (
        <p className="text-brand-muted mt-1">{value} listing</p>
      ) : (
        <p className="text-brand-muted mt-1">
          {formatPrice(value)} <span className="text-[10px]">{metric === 'avgPrice' ? 'rata-rata' : 'median'}</span>
        </p>
      )}
      <p className="text-brand-muted">{row.count} listing</p>
    </div>
  )
}

function MetricLegend({ value }) {
  return (
    <div className="bg-white rounded-xl border border-brand-border px-2.5 py-1 text-[11px] font-medium text-brand-muted">
      <span className="inline-block w-2 h-2 rounded-full bg-[#2E86DE] mr-1.5" />
      {value}
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
  const [chartMetric, setChartMetric] = useState('avgPrice')
  const [rankMode, setRankMode] = useState('highest')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, original_price, property_type, category, price_period, address, city, district, bedrooms, bathrooms, area_sqm, image_url, created_at')
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

  const normPrice = useMemo(() => (p) => {
    const price = Number(p?.price) || 0
    if (category !== 'Disewa' || price <= 0) return price
    return estimateMonthlyRent(p) || price
  }, [category])

  const summary = useMemo(() => {
    const prices = filtered.map(normPrice).filter(Boolean)
    const dropped = filtered.filter((p) => p.original_price && p.price && Number(p.original_price) > Number(p.price))
    return {
      count: filtered.length,
      avg: avg(prices),
      median: median(prices),
      min: prices.length ? Math.min(...prices) : 0,
      dropped,
    }
  }, [filtered, normPrice])

  const monthly = useMemo(() => {
    const map = new Map()
    filtered.forEach((p) => {
      const d = new Date(p.created_at)
      if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(normPrice(p))
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
          medianPrice: median(nums),
          count: nums.length,
        }
      })
    return rows
  }, [filtered, normPrice])

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
        const prices = list.map(normPrice).filter(Boolean)
        const recent = list.filter((p) => new Date(p.created_at).getTime() >= recentCut)
        const prior = list.filter((p) => {
          const t = new Date(p.created_at).getTime()
          return t >= priorCut && t < recentCut
        })
        const recentAvg = avg(recent.map(normPrice).filter(Boolean))
        const priorAvg = avg(prior.map(normPrice).filter(Boolean))
        const change = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null
        return {
          district,
          count: list.length,
          avgPrice: avg(prices),
          change,
          recentCount: recent.length,
          priorCount: prior.length,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [filtered, normPrice])

  const cityRanking = useMemo(() => {
    const map = new Map()
    properties.forEach((p) => {
      if (p.category !== category) return
      if (type !== 'all' && p.property_type !== type) return
      const key = normCity(p.city)
      const label = (p.city || 'Lainnya').trim()
      if (!map.has(key)) map.set(key, { label, prices: [] })
      map.get(key).prices.push(normPrice(p))
    })
    const rows = [...map.values()]
      .map((r) => {
        const nums = r.prices.filter(Boolean)
        return { label: r.label, count: nums.length, avgPrice: avg(nums) }
      })
      .filter((r) => r.count > 0 && r.avgPrice > 0)
    const max = Math.max(...rows.map((r) => r.avgPrice), 1)
    rows.forEach((r) => { r.barPct = Math.round((r.avgPrice / max) * 100) })
    rows.sort((a, b) => (rankMode === 'highest' ? b.avgPrice - a.avgPrice : a.avgPrice - b.avgPrice))
    return rows.slice(0, 6)
  }, [properties, category, type, rankMode, normPrice])

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
          <div className="text-center py-20">
            <TrendingUp size={40} className="mx-auto text-brand-muted/40 mb-3" />
            <p className="text-sm font-semibold text-brand-text">Belum ada data tren untuk filter ini</p>
            <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto leading-relaxed">
              Tren dihitung dari listing terverifikasi yang aktif. Ubah filter, atau tambah listing properti agar area kamu mulai punya data.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              <button type="button" onClick={() => { setCategory('Dijual'); setCity('all'); setType('all') }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all">
                Reset Filter
              </button>
              <button type="button" onClick={() => navigate('/sell-role')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-sm font-bold text-brand-text hover:bg-brand-highlight active:scale-[0.98] transition-all">
                <Plus size={15} />
                Iklankan Properti
              </button>
            </div>
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
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Harga Rata-rata{category === 'Disewa' ? ' (/bulan)' : ''}</p>
                <p className="text-xl font-extrabold text-brand-primary mt-1">{formatPrice(summary.avg)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border p-4">
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wide">Median{category === 'Disewa' ? ' (/bulan)' : ''}</p>
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
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                <div>
                  <h2 className="text-sm font-bold text-brand-text">Pergerakan Harga per Bulan</h2>
                  <p className="text-xs text-brand-muted mt-0.5">Rata-rata harga listing baru yang masuk setiap bulan</p>
                </div>
                <div className="flex rounded-xl bg-brand-bg border border-brand-border p-0.5 shrink-0">
                  {CHART_METRICS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setChartMetric(m.key)}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${
                        chartMetric === m.key ? 'bg-white text-brand-primary shadow-sm border border-brand-border' : 'text-brand-muted hover:text-brand-text'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <MetricLegend value={CHART_METRICS.find((m) => m.key === chartMetric)?.label} />
              {monthly.length > 0 ? (
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v) => chartMetric === 'count'
                          ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)
                          : formatPrice(v)}
                        width={64}
                      />
                      <Tooltip content={<TrendTooltip metric={chartMetric} />} />
                      <Area type="monotone" dataKey={chartMetric} name="value" stroke="#2E86DE" strokeWidth={2.5} fill="url(#trendFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-brand-muted py-10 text-center">Belum ada data rentang waktu yang cukup.</p>
              )}
            </div>

            {/* RANKING AREA */}
            {cityRanking.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-border p-4 sm:p-5 mb-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <h2 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                    <Trophy size={15} className="text-brand-accent" />
                    Ranking Kota
                  </h2>
                  <div className="flex rounded-xl bg-brand-bg border border-brand-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setRankMode('highest')}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${rankMode === 'highest' ? 'bg-white text-brand-primary shadow-sm border border-brand-border' : 'text-brand-muted hover:text-brand-text'}`}
                    >
                      Termahal
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankMode('lowest')}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${rankMode === 'lowest' ? 'bg-white text-brand-primary shadow-sm border border-brand-border' : 'text-brand-muted hover:text-brand-text'}`}
                    >
                      Termurah
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {cityRanking.map((r, i) => (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-brand-bg text-brand-muted border border-brand-border'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-brand-text truncate">{r.label}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-brand-muted">{r.count} listing</span>
                            <span className="text-sm font-bold text-brand-primary">{formatPrice(r.avgPrice)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-brand-bg mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-brand-accent'}`}
                            style={{ width: `${r.barPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABEL PER KECAMATAN */}
            {byDistrict.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-brand-border">
                  <h2 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                    <MapPin size={15} className="text-brand-accent" />
                    Perbandingan per Kecamatan
                  </h2>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {city === 'all' ? 'Semua kota' : city} · {category}{category === 'Disewa' ? ' (harga/bulan)' : ''} · {type === 'all' ? 'semua tipe' : type} · perubahan 60 hari terakhir vs 60 hari sebelumnya
                  </p>
                </div>
                <div className="divide-y divide-brand-border">
                  {byDistrict.map((d) => {
                    const lowSample = d.recentCount < 3 || d.priorCount < 3
                    return (
                      <div key={d.district} className="px-4 sm:px-5 py-3.5 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-brand-text truncate">{d.district}</p>
                          <p className="text-xs text-brand-muted">
                            {d.count} listing
                            {lowSample && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 ml-1.5" title="Sampel kecil: perbandingan bisa kurang representatif">
                                <Info size={10} />
                                sampel kecil ({d.recentCount} vs {d.priorCount} listing)
                              </span>
                            )}
                          </p>
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
                          {d.change === null && <p className="text-[11px] text-brand-muted">perbandingan baru dimulai</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
