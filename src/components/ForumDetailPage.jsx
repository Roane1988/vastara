import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'

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
    const { error } = await supabase.from('forum_replies').insert({
      post_id: id,
      author_id: session.user.id,
      content: replyContent.trim(),
    })
    if (!error) {
      setReplyContent('')
      fetchReplies()
    }
    setSubmitting(false)
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
        <button
          type="button"
          onClick={() => navigate('/forum')}
          className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 px-5 pt-5 pb-28 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5">
          <h1 className="text-xl font-bold text-brand-text">{post.title}</h1>
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
            <p className="text-sm text-brand-muted text-center py-6">Belum ada balasan.</p>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="bg-brand-surface rounded-xl border border-brand-border p-4">
                <div className="flex items-center gap-2 text-xs text-brand-muted mb-2">
                  <span className="font-medium text-brand-secondary">{reply.profiles?.first_name || 'Anonymous'}</span>
                  <span className="text-brand-border">&bull;</span>
                  <span>{new Date(reply.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-brand-text whitespace-pre-wrap">{reply.content}</p>
              </div>
            ))
          )}
        </div>

        {session?.user && (
          <form onSubmit={handleReply} className="flex gap-3">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t('forum.postContentPlaceholder')}
              className="flex-1 border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-brand-muted"
            />
            <button
              type="submit"
              disabled={submitting || !replyContent.trim()}
              className="shrink-0 w-12 h-12 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
