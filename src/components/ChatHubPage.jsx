import { useState, useEffect, useRef, useMemo, useCallback, memo, Component } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { getImageSrc } from '../utils/images'
import { formatPriceDisplay } from '../utils/format'
import { Mic, Send, Play, Pause, ArrowLeft, MessageCircle, Search, Trash2, Plus, X, Loader2, ImagePlus, Building2, CornerUpLeft, ChevronDown, ChevronUp, Paperclip, Pin, PinOff, Download, MoreHorizontal, Copy, CheckCheck, Bot, Star, Volume2, UploadCloud, AlertTriangle, RefreshCw, Bell, FileText, FileSpreadsheet, FileArchive, File, Smile, ArrowRight } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import HuniBotRoom from './HuniBotRoom'
import { compressImage } from '../utils/imageCompression'
import { recompressVoiceBlob, extractWaveformPeaks } from '../utils/audioCompression'
import VoiceWaveform from './VoiceWaveform'

const HUNIBOT_ID = 'hunibot'

const EMPTY_ARRAY = []

class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.warn('Chat section gagal dimuat:', error?.message || error)
  }

  handleReset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-brand-muted">
          <AlertTriangle size={14} className="shrink-0 text-brand-accent" />
          <span>Bagian ini gagal dimuat.</span>
          <button
            type="button"
            onClick={this.handleReset}
            className="ml-1 inline-flex items-center gap-1 font-semibold text-brand-accent hover:text-brand-primary"
          >
            <RefreshCw size={12} /> Muat ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const HUNIBOT_CONTACT = {
  id: HUNIBOT_ID,
  first_name: 'HuniBot',
  role: 'ai',
  is_hunibot: true,
  last_message: 'Asisten properti AI · Online',
  last_message_at: null,
}

const SETTINGS_KEY = 'hunione-chat-settings'
function loadChatSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  } catch {
    return {}
  }
}
function saveChatSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* non-critical */
  }
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
const DOUBLE_TAP_REACTION = '❤️'
const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

function playMessageSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes = [880, 1174.66]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.14)
    })
    setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {
    /* non-critical */
  }
}

function notifyNewMessage(title, body) {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag: body, silent: true })
      n.onclick = () => { window.focus(); n.close() }
    }
  } catch {
    /* non-critical */
  }
}

function notifyChatRead() {
  try {
    window.dispatchEvent(new CustomEvent('chat-read-updated'))
  } catch {
    /* non-critical */
  }
}


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

function getDownloadFileName(url) {
  try {
    const path = new URL(url).pathname.split('/').pop()
    if (path) return decodeURIComponent(path)
  } catch { /* fallback below */ }
  return 'gambar-hunione.jpg'
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mime, name) {
  const n = (name || '').toLowerCase()
  if (n.endsWith('.pdf')) return { Icon: FileText, color: '#ef4444' }
  if (n.endsWith('.doc') || n.endsWith('.docx')) return { Icon: FileText, color: '#3b82f6' }
  if (n.endsWith('.xls') || n.endsWith('.xlsx') || mime?.includes('spreadsheet')) return { Icon: FileSpreadsheet, color: '#22c55e' }
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return { Icon: FileText, color: '#f59e0b' }
  if (n.endsWith('.zip') || n.endsWith('.rar') || n.endsWith('.7z')) return { Icon: FileArchive, color: '#a855f7' }
  return { Icon: File, color: '#94a3b8' }
}

function formatVoiceTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function pickVoiceMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    { mime: 'audio/webm;codecs=opus', type: 'audio/webm' },
    { mime: 'audio/webm', type: 'audio/webm' },
    { mime: 'audio/mp4', type: 'audio/mp4' },
    { mime: 'audio/mp4;codecs=mp4a.40.2', type: 'audio/mp4' },
    { mime: 'audio/x-m4a', type: 'audio/x-m4a' },
    { mime: 'audio/ogg;codecs=opus', type: 'audio/ogg' },
    { mime: 'audio/ogg', type: 'audio/ogg' },
    { mime: 'audio/mpeg', type: 'audio/mpeg' },
    { mime: 'audio/aac', type: 'audio/aac' },
  ]
  for (const c of candidates) {
    try {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c.mime)) {
        return { mime: c.mime, type: c.type }
      }
    } catch {
      /* lanjut kandidat berikutnya */
    }
  }
  return null
}

function voiceBaseMime(mime) {
  if (!mime) return ''
  if (typeof mime === 'object' && mime.type) return mime.type.split(';')[0]
  return String(mime).split(';')[0]
}

function voiceExtForMime(mime) {
  const base = (mime || '').split(';')[0]
  if (base.includes('mp4') || base.includes('m4a')) return 'mp4'
  if (base.includes('ogg')) return 'ogg'
  if (base.includes('mpeg') || base.includes('mp3')) return 'mp3'
  return 'webm'
}

const VoiceMessagePlayer = memo(function VoiceMessagePlayer({ message, isOwn }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let ctx = null
    ;(async () => {
      try {
        const res = await fetch(message.file_url)
        if (!res.ok) return
        const blob = await res.blob()
        const Ctx = window.AudioContext || window.webkitAudioContext
        ctx = Ctx ? new Ctx({ sampleRate: 16000 }) : null
        if (!ctx) return
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
        if (cancelled) return
        setPeaks(extractWaveformPeaks(buf, 60))
        setDuration((prev) => (Number.isFinite(prev) && prev > 0) ? prev : (Number.isFinite(buf.duration) ? buf.duration : prev))
      } catch {
        if (!cancelled) setPeaks([])
      } finally {
        if (ctx && !cancelled) { try { ctx.close() } catch { /* non-critical */ } }
      }
    })()
    return () => {
      cancelled = true
      if (ctx) { try { ctx.close() } catch { /* non-critical */ } }
    }
  }, [message.file_url])

  useEffect(() => () => {
    const a = audioRef.current
    if (a) {
      try {
        a.pause()
        a.removeAttribute('src')
        a.load()
      } catch {
        /* non-critical */
      }
    }
  }, [])

  const ensureAudio = () => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = 'metadata'
      a.src = message.file_url
      audioRef.current = a
      a.addEventListener('loadedmetadata', () => {
        setDuration(Number.isFinite(a.duration) ? a.duration : 0)
      })
      a.addEventListener('timeupdate', () => setCurrentTime(a.currentTime || 0))
      a.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(a.duration || 0)
      })
    }
    return audioRef.current
  }

  const togglePlay = async () => {
    const a = ensureAudio()
    if (isPlaying) {
      a.pause()
      setIsPlaying(false)
      return
    }
    try {
      await a.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  const onSeek = (ratio) => {
    const a = ensureAudio()
    const target = ratio * (duration || 0)
    setCurrentTime(target)
    if (Number.isFinite(a.duration)) a.currentTime = target
  }

  const max = duration || 0.01
  const progress = Math.min((currentTime / max) * 100, 100)
  const shownTime = isPlaying ? currentTime : (duration || 0)
  const accent = isOwn ? '#ffffff' : '#4A90E2'
  const trackColor = isOwn ? 'rgba(255,255,255,0.35)' : 'rgba(28,39,51,0.18)'

  return (
    <div
      className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2 w-[240px] sm:w-[260px] max-w-full"
      style={{
        borderColor: isOwn ? 'rgba(255,255,255,0.22)' : 'var(--color-brand-border)',
        backgroundColor: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--color-brand-bg)',
      }}
      title={`${message.file_name || 'Pesan suara'} · ${formatVoiceTime(duration)}`}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Jeda pesan suara' : 'Putar pesan suara'}
        title={isPlaying ? 'Jeda' : 'Putar'}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 ${isOwn ? 'bg-white/20' : 'bg-brand-accent'} shadow-sm`}
      >
        {isPlaying ? <Pause size={17} className="-ml-0.5" /> : <Play size={17} className="ml-0.5" />}
      </button>
      <VoiceWaveform
        peaks={peaks}
        progress={progress}
        accent={accent}
        trackColor={trackColor}
        onSeek={onSeek}
      />
      <span
        className="shrink-0 text-[11px] tabular-nums w-10 text-right"
        style={{ color: isOwn ? 'rgba(255,255,255,0.85)' : 'var(--color-brand-muted)' }}
      >
        {formatVoiceTime(shownTime)}
      </span>
    </div>
  )
})

const DateSeparator = memo(function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <span className="text-[10px] font-semibold text-brand-muted bg-brand-surface border border-brand-border rounded-full px-3 py-1">
        {date}
      </span>
    </div>
  )
})

const TypingDots = memo(function TypingDots({ color }) {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot rounded-full"
          style={{ width: 7, height: 7, backgroundColor: color, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
})

function ReplySnippet({ message, className }) {
  if (!message || message.deleted_at) {
    return <p className={className}>Pesan ini telah dihapus</p>
  }
  if (message.image_url) {
    return (
      <span className={`flex items-center gap-1.5 min-w-0 ${className || ''}`}>
        <img
          src={message.image_url}
          alt=""
          className="w-5 h-5 rounded object-cover shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        {message.content ? (
          <span className="min-w-0 truncate">{message.content}</span>
        ) : (
          <span className="shrink-0 italic">[Gambar]</span>
        )}
      </span>
    )
  }
  if (message.file_url) {
    const isVoice = (message.file_type || '').toLowerCase().startsWith('audio/')
    return (
      <span className={`flex items-center gap-1.5 min-w-0 ${className || ''}`}>
        {isVoice
          ? <Mic size={12} className="shrink-0 text-brand-accent" />
          : <FileText size={12} className="shrink-0 text-brand-accent" />}
        <span className="min-w-0 truncate">{isVoice ? 'Pesan suara' : (message.file_name || 'Dokumen')}</span>
      </span>
    )
  }
  if (message.property_id) {
    return (
      <span className={`flex items-center gap-1.5 min-w-0 ${className || ''}`}>
        <Building2 size={12} className="shrink-0" />
        {message.content ? (
          <span className="min-w-0 truncate">{message.content}</span>
        ) : (
          <span className="shrink-0 italic">[Kartu properti]</span>
        )}
      </span>
    )
  }
  return <p className={className}>{message.content}</p>
}

function ReplyPreview({ message, onCancel, otherName, userId, compact }) {
  const isOwn = message.sender_id === userId
  const label = isOwn ? 'Kamu' : (otherName || '')
  const initials = isOwn ? 'K' : getInitials(otherName || label) || '?'
  const containerClass = compact
    ? 'flex items-center gap-2.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface shadow-sm'
    : 'flex items-center gap-2.5 px-4 py-2 border-t border-brand-border bg-brand-highlight/60'
  return (
    <div className={containerClass}>
      <span className="w-1 self-stretch rounded-full bg-brand-accent shrink-0" aria-hidden="true" />
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
        style={{ backgroundColor: isOwn ? '#1E3A5F' : getAvatarColor(message.sender_id) }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-brand-accent truncate">{label}</p>
        <div className="text-xs text-brand-muted truncate">
          <ReplySnippet message={message} />
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Batalkan balasan"
        title="Batalkan balasan"
        className="text-brand-muted hover:text-brand-text shrink-0 p-1 -m-1 rounded-full hover:bg-brand-border/50 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

function HighlightText({ text, query, className }) {
  if (!query || !text) return <span className={className}>{text}</span>
  const lower = text.toLowerCase()
  const q = query.trim().toLowerCase()
  if (!q || !lower.includes(q)) return <span className={className}>{text}</span>
  const idx = lower.indexOf(q)
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <mark className="bg-brand-accent/20 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  )
}

function normalizePhone(num) {
  let digits = num.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  return digits
}

function tokenizeMessage(text) {
  const tokens = []
  const re = /(\bhttps?:\/\/(?:www\.)?hunione\.com\/property\/[A-Za-z0-9-]+)|(\/property\/[A-Za-z0-9-]+)|\bhttps?:\/\/[^\s<]+|\b0\d{8,12}\b|\b62\d{8,13}\b/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    const raw = m[0]
    if (m[2] && (text[m.index - 1] || '').match(/\w/)) {
      re.lastIndex = m.index + 1
      continue
    }
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) })
    if (m[1]) {
      tokens.push({ type: 'property', value: m[1].replace(/[.,;:!?\])]+$/g, '') })
    } else if (m[2]) {
      tokens.push({ type: 'property', value: m[2].replace(/[.,;:!?\])]+$/g, '') })
    } else if (/^https?:\/\//.test(raw)) {
      tokens.push({ type: 'link', value: raw.replace(/[.,;:!?\])]+$/g, '') })
    } else {
      tokens.push({ type: 'phone', value: raw })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

function MessageText({ text, query, className }) {
  const tokens = tokenizeMessage(text)
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return <HighlightText text={text} query={query} className={className} />
  }
  return tokens.map((t, i) => {
    if (t.type === 'property') {
      const idMatch = t.value.match(/(?:hunione\.com)?\/property\/([A-Za-z0-9-]+)/)
      if (idMatch?.[1]) {
        return (
          <Link
            key={i}
            to={`/property/${idMatch[1]}`}
            className="text-blue-500 underline underline-offset-2 hover:text-blue-600 break-all"
          >
            {t.value}
          </Link>
        )
      }
    }
    if (t.type === 'link') {
      return (
        <a
          key={i}
          href={t.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline underline-offset-2 hover:text-blue-600 break-all"
        >
          {t.value}
        </a>
      )
    }
    if (t.type === 'phone') {
      return (
        <a
          key={i}
          href={`https://wa.me/${normalizePhone(t.value)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline underline-offset-2 hover:text-blue-600 break-all"
        >
          {t.value}
        </a>
      )
    }
    return <HighlightText key={i} text={t.value} query={query} className={className} />
  })
}

