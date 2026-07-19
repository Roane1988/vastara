import { AnimatePresence, motion } from 'framer-motion'

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function ProfileDrawer({ isOpen, onClose, onLogout }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* ─── Drawer Header ──────────────────────────────── */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-slate-900">Profil & Pengaturan</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* ─── Scrollable Content ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Section 1: Informasi Pribadi */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon />
                  <h3 className="font-semibold text-slate-800">Informasi Pribadi</h3>
                </div>

                <div className="space-y-4">
                  {/* TODO: Update user's name in the Supabase 'users' table */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wide">Nama Lengkap</label>
                    <input
                      type="text"
                      defaultValue="Budi Santoso"
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wide">Email (Terverifikasi)</label>
                    <div className="relative">
                      <input
                        type="email"
                        defaultValue="budi@email.com"
                        readOnly
                        className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-500 bg-slate-50 focus:outline-none"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckIcon />
                      </div>
                    </div>
                  </div>
                  {/* TODO: Update user's WhatsApp in the Supabase 'users' table */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wide">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      defaultValue="+6281234567890"
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Keamanan */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldIcon />
                  <h3 className="font-semibold text-slate-800">Keamanan</h3>
                </div>
                <button
                  type="button"
                  className="w-full flex items-center justify-between border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-slate-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="tracking-widest">*** Ganti Password</span>
                  <ChevronDownIcon />
                </button>
              </section>

              {/* Section 3: Brankas Dokumen Legal */}
              <section>
                <div className="bg-slate-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2">
                    <LockIcon />
                    <h3 className="font-bold text-slate-800">Brankas Dokumen Legal</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
                    Dokumen Anda dienkripsi tingkat tinggi dan hanya digunakan untuk keperluan legalitas transaksi Notaris.
                  </p>
                  {/* TODO: Handle file upload to secure storage bucket */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 bg-white flex items-center justify-center">
                    <p className="text-xs text-slate-400">Seret & lepas dokumen di sini</p>
                  </div>
                </div>
              </section>
              {/* ─── Logout ──────────────────────────────────────── */}
              <section>
                <button
                  type="button"
                  onClick={() => { onClose(); onLogout?.() }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOutIcon />
                  Log Out
                </button>
              </section>
            </div>

            {/* ─── Sticky Footer ──────────────────────────────── */}
            <div className="mt-auto sticky bottom-0 bg-white p-4 border-t border-gray-100">
              <button
                type="button"
                className="w-full py-3.5 rounded-lg font-bold text-white bg-[#FF6B00] hover:bg-[#e86000] transition-colors flex items-center justify-center gap-2"
              >
                <SaveIcon />
                Simpan Perubahan
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
