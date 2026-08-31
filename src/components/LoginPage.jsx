import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { toErrorMessage, getAuthErrorCode, isRateLimitError } from '../utils/authErrors'
import { requestOtp } from '../utils/otp'
import FormErrorSummary from './FormErrorSummary'
import AuthShell from './auth/AuthShell'
import { EyeIcon, GoogleIcon, SpinnerIcon } from './auth/icons'
import { MailCheck } from 'lucide-react'
import { useRememberEmail } from '../hooks/useRememberEmail'

const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const OTP_COOLDOWN_SECONDS = 60

export default function LoginPage({ onLoginSuccess }) {
  const { t } = useTranslation()
  const { showToast } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [oauthLoading, setOauthLoading] = useState(false)

  const [mode, setMode] = useState('password')
  const [linkSent, setLinkSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  const { email, setEmail, remember, handleToggleRemember, persistRememberedEmail } = useRememberEmail()

  const AUTH_ERROR_LABELS = {
    email_in_use: t('login.error_email_in_use'),
    email_not_confirmed: t('login.error_email_not_confirmed'),
    whatsapp_in_use: t('login.error_whatsapp_in_use'),
    invalid_credentials: t('login.error_invalid_credentials'),
  }

  useEffect(() => {
    const field = document.getElementById(mode === 'otp' ? 'otp-email' : 'email')
    field?.focus()
  }, [mode])

  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setTimeout(() => setOtpCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(timer)
  }, [otpCooldown])

  async function handleLogin(e) {
    e.preventDefault()
    if (loading) return
    setError(null)

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        handleAuthError(authError)
        return
      }
      persistRememberedEmail()
      onLoginSuccess?.()
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault()
    if (otpLoading || otpCooldown > 0) return
    setError(null)

    if (!email.trim() || !EMAIL_REGEX.test(email)) {
      setError(t('login.error_email_invalid'))
      return
    }

    setOtpLoading(true)
    try {
      await requestOtp({ identifier: email.trim() })
      setLinkSent(true)
      setOtpCooldown(OTP_COOLDOWN_SECONDS)
      showToast(t('login.otp_sent'), 'success')
    } catch (err) {
      handleAuthError(err)
    } finally {
      setOtpLoading(false)
    }
  }

  function handleChangeEmail() {
    setLinkSent(false)
    setError(null)
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
    if (next === 'password') {
      setLinkSent(false)
    }
  }

  async function handleGoogleLogin() {
    if (loading || oauthLoading) return
    setOauthLoading(true)
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } catch (err) {
      handleAuthError(err)
    } finally {
      setOauthLoading(false)
    }
  }

  function handleAuthError(err) {
    const rawMessage = toErrorMessage(err)
    const mapped = AUTH_ERROR_LABELS[getAuthErrorCode(err)]
    const fallback = t('login.error_generic')
    const message = mapped || rawMessage || fallback

    if (isRateLimitError(err)) {
      const rateMsg = t('login.too_many_attempts')
      showToast(rateMsg, 'error')
      setError(rateMsg)
      return
    }
    setError(String(message))
  }

  const loadingBtnClass = loading
    ? 'relative overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse'
    : ''

  return (
    <AuthShell>
      <h2 className="text-xl font-semibold text-brand-text text-center mb-6">
        {t('login.title')}
      </h2>

      <div className="grid grid-cols-2 gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl mb-6">
        <button
          type="button"
          onClick={() => switchMode('password')}
          className={`py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'password' ? 'bg-brand-primary text-white' : 'text-brand-muted hover:text-brand-text'}`}
        >
          {t('login.tab_password')}
        </button>
        <button
          type="button"
          onClick={() => switchMode('otp')}
          className={`py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'otp' ? 'bg-brand-primary text-white' : 'text-brand-muted hover:text-brand-text'}`}
        >
          {t('login.tab_otp')}
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={handleLogin} noValidate className="space-y-5">
          {error && <FormErrorSummary errors={[error]} title={t('login.error_title')} />}

          <div>
            <label htmlFor="email" className="sr-only">{t('login.email_label')}</label>
            <input
              id="email"
              type="email"
              placeholder={t('login.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>

          <div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                tabIndex={-1}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => handleToggleRemember(e.target.checked)}
                className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-accent/30"
              />
              <span className="text-xs font-medium text-brand-muted">{t('login.remember_me')}</span>
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors">
              {t('login.forgot_password')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${loadingBtnClass}`}
          >
            {loading && <SpinnerIcon />}
            {loading ? t('login.processing') : t('login.submit')}
          </button>
        </form>
      ) : linkSent ? (
        <div className="space-y-5">
          {error && <FormErrorSummary errors={[error]} title={t('login.error_title')} />}

          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-brand-verified/10 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-brand-verified" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-text">{t('login.otp_link_sent')}</p>
              <p className="text-sm text-brand-muted mt-1.5">
                {t('login.otp_check_inbox', { email })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={otpLoading || otpCooldown > 0}
            className="w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {otpLoading && <SpinnerIcon />}
            {otpCooldown > 0
              ? t('login.otp_resend_cooldown', { seconds: otpCooldown })
              : t('login.otp_resend_link')}
          </button>

          <button
            type="button"
            onClick={handleChangeEmail}
            className="w-full text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors"
          >
            {t('login.otp_change_email')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendOtp} noValidate className="space-y-5">
          {error && <FormErrorSummary errors={[error]} title={t('login.error_title')} />}

          <div>
            <label htmlFor="otp-email" className="sr-only">{t('login.email_label')}</label>
            <input
              id="otp-email"
              type="email"
              placeholder={t('login.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={otpLoading || otpCooldown > 0}
            className="w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {otpLoading && <SpinnerIcon />}
            {t('login.otp_send_code')}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-brand-border" />
        <span className="text-xs text-brand-muted">{t('login.or_divider')}</span>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={oauthLoading}
        className="w-full py-3 flex items-center justify-center gap-2.5 text-sm font-medium text-brand-text bg-brand-surface border border-brand-border rounded-lg hover:bg-brand-bg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {oauthLoading ? t('login.processing') : t('login.google')}
      </button>

      <p className="mt-8 text-center text-xs text-brand-muted">
        {t('login.no_account')}{' '}
        <Link to="/register" className="font-semibold text-brand-primary hover:text-brand-accent transition-colors">
          {t('login.register_link')}
        </Link>
      </p>
    </AuthShell>
  )
}
