import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, UserCheck, Building2, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import useSEO from '../hooks/useSEO'

export default function AgentApplicationPage() {
  useSEO({ title: 'Daftar Menjadi Agen — HuniOne', description: 'Bergabung bersama HuniOne sebagai agen properti. Jangkau lebih banyak klien, kelola listing, dan tumbuhkan bisnis Anda.' })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({
    full_name: user?.user_metadata?.first_name || '',
    email: user?.email || '',
    whatsapp: '',
    agency: '',
    experience: '',
    region: '',
    portfolio: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const updateField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="sticky top-0 z-30 bg-brand-surface/90 backdrop-blur-md pt-12 pb-3 px-5 border-b border-brand-border">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mx-auto mb-6">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">{t('agentApply.login_title')}</h1>
          <p className="text-sm text-brand-muted mt-3 leading-relaxed">{t('agentApply.login_desc')}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: '/agent-apply' } })}
            className="mt-8 w-full bg-brand-primary text-white py-3.5 rounded-xl text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
          >
            {t('agentApply.login_button')}
          </button>
          <p className="text-xs text-brand-muted mt-4">{t('agentApply.login_register_hint')}</p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.full_name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      setError(t('agentApply.error_required'))
      return
    }
    if (!agreed) {
      setError(t('agentApply.error_agreement'))
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('agent_applications').insert({
        user_id: user.id,
        full_name: form.full_name.trim(),
        email: user.email,
        whatsapp: form.whatsapp.trim(),
        agency: form.agency.trim(),
        experience: form.experience,
        region: form.region.trim(),
        portfolio: form.portfolio.trim(),
        agreement_accepted_at: new Date().toISOString(),
      })
      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan, coba lagi.')
    }
    setSubmitting(false)
  }

  const inputClass = "w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
  const labelClass = "text-xs font-medium text-brand-muted mb-1.5 block"

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="sticky top-0 z-30 bg-brand-surface/90 backdrop-blur-md pt-12 pb-3 px-5 border-b border-brand-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {success ? (
          <div className="bg-brand-surface rounded-2xl border border-brand-border shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text">{t('agentApply.success_title')}</h1>
            <p className="text-sm text-brand-muted mt-3 max-w-md mx-auto leading-relaxed">
              {t('agentApply.success_desc')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="mt-8 bg-brand-primary text-white px-6 py-3 rounded-xl hover:brightness-90 font-semibold active:scale-[0.97] transition-all"
            >
              {t('agentApply.back_home')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                <UserCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-text">{t('agentApply.title')}</h1>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed">{t('agentApply.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[1, 2, 3].map((step) => (
                <div key={step} className="bg-brand-surface rounded-xl border border-brand-border p-3 text-center">
                  <p className="text-lg font-extrabold text-brand-accent">{step}</p>
                  <p className="text-[10px] text-brand-muted mt-0.5 leading-tight">{t(`agentApply.step${step}`)}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl border border-brand-border shadow-sm p-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="full_name" className={labelClass}>{t('agentApply.full_name')} *</label>
                <input id="full_name" type="text" value={form.full_name} onChange={updateField('full_name')} placeholder={t('agentApply.full_name_placeholder')} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className={labelClass}>{t('agentApply.email')} *</label>
                  <input id="email" type="email" value={form.email} readOnly placeholder="nama@email.com" className={`${inputClass} opacity-70 cursor-not-allowed`} />
                </div>
                <div>
                  <label htmlFor="whatsapp" className={labelClass}>{t('agentApply.whatsapp')} *</label>
                  <input id="whatsapp" type="tel" value={form.whatsapp} onChange={updateField('whatsapp')} placeholder="+62 812-3456-7890" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="agency" className={labelClass}>{t('agentApply.agency')}</label>
                <input id="agency" type="text" value={form.agency} onChange={updateField('agency')} placeholder={t('agentApply.agency_placeholder')} className={inputClass} />
              </div>

              <div>
                <label htmlFor="experience" className={labelClass}>{t('agentApply.experience')}</label>
                <select id="experience" value={form.experience} onChange={updateField('experience')} className={inputClass}>
                  <option value="">{t('agentApply.experience_placeholder')}</option>
                  {['<1', '1-3', '3-5', '5+'].map((y) => (
                    <option key={y} value={y}>{y} {t('agentApply.years')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="region" className={labelClass}>{t('agentApply.region')}</label>
                <input id="region" type="text" value={form.region} onChange={updateField('region')} placeholder={t('agentApply.region_placeholder')} className={inputClass} />
              </div>

              <div>
                <label htmlFor="portfolio" className={labelClass}>{t('agentApply.portfolio')}</label>
                <textarea id="portfolio" rows={3} value={form.portfolio} onChange={updateField('portfolio')} placeholder={t('agentApply.portfolio_placeholder')} className={`${inputClass} resize-none`} />
              </div>

              <label className="flex items-start gap-3 pt-2 border-t border-brand-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent/30 cursor-pointer"
                />
                <span className="text-xs text-brand-muted leading-relaxed">{t('agentApply.agreement')}</span>
              </label>

              <div className="flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-4 py-3">
                <Building2 size={16} className="text-brand-accent shrink-0" />
                <p className="text-[11px] text-brand-muted leading-relaxed">{t('agentApply.review_note')}</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserCheck size={16} />
                )}
                {submitting ? t('agentApply.submitting') : t('agentApply.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
