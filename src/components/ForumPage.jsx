import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { MessageCircle, ArrowLeft, Send } from 'lucide-react'

export default function ForumPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, profiles(first_name)')
      .order('created_at', { ascending: false })
    if (!error && data) setPosts(data)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (!session?.user) {
      alert('Anda harus login terlebih dahulu untuk membuat diskusi.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('forum_posts').insert({
        author_id: session.user.id,
        title: title.trim(),
        content: content.trim(),
      })
      if (error) {
        alert(error.message)
      } else {
        setTitle('')
        setContent('')
        fetchPosts()
      }
    } catch (err) {
      alert(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-brand-text">{t('forum.title')}</h1>
            <p className="text-xs text-brand-muted">{t('forum.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-24 space-y-6 max-w-2xl mx-auto w-full">
        {session?.user && (
          <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 space-y-4">
            <h2 className="text-sm font-bold text-brand-text">{t('forum.createPost')}</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('forum.postTitlePlaceholder')}
              className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-brand-muted"
            />
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('forum.postContentPlaceholder')}
              className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors placeholder:text-brand-muted resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {submitting ? '...' : t('forum.submit')}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={40} className="mx-auto text-brand-muted/40" />
            <p className="text-sm text-brand-muted mt-4">{t('forum.noPosts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => navigate(`/forum/${post.id}`)}
                className="w-full text-left bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 hover:shadow-md hover:border-brand-secondary/20 active:scale-[0.99] transition-all"
              >
                <h3 className="text-base font-bold text-brand-text">{post.title}</h3>
                <p className="text-sm text-brand-muted mt-1 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-brand-muted">
                  <span className="font-medium text-brand-secondary">{post.profiles?.first_name || 'Anonymous'}</span>
                  <span className="text-brand-border">&bull;</span>
                  <span>{new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
