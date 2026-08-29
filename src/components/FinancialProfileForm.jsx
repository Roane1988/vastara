import { useState, useEffect, useMemo } from 'react'
import FormErrorSummary from './FormErrorSummary'
import MoneyInput from './MoneyInput'
import {
  Wallet,
  Info,
  Check,
  Loader2,
  LogIn,
  TrendingUp,
  AlertCircle,
  Home,
  Gauge,
  Lightbulb,
  Wand2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getFinancialProfile,
  saveFinancialProfile,
  computeAffordability,
  maxAffordablePrice,
  PURCHASE_GOAL_OPTIONS,
  formatRupiah,
  BUYING_POWER_ASSUMPTION,
} from '../utils/financialProfile'

const labelClass = 'block text-[11px] font-semibold text-brand-muted mb-1.5'

const helperClass = 'text-[10px] text-brand-muted/80 mt-1.5 flex items-start gap-1'

const INCOME_PRESETS = [
  { value: 5000000, label: 'Rp 5 jt' },
  { value: 10000000, label: 'Rp 10 jt' },
  { value: 15000000, label: 'Rp 15 jt' },
  { value: 20000000, label: 'Rp 20 jt' },
]

function isFilled(value) {
  return String(value == null ? '' : value).trim() !== ''
}

function isNetworkError(e) {
  const msg = String(e?.message || '').toLowerCase()
  return e instanceof TypeError
    || /load failed|failed to fetch|networkerror|network request failed/i.test(msg)
}

function dsrStyle(dsr) {
  if (dsr == null) return { color: 'text-brand-muted', bar: 'bg-brand-muted', message: '' }
  if (dsr <= 30) return { color: 'text-emerald-600', bar: 'bg-emerald-500', message: 'Sehat — cicilan masih di bawah 30% pendapatan' }
  if (dsr <= 40) return { color: 'text-amber-600', bar: 'bg-amber-500', message: 'Masih wajar, tapi mendekati batas yang diterima bank' }
  return { color: 'text-red-600', bar: 'bg-red-500', message: 'Di atas 40% — bank umumnya menolak. Pertimbangkan menurunkan cicilan' }
}

