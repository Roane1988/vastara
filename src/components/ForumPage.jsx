import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { MessageCircle, ArrowLeft, Send, Trash2, Search, Edit3, Check, AlertTriangle, Filter } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import ConfirmModal from './ConfirmModal'

const FORUM_CATEGORIES = ['Umum', 'KPR', 'Legalitas', 'Tips Properti', 'Rekomendasi']

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
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [category, setCategory] = useState('Umum')
  const [editingPostId, setEditingPostId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editingSubmitting, setEditingSubmitting] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

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
        .select('id, title, content, category, created_at, author_id, profiles(first_name), forum_replies(id, content, created_at, author_id, profiles(first_name))')
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
        category,
      })
      if (error) {
        showToast(error.message, 'error')
      } else {
        setTitle('')
        setContent('')
        setCategory('Umum')
        setIsComposing(false)
        showToast('Diskusi berhasil dibuat', 'success')
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
    setDeleting(true)
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', deleteTarget).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setPosts(prev => prev.filter(p => p.id !== deleteTarget))
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  function handleEditPost(e, post) {
    e.stopPropagation()
    setEditingPostId(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editContent.trim()) return
    setEditingSubmitting(true)
    try {
      const { error } = await supabase.from('forum_posts').update({
        title: editTitle.trim(),
        content: editContent.trim(),
      }).eq('id', editingPostId).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setEditingPostId(null)
        setEditTitle('')
        setEditContent('')
        showToast('Diskusi berhasil diedit', 'success')
        fetchPosts()
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
    setEditingSubmitting(false)
  }

  function handleCancelComposing() {
    if (title.trim() || content.trim()) {
      setShowCancelConfirm(true)
    } else {
      setIsComposing(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !filterCategory || post.category === filterCategory
    return matchesSearch && matchesCategory
  })

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
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                >
                  {FORUM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                    onClick={handleCancelComposing}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all duration-200"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari diskusi..."
              className="w-full border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-brand-text bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none border border-brand-border rounded-xl py-2.5 pl-10 pr-8 text-sm text-brand-text bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors cursor-pointer"
            >
              <option value="">Semua</option>
              {FORUM_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto">
              <MessageCircle size={32} className="text-brand-muted/40" />
            </div>
            <p className="text-sm text-brand-muted mt-4">{t('forum.noPosts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const replies = post.forum_replies || []
              const commentCount = replies.length
              const sortedReplies = [...replies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              const latestReply = sortedReplies[0]
              const uniqueRepliers = Array.from(
                new Map(replies.map(r => [r.author_id, r.profiles])).values()
              ).filter(Boolean)
              const authorName = post.profiles?.first_name || 'Anonymous'
              const isEditing = editingPostId === post.id

              const categoryColors = {
                'Umum': 'bg-blue-100 text-blue-700',
                'KPR': 'bg-green-100 text-green-700',
                'Legalitas': 'bg-amber-100 text-amber-700',
                'Tips Properti': 'bg-purple-100 text-purple-700',
                'Rekomendasi': 'bg-rose-100 text-rose-700',
              }
              const categoryColor = categoryColors[post.category] || 'bg-gray-100 text-gray-700'

              if (isEditing) {
                return (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-accent p-5 space-y-4">
                    <h3 className="text-sm font-bold text-brand-text">Edit Diskusi</h3>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                    />
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={editingSubmitting || !editTitle.trim() || !editContent.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                      >
                        {editingSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )
              }

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
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColor}`}>{post.category || 'Umum'}</span>
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
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingPostId(post.id); setEditTitle(post.title); setEditContent(post.content) }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors"
                          title="Edit diskusi"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openDeleteModal(post.id) }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus diskusi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
        loading={deleting}
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => { setShowCancelConfirm(false); setIsComposing(false); setTitle(''); setContent(''); setCategory('Umum') }}
        title="Batalkan Diskusi?"
        description="Pesan yang sudah ditulis akan hilang."
        confirmText="Ya, Batalkan"
        cancelText="Lanjutkan Menulis"
        icon={AlertTriangle}
        danger={false}
      />
    </div>
  )
}
