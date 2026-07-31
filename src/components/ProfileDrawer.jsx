import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { getFavorites } from '../utils/favorites'
import { getImageSrc } from '../utils/images'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import FinancialProfileForm from './FinancialProfileForm'

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
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

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

export default function ProfileDrawer({ isOpen, onClose, userName }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [name, setName] = useState(userName || '')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [currentEmail, setCurrentEmail] = useState('')
  const [savedProperties, setSavedProperties] = useState([])
  const [role, setRole] = useState('')
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const favIds = getFavorites()
    if (favIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!cancelled) setSavedProperties([])
      return
    }
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, image_url')
          .in('id', favIds)
        if (!cancelled) {
          if (error) {
            setSavedProperties(DUMMY_PROPERTIES.filter((p) => favIds.includes(p.id)))
          } else if (data) {
            setSavedProperties(data)
          } else {
            setSavedProperties([])
          }
        }
      } catch {
        if (!cancelled) setSavedProperties(DUMMY_PROPERTIES.filter((p) => favIds.includes(p.id)))
      }
    })()
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPassword('')
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled && user) {
          const authEmail = user.email || ''
          setEmail(authEmail)
          setCurrentEmail(authEmail)

          if (user.user_metadata?.first_name) {
            setName(user.user_metadata.first_name)
          }
          setWhatsapp(user.user_metadata?.whatsapp || '')

          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, email, whatsapp, role')
            .eq('id', user.id)
            .single()

          if (!cancelled && profile) {
            if (profile.first_name) setName(profile.first_name)
            if (profile.email) setEmail(profile.email)
            if (profile.whatsapp) setWhatsapp(profile.whatsapp)
            if (profile.role) setRole(profile.role)
          }
        }
      } catch {
        if (!cancelled) console.warn('Gagal memuat profil')
      }
    })()
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => {
    if (!notification.show) return
    const timer = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
    return () => clearTimeout(timer)
  }, [notification.show])

  const isSaveDisabled = saving || !name.trim() || !email.trim() || !currentPassword.trim()

  const notify = useCallback((message, type) => {
    setNotification({ show: true, message, type })
  }, [])

  async function handleSave() {
    if (!name.trim() || !email.trim() || !currentPassword.trim()) return

    setSaving(true)
    notify(t('profileDrawer.verifying'), 'info')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      })

      if (!isMountedRef.current) return

      if (signInError) {
        notify(t('profileDrawer.wrong_password'), 'error')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!isMountedRef.current) return

      if (!user) {
        notify(t('profileDrawer.session_expired'), 'error')
        return
      }

      const authUpdates = { data: { first_name: name, whatsapp } }
      if (email !== currentEmail) {
        authUpdates.email = email
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdates)
      if (!isMountedRef.current) return

      if (authError) {
        notify(authError.message, 'error')
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: name,
          email,
          whatsapp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (!isMountedRef.current) return

      if (profileError) {
        notify(profileError.message, 'error')
        return
      }

      setCurrentPassword('')
      setCurrentEmail(email)
      notify(t('profileDrawer.save_success'), 'success')
    } catch (err) {
      notify(err.message || 'Terjadi kesalahan saat menyimpan profil', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose() }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-brand-surface z-[100] flex flex-col shadow-xl border-l border-brand-border"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-border">
              <h2 className="text-2xl font-bold text-brand-text">{t('profileDrawer.title')}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-brand-muted hover:text-brand-text transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {notification.show && (
                <div className={`rounded-lg px-4 py-3 shadow-sm text-sm font-medium flex items-center gap-2 ${
                  notification.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : notification.type === 'info'
                      ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                      : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {notification.type === 'success' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : notification.type === 'info' ? (
                    <InfoIcon />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  {notification.message}
                </div>
              )}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon />
                  <h3 className="font-semibold text-brand-text">{t('profileDrawer.section_title')}</h3>
                  {role === 'admin' && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF4FD] text-[#1E3A5F] border border-[#1E3A5F]/20">
                      Admin Internal
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                        <label className="text-[10px] font-bold text-brand-muted mb-1 block uppercase tracking-wide">{t('profileDrawer.name_label')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('profileDrawer.name_placeholder')}
                      className="w-full border border-brand-border rounded-lg py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-brand-muted mb-1 block uppercase tracking-wide">{t('profileDrawer.email_label')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('profileDrawer.email_placeholder')}
                      className="w-full border border-brand-border rounded-lg py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-brand-muted mb-1 block uppercase tracking-wide">{t('profileDrawer.whatsapp_label')}</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder={t('profileDrawer.whatsapp_placeholder')}
                      className="w-full border border-brand-border rounded-lg py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                    />
                  </div>
                </div>
              </section>

              <section>
                <FinancialProfileForm showTitle={false} />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#4A90E2" stroke="#4A90E2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <h3 className="font-semibold text-brand-text">{t('profileDrawer.saved_title')}</h3>
                </div>
                {savedProperties.length === 0 ? (
                  <p className="text-sm text-brand-muted text-center py-6">{t('profileDrawer.no_saved')}</p>
                ) : (
                  <div className="space-y-2">
                    {savedProperties.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { onClose(); navigate(`/property/${p.id}`) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#EDF4FD] hover:text-[#1E3A5F] transition-colors text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-brand-bg flex-shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={getImageSrc(p.image_url)} alt="" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' }} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">img</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">{p.title}</p>
                          <p className="text-xs text-brand-muted mt-0.5">
                            {p.priceDisplay
                              ? p.priceDisplay
                              : p.price != null
                                ? `Rp ${Number(p.price).toLocaleString('id-ID')}`
                                : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {role === 'admin' && (
                <section>
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate('/admin') }}
                    className="w-full flex items-center gap-3 py-3 px-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] rounded-xl transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Dashboard Admin
                  </button>
                </section>
              )}
              <section>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate('/my-listings') }}
                  className="w-full flex items-center gap-3 py-3 px-3 text-sm font-semibold text-brand-text hover:bg-[#EDF4FD] hover:text-[#1E3A5F] rounded-xl transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Iklan Saya
                </button>
              </section>

              <section>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true)
                    await supabase.auth.signOut()
                    onClose()
                    navigate('/')
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50  rounded-xl transition-colors disabled:opacity-50"
                >
                  {loggingOut ? <SpinnerIcon /> : <LogOutIcon />}
                  {loggingOut ? t('profileDrawer.logging_out') : t('profileDrawer.log_out')}
                </button>
              </section>
            </div>

            <div className="mt-auto sticky bottom-0 bg-brand-surface p-4 border-t border-brand-border space-y-3">
              <div>
                <label className="text-[10px] font-bold text-brand-muted mb-1 block uppercase tracking-wide">{t('profileDrawer.password_hint')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('profileDrawer.password_placeholder')}
                  className="w-full border border-brand-border rounded-lg py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="w-full py-3.5 rounded-lg font-bold text-white bg-brand-primary hover:brightness-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <SpinnerIcon /> : <SaveIcon />}
                {saving ? t('profileDrawer.saving') : t('profileDrawer.save_changes')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
