import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { isRateLimitError } from '../utils/authErrors'
import FormErrorSummary from '../components/FormErrorSummary'
import useSEO from '../hooks/useSEO'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function EyeIcon({ visible }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function UpdatePasswordPage() {
  const { t } = useTranslation()
  const { showToast } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  useSEO({
    title: t('update_password.page_title'),
    description: t('update_password.page_description'),
  })

  function validatePassword(value) {
    if (value && !PASSWORD_REGEX.test(value)) {
      setPasswordError(t('update_password.password_weak'))
      return false
    }
    setPasswordError('')
    return true
  }

  function handlePasswordChange(e) {
    const value = e.target.value
    setNewPassword(value)
    if (passwordError) validatePassword(value)
    if (confirmError && value === confirmPassword) setConfirmError('')
  }

  function handleConfirmChange(e) {
    const value = e.target.value
    setConfirmPassword(value)
    if (confirmError && newPassword === value) setConfirmError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const isPasswordValid = validatePassword(newPassword)
    if (!isPasswordValid) return

    if (newPassword !== confirmPassword) {
      setConfirmError(t('update_password.password_mismatch'))
      return
    }

    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword })

      if (authError) {
        if (isRateLimitError(authError)) {
          const msg = t('update_password.too_many_attempts')
          showToast(msg, 'error')
          setError(msg)
          return
        }
        setError(authError.message)
        return
      }

      showToast(t('update_password.success'), 'success')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const loadingBtnClass = loading
    ? 'relative overflow-hidden border-2 border-brand-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse'
    : ''

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 pt-4">
          <img src="/huniOne.svg" alt="HuniOne" className="h-32 md:h-48 w-auto object-contain mx-auto" />
          <p className="text-sm font-medium text-brand-primary/70 tracking-wide mt-1">
            {t('update_password.subtitle')}
          </p>
        </div>

        <h2 className="text-xl font-semibold text-brand-text text-center mb-2">
          {t('update_password.title')}
        </h2>
        <p className="text-sm text-brand-muted text-center mb-8">
          {t('update_password.desc')}
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && <FormErrorSummary errors={[error]} title={t('update_password.error_title')} />}

          <div>
            <label htmlFor="newPassword" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('update_password.new_password_label')}
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                placeholder={t('update_password.new_password_placeholder')}
                value={newPassword}
                onChange={handlePasswordChange}
                required
                className={`w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors ${passwordError ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : 'border-brand-border'}`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                tabIndex={-1}
              >
                <EyeIcon visible={showNew} />
              </button>
            </div>
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-medium text-brand-muted mb-1.5 block">
              {t('update_password.confirm_password_label')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('update_password.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={handleConfirmChange}
                required
                className={`w-full py-3 px-4 pr-10 text-sm text-brand-text bg-brand-surface border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors ${confirmError ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : 'border-brand-border'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                tabIndex={-1}
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {confirmError && <p className="text-red-500 text-sm mt-1">{confirmError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:brightness-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${loadingBtnClass}`}
          >
            {loading && <SpinnerIcon />}
            {loading ? t('update_password.processing') : t('update_password.submit')}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-brand-muted">
          <Link
            to="/login"
            className="font-semibold text-brand-primary hover:text-brand-accent transition-colors"
          >
            {t('update_password.back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
