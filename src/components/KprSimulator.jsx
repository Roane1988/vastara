import { useState, useMemo } from 'react'
import { Calculator } from 'lucide-react'

const TENOR_OPTIONS = [5, 10, 15, 20, 25]

function formatCurrency(value) {
  if (value == null || isNaN(value) || !Number.isFinite(value)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function KprSimulator({ initialPrice = 900000000 }) {
  const [propertyPrice, setPropertyPrice] = useState(initialPrice)
  const [dpPercentage, setDpPercentage] = useState(20)
  const [dpAmountText, setDpAmountText] = useState('')
  const [interestRate, setInterestRate] = useState(5.5)
  const [tenorYears, setTenorYears] = useState(15)

  const dpAmount = useMemo(
    () => Math.round(propertyPrice * dpPercentage / 100),
    [propertyPrice, dpPercentage]
  )

  const principal = useMemo(
    () => Math.max(0, propertyPrice - dpAmount),
    [propertyPrice, dpAmount]
  )

  const monthlyInstallment = useMemo(() => {
    if (principal <= 0) return 0
    const monthlyRate = (interestRate / 100) / 12
    const numMonths = tenorYears * 12
    if (monthlyRate === 0) {
      return numMonths > 0 ? principal / numMonths : 0
    }
    const factor = Math.pow(1 + monthlyRate, numMonths)
    if (!Number.isFinite(factor)) return principal / numMonths
    return (principal * monthlyRate * factor) / (factor - 1)
  }, [principal, interestRate, tenorYears])

  const handleDpPercentageChange = (value) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0))
    setDpPercentage(pct)
    setDpAmountText('')
  }

  const handleDpAmountChange = (raw) => {
    setDpAmountText(raw)
    const amount = Number(raw) || 0
    const capped = Math.min(propertyPrice, Math.max(0, amount))
    const pct = propertyPrice > 0 ? (capped / propertyPrice) * 100 : 0
    setDpPercentage(pct)
  }

  const dpAmountDisplay = dpAmountText !== '' ? dpAmountText : dpAmount

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Calculator size={18} className="text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">Simulasi KPR</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-brand-text mb-1.5">
            Harga Properti
          </label>
          <input
            type="number"
            value={propertyPrice}
            onChange={(e) => {
              const val = Number(e.target.value) || 0
              setPropertyPrice(val >= 0 ? val : 0)
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          <p className="text-xs text-brand-muted mt-1">
            {formatCurrency(propertyPrice)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-text mb-1.5">
            Uang Muka (DP)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(dpPercentage)}
                  onChange={(e) => handleDpPercentageChange(e.target.value)}
                  className="w-full px-4 py-2.5 pr-8 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
                  %
                </span>
              </div>
            </div>
            <div>
              <input
                type="number"
                min="0"
                value={dpAmountDisplay}
                onChange={(e) => handleDpAmountChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-brand-muted mt-1 mb-3">
            {formatCurrency(dpAmount)}
          </p>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={Math.min(dpPercentage, 50)}
            onChange={(e) => handleDpPercentageChange(e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-brand-border accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-brand-muted mt-1.5">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-text mb-1.5">
            Suku Bunga (% per tahun)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
              className="w-full px-4 py-2.5 pr-8 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
              %
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-text mb-1.5">
            Lama Pinjaman
          </label>
          <select
            value={tenorYears}
            onChange={(e) => setTenorYears(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%272%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
          >
            {TENOR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y} Tahun
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`mt-6 rounded-xl p-5 text-center border transition-all ${
        principal > 0
          ? 'bg-blue-50 border-blue-100'
          : 'bg-green-50 border-green-100'
      }`}>
        <p className="text-sm font-medium text-brand-muted">
          Estimasi Cicilan per Bulan
        </p>
        <p className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
          principal > 0 ? 'text-blue-900' : 'text-green-800'
        }`}>
          {principal > 0
            ? formatCurrency(Math.round(monthlyInstallment))
            : 'Lunas'}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-brand-muted">
          <span>
            Pokok:{' '}
            <span className="font-semibold text-brand-text">
              {formatCurrency(principal)}
            </span>
          </span>
          <span className="text-brand-border">|</span>
          <span>
            Tenor:{' '}
            <span className="font-semibold text-brand-text">
              {tenorYears} Thn
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
