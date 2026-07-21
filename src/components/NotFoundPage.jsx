import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function NotFoundPage({ message, onBack }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/explore')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-brand-secondary/10 flex items-center justify-center mb-6">
          <SearchX size={40} className="text-brand-secondary" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Properti tidak ditemukan
        </h1>

        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          {message || 'Maaf, properti yang Anda cari mungkin sudah terjual atau tidak tersedia saat ini.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-3.5 px-6 rounded-full font-bold text-sm text-white bg-brand-primary hover:bg-[#152d4a] active:bg-[#0f2640] transition-all"
          >
            Kembali ke Beranda
          </button>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="flex-1 py-3.5 px-6 rounded-full font-medium text-sm text-gray-300 border border-gray-600 hover:border-gray-500 hover:text-white transition-colors"
          >
            Cari Properti Lain
          </button>
        </div>
      </div>
    </div>
  )
}