export default function FinancialProfileForm({ onSaved, showTitle = true }) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    monthlyIncome: '',
    monthlyCommitments: '',
    monthlyBudget: '',
    purchaseGoal: 'rumah_pertama',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { profile, isAuthenticated: auth } = await getFinancialProfile()
        if (cancelled) return
        setIsAuthenticated(auth)
        if (profile) {
          setValues({
            monthlyIncome: profile.monthly_income ? String(profile.monthly_income) : '',
            monthlyCommitments: profile.monthly_commitments ? String(profile.monthly_commitments) : '',
            monthlyBudget: profile.monthly_budget ? String(profile.monthly_budget) : '',
            purchaseGoal: profile.purchase_goal || 'rumah_pertama',
          })
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const suggestion = useMemo(() => {
    const income = Number(values.monthlyIncome) || 0
    const commitments = Number(values.monthlyCommitments) || 0
    const takeHome = Math.max(0, income - commitments)
    return { income, commitments, takeHome, max: takeHome * 0.3 }
  }, [values.monthlyIncome, values.monthlyCommitments])

  const affordability = useMemo(() => computeAffordability({
    monthly_income: suggestion.income,
    monthly_commitments: suggestion.commitments,
    monthly_budget: Number(values.monthlyBudget) || 0,
  }), [suggestion.income, suggestion.commitments, values.monthlyBudget])

  const buyingPower = useMemo(() => {
    const maxInstallment = affordability?.maxInstallment || 0
    if (maxInstallment <= 0) return null
    return maxAffordablePrice(
      maxInstallment,
      BUYING_POWER_ASSUMPTION.interestRate,
      BUYING_POWER_ASSUMPTION.tenorYears,
      BUYING_POWER_ASSUMPTION.dpPercentage
    )
  }, [affordability])

  const dsr = useMemo(() => {
    if (suggestion.income <= 0) return null
    return Math.round((suggestion.commitments / suggestion.income) * 100)
  }, [suggestion.income, suggestion.commitments])

  const commitmentsOverIncome = suggestion.income > 0 && suggestion.commitments > suggestion.income
  const budgetOverTakeHome = suggestion.takeHome > 0 && (Number(values.monthlyBudget) || 0) > suggestion.takeHome

  const filledCount = useMemo(() => {
    let n = 0
    if (isFilled(values.monthlyIncome)) n += 1
    if (isFilled(values.monthlyCommitments)) n += 1
    if (isFilled(values.monthlyBudget)) n += 1
    n += 1
    return n
  }, [values.monthlyIncome, values.monthlyCommitments, values.monthlyBudget])

  const progressPct = Math.min(100, Math.round((filledCount / 4) * 100))
  const isComplete = filledCount >= 4

  const budgetStatus = useMemo(() => {
    if (!isFilled(values.monthlyBudget)) return null
    return Number(values.monthlyBudget) <= suggestion.max ? 'ok' : 'over'
  }, [values.monthlyBudget, suggestion.max])

  function setField(field, value) {
    setValues(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { data, error: err } = await saveFinancialProfile(values)
      if (err) {
        setError(err.message || 'Gagal menyimpan profil keuangan')
        return
      }
      setSaved(true)
      onSaved?.(data)
      window.dispatchEvent(new Event('financial-profile-saved'))
    } catch (e) {
      if (isNetworkError(e)) {
        setError('Gagal terhubung ke server. Periksa koneksi internet kamu lalu coba lagi.')
      } else {
        setError(e.message || 'Terjadi kesalahan. Coba lagi.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-brand-muted" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-5 text-center">
        {showTitle && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Wallet size={15} className="text-emerald-600" />
            </div>
            <p className="font-bold text-brand-text">Profil Keuangan</p>
          </div>
        )}
        <p className="text-sm text-brand-muted mb-4">
          Isi profil keuangan agar simulasi KPR dan rekomendasi AI lebih personal dan akurat.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:brightness-90 transition-all"
        >
          <LogIn size={15} />
          Masuk untuk simpan profil
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Wallet size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-brand-text leading-tight">Profil Keuangan</p>
            <p className="text-[10px] text-brand-muted">Dipakai AI untuk simulasi &amp; rekomendasi</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-brand-muted">Kelengkapan data</p>
          <p className={`text-[11px] font-bold ${isComplete ? 'text-emerald-600' : 'text-brand-muted'}`}>
            {filledCount}/4 terisi
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-brand-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {isComplete ? (
          <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
            <Check size={12} />
            Profil lengkap — analisis AI siap dipersonalisasi
          </p>
        ) : (
          <p className="text-[10px] text-brand-muted mt-1.5">
            Lengkapi 4 data ini agar simulasi KPR &amp; analisis AI dipersonalisasi untuk kamu.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <MoneyInput
            label="Pendapatan bulanan (bersih)"
            value={values.monthlyIncome}
            onChange={(v) => setField('monthlyIncome', v)}
            placeholder="cth. 15000000"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INCOME_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setField('monthlyIncome', String(p.value))}
                className="px-2.5 py-1 rounded-full border border-brand-border text-[10px] font-semibold text-brand-muted hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className={helperClass}>
            <Lightbulb size={11} className="shrink-0 mt-0.5 text-emerald-500" />
            Dipakai menghitung pendapatan bersih &amp; batas cicilan aman (30%). Pakai angka setelah potongan.
          </p>
        </div>

        <div>
          <MoneyInput
            label="Cicilan / komitmen berjalan per bulan"
            value={values.monthlyCommitments}
            onChange={(v) => setField('monthlyCommitments', v)}
            placeholder="cth. 2000000"
            hint="Cicilan mobil, kartu kredit, pinjaman lain, dsb."
          />
          {commitmentsOverIncome && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5 flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              Komitmen melebihi pendapatan — batas cicilan aman kamu jadi Rp 0.
            </p>
          )}
          <p className={helperClass}>
            <Lightbulb size={11} className="shrink-0 mt-0.5 text-emerald-500" />
            Makin besar komitmen, makin kecil batas cicilan yang aman untuk kamu.
          </p>
        </div>

        <div>
          <MoneyInput
            label="Budget cicilan rumah per bulan"
            value={values.monthlyBudget}
            onChange={(v) => setField('monthlyBudget', v)}
            placeholder="cth. 5000000"
          />
          {suggestion.takeHome > 0 && (
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-brand-muted">
                Saran maksimal (30% dari gaji bersih):{' '}
                <span className="font-semibold text-emerald-600">{formatRupiah(suggestion.max)}</span>
              </p>
              <button
                type="button"
                onClick={() => setField('monthlyBudget', String(Math.round(suggestion.max)))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
              >
                <Wand2 size={10} />
                Pakai saran
              </button>
            </div>
          )}
          {budgetOverTakeHome && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-1.5 flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              Budget melebihi pendapatan bersih kamu — periksa kembali.
            </p>
          )}
          <p className={helperClass}>
            <Lightbulb size={11} className="shrink-0 mt-0.5 text-emerald-500" />
            Target cicilan inilah yang dipakai simulasi KPR &amp; analisis AI.
          </p>
        </div>

        {(suggestion.takeHome > 0 || isFilled(values.monthlyBudget)) && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Ringkasan Kemampuan</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-brand-muted">Pendapatan bersih / bln</p>
                <p className="text-sm font-bold text-brand-text">{formatRupiah(suggestion.takeHome)}</p>
              </div>
              <div>
                <p className="text-[10px] text-brand-muted">Saran cicilan maks (30%)</p>
                <p className="text-sm font-bold text-emerald-600">{formatRupiah(suggestion.max)}</p>
              </div>
            </div>
            {dsr != null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-brand-muted flex items-center gap-1">
                    <Gauge size={11} />
                    Rasio cicilan (DSR)
                  </p>
                  <p className={`text-[11px] font-bold ${dsrStyle(dsr).color}`}>{dsr}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${dsrStyle(dsr).bar}`}
                    style={{ width: `${Math.min(dsr, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-brand-muted mt-1">{dsrStyle(dsr).message}</p>
              </div>
            )}
            {budgetStatus && (
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${budgetStatus === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {budgetStatus === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />}
                {budgetStatus === 'ok'
                  ? 'Budget kamu masih dalam batas saran ideal'
                  : 'Budget melebihi saran 30% — pertimbangkan untuk menurunkan target'}
              </div>
            )}
          </div>
        )}

        {buyingPower != null && (
          <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Home size={13} className="text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Perkiraan Daya Beli</p>
            </div>
            <p className="text-lg font-extrabold text-brand-text">{formatRupiah(buyingPower)}</p>
            <p className="text-[10px] text-brand-muted mt-1">
              Estimasi max harga properti (KPR {BUYING_POWER_ASSUMPTION.tenorYears} thn · {BUYING_POWER_ASSUMPTION.interestRate}% · DP {BUYING_POWER_ASSUMPTION.dpPercentage}%)
            </p>
            <p className="text-[10px] text-brand-muted/80 mt-1 flex items-start gap-1">
              <Info size={11} className="shrink-0 mt-0.5" />
              Angka inilah yang dipakai analisis AI untuk menilai apakah sebuah properti terjangkau.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass}>Tujuan pembelian</label>
          <div className="grid grid-cols-2 gap-2">
            {PURCHASE_GOAL_OPTIONS.map(o => {
              const active = values.purchaseGoal === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setField('purchaseGoal', o.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    active
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'bg-brand-bg border-brand-border text-brand-muted hover:border-emerald-300 hover:text-brand-text'
                  }`}
                >
                  {active && <Check size={12} className="inline -mt-0.5 mr-1" />}
                  {o.label}
                </button>
              )
            })}
          </div>
          <p className={helperClass}>
            <Lightbulb size={11} className="shrink-0 mt-0.5 text-emerald-500" />
            Dipakai AI untuk menyesuaikan rekomendasi: rumah pertama, investasi sewa, atau ditempati sendiri.
          </p>
        </div>

        {error && (
          <FormErrorSummary errors={[error]} title="Gagal menyimpan profil keuangan" />
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
            : saved
              ? <><Check size={15} /> Tersimpan</>
              : 'Simpan Profil Keuangan'}
        </button>

        <p className="text-[10px] text-brand-muted/70 leading-relaxed flex items-start gap-1">
          <Info size={11} className="shrink-0 mt-0.5" />
          Data ini hanya dipakai untuk simulasi dan rekomendasi AI di HuniOne. Bisa diubah atau dihapus kapan saja dan tidak dibagikan ke pihak lain.
        </p>
      </div>
    </div>
  )
}
