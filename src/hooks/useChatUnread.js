import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

export function useChatUnread(userId, scope = 'default') {
  const [unread, setUnread] = useState(0)
  const decrementedRef = useRef(new Set())
  const cancelledRef = useRef(false)
  const resyncTimerRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    cancelledRef.current = false

    async function fetchCount() {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .neq('sender_id', userId)
        .is('read_at', null)
      if (!cancelledRef.current && !error && typeof count === 'number') {
        setUnread(count)
      }
    }

    fetchCount()

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
          if (cancelledRef.current) return
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
          if (cancelledRef.current) return
          const msg = payload.new
          if (msg && msg.read_at && !decrementedRef.current.has(msg.id)) {
            decrementedRef.current.add(msg.id)
            setUnread((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => { fetchCount() }
      )
      .subscribe()

    function handleVisibilityChange() {
      if (!cancelledRef.current && document.visibilityState === 'visible') {
        fetchCount()
      }
    }

    function handleFocus() {
      if (!cancelledRef.current) fetchCount()
    }

    function handleChatRead() {
      if (cancelledRef.current) return
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current)
      resyncTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current) fetchCount()
      }, 120)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('chat-read-updated', handleChatRead)

    return () => {
      cancelledRef.current = true
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current)
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('chat-read-updated', handleChatRead)
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
