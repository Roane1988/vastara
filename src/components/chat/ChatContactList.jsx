import { memo } from 'react'
import { Bot, Search, Star } from 'lucide-react'
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

export default function ChatContactList({
  visibleContacts,
  activeContactId,
  onSelectContact,
  lang,
  searchQuery,
  setSearchQuery,
  contactFilter,
  setContactFilter,
  unreadMap,
  otherTypingContacts,
  onlineIds,
  lastSeenMap,
  starCountFor,
  loading,
  error,
  onRetry,
  markAllLoading,
  onMarkAllRead,
}) {
  const unreadCountTotal = Object.values(unreadMap || {}).reduce((a, b) => a + (b || 0), 0)

  return (
    <div className={`w-full md:w-80 lg:w-96 border-r border-brand-border flex flex-col h-[calc(100dvh-56px)] ${activeContactId ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-4 border-b border-brand-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-brand-text">Pesan</h2>
          <div className="flex items-center gap-2">
            {unreadCountTotal > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={markAllLoading}
                className="text-xs font-semibold text-brand-accent hover:text-brand-primary disabled:opacity-50"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kontak..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent"
          />
        </div>
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'unread', label: 'Belum dibaca' },
            { key: 'agent', label: 'Agen' },
            { key: 'owner', label: 'Pemilik' },
            { key: 'bookmark', label: 'Bookmark' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setContactFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                contactFilter === f.key
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-bg text-brand-muted hover:text-brand-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <ContactListSkeleton />}
        {!loading && error && (
          <div className="p-4 text-center">
            <p className="text-sm text-brand-muted mb-2">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-semibold text-brand-accent hover:text-brand-primary"
            >
              Coba lagi
            </button>
          </div>
        )}
        {!loading && !error && visibleContacts.length === 0 && (
          <div className="p-6 text-center text-sm text-brand-muted">
            Tidak ada kontak ditemukan
          </div>
        )}
        {!loading && !error && visibleContacts.map((c) => (
          <ContactItem
            key={c.id}
            contact={c}
            isActive={activeContactId === c.id}
            onClick={onSelectContact}
            lang={lang}
            isTyping={!!otherTypingContacts[c.id]}
            unread={unreadMap[c.id] || 0}
            isOnline={!!onlineIds[c.id]}
            lastSeen={lastSeenMap[c.id]}
            bookmarkCount={starCountFor ? starCountFor(c) : 0}
          />
        ))}
      </div>
    </div>
  )
}
