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
    <div className="min-h-screen bg-brand-primary flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <SearchX size={40} className="text-white/80" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Properti tidak ditemukan
        </h1>

        <p className="text-sm text-white/70 leading-relaxed mb-8">
          {message || 'Maaf, properti yang Anda cari mungkin sudah terjual atau tidak tersedia saat ini.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-3.5 px-6 rounded-full font-bold text-sm text-white bg-white/20 hover:bg-white/30 transition-all"
          >
            Kembali ke Beranda
          </button>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="flex-1 py-3.5 px-6 rounded-full font-medium text-sm text-white/80 border border-white/30 hover:border-white/50 hover:text-white transition-colors"
          >
            Cari Properti Lain
          </button>
        </div>
      </div>
    </div>
  )
}
