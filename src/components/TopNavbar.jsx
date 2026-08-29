import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, Check, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSavedSearchAlerts } from '../context/SavedSearchAlertsContext'
import { useChatUnread } from '../hooks/useChatUnread'

const HamburgerMenu = lazy(() => import('./HamburgerMenu'))

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
]

export default function TopNavbar({ isAuth, userName, onProfileOpen, onLogout }) {
  const { t, i18n } = useTranslation()
  const { role, user } = useAuth()
  const { totalNew } = useSavedSearchAlerts()
  const { unread: chatUnread, markRead: markChatRead } = useChatUnread(user?.id, 'navbar')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogoClick = () => {
    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    if (!langOpen) return
    const onClick = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setLangOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label="HuniOne beranda"
            className="flex items-center"
          >
            <img src="/huniOne.svg" alt="HuniOne" className="h-9 sm:h-10 w-auto object-contain" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-sm font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/sell')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:brightness-90 active:scale-[0.97] text-white text-sm font-bold transition-all duration-200 shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('navbar.sell_property')}
            </button>

            {isAuth && (
              <button
                type="button"
                onClick={() => { markChatRead(); navigate('/chat') }}
                className="relative p-2 rounded-xl text-brand-muted hover:bg-brand-bg hover:text-brand-text transition-colors"
                aria-label={t('navbar.chat')}
                title={t('navbar.chat')}
              >
                <MessageCircle size={20} />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-brand-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </button>
            )}

            {isAuth && (
              <button
                type="button"
                onClick={() => navigate('/saved-searches')}
                className="relative p-2 rounded-xl text-brand-muted hover:bg-brand-bg hover:text-brand-text transition-colors"
                aria-label={t('navbar.saved_searches')}
                title={t('navbar.saved_searches')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {totalNew > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-brand-danger text-white text-[10px] font-bold flex items-center justify-center shadow">
                    {totalNew > 99 ? '99+' : totalNew}
                  </span>
                )}
              </button>
            )}

            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                className="p-2 rounded-xl text-brand-muted hover:bg-brand-bg hover:text-brand-text transition-colors flex items-center gap-1"
                aria-label={t('navbar.language')}
                title={t('navbar.language')}
              >
                <Globe size={20} />
                <span className="hidden md:inline text-xs font-semibold uppercase">{i18n.language}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn">
                  {LANGUAGES.map((lang) => {
                    const active = lang.code === i18n.language
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                          active ? 'text-brand-primary font-semibold' : 'text-brand-muted hover:text-brand-text hover:bg-brand-highlight'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`uppercase text-[10px] font-bold w-6 h-6 rounded-md flex items-center justify-center ${
                            active ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-muted'
                          }`}>
                            {lang.code}
                          </span>
                          {lang.label}
                        </span>
                        {active && <Check size={14} className="shrink-0 text-brand-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-brand-muted hover:bg-brand-bg transition-colors"
              aria-label={t('navbar.open_menu')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <HamburgerMenu
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isAuth={isAuth}
          userName={userName}
          onProfileOpen={onProfileOpen}
          onLogout={onLogout}
        />
      </Suspense>
    </>
  )
}
