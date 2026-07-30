import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'


function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 px-4`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-brand-primary text-white rounded-br-md'
            : 'bg-white border border-brand-border text-brand-text rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-brand-muted'}`}>
          {timeAgo(message.created_at)}
        </p>
      </div>
    </div>
  )
}

function ContactItem({ contact, isActive, onClick }) {
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
            <span className="text-[10px] text-brand-muted shrink-0">{timeAgo(contact.last_message_at)}</span>
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
  const navigate = useNavigate()
  const { session, user, showToast } = useAuth()
  const cancelledRef = useRef(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const userId = session?.user?.id || user?.id

  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [activeContactId, setActiveContactId] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMobileList, setShowMobileList] = useState(true)

  const activeContact = contacts.find((c) => c.id === activeContactId) || null

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
          .select('sender_id, receiver_id, content, created_at')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(200)

        if (cancelledRef.current) return

        if (msgErr) {
          console.warn('Gagal memuat pesan:', msgErr.message)
        }

        const contactIds = new Set()
        const lastMessageMap = {}
        ;(allMessages || []).forEach((m) => {
          const otherId = getOtherId(m, userId)
          contactIds.add(otherId)
          if (!lastMessageMap[otherId]) {
            lastMessageMap[otherId] = { content: m.content, created_at: m.created_at }
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
          if (!cancelledRef.current) setContacts([])
          return
        }

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('*')
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

        if (!cancelledRef.current) setContacts(merged)
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat kontak:', err.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchContacts()
    return () => { cancelledRef.current = true }
  }, [userId])

  useEffect(() => {
    if (!activeContactId || !userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([])
      return
    }

    cancelledRef.current = false

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: true })
          .limit(200)

        if (cancelledRef.current) return

        if (error) {
          console.warn('Gagal memuat pesan:', error.message)
        } else if (data) {
          setMessages(data)
        }
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat pesan:', err.message)
      }
    }

    fetchMessages()
    return () => { cancelledRef.current = true }
  }, [activeContactId, userId])

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

          setContacts((prev) => {
            const idx = prev.findIndex((c) => c.id === otherId)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = { ...updated[idx], last_message: msg.content, last_message_at: msg.created_at }
              const [item] = updated.splice(idx, 1)
              return [item, ...updated]
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, activeContactId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSelectContact(contactId) {
    setActiveContactId(contactId)
    setShowMobileList(false)
  }

  function handleBackToList() {
    setShowMobileList(true)
  }

  async function handleSend(e) {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || !userId || !activeContactId || sending) return

    setSending(true)
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: text,
      })

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setInputValue('')
        inputRef.current?.focus()
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal mengirim pesan', 'error')
    }
    if (!cancelledRef.current) setSending(false)
  }

  if (!userId) {
    return <LoginPrompt />
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row lg:max-w-7xl lg:mx-auto lg:w-full lg:border-x lg:border-brand-border overflow-hidden">
        {/* ─── Contact List ───────────────────────────────────── */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-80 lg:border-r lg:border-brand-border bg-brand-surface`}
        >
          <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-brand-border">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="lg:hidden w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-brand-text">Pesan</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <ContactListSkeleton />
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageCircle size={32} className="text-brand-muted/40 mb-3" />
                <p className="text-sm text-brand-muted leading-relaxed">
                  Belum ada kontak. Mulai dengan menghubungi agen atau tim support.
                </p>
              </div>
            ) : (
              contacts.map((contact) => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  isActive={contact.id === activeContactId}
                  onClick={handleSelectContact}
                />
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
              <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-brand-border bg-brand-surface">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="lg:hidden w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
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
                  {activeContact.role && (
                    <p className="text-xs text-brand-muted">
                      {activeContact.role === 'admin' ? 'Admin Internal'
                        : activeContact.role === 'agent' ? 'Agent'
                        : activeContact.role === 'developer' ? 'Developer'
                        : activeContact.role === 'owner' ? 'Owner'
                        : 'Pembeli'}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {messages.length === 0 ? (
                  <EmptyChat contactName={activeContact.first_name} />
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender_id === userId}
                    />
                  ))
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
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Tulis pesan..."
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !inputValue.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}
