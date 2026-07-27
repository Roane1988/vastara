import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, ChevronDown } from 'lucide-react'

const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEY = import.meta.env.VITE_GROQ_API_KEY

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'Kamu adalah HuniBot, asisten properti cerdas dan profesional dari HuniOne. Tugasmu HANYA menjawab pertanyaan seputar properti, KPR, investasi real estate, dan hukum jual-beli tanah di Indonesia (seperti SHM, HGB, BPHTB, Notaris). Gunakan bahasa Indonesia yang santai, sopan, dan mudah dimengerti. JANGAN gunakan tanda bintang **** atau sensor apapun dalam menjawab. Tulis kata-kata secara utuh tanpa sensor. Jika user bertanya di luar topik ini, tolak dengan halus dan arahkan kembali ke topik properti.',
}

const QUICK_REPLIES = [
  'Cara mengajukan KPR?',
  'Apa itu BPHTB?',
  'Tips beli rumah pertama',
  'Perbedaan SHM dan HGB',
]

function formatTime(ts) {
  const d = new Date(Number(ts))
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'baru saja'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}j`
  return d.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white shrink-0 ring-2 ring-brand-secondary/50 animate-pulse">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-brand-bg text-brand-text rounded-2xl rounded-bl-md px-3 py-2 text-sm">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}

export default function HuniBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages, isLoading, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 300)
      return () => { clearTimeout(timer) }
    }
  }, [isOpen])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (!input) {
      el.style.height = 'auto'
    }
  }, [input])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(dist > 100)
  }, [])

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim()
    if (!text || isLoading) return

    if (!API_KEY) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: 'API Key Groq belum terkonfigurasi di file .env.local' }])
      return
    }

    const userMessage = { id: Date.now().toString(), role: 'user', text }
    setInput('')
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const conversation = [
        SYSTEM_MESSAGE,
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: text },
      ]

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: conversation,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      console.log('RAW GROQ RESPONSE:', JSON.stringify(data, null, 2))
      const botText = data?.choices?.[0]?.message?.content || 'Maaf, tidak ada respons dari AI.'

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: botText }])
    } catch (error) {
      console.error('HuniBot Groq Error:', error)
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.' }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleQuickReply = useCallback((text) => {
    handleSend(text)
  }, [handleSend])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 sm:left-auto sm:bottom-20 sm:right-6 z-50 w-full sm:w-80 lg:w-96 max-h-[80dvh] sm:max-h-none sm:h-[500px] flex flex-col bg-brand-surface shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden border-t sm:border border-brand-border"
          >
            <div className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-4 py-3 flex items-center gap-2 shrink-0">
              <Bot className={`w-5 h-5 ${isLoading ? 'animate-bounce' : ''}`} />
              <span className="font-semibold">HuniBot - Asisten Properti</span>
              <button type="button" onClick={toggleOpen} className="ml-auto p-1 -mr-1 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 pb-16 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-brand-text font-semibold">Halo! Ada yang bisa dibantu?</p>
                    <p className="text-brand-muted text-xs mt-1">
                      Tanya seputar properti, KPR, atau hukum jual-beli
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_REPLIES.map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuickReply(q)}
                        className="px-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-xl text-brand-text hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex flex-col items-end gap-0.5">
                    <div className="bg-brand-primary text-white rounded-2xl rounded-br-md px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap">
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-brand-muted/60 px-1">{formatTime(msg.id)}</span>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="bg-brand-bg text-brand-text rounded-2xl rounded-bl-md px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap">
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-brand-muted/60 px-1">{formatTime(msg.id)}</span>
                    </div>
                  </div>
                )
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {showScrollBtn && (
              <button
                type="button"
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-16 right-4 z-10 w-8 h-8 bg-white border border-brand-border rounded-full shadow-md flex items-center justify-center hover:bg-brand-bg transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-brand-muted" />
              </button>
            )}

            <div className="border-t border-brand-border bg-brand-surface p-3 flex gap-2 shrink-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Tanya tentang properti..."
                disabled={isLoading}
                rows={1}
                className="flex-1 px-3 py-2 text-sm bg-brand-bg border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/30 placeholder:text-brand-muted disabled:opacity-50 resize-none overflow-y-auto"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || !API_KEY}
                className="w-9 h-9 bg-brand-primary text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-primary text-white rounded-full shadow-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
    </>
  )
}
