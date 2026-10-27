import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { getOtherId, HUNIBOT_ID, getRoomId } from './constants'

export function useChatRealtime(userId, {
  activeContactIdRef,
  messagesIdSetRef,
  onNewMessage,
  onUpdateMessage,
  onNewReaction,
  onDeleteReaction,
}) {
  const [connected, setConnected] = useState(false)
  const cancelledRef = useRef(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!userId) {
      return
    }

    cancelledRef.current = false
    const channel = supabase
      .channel(`direct-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          if (cancelledRef.current) return
          const msg = payload.new
          if (!msg) return
          if (msg.sender_id !== userId && msg.receiver_id !== userId) return
          if (msg.sender_id === userId) return
          if (msg.deleted_at) return
          const otherId = getOtherId(msg, userId)
          if (!otherId || otherId === HUNIBOT_ID) return

          const currentContactId = activeContactIdRef?.current
          const isActive = otherId === currentContactId

          if (typeof onNewMessage === 'function') {
            try {
              onNewMessage({ message: msg, otherId, isActive, currentContactId })
            } catch (err) {
              console.warn('onNewMessage error:', err?.message || err)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          if (cancelledRef.current) return
          const msg = payload.new
          if (!msg) return
          if (msg.sender_id !== userId && msg.receiver_id !== userId) return
          if (typeof onUpdateMessage === 'function') {
            try {
              onUpdateMessage({ message: msg })
            } catch (err) {
              console.warn('onUpdateMessage error:', err?.message || err)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (cancelledRef.current) return
          const r = payload.new
          if (!r || !r.message_id) return
          const activeId = activeContactIdRef?.current
          if (!activeId || activeId === HUNIBOT_ID) return
          const room = getRoomId(userId, activeId)
          const hasMsg = messagesIdSetRef?.current?.has(r.message_id)
          if (!room || !hasMsg) return
          if (typeof onNewReaction === 'function') {
            try {
              onNewReaction({ reaction: r, room, messageId: r.message_id })
            } catch (err) {
              console.warn('onNewReaction error:', err?.message || err)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (cancelledRef.current) return
          const old = payload.old
          if (!old || !old.message_id) return
          const activeId = activeContactIdRef?.current
          if (!activeId || activeId === HUNIBOT_ID) return
          const room = getRoomId(userId, activeId)
          const hasMsg = messagesIdSetRef?.current?.has(old.message_id)
          if (!room || !hasMsg) return
          if (typeof onDeleteReaction === 'function') {
            try {
              onDeleteReaction({ reaction: old, room, messageId: old.message_id })
            } catch (err) {
              console.warn('onDeleteReaction error:', err?.message || err)
            }
          }
        }
      )
      .subscribe((status) => {
        if (cancelledRef.current) return
        setConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      cancelledRef.current = true
      setConnected(false)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])

  return { connected }
}
