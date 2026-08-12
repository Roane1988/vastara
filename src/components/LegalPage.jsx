import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileText, ShieldCheck, Mail } from 'lucide-react'

export default function LegalPage({ type }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isTerms = type === 'terms'
  const ns = `legal.${isTerms ? 'terms' : 'privacy'}`
  const sections = isTerms ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6]

  const Icon = isTerms ? FileText : ShieldCheck

  return (
    <div className="bg-brand-bg text-brand-text">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-text transition-colors duration-200 text-sm font-medium mb-6"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-2xl bg-brand-accent/15 flex items-center justify-center">
            <Icon size={22} className="text-brand-accent" />
          </span>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t(`${ns}.title`)}</h1>
        </div>
        <p className="text-xs text-brand-muted mb-6">
          {t('legal.last_updated')}
        </p>

        <div className="space-y-6">
          <p className="text-brand-muted text-sm leading-relaxed">
            {t(`${ns}.intro`)}
          </p>

          {sections.map((n) => (
            <section
              key={n}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
            >
              <h2 className="text-white font-semibold mb-2">
                {t(`${ns}.s${n}_title`)}
              </h2>
              <p className="text-brand-muted text-sm leading-relaxed">
                {t(`${ns}.s${n}_body`)}
              </p>
            </section>
          ))}

          <section className="rounded-2xl border border-brand-accent/30 bg-brand-accent/10 p-5 sm:p-6">
            <h2 className="text-white font-semibold mb-2">
              {t('legal.privacy.s6_title')}
            </h2>
            <p className="text-brand-muted text-sm leading-relaxed mb-4">
              {t('legal.privacy.s6_body')}
            </p>
            <a
              href="mailto:officialhunione@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 active:scale-[0.97] transition-all"
            >
              <Mail size={15} />
              officialhunione@gmail.com
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
