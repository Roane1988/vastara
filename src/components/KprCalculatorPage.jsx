import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, MessageCircle, Bot, ChevronDown, Plus, Wallet, Check, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatShort } from '../utils/format'
import useSEO from '../hooks/useSEO'
import FinancialProfileForm from './FinancialProfileForm'
import { getFinancialProfile, computeAffordability, maxAffordablePrice, TENOR_OPTIONS } from '../utils/financialProfile'
import InfoTooltip from './InfoTooltip'

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

const PRICE_MIN = 10_000_000
const PRICE_MAX = 100_000_000_000
const INTEREST_MAX = 30
const DP_MIN_PCT = 10

export default function KprCalculatorPage() {
  useSEO({ title: 'Kalkulator KPR — Simulasi Kredit Pemilikan Rumah', description: 'Hitung cicilan KPR bulanan dengan simulasi DP, suku bunga, dan tenor. Cek kemampuan finansial Anda sebelum membeli properti.' })
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
    if (!Number.isFinite(factor)) return principal / numMonths
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

  const amortizationSchedule = useMemo(() => {
    if (principal <= 0 || monthlyInstallment === 0) return []
    const monthlyRate = (interestRate / 100) / 12
    const schedule = []
    let balance = principal
    const annualPayment = monthlyInstallment * 12
    for (let year = 1; year <= tenorYears; year++) {
      let totalInterestYear = 0
      for (let m = 0; m < 12; m++) {
        const interestMonth = balance * monthlyRate
        totalInterestYear += interestMonth
        const principalMonth = monthlyInstallment - interestMonth
        balance = Math.max(0, balance - principalMonth)
      }
      schedule.push({
        year,
        beginningBalance: year === 1 ? principal : schedule[year - 2].endingBalance,
        annualPayment,
        interestPaid: totalInterestYear,
        principalPaid: annualPayment - totalInterestYear,
        endingBalance: balance,
      })
      if (balance <= 0) break
    }
    return schedule
  }, [principal, monthlyInstallment, interestRate, tenorYears])

  const additionalCosts = useMemo(() => {
    const bphtb = Math.max(0, propertyPrice - 60000000) * 0.05
    const ppn = propertyPrice * 0.11
    const notaris = Math.min(Math.max(propertyPrice * 0.01, 5000000), 15000000)
    const provisi = principal * 0.01
    return {
      bphtb,
      ppn,
      notaris,
      provisi,
      total: bphtb + ppn + notaris + provisi,
    }
  }, [propertyPrice, principal])

  const [showAmortisasi, setShowAmortisasi] = useState(false)
  const [showBiayaLain, setShowBiayaLain] = useState(false)
  const [warnings, setWarnings] = useState({ price: '', dp: '', interest: '' })

  const [financialProfile, setFinancialProfile] = useState(null)
  const affordability = useMemo(() => computeAffordability(financialProfile), [financialProfile])
  const withinLimit = affordability ? monthlyInstallment <= affordability.maxInstallment : true
  const limitPct =
    affordability && affordability.maxInstallment > 0
      ? Math.min(100, (monthlyInstallment / affordability.maxInstallment) * 100)
      : 0
  const affordablePrice = useMemo(() => {
    if (!affordability?.maxInstallment) return 0
    return maxAffordablePrice(affordability.maxInstallment, interestRate, tenorYears, dpPercentage)
  }, [affordability, interestRate, tenorYears, dpPercentage])

  useEffect(() => {
    let cancelled = false
    getFinancialProfile().then(({ profile }) => {
      if (!cancelled) setFinancialProfile(profile)
    })
    return () => { cancelled = true }
  }, [])

  const handleDpPercentageChange = (value) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0))
    setDpPercentage(pct)
    setDpAmountText('')
    setWarnings((w) => ({
      ...w,
      dp: pct > 0 && pct < DP_MIN_PCT ? 'DP umumnya minimal 10% dari harga properti.' : '',
    }))
  }

  const handleDpAmountChange = (raw) => {
    setDpAmountText(raw)
    const amount = Number(raw) || 0
    const capped = Math.min(propertyPrice, Math.max(0, amount))
    const pct = propertyPrice > 0 ? (capped / propertyPrice) * 100 : 0
    setDpPercentage(pct)
    setWarnings((w) => ({
      ...w,
      dp:
        amount > propertyPrice
          ? 'DP tidak boleh melebihi harga properti.'
          : pct > 0 && pct < DP_MIN_PCT
            ? 'DP umumnya minimal 10% dari harga properti.'
            : '',
    }))
  }

  const handleInterestChange = (value) => {
    let rate = Number(value) || 0
    if (rate > INTEREST_MAX) {
      rate = INTEREST_MAX
      setWarnings((w) => ({ ...w, interest: 'Suku bunga dibatasi maksimal 30% per tahun.' }))
    } else {
      setWarnings((w) => ({ ...w, interest: '' }))
    }
    setInterestRate(Math.max(0, rate))
  }

  const dpAmountDisplay = dpAmountText !== '' ? dpAmountText : dpAmount

  const handleHuniBotClick = () => {
    window.dispatchEvent(new CustomEvent('open-hunibot-with-context', {
      detail: {
        propertyPrice,
        dpAmount,
        dpPercentage,
        loanAmount: principal,
        monthlyInstallment,
        interestRate,
        tenorYears,
      }
    }))
  }

  const handleExplainClick = () => {
    window.dispatchEvent(new CustomEvent('open-hunibot-question', {
      detail: {
        question: 'Jelaskan secara sederhana apa itu KPR, DP, suku bunga, tenor, dan tabel amortisasi untuk pemula.',
      }
    }))
  }

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
          onClick={() => {
            if (window.history.length > 1) navigate(-1)
            else navigate('/')
          }}
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

        <div className="mb-6 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-text">Belum paham istilah KPR?</p>
            <p className="text-xs text-brand-muted mt-0.5">
              DP, suku bunga, tenor, hingga tabel amortisasi — HuniBot jelaskan dengan bahasa yang sederhana.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExplainClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.97] transition-all shrink-0"
          >
            <Bot size={16} />
            Tanya HuniBot
          </button>
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
                <label className="block text-sm font-semibold text-brand-text mb-1.5 flex items-center">
                  Harga Properti
                  <InfoTooltip text="Harga jual properti yang ingin kamu beli. Contoh: 800000000 untuk Rp800 juta." />
                </label>
                <input
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => {
                    let val = Number(e.target.value) || 0
                    if (val > PRICE_MAX) {
                      val = PRICE_MAX
                      setWarnings((w) => ({ ...w, price: 'Harga properti dibatasi maksimal Rp100 miliar.' }))
                    } else {
                      setWarnings((w) => ({
                        ...w,
                        price: val > 0 && val < PRICE_MIN ? 'Harga properti minimal Rp10 juta.' : '',
                      }))
                    }
                    setPropertyPrice(val >= 0 ? val : 0)
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                {warnings.price ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    {warnings.price}
                  </p>
                ) : (
                  <p className="text-xs text-brand-muted mt-1">
                    {formatCurrency(propertyPrice)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1.5 flex items-center">
                  Uang Muka (DP)
                  <InfoTooltip text="Uang muka yang dibayar di awal pembelian. Contoh: rumah Rp1 miliar dengan DP 20% berarti Rp200 juta. Sisanya (pokok) dibiayai bank." />
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
                {warnings.dp ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 mb-3">
                    <AlertTriangle size={12} className="shrink-0" />
                    {warnings.dp}
                  </p>
                ) : (
                  <p className="text-xs text-brand-muted mt-1 mb-3">
                    {formatCurrency(dpAmount)}
                  </p>
                )}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.min(dpPercentage, 100)}
                  onChange={(e) => handleDpPercentageChange(e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-brand-border accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-brand-muted mt-1.5">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1.5 flex items-center">
                  Suku Bunga (% per tahun)
                  <InfoTooltip text="Biaya pinjaman tahunan yang ditetapkan bank. Semakin tinggi, cicilan semakin besar. Saat ini kisaran KPR umumnya 5-8% per tahun." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={interestRate}
                    onChange={(e) => handleInterestChange(e.target.value)}
                    className="w-full px-4 py-2.5 pr-8 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
                    %
                  </span>
                </div>
                {warnings.interest && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    {warnings.interest}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1.5 flex items-center">
                  Jangka Waktu (Tenor)
                  <InfoTooltip text="Lama waktu pelunasan pinjaman. Tenor lebih panjang = cicilan lebih kecil, tetapi total bunga yang dibayar lebih besar." />
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

          <FinancialProfileForm onSaved={(data) => setFinancialProfile(data)} />

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
                <AnimatePresence mode="wait">
                  <motion.span
                    key={Math.round(monthlyInstallment)}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {principal > 0
                      ? formatCurrency(Math.round(monthlyInstallment))
                      : 'Lunas'}
                  </motion.span>
                </AnimatePresence>
              </p>
              <p className="text-xs text-brand-muted mt-2">
                Bunga {interestRate}% per tahun | Tenor {tenorYears} tahun
              </p>
              <p className="text-xs text-brand-muted mt-3 max-w-md mx-auto leading-relaxed">
                Ini perkiraan jumlah yang harus kamu bayar ke bank setiap bulan selama {tenorYears} tahun (pokok + bunga). Angka ini dapat berubah mengikuti kebijakan suku bunga bank.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
              <h3 className="text-base font-bold text-brand-text mb-4">
                Rincian Finansial
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-muted">DP ({Math.round(dpPercentage)}%)</span>
                    <span className="text-brand-muted">Pokok ({100 - Math.round(dpPercentage)}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-brand-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(dpPercentage, 100)}%` }}
                    />
                  </div>
                </div>
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

            {affordability && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Wallet size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-brand-text leading-tight">Kemampuan Finansial</h3>
                    <p className="text-[10px] text-brand-muted">Berdasarkan profil keuangan Anda</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Gaji bersih</span>
                    <span className="font-semibold text-brand-text">{formatShort(affordability.takeHome)}</span>
                  </div>
                  <div className="border-t border-brand-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Cicilan berjalan</span>
                    <span className="font-semibold text-brand-text">{formatShort(affordability.commitments)}</span>
                  </div>
                  <div className="border-t border-brand-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Batas ideal cicilan (30%)</span>
                    <span className="font-semibold text-emerald-600">{formatShort(affordability.maxInstallment)}</span>
                  </div>
                  <div className="border-t border-brand-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Estimasi harga properti terjangkau</span>
                    <span className="font-bold text-brand-primary">{formatShort(affordablePrice)}</span>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border p-4 transition-all ${
                  withinLimit
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-200'
                    : 'bg-gradient-to-br from-rose-50 to-amber-50/40 border-rose-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      withinLimit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {withinLimit ? <Check size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${withinLimit ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {withinLimit ? 'Cicilan masih dalam batas ideal' : 'Cicilan melebihi batas ideal'}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          withinLimit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {withinLimit ? 'Aman' : 'Perlu penyesuaian'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mt-2">
                        <p className="text-xl font-extrabold text-brand-text leading-none">
                          {formatShort(Math.round(monthlyInstallment))}
                        </p>
                        <p className="text-[11px] text-brand-muted">/bulan</p>
                      </div>
                      <p className="text-[11px] text-brand-muted mt-1">
                        Batas ideal kamu:{' '}
                        <span className="font-semibold text-brand-text">
                          {formatShort(affordability.maxInstallment)}/bln
                        </span>
                      </p>

                      <div className="mt-2.5 h-1.5 rounded-full bg-white border border-brand-border/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            withinLimit ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${limitPct}%` }}
                        />
                      </div>

                      {withinLimit && affordability.maxInstallment > 0 && (
                        <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
                          <Check size={11} />
                          Sisa ruang aman ±{formatShort(Math.round(affordability.maxInstallment - monthlyInstallment))}/bln
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {principal > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAmortisasi((prev) => !prev)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-brand-text">Tabel Amortisasi</h3>
                    <InfoTooltip text="Rincian penurunan utangmu setiap tahun: berapa bagian untuk bunga dan berapa bagian untuk melunasi pokok pinjaman." />
                    <span className="text-xs text-brand-muted font-normal">
                      ({amortizationSchedule.length} tahun)
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-brand-muted transition-transform duration-200 ${showAmortisasi ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {showAmortisasi && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-brand-border pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-brand-muted border-b border-brand-border">
                                <th className="text-left pb-2 font-medium">Tahun</th>
                                <th className="text-right pb-2 font-medium">Sisa Awal</th>
                                <th className="text-right pb-2 font-medium">Angsuran/thn</th>
                                <th className="text-right pb-2 font-medium">Bunga</th>
                                <th className="text-right pb-2 font-medium">Pokok</th>
                                <th className="text-right pb-2 font-medium">Sisa Akhir</th>
                              </tr>
                            </thead>
                            <tbody>
                              {amortizationSchedule.map((row) => (
                                <tr key={row.year} className="border-b border-brand-border/50 last:border-0">
                                  <td className="py-2 text-left font-semibold text-brand-text">{row.year}</td>
                                  <td className="py-2 text-right text-brand-muted">{formatShort(row.beginningBalance)}</td>
                                  <td className="py-2 text-right text-brand-muted">{formatShort(row.annualPayment)}</td>
                                  <td className="py-2 text-right text-orange-600">{formatShort(row.interestPaid)}</td>
                                  <td className="py-2 text-right text-green-600">{formatShort(row.principalPaid)}</td>
                                  <td className="py-2 text-right font-medium text-brand-text">{formatShort(row.endingBalance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBiayaLain((prev) => !prev)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-brand-muted" />
                  <h3 className="text-base font-bold text-brand-text">Estimasi Biaya Lainnya</h3>
                  <InfoTooltip text="Biaya tambahan di luar harga rumah dan DP, seperti pajak BPHTB, PPN, notaris, dan provisi bank. Umumnya perlu disiapkan di awal." />
                </div>
                <ChevronDown
                  size={18}
                  className={`text-brand-muted transition-transform duration-200 ${showBiayaLain ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {showBiayaLain && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-brand-border pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-brand-muted">BPHTB (5% × (harga − Rp60jt))</span>
                          <span className="text-sm font-semibold text-brand-text">{formatShort(additionalCosts.bphtb)}</span>
                        </div>
                        <div className="border-t border-brand-border/50" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-brand-muted">PPN 11% (properti baru)</span>
                          <span className="text-sm font-semibold text-brand-text">{formatShort(additionalCosts.ppn)}</span>
                        </div>
                        <div className="border-t border-brand-border/50" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-brand-muted">Notaris &amp; SKMHT</span>
                          <span className="text-sm font-semibold text-brand-text">{formatShort(additionalCosts.notaris)}</span>
                        </div>
                        <div className="border-t border-brand-border/50" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-brand-muted">Provisi Bank (1% × pokok)</span>
                          <span className="text-sm font-semibold text-brand-text">{formatShort(additionalCosts.provisi)}</span>
                        </div>
                        <div className="border-t border-brand-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-brand-text">Total Biaya Lainnya</span>
                          <span className="text-sm font-bold text-orange-600">{formatShort(additionalCosts.total)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-bold text-brand-text">Total Dana Awal Dibutuhkan</span>
                          <span className="text-sm font-extrabold text-brand-primary">{formatShort(dpAmount + additionalCosts.total)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.97] transition-all duration-200 shadow-sm"
              >
                <MessageCircle size={18} />
                Konsultasi via WhatsApp
              </a>
              <button
                type="button"
                onClick={handleHuniBotClick}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-all duration-200 shadow-sm"
              >
                <Bot size={18} />
                Konsultasi dengan HuniBot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
