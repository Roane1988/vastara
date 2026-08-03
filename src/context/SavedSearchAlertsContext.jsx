import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { matchesFilters } from '../utils/savedSearch'

const SavedSearchAlertsContext = createContext(null)

const PROPERTY_FIELDS = 'id, title, address, city, district, description_id, property_type, is_premium, price, category, bedrooms, created_at'

export function SavedSearchAlertsProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [totalNew, setTotalNew] = useState(0)
  const [loading, setLoading] = useState(false)
  const inFlight = useRef(false)

  const compute = useCallback(async () => {
    if (!userId) {
      setTotalNew(0)
      return
    }
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const [{ data: searches, error: sErr }, { data: props, error: pErr }] = await Promise.all([
        supabase
          .from('saved_searches')
          .select('id, filters, active, last_checked_at, created_at')
          .eq('user_id', userId),
        supabase.from('properties').select(PROPERTY_FIELDS).eq('status', 'verified'),
      ])
      if (sErr || pErr) return

      let count = 0
      ;(searches || []).forEach((s) => {
        if (s.active === false) return
        const base = s.last_checked_at
          ? new Date(s.last_checked_at).getTime()
          : new Date(s.created_at).getTime()
        ;(props || []).forEach((p) => {
          if (new Date(p.created_at).getTime() > base && matchesFilters(p, s.filters)) {
            count += 1
          }
        })
      })
      setTotalNew(count)
    } catch {
      /* keep last value on error */
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!cancelled) setUserId(data?.user?.id || null)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (!cancelled) setUserId(session?.user?.id || null)
    })
    return () => {
      cancelled = true
      sub?.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    compute()
  }, [compute])

  useEffect(() => {
    const onFocus = () => compute()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [compute])

  useEffect(() => {
    const onEvent = () => compute()
    window.addEventListener('saved-searches-updated', onEvent)
    return () => window.removeEventListener('saved-searches-updated', onEvent)
  }, [compute])

  const refresh = useCallback(() => {
    compute()
  }, [compute])

  return (
    <SavedSearchAlertsContext.Provider value={{ totalNew, loading, refresh }}>
      {children}
    </SavedSearchAlertsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSavedSearchAlerts() {
  const ctx = useContext(SavedSearchAlertsContext)
  if (!ctx) return { totalNew: 0, loading: false, refresh: () => {} }
  return ctx
}