function PropertyMessage({ propertyId }) {
  const [prop, setProp] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let cancelled = false
    if (!propertyId) return
    supabase.from('properties')
      .select('id, title, price, category, price_period, image_url, address, city, status')
      .eq('id', propertyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) { setErr(true); return }
        setProp(data)
      })
      .catch(() => { if (!cancelled) setErr(true) })
    return () => { cancelled = true }
  }, [propertyId])

  if (!propertyId) return null
  if (!prop && !err) return <div className="w-full h-20 animate-pulse rounded-xl" />
  if (err || !prop) return <p className="text-xs text-brand-muted italic">Properti tidak tersedia</p>
  return (
    <Link to={`/property/${prop.id}`} className="block mt-1.5 w-full overflow-hidden rounded-xl bg-white border border-brand-border/70 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center gap-3 p-2.5 min-w-0">
        {prop.image_url ? (
          <img src={getImageSrc(prop.image_url)} alt={prop.title} className="w-full h-auto max-w-[48px] aspect-square rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-brand-bg flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-brand-muted" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-brand-text break-words line-clamp-2 group-hover:text-brand-accent transition-colors">{prop.title || 'Properti'}</p>
          <p className="text-[10px] text-brand-muted break-words line-clamp-1">{prop.city || 'Indonesia'}</p>
          <p className="text-[11px] font-bold text-brand-primary mt-0.5">{Number(prop.price) > 0 ? formatPriceDisplay(prop) : 'Harga Hubungi'}</p>
        </div>
      </div>
    </Link>
  )
}

const MessageBubble = memo(function MessageBubble({ message, isOwn, onDelete, onReply, lang, firstInGroup, lastInGroup, otherName, otherColor, repliedMessage, highlight, onImageClick, isSearchActive, onMoreClick, isFlashed, reactions, myId, onReact, onJumpToMessage, onShowSummary, isStarred, onOpenReactionPicker, onFileOpen }) {
  const SWIPE_THRESHOLD = 56
  const [swipeX, setSwipeX] = useState(0)
  const [swipeActive, setSwipeActive] = useState(false)
  const [pop, setPop] = useState(false)
  const swipeXRef = useRef(0)
  const swipeStartRef = useRef({ x: 0, y: 0 })
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 })
  const popTimeoutRef = useRef(null)

  useEffect(() => () => { if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current) }, [])

  const fireDoubleTapReaction = (e) => {
    if (!onReact) return
    if (e && e.target?.closest && e.target.closest('button, a, img, input, textarea')) return
    onReact(message.id, DOUBLE_TAP_REACTION)
    setPop(true)
    if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current)
    popTimeoutRef.current = setTimeout(() => setPop(false), 150)
  }

  const handleDoubleClick = (e) => {
    if (!onReact) return
    if (e.target?.closest?.('button, a, img, input, textarea')) return
    e.preventDefault()
    fireDoubleTapReaction()
  }

  const handleTouchStart = (e) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchMove = (e) => {
    const { x, y } = swipeStartRef.current
    const dx = e.touches[0].clientX - x
    const dy = e.touches[0].clientY - y
    if (dx > 4 && dx > Math.abs(dy)) {
      if (!swipeActive) setSwipeActive(true)
      swipeXRef.current = Math.min(dx, 96)
      setSwipeX(swipeXRef.current)
    }
  }
  const handleTouchEnd = (e) => {
    const endX = e.changedTouches?.[0]?.clientX ?? swipeStartRef.current.x
    const endY = e.changedTouches?.[0]?.clientY ?? swipeStartRef.current.y
    const dx = Math.abs(endX - swipeStartRef.current.x)
    const dy = Math.abs(endY - swipeStartRef.current.y)
    if (swipeXRef.current >= SWIPE_THRESHOLD) {
      onReply?.(message)
      lastTapRef.current = { t: 0, x: 0, y: 0 }
    } else if (onReact && dx < 10 && dy < 10) {
      const now = Date.now()
      const last = lastTapRef.current
      if (now - last.t <= 300 && Math.abs(endX - last.x) < 30 && Math.abs(endY - last.y) < 30) {
        lastTapRef.current = { t: 0, x: 0, y: 0 }
        fireDoubleTapReaction(e)
      } else {
        lastTapRef.current = { t: now, x: endX, y: endY }
      }
    } else {
      lastTapRef.current = { t: 0, x: 0, y: 0 }
    }
    swipeXRef.current = 0
    setSwipeX(0)
    setSwipeActive(false)
  }
  return (
    <div id={`message-${message.id}`} className={`animate-fadeIn flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 ${firstInGroup ? 'mt-3' : 'mt-0.5'}`}>
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
      <div
        className="relative w-full max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] xl:max-w-[70%] overflow-hidden group/message"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(onReply || onReact) ? handleTouchStart : undefined}
        onTouchMove={(onReply || onReact) ? handleTouchMove : undefined}
        onTouchEnd={(onReply || onReact) ? handleTouchEnd : undefined}
        onTouchCancel={(onReply || onReact) ? handleTouchEnd : undefined}
        onDoubleClick={IS_TOUCH ? undefined : handleDoubleClick}
      >
        <div
          className="absolute inset-y-0 left-1 flex items-center pointer-events-none z-10 transition-opacity"
          style={{ opacity: swipeX >= 8 ? Math.min(swipeX / SWIPE_THRESHOLD, 1) : 0 }}
          aria-hidden="true"
        >
          <span className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border shadow-lg flex items-center justify-center text-brand-accent">
            <CornerUpLeft size={18} />
          </span>
        </div>
        <div
          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: swipeActive ? 'transform 40ms linear' : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm min-w-0 max-w-full overflow-hidden ${
            isOwn
              ? 'bg-gradient-to-br from-brand-primary to-[#2f6690] text-white rounded-br-md'
              : 'bg-white border border-brand-border text-brand-text rounded-bl-md'
          } ${isFlashed ? 'ring-2 ring-brand-accent' : ''} ${isSearchActive ? 'ring-2 ring-amber-400' : ''}`}
          style={{
            transform: pop ? 'scale(1.04)' : 'scale(1)',
            transition: `transform ${pop ? '90ms' : '200ms'} cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: 'transform',
          }}
        >
            {isFlashed && <span className="search-flash-overlay" aria-hidden="true" />}
            {isStarred && (
              <Star size={12} className="absolute top-2 right-2 text-amber-400 fill-amber-400" aria-label="Pesan dibookmark" />
            )}
            {(repliedMessage || message.reply_to_id) && (
              <button
                type="button"
                onClick={() => repliedMessage && onJumpToMessage?.(repliedMessage.id)}
                disabled={!repliedMessage}
                title={repliedMessage ? 'Lihat pesan asli' : undefined}
                className={`group/reply text-left w-full mb-1.5 mt-0.5 rounded-lg px-2 py-1 ${
                  isOwn ? 'bg-white/15' : 'bg-brand-bg'
                } ${
                  repliedMessage
                    ? 'cursor-pointer hover:brightness-95'
                    : 'opacity-80 italic cursor-default'
                }`}
              >
                <p className={`text-[10px] font-bold ${isOwn ? 'text-white/80' : 'text-brand-accent'} truncate`}>
                  {!repliedMessage ? 'Balasan'
                    : repliedMessage.sender_id === message.sender_id ? 'Balasanmu'
                    : otherName || 'Balasan'}
                  {repliedMessage && (
                    <span className={`hidden sm:inline-flex items-center gap-0.5 ml-1.5 align-middle font-normal ${isOwn ? 'text-white/60' : 'text-brand-muted'} opacity-0 group-hover/reply:opacity-100 transition-opacity`}>
                      <MessageCircle size={9} /> lihat pesan
                    </span>
                  )}
                </p>
                <div className={`text-xs ${isOwn ? 'text-white/90' : 'text-brand-muted'} truncate`}>
                  <ReplySnippet message={repliedMessage} />
                </div>
              </button>
            )}
            {message.property_id && (
              <ChatErrorBoundary fallback={<p className="text-xs text-brand-muted italic mt-1.5">Kartu properti gagal dimuat.</p>}>
                <PropertyMessage propertyId={message.property_id} />
              </ChatErrorBoundary>
            )}
            {message.image_url && (
              <img
                src={message.image_url}
                alt="Lampiran"
                onClick={() => onImageClick?.(message.image_url)}
                className="mt-1 w-full h-auto max-h-72 object-cover rounded-xl cursor-pointer"
              />
            )}
            {(message.file_url && (message.file_type || '').toLowerCase().startsWith('audio/')) && (
              <VoiceMessagePlayer message={message} isOwn={isOwn} />
            )}
            {message.file_url && !(message.file_type || '').toLowerCase().startsWith('audio/') && (
              <button
                type="button"
                onClick={() => onFileOpen?.(message)}
                className="mt-1 w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors group/file"
                style={{
                  borderColor: isOwn ? 'rgba(255,255,255,0.35)' : 'var(--color-brand-border)',
                  backgroundColor: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--color-brand-bg)',
                }}
                title={`Buka ${message.file_name || 'file'}`}
              >
                {(() => {
                  const { Icon, color } = getFileIcon(message.file_type, message.file_name)
                  return <Icon size={26} className="shrink-0" style={{ color: isOwn ? '#ffffff' : color }} />
                })()}
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-semibold truncate ${isOwn ? 'text-white' : 'text-brand-text'}`}>
                    {message.file_name || 'Dokumen'}
                  </span>
                  <span className={`block text-[10px] ${isOwn ? 'text-white/70' : 'text-brand-muted'}`}>
                    {formatFileSize(message.file_size)} · Buka & unduh
                  </span>
                </span>
                <Download size={15} className={`shrink-0 ${isOwn ? 'text-white/80' : 'text-brand-muted'} group-hover/file:text-brand-accent transition-colors`} />
              </button>
            )}
            {message.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">
                <MessageText text={message.content} query={highlight} />
              </p>
            )}
            {renderReactionsRow(reactions, myId, onReact, onShowSummary, message.id)}
            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 ${isOwn ? 'text-white/70' : 'text-brand-muted'}`}>
              <span>{timeAgo(message.created_at, lang)}</span>
              {isOwn && (
                <span className="font-bold tracking-tighter">
                  {message.read_at ? '✓✓' : '✓'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => onMoreClick?.(message, e)}
                aria-label="Opsi pesan"
                title="Opsi pesan"
                className="lg:-mx-1 -my-1 p-1.5 rounded-full text-inherit opacity-70 hover:opacity-100 lg:opacity-0 lg:group-hover/message:opacity-100 lg:group-focus-within/message:opacity-100 transition-all"
              >
                <span className="lg:hidden inline-flex">
                  <MoreHorizontal size={14} />
                </span>
                <span className="hidden lg:inline-flex">
                  <ChevronDown size={14} />
                </span>
              </button>
            </div>
            {onOpenReactionPicker && (
              <button
                type="button"
                onMouseEnter={(e) => onOpenReactionPicker?.(message, e)}
                onClick={(e) => onOpenReactionPicker?.(message, e)}
                aria-label="Beri reaksi"
                title="Beri reaksi"
                className="absolute top-2 right-9 hidden lg:hidden group-hover/message:flex group-focus-within/message:flex lg:group-hover/message:hidden lg:group-focus-within/message:hidden w-6 h-6 rounded-full bg-white border border-brand-border shadow text-sm items-center justify-center hover:scale-110 transition-transform"
              >
                😊
              </button>
            )}
          </div>
        </div>
        {isOwn && (
          <button
            type="button"
            onClick={() => onDelete?.(message.id)}
            className="absolute -top-1.5 -right-1.5 z-10 hidden lg:flex w-7 h-7 rounded-full bg-white/80 border border-brand-border shadow-sm items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-brand-muted transition-all"
            title="Hapus pesan"
            aria-label="Hapus pesan"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
})

const ContactItem = memo(function ContactItem({ contact, isActive, onClick, lang, isTyping, unread, isOnline, lastSeen, bookmarkCount }) {
  const isHunibot = contact.id === HUNIBOT_ID
  const avatarColor = isHunibot ? '#7C3AED' : getAvatarColor(contact.id)
  const initials = getInitials(contact.first_name)
  const roleLabel = isHunibot ? 'AI Assistant'
    : contact.role === 'admin' ? 'Admin Internal'
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
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: avatarColor }}
        >
          {isHunibot ? <Bot size={19} /> : initials || getInitials(contact.first_name)}
        </div>
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isHunibot ? 'bg-gradient-to-br from-brand-accent to-[#7C3AED]' : isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
          title={isHunibot ? 'Online' : (isOnline ? 'Online' : 'Offline')}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-brand-text truncate">{contact.first_name || 'User'}</span>
          {unread > 0 ? (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 shrink-0">
              {bookmarkCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-100/70 rounded-full px-1.5 py-0.5" title={`${bookmarkCount} pesan dibookmark`}>
                  <Star size={9} className="fill-amber-500 text-amber-500" /> {bookmarkCount}
                </span>
              )}
              {contact.last_message_at && (
                <span className="text-[10px] text-brand-muted">{timeAgo(contact.last_message_at, lang)}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isTyping ? (
            <p className="text-xs text-brand-accent truncate font-medium inline-flex items-center gap-1.5">
              <TypingDots color="var(--color-brand-accent)" /> mengetik...
            </p>
          ) : (
            <>
              {isHunibot ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-brand-primary to-[#7C3AED] text-white shrink-0">{roleLabel}</span>
              ) : isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 shrink-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  Online
                </span>
              ) : contact.role && (
                <span className="text-[10px] font-medium text-brand-accent shrink-0">{roleLabel}</span>
              )}
              <p className={`text-xs truncate ${unread > 0 ? 'text-brand-text font-semibold' : 'text-brand-muted'}`}>
                {contact.last_message
                  ? contact.last_message
                  : (lastSeen && !isOnline ? `Terakhir aktif ${timeAgo(lastSeen, lang)}` : 'Belum ada pesan')}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  )
})

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

function EmptyChat({ contactName, onSuggested, property }) {
  const suggestions = property
    ? [
        `Apakah properti "${property.title || 'ini'}" masih tersedia?`,
        'Berapa harga nego paling rendah?',
        'Apakah bisa survei lokasi? Kapan waktunya?',
        'Boleh info spesifikasi lebih lengkap?',
      ]
    : [
        'Halo, saya tertarik dengan properti ini',
        'Apakah masih tersedia?',
        'Boleh info lebih lanjut?',
      ]
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-highlight flex items-center justify-center mb-4">
        <MessageCircle size={28} className="text-brand-accent" />
      </div>
      <h3 className="text-base font-bold text-brand-text">Mulai Obrolan</h3>
      <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
        {contactName
          ? `Kirim pesan pertama ke ${contactName}`
          : 'Pilih kontak untuk memulai obrolan'}
      </p>
      {contactName && (
        <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggested?.(s)}
              className="text-xs text-brand-accent bg-brand-highlight border border-brand-border rounded-full px-4 py-2 hover:bg-brand-accent/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {contactName && (
        <p className="mt-6 w-full max-w-xs border-t border-brand-border pt-4 text-[11px] text-brand-muted leading-relaxed">
          Tip: kirim <span className="font-semibold text-brand-text">gambar</span> dengan drag &amp; drop atau tombol +, lampirkan <span className="font-semibold text-brand-text">dokumen</span>, dan bagikan <span className="font-semibold text-brand-text">kartu properti</span>.
        </p>
      )}
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

function aggregateReactions(reactions, myId) {
  const map = {}
  ;(reactions || []).forEach((r) => {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, mine: false }
    map[r.emoji].count += 1
    if (r.user_id === myId) map[r.emoji].mine = true
  })
  const ordered = REACTION_EMOJIS.filter((e) => map[e]).map((e) => [e, map[e]])
  const extras = Object.keys(map).filter((e) => !REACTION_EMOJIS.includes(e)).map((e) => [e, map[e]])
  return [...ordered, ...extras]
}

function renderReactionsRow(reactions, myId, onReact, onShowSummary, messageId) {
  const agg = aggregateReactions(reactions, myId)
  if (agg.length === 0) return null
  const mine = agg.some(([, info]) => info.mine)
  const myEmoji = (reactions || []).find((r) => r.user_id === myId)?.emoji
  const totalCount = agg.reduce((s, [, info]) => s + info.count, 0)
  const focusEmoji = myEmoji || agg[0][0]
  return (
    <div className="mt-1 flex justify-start">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onShowSummary ? onShowSummary(focusEmoji, reactions, messageId) : onReact?.(focusEmoji) }}
        aria-label="Lihat reaksi"
        title={`${totalCount} reaksi`}
        className={`inline-flex items-center rounded-full border pl-1.5 pr-2 py-0.5 shadow-sm active:scale-95 transition-transform ${
          mine ? 'bg-brand-accent/15 border-brand-accent/40' : 'bg-white/80 border-brand-border'
        }`}
      >
        {agg.map(([emoji]) => (
          <span key={emoji} className="-ml-1 first:ml-0 w-4 inline-flex justify-center text-[13px] leading-none">
            {emoji}
          </span>
        ))}
        <span className={`ml-1 pl-0.5 text-[11px] font-bold tabular-nums leading-none ${mine ? 'text-brand-accent' : 'text-brand-text'}`}>
          {totalCount}
        </span>
      </button>
    </div>
  )
}

