import { useState } from 'react'
import ProfileDrawer from './ProfileDrawer'
import NotificationDrawer from './NotificationDrawer'

// ─── Sample Data (TODO: Replace with Supabase queries) ───────────────

const SAVED_PROPERTIES = [
  { id: 1, name: 'Rumah BSD Minimalis', price: 'Rp 1,2 M', status: 'Tersedia', thumb: null },
  { id: 2, name: 'Apartemen SCBD 2BR', price: 'Rp 850 Jt', status: 'Sedang Nego', thumb: null },
  { id: 3, name: 'Villa Puncak Hijau', price: 'Rp 2,1 M', status: 'Tersedia', thumb: null },
]

// TODO: Fetch from Supabase saved_properties table
// TODO: Fetch from Supabase recommendations table
const RECOMMENDATIONS = [
  { id: 1, name: 'Cluster Mutiara Gading', price: 'Rp 1,8 M', badge: 'Verified Legal' },
  { id: 2, name: 'The Kayoon Southgate', price: 'Rp 2,3 M', badge: 'Verified Legal' },
  { id: 3, name: 'Botania Lake Residence', price: 'Rp 1,5 M', badge: 'Verified Legal' },
]

// ─── SVG Icons ────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    Tersedia: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Sedang Nego': 'bg-orange-50 text-orange-600 border-orange-100',
  }
  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${colors[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {status}
    </span>
  )
}

function PropertyCard({ property }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        {property.thumb ? <img src={property.thumb} alt="" className="w-full h-full object-cover rounded-lg" /> : 'img'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{property.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{property.price}</p>
      </div>
      <StatusBadge status={property.status} />
    </div>
  )
}

// ─── Promo Banner ─────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-orange-500/15 min-h-[220px] sm:min-h-[260px] flex flex-col justify-end">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/30" />
      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">
          🔥 Hot Deal
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-white">Cluster Mewah BSD Diskon 10%</h3>
        <p className="text-sm sm:text-base text-slate-300 mt-1 mb-5">Terbatas hanya minggu ini.</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"
              alt="Aqsha"
              className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
            />
            <div>
              <p className="text-xs text-slate-300">Direkomendasikan oleh</p>
              <p className="text-sm font-bold text-white">Aqsha (Senior Agent)</p>
            </div>
          </div>
          <button
            type="button"
            className="bg-white text-slate-900 rounded-xl px-5 py-2.5 text-sm font-bold active:scale-95 transition-transform hover:bg-slate-100"
          >
            Lihat Promo
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Bottom Navbar ─────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MobileBottomNav({ onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-16">
        <button
          type="button"
          onClick={() => onNavigate?.('explore')}
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <SearchIcon />
          <span className="text-[10px] font-medium">Eksplor</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('saved')}
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-orange-500 font-semibold hover:brightness-110"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('chat')}
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 relative"
        >
          <div className="relative">
            <ChatIcon />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </div>
          <span className="text-[10px] font-medium">Chat</span>
        </button>
      </div>
    </nav>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────

export default function PersonalDashboard({ onNavigate, userName }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">

        {/* ─── Header ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsProfileOpen(true)} className="focus-visible:ring-2 focus-visible:ring-orange-500 rounded-full">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                {userName.charAt(0)}
              </div>
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200">
                Selamat datang kembali, {userName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dashboard Pembeli</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsNotificationsOpen(true)} className="relative p-2 rounded-xl hover:bg-white/70 dark:hover:bg-slate-800/70 text-slate-500 dark:text-slate-400 transition-colors">
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-[#FAFAFA] dark:ring-slate-950" />
          </button>
        </header>

        {/* ─── Promo Banner ─────────────────────────────────────── */}
        <div className="mb-5">
          <PromoBanner />
        </div>

        {/* ─── Bento Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

          {/* ─── Wishlist (col-span-2) ─────────────────────────── */}
          <div className="md:col-span-2 row-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookmarkIcon />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Properti Disimpan</h2>
              </div>
              <button type="button" onClick={() => onNavigate?.('saved')} className="text-orange-500 text-sm font-semibold hover:text-orange-600 cursor-pointer outline-none border-none ring-0">
                Lihat Semua
              </button>
            </div>
            <div className="space-y-4">
              {SAVED_PROPERTIES.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
            {/* TODO: Fetch from Supabase saved_properties table */}
          </div>

          {/* ─── Smart Recommendations (full width bottom) ────── */}
          <div className="md:col-span-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rekomendasi untukmu</h2>
              <button type="button" onClick={() => onNavigate?.('saved')} className="text-orange-500 text-sm font-semibold hover:text-orange-600 cursor-pointer outline-none border-none ring-0">
                Lihat Semua
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
              {RECOMMENDATIONS.map((r) => (
                <div
                  key={r.id}
                  className="flex-shrink-0 w-56 sm:w-60 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 snap-start hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="w-full h-24 rounded-lg bg-gradient-to-br from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-700 mb-3 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Thumbnail
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.price}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ShieldIcon />
                    <span className="text-[10px] font-medium text-emerald-600">{r.badge}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* TODO: Fetch from Supabase recommendations table */}
          </div>

        </div>
      </div>

      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} onLogout={() => onNavigate?.('login')} userName={userName} />
      <MobileBottomNav onNavigate={onNavigate} />
    </div>
  )
}
