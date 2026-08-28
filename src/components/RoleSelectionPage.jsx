import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserCheck, Building2, Home, ArrowLeft, Search, ArrowRight } from 'lucide-react'

const ROLES = [
  { key: 'owner', icon: Home, desc: 'roleSelection.owner', sub: 'roleSelection.owner_desc' },
  { key: 'agent', icon: UserCheck, desc: 'roleSelection.agent', sub: 'roleSelection.agent_desc' },
  { key: 'developer', icon: Building2, desc: 'roleSelection.developer', sub: 'roleSelection.developer_desc' },
]

const FIND_AGENT = { key: 'find-agent', icon: Search, desc: 'roleSelection.find_agent', sub: 'roleSelection.find_agent_desc', to: '/agents' }

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

      <div className="flex-1 flex flex-col items-center px-5 py-12">
        <div className="w-full max-w-3xl text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">{t('roleSelection.title')}</h1>
          <p className="text-sm text-brand-muted mt-2 max-w-sm mx-auto">{t('roleSelection.subtitle')}</p>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map(({ key, icon: Icon, desc, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate('/sell', { state: { role: key } })}
              className="group flex md:flex-col items-center gap-4 md:gap-4 p-6 md:p-7 rounded-2xl bg-white border border-brand-border shadow-sm hover:-translate-y-1 hover:border-brand-accent hover:shadow-lg hover:shadow-brand-primary/5 active:scale-[0.98] transition-all duration-200 text-left md:text-center cursor-pointer"
            >
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:bg-brand-primary group-hover:text-white group-hover:scale-105 transition-all duration-200">
                <Icon size={30} />
              </div>
              <div className="min-w-0 md:flex md:flex-col md:items-center">
                <p className="text-base font-bold text-brand-text">{t(desc)}</p>
                <p className="text-sm text-brand-muted mt-1 leading-snug">{t(sub)}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate(FIND_AGENT.to)}
          className="group w-full max-w-3xl mt-4 flex items-center gap-4 p-5 rounded-2xl bg-brand-surface border border-dashed border-brand-border hover:border-brand-accent hover:bg-white hover:shadow-md active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-200">
            <FIND_AGENT.icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand-text">{t(FIND_AGENT.desc)}</p>
            <p className="text-xs text-brand-muted mt-0.5">{t(FIND_AGENT.sub)}</p>
          </div>
          <ArrowRight size={18} className="text-brand-muted shrink-0 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all duration-200" />
        </button>
      </div>
    </div>
  )
}
