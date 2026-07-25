import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { MessageCircle, ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const avatarColors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#2563EB']

function getAvatarColor(id) {
  if (!id) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name) {
  return (name || 'A').charAt(0).toUpperCase()
}

function timeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffSec = Math.floor((now - date) / 1000)
  if (diffSec < 60) return 'baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} menit yang lalu`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} jam yang lalu`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} hari yang lalu`
  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 4) return `${diffWeek} minggu yang lalu`
  const diffMonth = Math.floor(diffDay / 30)
  return `${diffMonth} bulan yang lalu`
}

export default function ForumPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, profiles(*), forum_replies(*, profiles(*))')
      .order('created_at', { ascending: false })
    if (!error && data) setPosts(data)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (!user) {
      alert('Anda harus login terlebih dahulu untuk membuat diskusi.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('forum_posts').insert({
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
      })
      if (error) {
        alert(error.message)
      } else {
        setTitle('')
        setContent('')
        setIsComposing(false)
        fetchPosts()
      }
    } catch (err) {
      alert(err.message)
    }
    setSubmitting(false)
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Apakah Anda yakin ingin menghapus diskusi ini?')) return
    const { error } = await supabase.from('forum_posts').delete().eq('id', postId)
    if (error) {
      alert(error.message)
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId))
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
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
          <div className="transition-all duration-300">
            {!isComposing ? (
              <button
                type="button"
                onClick={() => setIsComposing(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <Send size={16} />
                + Mulai Diskusi Baru
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-secondary p-5 space-y-4 animate-fadeIn">
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
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {submitting ? '...' : t('forum.submit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsComposing(false); setTitle(''); setContent('') }}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all duration-200"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto">
              <MessageCircle size={32} className="text-brand-muted/40" />
            </div>
            <p className="text-sm text-brand-muted mt-4">{t('forum.noPosts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const replies = post.forum_replies || []
              const commentCount = replies.length
              const sortedReplies = [...replies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              const latestReply = sortedReplies[0]
              const uniqueRepliers = Array.from(
                new Map(replies.map(r => [r.author_id, r.profiles])).values()
              ).filter(Boolean)
              const authorName = post.profiles?.first_name || 'Anonymous'

              return (
              <div
                key={post.id}
                onClick={() => navigate(`/forum/${post.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/forum/${post.id}`)}
                className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 hover:shadow-md hover:border-brand-secondary/20 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: getAvatarColor(post.author_id) }}
                    >
                      {getInitials(authorName)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-brand-text leading-snug">{post.title}</h3>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Umum</span>
                    </div>
                    <p className="text-xs text-brand-muted mt-1">
                      {latestReply ? (
                        <>↳ Balasan terakhir dari <span className="font-medium text-brand-secondary">{latestReply.profiles?.first_name || 'Anonymous'}</span> {timeAgo(latestReply.created_at)}</>
                      ) : (
                        <>{authorName} &bull; {timeAgo(post.created_at)}</>
                      )}
                    </p>
                    <p className="text-sm text-brand-muted mt-2 leading-relaxed line-clamp-2">{post.content}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-center gap-2">
                    {session?.user?.id === post.author_id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id) }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus diskusi"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {commentCount > 0 && (
                      <>
                        <div className="flex -space-x-2">
                          {uniqueRepliers.slice(0, 3).map((replier) => (
                            <div
                              key={replier.id}
                              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: getAvatarColor(replier.id) }}
                              title={replier.first_name || 'Anonymous'}
                            >
                              {getInitials(replier.first_name)}
                            </div>
                          ))}
                          {uniqueRepliers.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-muted flex items-center justify-center text-white text-[10px] font-bold">
                              +{uniqueRepliers.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-brand-muted whitespace-nowrap">
                          <MessageCircle size={12} />
                          <span>{commentCount}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
