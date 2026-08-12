import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowUp,
  FileText,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ChevronRight,
  ScrollText,
  Scale,
  UserCheck,
  Building2,
  AlertTriangle,
  RefreshCcw,
  Database,
  Sparkles,
  Cookie,
  Lock,
  ListChecks,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const TERMS_ICONS = [Scale, UserCheck, Building2, AlertTriangle, RefreshCcw]
const PRIVACY_ICONS = [Database, Sparkles, Cookie, Lock, ListChecks, MessageCircle]

export default function LegalPage({ type }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useAuth()

  const [active, setActive] = useState(1)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)

  const isTerms = type === 'terms'
  const ns = `legal.${isTerms ? 'terms' : 'privacy'}`
  const sectionNums = useMemo(() => (isTerms ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6]), [isTerms])
  const icons = isTerms ? TERMS_ICONS : PRIVACY_ICONS
  const PageIcon = isTerms ? FileText : ShieldCheck
  const otherRoute = isTerms ? '/privacy' : '/terms'
  const otherLabel = isTerms ? t('legal.see_privacy') : t('legal.see_terms')

  const scrollToSection = (n) => {
    document.getElementById(`legal-section-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('officialhunione@gmail.com')
      setCopied(true)
      showToast(t('legal.email_copied'), 'success')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(Number(entry.target.dataset.section))
          }
        })
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    sectionNums.forEach((n) => {
      const el = document.getElementById(`legal-section-${n}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sectionNums])

  return (
    <div className="bg-brand-bg text-brand-text min-h-screen">
      <div
        className="fixed top-0 left-0 right-0 z-[60] h-1 bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-brand-accent transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-text transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </button>

        <div className="relative mt-4 overflow-hidden rounded-3xl bg-brand-primary shadow-lg">
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -left-16 w-64 h-64 rounded-full bg-white/5 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
              {t('legal.last_updated')}
            </span>
            <div className="mt-5 flex items-center gap-4">
              <span className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <PageIcon size={28} className="text-brand-accent" />
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                {t(`${ns}.title`)}
              </h1>
            </div>
            <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
              {t(`${ns}.intro`)}
            </p>
          </div>
        </div>

        <div className="mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-20 rounded-2xl border border-brand-border bg-brand-surface shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-3 flex items-center gap-2">
                <ScrollText size={14} />
                {t('legal.toc')}
              </p>
              <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0">
                {sectionNums.map((n) => {
                  const isActive = active === n
                  const SecIcon = icons[n - 1]
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => scrollToSection(n)}
                      className={`shrink-0 inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-brand-accent/10 text-brand-primary ring-1 ring-brand-accent/30'
                          : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                      }`}
                    >
                      <span
                        className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors ${
                          isActive ? 'bg-brand-accent text-white' : 'bg-brand-bg text-brand-muted'
                        }`}
                      >
                        {n}
                      </span>
                      <span className="flex-1 truncate">{t(`${ns}.s${n}_title`)}</span>
                      <SecIcon size={14} className={`shrink-0 ${isActive ? 'text-brand-accent' : 'text-brand-muted/60'}`} />
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-6">
            {sectionNums.map((n) => {
              const SecIcon = icons[n - 1]
              return (
                <section
                  key={n}
                  id={`legal-section-${n}`}
                  data-section={n}
                  className="scroll-mt-28 rounded-2xl border border-brand-border bg-brand-surface shadow-sm p-6 sm:p-8 hover:border-brand-accent/40 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 shrink-0 w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                      <SecIcon size={20} className="text-brand-accent" />
                    </span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-brand-text">
                        {t(`${ns}.s${n}_title`)}
                      </h2>
                      <p className="mt-2.5 text-sm sm:text-[15px] leading-relaxed text-brand-muted">
                        {t(`${ns}.s${n}_body`)}
                      </p>
                    </div>
                  </div>
                </section>
              )
            })}

            <section className="relative overflow-hidden scroll-mt-28 rounded-2xl bg-brand-primary text-white p-6 sm:p-8 shadow-lg">
              <div
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-accent/25 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <MessageCircle size={20} className="text-brand-accent" />
                    {t('legal.contact_title')}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    {t('legal.contact_desc')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="mailto:officialhunione@gmail.com"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 active:scale-[0.97] transition-all"
                  >
                    <Mail size={15} />
                    {t('legal.contact_button')}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label="Copy email"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 active:scale-[0.97] transition-all"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    <span className="hidden sm:inline">officialhunione@gmail.com</span>
                  </button>
                </div>
              </div>
            </section>

            <Link
              to={otherRoute}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6 shadow-sm hover:border-brand-accent/40 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-brand-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-text">{otherLabel}</p>
                  <p className="text-xs text-brand-muted mt-0.5">{t('legal.see_note')}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-brand-muted group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {progress > 20 && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={t('legal.back_top')}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-brand-primary text-white shadow-lg hover:bg-brand-primary/90 active:scale-95 transition-all flex items-center justify-center"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  )
}
