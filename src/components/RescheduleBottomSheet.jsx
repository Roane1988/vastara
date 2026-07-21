import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// TODO: Fetch available dates/times for the specific Agent from Supabase
const DATES = [
  { day: 'Kam', date: 24, month: 'Jul' },
  { day: 'Jum', date: 25, month: 'Jul' },
  { day: 'Sab', date: 26, month: 'Jul' },
  { day: 'Min', date: 27, month: 'Jul' },
  { day: 'Sen', date: 28, month: 'Jul' },
  { day: 'Sel', date: 29, month: 'Jul' },
  { day: 'Rab', date: 30, month: 'Jul' },
]

const TIMES = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
]

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function RescheduleBottomSheet({ isOpen, onClose, agent }) {
  const [selectedDate, setSelectedDate] = useState(24)
  const [selectedTime, setSelectedTime] = useState('14:00')

  // TODO: Execute UPDATE query to Supabase 'survey_schedules' table on Confirm
  const handleConfirm = () => {
    onClose()
  }

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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 inset-x-0 bg-white  z-50 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-200  rounded-full mx-auto mt-3 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 ">
              <h2 className="text-xl font-bold text-slate-900 ">Reschedule Survei</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400  hover:text-slate-600  transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 pt-5 pb-6">
              {/* Agent Info */}
              <div className="bg-slate-50  p-3 rounded-xl flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300  to-slate-400  flex items-center justify-center text-xs text-white font-semibold flex-shrink-0">
                  {agent?.initials || 'AF'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 ">Agen: {agent?.name || 'Ahmad Fauzi'}</p>
                  <p className="text-xs text-slate-400 ">Jadwal akan dikonfirmasi ulang</p>
                </div>
              </div>

              {/* Date Selection */}
              <label className="text-sm font-bold text-slate-900  mb-3 block">Pilih Tanggal Baru</label>
              <div className="flex gap-3 overflow-x-auto snap-x no-scrollbar pb-2">
                {DATES.map((d) => {
                  const isSelected = selectedDate === d.date
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDate(d.date)}
                      className={`snap-center shrink-0 rounded-xl p-3 flex flex-col items-center min-w-[70px] transition-all outline-none ${
                        isSelected
                          ? 'border-2 border-brand-secondary bg-brand-secondary/10 '
                          : 'border border-gray-200  bg-white '
                      }`}
                    >
                      <span className={`text-xs font-medium ${isSelected ? 'text-brand-secondary' : 'text-gray-400 '}`}>
                        {d.day}
                      </span>
                      <span className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-brand-secondary' : 'text-slate-900 '}`}>
                        {d.date}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Time Selection */}
              <label className="text-sm font-bold text-slate-900  mb-3 mt-6 block">Waktu Tersedia</label>
              <div className="grid grid-cols-3 gap-3">
                {TIMES.map((t) => {
                  const isSelected = selectedTime === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={`py-2 rounded-lg text-center text-sm font-medium transition-all outline-none ${
                        isSelected
                          ? 'bg-slate-900  text-white  border-slate-900 '
                          : 'border border-gray-200  text-slate-600  hover:border-gray-300 '
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-4 rounded-xl font-bold text-base mt-8 mb-2 bg-brand-primary text-white hover:bg-[#152d4a] transition-colors"
              >
                Konfirmasi Jadwal
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
