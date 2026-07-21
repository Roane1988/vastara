import { useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'

export default function ComingSoonPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-6 text-center">
      <Wrench className="w-16 h-16 text-brand-secondary" />
      <h1 className="text-2xl font-bold text-brand-text mt-4">Fitur Sedang Dibuat!</h1>
      <p className="text-brand-muted mt-2 mb-8 max-w-xs">
        Kami sedang bekerja keras menyiapkan fitur ini untuk pengalaman properti yang lebih baik.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="bg-brand-primary text-white px-6 py-3 rounded-xl hover:opacity-90 font-semibold active:scale-[0.97] transition-all"
      >
        Kembali ke Eksplor
      </button>
    </div>
  )
}
