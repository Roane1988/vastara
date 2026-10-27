import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { PAGE_SIZE, HUNIBOT_ID } from './constants'

export function useChatMessages(userId, activeContactId, options = {}) {
  const {
    onFirstLoad,
    onPrefill,
    contextProperty,
    propertyId,
  } = options

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [error, setError] = useState(null)

  const cancelledRef = useRef(false)
  const [retryCounter, setRetryCounter] = useState(0)

  const retry = useCallback(() => {
    setRetryCounter(c => c + 1)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setHasMore(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!activeContactId || !userId || activeContactId === HUNIBOT_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([])
      setHasMore(false)
      setError(null)
      setLoading(false)
      return
    }

    cancelledRef.current = false
    setError(null)
    setLoading(true)

    async function fetchMessages() {
      try {
        const { data, error: msgErr } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (cancelledRef.current) return

        if (msgErr) {
          console.warn('Gagal memuat pesan:', msgErr.message)
          if (!cancelledRef.current) setError('Pesan tidak dapat dimuat. Periksa koneksi Anda.')
        } else if (data) {
          const loaded = data.slice().reverse()
          if (!cancelledRef.current) {
            setMessages(loaded)
            setHasMore(data.length === PAGE_SIZE)
          }
          if (typeof onFirstLoad === 'function') {
            try { onFirstLoad(loaded) } catch { /* ignore */ }
          }
          if (typeof onPrefill === 'function') {
            try { await onPrefill({ messages: loaded, contextProperty, propertyId }) } catch { /* ignore */ }
          }
        }
      } catch (err) {
        if (!cancelledRef.current) {
          console.warn('Gagal memuat pesan:', err.message)
          setError('Pesan tidak dapat dimuat. Periksa koneksi Anda.')
        }
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchMessages()
    return () => { cancelledRef.current = true }
  }, [activeContactId, userId, retryCounter, onFirstLoad, onPrefill, contextProperty, propertyId, clearMessages])

  const loadEarlier = useCallback(async () => {
    if (!activeContactId || !userId || loadingEarlier || messages.length === 0) return
    const first = messages[0]
    if (!first?.created_at) return
    setLoadingEarlier(true)
    try {
      const { data, error: msgErr } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${userId})`
        )
        .lt('created_at', first.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (msgErr) {
        console.warn('Gagal memuat pesan sebelumnya:', msgErr.message)
      } else if (data) {
        const loaded = data.slice().reverse()
        setMessages(prev => [...loaded, ...prev])
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch (err) {
      console.warn('Gagal memuat pesan sebelumnya:', err.message)
    } finally {
      setLoadingEarlier(false)
    }
  }, [activeContactId, userId, loadingEarlier, messages])

  const appendMessage = useCallback((msg) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  const replaceMessage = useCallback((id, patch) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }, [])

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  const markMessagesReadLocally = useCallback((senderId) => {
    setMessages(prev => prev.map(m => (m.sender_id === senderId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)))
  }, [])

  return {
    messages,
    setMessages,
    loading,
    hasMore,
    loadingEarlier,
    error,
    retry,
    loadEarlier,
    appendMessage,
    replaceMessage,
    removeMessage,
    markMessagesReadLocally,
    clearMessages,
  }
}
