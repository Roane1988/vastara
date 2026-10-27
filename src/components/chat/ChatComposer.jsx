import { useRef } from 'react'
import { Send, ImagePlus, Paperclip, Smile } from 'lucide-react'
import HuniBotRoom from '../HuniBotRoom'

export default function ChatComposer({
  activeContactId,
  isHunibotRoom,
  inputValue,
  setDraft,
  onSend,
  sending,
  onTyping,
  onOpenImagePicker,
  onOpenDocumentPicker,
  replyTo,
  onCancelReply,
  ReplyPreviewComponent,
  otherName,
  userId,
}) {
  const inputRef = useRef(null)

  if (isHunibotRoom) {
    return <HuniBotRoom />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputValue.trim() || sending) return
    onSend?.(inputValue.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!inputValue.trim() || sending) return
      onSend?.(inputValue.trim())
    }
  }

  const handleChange = (e) => {
    setDraft?.(activeContactId, e.target.value)
    onTyping?.()
  }

  return (
    <div className="border-t border-brand-border">
      {replyTo && ReplyPreviewComponent && (
        <ReplyPreviewComponent message={replyTo} onCancel={onCancelReply} otherName={otherName} userId={userId} compact />
      )}
      <form onSubmit={handleSubmit} className="px-3 py-2 flex items-end gap-2">
        <button
          type="button"
          onClick={onOpenImagePicker}
          className="p-2 rounded-full hover:bg-brand-bg"
          title="Kirim gambar"
        >
          <ImagePlus size={18} />
        </button>
        <button
          type="button"
          onClick={onOpenDocumentPicker}
          className="p-2 rounded-full hover:bg-brand-bg"
          title="Kirim dokumen"
        >
          <Paperclip size={18} />
        </button>
        <div className="flex-1 flex items-center bg-brand-bg rounded-2xl px-3 py-1.5">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          placeholder="Ketik pesan..."
          rows={1}
          className="flex-1 bg-transparent resize-none text-sm focus:outline-none max-h-32"
          style={{ height: 'auto' }}
          />
          <button type="button" className="p-1.5 rounded-full hover:bg-brand-border/40">
            <Smile size={18} />
          </button>
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || sending}
          className="w-9 h-9 rounded-full bg-brand-accent text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
