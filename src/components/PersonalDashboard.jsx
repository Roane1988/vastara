import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NotificationDrawer from './NotificationDrawer'

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

function StatusBadge({ status }) {
  const colors = {
    Tersedia: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Sedang Nego': 'bg-orange-50 text-orange-600 border-orange-100',
  }
  const label = status === 'verified' ? 'Tersedia' : 'Sedang Nego'
  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${colors[label] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {label}
    </span>
  )
}

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

function PropertyCard({ property }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-medium overflow-hidden">
        {property.image_url ? (
          <img src={property.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          'img'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{property.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatPrice(property.price)}</p>
      </div>
      <StatusBadge status={property.status} />
    </div>
  )
}

export default function PersonalDashboard({ onNavigate, userName, onProfileOpen }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [savedProperties, setSavedProperties] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .in('status', ['verified', 'pending'])
        .order('created_at', { ascending: false })

      if (properties) {
        setSavedProperties(properties.slice(0, 3))
        setRecommendations(
          [...properties]
            .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
            .slice(0, 3)
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">

        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onProfileOpen?.()} className="focus-visible:ring-2 focus-visible:ring-orange-500 rounded-full">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                {userName?.charAt(0)}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : savedProperties.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                  Belum ada properti disimpan
                </p>
              ) : (
                savedProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rekomendasi untukmu</h2>
              <button type="button" onClick={() => onNavigate?.('saved')} className="text-orange-500 text-sm font-semibold hover:text-orange-600 cursor-pointer outline-none border-none ring-0">
                Lihat Semua
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
              {loading ? (
                <div className="flex items-center justify-center py-8 w-full">
                  <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recommendations.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8 w-full">
                  Belum ada rekomendasi
                </p>
              ) : (
                recommendations.map((r) => (
                  <div
                    key={r.id}
                    className="flex-shrink-0 w-56 sm:w-60 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 snap-start hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <div className="w-full h-24 rounded-lg bg-gradient-to-br from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-700 mb-3 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 overflow-hidden">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        'Thumbnail'
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatPrice(r.price)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <ShieldIcon />
                      <span className="text-[10px] font-medium text-emerald-600">
                        {r.status === 'verified' ? 'Verified Legal' : 'Listing Baru'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
