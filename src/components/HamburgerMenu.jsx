import { useState, useEffect } from 'react'
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

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

function MenuItem({ icon, label, onClick, active, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
        destructive
          ? 'text-red-500 hover:bg-red-50'
          : active
            ? 'text-orange-600 bg-orange-50'
            : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function SavedDrawer({ onBack }) {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['verified', 'pending'])
        .order('created_at', { ascending: false })
      if (!error && data) {
        setProperties(data)
      }
      setLoading(false)
    }
    fetchProperties()
  }, [])

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute inset-0 z-10 bg-white flex flex-col"
    >
      <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeftIcon />
        </button>
        <span className="text-sm font-semibold text-slate-900">Properti Disimpan</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">Belum ada properti disimpan</p>
        ) : (
          <div className="space-y-3">
            {properties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onBack()
                  navigate(`/property/${p.id}`)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatPrice(p.price)}</p>
                  {p.location && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.location}</p>
                  )}
                </div>
                <BookmarkIcon />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function HamburgerMenu({ isOpen, onClose, isAuth, userName, onProfileOpen, onLogout }) {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)

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
            className="fixed inset-y-0 right-0 w-full max-w-sm z-[70] bg-white flex flex-col shadow-2xl border-l border-slate-200"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <XIcon />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {savedOpen ? (
                <SavedDrawer onBack={() => setSavedOpen(false)} />
              ) : (
                <div className="absolute inset-0 overflow-y-auto px-4 py-5 space-y-6">
                  {isAuth ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                        <p className="text-xs text-slate-500">Pembeli</p>
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Umum</p>
                    <div className="space-y-0.5">
                      <MenuItem
                        icon={
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        }
                        label="Tersimpan"
                        onClick={() => setSavedOpen(true)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Menu Utama</p>
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

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Pengaturan</p>
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
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100">
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
