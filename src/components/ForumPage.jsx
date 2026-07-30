import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { MessageCircle, ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import ConfirmModal from './ConfirmModal'

export default function ForumPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, session, showToast } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    fetchPosts()
    return () => { cancelledRef.current = true }
  }, [])

  async function fetchPosts() {
    if (!cancelledRef.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('id, title, content, created_at, author_id, profiles(first_name), forum_replies(id, content, created_at, author_id, profiles(first_name))')
        .order('created_at', { ascending: false })
      if (!cancelledRef.current) {
        if (!error && data) {
          setPosts(data)
        } else if (error) {
          console.warn('Gagal memuat forum:', error.message)
        }
        setLoading(false)
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.warn('Gagal memuat forum:', err.message)
        setLoading(false)
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (!user) {
      showToast('Anda harus login terlebih dahulu untuk membuat diskusi.', 'error')
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
        showToast(error.message, 'error')
      } else {
        setTitle('')
        setContent('')
        setIsComposing(false)
        fetchPosts()
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSubmitting(false)
  }

  function openDeleteModal(postId) {
    setDeleteTarget(postId)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', deleteTarget).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setPosts(prev => prev.filter(p => p.id !== deleteTarget))
      }
    } catch (err) {
      showToast(err.message, 'error')
      setPosts(prev => [...prev])
    }
    setDeleteTarget(null)
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
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-accent p-5 space-y-4 animate-fadeIn">
                <h2 className="text-sm font-bold text-brand-text">{t('forum.createPost')}</h2>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('forum.postTitlePlaceholder')}
                  className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                />
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('forum.postContentPlaceholder')}
                  className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted resize-none"
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
            <div className="w-6 h-6 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
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
                className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 hover:shadow-md hover:border-brand-accent/20 active:scale-[0.99] transition-all duration-200 cursor-pointer"
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
                        <>↳ Balasan terakhir dari <span className="font-medium text-brand-accent">{latestReply.profiles?.first_name || 'Anonymous'}</span> {timeAgo(latestReply.created_at)}</>
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
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(post.id) }}
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

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Diskusi"
        description="Apakah Anda yakin ingin menghapus diskusi ini?"
        confirmText="Hapus"
        cancelText="Batal"
      />
    </div>
  )
}
