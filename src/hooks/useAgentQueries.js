import { supabase } from '../supabaseClient'

export const agentKeys = {
  all: ['agents'],
  directory: () => ['agents', 'directory'],
  list: (filters) => ['agents', 'list', filters],
  detail: (id) => ['agents', 'detail', id],
}

async function fetchProfiles({ region } = {}) {
  let query = supabase.from('agent_profiles').select('*').eq('is_visible', true)
  if (region) query = query.eq('region', region)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

async function fetchStatsMap() {
  const { data, error } = await supabase.from('agent_stats').select('*')
  if (error) throw new Error(error.message)
  return new Map((data || []).map((s) => [s.agent_id, s]))
}

function mergeAgents(profiles, statsMap) {
  return profiles.map((p) => ({
    ...p,
    stats: statsMap.get(p.user_id) || null,
  }))
}

function sortAgents(list, sortBy) {
  if (sortBy === 'rating') {
    return [...list].sort((a, b) => (b.stats?.avg_rating || 0) - (a.stats?.avg_rating || 0))
  }
  if (sortBy === 'name') {
    return [...list].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }
  return [...list].sort((a, b) => (b.stats?.listing_score || 0) - (a.stats?.listing_score || 0))
}

export async function fetchAgentDirectory() {
  const [profiles, statsMap] = await Promise.all([fetchProfiles(), fetchStatsMap()])
  const agents = mergeAgents(profiles, statsMap)
  const regions = [...new Set(agents.map((a) => (a.region || '').trim()).filter(Boolean))].sort()
  const topIds = sortAgents(agents, 'top')
    .slice(0, 3)
    .filter((a) => (a.stats?.listing_score || 0) > 0)
    .map((a) => a.user_id)
  return { regions, topIds }
}

export async function fetchAgents({ region, sortBy }) {
  const [profiles, statsMap] = await Promise.all([
    fetchProfiles({ region }),
    fetchStatsMap(),
  ])
  const agents = mergeAgents(profiles, statsMap)
  return sortAgents(agents, sortBy || 'top')
}

export async function fetchAgentDetail(id) {
  const [agentRes, profileRes, statsRes, listingRes, reviewRes] = await Promise.all([
    supabase.from('agent_profiles').select('*').eq('user_id', id).maybeSingle(),
    supabase.from('profiles').select('first_name, role').eq('id', id).maybeSingle(),
    supabase.from('agent_stats').select('*').eq('agent_id', id).maybeSingle(),
    supabase.from('properties').select('*').eq('seller_id', id).eq('status', 'verified').order('created_at', { ascending: false }),
    supabase.from('agent_reviews').select('*, profiles!reviewer_id(first_name)').eq('agent_id', id).order('created_at', { ascending: false }),
  ])

  if (agentRes.error) throw new Error(agentRes.error.message)
  if (profileRes.error) throw new Error(profileRes.error.message)

  const agent = agentRes.data || {}
  const base = profileRes.data || {}

  if ((base.role && base.role !== 'agent') || (!agentRes.data && !profileRes.data)) {
    throw new Error('Agent tidak ditemukan.')
  }

  return {
    profile: {
      ...agent,
      full_name: agent.full_name || base.first_name || 'Agent',
      whatsapp: agent.whatsapp || '',
      role: base.role || 'agent',
    },
    stats: statsRes.data || null,
    listings: listingRes.data || [],
    reviews: reviewRes.data || [],
  }
}
