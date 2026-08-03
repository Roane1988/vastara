import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const VARIANT_STYLES = {
  error: {
    box: 'bg-red-50/80 border-red-200',
    iconBg: 'bg-red-100 text-red-600',
    title: 'text-red-700',
    text: 'text-red-600',
  },
  warn: {
    box: 'bg-amber-50/80 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-600',
    title: 'text-amber-800',
    text: 'text-amber-700',
  },
}

export default function FormErrorSummary({
  errors,
  title = 'Perlu diperiksa sebelum melanjutkan',
  variant = 'error',
  icon: Icon = AlertCircle,
}) {
  const list = Array.isArray(errors) ? errors.filter(Boolean) : []
  if (list.length === 0) return null

  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.error

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`rounded-2xl border px-4 py-3.5 ${s.box}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${s.iconBg}`}>
          <Icon size={14} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold ${s.title}`}>{title}</p>
          <ul className="mt-2 space-y-1.5">
            {list.map((msg, i) => (
              <li key={i} className={`flex items-start gap-1.5 text-xs leading-relaxed ${s.text}`}>
                <CheckCircle2 size={12} className="shrink-0 mt-0.5 opacity-70" />
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
