import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, UserCheck, CheckCircle2, AlertCircle, Lock, Save, Eye, EyeOff, Building2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'
import LocationAutocomplete from './LocationAutocomplete'

const inputClass =
  'w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors'
const labelClass = 'text-xs font-medium text-brand-muted mb-1.5 block'

function experienceYearsFromText(value) {
  const n = parseInt(String(value).replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export default function AgentProfilePage() {
  useSEO({ title: 'Profil Agen — HuniOne', description: 'Kelola profil agen Anda di direktori HuniOne.' })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, role, loading: authLoading } = useAuth()

  const [form, setForm] = useState({
    full_name: '',
    whatsapp: '',
    agency: '',
    region: '',
    experience: '',
    portfolio: '',
    bio: '',
    is_visible: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('agent_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (!error && data) {
          setForm({
            full_name: data.full_name || '',
            whatsapp: data.whatsapp || '',
            agency: data.agency || '',
            region: data.region || '',
            experience: data.experience || '',
            portfolio: data.portfolio || '',
            bio: data.bio || '',
            is_visible: data.is_visible !== false,
          })
        } else {
          setForm((prev) => ({
            ...prev,
            full_name: user.user_metadata?.first_name || '',
            whatsapp: user.user_metadata?.whatsapp || '',
          }))
        }
      } catch {
        /* keep defaults */
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.full_name.trim() || !form.whatsapp.trim()) {
      setError(t('agentProfile.error_required'))
      return
    }

    setSubmitting(true)
    const payload = {
      full_name: form.full_name.trim(),
      whatsapp: form.whatsapp.trim(),
      agency: form.agency.trim(),
      region: form.region.trim(),
      experience: form.experience,
      experience_years: experienceYearsFromText(form.experience),
      portfolio: form.portfolio.trim(),
      bio: form.bio.trim(),
      is_visible: form.is_visible,
    }

    try {
      const { data: existing } = await supabase
        .from('agent_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { error: saveError } = existing
        ? await supabase.from('agent_profiles').update(payload).eq('user_id', user.id)
        : await supabase.from('agent_profiles').insert({ user_id: user.id, ...payload })

      if (saveError) {
        setError(saveError.message)
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan, coba lagi.')
    }
    setSubmitting(false)
  }

  const backHeader = (
    <div className="sticky top-14 z-30 bg-brand-surface/90 backdrop-blur-md pb-3 px-5 border-b border-brand-border">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
        aria-label={t('common.back')}
      >
        <ArrowLeft size={18} />
      </button>
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg">
        {backHeader}
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mx-auto mb-6">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">{t('agentProfile.login_title')}</h1>
          <p className="text-sm text-brand-muted mt-3 leading-relaxed">{t('agentProfile.login_desc')}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: '/agent-profile' } })}
            className="mt-8 w-full bg-brand-primary text-white py-3.5 rounded-xl text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
          >
            {t('agentProfile.login_button')}
          </button>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (role !== 'agent') {
    return (
      <div className="min-h-screen bg-brand-bg">
        {backHeader}
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mx-auto mb-6">
            <UserCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">{t('agentProfile.restricted_title')}</h1>
          <p className="text-sm text-brand-muted mt-3 leading-relaxed">{t('agentProfile.restricted_desc')}</p>
          <button
            type="button"
            onClick={() => navigate('/agent-apply')}
            className="mt-8 w-full bg-brand-primary text-white py-3.5 rounded-xl text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
          >
            {t('agentProfile.become_agent')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {backHeader}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {success ? (
          <div className="bg-brand-surface rounded-2xl border border-brand-border shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text">{t('agentProfile.success')}</h1>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                type="button"
                onClick={() => navigate(`/agents/${user.id}`)}
                className="flex-1 bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold hover:brightness-90 active:scale-[0.97] transition-all"
              >
                {t('agentProfile.view_profile')}
              </button>
              <button
                type="button"
                onClick={() => { setSuccess(false) }}
                className="flex-1 bg-brand-bg border border-brand-border text-brand-text px-6 py-3 rounded-xl font-semibold hover:bg-brand-border active:scale-[0.97] transition-all"
              >
                {t('agentProfile.edit_again')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-text">{t('agentProfile.title')}</h1>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed">{t('agentProfile.subtitle')}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl border border-brand-border shadow-sm p-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="ap_full_name" className={labelClass}>{t('agentProfile.full_name')} *</label>
                <input id="ap_full_name" type="text" value={form.full_name} onChange={updateField('full_name')} placeholder={t('agentProfile.full_name_placeholder')} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ap_whatsapp" className={labelClass}>{t('agentProfile.whatsapp')} *</label>
                  <input id="ap_whatsapp" type="tel" value={form.whatsapp} onChange={updateField('whatsapp')} placeholder={t('agentProfile.whatsapp_placeholder')} className={inputClass} />
                  <p className="text-xs text-brand-muted mt-1.5">{t('agentProfile.whatsapp_hint')}</p>
                </div>
                <div>
                  <label htmlFor="ap_experience" className={labelClass}>{t('agentProfile.experience')}</label>
                  <select id="ap_experience" value={form.experience} onChange={updateField('experience')} className={inputClass}>
                    <option value="">{t('agentProfile.experience_placeholder')}</option>
                    {['<1', '1-3', '3-5', '5+'].map((y) => (
                      <option key={y} value={y}>{y} {t('agentProfile.years')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ap_agency" className={labelClass}>{t('agentProfile.agency')}</label>
                  <input id="ap_agency" type="text" value={form.agency} onChange={updateField('agency')} placeholder={t('agentProfile.agency_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="ap_region" className={labelClass}>{t('agentProfile.region')}</label>
                  <LocationAutocomplete
                    mode="kota"
                    value={form.region}
                    onChange={(v) => setForm((prev) => ({ ...prev, region: v }))}
                    placeholder={t('agentProfile.region_placeholder')}
                    inputClassName={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ap_portfolio" className={labelClass}>{t('agentProfile.portfolio')}</label>
                <textarea id="ap_portfolio" rows={3} value={form.portfolio} onChange={updateField('portfolio')} placeholder={t('agentProfile.portfolio_placeholder')} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label htmlFor="ap_bio" className={labelClass}>{t('agentProfile.bio')}</label>
                <textarea id="ap_bio" rows={4} value={form.bio} onChange={updateField('bio')} placeholder={t('agentProfile.bio_placeholder')} className={`${inputClass} resize-none`} />
              </div>

              <label className="flex items-start gap-3 pt-2 border-t border-brand-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_visible: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent/30 cursor-pointer"
                />
                <span className="text-xs text-brand-muted leading-relaxed">
                  <span className="font-semibold text-brand-text flex items-center gap-1.5">
                    {form.is_visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    {t('agentProfile.visible')}
                  </span>
                  <span className="block mt-0.5">{t('agentProfile.visible_desc')}</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submitting ? t('agentProfile.submitting') : t('agentProfile.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
