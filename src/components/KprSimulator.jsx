import { useState, useMemo, useEffect } from 'react'
import { Calculator, Check, AlertTriangle, Wallet, ArrowRight, TrendingDown, TrendingUp, MessageCircle, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getFinancialProfile,
  computeAffordability,
  estimateMonthlyInstallment,
  BUYING_POWER_ASSUMPTION,
  TENOR_OPTIONS,
} from '../utils/financialProfile'
import { formatCurrency } from '../utils/format'
import InfoTooltip from './InfoTooltip'
import CountUp from './CountUp'

const DP_PRESETS = [10, 20, 30, 50]
const TENOR_PRESETS = [10, 15, 20, 25]
const PRICE_MIN = 10_000_000
const PRICE_MAX = 100_000_000_000
const INTEREST_MAX = 30
const DP_MIN_PCT = 10

export default function KprSimulator({ initialPrice = 900000000 }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [propertyPrice, setPropertyPrice] = useState(initialPrice)
  const [dpPercentage, setDpPercentage] = useState(BUYING_POWER_ASSUMPTION.dpPercentage)
  const [dpAmountText, setDpAmountText] = useState('')
  const [interestRate, setInterestRate] = useState(BUYING_POWER_ASSUMPTION.interestRate)
  const [tenorYears, setTenorYears] = useState(BUYING_POWER_ASSUMPTION.tenorYears)

  const [financialProfile, setFinancialProfile] = useState(null)
  const [warnings, setWarnings] = useState({ price: '', dp: '', interest: '' })
  const affordability = useMemo(() => computeAffordability(financialProfile), [financialProfile])

  useEffect(() => {
    let cancelled = false
    getFinancialProfile().then(({ profile }) => {
      if (!cancelled) setFinancialProfile(profile)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const dpAmount = useMemo(
    () => Math.round(propertyPrice * dpPercentage / 100),
    [propertyPrice, dpPercentage]
  )

  const principal = useMemo(
    () => Math.max(0, propertyPrice - dpAmount),
    [propertyPrice, dpAmount]
  )

  const monthlyInstallment = useMemo(
    () => estimateMonthlyInstallment(propertyPrice, interestRate, tenorYears, dpPercentage),
    [propertyPrice, interestRate, tenorYears, dpPercentage]
  )

  const totalPayment = useMemo(
    () => monthlyInstallment * tenorYears * 12,
    [monthlyInstallment, tenorYears]
  )

  const totalInterest = useMemo(
    () => Math.max(0, totalPayment - principal),
    [totalPayment, principal]
  )

  const minIncome = useMemo(
    () => (monthlyInstallment > 0 ? monthlyInstallment / 0.3 : 0),
    [monthlyInstallment]
  )

  const handleDpPercentageChange = (value) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0))
    setDpPercentage(pct)
    setDpAmountText('')
    setWarnings((w) => ({
      ...w,
      dp: pct > 0 && pct < DP_MIN_PCT ? t('kpr.dp_min_warning') : '',
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
          ? t('kpr.dp_max_warning')
          : pct > 0 && pct < DP_MIN_PCT
            ? t('kpr.dp_min_warning')
            : '',
    }))
  }

  const handleInterestChange = (value) => {
    let rate = Number(value) || 0
    if (rate > INTEREST_MAX) {
      rate = INTEREST_MAX
      setWarnings((w) => ({ ...w, interest: t('kpr.interest_max_warning') }))
    } else {
      setWarnings((w) => ({ ...w, interest: '' }))
    }
    setInterestRate(Math.max(0, rate))
  }

  const dpAmountDisplay = dpAmountText !== '' ? dpAmountText : dpAmount

  const withinLimit = affordability ? monthlyInstallment <= affordability.maxInstallment : true
  const limitPct =
    affordability && affordability.maxInstallment > 0
      ? Math.min(100, (monthlyInstallment / affordability.maxInstallment) * 100)
      : 0

  const handleExplainClick = () => {
    window.dispatchEvent(new CustomEvent('open-hunibot-question', {
      detail: {
        question: t('kpr.hunibot_question', {
          price: formatCurrency(propertyPrice),
          dp: formatCurrency(dpAmount),
          rate: interestRate,
          tenor: tenorYears,
          installment: formatCurrency(Math.round(monthlyInstallment)),
        }),
      }
    }))
  }

  const waLink = `https://wa.me/6281234567890?text=${encodeURIComponent(
    t('kpr.wa_message', {
      price: formatCurrency(propertyPrice),
      dp: formatCurrency(dpAmount),
      dpPct: Math.round(dpPercentage),
      principal: formatCurrency(principal),
      rate: interestRate,
      tenor: tenorYears,
      installment: formatCurrency(Math.round(monthlyInstallment)),
    })
  )}`

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Calculator size={18} className="text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">{t('kpr.title')}</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-brand-text mb-1.5 flex items-center">
            {t('kpr.price_label')}
            <InfoTooltip text={t('kpr.price_tooltip')} />
          </label>
          <input
            type="number"
            value={propertyPrice}
            onChange={(e) => {
              let val = Number(e.target.value) || 0
              if (val > PRICE_MAX) {
                val = PRICE_MAX
                setWarnings((w) => ({ ...w, price: t('kpr.price_max_warning') }))
              } else {
                setWarnings((w) => ({
                  ...w,
                  price: val > 0 && val < PRICE_MIN ? t('kpr.price_min_warning') : '',
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
            {t('kpr.dp_label')}
            <InfoTooltip text={t('kpr.dp_tooltip')} />
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
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle size={12} className="shrink-0" />
              {warnings.dp}
            </p>
          ) : (
            <p className="text-xs text-brand-muted mt-1">
              {formatCurrency(dpAmount)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-3">
            {DP_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleDpPercentageChange(pct)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-[0.98] ${
                  Math.round(dpPercentage) === pct
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-brand-muted border-brand-border hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {t('kpr.dp_preset', { pct })}
              </button>
            ))}
          </div>
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
            {t('kpr.interest_label')}
            <InfoTooltip text={t('kpr.interest_tooltip')} />
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
            {t('kpr.tenor_label')}
            <InfoTooltip text={t('kpr.tenor_tooltip')} />
          </label>
          <select
            value={tenorYears}
            onChange={(e) => setTenorYears(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20fill%3D%27none%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%272%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
          >
            {TENOR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {t('kpr.year_option', { years: y })}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {TENOR_PRESETS.map((years) => (
              <button
                key={years}
                type="button"
                onClick={() => setTenorYears(years)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-[0.98] ${
                  tenorYears === years
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-brand-muted border-brand-border hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {t('kpr.tenor_preset', { years })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-6 rounded-xl p-5 text-center border transition-all ${
        principal > 0
          ? 'bg-blue-50 border-blue-100'
          : 'bg-green-50 border-green-100'
      }`}>
        <p className="text-sm font-medium text-brand-muted">
          {t('kpr.monthly_est')}
        </p>
        <p className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
          principal > 0 ? 'text-blue-900' : 'text-green-800'
        }`}>
          {principal > 0
            ? <CountUp value={monthlyInstallment} />
            : t('kpr.lunas')}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-brand-muted">
          <span>
            {t('kpr.principal')}:{' '}
            <span className="font-semibold text-brand-text">
              {formatCurrency(principal)}
            </span>
          </span>
          <span className="text-brand-border">|</span>
          <span>
            {t('kpr.tenor')}:{' '}
            <span className="font-semibold text-brand-text">
              {t('kpr.year_short', { years: tenorYears })}
            </span>
          </span>
        </div>
        <p className="text-xs text-brand-muted mt-3 leading-relaxed">
          {t('kpr.monthly_note', { tenor: tenorYears })}
        </p>
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-brand-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Wallet size={18} className="text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-brand-text">{t('kpr.summary_title')}</h3>
          <InfoTooltip text={t('kpr.summary_tooltip')} />
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-brand-muted">{t('kpr.summary_dp')}</span>
            <span className="font-semibold text-brand-text">{formatCurrency(dpAmount)}</span>
          </div>
          <div className="border-t border-brand-border/50" />
          <div className="flex items-center justify-between">
            <span className="text-brand-muted">{t('kpr.summary_principal')}</span>
            <span className="font-semibold text-brand-text">{formatCurrency(principal)}</span>
          </div>
          <div className="border-t border-brand-border/50" />
          <div className="flex items-center justify-between">
            <span className="text-brand-muted">{t('kpr.summary_interest', { tenor: tenorYears })}</span>
            <span className="font-semibold text-orange-600">{formatCurrency(totalInterest)}</span>
          </div>
          <div className="border-t border-brand-border/50" />
          <div className="flex items-center justify-between">
            <span className="text-brand-muted">{t('kpr.summary_total')}</span>
            <span className="font-bold text-brand-text">{formatCurrency(totalPayment)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-200 p-3 flex items-start gap-2.5">
          <TrendingUp size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-800">{t('kpr.min_income')}</p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">{t('kpr.min_income_note')}</p>
            <p className="text-lg font-extrabold text-amber-800 mt-1">{formatCurrency(Math.round(minIncome))}</p>
          </div>
        </div>
      </div>

      {affordability && (
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
                  {withinLimit ? t('kpr.within_limit') : t('kpr.over_limit')}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  withinLimit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {withinLimit ? t('kpr.safe') : t('kpr.adjust')}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mt-2">
                <p className="text-xl font-extrabold text-brand-text leading-none">
                  {formatCurrency(Math.round(monthlyInstallment))}
                </p>
                <p className="text-[11px] text-brand-muted">{t('kpr.per_month')}</p>
              </div>
              <p className="text-[11px] text-brand-muted mt-1">
                {t('kpr.ideal_limit')}{' '}
                <span className="font-semibold text-brand-text">
                  {formatCurrency(Math.round(affordability.maxInstallment))}{t('kpr.per_bln')}
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
                  <TrendingDown size={11} />
                  {t('kpr.safe_margin', { value: formatCurrency(Math.round(affordability.maxInstallment - monthlyInstallment)) })}
                </p>
              )}
            </div>
          </div>

          {!withinLimit && (
            <div className="mt-3 pt-3 border-t border-rose-100 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDpPercentage((prev) => Math.min(100, Math.round(prev + 10)))}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-50 active:scale-[0.98] transition-all"
              >
                {t('kpr.raise_dp')}
              </button>
              <button
                type="button"
                onClick={() => setTenorYears(25)}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-50 active:scale-[0.98] transition-all"
              >
                {t('kpr.extend_tenor')}
              </button>
              <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-brand-border text-brand-muted text-[11px] font-semibold">
                {t('kpr.cheaper_alt')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.97] transition-all duration-200 shadow-sm"
        >
          <MessageCircle size={16} />
          {t('kpr.wa_share')}
        </a>
        <button
          type="button"
          onClick={handleExplainClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-all duration-200 shadow-sm"
        >
          <Bot size={16} />
          {t('kpr.ask_hunibot')}
        </button>
      </div>

      {!affordability && (
        <button
          type="button"
          onClick={() => navigate('/kpr')}
          className="mt-4 w-full px-4 py-3 rounded-xl border border-brand-border text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors flex items-center justify-center gap-2"
        >
          <Wallet size={15} />
          {t('kpr.check_finance')}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
