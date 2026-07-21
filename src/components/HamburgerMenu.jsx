import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function MenuItem({ icon, label, onClick, active, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
        destructive
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50'
          : active
            ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default function HamburgerMenu({ isOpen, onClose, isAuth, userName, onProfileOpen, onLogout }) {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleNavigate = (path) => {
    onClose()
    navigate(path)
  }

  const handleProfile = () => {
    onClose()
    onProfileOpen?.()
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    onLogout?.()
    onClose()
  }

  const initial = userName?.charAt(0)?.toUpperCase() || 'U'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm z-[70] bg-white dark:bg-slate-950 flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
              {isAuth ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pembeli</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavigate('/login')}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white text-sm font-bold transition-all shadow-sm shadow-orange-500/20"
                >
                  Login / Register
                </button>
              )}

              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2">Umum</p>
                <div className="space-y-0.5">
                  <MenuItem
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    }
                    label="Dashboard"
                    onClick={() => handleNavigate('/dashboard')}
                  />
                  <MenuItem
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    }
                    label="Tersimpan"
                    onClick={() => handleNavigate('/saved')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2">Menu Utama</p>
                <div className="space-y-0.5">
                  <MenuItem
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    }
                    label="Eksplor"
                    active
                    onClick={() => handleNavigate('/')}
                  />
                  <MenuItem
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    }
                    label="Chat"
                    onClick={() => handleNavigate('/chat')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-2">Pengaturan</p>
                <div className="space-y-0.5">
                  {isAuth && (
                    <MenuItem
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      }
                      label="Informasi Pribadi"
                      onClick={handleProfile}
                    />
                  )}
                  {isAuth && (
                    <MenuItem
                      icon={<LogOutIcon />}
                      label={loggingOut ? 'Logging out...' : 'Log Out'}
                      destructive
                      onClick={handleLogout}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/sell')
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white text-sm font-bold transition-all shadow-sm shadow-orange-500/20 sm:hidden"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Jual Properti
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
