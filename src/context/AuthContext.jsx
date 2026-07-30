import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { setSupabase, initFavorites } from '../utils/favorites'
import Toast from '../components/Toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
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

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      fetchRole(session?.user?.id)
      initFavorites(session?.user?.id)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setSession(null)
      setUser(null)
      setRole(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      fetchRole(session?.user?.id)
      initFavorites(session?.user?.id)
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [fetchRole])

  return (
    <AuthContext.Provider value={{ session, user, role, loading, showToast, signOut }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
