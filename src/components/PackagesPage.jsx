import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'

const PACKAGES = [
  {
    key: 'starter',
    featured: false,
  },
  {
    key: 'pro',
    featured: true,
  },
  {
    key: 'premium',
    featured: false,
  },
]

export default function PackagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-14 bg-brand-surface/90 backdrop-blur-md z-30 pb-3 px-5 border-b border-brand-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-12">
        <div className="w-full max-w-3xl text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">{t('packages.title')}</h1>
          <p className="text-sm text-brand-muted mt-2 max-w-sm mx-auto">{t('packages.subtitle')}</p>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES.map(({ key, featured }) => (
            <div
              key={key}
              className={`relative flex flex-col p-6 rounded-2xl bg-white border transition-all duration-200 ${
                featured
                  ? 'border-brand-accent shadow-lg shadow-brand-primary/5 md:-translate-y-1'
                  : 'border-brand-border shadow-sm hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-md'
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-brand-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                  <Sparkles size={12} />
                  {t('packages.popular')}
                </span>
              )}

              <p className="text-base font-bold text-brand-text">{t(`packages.${key}`)}</p>
              <p className="text-xs text-brand-muted mt-1 min-h-[2.5rem] leading-snug">{t(`packages.${key}_desc`)}</p>

              <div className="flex items-baseline gap-1 mt-4 mb-5">
                <span className={`text-2xl font-extrabold ${featured ? 'text-brand-primary' : 'text-brand-text'}`}>
                  {t(`packages.${key}_price`)}
                </span>
                <span className="text-xs text-brand-muted">{t('packages.per_period')}</span>
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-muted mb-3">
                {t('packages.feature_title')}
              </p>
              <ul className="flex-1 space-y-2.5">
                {t(`packages.${key}_features`, { returnObjects: true }).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-brand-text leading-snug">
                    <span className="mt-0.5 shrink-0 w-4.5 h-4.5 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => navigate('/coming-soon')}
                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  featured
                    ? 'bg-brand-primary text-white hover:bg-[#284D7A] active:scale-[0.97]'
                    : 'bg-white border border-brand-border text-brand-primary hover:border-brand-accent hover:bg-brand-accent/5 active:scale-[0.97]'
                }`}
              >
                {t('packages.choose')}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-brand-muted mt-6">{t('packages.coming_soon')}</p>
      </div>
    </div>
  )
}
