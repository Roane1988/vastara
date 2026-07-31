import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const HamburgerMenu = lazy(() => import('./HamburgerMenu'))

export default function TopNavbar({ isAuth, userName, onProfileOpen, onLogout }) {
  const { t } = useTranslation()
  const { role } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center"
          >
            <img src="/huniOne.svg" alt="HuniOne" className="h-20 w-auto object-contain" />
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
