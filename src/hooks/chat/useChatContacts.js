import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { getOtherId, HUNIBOT_ID } from './constants'

export function useChatContacts(userId) {
  const [contacts, setContacts] = useState([])
  const [unreadMap, setUnreadMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)
  const [retryCounter, setRetryCounter] = useState(0)

  const retry = useCallback(() => {
    setRetryCounter(c => c + 1)
  }, [])

  const markContactRead = useCallback((contactId) => {
    setUnreadMap(prev => ({ ...prev, [contactId]: 0 }))
  }, [])

  const markAllRead = useCallback(() => {
    setUnreadMap({})
  }, [])

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      setContacts([])
      setUnreadMap({})
      return
    }

    cancelledRef.current = false
    setError(null)
    setLoading(true)

    async function fetchContacts() {
      try {
        const { data: allMessages, error: msgErr } = await supabase
          .from('direct_messages')
          .select('sender_id, receiver_id, content, created_at, read_at, deleted_at')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(500)

        if (cancelledRef.current) return
        if (msgErr) {
          console.warn('Gagal memuat pesan:', msgErr.message)
        }

        const contactIds = new Set()
        const lastMessageMap = {}
        const unreadCounts = {}
        ;(allMessages || []).forEach((m) => {
          const otherId = getOtherId(m, userId)
          if (!otherId) return
          contactIds.add(otherId)
          if (!lastMessageMap[otherId] && !m.deleted_at) {
            lastMessageMap[otherId] = { content: m.content, created_at: m.created_at }
          }
          if (m.receiver_id === userId && !m.read_at && !m.deleted_at && otherId !== HUNIBOT_ID) {
            unreadCounts[otherId] = (unreadCounts[otherId] || 0) + 1
          }
        })

        const { data: agents, error: agentErr } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['agent', 'developer', 'admin'])
          .neq('id', userId)

        if (cancelledRef.current) return
        if (!agentErr && agents) {
          agents.forEach((a) => contactIds.add(a.id))
        }

        const ids = [...contactIds].filter(id => id && id !== HUNIBOT_ID)
        if (ids.length === 0) {
          if (!cancelledRef.current) {
            setContacts([])
            setUnreadMap(unreadCounts)
            setLoading(false)
          }
          return
        }

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, first_name, role')
          .in('id', ids)

        if (cancelledRef.current) return
        if (profErr) {
          console.warn('Gagal memuat profil kontak:', profErr.message)
          if (!cancelledRef.current) {
            setError('Kontak tidak dapat dimuat.')
          }
          setLoading(false)
          return
        }

        const merged = (profiles || []).map((p) => ({
          ...p,
          last_message: lastMessageMap[p.id]?.content || null,
          last_message_at: lastMessageMap[p.id]?.created_at || null,
        }))

        merged.sort((a, b) => {
          if (a.last_message_at && b.last_message_at) {
            return new Date(b.last_message_at) - new Date(a.last_message_at)
          }
          if (a.last_message_at) return -1
          if (b.last_message_at) return 1
          return (a.first_name || '').localeCompare(b.first_name || '')
        })

        if (!cancelledRef.current) {
          setContacts(merged)
          setUnreadMap(unreadCounts)
        }
      } catch (err) {
        if (!cancelledRef.current) {
          console.warn('Gagal memuat kontak:', err.message)
          setError('Kontak tidak dapat dimuat. Periksa koneksi Anda.')
        }
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchContacts()
    return () => { cancelledRef.current = true }
  }, [userId, retryCounter])

  const upsertContact = useCallback((contact) => {
    if (!contact?.id) return
    setContacts(prev => {
      if (prev.some(c => c.id === contact.id)) {
        return prev.map(c => c.id === contact.id ? { ...c, ...contact } : c)
      }
      return [contact, ...prev]
    })
  }, [])

  const moveContactToTop = useCallback((contactId, patch = {}) => {
    setContacts(prev => {
      const idx = prev.findIndex(c => c.id === contactId)
      if (idx < 0) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...patch }
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })
  }, [])

  return {
    contacts,
    setContacts,
    unreadMap,
    setUnreadMap,
    loading,
    error,
    retry,
    markContactRead,
    markAllRead,
    upsertContact,
    moveContactToTop,
  }
}
