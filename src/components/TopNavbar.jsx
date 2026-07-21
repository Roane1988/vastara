import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HamburgerMenu from './HamburgerMenu'

export default function TopNavbar({ isAuth, userName, onProfileOpen, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/sell')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-[#152d4a] active:scale-[0.97] text-white text-sm font-bold transition-all shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Jual Properti
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-brand-muted hover:bg-slate-100 transition-colors"
              aria-label="Buka menu"
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
