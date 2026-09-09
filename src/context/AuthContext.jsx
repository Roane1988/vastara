import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { setSupabase, initFavorites } from '../utils/favorites'
import { resetScrollLock } from '../utils/scrollLock'
import Toast from '../components/Toast'

const AuthContext = createContext(null)

const ROLE_STORAGE_KEY = 'hunione_active_role'

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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [activeRole, setActiveRoleState] = useState(() => readStoredRole(null))
  const [ownerListingCount, setOwnerListingCount] = useState(0)

  const showToast = useCallback((message, type = 'error', action = null) => {
    setToast({ message, type, action })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const setActiveRole = useCallback((nextRole) => {
    setActiveRoleState((prev) => {
      if (prev === nextRole) return prev
      persistRole(user?.id, nextRole)
      return nextRole
    })
  }, [user?.id])

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
      const stored = readStoredRole(user.id)
      if (cancelled) return
      if (stored) {
        setActiveRoleState(stored)
        return
      }
      if (role === 'agent' || role === 'admin') {
        setActiveRoleState('agent')
        persistRole(user.id, 'agent')
        return
      }
      try {
        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id)
        if (cancelled) return
        setOwnerListingCount(count || 0)
        const next = (count || 0) > 0 ? 'owner' : 'buyer'
        setActiveRoleState(next)
        persistRole(user.id, next)
      } catch {
        if (!cancelled) {
          setActiveRoleState('buyer')
          persistRole(user.id, 'buyer')
        }
      }
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
    <AuthContext.Provider value={{ session, user, role, profile, loading, showToast, signOut, setWhatsappVerified, refreshProfile: fetchProfile, activeRole, setActiveRole, ownerListingCount }}>
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
