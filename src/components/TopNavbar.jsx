import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HamburgerMenu from './HamburgerMenu'

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
]

export default function TopNavbar({ isAuth, userName, onProfileOpen, onLogout }) {
  const { t, i18n } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  const navigate = useNavigate()

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const switchLang = (code) => {
    i18n.changeLanguage(code)
    setLangOpen(false)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-2xl font-extrabold tracking-tighter text-brand-primary"
          >
            Vastara
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-sm font-medium"
              >
                <GlobeIcon />
                <span className="hidden sm:inline">{currentLang.label}</span>
                <span className="sm:hidden uppercase">{currentLang.code}</span>
                <ChevronDownIcon />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-brand-surface border border-brand-border rounded-xl shadow-xl py-1.5 overflow-hidden z-50">
                  {LANGUAGES.map((lang) => {
                    const active = lang.code === i18n.language
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => switchLang(lang.code)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          active
                            ? 'text-brand-primary font-semibold bg-brand-bg'
                            : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`uppercase text-[10px] font-bold w-6 h-6 rounded-md flex items-center justify-center ${
                            active ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-muted'
                          }`}>
                            {lang.code}
                          </span>
                          {lang.label}
                        </div>
                        {active && <CheckIcon />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

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

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-brand-muted hover:bg-brand-bg transition-colors"
              aria-label={t('navbar.language')}
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

      <HamburgerMenu
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuth={isAuth}
        userName={userName}
        onProfileOpen={onProfileOpen}
        onLogout={onLogout}
      />
    </>
  )
}
