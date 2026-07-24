import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Send, MessageCircle, Trash2, X } from 'lucide-react'

export default function ForumDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const replyInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    fetchPost()
    fetchReplies()
  }, [id])

  async function fetchPost() {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, profiles(first_name)')
      .eq('id', id)
      .single()
    if (data) setPost(data)
    setLoading(false)
  }

  async function fetchReplies() {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, profiles(first_name)')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
    if (data) setReplies(data)
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!replyContent.trim() || !session?.user) return
    setSubmitting(true)

    let content = replyContent.trim()
    if (replyingTo) {
      content = `> *Membalas ${replyingTo.authorName}:* "${replyingTo.content.length > 80 ? replyingTo.content.slice(0, 80) + '...' : replyingTo.content}"\n\n${content}`
    }

    const { error } = await supabase.from('forum_replies').insert({
      post_id: id,
      author_id: session.user.id,
      content,
    })
    if (!error) {
      setReplyContent('')
      setReplyingTo(null)
      fetchReplies()
    }
    setSubmitting(false)
  }

  async function handleDeletePost() {
    if (!window.confirm('Apakah Anda yakin ingin menghapus diskusi ini?')) return
    const { error } = await supabase.from('forum_posts').delete().eq('id', id)
    if (error) {
      alert(error.message)
    } else {
      navigate('/forum')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6">
        <MessageCircle size={48} className="text-brand-muted/40" />
        <p className="text-sm text-brand-muted mt-4">{t('forum.noPosts')}</p>
        <button
          type="button"
          onClick={() => navigate('/forum')}
          className="mt-6 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 transition-all"
        >
          {t('forum.backToForum')}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/forum')}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          {session?.user?.id === post.author_id && (
            <button
              type="button"
              onClick={handleDeletePost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              title="Hapus diskusi"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-28 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-secondary p-5">
          <h1 className="text-xl font-bold text-brand-text leading-snug">{post.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-xs text-brand-muted">
            <span className="font-medium text-brand-secondary">{post.profiles?.first_name || 'Anonymous'}</span>
            <span className="text-brand-border">&bull;</span>
            <span>{new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <p className="text-sm text-brand-text mt-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-brand-text">{replies.length} {t('forum.reply')}</h2>
          {replies.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={24} className="mx-auto text-brand-muted/30" />
              <p className="text-sm text-brand-muted mt-3">Belum ada balasan.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {replies.map((reply) => (
                <div key={reply.id} className="bg-brand-surface rounded-xl shadow-sm border border-brand-border p-4 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-xs text-brand-muted mb-2">
                    <span className="font-medium text-brand-secondary">{reply.profiles?.first_name || 'Anonymous'}</span>
                    <span className="text-brand-border">&bull;</span>
                    <span>{new Date(reply.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{reply.content}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo({ id: reply.id, authorName: reply.profiles?.first_name || 'Anonymous', content: reply.content })
                      replyInputRef.current?.focus()
                    }}
                    className="mt-2 text-xs font-medium text-brand-secondary hover:text-brand-primary transition-colors"
                  >
                    Balas
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {session?.user && (
          <form onSubmit={handleReply} className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-secondary p-4">
            {replyingTo && (
              <div className="flex items-start gap-3 mb-3 pl-3 border-l-4 border-brand-primary bg-brand-bg/50 rounded-r-lg py-2 px-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-primary">{replyingTo.authorName}</p>
                  <p className="text-xs text-brand-muted truncate">{replyingTo.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <textarea
              ref={replyInputRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={replyingTo ? `Balas ${replyingTo.authorName}...` : t('forum.postContentPlaceholder')}
              rows={2}
              className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-brand-muted resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !replyContent.trim()}
              className="mt-2 w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-bold flex items-center justify-center gap-2 hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {replyingTo ? 'Kirim Balasan' : t('forum.reply')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
