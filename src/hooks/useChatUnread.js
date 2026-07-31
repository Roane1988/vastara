import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const STORAGE_KEY = 'huniOne_last_chat_read'

function getLastRead() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch { /* storage unavailable */ }
  const now = new Date().toISOString()
  try { localStorage.setItem(STORAGE_KEY, now) } catch { /* storage unavailable */ }
  return now
}

export function useChatUnread(userId) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const lastRead = getLastRead()

    ;(async () => {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .gt('created_at', lastRead)
      if (!cancelled && !error && typeof count === 'number') {
        setUnread(count)
      }
    })()

    const channel = supabase
      .channel(`hamburger-unread-${userId}`)
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
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markRead = useCallback(() => {
    const now = new Date().toISOString()
    try { localStorage.setItem(STORAGE_KEY, now) } catch { /* storage unavailable */ }
    setUnread(0)
  }, [])

  return { unread, markRead }
}
