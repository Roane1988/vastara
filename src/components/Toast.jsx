import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = { success: CheckCircle, error: AlertCircle, info: Info }

const styles = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
}

export default function Toast({ message, type = 'error', onClose }) {
  const Icon = icons[type]

  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-slide-down">
      <div className={`flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg ${styles[type]}`}>
        <Icon size={18} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="shrink-0 hover:opacity-70 transition-opacity">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}