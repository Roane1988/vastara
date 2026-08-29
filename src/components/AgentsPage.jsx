import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Star, Crown, MessageCircle, Phone, Building2, Search, X, UserPlus, Briefcase, Pencil, AlertCircle } from 'lucide-react'
import { getAvatarColor, getInitials } from '../utils/avatar'
import useSEO from '../hooks/useSEO'
import { useAuth } from '../context/AuthContext'
import { agentKeys, fetchAgents, fetchAgentDirectory } from '../hooks/useAgentQueries'

function AgentCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-brand-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-brand-bg rounded" />
          <div className="h-2.5 w-16 bg-brand-bg rounded" />
        </div>
      </div>
      <div className="h-8 bg-brand-bg rounded-xl" />
    </div>
  )
}

export default function AgentsPage() {
  useSEO({ title: 'Cari Agen Properti — HuniOne', description: 'Temukan agen properti terpercaya, lihat listing aktif dan performa mereka di HuniOne.' })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role } = useAuth()

  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [sortBy, setSortBy] = useState('top')

  const directoryQuery = useQuery({
    queryKey: agentKeys.directory(),
    queryFn: fetchAgentDirectory,
  })

  const agentsQuery = useQuery({
    queryKey: agentKeys.list({ region, sortBy }),
    queryFn: () => fetchAgents({ region, sortBy }),
    placeholderData: (prev) => prev,
  })

  const regions = directoryQuery.data?.regions || []
  const topIds = directoryQuery.data?.topIds || []

  const filtered = useMemo(() => {
    const list = agentsQuery.data || []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) =>
      (a.full_name || '').toLowerCase().includes(q)
      || (a.agency || '').toLowerCase().includes(q)
    )
  }, [agentsQuery.data, search])

  const isLoading = agentsQuery.isPending && !agentsQuery.isPlaceholderData
  const isFetching = agentsQuery.isFetching

  const openWa = (whatsapp, name) => {
    const num = whatsapp?.replace(/\D/g, '')
    if (!num) return
    const msg = encodeURIComponent(`Halo ${name}, saya ingin berkonsultasi tentang properti di HuniOne.`)
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="bg-gradient-to-br from-brand-primary via-brand-primary to-[#284D7A] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('agents.title')}</h1>
          <p className="text-white/80 mt-2 text-sm max-w-xl">{t('agents.subtitle')}</p>
          {role === 'agent' ? (
            <button
              type="button"
              onClick={() => navigate('/agent-profile')}
              className="mt-5 inline-flex items-center gap-2 bg-white text-brand-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all"
            >
              <Pencil size={16} />
              {t('agents.edit_profile')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/agent-apply')}
              className="mt-5 inline-flex items-center gap-2 bg-white text-brand-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition-all"
            >
              <UserPlus size={16} />
              {t('agents.become_agent')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('agents.search_placeholder')}
              className="w-full pl-11 pr-10 py-3 rounded-xl text-sm text-brand-text bg-white border border-brand-border placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="sm:w-56 px-4 py-3 rounded-xl text-sm text-brand-text bg-white border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
          >
            <option value="">{t('agents.all_region')}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sm:w-56 px-4 py-3 rounded-xl text-sm text-brand-text bg-white border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
          >
            <option value="top">{t('agents.sort_top')}</option>
            <option value="rating">{t('agents.sort_rating')}</option>
            <option value="name">{t('agents.sort_name')}</option>
          </select>
        </div>

        {isFetching && !isLoading && (
          <div className="mb-4 flex items-center gap-2 text-xs text-brand-muted">
            <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <span>{t('agents.loading')}</span>
          </div>
        )}

        {agentsQuery.isError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={16} className="shrink-0" />
            {agentsQuery.error?.message || t('agents.error_load')}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <AgentCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search size={40} className="mx-auto text-brand-muted mb-3" />
            <p className="text-brand-muted">{t('agents.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((agent) => {
              const isTop = topIds.includes(agent.user_id)
              const wa = agent.whatsapp || ''
              return (
                <div
                  key={agent.user_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/agents/${agent.user_id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/agents/${agent.user_id}`) } }}
                  className="group bg-white rounded-2xl border border-brand-border p-5 hover:shadow-xl hover:shadow-brand-primary/5 hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold"
                        style={{ backgroundColor: getAvatarColor(agent.user_id) }}
                      >
                        {getInitials(agent.full_name || agent.user_id)}
                      </div>
                      {isTop && (
                        <span className="absolute -top-2 -right-2 bg-brand-accent text-white rounded-full p-1 shadow-md" title={t('agents.top_badge')}>
                          <Crown size={12} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate">{agent.full_name || 'Agent'}</p>
                      {agent.agency ? (
                        <p className="text-xs text-brand-muted flex items-center gap-1 truncate">
                          <Building2 size={11} /> {agent.agency}
                        </p>
                      ) : (
                        <p className="text-xs text-brand-muted">Agen HuniOne</p>
                      )}
                      {agent.region && (
                        <p className="text-xs text-brand-muted flex items-center gap-1 truncate">
                          <MapPin size={11} /> {agent.region}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs mb-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-text">
                      <Briefcase size={12} className="text-brand-accent" />
                      {(agent.stats?.verified_listings || 0)} <span className="text-brand-muted font-normal">{t('agents.listing_count')}</span>
                    </span>
                    {agent.stats?.review_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-brand-muted">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        {Number(agent.stats.avg_rating).toFixed(1)}
                        <span className="text-brand-muted/70">({agent.stats.review_count})</span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/chat?user=${agent.user_id}`) }}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-brand-border text-brand-text hover:bg-brand-bg transition-colors"
                    >
                      <MessageCircle size={15} />
                      {t('agents.chat')}
                    </button>
                    {wa ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openWa(wa, agent.full_name) }}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <Phone size={15} />
                        {t('agents.wa')}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
