import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { isRateLimitError, toErrorMessage, getAuthErrorCode } from '../utils/authErrors'
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from '../utils/whatsapp'
import { requestOtp, verifyOtp } from '../utils/otp'
import FormErrorSummary from './FormErrorSummary'
import AuthShell from './auth/AuthShell'
import { EyeIcon, SpinnerIcon } from './auth/icons'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/
const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const OTP_COOLDOWN_SECONDS = 60

export default function RegisterPage({ onLoginSuccess }) {
  const { t } = useTranslation()
  const { showToast } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [waError, setWaError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  const [verifying, setVerifying] = useState(false)
  const [pendingWa, setPendingWa] = useState('')
  const [verifCode, setVerifCode] = useState('')
  const [verifLoading, setVerifLoading] = useState(false)
  const [verifCooldown, setVerifCooldown] = useState(0)
  const [verifError, setVerifError] = useState('')

  const AUTH_ERROR_LABELS = {
    email_in_use: t('login.error_email_in_use'),
    email_not_confirmed: t('login.error_email_not_confirmed'),
    whatsapp_in_use: t('login.error_whatsapp_in_use'),
    invalid_credentials: t('login.error_invalid_credentials'),
  }
  const errorTitle = t('login.error_title_signup')

  useEffect(() => {
    const field = document.getElementById('firstName')
    field?.focus()
  }, [])

  useEffect(() => {
    if (verifCooldown <= 0) return
    const timer = setTimeout(() => setVerifCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(timer)
  }, [verifCooldown])

  function validatePassword(value) {
    if (value && !PASSWORD_REGEX.test(value)) {
      setPasswordError(t('login.error_password_weak'))
      return false
    }
    setPasswordError('')
    return true
  }

  function validateWa(value) {
    if (value.replace(/\D/g, '') && !isValidWhatsAppNumber(value)) {
      setWaError(t('login.error_whatsapp_invalid'))
      return false
    }
    setWaError('')
    return true
  }

  function handlePasswordChange(e) {
    const value = e.target.value
    setPassword(value)
    if (passwordError) validatePassword(value)
    if (confirmError && value === confirmPassword) setConfirmError('')
  }

  function handleConfirmChange(e) {
    const value = e.target.value
    setConfirmPassword(value)
    if (confirmError && password === value) setConfirmError('')
  }

  function handleWaChange(e) {
    const value = e.target.value
    setWhatsapp(value)
    if (waError) validateWa(value)
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setCheckEmail(false)

    if (!firstName.trim()) {
      setError(t('login.error_name_required'))
      return
    }
    if (!email.trim()) {
      setError(t('login.error_email_required'))
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError(t('login.error_email_invalid'))
      return
    }
    if (!password) {
      setError(t('login.error_password_required'))
      return
    }
    if (!validatePassword(password)) return
    if (password !== confirmPassword) {
      setConfirmError(t('login.error_password_mismatch'))
      return
    }
    if (!whatsapp.trim()) {
      setError(t('login.error_whatsapp_required'))
      return
    }
    if (!validateWa(whatsapp)) return

    setLoading(true)
    try {
      const normalizedWa = normalizeWhatsAppNumber(whatsapp)
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            first_name: firstName.trim(),
            whatsapp: normalizedWa,
            whatsapp_verified: false,
          },
        },
      })
      if (authError) {
        handleAuthError(authError)
        return
      }

      if (data?.session) {
        await startVerification(normalizedWa)
        return
      }

      if (data?.user) {
        if ((data.user.identities?.length ?? 1) === 0) {
          setError(t('login.error_email_taken'))
          return
        }
        setCheckEmail(true)
        showToast(t('login.signup_check_email_title'), 'success')
        return
      }

      await startVerification(normalizedWa)
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  async function startVerification(normalizedWa) {
    setVerifying(true)
    setPendingWa(normalizedWa)
    setVerifError('')
    try {
      await requestOtp({ identifier: email })
      setVerifCooldown(OTP_COOLDOWN_SECONDS)
      showToast(t('login.otp_sent'), 'success')
    } catch (err) {
      setVerifError(toErrorMessage(err) || t('login.error_generic_signup'))
    }
  }

  async function handleSendVerifOtp() {
    if (verifLoading || verifCooldown > 0) return
    setVerifError('')
    setVerifLoading(true)
    try {
      await requestOtp({ identifier: email })
      setVerifCooldown(OTP_COOLDOWN_SECONDS)
      showToast(t('login.otp_sent'), 'success')
    } catch (err) {
      setVerifError(toErrorMessage(err) || t('login.error_generic_signup'))
    } finally {
      setVerifLoading(false)
    }
  }

  async function handleVerifyVerifOtp() {
    if (verifLoading) return
    setVerifError('')

    if (!verifCode.trim()) {
      setVerifError(t('login.otp_code_required'))
      return
    }

    setVerifLoading(true)
    try {
      const { error: authError } = await verifyOtp({ identifier: email, token: verifCode.trim(), type: 'email' })
      if (authError) {
        setVerifError(toErrorMessage(authError) || t('login.error_generic_signup'))
        return
      }

      const { error: rpcErr } = await supabase.rpc('set_whatsapp_verified', {
        p_whatsapp: pendingWa,
      })
      if (rpcErr) {
        setVerifError(rpcErr.message)
        showToast(rpcErr.message, 'error')
        return
      }

      showToast(t('login.whatsapp_verified_success'), 'success')
      onLoginSuccess?.()
    } catch (err) {
      setVerifError(toErrorMessage(err) || t('login.error_generic_signup'))
    } finally {
      setVerifLoading(false)
    }
  }

  function handleAuthError(err) {
    const rawMessage = toErrorMessage(err)
    const mapped = AUTH_ERROR_LABELS[getAuthErrorCode(err)]
    const fallback = t('login.error_generic_signup')
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

  if (verifying) {
    return (
      <AuthShell>
        <div className="bg-brand-bg border border-brand-border rounded-2xl p-6 -mx-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-text">
                {t('login.verify_title')}
              </h2>
              <p className="text-xs text-brand-muted">
                {t('login.verify_subtitle')}
              </p>
            </div>
          </div>

          <p className="text-sm text-brand-muted mb-4">
            {t('login.verify_desc', { number: pendingWa })}
          </p>

          <div>
            {verifError && <FormErrorSummary errors={[verifError]} title={errorTitle} />}

            <form
              onSubmit={handleVerifyVerifOtp}
              noValidate
              className="mt-4 space-y-4"
            >
              <div>
                <label htmlFor="verifCode" className="text-xs font-medium text-brand-muted mb-1.5 block">
                  {t('login.otp_code_label')}
                </label>
                <input
                  id="verifCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t('login.otp_code_placeholder')}
                  value={verifCode}
                  onChange={(e) => setVerifCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  required
                  className="w-full py-3 px-4 text-center text-lg tracking-[0.5em] text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={verifLoading}
                className={`w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${loadingBtnClass}`}
              >
                {verifLoading && <SpinnerIcon />}
                {verifLoading ? t('login.verify_processing') : t('login.verify_submit')}
              </button>
            </form>

            <button
              type="button"
              onClick={handleSendVerifOtp}
              disabled={verifLoading || verifCooldown > 0}
              className="mt-3 w-full text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors disabled:opacity-60"
            >
              {verifCooldown > 0
                ? t('login.otp_resend_cooldown', { seconds: verifCooldown })
                : t('login.otp_send_code')}
            </button>

            <div className="mt-6 pt-5 border-t border-brand-border">
              <button
                type="button"
                onClick={() => onLoginSuccess?.()}
                className="w-full text-xs text-brand-muted hover:text-brand-text transition-colors"
              >
                {t('login.verify_later')}
              </button>
            </div>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="bg-brand-bg border border-brand-border rounded-2xl p-6 -mx-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
            +
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand-text">
              {t('login.register_title')}
            </h2>
            <p className="text-xs text-brand-muted">
              {t('login.register_subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} noValidate className="space-y-4">
          {checkEmail && (
            <div className="p-4 rounded-2xl bg-brand-verified/10 border border-brand-verified/30 text-sm text-brand-text">
              <p className="font-semibold mb-1">{t('login.signup_check_email_title')}</p>
              <p className="text-brand-muted">{t('login.signup_check_email_desc', { email })}</p>
            </div>
          )}
          {error && <FormErrorSummary errors={[error]} title={errorTitle} />}

          <div>
            <label htmlFor="firstName" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('login.first_name_label')}
            </label>
            <input
              id="firstName"
              type="text"
              placeholder={t('login.first_name_placeholder')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('login.whatsapp_label')}
            </label>
            <input
              id="whatsapp"
              type="tel"
              placeholder={t('login.whatsapp_placeholder')}
              value={whatsapp}
              onChange={handleWaChange}
              required
              className={`w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors ${waError ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : 'border-brand-border'}`}
            />
            {waError && <p className="text-red-500 text-sm mt-1">{waError}</p>}
            {!waError && <p className="text-xs text-brand-muted mt-1">{t('login.whatsapp_hint')}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('login.email_label')}
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder={t('login.email_reg_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full py-3 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('login.password_label')}
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.password_placeholder_reg')}
                value={password}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                required
                className={`w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors ${passwordError ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : 'border-brand-border'}`}
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
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('login.confirm_password_label')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('login.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={handleConfirmChange}
                autoComplete="new-password"
                required
                className={`w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors ${confirmError ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : 'border-brand-border'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                tabIndex={-1}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
            {confirmError && <p className="text-red-500 text-sm mt-1">{confirmError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 ${loadingBtnClass}`}
          >
            {loading && <SpinnerIcon />}
            {loading ? t('login.register_processing') : t('login.register_submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-brand-muted">
          {t('login.has_account')}{' '}
          <Link to="/login" className="font-semibold text-brand-primary hover:text-brand-accent transition-colors">
            {t('login.login_link')}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
