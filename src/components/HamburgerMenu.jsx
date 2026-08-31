import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bookmark,
  Check,
  Globe,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Plus,
  Scale,
  Search,
  BellRing,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSavedSearchAlerts } from '../context/SavedSearchAlertsContext'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useChatUnread } from '../hooks/useChatUnread'
import SlideOver from './SlideOver'
import SavedPropertiesList from './SavedPropertiesList'
import ConfirmModal from './ConfirmModal'

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
]

function MenuItem({ icon, label, onClick, active, destructive, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
        destructive
          ? 'text-brand-danger hover:bg-brand-danger/10'
          : active
            ? 'text-brand-primary bg-brand-highlight font-semibold'
            : 'text-brand-muted hover:bg-brand-highlight hover:text-brand-primary'
      }`}
    >
      {active && !destructive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-brand-accent" aria-hidden="true" />
      )}
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge}
    </button>
  )
}

function SavedDrawer({ onBack, reduced }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute inset-0 z-10 bg-brand-surface flex flex-col"
    >
      <div className="flex items-center gap-3 px-5 h-14 border-b border-brand-border">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('hamburger.back')}
          className="p-1 -ml-1 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-brand-text">{t('hamburger.saved_title')}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <SavedPropertiesList emptyText={t('hamburger.saved_empty')} showAddress />
      </div>
    </motion.div>
  )
}

function SectionHeader({ children }) {
  return (
    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-4 mb-2">{children}</p>
  )
}

export default function HamburgerMenu({ isOpen, onClose, isAuth, userName, onProfileOpen, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { role, user } = useAuth()
  const reduced = usePrefersReducedMotion()
  const { unread } = useChatUnread(user?.id)
  const { totalNew: savedNew } = useSavedSearchAlerts()

  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const initial = userName?.charAt(0)?.toUpperCase() || 'U'
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  const handleNavigate = (path) => {
    onClose()
    navigate(path)
  }

  const handleChat = () => {
    onClose()
    navigate('/chat')
  }

  const handleProfile = () => {
    onClose()
    onProfileOpen?.()
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await onLogout?.()
    } catch {
      /* fall through to cleanup regardless */
    } finally {
      setLogoutOpen(false)
      onClose()
    }
  }

  const exploreActive = pathname === '/' || pathname === '/explore'
  const chatActive = pathname === '/chat'
  const forumActive = pathname.startsWith('/forum')
  const myListingsActive = pathname === '/my-listings'
  const adminActive = pathname === '/admin'
  const dashboardActive = pathname === '/dashboard'
  const compareActive = pathname === '/compare'

  const menuContent = (
    <div className="px-4 py-5 space-y-6">
      {isAuth ? (
        <button
          type="button"
          onClick={handleProfile}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand-bg border border-brand-border cursor-pointer transition-colors hover:bg-brand-highlight active:bg-brand-border text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text truncate">{userName}</p>
            <p className={`text-xs font-semibold ${role === 'admin' ? 'text-brand-accent' : 'text-brand-muted'}`}>
              {role === 'admin' ? t('hamburger.admin_label') : t('hamburger.buyer_label')}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleNavigate('/login')}
            className="flex-1 py-3 rounded-xl bg-brand-primary hover:brightness-90 active:scale-[0.97] text-white text-sm font-bold transition-all duration-200 shadow-sm"
          >
            {t('hamburger.login')}
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/login')}
            className="flex-1 py-3 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-highlight active:scale-[0.97] text-brand-text text-sm font-bold transition-all duration-200"
          >
            {t('hamburger.register')}
          </button>
        </div>
      )}

      <div>
        <SectionHeader>{t('hamburger.general')}</SectionHeader>
        <div className="space-y-0.5">
          <MenuItem
            icon={<Bookmark size={18} />}
            label={t('hamburger.saved')}
            onClick={() => setSavedOpen(true)}
          />
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <SectionHeader>{t('hamburger.main_menu')}</SectionHeader>
        <div className="space-y-0.5">
          <MenuItem
            icon={<Search size={18} />}
            label={t('hamburger.explore')}
            active={exploreActive}
            onClick={() => handleNavigate('/')}
          />
          {isAuth && (
            <MenuItem
              icon={<MessageCircle size={18} />}
              label={t('hamburger.chat')}
              active={chatActive}
              onClick={handleChat}
              badge={
                unread > 0 ? (
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-brand-danger text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null
              }
            />
          )}
          <MenuItem
            icon={<MessagesSquare size={18} />}
            label={t('hamburger.forum')}
            active={forumActive}
            onClick={() => handleNavigate('/forum')}
          />
          {isAuth && (
            <MenuItem
              icon={<Home size={18} />}
              label={t('hamburger.my_listings')}
              active={myListingsActive}
              onClick={() => handleNavigate('/my-listings')}
            />
          )}
          {isAuth && (
            <MenuItem
              icon={<LayoutGrid size={18} />}
              label={t('hamburger.dashboard')}
              active={dashboardActive}
              onClick={() => handleNavigate('/dashboard')}
            />
          )}
          {role === 'admin' && (
            <MenuItem
              icon={<LayoutGrid size={18} />}
              label={t('hamburger.admin')}
              active={adminActive}
              onClick={() => handleNavigate('/admin')}
            />
          )}
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <SectionHeader>{t('hamburger.tools')}</SectionHeader>
        <div className="space-y-0.5">
          <MenuItem
            icon={<Scale size={18} />}
            label={t('hamburger.compare')}
            active={compareActive}
            onClick={() => handleNavigate('/compare')}
          />
          {isAuth && (
            <MenuItem
              icon={<BellRing size={18} />}
              label={t('hamburger.saved_searches')}
              onClick={() => handleNavigate('/saved-searches')}
              badge={
                savedNew > 0 ? (
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-brand-danger text-white text-[10px] font-bold flex items-center justify-center">
                    {savedNew > 99 ? '99+' : savedNew}
                  </span>
                ) : null
              }
            />
          )}
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <SectionHeader>{t('hamburger.settings')}</SectionHeader>
        <div className="space-y-0.5">
          <div className="overflow-hidden">
            <MenuItem
              icon={<Globe size={18} />}
              label={`${t('hamburger.language')} — ${currentLang.label}`}
              onClick={() => setLangOpen((o) => !o)}
            />
            {langOpen && (
              <div className="ml-10 pr-3 pb-2 space-y-0.5">
                {LANGUAGES.map((lang) => {
                  const active = lang.code === i18n.language
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${
                        active
                          ? 'text-brand-primary font-semibold bg-brand-highlight'
                          : 'text-brand-muted hover:text-brand-text hover:bg-brand-highlight'
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
          {isAuth && (
            <MenuItem
              icon={<LogOut size={18} />}
              label={t('hamburger.log_out')}
              destructive
              onClick={() => setLogoutOpen(true)}
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        title={t('hamburger.menu')}
        footer={
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => handleNavigate(isAuth ? '/sell' : '/login')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary hover:brightness-90 active:scale-[0.97] text-white text-sm font-bold transition-all duration-200 shadow-sm"
            >
              <Plus size={16} />
              {t('hamburger.sell_property')}
            </button>
          </div>
        }
      >
        <div className="relative h-full">
          {savedOpen ? <SavedDrawer onBack={() => setSavedOpen(false)} reduced={reduced} /> : menuContent}
        </div>
      </SlideOver>

      <ConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title={t('hamburger.logout_title')}
        description={t('hamburger.logout_desc')}
        confirmText={t('hamburger.logout_confirm')}
        cancelText={t('hamburger.logout_cancel')}
        loading={loggingOut}
        icon={LogOut}
        zIndex={300}
      />
    </>
  )
}
