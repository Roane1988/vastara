import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

export function useChatUnread(userId, scope = 'default') {
  const [unread, setUnread] = useState(0)
  const decrementedRef = useRef(new Set())

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    ;(async () => {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .is('read_at', null)
      if (!cancelled && !error && typeof count === 'number') {
        setUnread(count)
      }
    })()

    const channel = supabase
      .channel(`unread-${scope}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return
          const msg = payload.new
          if (msg && msg.sender_id !== userId) {
            setUnread((prev) => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return
          const msg = payload.new
          if (msg && msg.read_at && !decrementedRef.current.has(msg.id)) {
            decrementedRef.current.add(msg.id)
            setUnread((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId, scope])

  const markRead = useCallback(async (contactId) => {
    if (!userId || !contactId) return
    let query = supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .is('read_at', null)
    if (contactId) query = query.eq('sender_id', contactId)
    try {
      await query
    } catch {
      /* non-blocking; realtime UPDATE events will sync the badge */
    }
  }, [userId])

  return { unread, markRead }
}
