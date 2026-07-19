import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// TODO: Fetch notifications from Supabase 'notifications' table
const NOTIFICATIONS = [
  {
    id: 1,
    type: 'legal',
    title: 'Verifikasi Dokumen Selesai',
    message: 'KTP dan NPWP Anda telah berhasil diverifikasi oleh tim legal kami.',
    timestamp: '5 menit yang lalu',
    unread: true,
    section: 'Hari Ini',
  },
  {
    id: 2,
    type: 'survey',
    title: 'Pengingat Survei Besok',
    message: 'Jangan lupa jadwal survei Anda di Cluster Mewah BSD pukul 10:00 WIB.',
    timestamp: '2 jam yang lalu',
    unread: true,
    section: 'Hari Ini',
  },
  {
    id: 3,
    type: 'promo',
    title: 'Wishlist Anda Turun Harga!',
    message: 'Rumah BSD Minimalis sedang diskon 5% minggu ini.',
    timestamp: '1 hari yang lalu',
    unread: false,
    section: 'Kemarin',
  },
]

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function MegaphoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

const ICON_MAP = {
  legal: { icon: ShieldIcon, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' },
  survey: { icon: CalendarIcon, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
  promo: { icon: MegaphoneIcon, bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-600 dark:text-orange-400' },
}

function NotificationCard({ notification }) {
  const config = ICON_MAP[notification.type] || ICON_MAP.promo
  const IconComponent = config.icon

  return (
    <div
      className={`relative flex gap-3 p-4 border-b border-gray-50 dark:border-slate-800 transition-colors ${
        notification.unread
          ? 'bg-orange-50/50 dark:bg-orange-500/5'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {notification.unread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500" />
      )}

      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
        <IconComponent />
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{notification.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{notification.timestamp}</p>
      </div>
    </div>
  )
}

export default function NotificationDrawer({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    // TODO: Update unread status in Supabase 'notifications' table
  }

  const sections = [...new Set(notifications.map((n) => n.section))]

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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 z-[60] shadow-2xl overflow-y-auto"
          >
            {/* ─── Header ──────────────────────────────────────── */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center justify-between px-4 pt-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifikasi</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XIcon />
                </button>
              </div>
              <div className="flex items-center justify-between px-4 pb-4 mt-2 border-b border-gray-100 dark:border-slate-800">
                <span />
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Tandai semua dibaca
                </button>
              </div>
            </div>

            {/* ─── Notification List ───────────────────────────── */}
            <div className="flex flex-col">
              {sections.map((section) => (
                <div key={section}>
                  <div className="sticky top-[88px] bg-gray-50/90 dark:bg-slate-800/90 backdrop-blur-sm py-1 px-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      {section}
                    </span>
                  </div>
                  {notifications
                    .filter((n) => n.section === section)
                    .map((n) => (
                      <NotificationCard key={n.id} notification={n} />
                    ))}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
