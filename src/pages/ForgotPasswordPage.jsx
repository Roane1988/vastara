import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { isRateLimitError, toErrorMessage } from '../utils/authErrors'
import FormErrorSummary from '../components/FormErrorSummary'
import useSEO from '../hooks/useSEO'

const COOLDOWN_SECONDS = 60

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { showToast } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [cooldown, setCooldown] = useState(0)

  useSEO({
    title: t('forgot_password.page_title'),
    description: t('forgot_password.page_description'),
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendReset(targetEmail) {
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin + '/update-password',
      })

      if (authError) {
        handleSubmitError(authError)
        return
      }

      setSent(true)
      setCooldown(COOLDOWN_SECONDS)
      showToast(t('forgot_password.success'), 'success')
    } catch (err) {
      handleSubmitError(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (loading || cooldown > 0) return
    sendReset(email)
  }

  function handleResend() {
    if (loading || cooldown > 0) return
    setSent(false)
    sendReset(email)
  }

  function handleSubmitError(err) {
    const message = toErrorMessage(err) || t('forgot_password.error_generic')
    if (isRateLimitError(err)) {
      const msg = t('forgot_password.too_many_attempts')
      showToast(msg, 'error')
      setError(msg)
      return
    }
    setError(message)
  }

  const loadingBtnClass = loading
    ? 'relative overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse'
    : ''

  if (sent) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg px-4 pt-8 pb-16">
        <div className="w-full max-w-sm my-auto text-center">
          <img src="/huniOne.svg" alt="HuniOne" className="h-32 md:h-48 w-auto object-contain mx-auto mb-8" />
          <div className="w-16 h-16 rounded-full bg-brand-verified/10 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-verified">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-brand-text mb-3">
            {t('forgot_password.sent_title')}
          </h2>
          <p className="text-sm text-brand-muted mb-8 leading-relaxed">
            {t('forgot_password.sent_desc', { email })}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            className="w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <SpinnerIcon />}
            {cooldown > 0
              ? t('forgot_password.resend_cooldown', { seconds: cooldown })
              : t('forgot_password.resend_link')}
          </button>
          <Link
            to="/login"
            className="mt-4 inline-block w-full py-3.5 text-sm font-medium text-brand-text bg-brand-surface border border-brand-border rounded-lg hover:bg-brand-bg transition-all duration-200 text-center"
          >
            {t('forgot_password.back_to_login')}
          </Link>
        </div>
      </div>
  )
}

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg px-4 pt-8 pb-16">
      <div className="w-full max-w-sm my-auto">
        <div className="text-center mb-8 pt-4">
          <img src="/huniOne.svg" alt="HuniOne" className="h-32 md:h-48 w-auto object-contain mx-auto" />
          <p className="text-sm font-medium text-brand-primary/70 tracking-wide mt-1">
            {t('forgot_password.subtitle')}
          </p>
        </div>

        <h2 className="text-xl font-semibold text-brand-text text-center mb-2">
          {t('forgot_password.title')}
        </h2>
        <p className="text-sm text-brand-muted text-center mb-8">
          {t('forgot_password.desc')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <FormErrorSummary errors={[error]} title={t('forgot_password.error_title')} />}

          <div>
            <label htmlFor="email" className="sr-only">{t('forgot_password.email_label')}</label>
            <input
              id="email"
              type="email"
              placeholder={t('forgot_password.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${loadingBtnClass}`}
          >
            {loading && <SpinnerIcon />}
            {loading ? t('forgot_password.processing') : t('forgot_password.submit')}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-brand-muted">
          {t('forgot_password.remember_password')}{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-primary hover:text-brand-accent transition-colors"
          >
            {t('forgot_password.login_link')}
          </Link>
        </p>
      </div>
    </div>
  )
}
