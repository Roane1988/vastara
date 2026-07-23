import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Map, Building2, Store, Briefcase, Warehouse, ShoppingBag, Factory, Hotel, BedDouble, TreePine } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Cari Properti Dijual',
    items: [
      { label: 'Rumah', icon: Home },
      { label: 'Tanah', icon: Map },
      { label: 'Apartemen', icon: Building2 },
      { label: 'Ruko', icon: Store },
      { label: 'Perkantoran', icon: Briefcase },
      { label: 'Gudang', icon: Warehouse },
    ],
  },
  {
    title: 'Cari Properti Disewa',
    items: [
      { label: 'Ruang Usaha', icon: ShoppingBag },
      { label: 'Pabrik', icon: Factory },
      { label: 'Hotel', icon: Hotel, isNew: true },
      { label: 'Kost', icon: BedDouble, isNew: true },
      { label: 'Villa', icon: TreePine, isNew: true },
    ],
  },
]

export default function MoreCategoriesDrawer({ isOpen, onClose }) {
  const navigate = useNavigate()

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
            className="fixed bottom-0 left-0 right-0 z-[110] flex justify-center"
          >
            <div className="w-full max-w-lg mx-auto bg-brand-surface rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
              <div className="sticky top-0 bg-brand-surface rounded-t-3xl pt-2 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-brand-border" />
              </div>

              <div className="px-5 pt-1 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-brand-text">Kategori Lainnya</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-brand-muted hover:bg-brand-bg transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-5 flex flex-col gap-6">
                {SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-4">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => { navigate('/coming-soon'); onClose() }}
                            className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-brand-bg transition-all cursor-pointer"
                          >
                            <div className="relative w-12 h-12 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-secondary shadow-sm shrink-0">
                              <Icon size={20} />
                              {item.isNew && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
