import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUp, Send, ShieldCheck, BadgeCheck, Headset, Mail, Bot, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const NEWSLETTER_STORAGE_KEY = 'hunione_newsletter_subscribed'
const CONTACT_EMAIL = 'officialhunione@gmail.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/myhunione/?utm_source=ig_web_button_share_sheet',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.38 2.525c.636-.247 1.363-.416 2.427-.465C8.76 2.013 9.095 2 12.315 2zm0 1.802c-2.41 0-2.695.013-3.707.06-.908.044-1.393.195-1.723.322a2.877 2.877 0 00-1.067.694 2.877 2.877 0 00-.694 1.067c-.127.33-.278.815-.322 1.722-.047 1.013-.06 1.297-.06 3.708v.63c0 2.41.013 2.695.06 3.707.044.908.195 1.393.322 1.723.173.43.398.81.694 1.067a2.877 2.877 0 001.067.694c.33.127.815.278 1.722.322 1.013.047 1.297.06 3.708.06h.63c2.41 0 2.695-.013 3.707-.06.908-.044 1.393-.195 1.723-.322a2.877 2.877 0 001.067-.694 2.877 2.877 0 00.694-1.067c.127-.33.278-.815.322-1.722.047-1.013.06-1.297.06-3.708v-.63c0-2.41-.013-2.695-.06-3.707-.044-.908-.195-1.393-.322-1.723a2.877 2.877 0 00-.694-1.067 2.877 2.877 0 00-1.067-.694c-.33-.127-.815-.278-1.722-.322-1.013-.047-1.297-.06-3.707-.06h-.63zm0 1.216c1.573 0 1.954.013 2.642.047.987.045 1.51.203 1.86.341.466.186.801.41 1.154.763.353.353.577.688.763 1.154.138.35.296.873.341 1.86.034.688.047 1.07.047 2.642s-.013 1.954-.047 2.642c-.045.987-.203 1.51-.341 1.86-.186.466-.41.801-.763 1.154-.353.353-.688.577-1.154.763-.35.138-.873.296-1.86.341-.663.031-1.018.042-2.642.042s-1.979-.01-2.642-.042c-.987-.045-1.51-.203-1.86-.341a2.898 2.898 0 01-1.154-.763 2.898 2.898 0 01-.763-1.154c-.138-.35-.296-.873-.341-1.86-.031-.663-.042-1.018-.042-2.642s.01-1.979.042-2.642c.045-.987.203-1.51.341-1.86.186-.466.41-.801.763-1.154.353-.353.688-.577 1.154-.763.35-.138.873-.296 1.86-.341.663-.031 1.018-.042 2.642-.042s1.979.01 2.642.042c.987.045 1.51.203 1.86.341a2.898 2.898 0 011.154.763c.353.353.577.688.763 1.154.138.35.296.873.341 1.86.031.663.042 1.018.042 2.642s-.01 1.979-.042 2.642c-.045.987-.203 1.51-.341 1.86-.186.466-.41.801-.763 1.154-.353.353-.688.577-1.154.763-.35.138-.873.296-1.86.341-.663.031-1.018.042-2.642.042z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@myhunione?is_from_webapp=1&sender_device=pc',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const { t } = useTranslation()
  const { showToast } = useAuth()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem(NEWSLETTER_STORAGE_KEY) === 'true')
  const [showScroll, setShowScroll] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (subscribed || isLoading) return
    const trimmed = email.trim()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      showToast(t('footer.newsletter_required'), 'error')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email: trimmed }])
      if (error) throw error
      setSubscribed(true)
      localStorage.setItem(NEWSLETTER_STORAGE_KEY, 'true')
      setEmail('')
      showToast(t('footer.newsletter_success'), 'success')
    } catch (err) {
      if (err?.code === '23505') {
        showToast(t('footer.newsletter_duplicate'), 'error')
      } else {
        showToast(t('footer.newsletter_error'), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const openHuniBot = (question) => {
    window.dispatchEvent(new CustomEvent('open-hunibot-question', { detail: { question } }))
  }

  const openHuniBotGeneric = () => {
    window.dispatchEvent(new Event('open-hunibot'))
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navGroups = [
    {
      title: t('footer.group_explore'),
      links: [
        { label: t('footer.link_buy_house'), to: '/explore' },
        { label: t('footer.link_rent_property'), to: '/explore' },
        { label: t('footer.link_compare'), to: '/compare' },
        { label: t('footer.link_forum'), to: '/forum' },
      ],
    },
    {
      title: t('footer.group_sell'),
      links: [
        { label: t('footer.link_sell_house'), to: '/sell-role' },
        { label: t('footer.link_my_listings'), to: '/my-listings' },
      ],
    },
    {
      title: t('footer.group_help'),
      links: [
        { label: t('footer.link_support'), to: '/forum' },
        { label: t('footer.link_faq'), to: '/forum' },
        { label: t('footer.link_report_issue'), action: () => openHuniBot(t('footer.report_question')) },
      ],
    },
  ]

  const trustItems = [
    { icon: ShieldCheck, label: t('footer.trust_secure') },
    { icon: BadgeCheck, label: t('footer.trust_verified') },
    { icon: Headset, label: t('footer.trust_support') },
  ]

  return (
    <footer className="bg-brand-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-3">
            <Link to="/" className="inline-block">
              <img src="/huniOne.svg" alt="HuniOne" className="h-20 md:h-24 w-auto object-contain" />
            </Link>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              {t('footer.desc')}
            </p>

            <div className="mt-6">
              {subscribed ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">{t('footer.newsletter_done')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <label className="block text-white text-xs font-semibold uppercase tracking-wider mb-2">
                    {t('footer.newsletter_title')}
                  </label>
                  <p className="text-slate-400 text-xs leading-relaxed mb-2.5">
                    {t('footer.newsletter_desc')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('footer.newsletter_placeholder')}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent/90 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      <span className="hidden sm:inline">{isLoading ? t('footer.newsletter_sending') : t('footer.newsletter_button')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {navGroups.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        className="text-slate-400 hover:text-white transition-colors duration-200 text-sm"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.action}
                        className="text-slate-400 hover:text-white transition-colors duration-200 text-sm text-left"
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-3">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer.group_contact')}
            </h3>
            <div className="space-y-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 hover:border-brand-accent/50 active:scale-[0.98] transition-all"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-brand-accent/20 flex items-center justify-center">
                  <Mail size={17} className="text-brand-accent group-hover:scale-110 transition-transform" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t('footer.email_label')}
                  </span>
                  <span className="block text-xs sm:text-sm text-white font-medium whitespace-nowrap leading-snug group-hover:underline underline-offset-2">
                    {CONTACT_EMAIL}
                  </span>
                </span>
              </a>
              <button
                type="button"
                onClick={openHuniBotGeneric}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/15 active:scale-[0.97] transition-all"
              >
                <Bot size={15} />
                {t('footer.link_ask_hunibot')}
              </button>
              <p className="text-slate-500 text-xs leading-relaxed pt-1">
                {t('footer.contact_note')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon size={17} className="text-brand-accent" />
                <span className="text-slate-300 text-xs sm:text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                {t('footer.follow_us')}
              </p>
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-white transition-colors duration-200 hover:scale-110 active:scale-95"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2">
              <p className="text-slate-500 text-xs sm:text-right">
                &copy; 2026 HuniOne. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  to="/terms"
                  className="text-slate-500 hover:text-white transition-colors duration-200 text-xs"
                >
                  {t('footer.link_terms')}
                </Link>
                <span className="text-slate-700 text-xs">•</span>
                <Link
                  to="/privacy"
                  className="text-slate-500 hover:text-white transition-colors duration-200 text-xs"
                >
                  {t('footer.link_privacy')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScroll && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={t('footer.scroll_top')}
          className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-brand-accent text-white shadow-lg hover:bg-brand-accent/90 active:scale-95 transition-all flex items-center justify-center"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </footer>
  )
}
