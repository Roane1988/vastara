import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User,
  LogOut,
  Loader2,
  Save,
  Info,
  Heart,
  LayoutDashboard,
  Home,
  AlertCircle,
  Check,
  ChevronDown,
  Lock,
  Wallet,
  UserCheck,
  BellRing,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { isRateLimitError } from '../utils/authErrors'
import { useSavedSearchAlerts } from '../context/SavedSearchAlertsContext'
import FinancialProfileForm from './FinancialProfileForm'
import SlideOver from './SlideOver'
import SavedPropertiesList from './SavedPropertiesList'

const inputClass =
  'w-full border border-brand-border rounded-lg py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted'

const labelClass = 'text-[10px] font-bold text-brand-muted mb-1 block uppercase tracking-wide'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_LABELS = { admin: 'Admin Internal', agent: 'Agen', developer: 'Developer' }

function Collapsible({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 py-3.5 px-4 text-left hover:bg-brand-bg/50 transition-colors"
      >
        <span className="text-brand-muted shrink-0">{icon}</span>
        <span className="flex-1 font-semibold text-brand-text text-sm">{title}</span>
        <ChevronDown size={16} className={`text-brand-muted shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export default function ProfileDrawer({ isOpen, onClose, userName }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role, showToast } = useAuth()
  const { totalNew } = useSavedSearchAlerts()

  const [name, setName] = useState(userName || '')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [currentEmail, setCurrentEmail] = useState('')
  const [dirty, setDirty] = useState(false)
  const [financeOpenKey, setFinanceOpenKey] = useState(0)

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const notify = useCallback((message, type) => {
    setNotification({ show: true, message, type })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPassword('')
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return

        const authEmail = user.email || ''
        let loadedName = user.user_metadata?.first_name || ''
        let loadedEmail = authEmail
        let loadedWhatsapp = user.user_metadata?.whatsapp || ''

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('first_name, role')
          .eq('id', user.id)
          .single()
        if (profileErr && profileErr.code !== 'PGRST116') {
          console.warn('Gagal memuat profil', profileErr.message)
        }

        if (!cancelled && profile) {
          if (profile.first_name) loadedName = profile.first_name
        }

        const { data: myProfile } = await supabase.rpc('get_my_profile')
        if (!cancelled && myProfile) {
          if (myProfile.email) loadedEmail = myProfile.email
          if (myProfile.whatsapp) loadedWhatsapp = myProfile.whatsapp
        }

        if (!cancelled) {
          setName(loadedName)
          setEmail(loadedEmail)
          setWhatsapp(loadedWhatsapp)
          setCurrentEmail(loadedEmail)
          setDirty(false)
        }
      } catch {
        if (!cancelled) notify('Gagal memuat profil. Coba lagi.', 'error')
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, notify])

  useEffect(() => {
    if (!notification.show) return
    const timer = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
    return () => clearTimeout(timer)
  }, [notification.show])

  useEffect(() => {
    const openFinance = () => setFinanceOpenKey(k => k + 1)
    window.addEventListener('open-financial-profile', openFinance)
    return () => window.removeEventListener('open-financial-profile', openFinance)
  }, [])

  const initial = (name || userName || 'U').charAt(0).toUpperCase()
  const roleLabel = ROLE_LABELS[role] || 'Pembeli'

  const isEmailChanged = currentEmail !== '' && email.trim() !== currentEmail
  const emailInvalid = email.trim() !== '' && !EMAIL_RE.test(email.trim())
  const isSaveDisabled = saving || !name.trim() || !email.trim() || emailInvalid || (isEmailChanged && !currentPassword.trim())

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm(t('profileDrawer.unsaved_warning'))) return false
    onClose()
    return true
  }, [dirty, onClose, t])
  const handleNavigate = (path) => {
    if (!requestClose()) return
    navigate(path)
  }

  async function handleSave() {
    if (saving) return
    if (!name.trim() || !email.trim() || emailInvalid) return
    if (isEmailChanged && !currentPassword.trim()) {
      notify(t('profileDrawer.password_required'), 'error')
      return
    }

    setSaving(true)
    notify(t('profileDrawer.verifying'), 'info')

    try {
      const authUpdates = { data: { first_name: name, whatsapp } }

      if (isEmailChanged) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        })

        if (signInError) {
          if (isRateLimitError(signInError)) {
            showToast(t('login.too_many_attempts'), 'error')
          } else {
            notify(t('profileDrawer.wrong_password'), 'error')
          }
          return
        }

        authUpdates.email = email.trim()
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        notify(t('profileDrawer.session_expired'), 'error')
        return
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdates)
      if (authError) {
        if (isRateLimitError(authError)) {
          showToast(t('login.too_many_attempts'), 'error')
        } else {
          notify(authError.message, 'error')
        }
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: name,
          email: email.trim(),
          whatsapp,
        })
        .eq('id', user.id)

      if (profileError) {
        notify(profileError.message, 'error')
        return
      }

      setCurrentPassword('')
      setCurrentEmail(email.trim())
      setDirty(false)
      notify(t('profileDrawer.save_success'), 'success')
    } catch (err) {
      notify(err.message || 'Terjadi kesalahan saat menyimpan profil', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (pwSaving) return
    if (!pwCurrent || !pwNew) {
      setPwError(t('profileDrawer.pw_fill_all'))
      return
    }
    if (pwNew.length < 8) {
      setPwError(t('profileDrawer.pw_too_short'))
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError(t('profileDrawer.pw_mismatch'))
      return
    }

    setPwSaving(true)
    setPwError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: pwCurrent,
      })
      if (signInError) {
        if (isRateLimitError(signInError)) {
          showToast(t('login.too_many_attempts'), 'error')
        } else {
          setPwError(t('profileDrawer.pw_wrong_current'))
        }
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: pwNew })
      if (updateError) {
        if (isRateLimitError(updateError)) {
          showToast(t('login.too_many_attempts'), 'error')
        } else {
          setPwError(updateError.message)
        }
        return
      }

      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      notify(t('profileDrawer.pw_success'), 'success')
    } catch (err) {
      setPwError(err.message || t('profileDrawer.pw_generic_error'))
    } finally {
      setPwSaving(false)
    }
  }

  async function handleLogout() {
    if (!requestClose()) return
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      notify(err.message || 'Gagal keluar. Coba lagi.', 'error')
      setLoggingOut(false)
      return
    }
    navigate('/')
  }

  return (
    <SlideOver isOpen={isOpen} onClose={requestClose} title={t('profileDrawer.title')}>
      {notification.show && (
        <div className={`rounded-lg px-4 py-3 shadow-sm text-sm font-medium flex items-center gap-2 ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : notification.type === 'info'
              ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
              : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <Check size={16} />
          ) : notification.type === 'info' ? (
            <Info size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border border-brand-border">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-base font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-text truncate">{name || 'Pengguna'}</p>
          <p className="text-[11px] text-brand-muted truncate">{email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 text-[#1E3A5F] border border-[#1E3A5F]/15">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
        <Collapsible title={t('profileDrawer.section_account')} icon={<User size={16} />} defaultOpen>
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className={labelClass}>{t('profileDrawer.name_label')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setDirty(true) }}
                placeholder={t('profileDrawer.name_placeholder')}
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('profileDrawer.email_label')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setDirty(true) }}
                placeholder={t('profileDrawer.email_placeholder')}
                autoComplete="email"
                className={inputClass}
              />
              {emailInvalid && (
                <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  {t('profileDrawer.email_invalid')}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>{t('profileDrawer.whatsapp_label')}</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setDirty(true) }}
                placeholder={t('profileDrawer.whatsapp_placeholder')}
                autoComplete="tel"
                className={inputClass}
              />
              <p className="text-[10px] text-brand-muted mt-1.5">{t('profileDrawer.whatsapp_hint')}</p>
            </div>
            {isEmailChanged && (
              <div>
                <label className={labelClass}>{t('profileDrawer.password_hint')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('profileDrawer.password_placeholder')}
                  autoComplete="current-password"
                  className={inputClass}
                />
                <p className="text-[10px] text-brand-muted mt-1.5">{t('profileDrawer.password_required_hint')}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="w-full py-3 rounded-lg font-bold text-white bg-brand-primary hover:brightness-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('profileDrawer.saving') : t('profileDrawer.save_changes')}
            </button>
          </div>
        </Collapsible>

        <Collapsible title={t('profileDrawer.section_password')} icon={<Lock size={16} />}>
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className={labelClass}>{t('profileDrawer.pw_current')}</label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('profileDrawer.pw_new')}</label>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <p className="text-[10px] text-brand-muted mt-1.5">{t('profileDrawer.pw_new_hint')}</p>
            </div>
            <div>
              <label className={labelClass}>{t('profileDrawer.pw_confirm')}</label>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            {pwError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                <AlertCircle size={11} className="shrink-0" />
                {pwError}
              </p>
            )}
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="w-full py-3 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {pwSaving ? t('profileDrawer.pw_saving') : t('profileDrawer.pw_submit')}
            </button>
          </div>
        </Collapsible>

        <Collapsible key={financeOpenKey} title={t('profileDrawer.section_finance')} icon={<Wallet size={16} />} defaultOpen={financeOpenKey > 0}>
          <div className="px-4 pb-4">
            <FinancialProfileForm showTitle={false} />
          </div>
        </Collapsible>

        <Collapsible title={t('profileDrawer.section_saved')} icon={<Heart size={16} />}>
          <div className="px-4 pb-4">
            <SavedPropertiesList
              emptyText={t('profileDrawer.no_saved')}
              emptyCtaLabel={t('profileDrawer.saved_empty_cta')}
              onEmptyCta={() => handleNavigate('/')}
              onItemClick={handleNavigate}
            />
          </div>
        </Collapsible>
      </div>

      <div className="rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
        <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-brand-muted uppercase tracking-wider">
          {t('profileDrawer.menu_title')}
        </p>
        {role === 'admin' && (
          <button
            type="button"
            onClick={() => handleNavigate('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors"
          >
            <LayoutDashboard size={18} className="text-brand-primary shrink-0" />
            Dashboard Admin
          </button>
        )}
        {role === 'agent' && (
          <button
            type="button"
            onClick={() => handleNavigate('/agent-profile')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors"
          >
            <UserCheck size={18} className="text-brand-primary shrink-0" />
            Profil Agen
          </button>
        )}
        <button
          type="button"
          onClick={() => handleNavigate('/my-listings')}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors"
        >
          <Home size={18} className="text-brand-primary shrink-0" />
          Iklan Saya
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('/saved-searches')}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors"
        >
          <BellRing size={18} className="text-brand-primary shrink-0" />
          <span className="flex-1 text-left">Pencarian Tersimpan</span>
          {totalNew > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-brand-danger text-white text-[10px] font-bold flex items-center justify-center">
              {totalNew > 99 ? '99+' : totalNew}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('/price-trends')}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors"
        >
          <TrendingUp size={18} className="text-brand-primary shrink-0" />
          Tren Harga
        </button>
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {loggingOut ? t('profileDrawer.logging_out') : t('profileDrawer.log_out')}
        </button>
      </div>
    </SlideOver>
  )
}
