import { memo } from 'react'
import { ArrowLeft, Bot, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAvatarColor, getInitials } from '../../utils/avatar'
import { timeAgo } from '../../utils/time'
import { HUNIBOT_ID } from '../../hooks/chat/constants'

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

export default function ChatMessageThread({
  activeContact,
  activeContactId,
  userId,
  lang,
  isHunibotRoom,
  onBackToList,
  messages,
  loading,
  messagesError,
  onRetryMessages,
  otherTyping,
  isOnline,
  lastSeen,
  chatSearchOpen,
  setChatSearchOpen,
  chatSearchQ,
  setChatSearchQ,
  searchMatches,
  currentSearchIndex,
  setCurrentSearchIndex,
  onJumpToMessage,
  pinnedMessagesRoom,
  onTogglePin,
  onReply,
  onDelete,
  onImageClick,
  onFileOpen,
  onMoreClick,
  reactionsMapRoom,
  onReact,
  onOpenReactionPicker,
  onShowReactionSummary,
  starredMessagesRoom,
  isFlashed,
  onScroll,
  messagesContainerRef,
  messagesEndRef,
  isAtBottomRef,
  newMsgFAB,
  newMsgCount,
  onScrollToBottom,
  unreadDividerAt,
  contextProperty,
  showContextCard,
  setShowContextCard,
  renderMessageBubble,
}) {
  if (!activeContactId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-brand-muted">
        Pilih kontak untuk memulai obrolan
      </div>
    )
  }

  const isHunibot = activeContactId === HUNIBOT_ID
  const avatarColor = isHunibot ? '#7C3AED' : getAvatarColor(activeContactId)
  const initials = isHunibot ? '' : getInitials(activeContact?.first_name)

  return (
    <div className="flex-1 flex flex-col h-[calc(100dvh-56px)]">
      <div className="px-4 py-3 border-b border-brand-border flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToList}
          className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-brand-bg"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {isHunibot ? <Bot size={18} /> : initials || '?'}
          </div>
          {!isHunibot && (
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-brand-text truncate">{activeContact?.first_name || (isHunibot ? 'HuniBot' : 'User')}</p>
            {isHunibot && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gradient-to-r from-brand-primary to-[#7C3AED] text-white">AI</span>
            )}
          </div>
          <p className="text-xs text-brand-muted">
            {otherTyping ? (
              <span className="inline-flex items-center gap-1.5 text-brand-accent">
                <TypingDots color="var(--color-brand-accent)" /> mengetik...
              </span>
            ) : isHunibot ? (
              'Asisten properti AI'
            ) : isOnline ? (
              'Online'
            ) : lastSeen ? (
              `Terakhir aktif ${timeAgo(lastSeen, lang)}`
            ) : (
              'Offline'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setChatSearchOpen(v => !v)}
          className="p-1.5 rounded-full hover:bg-brand-bg"
        >
          <Search size={18} />
        </button>
      </div>

      {chatSearchOpen && (
        <div className="px-4 py-2 border-b border-brand-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={chatSearchQ}
              onChange={(e) => { setChatSearchQ(e.target.value); setCurrentSearchIndex(0) }}
              placeholder="Cari di chat ini..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
            />
          </div>
          <span className="text-xs text-brand-muted whitespace-nowrap">
            {searchMatches.length === 0 ? '0 hasil' : `${currentSearchIndex + 1}/${searchMatches.length}`}
          </span>
          <button type="button" onClick={() => setCurrentSearchIndex(i => Math.max(0, i - 1))} className="px-2 py-1 text-xs rounded-lg hover:bg-brand-bg">↑</button>
          <button type="button" onClick={() => setCurrentSearchIndex(i => Math.min(searchMatches.length - 1, i + 1))} className="px-2 py-1 text-xs rounded-lg hover:bg-brand-bg">↓</button>
          <button type="button" onClick={() => { setChatSearchOpen(false); setChatSearchQ(''); }} className="p-1 rounded-full hover:bg-brand-bg"><X size={16} /></button>
        </div>
      )}

      {contextProperty && showContextCard && (
        <div className="px-4 py-2 border-b border-brand-border">
          <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface p-2">
            {contextProperty.image_url && (
              <img src={contextProperty.image_url?.startsWith('[') ? JSON.parse(contextProperty.image_url)[0] : contextProperty.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-text truncate">{contextProperty.title}</p>
              <p className="text-[10px] text-brand-muted truncate">{contextProperty.city}</p>
            </div>
            <Link to={`/property/${contextProperty.id}`} className="text-xs font-semibold text-brand-accent">Lihat Properti</Link>
            <button type="button" onClick={() => setShowContextCard(false)} className="p-1 rounded-full hover:bg-brand-bg"><X size={14} /></button>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-0 py-2"
      >
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && messagesError && (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <p className="text-sm text-brand-muted mb-2">{messagesError}</p>
              <button type="button" onClick={onRetryMessages} className="text-sm font-semibold text-brand-accent">Coba lagi</button>
            </div>
          </div>
        )}
        {!loading && !messagesError && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-brand-muted">
            Belum ada pesan
          </div>
        )}
        {!loading && messages.map((m, idx) => {
          const isOwn = m.sender_id === userId
          const firstInGroup = idx === 0 || messages[idx - 1].sender_id !== m.sender_id
          const lastInGroup = idx === messages.length - 1 || messages[idx + 1].sender_id !== m.sender_id
          const repliedMessage = m.reply_to_id ? messages.find(x => x.id === m.reply_to_id) : null
          const reactions = reactionsMapRoom?.[m.id] || []
          const isStarred = !!starredMessagesRoom?.[m.id]
          const bubble = typeof renderMessageBubble === 'function' ? renderMessageBubble({
            message: m,
            isOwn,
            onDelete: () => { if (typeof onDelete === 'function') onDelete(m.id) },
            onReply: () => { if (typeof onReply === 'function') onReply(m) },
            lang,
            firstInGroup,
            lastInGroup,
            otherName: activeContact?.first_name,
            otherColor: avatarColor,
            repliedMessage,
            highlight: chatSearchQ,
            onImageClick: (msg, url) => { if (typeof onImageClick === 'function') onImageClick(msg, url) },
            isSearchActive: false,
            onMoreClick: (msg, e) => { if (typeof onMoreClick === 'function') onMoreClick(msg, e) },
            isFlashed: typeof isFlashed === 'function' ? isFlashed(m.id) : false,
            reactions,
            myId: userId,
            onReact,
            onJumpToMessage,
            onShowSummary: onShowReactionSummary,
            isStarred,
            onOpenReactionPicker,
            onFileOpen: () => { if (typeof onFileOpen === 'function') onFileOpen(m) },
          }) : null
          return (
            <div key={m.id}>
              {bubble}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {newMsgFAB && (
        <button
          type="button"
          onClick={onScrollToBottom}
          className="absolute bottom-20 right-4 px-3 py-1.5 rounded-full bg-brand-surface border border-brand-border shadow-lg text-xs font-semibold flex items-center gap-1.5"
        >
          {newMsgCount > 0 ? `${newMsgCount} pesan baru` : 'Pesan baru'} ↓
        </button>
      )}
    </div>
  )
}
