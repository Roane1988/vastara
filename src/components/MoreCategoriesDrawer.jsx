import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { Home, Map, Building2, Store, Briefcase, Warehouse, ShoppingBag, Factory, Hotel, BedDouble, TreePine, BellRing, Megaphone, Users, MessageCircle, LayoutGrid, List, ChevronRight } from 'lucide-react'

const TOP_SERVICES = [
  { label: 'Iklankan Properti', icon: Megaphone, path: '/sell-role' },
  { label: 'Cari Agen', icon: Users, path: '/agents' },
  { label: 'Tanya Forum', icon: MessageCircle, path: '/forum' },
]

const SECTIONS = [
  {
    title: 'Cari Properti Dijual',
    items: [
      { label: 'Rumah', icon: Home, description: 'Temukan hunian tapak idamanmu', to: '/explore?category=dijual&type=Rumah' },
      { label: 'Tanah', icon: Map, description: 'Cari kavling & lahan investasi', to: '/explore?category=dijual&type=Tanah' },
      { label: 'Apartemen', icon: Building2, description: 'Hunian vertikal di pusat kota', to: '/explore?category=dijual&type=Apartemen' },
      { label: 'Ruko', icon: Store, description: 'Ruang niaga untuk bisnismu', to: '/explore?category=dijual&type=Ruko' },
      { label: 'Perkantoran', icon: Briefcase, description: 'Kantor strategis untuk perusahaan', to: '/explore?category=dijual&type=Kantor' },
      { label: 'Gudang', icon: Warehouse, description: 'Ruang simpan luas & aman', to: '/explore?category=dijual&type=Gudang' },
    ],
  },
  {
    title: 'Cari Properti Disewa',
    items: [
      { label: 'Ruang Usaha', icon: ShoppingBag, description: 'Sewa tempat untuk mulai bisnis', to: '/explore?category=disewa&type=Ruang Usaha' },
      { label: 'Pabrik', icon: Factory, description: 'Lokasi produksi skala besar', to: '/explore?category=disewa&type=Pabrik' },
      { label: 'Hotel', icon: Hotel, description: 'Kelola & sewa akomodasi', to: '/explore?category=disewa&type=Hotel', isNew: true },
      { label: 'Kost', icon: BedDouble, description: 'Kamar sewa dengan harga ramah', to: '/explore?category=disewa&type=Kost', isNew: true },
      { label: 'Villa', icon: TreePine, description: 'Liburan nyaman jauh dari kota', to: '/explore?category=disewa&type=Villa', isNew: true },
    ],
  },
  {
    title: 'Alat & Fitur',
    items: [
      { label: 'Pencarian Tersimpan', icon: BellRing, description: 'Terima notifikasi properti baru', path: '/saved-searches', isNew: true },
    ],
  },
]

function SectionTitle({ title }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
      {title}
    </h3>
  )
}

function GridView({ sections, onNavigate }) {
  return (
    <div className="px-5 flex flex-col">
      {sections.map((section) => (
        <div key={section.title} className="mt-6 first:mt-0">
          <SectionTitle title={section.title} />
          <div className="grid grid-cols-4 gap-2">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={onNavigate(item)}
                  className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-brand-bg active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent shadow-sm shrink-0">
                    <Icon size={20} />
                    {item.isNew && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-brand-text mt-1.5 leading-tight">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ sections, onNavigate }) {
  return (
    <div className="px-5 flex flex-col">
      {sections.map((section) => (
        <div key={section.title} className="mt-6 first:mt-0">
          <SectionTitle title={section.title} />
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={onNavigate(item)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-brand-bg/50 active:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <span className="relative w-11 h-11 rounded-xl bg-brand-highlight text-brand-accent flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-text truncate">{item.label}</span>
                      {item.isNew && (
                        <span className="shrink-0 bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none">
                          NEW
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-brand-muted truncate mt-0.5">{item.description}</span>
                  </span>
                  <ChevronRight size={16} className="text-brand-muted/40 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MoreCategoriesDrawer({ isOpen, onClose }) {
  const navigate = useNavigate()
  const dragControls = useDragControls()
  const [viewMode, setViewMode] = useState('grid')

  const onNavigate = (item) => () => {
    navigate(item.to || item.path || '/coming-soon')
    onClose()
  }

  const onTopService = (item) => () => {
    navigate(item.path)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose()
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center"
          >
            <div className="w-full max-w-lg mx-auto bg-brand-surface rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain scroll-smooth pb-8">
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1 rounded-full bg-brand-border" />
              </div>

              <div className="px-5 pt-1 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-text">Kategori Lainnya</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="p-1.5 rounded-full text-brand-muted hover:bg-brand-bg transition-colors active:scale-90"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-5 pt-1 pb-3">
                <h3 className="text-lg font-bold text-brand-text mb-4">Layanan teratas</h3>
                <div className="grid grid-cols-3 gap-2">
                  {TOP_SERVICES.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={onTopService(item)}
                        className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-brand-bg active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-brand-highlight border border-brand-accent/10 flex items-center justify-center text-brand-primary shadow-sm shrink-0">
                          <Icon size={20} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-brand-text mt-1.5 leading-tight">
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-brand-border/60 shadow-sm py-3">
                <div className="px-5 flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-brand-text shrink-0">Layanan lainnya</h3>
                  <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Tampilan grid"
                      title="Tampilan grid"
                      className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 active:scale-90 ${
                        viewMode === 'grid'
                          ? 'bg-white shadow text-brand-primary'
                          : 'text-brand-muted hover:text-brand-text'
                      }`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="Tampilan list"
                      title="Tampilan list"
                      className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 active:scale-90 ${
                        viewMode === 'list'
                          ? 'bg-white shadow text-brand-primary'
                          : 'text-brand-muted hover:text-brand-text'
                      }`}
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="pt-2"
              >
                {viewMode === 'grid' ? (
                  <GridView sections={SECTIONS} onNavigate={onNavigate} />
                ) : (
                  <ListView sections={SECTIONS} onNavigate={onNavigate} />
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
