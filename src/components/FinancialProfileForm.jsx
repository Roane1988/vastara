import { useState, useEffect, useMemo } from 'react'
import { Wallet, Info, Check, Loader2, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getFinancialProfile,
  saveFinancialProfile,
  PURCHASE_GOAL_OPTIONS,
  formatRupiah,
} from '../utils/financialProfile'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text placeholder-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all'

const labelClass = 'block text-[11px] font-semibold text-brand-muted mb-1.5'

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
    return { takeHome, max: takeHome * 0.3 }
  }, [values.monthlyIncome, values.monthlyCommitments])

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
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.')
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

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Pendapatan bulanan</label>
          <input
            type="number"
            min="0"
            value={values.monthlyIncome}
            onChange={(e) => setField('monthlyIncome', e.target.value)}
            placeholder="cth. 15000000"
            className={inputClass}
          />
          {values.monthlyIncome && (
            <p className="text-xs text-brand-muted mt-1">{formatRupiah(Number(values.monthlyIncome))}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Cicilan / komitmen berjalan per bulan</label>
          <input
            type="number"
            min="0"
            value={values.monthlyCommitments}
            onChange={(e) => setField('monthlyCommitments', e.target.value)}
            placeholder="cth. 2000000"
            className={inputClass}
          />
          <p className="text-xs text-brand-muted mt-1">
            Cicilan mobil, kartu kredit, pinjaman lain, dsb.
          </p>
        </div>

        <div>
          <label className={labelClass}>Budget cicilan rumah per bulan</label>
          <input
            type="number"
            min="0"
            value={values.monthlyBudget}
            onChange={(e) => setField('monthlyBudget', e.target.value)}
            placeholder="cth. 5000000"
            className={inputClass}
          />
          {suggestion.takeHome > 0 && (
            <p className="text-xs text-brand-muted mt-1">
              Saran maksimal (30% dari gaji bersih):{' '}
              <span className="font-semibold text-emerald-600">{formatRupiah(suggestion.max)}</span>
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Tujuan pembelian</label>
          <select
            value={values.purchaseGoal}
            onChange={(e) => setField('purchaseGoal', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all appearance-none"
          >
            {PURCHASE_GOAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
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
