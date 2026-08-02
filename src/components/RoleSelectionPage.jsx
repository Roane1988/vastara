import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserCheck, Building2, Home, ArrowLeft, Search } from 'lucide-react'

const ROLES = [
  { key: 'owner', icon: Home, desc: 'roleSelection.owner' },
  { key: 'agent', icon: UserCheck, desc: 'roleSelection.agent' },
  { key: 'developer', icon: Building2, desc: 'roleSelection.developer' },
  { key: 'find-agent', icon: Search, desc: 'roleSelection.find_agent', to: '/agents' },
]

export default function RoleSelectionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center mb-10">
          <h1 className="text-2xl font-bold text-brand-text">{t('roleSelection.title')}</h1>
          <p className="text-sm text-brand-muted mt-2 max-w-xs mx-auto">{t('roleSelection.subtitle')}</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {ROLES.map(({ key, icon: Icon, desc, to }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to || '/sell', { state: { role: key } })}
              className="w-full flex items-center gap-5 p-5 rounded-2xl bg-brand-surface border border-brand-border shadow-sm hover:shadow-md hover:border-brand-accent/40 active:scale-[0.98] transition-all duration-200 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors duration-200">
                <Icon size={26} />
              </div>
              <div>
                <p className="text-base font-bold text-brand-text">{t(desc)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
