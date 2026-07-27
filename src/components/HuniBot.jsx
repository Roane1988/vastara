import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send } from 'lucide-react'

const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEY = import.meta.env.VITE_GROQ_API_KEY

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'Kamu adalah HuniBot, asisten properti cerdas dan profesional dari HuniOne. Tugasmu HANYA menjawab pertanyaan seputar properti, KPR, investasi real estate, dan hukum jual-beli tanah di Indonesia (seperti SHM, HGB, BPHTB, Notaris). Gunakan bahasa Indonesia yang santai, sopan, dan mudah dimengerti. Jika user bertanya di luar topik ini, tolak dengan halus dan arahkan kembali ke topik properti.',
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
        HB
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
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => { clearTimeout(timer) }
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
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
            className="fixed bottom-20 right-6 z-50 w-80 md:w-96 h-[500px] flex flex-col bg-brand-surface shadow-2xl rounded-2xl overflow-hidden border border-brand-border"
          >
            <div className="bg-brand-primary text-white px-4 py-3 flex items-center gap-2 shrink-0">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">HuniBot - Asisten Properti</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-brand-primary text-white rounded-2xl rounded-br-md px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      HB
                    </div>
                    <div className="bg-brand-bg text-brand-text rounded-2xl rounded-bl-md px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>
                )
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-brand-border p-3 flex gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya tentang properti..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm bg-brand-bg border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/30 placeholder:text-brand-muted disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !API_KEY}
                className="w-9 h-9 bg-brand-primary text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-primary text-white rounded-full shadow-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}
