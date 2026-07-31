import { supabase } from '../supabaseClient'

export const BUYING_POWER_ASSUMPTION = { interestRate: 5.5, tenorYears: 15, dpPercentage: 20 }

const PURCHASE_GOAL_OPTIONS = [
  { value: 'rumah_pertama', label: 'Rumah pertama' },
  { value: 'huni', label: 'Huni sendiri' },
  { value: 'investasi', label: 'Investasi sewa' },
  { value: 'sewa', label: 'Sewa / fleksibel' },
  { value: 'belum_tahu', label: 'Masih mempertimbangkan' },
]

const PURCHASE_GOAL_LABELS = PURCHASE_GOAL_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label
  return acc
}, {})

function formatRupiah(value) {
  if (value == null || isNaN(value) || !Number.isFinite(value)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export async function getFinancialProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, isAuthenticated: false }
  const { data, error } = await supabase
    .from('user_financial_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return { profile: null, isAuthenticated: true }
  return { profile: data, isAuthenticated: true }
}

export async function saveFinancialProfile(values) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Kamu harus masuk terlebih dahulu.' } }
  const payload = {
    user_id: user.id,
    monthly_income: Math.max(0, Number(values.monthlyIncome) || 0),
    monthly_commitments: Math.max(0, Number(values.monthlyCommitments) || 0),
    monthly_budget: Math.max(0, Number(values.monthlyBudget) || 0),
    purchase_goal: values.purchaseGoal || 'rumah_pertama',
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('user_financial_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) return { data: null, error }
  return { data, error: null }
}

export function computeAffordability(profile) {
  if (!profile) return null
  const income = Number(profile.monthly_income) || 0
  const commitments = Number(profile.monthly_commitments) || 0
  const budget = Number(profile.monthly_budget) || 0
  const takeHome = Math.max(0, income - commitments)
  const ruleBased = takeHome * 0.3
  const maxInstallment = budget > 0 ? Math.min(budget, ruleBased > 0 ? ruleBased : budget) : ruleBased
  return {
    income,
    commitments,
    budget,
    takeHome,
    maxInstallment,
  }
}

export function maxAffordablePrice(maxInstallment, interestRatePercent, tenorYears, dpPercentage) {
  if (!maxInstallment || maxInstallment <= 0) return 0
  const monthlyRate = (interestRatePercent / 100) / 12
  const numMonths = tenorYears * 12
  let principal
  if (monthlyRate === 0) {
    principal = maxInstallment * numMonths
  } else {
    const factor = Math.pow(1 + monthlyRate, numMonths)
    if (!Number.isFinite(factor)) principal = maxInstallment * numMonths
    else principal = maxInstallment * (1 - Math.pow(1 + monthlyRate, -numMonths)) / monthlyRate
  }
  const dpRatio = Math.max(0, Math.min(1, (dpPercentage || 0) / 100))
  return dpRatio >= 1 ? principal : principal / (1 - dpRatio)
}

export function estimateMonthlyInstallment(price, interestRatePercent, tenorYears, dpPercentage) {
  const priceNum = Math.max(0, Number(price) || 0)
  const dpRatio = Math.min(100, Math.max(0, Number(dpPercentage) || 0)) / 100
  const principal = priceNum * (1 - dpRatio)
  if (principal <= 0) return 0
  const monthlyRate = (interestRatePercent || 0) / 100 / 12
  const numMonths = tenorYears * 12
  if (monthlyRate === 0) return numMonths > 0 ? principal / numMonths : 0
  const factor = Math.pow(1 + monthlyRate, numMonths)
  if (!Number.isFinite(factor) || factor <= 1) return numMonths > 0 ? principal / numMonths : 0
  return (principal * monthlyRate * factor) / (factor - 1)
}

export { PURCHASE_GOAL_OPTIONS, PURCHASE_GOAL_LABELS, formatRupiah }
