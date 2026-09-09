import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { setSupabase, initFavorites } from '../utils/favorites'
import { resetScrollLock } from '../utils/scrollLock'
import Toast from '../components/Toast'

const AuthContext = createContext(null)

const ROLE_STORAGE_KEY = 'hunione_active_role'
const ONBOARDING_STORAGE_KEY = 'hunione_listing_onboarded'
const VALID_ACTIVE_ROLES = ['buyer', 'owner', 'agent']

function readStoredRole(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(`${ROLE_STORAGE_KEY}:${userId}`)
    if (raw === 'buyer' || raw === 'owner' || raw === 'agent') return raw
  } catch { /* SSR or private mode */ }
  return null
}

function persistRole(userId, value) {
  if (!userId) return
  try {
    if (value) {
      localStorage.setItem(`${ROLE_STORAGE_KEY}:${userId}`, value)
    } else {
      localStorage.removeItem(`${ROLE_STORAGE_KEY}:${userId}`)
    }
  } catch { /* non-critical */ }
}

function readOnboarding(userId) {
  if (!userId) return false
  try {
    return localStorage.getItem(`${ONBOARDING_STORAGE_KEY}:${userId}`) === '1'
  } catch { /* SSR or private mode */ }
  return false
}

function persistOnboarding(userId) {
  if (!userId) return
  try {
    localStorage.setItem(`${ONBOARDING_STORAGE_KEY}:${userId}`, '1')
  } catch { /* non-critical */ }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [activeRole, setActiveRoleState] = useState(() => readStoredRole(null))
  const [ownerListingCount, setOwnerListingCount] = useState(0)
  const [listingOnboarded, setListingOnboarded] = useState(() => readOnboarding(null))

  const showToast = useCallback((message, type = 'error', action = null) => {
    setToast({ message, type, action })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const isAgentRole = role === 'agent' || role === 'admin'

  const setActiveRole = useCallback((nextRole) => {
    if (!VALID_ACTIVE_ROLES.includes(nextRole)) return
    if (nextRole === 'agent' && !isAgentRole) {
      showToast('Mode Agen memerlukan status agen terverifikasi', 'error')
      return
    }
    if (nextRole === 'owner' && ownerListingCount <= 0 && !listingOnboarded) {
      showToast('Iklankan properti pertamamu untuk mengaktifkan Mode Pemilik', 'error')
      return
    }
    setActiveRoleState((prev) => {
      if (prev === nextRole) return prev
      persistRole(user?.id, nextRole)
      return nextRole
    })
  }, [user?.id, isAgentRole, ownerListingCount, listingOnboarded, showToast])

  const markListingOnboarded = useCallback(() => {
    persistOnboarding(user?.id)
    setListingOnboarded(true)
  }, [user?.id])

  async function refreshListingBoundaries() {
    if (!user?.id) return
    setListingOnboarded(readOnboarding(user.id))
    try {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
      setOwnerListingCount(count || 0)
    } catch { /* listing count failure is non-critical */ }
  }

  const setWhatsappVerified = useCallback((whatsapp) => {
    setProfile((prev) => ({
      ...prev,
      whatsapp,
      whatsapp_verified: true,
    }))
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      /* sign-out failure is non-critical */
    }
    resetScrollLock()
    persistRole(user?.id, null)
    setSession(null)
    setUser(null)
    setRole(null)
    setProfile(null)
    setActiveRoleState(null)
    setOwnerListingCount(0)
    setListingOnboarded(false)
  }, [user?.id])

  useEffect(() => {
    setSupabase(supabase)
  }, [])

  const fetchRole = useCallback(async (userId) => {
    if (!userId) { setRole(null); return }
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
      if (!error && data) setRole(data.role)
    } catch {
      /* role fetch failure is non-critical */
    }
  }, [])

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const { data, error } = await supabase.rpc('get_my_profile')
      if (!error && data) {
        const p = Array.isArray(data) ? data[0] : data
        if (p) {
          setProfile(p)
          if (typeof p.role === 'string') setRole(p.role)
        }
      }
    } catch {
      /* profile fetch failure is non-critical */
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      fetchRole(session?.user?.id)
      fetchProfile(session?.user?.id)
      initFavorites(session?.user?.id)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setSession(null)
      setUser(null)
      setRole(null)
      setProfile(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      fetchRole(session?.user?.id)
      fetchProfile(session?.user?.id)
      initFavorites(session?.user?.id)
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [fetchRole, fetchProfile])

  useEffect(() => {
    if (!user?.id || loading) return
    let cancelled = false
    ;(async () => {
      let count = 0
      try {
        const { count: listingCount } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id)
        count = listingCount || 0
      } catch { /* listing count failure is non-critical */ }
      if (cancelled) return

      setOwnerListingCount(count)
      const onboarded = readOnboarding(user.id)
      setListingOnboarded(onboarded)

      const stored = readStoredRole(user.id)
      if (stored) {
        const storedValid =
          stored === 'buyer' ||
          (stored === 'agent' && (role === 'agent' || role === 'admin')) ||
          (stored === 'owner' && (count > 0 || onboarded))
        if (storedValid) {
          setActiveRoleState(stored)
          return
        }
      }

      const next = role === 'agent' || role === 'admin' ? 'agent' : count > 0 || onboarded ? 'owner' : 'buyer'
      setActiveRoleState(next)
      persistRole(user.id, next)
    })()
    return () => { cancelled = true }
  }, [user?.id, role, loading])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const channel = supabase
      .channel('profile-role-watcher')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (cancelled) return
          if (payload.new?.role) {
            setRole(payload.new.role)
          }
          if (typeof payload.new?.whatsapp_verified === 'boolean') {
            setProfile((prev) => ({
              ...prev,
              whatsapp: payload.new.whatsapp,
              whatsapp_verified: payload.new.whatsapp_verified,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, showToast, signOut, setWhatsappVerified, refreshProfile: fetchProfile, activeRole, setActiveRole, ownerListingCount, listingOnboarded, markListingOnboarded, refreshListingBoundaries }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} onClose={hideToast} />}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
