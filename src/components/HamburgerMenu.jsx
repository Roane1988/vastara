import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bookmark,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Plus,
  Search,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SlideOver from './SlideOver'
import SavedPropertiesList from './SavedPropertiesList'

function MenuItem({ icon, label, onClick, active, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
        destructive
          ? 'text-[#DC2626] hover:bg-red-50'
          : active
            ? 'text-[#1E3A5F] bg-[#EDF4FD] font-semibold'
            : 'text-brand-muted hover:bg-[#EDF4FD] hover:text-[#1E3A5F]'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function SavedDrawer({ onBack }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
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

export default function HamburgerMenu({ isOpen, onClose, isAuth, userName, onProfileOpen, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { role } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)

  const initial = userName?.charAt(0)?.toUpperCase() || 'U'

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
    try {
      await onLogout?.()
    } finally {
      onClose()
    }
  }

  const exploreActive = pathname === '/' || pathname === '/explore'
  const chatActive = pathname === '/chat'
  const adminActive = pathname === '/admin'

  const menuContent = (
    <div className="px-4 py-5 space-y-6">
      {isAuth ? (
        <button
          type="button"
          onClick={handleProfile}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-brand-bg border border-brand-border cursor-pointer transition-colors hover:bg-gray-100 active:bg-gray-200 text-left"
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
        <button
          type="button"
          onClick={() => handleNavigate('/login')}
          className="w-full py-3 rounded-xl bg-brand-primary hover:brightness-90 active:scale-[0.97] text-white text-sm font-bold transition-all duration-200 shadow-sm"
        >
          {t('hamburger.login')}
        </button>
      )}

      <div>
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-4 mb-2">{t('hamburger.general')}</p>
        <div className="space-y-0.5">
          <MenuItem
            icon={<Bookmark size={18} />}
            label={t('hamburger.saved')}
            onClick={() => setSavedOpen(true)}
          />
        </div>
      </div>

      <div className="border-t border-brand-border pt-4">
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-4 mb-2">{t('hamburger.main_menu')}</p>
        <div className="space-y-0.5">
          <MenuItem
            icon={<Search size={18} />}
            label={t('hamburger.explore')}
            active={exploreActive}
            onClick={() => handleNavigate('/')}
          />
          <MenuItem
            icon={<MessageCircle size={18} />}
            label={t('hamburger.chat')}
            active={chatActive}
            onClick={() => handleNavigate('/chat')}
          />
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
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-4 mb-2">{t('hamburger.settings')}</p>
        <div className="space-y-0.5">
          {isAuth && (
            <MenuItem
              icon={<LogOut size={18} />}
              label={loggingOut ? t('hamburger.logging_out') : t('hamburger.log_out')}
              destructive
              onClick={handleLogout}
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
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
        {savedOpen ? <SavedDrawer onBack={() => setSavedOpen(false)} /> : menuContent}
      </div>
    </SlideOver>
  )
}
