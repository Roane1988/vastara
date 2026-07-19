import { useState } from 'react'
import ProfileDrawer from './ProfileDrawer'
import RescheduleBottomSheet from './RescheduleBottomSheet'
import NotificationDrawer from './NotificationDrawer'

// ─── Sample Data (TODO: Replace with Supabase queries) ───────────────

const SAVED_PROPERTIES = [
  { id: 1, name: 'Rumah BSD Minimalis', price: 'Rp 1,2 M', status: 'Tersedia', thumb: null },
  { id: 2, name: 'Apartemen SCBD 2BR', price: 'Rp 850 Jt', status: 'Sedang Nego', thumb: null },
  { id: 3, name: 'Villa Puncak Hijau', price: 'Rp 2,1 M', status: 'Tersedia', thumb: null },
]

// TODO: Fetch from Supabase saved_properties table
const SURVEY = {
  date: '22 Juli 2026',
  time: '10:00 WIB',
  location: 'BSD Green Village, Blok A5',
  agent: { name: 'Ahmad Fauzi', initials: 'AF' },
}

// TODO: Fetch from Supabase transaction_tracker table
const TRANSACTION_STEPS = [
  { label: 'Booking Fee Dibayar', status: 'done' },
  { label: 'Verifikasi Legal oleh Tim', status: 'active' },
  { label: 'Tanda Tangan Notaris', status: 'pending' },
]

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

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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

function StepIcon({ status }) {
  if (status === 'done') return <CheckCircleIcon />
  if (status === 'active') return <SpinnerIcon />
  return <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600" />
}

function TransactionStep({ step, index, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-6 h-6">
          <StepIcon status={step.status} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
      </div>
      <div className={`pb-5 ${isLast ? 'pb-0' : ''}`}>
        <p className={`text-sm ${step.status === 'pending' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
          {step.label}
        </p>
        {step.status === 'active' && (
          <p className="text-[11px] text-orange-500 mt-0.5">Sedang diproses...</p>
        )}
      </div>
    </div>
  )
}

// ─── Promo Banner ─────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-orange-500/15 min-h-[220px] sm:min-h-[260px]">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/30" />
      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-end h-full min-h-[220px] sm:min-h-[260px]">
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
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-orange-500 font-semibold"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('chat')}
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform text-slate-400 hover:text-slate-600 relative"
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

export default function PersonalDashboard({ onNavigate }) {
  // TODO: Fetch user profile from Supabase
  const userName = 'Roane'
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
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

          {/* ─── Survey Schedule (top right) ──────────────────── */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Jadwal Survei</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CalendarIcon />
                <span>{SURVEY.date} — {SURVEY.time}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MapPinIcon />
                <span>{SURVEY.location}</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 dark:from-slate-600 to-slate-400 dark:to-slate-500 flex items-center justify-center text-[10px] text-white font-semibold">
                  {SURVEY.agent.initials}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{SURVEY.agent.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Agent</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(true)}
                className="w-full mt-3 py-2 text-xs font-medium text-white bg-[#FF6B00] rounded-xl hover:bg-[#e86000] transition-colors"
              >
                Reschedule
              </button>
            </div>
            {/* TODO: Fetch from Supabase survey_schedule table */}
          </div>

          {/* ─── Transaction & Legal Tracker (bottom right) ───── */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 sm:p-6 shadow-sm shadow-emerald-500/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Transaksi Aktif</h2>
            </div>

            <div className="mt-1">
              {TRANSACTION_STEPS.map((step, i) => (
                <TransactionStep
                  key={step.label}
                  step={step}
                  index={i}
                  isLast={i === TRANSACTION_STEPS.length - 1}
                />
              ))}
            </div>
            {/* TODO: Fetch from Supabase transaction_tracker table */}
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
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} onLogout={() => onNavigate?.('login')} />
      <RescheduleBottomSheet
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        agent={SURVEY.agent}
      />
      <MobileBottomNav onNavigate={onNavigate} />
    </div>
  )
}
