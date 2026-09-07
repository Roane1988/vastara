import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { getImageSrc } from '../utils/images'
import { formatPriceDisplay } from '../utils/format'
import { Send, ArrowLeft, MessageCircle, Search, Trash2, Plus, X, Loader2, ImagePlus, Building2, CornerUpLeft, ChevronDown, ChevronUp, Paperclip, Pin, PinOff, Download, MoreHorizontal, Copy, CheckCheck, Bot, Star, Volume2, UploadCloud, AlertTriangle, RefreshCw, Bell, FileText, FileSpreadsheet, FileArchive, File } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import HuniBotRoom from './HuniBotRoom'
import { compressImage } from '../utils/imageCompression'

const HUNIBOT_ID = 'hunibot'

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

function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <span className="text-[10px] font-semibold text-brand-muted bg-brand-surface border border-brand-border rounded-full px-3 py-1">
        {date}
      </span>
    </div>
  )
}

function TypingDots({ color }) {
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
}

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
    return (
      <span className={`flex items-center gap-1.5 min-w-0 ${className || ''}`}>
        <FileText size={12} className="shrink-0 text-brand-accent" />
        <span className="min-w-0 truncate">{message.file_name || 'Dokumen'}</span>
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
  const re = /(\bhttps?:\/\/[^\s<]+)|(\b0\d{8,12}\b|\b62\d{8,13}\b)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) })
    if (m[1]) {
      tokens.push({ type: 'link', value: m[1].replace(/[.,;:!?\])]+$/g, '') })
    } else if (m[2]) {
      tokens.push({ type: 'phone', value: m[2] })
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
    if (t.type === 'link') {
      return (
        <a
          key={i}
          href={t.value}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium break-all hover:opacity-80"
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
          className="underline underline-offset-2 font-medium hover:opacity-80"
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

function MessageBubble({ message, isOwn, onDelete, onReply, lang, firstInGroup, lastInGroup, otherName, otherColor, repliedMessage, highlight, onPin, isPinned, onImageClick, isSearchActive, onMoreClick, onCopy, isFlashed, reactions, myId, onReact, onJumpToMessage, onShowSummary, onToggleStar, isStarred, onOpenReactionPicker, onFileOpen }) {
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
      <div className="relative w-full max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] xl:max-w-[70%] overflow-hidden group/message">
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm min-w-0 max-w-full overflow-hidden ${
            isOwn
              ? 'bg-gradient-to-br from-brand-primary to-[#2f6690] text-white rounded-br-md'
              : 'bg-white border border-brand-border text-brand-text rounded-bl-md'
          } ${isFlashed ? 'ring-2 ring-brand-accent' : ''} ${isSearchActive ? 'ring-2 ring-amber-400' : ''}`}>
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
            {message.property_id && <PropertyMessage propertyId={message.property_id} />}
            {message.image_url && (
              <img
                src={message.image_url}
                alt="Lampiran"
                onClick={() => onImageClick?.(message.image_url)}
                className="mt-1 w-full h-auto max-h-72 object-cover rounded-xl cursor-pointer"
              />
            )}
            {message.file_url && (
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
            {renderReactionsRow(reactions, myId, onReact, onShowSummary)}
            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 ${isOwn ? 'text-white/70' : 'text-brand-muted'}`}>
              <span>{timeAgo(message.created_at, lang)}</span>
              {isOwn && (
                <span className="font-bold tracking-tighter">
                  {message.read_at ? '✓✓' : '✓'}
                </span>
              )}
              <button
                type="button"
                onClick={() => onMoreClick?.(message)}
                aria-label="Opsi pesan"
                title="Opsi pesan"
                className="lg:hidden -m-1 p-1.5 rounded-full text-inherit opacity-70 hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
            {onOpenReactionPicker && (
              <button
                type="button"
                onMouseEnter={(e) => onOpenReactionPicker?.(message, e)}
                onClick={(e) => onOpenReactionPicker?.(message, e)}
                aria-label="Beri reaksi"
                title="Beri reaksi"
                className="absolute bottom-2 right-2 hidden group-hover/message:flex w-6 h-6 rounded-full bg-white border border-brand-border shadow text-sm items-center justify-center hover:scale-110 transition-transform"
              >
                😊
              </button>
            )}
          </div>
          <div className={`mt-1 hidden lg:flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <button
              type="button"
              onClick={() => onReply?.(message)}
              aria-label="Balas pesan"
              className="inline-flex items-center gap-0.5 text-[10px] text-brand-muted hover:text-brand-accent transition-colors px-1"
            >
              <CornerUpLeft size={11} /> Balas
            </button>
            <button
              type="button"
              onClick={() => onCopy?.(message)}
              aria-label="Salin pesan"
              title="Salin pesan"
              className="inline-flex items-center gap-0.5 text-[10px] text-brand-muted hover:text-brand-accent transition-colors px-1"
            >
              <Copy size={11} /> Salin
            </button>
            <button
              type="button"
              onClick={() => onPin?.(message)}
              aria-label={isPinned ? 'Lepas sematan' : 'Sematkan pesan'}
              title={isPinned ? 'Lepas sematan' : 'Sematkan'}
              className={`inline-flex items-center gap-0.5 text-[10px] transition-colors px-1 ${isPinned ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-accent'}`}
            >
              {isPinned ? <PinOff size={11} /> : <Pin size={11} />} {isPinned ? 'Disematkan' : 'Sematkan'}
            </button>
            <button
              type="button"
              onClick={() => onToggleStar?.(message)}
              aria-label={isStarred ? 'Lepas bookmark' : 'Bookmark pesan'}
              title={isStarred ? 'Lepas bookmark' : 'Bookmark'}
              className={`inline-flex items-center gap-0.5 text-[10px] transition-colors px-1 ${isStarred ? 'text-amber-500' : 'text-brand-muted hover:text-amber-500'}`}
            >
              <Star size={11} className={isStarred ? 'fill-amber-400' : ''} /> {isStarred ? 'Terbookmark' : 'Bookmark'}
            </button>
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
}

function ContactItem({ contact, isActive, onClick, lang, isTyping, unread, isOnline, lastSeen, bookmarkCount }) {
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
  return Object.entries(map)
}

function renderReactionsRow(reactions, myId, onReact, onShowSummary) {
  const agg = aggregateReactions(reactions, myId)
  if (agg.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {agg.map(([emoji, info]) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => { e.stopPropagation(); onShowSummary ? onShowSummary(emoji, reactions) : onReact?.(emoji) }}
          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors ${
            info.mine ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/70 border-brand-border text-brand-text'
          }`}
        >
          <span>{emoji}</span>
          <span className="font-semibold">{info.count}</span>
        </button>
      ))}
    </div>
  )
}

function ReactionPicker({ onPick, onClose, style }) {
  const pickerRef = useRef(null)
  useEffect(() => {
    if (!style) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    const onDown = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
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
          onClick={() => onPick?.(emoji)}
          aria-label={`Reaksi ${emoji}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-brand-accent/10 hover:scale-110 active:scale-95 transition-all"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

function ReactionSummary({ emoji, reactions, myId, namesMap, onClose }) {
  const users = (reactions || []).filter((r) => r.emoji === emoji)
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
            <span className="text-xl">{emoji}</span> Reaksi
          </h3>
          <button type="button" aria-label="Tutup" onClick={onClose} className="text-brand-muted hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
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
                <span className="text-lg">{emoji}</span>
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
  useEffect(() => () => { sendMountedRef.current = false }, [])
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
  const [fileUploading, setFileUploading] = useState(false)
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
  const [chatSearchQ, setChatSearchQ] = useState('')
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [flashMessageId, setFlashMessageId] = useState(null)
  const flashTimeoutRef = useRef(null)
  const [messageMenu, setMessageMenu] = useState(null)
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

  const searchMatches = chatSearchQ.trim() && activeContactId
    ? messages.filter((m) => m.content && m.content.toLowerCase().includes(chatSearchQ.trim().toLowerCase()))
    : []

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


  const starCountFor = (c) => {
    if (c.id === HUNIBOT_ID) return 0
    return Object.keys(starredMessages[[userId, c.id].sort().join('-')] || {}).length
  }

  const filteredContacts = contacts.filter((c) => {
    const nameMatches = !searchQuery.trim() || (c.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (!nameMatches) return false
    if (contactFilter === 'all') return true
    if (contactFilter === 'unread') return (unreadMap[c.id] || 0) > 0
    if (contactFilter === 'agent') return ['agent', 'developer', 'admin'].includes(c.role)
    if (contactFilter === 'owner') return c.role === 'owner'
    if (contactFilter === 'bookmark') return starCountFor(c) > 0
    return true
  })

  const hunibotVisible =
    contactFilter === 'all' ||
    (contactFilter === 'agent') ||
    (!searchQuery.trim() || 'hunibot'.includes(searchQuery.toLowerCase()) || 'AI'.toLowerCase().includes(searchQuery.toLowerCase()))

  const visibleContacts = hunibotVisible ? [HUNIBOT_CONTACT, ...filteredContacts] : filteredContacts

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
          if (m.receiver_id === userId && !m.read_at) {
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
  useEffect(() => {
    if (!openUserId || didAutoSelectRef.current) return
    if (openUserId === HUNIBOT_ID) {
      didAutoSelectRef.current = true
      handleSelectContact(HUNIBOT_ID)
      setSearchParams({}, { replace: true })
      return
    }
    const found = contacts.some((c) => c.id === openUserId)
    if (found) {
      didAutoSelectRef.current = true
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
      setContacts((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev
        return [{ ...data, last_message: null, last_message_at: null }, ...prev]
      })
      handleSelectContact(data.id)
      setSearchParams({}, { replace: true })
    })()
    return () => { cancelled = true }
  }, [openUserId, contacts, setSearchParams])

  useEffect(() => {
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
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', messageIds)
      if (error || !data || data.length === 0) return
      const map = {}
      data.forEach((r) => {
        if (!map[r.message_id]) map[r.message_id] = []
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
      if (!error) {
        setUnreadMap((prev) => ({ ...prev, [activeContactId]: 0 }))
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
    if (!userId) return
    const presenceChannel = supabase.channel('app-online')
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const users = Object.values(presenceChannel.presenceState() || {})
          .flat()
          .map((p) => p.userId)
          .filter(Boolean)
        setOnlineIds(() => {
          const next = {}
          users.forEach((id) => { next[id] = true })
          return next
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannel.track({ userId, online_at: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(presenceChannel) }
  }, [userId])

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
        if (status === 'SUBSCRIBED') ch.track({ userId })
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
            supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {}).catch(() => {})
            setUnreadMap(prev => ({ ...prev, [otherId]: 0 }))
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
            if (!roomMap || !roomMap[r.message_id]) return prev
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
            if (!roomMap || !roomMap[old.message_id]) return prev
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

  function handleSelectContact(contactId) {
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
    setShareProperty(null)
    setReactionPickerMsg(null)
    setReactionsSummary(null)
  }

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
      if (!error) {
        setUnreadMap({})
        setNewMsgCount(0)
        setNewMsgFAB(false)
        if (activeContactId) setUnreadMap(prev => ({ ...prev, [activeContactId]: 0 }))
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
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(jpeg|png|webp|avif)$/i.test(file.type)) {
      showToast('Hanya file gambar (JPG, PNG, WEBP, AVIF) yang diperbolehkan.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB per gambar.', 'error')
      return
    }
    if (pendingImageUrlRef.current) URL.revokeObjectURL(pendingImageUrlRef.current)
    const url = URL.createObjectURL(file)
    pendingImageUrlRef.current = url
    setPendingImage(file)
    setPendingImageUrl(url)
    setCaption('')
    setImagePreviewOpen(true)
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

  function handleReply(message) {
    setReplyTo(message)
    setPlusMenuOpen(false)
    inputRef.current?.focus()
  }

  function handleJumpToMessage(messageId) {
    const el = document.getElementById(`message-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashMessageId(messageId)
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = setTimeout(() => setFlashMessageId(null), 2000)
    } else {
      showToast('Pesan asli tidak ditemukan.', 'info')
    }
  }

  async function handleTogglePin(message) {
    if (!userId || !activeContactId) return
    const room = [userId, activeContactId].sort().join('-')
    const isPinned = !!pinnedMessages[room]?.[message.id]
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
  }

  function handleToggleReaction(messageId, emoji) {
    if (!userId) return
    const targetId = activeContactIdRef.current
    const room = targetId ? [userId, targetId].sort().join('-') : null
    const existing = room && (reactionsMap[room]?.[messageId] || []).find((r) => r.user_id === userId && r.emoji === emoji)
    if (existing) {
      setReactionsMap((prev) => {
        if (!room) return prev
        const roomMap = { ...(prev[room] || {}) }
        roomMap[messageId] = (roomMap[messageId] || []).filter((r) => !(r.user_id === userId && r.emoji === emoji))
        return { ...prev, [room]: roomMap }
      })
      supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji).then(() => {}).catch(() => {})
    } else {
      setReactionsMap((prev) => {
        if (!room) return prev
        const roomMap = { ...(prev[room] || {}) }
        const list = [...(roomMap[messageId] || [])]
        if (!list.some((r) => r.user_id === userId && r.emoji === emoji)) list.push({ id: null, user_id: userId, emoji })
        roomMap[messageId] = list
        return { ...prev, [room]: roomMap }
      })
      supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji }).then(() => {}).catch(() => {})
    }
    setReactionPickerMsg(null)
  }

  function handleShowReactionSummary(emoji, reactions) {
    const userIds = (reactions || []).filter((r) => r.emoji === emoji).map((r) => r.user_id)
    const ids = userIds.filter((id) => id && id !== userId && !messageNamesMap[id])
    setReactionsSummary({ emoji, reactions })
    if (ids.length === 0) return
    supabase.from('profiles').select('id, first_name').in('id', ids).then(({ data, error }) => {
      if (error || !data) return
      const map = {}
      data.forEach((p) => { map[p.id] = p.first_name || 'User' })
      setMessageNamesMap((prev) => ({ ...prev, ...map }))
    }).catch(() => {})
  }

  function handleToggleStar(msg) {
    if (!userId || !activeContactId || msg.sender_id !== userId) return
    const room = [userId, activeContactId].sort().join('-')
    if (starredMessages[room]?.[msg.id]) {
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
  }

  function openReactionPicker(msg, e) {
    if (!userId || !activeContactId || activeContactId === HUNIBOT_ID) return
    const PICKER_W = 216
    const PICKER_H = 46
    const vw = window.innerWidth || document.documentElement.clientWidth || 1024
    const vh = window.innerHeight || document.documentElement.clientHeight || 768
    const btn = e?.currentTarget
    const rect = btn && typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null
    const isValid = rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.left >= 0 && rect.top >= 0 && rect.left <= vw && rect.top <= vh
    if (vw < 768) {
      const safeTop = window.visualViewport?.offsetTop || 0
      setReactionPickerPos({
        top: Math.max(8, vh - PICKER_H - 28 - safeTop),
        left: Math.max(8, Math.floor((vw - PICKER_W) / 2)),
      })
    } else if (isValid) {
      setReactionPickerPos({
        top: Math.max(8, rect.top - PICKER_H - 10),
        left: Math.max(8, Math.min(rect.left - 20, vw - PICKER_W - 8)),
      })
    } else {
      setReactionPickerPos({
        top: Math.max(8, Math.floor((vh - PICKER_H) / 2)),
        left: Math.max(8, Math.floor((vw - PICKER_W) / 2)),
      })
    }
    setReactionPickerMsg(msg)
  }

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
    if (!activeContactId || activeContactId === HUNIBOT_ID) return
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (!/^image\/(jpeg|png|webp|avif)$/i.test(file.type)) {
      showToast('Hanya file gambar (JPG, PNG, WEBP, AVIF) yang diperbolehkan.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB per gambar.', 'error')
      return
    }
    if (pendingImageUrlRef.current) URL.revokeObjectURL(pendingImageUrlRef.current)
    const url = URL.createObjectURL(file)
    pendingImageUrlRef.current = url
    setPendingImage(file)
    setPendingImageUrl(url)
    setCaption('')
    setImagePreviewOpen(true)
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

  async function handleCopyMessage(msg) {
    const text = msg.content || (msg.file_url ? (msg.file_name || 'Dokumen') : '')
    if (!text) {
      showToast('Tidak ada teks untuk disalin', 'info')
      return
    }
    const copyText = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    try {
      await navigator.clipboard.writeText(msg.content)
      showToast('Pesan disalin ke clipboard', 'success')
    } catch {
      try {
        copyText()
        showToast('Pesan disalin ke clipboard', 'success')
      } catch {
        showToast('Gagal menyalin pesan', 'error')
      }
    }
  }

  async function handleSend(e) {
    e?.preventDefault()
    if (activeContactId === HUNIBOT_ID) return
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

  async function handlePickDocument(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ]
    if (!allowed.includes(file.type)) {
      showToast('Format dokumen tidak didukung (PDF, DOC, XLS, PPT, TXT, CSV).', 'error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('Ukuran file maksimal 20MB per dokumen.', 'error')
      return
    }
    await sendFileMessage(file)
  }

  async function sendFileMessage(file) {
    if (activeContactId === HUNIBOT_ID) return
    if (!userId || !activeContactId || sending || imageUploading || fileUploading) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingChannelRef.current?.untrack()

    setFileUploading(true)
    let uploaded
    try {
      uploaded = await uploadChatFile(file)
    } catch (err) {
      if (sendMountedRef.current) {
        showToast('Gagal mengunggah file: ' + (err.message || 'coba lagi'), 'error')
      }
      setFileUploading(false)
      return
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: activeContactId,
      content: '',
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_id: replyTo?.id || null,
      image_url: null,
      property_id: null,
      file_url: uploaded.url,
      file_name: uploaded.name,
      file_size: uploaded.size,
      file_type: uploaded.type,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setReplyTo(null)
    inputRef.current?.focus()
    setUnreadDividerAt(null)
    unreadDividerContactRef.current = activeContactId

    try {
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: userId,
        receiver_id: activeContactId,
        content: '',
        reply_to_id: optimisticMsg.reply_to_id,
        file_url: optimisticMsg.file_url,
        file_name: optimisticMsg.file_name,
        file_size: optimisticMsg.file_size,
        file_type: optimisticMsg.file_type,
      }).select()

      if (!sendMountedRef.current) return

      if (error) {
        showToast(error.message, 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      } else if (data?.[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m))
      }
    } catch (err) {
      if (sendMountedRef.current) {
        showToast(err.message || 'Gagal mengirim file', 'error')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      }
    } finally {
      if (sendMountedRef.current) {
        setFileUploading(false)
      }
    }
  }

  function handleOpenFile(message) {
    if (!message?.file_url) return
    window.open(message.file_url, '_blank', 'noopener,noreferrer')
  }

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

  return (
    <>
    <div className="h-[calc(100dvh-56px)] overflow-hidden bg-brand-bg flex flex-col relative">
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

          <div className="flex-1 overflow-y-auto">
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
              {contextProperty && showContextCard && (
                <div className="shrink-0 px-4 py-3 border-b border-brand-border bg-brand-bg/60">
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
              <div className="relative flex-1 min-h-0">
              <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="h-full overflow-y-auto py-2">
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
                      const repliedMessage = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null
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
                              onMoreClick={setMessageMenu}
                              onCopy={handleCopyMessage}
                              isFlashed={msg.id === flashMessageId}
                              reactions={reactionsMap[[userId, activeContactId].sort().join('-')]?.[msg.id] || []}
                              myId={userId}
                              onReact={handleToggleReaction}
                              onJumpToMessage={handleJumpToMessage}
                              isStarred={!!starredMessages[[userId, activeContactId].sort().join('-')]?.[msg.id]}
                              onToggleStar={() => handleToggleStar(msg)}
                              onShowSummary={handleShowReactionSummary}
                              onOpenReactionPicker={openReactionPicker}
                              onFileOpen={handleOpenFile}
                            />
                          )}
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
                      className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
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

              {replyTo && (
                <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} otherName={activeContact.first_name} userId={userId} />
              )}

              {/* Input Bar */}
              <form
                onSubmit={handleSend}
                className="shrink-0 flex items-end gap-2 px-4 pt-3 pb-[env(safe-area-inset-bottom)] border-t border-brand-border bg-brand-surface"
              >
                <div ref={plusMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlusMenuOpen(v => !v)}
                    aria-label="Lampiran"
                    title="Lampiran"
                    className="w-10 h-10 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-accent flex items-center justify-center"
                  >
                    <Paperclip size={17} />
                  </button>
                  {plusMenuOpen && (
                    <div className="absolute bottom-12 left-0 z-30 w-48 rounded-xl bg-brand-surface border border-brand-border shadow-lg p-1.5 animate-fadeIn">
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
                  )}                  <textarea
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
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted resize-none overflow-y-auto leading-snug"
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || imageUploading || fileUploading || (!inputValue.trim() && !pendingImage && !shareProperty)}
                  className="shrink-0 w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Kirim pesan"
                >
                  {sending || imageUploading || fileUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickImage} />
                <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" hidden onChange={handlePickDocument} />
              </form>
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
              className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none"
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

    {messageMenu && (
      <>
        <button type="button" aria-label="Tutup" onClick={() => setMessageMenu(null)} className="fixed inset-0 bg-black/40 z-40 cursor-default p-0 border-0" />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface rounded-t-3xl py-6 px-2 pb-10 max-h-[70vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-base font-bold text-brand-text">Opsi Pesan</h3>
            <button type="button" aria-label="Tutup" onClick={() => setMessageMenu(null)} className="text-brand-muted hover:text-brand-text">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-1 px-2">
            <button
              type="button"
              onClick={() => { handleReply(messageMenu); setMessageMenu(null) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-bg transition-colors text-sm font-semibold text-brand-text text-left"
            >
              <CornerUpLeft size={17} className="text-brand-accent shrink-0" /> Balas
            </button>
            <button
              type="button"
              onClick={() => { handleCopyMessage(messageMenu); setMessageMenu(null) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-bg transition-colors text-sm font-semibold text-brand-text text-left"
            >
              <Copy size={17} className="text-brand-accent shrink-0" /> Salin Teks
            </button>
            <button
              type="button"
              onClick={() => { handleTogglePin(messageMenu); setMessageMenu(null) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-bg transition-colors text-sm font-semibold text-brand-text text-left"
            >
              {messageMenuPinned ? <PinOff size={17} className="text-brand-accent shrink-0" /> : <Pin size={17} className="text-brand-accent shrink-0" />}
              {messageMenuPinned ? 'Lepas Sematan' : 'Sematkan'}
            </button>
            {messageMenu.sender_id === userId && (
              <button
                type="button"
                onClick={() => { handleToggleStar(messageMenu); setMessageMenu(null) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-bg transition-colors text-sm font-semibold text-brand-text text-left"
              >
                <Star size={17} className={messageMenuStarred ? 'text-amber-500 fill-amber-500 shrink-0' : 'text-brand-accent shrink-0'} />
                {messageMenuStarred ? 'Lepas Bookmark' : 'Bookmark'}
              </button>
            )}
            {messageMenu.sender_id === userId && (
              <button
                type="button"
                onClick={() => { setDeleteTarget(messageMenu.id); setMessageMenu(null) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-brand-danger/10 transition-colors text-sm font-semibold text-brand-danger text-left"
              >
                <Trash2 size={17} className="shrink-0" /> Hapus
              </button>
            )}
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
    {reactionPickerMsg && (
      <ReactionPicker
        onPick={handleToggleReaction}
        onClose={() => setReactionPickerMsg(null)}
        style={reactionPickerPos}
      />
    )}
    {reactionsSummary && (
      <ReactionSummary
        emoji={reactionsSummary.emoji}
        reactions={reactionsSummary.reactions}
        myId={userId}
        namesMap={messageNamesMap}
        onClose={() => setReactionsSummary(null)}
      />
    )}
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
