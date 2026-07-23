import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wrench } from 'lucide-react'

export default function ComingSoonPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-6 text-center">
      <Wrench className="w-16 h-16 text-brand-secondary" />
      <h1 className="text-2xl font-bold text-brand-text mt-4">{t('comingSoon.title')}</h1>
      <p className="text-brand-muted mt-2 mb-8 max-w-xs">
        {t('comingSoon.description')}
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="bg-brand-primary text-white px-6 py-3 rounded-xl hover:brightness-90 font-semibold active:scale-[0.97] transition-all"
      >
        {t('comingSoon.back')}
      </button>
    </div>
  )
}
