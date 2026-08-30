import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { getImageSrc } from '../utils/images'
import { formatPriceDisplay } from '../utils/format'
import { Send, ArrowLeft, MessageCircle, Search, Trash2, Plus, X, Loader2 } from 'lucide-react'
import ConfirmModal from './ConfirmModal'


function dayLabel(ts) {
  try {
    const d = new Date(ts)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = Math.round((today - day) / 86400000)
    if (diff === 0) return 'Hari Ini'
    if (diff === 1) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <span className="text-[10px] font-semibold text-brand-muted bg-brand-surface border border-brand-border rounded-full px-3 py-1">
        {date}
      </span>
    </div>
  )
}

function MessageBubble({ message, isOwn, onDelete, lang, firstInGroup, lastInGroup, otherName, otherColor }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 ${firstInGroup ? 'mt-3' : 'mt-0.5'}`}>
      {!isOwn && (
        <div className="w-7 shrink-0 mr-2 self-end flex justify-center">
          {lastInGroup && (
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: otherColor }}
            >
              {getInitials(otherName || '?')}
            </span>
          )}
        </div>
      )}
      <div className="relative max-w-[80%] sm:max-w-[70%]">
        {isOwn && (
          <button
            type="button"
            onClick={() => onDelete?.(message.id)}
            className="absolute -top-1.5 -right-1.5 z-10 w-7 h-7 rounded-full bg-white/80 border border-brand-border shadow-sm flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-brand-muted transition-all"
            title="Hapus pesan"
            aria-label="Hapus pesan"
          >
            <Trash2 size={12} />
          </button>
        )}
        <div className={`rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-brand-primary text-white rounded-br-md'
            : 'bg-white border border-brand-border text-brand-text rounded-bl-md'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          <div className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 ${isOwn ? 'text-white/70' : 'text-brand-muted'}`}>
            <span>{timeAgo(message.created_at, lang)}</span>
            {isOwn && (
              <span className="font-bold tracking-tighter">
                {message.read_at ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactItem({ contact, isActive, onClick, lang }) {
  const avatarColor = getAvatarColor(contact.id)
  const initials = getInitials(contact.first_name)
  const roleLabel = contact.role === 'admin' ? 'Admin Internal'
    : contact.role === 'agent' ? 'Agent'
    : contact.role === 'developer' ? 'Developer'
    : contact.role === 'owner' ? 'Owner'
    : 'Pembeli'

  return (
    <button
      type="button"
      onClick={() => onClick(contact.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive
          ? 'bg-brand-accent/10 border-l-2 border-brand-accent'
          : 'hover:bg-brand-bg border-l-2 border-transparent'
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-brand-text truncate">{contact.first_name || 'User'}</span>
          {contact.last_message_at && (
            <span className="text-[10px] text-brand-muted shrink-0">{timeAgo(contact.last_message_at, lang)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {contact.role && (
            <span className="text-[10px] font-medium text-brand-accent shrink-0">{roleLabel}</span>
          )}
          <p className="text-xs text-brand-muted truncate">
            {contact.last_message || 'Belum ada pesan'}
          </p>
        </div>
      </div>
    </button>
  )
}

function ContactListSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-brand-border shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-brand-border rounded w-24" />
            <div className="h-2.5 bg-brand-border rounded w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyChat({ contactName }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4">
        <MessageCircle size={28} className="text-brand-muted" />
      </div>
      <h3 className="text-base font-bold text-brand-text">Mulai Obrolan</h3>
      <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
        {contactName
          ? `Kirim pesan pertama ke ${contactName}`
          : 'Pilih kontak untuk memulai obrolan'}
      </p>
    </div>
  )
}

function LoginPrompt() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center mb-4">
        <MessageCircle size={32} className="text-brand-accent" />
      </div>
      <h2 className="text-lg font-bold text-brand-text text-center">Masuk untuk Mengobrol</h2>
      <p className="text-sm text-brand-muted mt-1 text-center max-w-xs leading-relaxed">
        Silakan login atau daftar untuk mengirim pesan ke agen atau tim support.
      </p>
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="mt-6 px-8 py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200"
      >
        Login / Daftar
      </button>
    </div>
  )
}

function getOtherId(message, userId) {
  return message.sender_id === userId ? message.receiver_id : message.sender_id
}

export default function ChatHubPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { session, user, showToast } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const cancelledRef = useRef(false)
  const messagesEndRef = useRef(null)
  const messagesScrollRef = useRef(null)
  const inputRef = useRef(null)
  const contactsRef = useRef([])

  const userId = session?.user?.id || user?.id

  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [activeContactId, setActiveContactId] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMobileList, setShowMobileList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [unreadMap, setUnreadMap] = useState({})
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const typingChannelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const PAGE_SIZE = 50
  const [contextProperty, setContextProperty] = useState(null)
  const [showContextCard, setShowContextCard] = useState(false)

  const activeContact = contacts.find((c) => c.id === activeContactId) || null

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  const filteredContacts = contacts.filter((c) =>
    !searchQuery.trim() || (c.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    cancelledRef.current = false

    async function fetchContacts() {
      try {
        const { data: allMessages, error: msgErr } = await supabase
          .from('direct_messages')
          .select('sender_id, receiver_id, content, created_at, read_at')
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
          contactIds.add(otherId)
          if (!lastMessageMap[otherId]) {
            lastMessageMap[otherId] = { content: m.content, created_at: m.created_at }
          }
          if (m.receiver_id === userId && !m.read_at) {
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

        const ids = [...contactIds]
        if (ids.length === 0) {
          if (!cancelledRef.current) {
            setContacts([])
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
        if (!cancelledRef.current) console.warn('Gagal memuat kontak:', err.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchContacts()
    return () => { cancelledRef.current = true }
  }, [userId])

  const openUserId = searchParams.get('user')
  const propertyId = searchParams.get('property')

  useEffect(() => {
    if (!propertyId || contextProperty) return
    let cancelled = false
    supabase
      .from('properties')
      .select('id, title, price, category, price_period, image_url, address, city, status')
      .eq('id', propertyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setContextProperty(data)
        setShowContextCard(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId])

  const didAutoSelectRef = useRef(false)
  useEffect(() => {
    if (!openUserId || didAutoSelectRef.current) return
    const found = contacts.some((c) => c.id === openUserId)
    if (found) {
      didAutoSelectRef.current = true
      handleSelectContact(openUserId)
      setSearchParams({}, { replace: true })
    }
  }, [openUserId, contacts, setSearchParams])

  useEffect(() => {
    if (!activeContactId || !userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([])
      setHasMore(false)
      return
    }

    cancelledRef.current = false

    async function fetchMessages() {
      setMessagesLoading(true)
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)

        if (cancelledRef.current) return

        if (error) {
          console.warn('Gagal memuat pesan:', error.message)
        } else if (data) {
          setMessages(data.slice().reverse())
          setHasMore(data.length === PAGE_SIZE)
        }
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat pesan:', err.message)
      }
      if (!cancelledRef.current) setMessagesLoading(false)
    }

    fetchMessages()
    return () => { cancelledRef.current = true }
  }, [activeContactId, userId])

  async function loadEarlier() {
    if (!activeContactId || !userId || loadingEarlier || !messages[0]) return
    setLoadingEarlier(true)
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${userId})`
        )
        .lt('created_at', messages[0].created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (error) {
        console.warn('Gagal memuat pesan sebelumnya:', error.message)
      } else if (data) {
        setMessages((prev) => [...data.slice().reverse(), ...prev])
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch (err) {
      console.warn('Gagal memuat pesan sebelumnya:', err.message)
    }
    setLoadingEarlier(false)
  }

  useEffect(() => {
    if (!activeContactId || !userId) return
    const markRead = async () => {
      setMessages((prev) => prev.map((m) => (m.sender_id === activeContactId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)))
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .eq('sender_id', activeContactId)
        .is('read_at', null)
      if (!error) {
        setUnreadMap((prev) => ({ ...prev, [activeContactId]: 0 }))
      }
    }
    markRead()
  }, [activeContactId, userId])

  useEffect(() => {
    if (!userId || !activeContactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOtherTyping(false)
      return
    }
    const room = [userId, activeContactId].sort().join('-')
    const ch = supabase.channel(`chat-typing-${room}`)
    typingChannelRef.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const others = Object.values(ch.presenceState() || {})
        .flat()
        .filter((p) => p.userId !== userId && p.typing)
      setOtherTyping(others.length > 0)
    }).subscribe()

    return () => {
      supabase.removeChannel(ch)
      typingChannelRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [userId, activeContactId])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`direct-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          if (cancelledRef.current) return
          const msg = payload.new
          const otherId = getOtherId(msg, userId)

          setMessages((prev) => {
            if (otherId !== activeContactId) return prev
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          if (otherId !== activeContactId) {
            setUnreadMap(prev => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }))
            const senderName = contactsRef.current.find(c => c.id === otherId)?.first_name || 'Seseorang'
            if (msg.content) showToast(`${senderName}: ${msg.content.slice(0, 80)}`, 'info')
          } else {
            supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {}).catch(() => {})
            setUnreadMap(prev => ({ ...prev, [otherId]: 0 }))
          }

          setContacts((prev) => {
            const idx = prev.findIndex((c) => c.id === otherId)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = { ...updated[idx], last_message: msg.content, last_message_at: msg.created_at, unread: undefined }
              const [item] = updated.splice(idx, 1)
              return [item, ...updated]
            }
            const existingIds = new Set(prev.map(c => c.id))
            if (!existingIds.has(otherId)) {
              supabase.from('profiles').select('id, first_name, role').eq('id', otherId).single().then(({ data }) => {
                if (data && !cancelledRef.current) {
                  setContacts(p => {
                    if (p.some(c => c.id === data.id)) return p
                    return [{ ...data, last_message: msg.content, last_message_at: msg.created_at }, ...p]
                  })
                }
              }).catch(() => {})
            }
            return prev
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          if (cancelledRef.current) return
          const msg = payload.new
          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, activeContactId, showToast])

  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, activeContactId])

  function handleSelectContact(contactId) {
    setActiveContactId(contactId)
    setShowMobileList(false)
    setUnreadMap(prev => ({ ...prev, [contactId]: 0 }))
  }

  function handleBackToList() {
    setShowMobileList(true)
  }

  async function handleSend(e) {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || !userId || !activeContactId || sending) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingChannelRef.current?.untrack()

    setSending(true)
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: activeContactId,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setInputValue('')
    inputRef.current?.focus()

    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: text,
      }).select()

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      } else if (data?.[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m))
      }
    } catch (err) {
      if (!cancelledRef.current) {
        showToast(err.message || 'Gagal mengirim pesan', 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }
    }
    if (!cancelledRef.current) setSending(false)
  }

  function handleInputChange(e) {
    const val = e.target.value
    setInputValue(val)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (!typingChannelRef.current) return
    if (val.trim()) {
      typingChannelRef.current.track({ userId, typing: true })
      typingTimeoutRef.current = setTimeout(() => {
        typingChannelRef.current?.untrack()
      }, 2500)
    } else {
      typingChannelRef.current.untrack()
    }
  }

  async function handleDeleteMessage() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data, error } = await supabase.from('direct_messages').delete().eq('id', deleteTarget).eq('sender_id', userId).select()
      if (data?.length > 0) {
        setMessages(prev => prev.filter(m => m.id !== deleteTarget))
      } else if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Gagal menghapus — tidak ada izin. Hubungi admin.', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Gagal menghapus pesan', 'error')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  async function handleStartNewChat(contactId) {
    setShowNewChat(false)
    setActiveContactId(contactId)
    setShowMobileList(false)
    setUnreadMap(prev => ({ ...prev, [contactId]: 0 }))
  }

  useEffect(() => {
    if (!showNewChat) return
    let cancelled = false
    supabase.from('profiles').select('id, first_name, role').neq('id', userId).then(({ data }) => {
      if (!cancelled) setAllUsers(data || [])
    }).catch(() => {
      if (!cancelled) setAllUsers([])
    }).finally(() => {
      if (!cancelled) setAllUsersLoading(false)
    })
    return () => { cancelled = true }
  }, [showNewChat, userId])

  if (!userId) {
    return <LoginPrompt />
  }

  return (
    <>
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row lg:max-w-7xl lg:mx-auto lg:w-full lg:border-x lg:border-brand-border overflow-hidden">
        {/* ─── Contact List ───────────────────────────────────── */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-80 lg:border-r lg:border-brand-border bg-brand-surface`}
        >
          <div className="flex items-center gap-3 px-4 h-14 border-b border-brand-border">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="lg:hidden text-brand-muted hover:text-brand-text transition-colors -ml-1 p-1 shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-brand-text flex-1">Pesan</h1>
            <button
              type="button"
              onClick={() => { setAllUsersLoading(true); setShowNewChat(true) }}
              className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent hover:bg-brand-accent/20 active:scale-90 transition-all"
              title="Mulai obrolan baru"
            >
              <Plus size={18} />
            </button>
          </div>

          {contacts.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand-border rounded-lg">
                <Search size={14} className="text-brand-muted shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kontak..."
                  className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
                />
                {searchQuery && (
                  <button type="button" aria-label="Bersihkan pencarian" onClick={() => setSearchQuery('')} className="text-brand-muted hover:text-brand-text">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <ContactListSkeleton />
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageCircle size={32} className="text-brand-muted/40 mb-3" />
                <p className="text-sm text-brand-muted leading-relaxed">
                  {searchQuery ? 'Kontak tidak ditemukan.' : 'Belum ada kontak. Mulai dengan menghubungi agen atau tim support.'}
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div key={contact.id} className="relative">
                  <ContactItem
                    contact={contact}
                    isActive={contact.id === activeContactId}
                    onClick={handleSelectContact}
                    lang={i18n.language}
                  />
                  {(unreadMap[contact.id] || 0) > 0 && contact.id !== activeContactId && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadMap[contact.id]}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat Window ────────────────────────────────────── */}
        <div
          className={`${
            !showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col flex-1 bg-brand-surface/50`}
        >
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 h-14 border-b border-brand-border bg-brand-surface">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="lg:hidden text-brand-muted hover:text-brand-text transition-colors -ml-1 p-1 shrink-0"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: getAvatarColor(activeContact.id) }}
                >
                  {getInitials(activeContact.first_name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-text truncate">
                    {activeContact.first_name || 'User'}
                  </p>
                  {otherTyping ? (
                    <p className="text-xs text-brand-accent font-medium">sedang mengetik...</p>
                  ) : activeContact.role ? (
                    <p className="text-xs text-brand-muted">
                      {activeContact.role === 'admin' ? 'Admin Internal'
                        : activeContact.role === 'agent' ? 'Agent'
                        : activeContact.role === 'developer' ? 'Developer'
                        : activeContact.role === 'owner' ? 'Owner'
                        : 'Pembeli'}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Property context card */}
              {contextProperty && showContextCard && (
                <div className="px-4 py-3 border-b border-brand-border bg-brand-bg/60">
                  <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface p-2.5 pr-1">
                    <Link
                      to={`/property/${contextProperty.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0 group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-brand-bg shrink-0">
                        <img
                          src={getImageSrc(contextProperty.image_url)}
                          alt={contextProperty.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-brand-text truncate group-hover:text-brand-accent transition-colors">
                          {contextProperty.title || 'Properti'}
                        </p>
                        <p className="text-xs font-bold text-brand-primary mt-0.5">
                          {Number(contextProperty.price) > 0 ? formatPriceDisplay(contextProperty) : 'Harga Hubungi'}
                        </p>
                        <p className="text-[10px] text-brand-muted truncate mt-0.5">
                          {contextProperty.address || [contextProperty.city].filter(Boolean).join(', ') || 'Lokasi tersedia'}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowContextCard(false)}
                      className="p-2 rounded-full text-brand-muted hover:text-brand-text shrink-0"
                      aria-label="Tutup konteks properti"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={messagesScrollRef} className="flex-1 overflow-y-auto py-2">
                {messagesLoading ? (
                  <div className="px-4 space-y-4 py-4">
                    <div className="flex justify-start">
                      <div className="w-2/3 space-y-2 animate-pulse">
                        <div className="h-3 w-1/3 bg-brand-border rounded-full" />
                        <div className="h-3 w-2/3 bg-brand-border rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="w-1/2 space-y-2 animate-pulse">
                        <div className="h-3 w-full bg-brand-border rounded-full" />
                        <div className="h-3 w-3/4 bg-brand-border rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="w-3/5 space-y-2 animate-pulse">
                        <div className="h-3 w-1/2 bg-brand-border rounded-full" />
                        <div className="h-3 w-full bg-brand-border rounded-full" />
                        <div className="h-3 w-2/3 bg-brand-border rounded-full" />
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyChat contactName={activeContact.first_name} />
                ) : (
                  <>
                    {hasMore && (
                      <div className="px-4 py-2 flex justify-center">
                        <button
                          type="button"
                          onClick={loadEarlier}
                          disabled={loadingEarlier}
                          className="text-xs font-semibold text-brand-accent hover:text-brand-primary disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {loadingEarlier && <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />}
                          Muat pesan sebelumnya
                        </button>
                      </div>
                    )}
                    {messages.map((msg, i) => {
                      const prev = messages[i - 1]
                      const next = messages[i + 1]
                      const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at)
                      const firstInGroup = !prev || prev.sender_id !== msg.sender_id || newDay
                      const lastInGroup = !next || next.sender_id !== msg.sender_id || dayLabel(next.created_at) !== dayLabel(msg.created_at)
                      return (
                        <div key={msg.id}>
                          {newDay && i > 0 && <DateSeparator date={dayLabel(msg.created_at)} />}
                          <MessageBubble
                            message={msg}
                            isOwn={msg.sender_id === userId}
                            onDelete={setDeleteTarget}
                            lang={i18n.language}
                            firstInGroup={firstInGroup}
                            lastInGroup={lastInGroup}
                            otherName={activeContact.first_name}
                            otherColor={getAvatarColor(activeContact.id)}
                          />
                        </div>
                      )
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 px-4 py-3 border-t border-brand-border bg-brand-surface"
              >
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Tulis pesan..."
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !inputValue.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Kirim pesan"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <EmptyChat contactName={null} />
          )}
        </div>
      </div>
    </div>

    {showNewChat && (
      <>
        <button type="button" aria-label="Tutup" onClick={() => setShowNewChat(false)} className="fixed inset-0 bg-black/40 z-40 cursor-default p-0 border-0" />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-brand-text">Obrolan Baru</h2>
            <button type="button" aria-label="Tutup" onClick={() => setShowNewChat(false)} className="text-brand-muted hover:text-brand-text">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-bg border border-brand-border rounded-xl mb-4">
            <Search size={14} className="text-brand-muted shrink-0" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari pengguna..."
              className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
            />
            {userSearch && (
              <button type="button" aria-label="Bersihkan pencarian" onClick={() => setUserSearch('')} className="text-brand-muted hover:text-brand-text">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {allUsers
              .filter(u => !userSearch || (u.first_name || '').toLowerCase().includes(userSearch.toLowerCase()))
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleStartNewChat(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-brand-bg transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: getAvatarColor(u.id) }}
                  >
                    {getInitials(u.first_name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text">{u.first_name || 'User'}</p>
                    <p className="text-xs text-brand-muted">
                      {u.role === 'admin' ? 'Admin Internal'
                        : u.role === 'agent' ? 'Agent'
                        : u.role === 'developer' ? 'Developer'
                        : u.role === 'owner' ? 'Owner'
                        : 'Pembeli'}
                    </p>
                  </div>
                </button>
              ))}
            {allUsersLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-brand-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Memuat pengguna...</span>
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-sm text-brand-muted text-center py-8">Tidak ada pengguna lain.</p>
            ) : null}
          </div>
        </div>
      </>
    )}

    <ConfirmModal
      isOpen={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteMessage}
      title="Hapus Pesan"
      description="Apakah Anda yakin ingin menghapus pesan ini?"
      confirmText="Hapus"
      cancelText="Batal"
      loading={deleting}
    />
    </>
  )
}
