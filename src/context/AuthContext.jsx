import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { setSupabase, initFavorites } from '../utils/favorites'
import Toast from '../components/Toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'error', action = null) => {
    setToast({ message, type, action })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

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
    setSession(null)
    setUser(null)
    setRole(null)
    setProfile(null)
  }, [])

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
    <AuthContext.Provider value={{ session, user, role, profile, loading, showToast, signOut, setWhatsappVerified, refreshProfile: fetchProfile }}>
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
