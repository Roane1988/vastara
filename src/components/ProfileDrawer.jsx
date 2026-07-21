import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const navigate = useNavigate()

  const [name, setName] = useState(userName || '')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [currentEmail, setCurrentEmail] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setCurrentPassword('')
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const authEmail = user.email || ''
      setEmail(authEmail)
      setCurrentEmail(authEmail)

      if (user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name)
      }
      setWhatsapp(user.user_metadata?.whatsapp || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, whatsapp')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.full_name) setName(profile.full_name)
        if (profile.email) setEmail(profile.email)
        if (profile.whatsapp) setWhatsapp(profile.whatsapp)
      }
    })()
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
    notify('Memverifikasi & Menyimpan...', 'info')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    })

    if (signInError) {
      notify('Password salah', 'error')
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      notify('Sesi tidak ditemukan, silakan login ulang', 'error')
      setSaving(false)
      return
    }

    const authUpdates = { data: { full_name: name, whatsapp } }
    if (email !== currentEmail) {
      authUpdates.email = email
    }

    const { error: authError } = await supabase.auth.updateUser(authUpdates)

    if (authError) {
      notify(authError.message, 'error')
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        email,
        whatsapp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      notify(profileError.message, 'error')
      setSaving(false)
      return
    }

    setCurrentPassword('')
    setCurrentEmail(email)
    setSaving(false)
    notify('Perubahan berhasil disimpan', 'success')
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white  z-[100] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 ">
              <h2 className="text-2xl font-bold text-slate-900">Informasi Pribadi</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600  transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {notification.show && (
                <div className={`rounded-lg px-4 py-3 shadow-lg text-sm font-medium flex items-center gap-2 ${
                  notification.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : notification.type === 'info'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                  <h3 className="font-semibold text-slate-800 ">Informasi Pribadi</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500  mb-1 block uppercase tracking-wide">Nama</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="w-full border border-gray-200  rounded-lg py-2.5 px-3 text-sm text-slate-900  bg-white  focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500  mb-1 block uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full border border-gray-200  rounded-lg py-2.5 px-3 text-sm text-slate-900  bg-white  focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500  mb-1 block uppercase tracking-wide">Nomor WhatsApp</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+628123456789"
                      className="w-full border border-gray-200  rounded-lg py-2.5 px-3 text-sm text-slate-900  bg-white  focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>
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
                  {loggingOut ? 'Logging out...' : 'Log Out'}
                </button>
              </section>
            </div>

            <div className="mt-auto sticky bottom-0 bg-white  p-4 border-t border-gray-100  space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500  mb-1 block uppercase tracking-wide">Masukkan Password untuk menyimpan perubahan</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full border border-gray-200  rounded-lg py-2.5 px-3 text-sm text-slate-900  bg-white  focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="w-full py-3.5 rounded-lg font-bold text-white bg-[#FF6B00] hover:bg-[#e86000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <SpinnerIcon /> : <SaveIcon />}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