function ReactionPicker({ onPick, onClose, style }) {
  const pickerRef = useRef(null)
  useEffect(() => {
    if (!style) return
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const btns = Array.from(pickerRef.current?.querySelectorAll('button') || [])
      if (btns.length === 0) return
      const idx = btns.indexOf(document.activeElement)
      if (idx === -1) { btns[0]?.focus(); return }
      const next = (e.key === 'ArrowRight' ? (idx + 1) % btns.length : (idx - 1 + btns.length) % btns.length)
      btns[next].focus()
    }
    const onDown = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    pickerRef.current?.querySelector('button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [style, onClose])
  return (
    <div
      ref={pickerRef}
      className="fixed z-[60] flex items-center gap-0.5 bg-brand-surface border border-brand-border rounded-full shadow-xl px-1.5 py-1.5 animate-fadeIn"
      style={style}
      role="toolbar"
      aria-label="Reaksi"
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => { e.stopPropagation(); onPick?.(emoji) }}
          aria-label={`Reaksi ${emoji}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-brand-accent/10 hover:scale-110 active:scale-95 transition-all"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

function ReactionSummary({ emoji, reactions, myId, namesMap, onClose, onToggle }) {
  const agg = aggregateReactions(reactions, myId)
  const [activeEmoji, setActiveEmoji] = useState(emoji)
  const effectiveEmoji = agg.some(([e]) => e === activeEmoji) ? activeEmoji : (agg[0]?.[0] || emoji)
  const users = (reactions || []).filter((r) => r.emoji === effectiveEmoji)
  const mineFirst = [...users].sort((a, b) => (a.user_id === myId ? -1 : 0) - (b.user_id === myId ? -1 : 0))
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <button type="button" aria-label="Tutup" onClick={onClose} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-brand-surface rounded-t-3xl py-6 px-5 pb-8 max-h-[70vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
            <span className="text-xl">{effectiveEmoji}</span> Reaksi
          </h3>
          <button type="button" aria-label="Tutup" onClick={onClose} className="text-brand-muted hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        {agg.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1 -mx-5 px-5">
            {agg.map(([tabEmoji, info]) => (
              <button
                key={tabEmoji}
                type="button"
                onClick={(evt) => { evt.stopPropagation(); setActiveEmoji(tabEmoji) }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm whitespace-nowrap transition-colors ${
                  tabEmoji === effectiveEmoji ? 'bg-brand-accent/15 text-brand-accent font-semibold' : 'text-brand-muted hover:bg-brand-bg'
                }`}
              >
                <span>{tabEmoji}</span>
                <span className="text-[10px] font-bold tabular-nums">{info.count}</span>
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {mineFirst.length === 0 && (
            <p className="text-sm text-brand-muted text-center py-6">Tidak ada reaksi.</p>
          )}
          {mineFirst.map((r) => {
            const isMine = r.user_id === myId
            return (
              <div key={`${r.user_id}-${r.id || r.emoji}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-bg transition-colors">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: getAvatarColor(r.user_id) }}
                >
                  {getInitials(isMine ? 'Kamu' : (namesMap[r.user_id] || 'User'))}
                </div>
                <span className="text-sm font-medium text-brand-text truncate flex-1">
                  {isMine ? 'Kamu' : (namesMap[r.user_id] || 'Pengguna')}
                </span>
                <span className="text-lg">{effectiveEmoji}</span>
                {isMine && (
                  <button
                    type="button"
                    onClick={(evt) => { evt.stopPropagation(); onToggle?.(effectiveEmoji) }}
                    aria-label="Hapus reaksiku"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-muted hover:text-brand-danger px-2 py-1 rounded-lg hover:bg-brand-danger/10 transition-colors"
                  >
                    <X size={13} /> Hapus
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function ChatHubPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { session, user, showToast } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const contactsCancelledRef = useRef(false)
  const messagesCancelledRef = useRef(false)
  const realtimeCancelledRef = useRef(false)
  const sendMountedRef = useRef(true)
  useEffect(() => () => {
    sendMountedRef.current = false
    if (micRetryTimerRef.current) {
      clearTimeout(micRetryTimerRef.current)
      micRetryTimerRef.current = null
    }
  }, [])
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const contactsRef = useRef([])

  const userId = session?.user?.id || user?.id

  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [activeContactId, setActiveContactId] = useState(null)
  const draftsStorageKey = userId ? `hunione-chat-drafts-${userId}` : null
  const [drafts, setDrafts] = useState(() => {
    if (!draftsStorageKey) return {}
    try {
      const raw = localStorage.getItem(draftsStorageKey)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const inputValue = activeContactId ? (drafts[activeContactId] || '') : ''
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
  const [replyTo, setReplyTo] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const [pendingImageUrl, setPendingImageUrl] = useState(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [stagedFiles, setStagedFiles] = useState([])
  const [stagedCaption, setStagedCaption] = useState('')
  const [fileStagingOpen, setFileStagingOpen] = useState(false)
  const [stagingUploading, setStagingUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const [micError, setMicError] = useState('')
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const mediaChunksRef = useRef([])
  const voiceMimeRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const recordingPendingRef = useRef(false)
  const micPendingRef = useRef(false)
  const micRetryTimerRef = useRef(null)
  const micRetryCountRef = useRef(0)
  const recordStartRef = useRef(0)
  const recordElapsedRef = useRef(0)
  const isPausedRef = useRef(false)
  const recCanvasRef = useRef(null)
  const recAudioCtxRef = useRef(null)
  const recAnalyserRef = useRef(null)
  const recSourceRef = useRef(null)
  const recRafRef = useRef(null)
  const pendingStagingUrlsRef = useRef([])
  const [shareProperty, setShareProperty] = useState(null)
  const [showPropertyPicker, setShowPropertyPicker] = useState(false)
  const [propertySearch, setPropertySearch] = useState('')
  const [propertyResults, setPropertyResults] = useState([])
  const [propertySearching, setPropertySearching] = useState(false)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [newMsgFAB, setNewMsgFAB] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [unreadDividerAt, setUnreadDividerAt] = useState(null)
  const unreadDividerContactRef = useRef(null)
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatVh, setChatVh] = useState(typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : undefined)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const prevInnerHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 0)

  useEffect(() => {
    const vv = window.visualViewport
    const update = () => {
      const vh = vv?.height ?? window.innerHeight
      setChatVh(vh)
      const shrunk = prevInnerHeightRef.current - window.innerHeight
      prevInnerHeightRef.current = window.innerHeight
      const overlaid = window.innerHeight - vh
      setKeyboardOpen(shrunk > 120 || overlaid > 120)
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  const [chatSearchQ, setChatSearchQ] = useState('')
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [flashMessageId, setFlashMessageId] = useState(null)
  const flashTimeoutRef = useRef(null)
  const [messageMenu, setMessageMenu] = useState(null)
  const [messageMenuPos, setMessageMenuPos] = useState(null)
  const [connected, setConnected] = useState(false)
  const [otherTypingContacts, setOtherTypingContacts] = useState({})
  const [onlineIds, setOnlineIds] = useState({})
  const [pinnedMessages, setPinnedMessages] = useState({})
  const [reactionsMap, setReactionsMap] = useState({})
  const [contactFilter, setContactFilter] = useState('all')
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const fileInputRef = useRef(null)
  const documentInputRef = useRef(null)
  const plusMenuRef = useRef(null)
  const pendingImageUrlRef = useRef(null)
  const isAtBottomRef = useRef(true)
  const loadedContactRef = useRef(null)
  const [starredMessages, setStarredMessages] = useState({})
  const [reactionsSummary, setReactionsSummary] = useState(null)
  const [reactionPickerMsg, setReactionPickerMsg] = useState(null)
  const [reactionPickerPos, setReactionPickerPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [contactsError, setContactsError] = useState(null)
  const [messagesError, setMessagesError] = useState(null)
  const [contactsRetryCounter, setContactsRetryCounter] = useState(0)
  const [messagesRetryCounter, setMessagesRetryCounter] = useState(0)
  const [chatSettings, setChatSettings] = useState(() => loadChatSettings())
  const chatSettingsRef = useRef(chatSettings)
  chatSettingsRef.current = chatSettings
  const [lastSeenMap, setLastSeenMap] = useState({})
  const [messageNamesMap, setMessageNamesMap] = useState({})

  const messageNamesMapRef = useRef(messageNamesMap)
  messageNamesMapRef.current = messageNamesMap

  const reactionsMapRef = useRef(reactionsMap)
  reactionsMapRef.current = reactionsMap

  const messagesIdMemo = useMemo(() => new Set(messages.map((m) => m.id)), [messages])
  const messagesIdSetRef = useRef(messagesIdMemo)
  messagesIdSetRef.current = messagesIdMemo

  const pinnedMessagesRef = useRef(pinnedMessages)
  pinnedMessagesRef.current = pinnedMessages
  const starredMessagesRef = useRef(starredMessages)
  starredMessagesRef.current = starredMessages
  const lastCleanupRoomRef = useRef(null)
  const reactionPendingRef = useRef({})

  const activeContactIdRef = useRef(activeContactId)
  useEffect(() => {
    activeContactIdRef.current = activeContactId
  }, [activeContactId])

  const scrollToLatestRef = useRef(() => {})
  useEffect(() => {
    scrollToLatestRef.current = scrollToLatest
  })

  const activeContact = contacts.find((c) => c.id === activeContactId) || (activeContactId === HUNIBOT_ID ? HUNIBOT_CONTACT : null)
  const isHunibotRoom = activeContactId === HUNIBOT_ID

  const searchMatches = useMemo(() => {
    const q = chatSearchQ.trim().toLowerCase()
    return q && activeContactId
      ? messages.filter((m) => m.content && m.content.toLowerCase().includes(q))
      : EMPTY_ARRAY
  }, [messages, chatSearchQ, activeContactId])

  const replyIndex = useMemo(() => {
    const idx = new Map()
    for (const m of messages) idx.set(m.id, m)
    return idx
  }, [messages])

  const messageMenuRoom = messageMenu && activeContactId ? [userId, activeContactId].sort().join('-') : null
  const messageMenuPinned = messageMenu && messageMenuRoom ? !!pinnedMessages[messageMenuRoom]?.[messageMenu.id] : false
  const messageMenuStarred = messageMenu && messageMenuRoom ? !!starredMessages[messageMenuRoom]?.[messageMenu.id] : false

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(draftsStorageKey ? (() => {
      try {
        const raw = localStorage.getItem(draftsStorageKey)
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
      }
    })() : {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!draftsStorageKey) return
    try {
      localStorage.setItem(draftsStorageKey, JSON.stringify(drafts))
    } catch {
      /* storage penuh / tidak tersedia */
    }
  }, [drafts, draftsStorageKey])


  const starCountFor = useCallback((c) => {
    if (c.id === HUNIBOT_ID) return 0
    return Object.keys(starredMessages[[userId, c.id].sort().join('-')] || {}).length
  }, [starredMessages, userId])

  const filteredContacts = useMemo(() => contacts.filter((c) => {
    const nameMatches = !searchQuery.trim() || (c.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (!nameMatches) return false
    if (contactFilter === 'all') return true
    if (contactFilter === 'unread') return (unreadMap[c.id] || 0) > 0
    if (contactFilter === 'agent') return ['agent', 'developer', 'admin'].includes(c.role)
    if (contactFilter === 'owner') return c.role === 'owner'
    if (contactFilter === 'bookmark') return starCountFor(c) > 0
    return true
  }), [contacts, searchQuery, contactFilter, unreadMap, starCountFor])

  const hunibotVisible =
    contactFilter === 'all' ||
    (contactFilter === 'agent') ||
    (!searchQuery.trim() || 'hunibot'.includes(searchQuery.toLowerCase()) || 'AI'.toLowerCase().includes(searchQuery.toLowerCase()))

  const visibleContacts = useMemo(
    () => (hunibotVisible ? [HUNIBOT_CONTACT, ...filteredContacts] : filteredContacts),
    [hunibotVisible, filteredContacts]
  )

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    contactsCancelledRef.current = false
    setContactsError(null)

    async function fetchContacts() {
      try {
        const { data: allMessages, error: msgErr } = await supabase
          .from('direct_messages')
          .select('sender_id, receiver_id, content, created_at, read_at')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(500)

        if (contactsCancelledRef.current) return

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
          if (m.receiver_id === userId && !m.read_at && !m.deleted_at) {
            unreadCounts[otherId] = (unreadCounts[otherId] || 0) + 1
          }
        })

        const { data: agents, error: agentErr } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['agent', 'developer', 'admin'])
          .neq('id', userId)

        if (contactsCancelledRef.current) return

        if (!agentErr && agents) {
          agents.forEach((a) => contactIds.add(a.id))
        }

        const ids = [...contactIds]
        if (ids.length === 0) {
          if (!contactsCancelledRef.current) {
            setContacts([])
            setLoading(false)
          }
          return
        }

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, first_name, role')
          .in('id', ids)

        if (contactsCancelledRef.current) return

        if (profErr) {
          console.warn('Gagal memuat profil kontak:', profErr.message)
          if (!contactsCancelledRef.current) setContactsError('Kontak tidak dapat dimuat.')
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

        if (!contactsCancelledRef.current) {
          setContacts(merged)
          setUnreadMap(unreadCounts)
        }
      } catch (err) {
        if (!contactsCancelledRef.current) {
          console.warn('Gagal memuat kontak:', err.message)
          setContactsError('Kontak tidak dapat dimuat. Periksa koneksi Anda.')
        }
      }
      if (!contactsCancelledRef.current) setLoading(false)
    }

    fetchContacts()
    return () => { contactsCancelledRef.current = true }
  }, [userId, contactsRetryCounter])

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
  const openUserFetchRef = useRef(false)
  const contextPrefillRef = useRef(null)
  const contextContactIdRef = useRef(null)
  const handleSelectContact = useCallback((contactId) => {
    setActiveContactId(contactId)
    loadedContactRef.current = null
    setShowMobileList(false)
    setUnreadMap(prev => ({ ...prev, [contactId]: 0 }))
    setReplyTo(null)
    setChatSearchQ('')
    setChatSearchOpen(false)
    setNewMsgFAB(false)
    setNewMsgCount(0)
    setPlusMenuOpen(false)
    setShowPropertyPicker(false)
    if (pendingImageUrlRef.current) {
      URL.revokeObjectURL(pendingImageUrlRef.current)
      pendingImageUrlRef.current = null
    }
    setPendingImage(null)
    setPendingImageUrl(null)
    resetStaging()
    setShareProperty(null)
    setReactionPickerMsg(null)
    setReactionsSummary(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!openUserId || didAutoSelectRef.current) return
    if (openUserId === HUNIBOT_ID) {
      didAutoSelectRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSelectContact(HUNIBOT_ID)
      setSearchParams({}, { replace: true })
      return
    }
    const found = contacts.some((c) => c.id === openUserId)
    if (found) {
      didAutoSelectRef.current = true
      contextPrefillRef.current = { contactId: openUserId, pending: true, propertyId }
      contextContactIdRef.current = openUserId
      handleSelectContact(openUserId)
      setSearchParams({}, { replace: true })
      return
    }
    // Kontak belum ada di daftar (mis. pemilik baru tanpa riwayat pesan) →
    // fetch profil dinamis, sisipkan ke daftar, lalu buka percakapannya.
    if (openUserFetchRef.current) return
    openUserFetchRef.current = true
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, role')
        .eq('id', openUserId)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setSearchParams({}, { replace: true })
        return
      }
      didAutoSelectRef.current = true
      contextPrefillRef.current = { contactId: data.id, pending: true, propertyId }
      contextContactIdRef.current = data.id
      setContacts((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev
        return [{ ...data, last_message: null, last_message_at: null }, ...prev]
      })
      handleSelectContact(data.id)
      setSearchParams({}, { replace: true })
    })()
    return () => { cancelled = true }
  }, [openUserId, contacts, setSearchParams, handleSelectContact, propertyId])

  useEffect(() => {
    const cleanupRoom = activeContactId && userId ? [userId, activeContactId].sort().join('-') : null
    if (lastCleanupRoomRef.current !== cleanupRoom) {
      lastCleanupRoomRef.current = cleanupRoom
      setReactionsMap({})
      setPinnedMessages({})
    }

    if (!activeContactId || !userId || activeContactId === HUNIBOT_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([])
      setHasMore(false)
      return
    }

    messagesCancelledRef.current = false

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

        if (messagesCancelledRef.current) return

        if (error) {
          console.warn('Gagal memuat pesan:', error.message)
          if (!messagesCancelledRef.current) setMessagesError('Pesan tidak dapat dimuat. Periksa koneksi Anda.')
        } else if (data) {
          const loaded = data.slice().reverse()
          setMessages(loaded)
          setHasMore(data.length === PAGE_SIZE)
          // Muat reaksi historis untuk pesan yang baru dimuat
          fetchReactionsFor(loaded.map((m) => m.id), [userId, activeContactId].sort().join('-'))
          // Paksa scroll ke pesan terbaru setelah data kontak selesai dimuat
          scrollToLatest()

          const prefill = contextPrefillRef.current
          if (prefill && prefill.pending && prefill.contactId === activeContactId) {
            contextPrefillRef.current = null
            let title = contextProperty?.title || ''
            if (!title && prefill.propertyId) {
              try {
                const { data: propData } = await supabase
                  .from('properties')
                  .select('title')
                  .eq('id', prefill.propertyId)
                  .maybeSingle()
                title = propData?.title || ''
              } catch { /* non-blocking */ }
            }
            const propertyUrl = prefill.propertyId ? `https://hunione.com/property/${prefill.propertyId}` : ''
            let starter
            if (title && propertyUrl) {
              starter = `Halo, saya tertarik dengan properti "${title}" ini: ${propertyUrl}. Apakah masih tersedia?`
            } else if (title) {
              starter = `Halo, saya tertarik dengan properti "${title}" ini. Apakah masih tersedia?`
            } else if (propertyUrl) {
              starter = `Halo, saya tertarik dengan properti yang Anda tawarkan ini: ${propertyUrl}. Apakah masih tersedia?`
            } else {
              starter = 'Halo, saya tertarik dengan properti yang Anda tawarkan. Apakah masih tersedia?'
            }
            setDrafts((prev) => {
              const next = { ...prev }
              next[activeContactId] = starter
              return next
            })
          }
        }
      } catch (err) {
        if (!messagesCancelledRef.current) {
          console.warn('Gagal memuat pesan:', err.message)
          setMessagesError('Pesan tidak dapat dimuat. Periksa koneksi Anda.')
        }
      }
      if (!messagesCancelledRef.current) setMessagesLoading(false)
    }

    fetchMessages()
    return () => { messagesCancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactId, userId, messagesRetryCounter])

  async function fetchReactionsFor(messageIds, room) {
    if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return
    const ids = [...new Set(messageIds)]
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', ids)
      if (error || !data) return
      const map = {}
      ids.forEach((id) => { map[id] = [] })
      data.forEach((r) => {
        if (!map[r.message_id]) return
        if (!map[r.message_id].some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) {
          map[r.message_id].push({ id: r.id, user_id: r.user_id, emoji: r.emoji })
        }
      })
      setReactionsMap((prev) => ({
        ...prev,
        [room]: { ...(prev[room] || {}), ...map },
      }))
    } catch {
      /* non-blocking */
    }
  }

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
      if (messagesCancelledRef.current) return
      if (error) {
        console.warn('Gagal memuat pesan sebelumnya:', error.message)
      } else if (data) {
        const loaded = data.slice().reverse()
        setMessages((prev) => [...loaded, ...prev])
        setHasMore(data.length === PAGE_SIZE)
        fetchReactionsFor(loaded.map((m) => m.id), [userId, activeContactId].sort().join('-'))
      }
    } catch (err) {
      if (!messagesCancelledRef.current) console.warn('Gagal memuat pesan sebelumnya:', err.message)
    }
    if (!messagesCancelledRef.current) setLoadingEarlier(false)
  }

  useEffect(() => {
    if (!activeContactId || !userId || activeContactId === HUNIBOT_ID) return
    const markRead = async () => {
      const { data: firstUnread } = await supabase
        .from('direct_messages')
        .select('created_at')
        .eq('receiver_id', userId)
        .eq('sender_id', activeContactId)
        .is('read_at', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
      if (firstUnread && firstUnread.length > 0 && unreadDividerContactRef.current !== activeContactId) {
        unreadDividerContactRef.current = activeContactId
        setUnreadDividerAt(firstUnread[0].created_at)
      }
      setMessages((prev) => prev.map((m) => (m.sender_id === activeContactId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)))
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .eq('sender_id', activeContactId)
        .is('read_at', null)
        .is('deleted_at', null)
      notifyChatRead()
      if (!error) {
        setUnreadMap((prev) => ({ ...prev, [activeContactId]: 0 }))
      } else {
        console.error('markAsRead gagal mempersist read_at:', error.message)
      }
    }
    markRead()
    return () => {
      unreadDividerContactRef.current = null
      setUnreadDividerAt(null)
    }
  }, [activeContactId, userId])

  useEffect(() => {
    if (!userId || !activeContactId || activeContactId === HUNIBOT_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOtherTyping(false)
      setOtherTypingContacts({})
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
      setOtherTypingContacts(prev => ({ ...prev, [activeContactId]: others.length > 0 }))
    }).subscribe()

    return () => {
      supabase.removeChannel(ch)
      typingChannelRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [userId, activeContactId])

  useEffect(() => {
    if (!userId || !activeContactId || activeContactId === HUNIBOT_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinnedMessages({})
      return
    }
    const room = [userId, activeContactId].sort().join('-')
    setPinnedMessages((prev) => {
      const next = { ...prev }
      if (!next[room]) next[room] = {}
      return next
    })
    let cancelled = false
    supabase
      .from('pinned_messages')
      .select('message_id')
      .eq('user_id', userId)
      .eq('chat_id', room)
      .then(async ({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return
        const ids = data.map((r) => r.message_id)
        const { data: msgs } = await supabase.from('direct_messages').select('*').in('id', ids)
        if (cancelled || !msgs) return
        const map = {}
        msgs.forEach((m) => { map[m.id] = m })
        setPinnedMessages((prev) => ({ ...prev, [room]: map }))
      })
    return () => { cancelled = true }
  }, [userId, activeContactId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('chat_stars')
      .select('message_id, chat_id')
      .eq('user_id', userId)
      .then(async ({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return
        const ids = data.map((r) => r.message_id)
        const { data: msgs } = await supabase.from('direct_messages').select('*').in('id', ids)
        if (cancelled || !msgs) return
        const grouped = {}
        data.forEach((r) => {
          const m = msgs.find((x) => x.id === r.message_id)
          if (!m) return
          if (!grouped[r.chat_id]) grouped[r.chat_id] = {}
          grouped[r.chat_id][m.id] = m
        })
        setStarredMessages((prev) => ({ ...prev, ...grouped }))
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (!userId || contacts.length === 0) return
    const contactIds = contacts.map((c) => c.id).filter((id) => id !== HUNIBOT_ID)
    if (contactIds.length === 0) return
    supabase
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', contactIds)
      .then(({ data, error }) => {
        if (error || !data) return
        const map = {}
        data.forEach((p) => { if (p.last_seen_at) map[p.id] = p.last_seen_at })
        setLastSeenMap(map)
      })
      .catch(() => {})
    const ch = supabase
      .channel('profile-last-seen')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=in.(${contactIds.join(',')})` }, (payload) => {
        if (payload.new?.last_seen_at) {
          setLastSeenMap((prev) => ({ ...prev, [payload.new.id]: payload.new.last_seen_at }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, contacts])

  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel('chat-presence-track')
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState()
        const users = Object.values(state).flat().map((p) => p.userId).filter(Boolean)
        setOnlineIds(() => {
          const next = {}
          users.forEach((id) => { next[id] = true })
          return next
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') ch.track({ userId, online_at: new Date().toISOString() })
      })
    const timer = setInterval(() => {
      // Update last_seen_at periodically (throttled) while user is active on the page
      if (document.visibilityState === 'visible') {
        supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {}).catch(() => {})
      }
    }, 60000)
    return () => {
      supabase.removeChannel(ch)
      clearInterval(timer)
    }
  }, [userId])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setMessageMenu(null)
      setMessageMenuPos(null)
      setReactionPickerMsg(null)
      setReactionsSummary(null)
      setShowNewChat(false)
      setChatSearchOpen(false)
      setDeleteTarget(null)
      if (imagePreviewOpen) setImagePreviewOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [imagePreviewOpen])

  useEffect(() => {
    if (!userId) return
    realtimeCancelledRef.current = false

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
          if (realtimeCancelledRef.current) return
          const msg = payload.new
          if (!msg) return
          if (msg.sender_id !== userId && msg.receiver_id !== userId) return
          if (msg.sender_id === userId) return
          if (msg.deleted_at) return
          const otherId = getOtherId(msg, userId)
          if (!otherId || otherId === HUNIBOT_ID) return

          const currentContactId = activeContactIdRef.current
          const isActive = otherId === currentContactId

          setMessages((prev) => {
            if (!isActive) return prev
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          if (isActive) {
            supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(({ error }) => {
              if (error) console.error('markAsRead realtime gagal:', error.message)
            }).catch((err) => console.error('markAsRead realtime error:', err?.message || err))
            setUnreadMap(prev => ({ ...prev, [otherId]: 0 }))
            notifyChatRead()
            if (!isAtBottomRef.current) {
              setNewMsgCount(c => c + 1)
              setNewMsgFAB(true)
            } else {
              scrollToLatestRef.current()
            }
          } else {
            setUnreadMap(prev => ({ ...prev, [otherId]: ((prev[otherId] || 0) + 1) }))
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
                if (data && !realtimeCancelledRef.current) {
                  setContacts(p => {
                    if (p.some(c => c.id === data.id)) return p
                    return [{ ...data, last_message: msg.content, last_message_at: msg.created_at }, ...p]
                  })
                }
              }).catch(() => {})
            }
            return prev
          })

          if (!isActive && msg.content) {
            const senderName = contactsRef.current.find(c => c.id === otherId)?.first_name || 'Seseorang'
            const isUnfocused = document.visibilityState !== 'visible'
            if (!isAtBottomRef.current || !currentContactId || isUnfocused) {
              showToast(`${senderName}: ${msg.content.slice(0, 80)}`, 'info')
            }
            const st = chatSettingsRef.current
            const shouldNotify = st.sound !== false && (document.visibilityState !== 'visible' || !currentContactId)
            if (shouldNotify) playMessageSound()
            if (st.notifications && isUnfocused && 'Notification' in window && Notification.permission === 'granted') {
              notifyNewMessage(senderName, msg.content.slice(0, 120))
            } else if (st.sound !== false && !isUnfocused) {
              playMessageSound()
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
          if (realtimeCancelledRef.current) return
          const msg = payload.new
          if (!msg) return
          if (msg.sender_id !== userId && msg.receiver_id !== userId) return
          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, read_at: msg.read_at, deleted_at: msg.deleted_at } : m)))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (realtimeCancelledRef.current) return
          const r = payload.new
          if (!r || !r.message_id) return
          const activeId = activeContactIdRef.current
          if (!activeId || activeId === HUNIBOT_ID) return
          const room = [userId, activeId].sort().join('-')
          setReactionsMap((prev) => {
            const roomMap = prev[room]
            if (!roomMap || !messagesIdSetRef.current.has(r.message_id)) return prev
            const list = roomMap[r.message_id] || []
            if (list.some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) return prev
            return { ...prev, [room]: { ...roomMap, [r.message_id]: [...list, { id: r.id, user_id: r.user_id, emoji: r.emoji }] } }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (realtimeCancelledRef.current) return
          const old = payload.old
          if (!old || !old.message_id) return
          const activeId = activeContactIdRef.current
          if (!activeId || activeId === HUNIBOT_ID) return
          const room = [userId, activeId].sort().join('-')
          setReactionsMap((prev) => {
            const roomMap = prev[room]
            if (!roomMap || !messagesIdSetRef.current.has(old.message_id)) return prev
            return {
              ...prev,
              [room]: {
                ...roomMap,
                [old.message_id]: (roomMap[old.message_id] || []).filter((x) => !(x.user_id === old.user_id && x.emoji === old.emoji)),
              },
            }
          })
        }
      )
      .subscribe((status) => {
        if (realtimeCancelledRef.current) return
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      realtimeCancelledRef.current = true
      supabase.removeChannel(channel)
    }
  }, [userId, showToast])

  function scrollToLatest() {
    loadedContactRef.current = activeContactId
    const applyScroll = () => {
      const container = messagesContainerRef.current
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
      isAtBottomRef.current = true
      setNewMsgFAB(false)
      setNewMsgCount(0)
    }
    // Tunggu DOM benar-benar selesai merender (bubble, gambar) lalu paksa ke bawah
    requestAnimationFrame(() => requestAnimationFrame(applyScroll))
    setTimeout(applyScroll, 50)
    setTimeout(applyScroll, 150)
  }

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!activeContactId || !el || messagesLoading) return

    // Kontak baru dipilih / obrolan pertama dibuka → paksa ke pesan terbaru
    if (loadedContactRef.current !== activeContactId) {
      scrollToLatest()
      return
    }

    // Pesan masuk real-time → auto-scroll hanya jika posisi sudah dekat bawah
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    isAtBottomRef.current = nearBottom
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeContactId, messagesLoading])

  function handleMessagesScroll() {
    const el = messagesContainerRef.current
    if (!el) return
    setReactionPickerMsg(null)
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    isAtBottomRef.current = nearBottom
    if (nearBottom) {
      setNewMsgFAB(false)
      setNewMsgCount(0)
      setUnreadDividerAt(null)
      unreadDividerContactRef.current = activeContactId || null
    }
  }

  function scrollToBottom() {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    isAtBottomRef.current = true
    setNewMsgFAB(false)
    setNewMsgCount(0)
    setUnreadDividerAt(null)
    unreadDividerContactRef.current = activeContactId || null
  }

  useEffect(() => {
    return () => {
      if (pendingImageUrlRef.current) {
        URL.revokeObjectURL(pendingImageUrlRef.current)
        pendingImageUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!plusMenuOpen) return
    const onClick = (ev) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(ev.target)) setPlusMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [plusMenuOpen])

  useEffect(() => {
    if (!selectedImage) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedImage(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedImage])

  useEffect(() => {
    if (searchMatches.length === 0 || !chatSearchQ.trim()) return
    const activeMatch = searchMatches[Math.min(currentSearchIndex, searchMatches.length - 1)]
    if (!activeMatch) return
    const el = document.getElementById(`message-${activeMatch.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlashMessageId(activeMatch.id)
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = setTimeout(() => setFlashMessageId(null), 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSearchQ, currentSearchIndex])

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (!showPropertyPicker) return
    let cancelled = false
    const q = propertySearch.trim()
    const run = async () => {
      setPropertySearching(true)
      try {
        let query = supabase.from('properties').select('id, title, price, category, price_period, image_url, city')
        if (q) {
          query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%`)
        } else {
          query = query.order('created_at', { ascending: false })
        }
        const { data, error } = await query.limit(20)
        if (!cancelled && !error && data) setPropertyResults(data)
      } catch { /* ignore */ }
      if (!cancelled) setPropertySearching(false)
    }
    const t = setTimeout(run, q ? 300 : 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [propertySearch, showPropertyPicker])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [inputValue])

  function handleBackToList() {
    setShowMobileList(true)
  }

  async function handleMarkAllRead() {
    if (!userId || markAllLoading) return
    setMarkAllLoading(true)
    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('read_at', null)
        .is('deleted_at', null)
      if (!error) {
        setUnreadMap({})
        setNewMsgCount(0)
        setNewMsgFAB(false)
        if (activeContactId) setUnreadMap(prev => ({ ...prev, [activeContactId]: 0 }))
        notifyChatRead()
      } else {
        showToast('Gagal menandai semua sudah dibaca.', 'error')
      }
    } catch (err) {
      console.warn('Gagal menandai semua sudah dibaca:', err.message)
      showToast('Gagal menandai semua sudah dibaca.', 'error')
    } finally {
      setMarkAllLoading(false)
    }
  }

  async function uploadChatImage(file) {
    const compressed = await compressImage(file)
    const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
    const { error: uploadErr } = await supabase.storage
      .from('CHAT_IMAGES')
      .upload(fileName, compressed, { contentType: compressed.type || file.type, upsert: false })
    if (uploadErr) throw new Error(uploadErr.message)
    const { data: { publicUrl } } = supabase.storage.from('CHAT_IMAGES').getPublicUrl(fileName)
    return publicUrl
  }

  function openImagePicker() {
    setPlusMenuOpen(false)
    fileInputRef.current?.click()
  }

  async function handlePickImage(e) {
    try {
      addFilesToStaging(e.target.files)
    } finally {
      e.target.value = ''
    }
  }

  function closeImagePreview() {
    if (pendingImageUrlRef.current) {
      URL.revokeObjectURL(pendingImageUrlRef.current)
      pendingImageUrlRef.current = null
    }
    setPendingImage(null)
    setPendingImageUrl(null)
    setCaption('')
    setImagePreviewOpen(false)
  }

  function handleSuggested(text) {
    setDrafts(prev => ({ ...prev, [activeContactId]: text }))
    inputRef.current?.focus()
  }

  const handleReply = useCallback((message) => {
    setReplyTo(message)
    setPlusMenuOpen(false)
    inputRef.current?.focus()
  }, [])

  const handleJumpToMessage = useCallback((messageId) => {
    const el = document.getElementById(`message-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashMessageId(messageId)
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = setTimeout(() => setFlashMessageId(null), 2000)
    } else {
      showToast('Pesan asli tidak ditemukan.', 'info')
    }
  }, [showToast])

  const handleTogglePin = useCallback(async (message) => {
    if (!userId) return
    const contactId = activeContactIdRef.current
    if (!contactId) return
    const room = [userId, contactId].sort().join('-')
    const isPinned = !!pinnedMessagesRef.current[room]?.[message.id]
    if (isPinned) {
      const { error } = await supabase.from('pinned_messages').delete().eq('user_id', userId).eq('message_id', message.id)
      if (!error) {
        setPinnedMessages((prev) => {
          const next = { ...prev }
          const roomPins = { ...(next[room] || {}) }
          delete roomPins[message.id]
          if (Object.keys(roomPins).length === 0) delete next[room]
          else next[room] = roomPins
          return next
        })
        showToast('Pesan dilepas dari sematan', 'info')
      }
    } else {
      const { error } = await supabase.from('pinned_messages').insert({ user_id: userId, chat_id: room, message_id: message.id })
      if (!error) {
        setPinnedMessages((prev) => ({ ...prev, [room]: { ...(prev[room] || {}), [message.id]: message } }))
        showToast('Pesan disematkan', 'success')
      }
    }
  }, [userId, showToast])

  const handleToggleReaction = useCallback((messageId, emoji) => {
    if (!userId || !messageId || !emoji) return
    if (String(messageId).startsWith('temp-')) return
    const targetId = activeContactIdRef.current
    if (!targetId) return
    const room = [userId, targetId].sort().join('-')
    const lockKey = `${room}:${messageId}`
    if (reactionPendingRef.current[lockKey]) return
    reactionPendingRef.current[lockKey] = true

    const prevList = reactionsMapRef.current[room]?.[messageId] || []
    const wasActive = !!prevList.find((r) => r.user_id === userId)
    const isSameEmoji = wasActive && prevList.some((r) => r.user_id === userId && r.emoji === emoji)
    const shouldAdd = !isSameEmoji

    setReactionsMap((prev) => {
      const roomMap = { ...(prev[room] || {}) }
      const others = (roomMap[messageId] || []).filter((r) => r.user_id !== userId)
      roomMap[messageId] = shouldAdd ? [...others, { id: null, user_id: userId, emoji }] : others
      return { ...prev, [room]: roomMap }
    })

    const restore = () => {
      if (activeContactIdRef.current !== targetId) return
      setReactionsMap((prev) => {
        const roomMap = { ...(prev[room] || {}) }
        roomMap[messageId] = prevList
        return { ...prev, [room]: roomMap }
      })
    }

    ;(async () => {
      try {
        if (wasActive) {
          const del = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId)
          if (del.error) throw del.error
        }
        if (shouldAdd) {
          const ins = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji })
          if (ins.error) throw ins.error
        }
      } catch {
        restore()
        showToast(isSameEmoji ? 'Reaksi gagal dihapus. Coba lagi.' : 'Reaksi gagal disimpan. Coba lagi.', 'error')
      } finally {
        delete reactionPendingRef.current[lockKey]
      }
    })()
    setReactionPickerMsg(null)
  }, [userId, showToast])

  const handleShowReactionSummary = useCallback((emoji, reactions, messageId) => {
    const userIds = (reactions || []).filter((r) => r.emoji === emoji).map((r) => r.user_id)
    const ids = userIds.filter((id) => id && id !== userId && !messageNamesMapRef.current[id])
    setReactionsSummary({ emoji, reactions, messageId })
    if (ids.length === 0) return
    supabase.from('profiles').select('id, first_name').in('id', ids).then(({ data, error }) => {
      if (error || !data) return
      const map = {}
      data.forEach((p) => { map[p.id] = p.first_name || 'User' })
      setMessageNamesMap((prev) => ({ ...prev, ...map }))
    }).catch(() => {})
  }, [userId])

  const handleToggleStar = useCallback((msg) => {
    if (!userId) return
    const contactId = activeContactIdRef.current
    if (!contactId || msg.sender_id !== userId) return
    const room = [userId, contactId].sort().join('-')
    if (starredMessagesRef.current[room]?.[msg.id]) {
      setStarredMessages((prev) => {
        const next = { ...prev }
        const roomStars = { ...(next[room] || {}) }
        delete roomStars[msg.id]
        if (Object.keys(roomStars).length === 0) delete next[room]
        else next[room] = roomStars
        return next
      })
      supabase.from('chat_stars').delete().eq('user_id', userId).eq('message_id', msg.id).then(() => {}).catch(() => {})
      showToast('Bookmark dilepas', 'info')
    } else {
      setStarredMessages((prev) => ({ ...prev, [room]: { ...(prev[room] || {}), [msg.id]: msg } }))
      supabase.from('chat_stars').insert({ user_id: userId, chat_id: room, message_id: msg.id }).then(() => {}).catch(() => {})
      showToast('Pesan dibookmark', 'success')
    }
  }, [userId, showToast])

const openReactionPicker = useCallback((msg, e, fallbackPos) => {
    if (!userId) return
    if (typeof msg?.id === 'string' && msg.id.startsWith('temp-')) {
      showToast('Tunggu pesan terkirim sebelum memberi reaksi.', 'info')
      return
    }
    const contactId = activeContactIdRef.current
    if (!contactId || contactId === HUNIBOT_ID) return
    const PICKER_W = 216
    const PICKER_H = 46
    const vw = window.innerWidth || document.documentElement.clientWidth || 1024
    const vh = window.innerHeight || document.documentElement.clientHeight || 768
    const btn = e?.currentTarget
    const rect = btn && typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null
    const isValid = rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.left >= 0 && rect.top >= 0 && rect.left <= vw && rect.top <= vh
    const safeTop = window.visualViewport?.offsetTop || 0
    if (isValid) {
      // Desktop & mobile sama-sama: melayang tepat di atas bubble yang diklik/hoover.
      // Di mobile di-clamp agar tidak pernah menutupi bar input pesan (guard ~104px di bawah).
      const bottomLimit = vw < 768 ? vh - PICKER_H - 104 - safeTop : vh - PICKER_H - 8
      setReactionPickerPos({
        top: Math.max(8, Math.min(rect.top - PICKER_H - 10, Math.max(8, bottomLimit))),
        left: Math.max(8, Math.min(rect.left - 20, vw - PICKER_W - 8)),
      })
    } else if (vw < 768) {
      // Mobile tanpa rect valid: tetap di atas bar input (bukan menindih / bukan 0,0).
      setReactionPickerPos({
        top: Math.max(8, vh - PICKER_H - 104 - safeTop),
        left: Math.max(8, Math.floor((vw - PICKER_W) / 2)),
      })
    } else if (fallbackPos && Number.isFinite(fallbackPos.top) && Number.isFinite(fallbackPos.left)) {
      // Desktop tanpa rect valid tapi punya posisi fallback (mis. dari popover menu): pakai itu.
      setReactionPickerPos({
        top: Math.max(8, Math.min(fallbackPos.top, vh - PICKER_H - 8)),
        left: Math.max(8, Math.min(fallbackPos.left, vw - PICKER_W - 8)),
      })
    } else {
      // Desktop tanpa rect valid: tengah layar.
      setReactionPickerPos({
        top: Math.max(8, Math.floor((vh - PICKER_H) / 2)),
        left: Math.max(8, Math.floor((vw - PICKER_W) / 2)),
      })
    }
    setReactionPickerMsg(msg)
  }, [userId, showToast])

  const openMessageMenu = useCallback((msg, e) => {
    setMessageMenu(null)
    setReactionPickerMsg(null)
    const btn = e?.currentTarget
    const rect = btn && typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null
    if (rect && Number.isFinite(rect.left) && Number.isFinite(rect.top)) {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1024
      const vh = window.innerHeight || document.documentElement.clientHeight || 768
      const PAD = 12
      const menuBelow = { top: Math.max(8, rect.bottom + 6), left: Math.max(PAD, Math.min(rect.left, vw - 240 - PAD)) }
      if (vh >= 768) setMessageMenuPos(menuBelow)
      else setMessageMenuPos(null)
    } else {
      setMessageMenuPos(null)
    }
    setMessageMenu(msg)
  }, [])

  function handleDragOver(e) {
    e.preventDefault()
    if (!activeContactId || activeContactId === HUNIBOT_ID) return
  }

  function handleDragEnter(e) {
    e.preventDefault()
    if (dragCounter === 0) setDragging(true)
    setDragCounter((c) => c + 1)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragCounter((c) => Math.max(0, c - 1))
    if (dragCounter - 1 <= 0) setDragging(false)
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragCounter(0)
    setDragging(false)
    if (!activeContactId || activeContactId === HUNIBOT_ID) {
      showToast('Pilih kontak untuk melampirkan file.', 'info')
      return
    }
    addFilesToStaging(e.dataTransfer?.files)
  }

  function toggleChatSetting(key) {
    const next = { ...chatSettings, [key]: !chatSettings[key] }
    setChatSettings(next)
    saveChatSettings(next)
    if (key === 'notifications' && !next.notifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }

  function handleExportChat() {
    if (!activeContact || messages.length === 0) {
      showToast('Belum ada pesan untuk diekspor', 'info')
      return
    }
    const rows = messages.map((m) => {
      const sender = m.sender_id === userId ? 'Saya' : (activeContact.first_name || 'Lawan bicara')
      const time = new Date(m.created_at).toLocaleString('id-ID')
      const content = m.image_url ? '[Gambar]' : m.file_url ? (m.file_name || '[Dokumen]') : m.property_id ? '[Kartu properti]' : (m.content || '').replace(/[\r\n]+/g, ' ')
      return `${time};${sender};${content}`
    })
    const csv = '\uFEFF' + ['Waktu;Pengirim;Pesan', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${activeContact.first_name || activeContact.id}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Riwayat chat diekspor', 'success')
  }

  function handleShareProperty(prop) {
    setShareProperty(prop)
    setShowPropertyPicker(false)
    setPlusMenuOpen(false)
    inputRef.current?.focus()
  }

  async function handleDownload() {
    if (!selectedImage || downloading) return
    setDownloading(true)
    try {
      const res = await fetch(selectedImage)
      if (!res.ok) throw new Error('Gagal mengambil gambar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getDownloadFileName(selectedImage)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast('Gagal mengunduh gambar: ' + (err.message || 'coba lagi'), 'error')
    } finally {
      setDownloading(false)
    }
  }

  function goToPrevSearchMatch() {
    if (searchMatches.length < 2) return
    setCurrentSearchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length)
  }

  function goToNextSearchMatch() {
    if (searchMatches.length < 2) return
    setCurrentSearchIndex((prev) => (prev + 1) % searchMatches.length)
  }

  const handleCopyMessage = useCallback(async (msg) => {
    const text = (msg.content || '').trim() || (msg.file_url ? (msg.file_name || 'Dokumen') : '')
    if (!text) {
      showToast('Tidak ada teks untuk disalin', 'info')
      return
    }
    const legacyCopy = () => {
      if (typeof document.execCommand !== 'function' || !document.queryCommandSupported?.('copy')) return false
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '0'
      ta.style.left = '0'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      try {
        return document.execCommand('copy')
      } finally {
        document.body.removeChild(ta)
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast('Pesan disalin ke clipboard', 'success')
    } catch {
      if (legacyCopy()) {
        showToast('Pesan disalin ke clipboard', 'success')
      } else {
        showToast('Gagal menyalin pesan', 'error')
      }
    }
  }, [showToast])

  async function handleSend(e) {
    e?.preventDefault()
    if (activeContactId === HUNIBOT_ID) return
    if (stagedFiles.length > 0) {
      if (stagingUploading) return
      setFileStagingOpen(true)
      return
    }
    const text = inputValue.trim()
    const hasContent = text || pendingImage || shareProperty
    if (!hasContent || !userId || !activeContactId || sending || imageUploading) return

    setUnreadDividerAt(null)
    unreadDividerContactRef.current = activeContactId

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingChannelRef.current?.untrack()

    setSending(true)
    setImageUploading(true)

    let imageUrl = null
    if (pendingImage) {
      try {
        imageUrl = await uploadChatImage(pendingImage)
      } catch (err) {
        showToast('Gagal mengunggah gambar: ' + (err.message || 'coba lagi'), 'error')
        setSending(false)
        setImageUploading(false)
        return
      }
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: activeContactId,
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_id: replyTo?.id || null,
      image_url: imageUrl,
      property_id: shareProperty?.id || null,
    }
    setMessages(prev => [...prev, optimisticMsg])
    scrollToLatest()
    setDrafts(prev => {
      const next = { ...prev }
      delete next[activeContactId]
      return next
    })
    setReplyTo(null)
    setShareProperty(null)
    if (pendingImageUrlRef.current) {
      URL.revokeObjectURL(pendingImageUrlRef.current)
      pendingImageUrlRef.current = null
    }
    setPendingImage(null)
    setPendingImageUrl(null)
    inputRef.current?.focus()

    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: text,
        reply_to_id: optimisticMsg.reply_to_id,
        image_url: optimisticMsg.image_url,
        property_id: optimisticMsg.property_id,
      }).select()

      if (!sendMountedRef.current) return

      if (error) {
        showToast(error.message, 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      } else if (data?.[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m))
        scrollToLatest()
        notifyChatRead()
      }
    } catch (err) {
      if (sendMountedRef.current) {
        showToast(err.message || 'Gagal mengirim pesan', 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }
    } finally {
      if (sendMountedRef.current) {
        setSending(false)
        setImageUploading(false)
      }
    }
  }

  async function handleSendImage() {
    if (activeContactId === HUNIBOT_ID) return
    if (!pendingImage || !userId || !activeContactId || sending || imageUploading) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingChannelRef.current?.untrack()

    setSending(true)
    setImageUploading(true)

    let imageUrl
    try {
      imageUrl = await uploadChatImage(pendingImage)
    } catch (err) {
      showToast('Gagal mengunggah gambar: ' + (err.message || 'coba lagi'), 'error')
      setSending(false)
      setImageUploading(false)
      return
    }

    const text = caption.trim()
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: activeContactId,
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_id: replyTo?.id || null,
      image_url: imageUrl,
      property_id: null,
    }
    setMessages(prev => [...prev, optimisticMsg])
    scrollToLatest()
    closeImagePreview()
    setReplyTo(null)
    inputRef.current?.focus()

    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: text,
        reply_to_id: optimisticMsg.reply_to_id,
        image_url: optimisticMsg.image_url,
      }).select()

      if (!sendMountedRef.current) return

      if (error) {
        showToast(error.message, 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      } else if (data?.[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m))
        scrollToLatest()
        notifyChatRead()
      }
    } catch (err) {
      if (sendMountedRef.current) {
        showToast(err.message || 'Gagal mengirim pesan', 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }
    } finally {
      if (sendMountedRef.current) {
        setSending(false)
        setImageUploading(false)
      }
    }
  }

  function openDocumentPicker() {
    setPlusMenuOpen(false)
    documentInputRef.current?.click()
  }

  function releaseStagedUrls() {
    if (pendingStagingUrlsRef.current.length) {
      pendingStagingUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u) } catch { /* noop */ } })
      pendingStagingUrlsRef.current = []
    }
  }

  function resetStaging() {
    releaseStagedUrls()
    setStagedFiles([])
    setStagedCaption('')
    setFileStagingOpen(false)
    setStagingUploading(false)
  }

  function addFilesToStaging(fileList) {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    if (activeContactId === HUNIBOT_ID) {
      showToast('HuniBot tidak menerima lampiran.', 'error')
      return
    }
    const accepted = []
    files.forEach((file) => {
      if (/^image\/(jpeg|png|webp|avif)$/i.test(file.type)) {
        if (file.size > 5 * 1024 * 1024) { showToast(`Gambar "${file.name}" melebihi 5MB.`, 'error'); return }
        accepted.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, url: URL.createObjectURL(file), type: 'image' })
      } else if (['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv'].includes(file.type)) {
        if (file.size > 20 * 1024 * 1024) { showToast(`Dokumen "${file.name}" melebihi 20MB.`, 'error'); return }
        accepted.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, url: URL.createObjectURL(file), type: 'document' })
      } else {
        showToast(`Format "${file.name}" tidak didukung (gambar, PDF, DOC, XLS, PPT, TXT, CSV).`, 'error')
      }
    })
    if (accepted.length === 0) return
    pendingStagingUrlsRef.current.push(...accepted.map((f) => f.url))
    setPlusMenuOpen(false)
    setReplyTo(null)
    setStagedFiles((prev) => [...prev, ...accepted])
    setStagedCaption('')
    setFileStagingOpen(true)
  }

  function removeStagedFile(id) {
    setStagedFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) {
        const idx = pendingStagingUrlsRef.current.indexOf(target.url)
        if (idx !== -1) pendingStagingUrlsRef.current.splice(idx, 1)
        try { URL.revokeObjectURL(target.url) } catch { /* noop */ }
      }
      const next = prev.filter((f) => f.id !== id)
      if (next.length === 0) {
        setFileStagingOpen(false)
      }
      return next
    })
  }

  async function sendStagedFiles() {
    if (activeContactId === HUNIBOT_ID) return
    if (!userId || !activeContactId || stagedFiles.length === 0 || stagingUploading) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingChannelRef.current?.untrack()
    setStagingUploading(true)
    const files = [...stagedFiles]
    const captionText = stagedCaption.trim()

    try {
      for (const sf of files) {
        let uploaded
        if (sf.type === 'image') {
          const publicUrl = await uploadChatImage(sf.file)
          uploaded = { url: publicUrl, name: sf.file.name, size: sf.file.size, type: sf.file.type || 'image/*' }
        } else {
          uploaded = await uploadChatFile(sf.file)
        }
        const optimisticMsg = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender_id: userId,
          receiver_id: activeContactId,
          content: captionText,
          created_at: new Date().toISOString(),
          read_at: null,
          reply_to_id: replyTo?.id || null,
          image_url: sf.type === 'image' ? uploaded.url : null,
          file_url: sf.type === 'image' ? null : uploaded.url,
          file_name: sf.type === 'image' ? null : uploaded.name,
          file_size: sf.type === 'image' ? null : uploaded.size,
          file_type: sf.type === 'image' ? null : uploaded.type,
          property_id: null,
          stagedCaption: captionText,
        }
        setMessages((prev) => [...prev, optimisticMsg])
        scrollToLatest()

        const { data, error } = await supabase.from('direct_messages').insert({
          sender_id: userId,
          receiver_id: activeContactId,
          content: captionText,
          reply_to_id: optimisticMsg.reply_to_id,
          image_url: optimisticMsg.image_url,
          file_url: optimisticMsg.file_url,
          file_name: optimisticMsg.file_name,
          file_size: optimisticMsg.file_size,
          file_type: optimisticMsg.file_type,
        }).select()
        if (!sendMountedRef.current) return
        if (error) {
          showToast(error.message, 'error')
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
        } else if (data?.[0]) {
          setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m))
          scrollToLatest()
          notifyChatRead()
        }
      }
    } catch (err) {
      if (sendMountedRef.current) showToast('Gagal mengirim lampiran: ' + (err.message || 'coba lagi'), 'error')
    } finally {
      if (sendMountedRef.current) {
        setStagingUploading(false)
        setStagedFiles([])
        releaseStagedUrls()
        setStagedCaption('')
        setFileStagingOpen(false)
        setDrafts((prev) => { if (!prev[activeContactId]) return prev; const next = { ...prev }; delete next[activeContactId]; return next })
        setReplyTo(null)
        inputRef.current?.focus()
        setUnreadDividerAt(null)
        unreadDividerContactRef.current = activeContactId
      }
    }
  }

  async function uploadChatFile(file) {
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
    const { error: uploadErr } = await supabase.storage
      .from('CHAT_FILES')
      .upload(fileName, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (uploadErr) throw new Error(uploadErr.message)
    const { data: { publicUrl } } = supabase.storage.from('CHAT_FILES').getPublicUrl(fileName)
    return { url: publicUrl, name: file.name, size: file.size, type: file.type || '' }
  }

  function forceStopMediaStream(stream) {
    if (!stream) return
    try {
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      /* non-critical */
    }
  }

  function withTimeout(promise, ms) {
    if (typeof promise?.then !== 'function') return promise
    return new Promise((resolve, reject) => {
      let timer = null
      const t = setTimeout(() => {
        if (timer) return
        timer = true
        reject(new Error('TimeoutRequestingMicrophone'))
      }, ms)
      promise.then(
        (v) => { if (!timer) { timer = true; clearTimeout(t); resolve(v) } },
        (e) => { if (!timer) { timer = true; clearTimeout(t); reject(e) } }
      )
    })
  }

  async function getAudioInputDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      return { ok: true, count: -1 }
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter((d) => d.kind === 'audioinput')
      return { ok: true, count: audioInputs.length }
    } catch {
      return { ok: false, count: -1 }
    }
  }

  function micGuidanceFor(name) {
    if (name === 'TimeoutRequestingMicrophone') {
      return { msg: 'Meminta mikrofon terlalu lama. Jika muncul popup izin, pilih "Allow" lalu tekan Mic lagi.', retry: true }
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return { msg: 'Mikrofon ditolak oleh sistem/browser. Klik ikon gembok/🔒 di address bar → izinkan mikrofon untuk situs ini → muat ulang, lalu tekan Mic lagi.', retry: true }
    }
    return null
  }

  function shouldRetryMic(err) {
    const name = err?.name || err?.message || ''
    const retryable = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError', 'TimeoutRequestingMicrophone']
    return retryable.includes(name)
  }

  function scheduleMicRetry(err) {
    if (micRetryTimerRef.current) return
    if (micRetryCountRef.current >= 1) return
    if (!shouldRetryMic(err)) return
    micRetryCountRef.current += 1
    micRetryTimerRef.current = setTimeout(() => {
      micRetryTimerRef.current = null
      startRecording()
    }, 1500)
  }

  async function detectMicError(err) {
    const name = err?.name || err?.message || ''

    if (name === 'TimeoutRequestingMicrophone') {
      const msg = micGuidanceFor(name).msg
      setMicError(msg)
      showToast(msg, 'error')
      scheduleMicRetry(err)
      return
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      const { count } = await getAudioInputDevices()
      const msg = count === 0
        ? 'Tidak ditemukan mikrofon di perangkat ini. Periksa/colok mikrofon, lalu tekan Mic lagi.'
        : 'Gagal mengakses mikrofon yang terhubung. Coba cabut & pasang ulang, lalu tekan Mic lagi.'
      setMicError(msg)
      showToast(msg, 'error')
      return
    }
    if (!sendMountedRef.current) return
    const guidance = micGuidanceFor(name)
    if (guidance) {
      setMicError(guidance.msg)
      showToast(guidance.msg, 'error')
      if (guidance.retry && micRetryCountRef.current < 1) scheduleMicRetry(err)
    } else {
      const fallback = 'Gagal mengakses mikrofon: ' + (err?.message || 'coba lagi')
      setMicError(fallback)
      showToast(fallback, 'error')
    }
  }

  async function startRecording() {
    if (activeContactId === HUNIBOT_ID) {
      showToast('HuniBot tidak menerima pesan suara.', 'error')
      return
    }
    if (typeof MediaRecorder === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToast('Perekaman suara tidak didukung oleh perangkat/browser ini.', 'error')
      return
    }
    if (isRecording || micPendingRef.current) return

    if (micError) setMicError('')

    micPendingRef.current = true

    let stream
    try {
      stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: true }),
        10000
      )
    } catch (err) {
      micPendingRef.current = false
      detectMicError(err)
      return
    }
    micPendingRef.current = false
    micRetryCountRef.current = 0
    if (micError) setMicError('')

    mediaStreamRef.current = stream

    let mime = null
    try {
      mime = pickVoiceMime()
    } catch {
      /* non-critical */
    }

    let recorder
    try {
      const options = mime && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime.mime)
        ? { mimeType: mime.mime }
        : undefined
      recorder = new MediaRecorder(stream, options)
    } catch {
      try {
        recorder = new MediaRecorder(stream)
      } catch (e2) {
        forceStopMediaStream(stream)
        mediaStreamRef.current = null
        setIsRecording(false)
        showToast('Gagal memulai perekaman suara: ' + (e2?.message || 'codec tidak didukung di browser ini.'), 'error')
        return
      }
    }

    mediaRecorderRef.current = recorder
    voiceMimeRef.current = mime
    mediaChunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data)
    }

    recorder.onerror = () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch { /* non-critical */ }
    }

    recorder.start(250)

    recordingPendingRef.current = true
    setIsRecording(true)
    setIsPaused(false)
    isPausedRef.current = false
    setPlusMenuOpen(false)
    setRecordingSeconds(0)
    recordElapsedRef.current = 0
    recordStartRef.current = Date.now()
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return
      const elapsed = Math.min(recordElapsedRef.current + Math.floor((Date.now() - recordStartRef.current) / 1000), 600)
      setRecordingSeconds(elapsed)
      if (elapsed >= 600) {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
        recordingPendingRef.current = false
        setIsRecording(false)
        setIsPaused(false)
        isPausedRef.current = false
        stopRecVisualizer()
        const mr = mediaRecorderRef.current
        if (mr && mr.state !== 'inactive') {
          try { mr.cancel() } catch { try { mr.stop() } catch { /* non-critical */ } }
        }
        mediaRecorderRef.current = null
        mediaChunksRef.current = []
        forceStopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        showToast('Rekaman dibatasi maksimal 10 menit.', 'info')
      }
    }, 200)
  }

  async function handleSendVoice() {
    if (!recordingPendingRef.current || !isRecording) {
      showToast('Rekaman tidak ditemukan, coba lagi.', 'info')
      return
    }
    recordingPendingRef.current = false
    setIsRecording(false)
    setIsPaused(false)
    isPausedRef.current = false
    setPlusMenuOpen(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    stopRecVisualizer()
    setVoiceUploading(true)

    await new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr || mr.state === 'inactive') {
        resolve()
        return
      }
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      mr.onstop = finish
      try {
        mr.stop()
      } catch {
        finish()
      }
      setTimeout(finish, 2000)
    })

    const chunks = mediaChunksRef.current
    const mime = voiceMimeRef.current
    const baseMime = voiceBaseMime(mime) || 'audio/webm'
    mediaChunksRef.current = []

    let blob
    try {
      if (chunks.length > 0) {
        blob = new Blob(chunks, { type: baseMime })
      }
    } catch {
      blob = undefined
    }

    if (!blob || blob.size === 0) {
      forceStopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      setRecordingSeconds(0)
      setVoiceUploading(false)
      showToast('Rekaman kosong. Silakan coba lagi.', 'error')
      return
    }

    let uploadBlob = blob
    let uploadMime = baseMime
    try {
      const compressed = await recompressVoiceBlob(blob)
      if (compressed.compressed && compressed.blob && compressed.blob.size > 0) {
        uploadBlob = compressed.blob
        if (compressed.mime) uploadMime = compressed.mime.split(';')[0]
      }
    } catch {
      uploadBlob = blob
      uploadMime = baseMime
    }

    const ext = voiceExtForMime(uploadMime)
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-voicenote.${ext}`
    let publicUrl
    try {
      const { error: uploadErr } = await supabase.storage
        .from('CHAT_VOICE')
        .upload(fileName, uploadBlob, { contentType: uploadMime, upsert: false })
      if (uploadErr) throw new Error(uploadErr.message)
      publicUrl = supabase.storage.from('CHAT_VOICE').getPublicUrl(fileName).data.publicUrl
    } catch (err) {
      forceStopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      setRecordingSeconds(0)
      setVoiceUploading(false)
      showToast('Gagal mengunggah pesan suara: ' + (err?.message || 'coba lagi'), 'error')
      return
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender_id: userId,
      receiver_id: activeContactId,
      content: '',
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_id: replyTo?.id || null,
      file_url: publicUrl,
      file_name: 'Pesan suara',
      file_size: uploadBlob.size,
      file_type: uploadMime,
      property_id: null,
    }
    setMessages((prev) => [...prev, optimisticMsg])
    scrollToLatest()
    setReplyTo(null)
    setDrafts((prev) => {
      if (!prev[activeContactId]) return prev
      const next = { ...prev }
      delete next[activeContactId]
      return next
    })

    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: '',
        reply_to_id: replyTo?.id || null,
        file_url: publicUrl,
        file_name: 'Pesan suara',
        file_size: uploadBlob.size,
        file_type: uploadMime,
      }).select()

      if (!sendMountedRef.current) return

      if (error) {
        showToast(error.message, 'error')
        forceStopMediaStream(mediaStreamRef.current)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      } else if (data?.[0]) {
        setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? data[0] : m))
        scrollToLatest()
      }
    } catch (err) {
      if (sendMountedRef.current) {
        showToast('Gagal mengirim pesan suara: ' + (err?.message || 'coba lagi'), 'error')
        forceStopMediaStream(mediaStreamRef.current)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      }
    } finally {
      if (sendMountedRef.current) {
        forceStopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        setRecordingSeconds(0)
        setVoiceUploading(false)
      }
    }
  }

  function initRecVisualizer(stream) {
    stopRecVisualizer()
    const canvas = recCanvasRef.current
    if (!canvas || typeof AudioContext === 'undefined') return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      recAudioCtxRef.current = ctx
      recSourceRef.current = source
      recAnalyserRef.current = analyser
      const rafLoop = () => {
        if (!isPausedRef.current) drawRecVisualizer()
        recRafRef.current = requestAnimationFrame(rafLoop)
      }
      recRafRef.current = requestAnimationFrame(rafLoop)
    } catch {
      stopRecVisualizer()
    }
  }

  function drawRecVisualizer() {
    const canvas = recCanvasRef.current
    const analyser = recAnalyserRef.current
    if (!canvas || !analyser) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    canvas.width = Math.max(1, width * dpr)
    canvas.height = Math.max(1, height * dpr)
    const g = canvas.getContext('2d')
    g.scale(dpr, dpr)
    g.clearRect(0, 0, width, height)

    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)

    const bars = 42
    const gap = 1.5
    const barW = Math.max(1.5, (width - gap * (bars - 1)) / bars)
    const mid = height / 2

    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length * 0.7)
      const v = data[idx] || 0
      const amp = Math.min(1, Math.max(0.06, v / 255))
      const barH = Math.max(2, amp * (height - 4))
      const x = i * (barW + gap)
      g.fillStyle = '#DC2626'
      g.beginPath()
      if (typeof g.roundRect === 'function') {
        g.roundRect(x, mid - barH / 2, barW, barH, barW / 2)
      } else {
        g.rect(x, mid - barH / 2, barW, barH)
      }
      g.fill()
    }
  }

  function stopRecVisualizer() {
    if (recRafRef.current) {
      cancelAnimationFrame(recRafRef.current)
      recRafRef.current = null
    }
    try {
      if (recSourceRef.current) recSourceRef.current.disconnect()
    } catch { /* non-critical */ }
    try {
      if (recAudioCtxRef.current && recAudioCtxRef.current.state !== 'closed') recAudioCtxRef.current.close()
    } catch { /* non-critical */ }
    recSourceRef.current = null
    recAnalyserRef.current = null
    recAudioCtxRef.current = null
    const canvas = recCanvasRef.current
    if (canvas) {
      const g = canvas.getContext('2d')
      if (g) g.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  function handlePauseRecording() {
    if (!recordingPendingRef.current || !isRecording || isPaused) return
    const mr = mediaRecorderRef.current
    if (mr && mr.state === 'recording') {
      try {
        mr.pause()
      } catch { /* non-critical */ }
    }
    isPausedRef.current = true
    setIsPaused(true)
    recordElapsedRef.current = Math.min(recordElapsedRef.current + Math.floor((Date.now() - recordStartRef.current) / 1000), 600)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  function handleResumeRecording() {
    if (!recordingPendingRef.current || !isRecording || !isPaused) return
    const mr = mediaRecorderRef.current
    if (mr && mr.state === 'paused') {
      try {
        mr.resume()
      } catch { /* non-critical */ }
    }
    isPausedRef.current = false
    setIsPaused(false)
    recordStartRef.current = Date.now()
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return
      const elapsed = Math.min(recordElapsedRef.current + Math.floor((Date.now() - recordStartRef.current) / 1000), 600)
      setRecordingSeconds(elapsed)
      if (elapsed >= 600) {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
        recordingPendingRef.current = false
        setIsRecording(false)
        setIsPaused(false)
        isPausedRef.current = false
        stopRecVisualizer()
        const mr2 = mediaRecorderRef.current
        if (mr2 && mr2.state !== 'inactive') {
          try { mr2.cancel() } catch { try { mr2.stop() } catch { /* non-critical */ } }
        }
        mediaRecorderRef.current = null
        mediaChunksRef.current = []
        forceStopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        showToast('Rekaman dibatasi maksimal 10 menit.', 'info')
      }
    }, 200)
  }

  const handleDiscardRecording = useCallback(() => {
    if (!recordingPendingRef.current || !isRecording) return
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive' && typeof mr.cancel === 'function') {
      try {
        mr.cancel()
      } catch {
        /* non-critical */
      }
    } else {
      if (mr && mr.state !== 'inactive') mr.stop()
    }
    recordingPendingRef.current = false
    setIsRecording(false)
    setIsPaused(false)
    isPausedRef.current = false
    setPlusMenuOpen(false)
    setRecordingSeconds(0)
    recordElapsedRef.current = 0
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    stopRecVisualizer()
    forceStopMediaStream(mediaStreamRef.current)
    mediaStreamRef.current = null
    mediaChunksRef.current = []
    voiceMimeRef.current = null
    showToast('Rekaman dibatalkan', 'info')
  }, [isRecording, showToast])

  const lastRecordingContactRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
      stopRecVisualizer()
      forceStopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      initRecVisualizer(mediaStreamRef.current)
    }
    return () => stopRecVisualizer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  useEffect(() => {
    if (isRecording && lastRecordingContactRef.current && lastRecordingContactRef.current !== activeContactId) {
      handleDiscardRecording()
    }
    lastRecordingContactRef.current = activeContactId
  }, [activeContactId, isRecording, handleDiscardRecording])

  async function handlePickDocument(e) {
    try {
      addFilesToStaging(e.target.files)
    } finally {
      e.target.value = ''
    }
  }

  const handleOpenFile = useCallback((message) => {
    if (!message?.file_url) return
    window.open(message.file_url, '_blank', 'noopener,noreferrer')
  }, [])

  function handleInputChange(e) {
    const val = e.target.value
    setDrafts(prev => ({ ...prev, [activeContactId]: val }))
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
      const { data, error } = await supabase
        .from('direct_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteTarget)
        .eq('sender_id', userId)
        .is('deleted_at', null)
        .select()
      if (data?.length > 0) {
        setMessages(prev => prev.map(m => (m.id === deleteTarget ? { ...m, deleted_at: data[0].deleted_at } : m)))
        setPinnedMessages((prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((room) => {
            if (next[room]?.[deleteTarget]) {
              const roomPins = { ...next[room] }
              delete roomPins[deleteTarget]
              if (Object.keys(roomPins).length === 0) delete next[room]
              else next[room] = roomPins
            }
          })
          return next
        })
        showToast('Pesan dihapus', 'success')
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

  function handleStartNewChat(contactId) {
    const user = allUsers.find((u) => u.id === contactId)
    if (user) {
      setContacts((prev) => {
        if (prev.some((c) => c.id === contactId)) return prev
        return [
          {
            id: user.id,
            first_name: user.first_name,
            role: user.role,
            last_message: null,
            last_message_at: null,
          },
          ...prev,
        ]
      })
    }
    setShowNewChat(false)
    setActiveContactId(contactId)
    setShowMobileList(false)
    setUnreadMap(prev => ({ ...prev, [contactId]: 0 }))
  }

  useEffect(() => {
    if (!showNewChat) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllUsersLoading(true)
    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, role')
          .neq('id', userId)
        if (cancelled) return
        if (error) throw error
        setAllUsers(data || [])
      } catch (err) {
        if (!cancelled) {
          setAllUsers([])
          showToast(err.message || 'Gagal memuat daftar pengguna', 'error')
        }
      } finally {
        if (!cancelled) setAllUsersLoading(false)
      }
    }
    loadUsers()
    return () => { cancelled = true }
  }, [showNewChat, userId, showToast])

  if (!userId) {
    return <LoginPrompt />
  }

  const isComposerBusy = sending || imageUploading || stagingUploading || voiceUploading
  const recordingActive = isRecording || voiceUploading
  const canSend = isRecording || isComposerBusy || !!inputValue.trim() || !!pendingImage || stagedFiles.length > 0 || !!shareProperty

  return (
    <>
    <div className="h-[calc(100dvh-56px)] overflow-hidden bg-brand-bg flex flex-col relative" style={{ height: chatVh ? `calc(${chatVh}px - 56px)` : undefined }}>
      <div className="flex-1 flex flex-col lg:flex-row lg:max-w-7xl lg:mx-auto lg:w-full 2xl:max-w-[1600px] lg:border-x lg:border-brand-border overflow-hidden">
        {/* ─── Contact List ───────────────────────────────────── */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-80 xl:w-96 lg:border-r lg:border-brand-border bg-brand-surface`}
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
              onClick={handleMarkAllRead}
              disabled={markAllLoading || Object.values(unreadMap).every((n) => !n)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand-muted active:scale-90 transition-all"
              title="Tandai semua sudah dibaca"
              aria-label="Tandai semua sudah dibaca"
            >
              {markAllLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCheck size={18} />}
            </button>
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
            <div className="px-4 py-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand-border rounded-lg">
                <Search size={14} className="text-brand-muted shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kontak..."
                  className="flex-1 bg-transparent text-[16px] md:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
                />
                {searchQuery && (
                  <button type="button" aria-label="Bersihkan pencarian" onClick={() => setSearchQuery('')} className="text-brand-muted hover:text-brand-text">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'unread', label: 'Belum dibaca' },
                  { key: 'agent', label: 'Agent' },
                  { key: 'owner', label: 'Owner' },
                  { key: 'bookmark', label: 'Bookmark' },
                ].map((f) => {
                  const count = f.key === 'all' ? contacts.length
                    : f.key === 'unread' ? contacts.filter((c) => (unreadMap[c.id] || 0) > 0).length
                    : f.key === 'agent' ? contacts.filter((c) => ['agent', 'developer', 'admin'].includes(c.role)).length
                    : f.key === 'owner' ? contacts.filter((c) => c.role === 'owner').length
                    : f.key === 'bookmark' ? contacts.filter((c) => starCountFor(c) > 0).length
                    : 0
                  const active = contactFilter === f.key
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setContactFilter(f.key)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-brand-accent text-white border-brand-accent font-semibold'
                          : 'bg-brand-bg text-brand-muted border-brand-border hover:text-brand-text hover:border-brand-accent'
                      }`}
                    >
                      {f.key === 'bookmark' && (
                        <Star size={11} className={`inline -mt-0.5 mr-1 fill-current ${active ? 'opacity-100' : 'text-amber-500'}`} />
                      )}
                      {f.label}
                      {count > 0 && <span className={`ml-1 ${active ? 'text-white/80' : 'text-brand-muted'}`}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overscroll-none">
            {loading ? (
              <ContactListSkeleton />
            ) : contactsError && !loading ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <AlertTriangle size={32} className="text-brand-muted/40 mb-3" />
                <p className="text-sm text-brand-muted leading-relaxed">{contactsError}</p>
                <button
                  type="button"
                  onClick={() => { setContactsError(null); setContactsRetryCounter((c) => c + 1) }}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/10 rounded-full px-4 py-2 transition-colors"
                >
                  <RefreshCw size={13} /> Coba lagi
                </button>
              </div>
            ) : visibleContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageCircle size={32} className="text-brand-muted/40 mb-3" />
                <p className="text-sm text-brand-muted leading-relaxed">
                  {searchQuery ? 'Kontak tidak ditemukan.'
                    : contactFilter === 'bookmark' ? 'Belum ada pesan dibookmark. Tekan bintang pada pesan kiriman Anda untuk menyimpannya.'
                    : 'Belum ada kontak. Mulai dengan menghubungi agen atau tim support.'}
                </p>
              </div>
            ) : (
              visibleContacts.map((contact) => (
                <div key={contact.id} className="relative">
                  <ContactItem
                    contact={contact}
                    isActive={contact.id === activeContactId}
                    onClick={handleSelectContact}
                    lang={i18n.language}
                    isTyping={!!otherTypingContacts[contact.id]}
                    unread={contact.id !== activeContactId ? (unreadMap[contact.id] || 0) : 0}
                    isOnline={!!onlineIds[contact.id]}
                    lastSeen={contact.id === HUNIBOT_ID ? null : (lastSeenMap[contact.id] || null)}
                    bookmarkCount={starCountFor(contact)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat Window ────────────────────────────────────── */}
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${
            !showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col flex-1 min-h-0 bg-brand-surface/50`}
        >
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-brand-border bg-brand-surface">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="lg:hidden text-brand-muted hover:text-brand-text transition-colors -ml-1 p-1 shrink-0"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={18} />
                </button>
                {isHunibotRoom ? (
                  <>
                    <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white bg-gradient-to-br from-brand-primary to-[#7C3AED] shadow-sm">
                      <Bot size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate">HuniBot</p>
                      <p className="text-xs text-brand-muted flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent" />
                        AI Assistant · Asisten properti
                      </p>
                    </div>
                  </>
                ) : activeContact.role === 'admin' || activeContact.role === 'agent' || activeContact.role === 'developer' || activeContact.role === 'owner' ? (
                  <Link
                    to={activeContact.role === 'owner' ? `/seller/${activeContact.id}` : `/agents/${activeContact.id}`}
                    className="flex items-center gap-3 min-w-0 rounded-lg hover:bg-brand-bg/60 -m-1 p-1 transition-colors group"
                    title="Lihat profil"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: getAvatarColor(activeContact.id) }}
                    >
                      {getInitials(activeContact.first_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate group-hover:text-brand-accent transition-colors">
                        {activeContact.first_name || 'User'}
                      </p>
                      {otherTyping ? (
                        <p className="text-xs text-brand-accent font-medium flex items-center gap-1">
                          sedang mengetik
                          <TypingDots color="var(--color-brand-accent)" />
                        </p>
                      ) : !connected ? (
                        <p className="text-xs text-brand-muted flex items-center gap-1">
                          Menyambung kembali
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-pending animate-pulse" />
                        </p>
                      ) : onlineIds[activeContact.id] ? (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                          Online
                        </p>
                      ) : (
                        <p className="text-xs text-brand-muted">
                          {activeContact.role === 'admin' ? 'Admin Internal'
                            : activeContact.role === 'agent' ? 'Agent'
                            : activeContact.role === 'developer' ? 'Developer'
                            : 'Owner'}
                          <span className="ml-1 text-brand-accent/70">· Profil</span>
                        </p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <>
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
                        <p className="text-xs text-brand-accent font-medium flex items-center gap-1">
                          sedang mengetik
                          <TypingDots color="var(--color-brand-accent)" />
                        </p>
                      ) : !connected ? (
                        <p className="text-xs text-brand-muted flex items-center gap-1">
                          Menyambung kembali
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-pending animate-pulse" />
                        </p>
                      ) : onlineIds[activeContact.id] ? (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                          Online
                        </p>
                      ) : activeContact.role ? (
                        <p className="text-xs text-brand-muted">
                          {activeContact.role === 'admin' ? 'Admin Internal'
                            : activeContact.role === 'agent' ? 'Agent'
                            : activeContact.role === 'developer' ? 'Developer'
                            : activeContact.role === 'owner' ? 'Owner'
                            : 'Pembeli'}
                          {lastSeenMap[activeContact.id] && (
                            <span> · Terakhir aktif {timeAgo(lastSeenMap[activeContact.id], i18n.language)}</span>
                          )}
                        </p>
                      ) : lastSeenMap[activeContact.id] ? (
                        <p className="text-xs text-brand-muted">Terakhir aktif {timeAgo(lastSeenMap[activeContact.id], i18n.language)}</p>
                      ) : null}
                    </div>
                  </>
                )}
                {!isHunibotRoom && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleChatSetting('sound')}
                      aria-label={chatSettings.sound ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
                      title={chatSettings.sound ? 'Suara aktif' : 'Suara nonaktif'}
                      className={`ml-auto p-2 rounded-full transition-colors ${chatSettings.sound ? 'text-brand-accent hover:bg-brand-bg' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'}`}
                    >
                      <Volume2 size={18} className={chatSettings.sound ? '' : 'opacity-40'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChatSetting('notifications')}
                      aria-label={chatSettings.notifications ? 'Nonaktifkan notifikasi' : 'Aktifkan notifikasi'}
                      title={chatSettings.notifications ? 'Notifikasi aktif' : 'Notifikasi nonaktif'}
                      className={`p-2 rounded-full transition-colors ${chatSettings.notifications ? 'text-brand-accent hover:bg-brand-bg' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'}`}
                    >
                      <Bell size={18} className={chatSettings.notifications ? '' : 'opacity-40'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleExportChat}
                      aria-label="Ekspor riwayat chat"
                      title="Ekspor riwayat chat"
                      className="p-2 rounded-full text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChatSearchOpen(v => !v); setChatSearchQ('') }}
                      aria-label="Cari di riwayat"
                      title="Cari di riwayat"
                      className={`p-2 rounded-full transition-colors ${chatSearchOpen ? 'bg-brand-accent/10 text-brand-accent' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'}`}
                    >
                      <Search size={18} />
                    </button>
                  </>
                )}
              </div>

              {isHunibotRoom ? (
                <HuniBotRoom firstName={user?.user_metadata?.first_name} />
              ) : (
              <>
              {/* Property context card */}
              {contextProperty && showContextCard && contextContactIdRef.current === activeContactId && (
                <div className="shrink-0 px-4 pt-3 pb-2 border-b border-brand-border bg-brand-bg/60">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1.5">
                    Properti yang ditanyakan
                  </p>
                  <div className="flex items-center gap-2.5 rounded-xl border border-brand-border bg-brand-surface p-2.5 pr-2">
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
                    <Link
                      to={`/property/${contextProperty.id}`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-brand-accent/40 bg-brand-accent/5 px-3 py-2 text-xs font-bold text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent transition-colors"
                    >
                      Lihat Properti
                      <ArrowRight size={13} />
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
              <div className="relative flex-1 min-h-0">
              <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="h-full overflow-y-auto py-2 overscroll-none">
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
                ) : messages.length === 0 && messagesError ? (
                  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                    <AlertTriangle size={28} className="text-brand-muted/50 mb-3" />
                    <p className="text-sm text-brand-muted">{messagesError}</p>
                    <button
                      type="button"
                      onClick={() => { setMessagesError(null); setMessagesRetryCounter((c) => c + 1) }}
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/10 rounded-full px-4 py-2 transition-colors"
                    >
                      <RefreshCw size={13} /> Coba lagi
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyChat contactName={activeContact.first_name} onSuggested={handleSuggested} property={contextProperty} />
                ) : (
                  <>
                    {pinnedMessages[[userId, activeContactId].sort().join('-')] &&
                      Object.keys(pinnedMessages[[userId, activeContactId].sort().join('-')]).length > 0 && (
                        <div className="px-4 pt-3">
                          <div className="flex items-start gap-2.5 rounded-xl border border-brand-border bg-brand-bg/70 px-3 py-2.5">
                            <Pin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-brand-accent uppercase tracking-wide">Pesan disematkan</p>
                              {(() => {
                                const pins = pinnedMessages[[userId, activeContactId].sort().join('-')]
                                const firstKey = Object.keys(pins)[0]
                                const pinned = pins[firstKey]
                                return (
                                  <p className="text-xs text-brand-text truncate mt-0.5">
                                    {pinned.image_url ? '[Gambar]' : pinned.file_url ? (pinned.file_name || '[Dokumen]') : pinned.property_id ? '[Kartu properti]' : pinned.content}
                                  </p>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
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
                      const repliedMessage = msg.reply_to_id ? replyIndex.get(msg.reply_to_id) : null
                      const isUnreadStart = unreadDividerAt
                        && msg.sender_id === activeContactId
                        && new Date(msg.created_at) >= new Date(unreadDividerAt)
                        && (!prev
                          || prev.sender_id !== msg.sender_id
                          || new Date(prev.created_at) < new Date(unreadDividerAt))
                      return (
                        <div key={msg.id}>
                          {newDay && i > 0 && <DateSeparator date={dayLabel(msg.created_at)} />}
                          {isUnreadStart && (
                            <div className="flex items-center gap-2 my-3 px-4">
                              <div className="flex-1 h-px bg-brand-accent/40" />
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-accent bg-brand-accent/10 rounded-full px-3 py-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Pesan Baru
                              </span>
                              <div className="flex-1 h-px bg-brand-accent/40" />
                            </div>
                          )}
                          <ChatErrorBoundary>
                            {msg.deleted_at ? (
                            <div id={`message-${msg.id}`} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'} px-4 mt-3`}>
                              <div className={`rounded-2xl px-4 py-2 text-xs italic border ${
                                msg.sender_id === userId
                                  ? 'bg-brand-bg/60 border-brand-border text-brand-muted rounded-br-md'
                                  : 'bg-brand-bg/40 border-brand-border text-brand-muted rounded-bl-md'
                              }`}>
                                Pesan ini telah dihapus
                              </div>
                            </div>
                          ) : (
                            <MessageBubble
                              message={msg}
                              isOwn={msg.sender_id === userId}
                              onDelete={setDeleteTarget}
                              onReply={handleReply}
                              lang={i18n.language}
                              firstInGroup={firstInGroup}
                              lastInGroup={lastInGroup}
                              otherName={activeContact.first_name}
                              otherColor={getAvatarColor(activeContact.id)}
                              repliedMessage={repliedMessage}
                              highlight={chatSearchQ}
                              onPin={handleTogglePin}
                              isPinned={!!pinnedMessages[[userId, activeContactId].sort().join('-')]?.[msg.id]}
                              onImageClick={setSelectedImage}
                              isSearchActive={msg.id === searchMatches[currentSearchIndex]?.id}
                              onMoreClick={(msg, e) => openMessageMenu(msg, e)}
                              onCopy={handleCopyMessage}
                              isFlashed={msg.id === flashMessageId}
                              reactions={reactionsMap[[userId, activeContactId].sort().join('-')]?.[msg.id] || EMPTY_ARRAY}
                              myId={userId}
                              onReact={handleToggleReaction}
                              onJumpToMessage={handleJumpToMessage}
                              isStarred={!!starredMessages[[userId, activeContactId].sort().join('-')]?.[msg.id]}
                              onToggleStar={handleToggleStar}
                              onShowSummary={handleShowReactionSummary}
                              onOpenReactionPicker={activeContactId === HUNIBOT_ID ? null : openReactionPicker}
                              onFileOpen={handleOpenFile}
                            />
                          )}
                          </ChatErrorBoundary>
                        </div>
                      )
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
                {newMsgFAB && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-3 right-4 z-20 inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-brand-accent text-white text-xs font-bold shadow-lg hover:brightness-95 active:scale-95 transition-all animate-fadeIn"
                    aria-label="Gulir ke pesan terbaru"
                  >
                    Pesan baru {newMsgCount > 0 ? `(${newMsgCount})` : ''}
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>

              {/* Chat search */}
              {chatSearchOpen && (
                <div className="shrink-0 border-t border-brand-border bg-brand-surface px-4 py-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand-border rounded-lg">
                    <Search size={14} className="text-brand-muted shrink-0" />
                    <input
                      type="text"
                      value={chatSearchQ}
                      onChange={(e) => { setChatSearchQ(e.target.value); setCurrentSearchIndex(0) }}
                      placeholder="Cari di riwayat..."
                      className="flex-1 bg-transparent text-[16px] md:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
                    />
                    <span className="text-[10px] text-brand-muted shrink-0">
                      {chatSearchQ.trim() ? (
                        searchMatches.length > 0
                          ? `${Math.min(currentSearchIndex, searchMatches.length - 1) + 1}/${searchMatches.length}`
                          : '0 hasil'
                      ) : ''}
                    </span>
                    <button
                      type="button"
                      onClick={goToPrevSearchMatch}
                      disabled={searchMatches.length < 2}
                      aria-label="Hasil sebelumnya"
                      title="Hasil sebelumnya"
                      className="shrink-0 p-1 rounded-md text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextSearchMatch}
                      disabled={searchMatches.length < 2}
                      aria-label="Hasil berikutnya"
                      title="Hasil berikutnya"
                      className="shrink-0 p-1 rounded-md text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Composer Footer */}
              <div className="shrink-0">
              {replyTo && (
                <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} otherName={activeContact.first_name} userId={userId} />
              )}

              {/* Input Bar */}
              {micError && (
                <div className="shrink-0 flex items-start gap-2 mx-4 mt-2 rounded-xl border border-brand-danger/30 bg-brand-danger/5 px-3 py-2.5 text-xs text-brand-danger animate-fadeIn">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0 leading-snug">{micError}</span>
                  <button
                    type="button"
                    onClick={() => setMicError('')}
                    aria-label="Tutup peringatan mikrofon"
                    title="Tutup"
                    className="shrink-0 text-brand-danger/70 hover:text-brand-danger transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (recordingActive) {
                    handleSendVoice()
                    return
                  }
                  handleSend(e)
                }}
                className={`shrink-0 px-4 pt-2 ${keyboardOpen ? 'pb-2' : 'pb-[max(0.5rem,min(env(safe-area-inset-bottom),1.25rem))]'} border-t border-brand-border bg-brand-surface`}
              >
                <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  {shareProperty && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-bg px-2 py-1.5">
                        <Building2 size={14} className="text-brand-accent shrink-0" />
                        <span className="text-xs text-brand-text truncate max-w-[10rem]">{shareProperty.title || 'Properti'}</span>
                        <button
                          type="button"
                          onClick={() => setShareProperty(null)}
                          aria-label="Hapus properti"
                          className="text-brand-muted hover:text-brand-danger"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    </div>
                  )}                  {stagedFiles.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-bg px-2 py-1.5">
                        <Paperclip size={14} className="text-brand-accent shrink-0" />
                        <span className="text-xs text-brand-text">{stagedFiles.length} lampiran</span>
                        <button
                          type="button"
                          onClick={() => setFileStagingOpen(true)}
                          aria-label="Tinjau lampiran"
                          className="text-xs font-semibold text-brand-accent hover:underline"
                        >
                          Tinjau
                        </button>
                        <button
                          type="button"
                          onClick={() => resetStaging()}
                          aria-label="Batal semua lampiran"
                          className="text-brand-muted hover:text-brand-danger"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="flex items-end gap-1 rounded-full border border-brand-border bg-brand-bg pl-1.5 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-brand-accent/30 focus-within:border-brand-accent transition-colors">
                    {isRecording ? (
                      <div className="flex items-center gap-1.5 py-1 pl-1 pr-1 min-w-0 w-full">
                        <button
                          type="button"
                          onClick={handleDiscardRecording}
                          aria-label="Batal dan hapus rekaman suara"
                          title="Hapus rekaman"
                          className="w-9 h-9 shrink-0 rounded-full text-brand-danger hover:bg-brand-danger/10 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={19} />
                        </button>
                        <button
                          type="button"
                          onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                          aria-label={isPaused ? 'Lanjutkan perekaman' : 'Jeda perekaman'}
                          title={isPaused ? 'Lanjutkan' : 'Jeda'}
                          className="w-9 h-9 shrink-0 rounded-full text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center transition-colors"
                        >
                          {isPaused ? <Play size={19} className="ml-0.5" /> : <Pause size={19} />}
                        </button>
                        <canvas
                          ref={recCanvasRef}
                          className="flex-1 h-8 mx-2 min-w-0"
                          aria-hidden="true"
                        />
                        <span
                          className={`text-sm font-semibold tabular-nums shrink-0 ${isPaused ? 'text-brand-muted' : 'text-brand-danger'}`}
                          role="timer"
                        >
                          {formatVoiceTime(Math.floor(Math.min(recordingSeconds, 600)))}
                        </span>
                        {isPaused && (
                          <span className="text-[11px] font-medium text-brand-muted shrink-0">dijeda</span>
                        )}
                      </div>
                    ) : (
                      <>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e)
                        }
                      }}
                      placeholder="Tulis pesan..."
                      className="flex-1 min-w-0 bg-transparent text-[16px] md:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none resize-none overflow-y-auto leading-snug max-h-32 py-1 pl-0"
                      disabled={sending}
                    />
                    <div ref={plusMenuRef} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setPlusMenuOpen(v => !v)}
                        aria-label="Lampiran"
                        title="Lampiran"
                        className="w-9 h-9 shrink-0 rounded-full text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center transition-colors"
                      >
                        <Paperclip size={18} />
                      </button>
                      {plusMenuOpen && (
                        <div className="absolute bottom-11 right-0 z-30 w-48 rounded-xl bg-brand-surface border border-brand-border shadow-lg p-1.5 animate-fadeIn">
                          <button
                            type="button"
                            onClick={() => { setPlusMenuOpen(false); setShowPropertyPicker(true) }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-text hover:bg-brand-bg text-left"
                          >
                            <Building2 size={16} className="text-brand-accent shrink-0" /> Bagikan properti
                          </button>
                          <button
                            type="button"
                            onClick={openImagePicker}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-text hover:bg-brand-bg text-left"
                          >
                            <ImagePlus size={16} className="text-brand-accent shrink-0" /> Kirim gambar
                          </button>
                          <button
                            type="button"
                            onClick={openDocumentPicker}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-text hover:bg-brand-bg text-left"
                          >
                            <FileText size={16} className="text-brand-accent shrink-0" /> Kirim dokumen
                          </button>
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </div>
                </div>
                <button
                  type={canSend ? 'submit' : 'button'}
                  onClick={!canSend ? startRecording : undefined}
                  disabled={canSend && isComposerBusy}
                  className="shrink-0 w-11 h-11 rounded-full bg-brand-primary text-white shadow-md flex items-center justify-center hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={canSend ? 'Kirim pesan' : !isRecording ? 'Rekam pesan suara' : 'Aksi suara'}
                  title={canSend ? 'Kirim pesan' : !isRecording ? 'Rekam pesan suara' : 'Kirim pesan suara'}
                >
                  {canSend ? (
                    isComposerBusy ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={19} className="-ml-0.5" />
                    )
                  ) : (
                    <Mic size={21} className="ml-0.5" />
                  )}
                </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handlePickImage} />
                <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple hidden onChange={handlePickDocument} />
              </form>
              </div>
              </>
              )}
            </>
          ) : (
            <EmptyChat contactName={null} />
          )}
        </div>
      </div>
    </div>

    {imagePreviewOpen && pendingImageUrl && (
      <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between px-4 h-14 shrink-0">
          <button
            type="button"
            onClick={closeImagePreview}
            disabled={imageUploading}
            aria-label="Batal"
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={22} />
          </button>
          <span className="text-sm font-semibold text-white/90">Pratinjau Foto</span>
          <span className="w-9" />
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <img
            src={pendingImageUrl}
            alt="Pratinjau"
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>

        <div className="shrink-0 px-4 py-3 bg-black/60 border-t border-white/10">
          {replyTo && (
            <div className="mb-3">
              <ReplyPreview
                compact
                message={replyTo}
                onCancel={() => setReplyTo(null)}
                otherName={activeContact?.first_name}
                userId={userId}
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!imageUploading) handleSendImage()
                }
              }}
              placeholder="Tambahkan keterangan..."
              autoFocus={false}
              className="flex-1 border border-white/20 rounded-xl py-3 px-4 text-sm text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 placeholder:text-white/50 resize-none overflow-y-auto max-h-28"
              disabled={imageUploading}
            />
            <button
              type="button"
              onClick={handleSendImage}
              disabled={imageUploading}
              aria-label="Kirim foto"
              className="shrink-0 w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {imageUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          {imageUploading && (
            <p className="text-[10px] text-white/60 mt-2">Mengunggah & mengirim foto...</p>
          )}
        </div>
      </div>
    )}

    {fileStagingOpen && (
      <>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => { if (!stagingUploading) setFileStagingOpen(false) }}
          className="fixed inset-0 bg-black/50 z-[70] cursor-default p-0 border-0"
        />
        <div className="fixed bottom-0 left-0 right-0 z-[75] bg-brand-surface rounded-t-3xl animate-slide-up overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-base font-bold text-brand-text">
              {stagedFiles.length > 0 ? `Lampiran (${stagedFiles.length})` : 'Lampiran'}
            </h2>
            <button
              type="button"
              aria-label="Tutup"
              disabled={stagingUploading}
              onClick={() => setFileStagingOpen(false)}
              className="text-brand-muted hover:text-brand-text disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {stagedFiles.length === 0 ? (
              <p className="text-sm text-brand-muted text-center py-10">Tidak ada lampiran. Tutup untuk kembali.</p>
            ) : (
              stagedFiles.map((sf) => {
                const { Icon, color } = getFileIcon(sf.file.type || '', sf.file.name)
                return (
                  <div key={sf.id} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-bg p-2.5">
                    <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-brand-border bg-brand-surface">
                      {sf.type === 'image' ? (
                        <img src={sf.url} alt={sf.file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: color || 'var(--color-brand-accent)' }}>
                          <Icon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-text truncate">{sf.file.name}</p>
                      <p className="text-xs text-brand-muted">
                        {formatFileSize(sf.file.size)} · {sf.type === 'image' ? 'Gambar' : 'Dokumen'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={stagingUploading}
                      onClick={() => removeStagedFile(sf.id)}
                      aria-label={`Hapus ${sf.file.name}`}
                      className="shrink-0 w-8 h-8 rounded-full text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 flex items-center justify-center disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="shrink-0 px-4 py-3 border-t border-brand-border">
            {replyTo && (
              <div className="mb-2">
                <ReplyPreview
                  compact
                  message={replyTo}
                  onCancel={() => setReplyTo(null)}
                  otherName={activeContact?.first_name}
                  userId={userId}
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={stagedCaption}
                onChange={(e) => setStagedCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!stagingUploading) sendStagedFiles()
                  }
                }}
                placeholder="Tambahkan keterangan..."
                className="flex-1 border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 placeholder:text-brand-muted resize-none overflow-y-auto max-h-28"
                disabled={stagingUploading}
              />
              <button
                type="button"
                onClick={sendStagedFiles}
                disabled={stagingUploading || stagedFiles.length === 0}
                aria-label="Kirim lampiran"
                className="shrink-0 w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {stagingUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            {stagingUploading && (
              <p className="text-[10px] text-brand-muted mt-2">Mengunggah & mengirim lampiran...</p>
            )}
          </div>
        </div>
      </>
    )}

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
              className="flex-1 bg-transparent text-[16px] md:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
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

    {showPropertyPicker && (
      <>
        <button type="button" aria-label="Tutup" onClick={() => setShowPropertyPicker(false)} className="fixed inset-0 bg-black/40 z-40 cursor-default p-0 border-0" />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-brand-text">Bagikan Properti</h2>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => { setShowPropertyPicker(false); setPropertySearch('') }}
              className="text-brand-muted hover:text-brand-text"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-bg border border-brand-border rounded-xl mb-4">
            <Search size={14} className="text-brand-muted shrink-0" />
            <input
              type="text"
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              placeholder="Cari properti..."
              className="flex-1 bg-transparent text-[16px] md:text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
            />
            {propertySearch && (
              <button type="button" aria-label="Bersihkan pencarian" onClick={() => setPropertySearch('')} className="text-brand-muted hover:text-brand-text">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {propertyResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  handleShareProperty(p)
                  setPropertySearch('')
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-bg transition-colors text-left"
              >
                {p.image_url ? (
                  <img src={getImageSrc(p.image_url)} alt={p.title} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-brand-bg flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-brand-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-text truncate">{p.title || 'Tanpa judul'}</p>
                  <p className="text-xs text-brand-muted truncate">{p.city || 'Indonesia'}</p>
                </div>
                <span className="text-xs font-bold text-brand-primary shrink-0">
                  {Number(p.price) > 0 ? formatPriceDisplay(p) : 'Harga Hubungi'}
                </span>
              </button>
            ))}
            {propertySearching ? (
              <div className="flex items-center justify-center gap-2 py-8 text-brand-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Mencari properti...</span>
              </div>
            ) : propertyResults.length === 0 ? (
              <p className="text-sm text-brand-muted text-center py-8">Tidak ada properti ditemukan.</p>
            ) : null}
          </div>
        </div>
      </>
    )}

    {selectedImage && (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fadeIn"
        onClick={() => setSelectedImage(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Pratinjau gambar"
      >
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            disabled={downloading}
            aria-label="Unduh gambar"
            title="Unduh gambar"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
            aria-label="Tutup"
            title="Tutup"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        <img
          src={selectedImage}
          alt="Lampiran"
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain p-4"
        />
      </div>
    )}

    {messageMenu && (() => {
      const canReact = activeContactId !== HUNIBOT_ID && !String(messageMenu.id).startsWith('temp-')
      const closeMenu = () => { setMessageMenu(null); setMessageMenuPos(null) }
      const actionCls = messageMenuPos
        ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-bg transition-colors text-[13px] font-semibold text-brand-text text-left'
        : 'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-bg transition-colors text-sm font-semibold text-brand-text text-left'
      const dangerCls = messageMenuPos
        ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-danger/10 transition-colors text-[13px] font-semibold text-brand-danger text-left'
        : 'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-danger/10 transition-colors text-sm font-semibold text-brand-danger text-left'
      const actions = (
        <div className={messageMenuPos ? 'pt-1' : 'space-y-1 px-2'}>
          <button type="button" onClick={() => { handleReply(messageMenu); closeMenu() }} className={actionCls}>
            <CornerUpLeft size={17} className="text-brand-accent shrink-0" /> Balas
          </button>
          {canReact && (
            <button type="button" onClick={() => { openReactionPicker(messageMenu, null, messageMenuPos); closeMenu() }} className={actionCls}>
              <Smile size={17} className="text-brand-accent shrink-0" /> Reaksi
            </button>
          )}
          <button type="button" onClick={() => { handleCopyMessage(messageMenu); closeMenu() }} className={actionCls}>
            <Copy size={17} className="text-brand-accent shrink-0" /> Salin Teks
          </button>
          <button type="button" onClick={() => { handleTogglePin(messageMenu); closeMenu() }} className={actionCls}>
            {messageMenuPinned ? <PinOff size={17} className="text-brand-accent shrink-0" /> : <Pin size={17} className="text-brand-accent shrink-0" />}
            {messageMenuPinned ? 'Lepas Sematan' : 'Sematkan'}
          </button>
          {messageMenu.sender_id === userId && (
            <button type="button" onClick={() => { handleToggleStar(messageMenu); closeMenu() }} className={actionCls}>
              <Star size={17} className={messageMenuStarred ? 'text-amber-500 fill-amber-500 shrink-0' : 'text-brand-accent shrink-0'} />
              {messageMenuStarred ? 'Lepas Bookmark' : 'Bookmark'}
            </button>
          )}
          {messageMenu.sender_id === userId && (
            <button type="button" onClick={() => { setDeleteTarget(messageMenu.id); closeMenu() }} className={dangerCls}>
              <Trash2 size={17} className="shrink-0" /> Hapus
            </button>
          )}
        </div>
      )
      return (
        <>
          <button type="button" aria-label="Tutup" onClick={closeMenu} className={messageMenuPos ? 'fixed inset-0 z-[70] cursor-default p-0 border-0' : 'fixed inset-0 bg-black/40 z-40 cursor-default p-0 border-0'} />
          {messageMenuPos ? (
            <div
              role="menu"
              className="fixed z-[75] w-60 max-w-[calc(100vw-16px)] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border border-brand-border bg-brand-surface shadow-2xl p-1.5 animate-fadeIn"
              style={{ top: messageMenuPos.top, left: messageMenuPos.left }}
            >
              {canReact && (
                <div className="flex items-center justify-between gap-0.5 px-1 pt-0.5 pb-1.5 mb-0.5 border-b border-brand-border">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleReaction(messageMenu.id, emoji); closeMenu() }}
                      aria-label={`Reaksi ${emoji}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-brand-accent/10 hover:scale-110 active:scale-95 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {actions}
            </div>
          ) : (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface rounded-t-3xl py-6 px-2 pb-10 max-h-[70vh] overflow-y-auto animate-slide-up">
              <div className="flex items-center justify-between px-4 mb-3">
                <h3 className="text-base font-bold text-brand-text">Opsi Pesan</h3>
                <button type="button" aria-label="Tutup" onClick={closeMenu} className="text-brand-muted hover:text-brand-text">
                  <X size={20} />
                </button>
              </div>
              {actions}
            </div>
          )}
        </>
      )
    })()}

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
    {reactionPickerMsg && (
      <ReactionPicker
        onPick={(emoji) => handleToggleReaction(reactionPickerMsg?.id, emoji)}
        onClose={() => setReactionPickerMsg(null)}
        style={reactionPickerPos}
      />
    )}
    {reactionsSummary && (() => {
      const summaryRoom = activeContactId ? [userId, activeContactId].sort().join('-') : null
      const liveReactions = summaryRoom && reactionsSummary.messageId && reactionsMap[summaryRoom]
        ? (reactionsMap[summaryRoom][reactionsSummary.messageId] || null)
        : null
      return (
        <ReactionSummary
          emoji={reactionsSummary.emoji}
          reactions={liveReactions || reactionsSummary.reactions}
          myId={userId}
          namesMap={messageNamesMap}
          onClose={() => setReactionsSummary(null)}
          onToggle={(toggleEmoji) => {
            if (toggleEmoji && summaryRoom && reactionsSummary.messageId) {
              handleToggleReaction(reactionsSummary.messageId, toggleEmoji)
            } else {
              setReactionsSummary(null)
            }
          }}
        />
      )
    })()}
    {dragging && activeContactId && activeContactId !== HUNIBOT_ID && (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-brand-primary/10 backdrop-blur-[1px] animate-fadeIn">
        <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border-2 border-dashed border-brand-accent bg-brand-surface/90 shadow-xl">
          <UploadCloud size={36} className="text-brand-accent" />
          <p className="text-sm font-semibold text-brand-text">Lepaskan untuk mengirim gambar</p>
          <p className="text-xs text-brand-muted">JPG, PNG, WEBP, AVIF — maks. 5MB</p>
        </div>
      </div>
    )}
    </>
  )
}
