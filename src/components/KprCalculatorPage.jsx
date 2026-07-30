import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, ChevronLeft, MessageCircle } from 'lucide-react'

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

function formatShort(value) {
  if (value == null || isNaN(value)) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return formatCurrency(value)
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export default function KprCalculatorPage() {
  const navigate = useNavigate()

  const [propertyPrice, setPropertyPrice] = useState(1000000000)
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
    return (principal * monthlyRate * factor) / (factor - 1)
  }, [principal, interestRate, tenorYears])

  const totalPayment = useMemo(
    () => monthlyInstallment * tenorYears * 12,
    [monthlyInstallment, tenorYears]
  )

  const totalInterest = useMemo(
    () => Math.max(0, totalPayment - principal),
    [totalPayment, principal]
  )

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

  const waNumber = '6281234567890'
  const waMessage = encodeURIComponent(
    `Halo, saya ingin konsultasi KPR dengan detail:\n\n` +
    `Harga Properti: ${formatCurrency(propertyPrice)}\n` +
    `Uang Muka (DP): ${formatCurrency(dpAmount)} (${Math.round(dpPercentage)}%)\n` +
    `Pokok Pinjaman: ${formatCurrency(principal)}\n` +
    `Bunga: ${interestRate}% per tahun\n` +
    `Tenor: ${tenorYears} tahun\n` +
    `Estimasi Cicilan: ${formatCurrency(Math.round(monthlyInstallment))}/bulan`
  )
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors mb-4"
        >
          <ArrowLeftIcon />
          Kembali
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-text">
            Simulasi KPR
          </h1>
          <p className="text-sm sm:text-base text-brand-muted mt-2 max-w-xl mx-auto">
            Cek estimasi pembiayaan kredit rumah dengan kalkulator KPR HuniOne
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calculator size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-brand-text">Parameter KPR</h2>
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
                  max="80"
                  step="1"
                  value={Math.min(dpPercentage, 80)}
                  onChange={(e) => handleDpPercentageChange(e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-brand-border accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-brand-muted mt-1.5">
                  <span>0%</span>
                  <span>80%</span>
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
                  Jangka Waktu (Tenor)
                </label>
                <select
                  value={tenorYears}
                  onChange={(e) => setTenorYears(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%272%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
                >
                  {TENOR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y} Tahun ({y * 12} Bulan)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-2xl p-6 sm:p-7 text-center border ${
              principal > 0
                ? 'bg-blue-50 border-blue-100'
                : 'bg-green-50 border-green-100'
            }`}>
              <p className="text-sm font-medium text-brand-muted">
                Estimasi Cicilan per Bulan
              </p>
              <p className={`text-3xl sm:text-4xl font-extrabold mt-2 ${
                principal > 0 ? 'text-blue-900' : 'text-green-800'
              }`}>
                {principal > 0
                  ? formatCurrency(Math.round(monthlyInstallment))
                  : 'Lunas'}
              </p>
              <p className="text-xs text-brand-muted mt-2">
                Bunga {interestRate}% per tahun | Tenor {tenorYears} tahun
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
              <h3 className="text-base font-bold text-brand-text mb-4">
                Rincian Finansial
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-muted">Harga Properti</span>
                  <span className="text-sm font-semibold text-brand-text">
                    {formatShort(propertyPrice)}
                  </span>
                </div>
                <div className="border-t border-brand-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-muted">Uang Muka (DP)</span>
                  <span className="text-sm font-semibold text-brand-text">
                    {formatShort(dpAmount)}
                  </span>
                </div>
                <div className="border-t border-brand-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-muted">Total Pinjaman (Pokok)</span>
                  <span className="text-sm font-bold text-brand-text">
                    {formatShort(principal)}
                  </span>
                </div>
                <div className="border-t border-brand-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-muted">Total Bunga ({tenorYears} thn)</span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatShort(totalInterest)}
                  </span>
                </div>
                <div className="border-t border-brand-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-muted">Total Pembayaran</span>
                  <span className="text-sm font-bold text-brand-text">
                    {formatShort(totalPayment)}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.97] transition-all duration-200 shadow-sm"
            >
              <MessageCircle size={18} />
              Konsultasi via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
