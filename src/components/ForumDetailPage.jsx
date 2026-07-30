import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { ArrowLeft, Send, MessageCircle, Trash2, X, ThumbsUp, Edit3, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import ConfirmModal from './ConfirmModal'

function parseReplyContent(content) {
  const prefix = '<!--replyto:'
  const suffix = '-->'
  if (content && content.startsWith(prefix)) {
    const end = content.indexOf(suffix)
    if (end !== -1) {
      const meta = content.slice(prefix.length, end)
      const sep = meta.indexOf('|')
      const authorName = sep !== -1 ? meta.slice(0, sep) : 'Anonymous'
      const snippet = sep !== -1 ? meta.slice(sep + 1) : meta
      const message = content.slice(end + suffix.length).replace(/^\n+/, '')
      return { quoted: { authorName, content: snippet }, message }
    }
  }
  return { quoted: null, message: content }
}

function QuoteBox({ quoted }) {
  return (
    <div className="flex items-start gap-2 mb-3 pl-3 border-l-[3px] border-brand-accent/50 bg-brand-bg/70 rounded-r-xl py-2 px-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-brand-accent leading-tight">{quoted.authorName}</p>
        <p className="text-[11px] text-brand-muted leading-snug truncate">{quoted.content}</p>
      </div>
    </div>
  )
}

export default function ForumDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, session, showToast } = useAuth()
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [postLikes, setPostLikes] = useState(0)
  const [userPostLiked, setUserPostLiked] = useState(false)
  const [replyLikes, setReplyLikes] = useState({})
  const [userReplyLiked, setUserReplyLiked] = useState({})
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [editingReplyContent, setEditingReplyContent] = useState('')
  const [editingReplySubmitting, setEditingReplySubmitting] = useState(false)
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [editingPostSubmitting, setEditingPostSubmitting] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const replyInputRef = useRef(null)
  const repliesEndRef = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    fetchPost().catch(() => {})
    fetchReplies().catch(() => {})
    fetchLikes()

    const channel = supabase
      .channel(`forum-replies-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_replies',
          filter: `post_id=eq.${id}`,
        },
        async (payload) => {
          if (cancelledRef.current) return
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', payload.new.author_id)
              .single()
            if (cancelledRef.current) return
            const newReply = {
              ...payload.new,
              profiles: { first_name: profile?.first_name || null },
            }
            setReplies((prev) =>
              prev.some((r) => r.id === newReply.id) ? prev : [...prev, newReply]
            )
          } catch {
            if (!cancelledRef.current) {
              const newReply = {
                ...payload.new,
                profiles: { first_name: null },
              }
              setReplies((prev) =>
                prev.some((r) => r.id === newReply.id) ? prev : [...prev, newReply]
              )
            }
          }
        }
      )
      .subscribe()

    return () => {
      cancelledRef.current = true
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchPost() {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*, profiles(first_name)')
        .eq('id', id)
        .single()
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else if (data) {
        setPost(data)
      }
    } catch (err) {
      if (cancelledRef.current) return
      showToast(err.message || 'Gagal memuat diskusi', 'error')
    }
    if (!cancelledRef.current) setLoading(false)
  }

  async function fetchReplies() {
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*, profiles(first_name)')
        .eq('post_id', id)
        .order('created_at', { ascending: true })
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else if (data) {
        setReplies(data)
      }
    } catch (err) {
      if (cancelledRef.current) return
      showToast(err.message || 'Gagal memuat balasan', 'error')
    }
  }

  async function fetchLikes() {
    try {
      const { data: postData } = await supabase
        .from('forum_likes')
        .select('id, user_id', { count: 'exact' })
        .eq('target_id', id)
        .eq('target_type', 'post')
      if (postData) {
        setPostLikes(postData.length)
        if (user) setUserPostLiked(postData.some(l => l.user_id === user.id))
      }

      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select('id')
        .eq('post_id', id)
      const replyIds = repliesData?.map(r => r.id) || []
      if (replyIds.length > 0) {
        const { data: likeData } = await supabase
          .from('forum_likes')
          .select('target_id, user_id')
          .in('target_id', replyIds)
          .eq('target_type', 'reply')
        if (likeData) {
          const counts = {}
          const userLikes = {}
          replyIds.forEach(rid => { counts[rid] = 0; userLikes[rid] = false })
          likeData.forEach(l => {
            counts[l.target_id] = (counts[l.target_id] || 0) + 1
            if (user && l.user_id === user.id) userLikes[l.target_id] = true
          })
          setReplyLikes(counts)
          setUserReplyLiked(userLikes)
        }
      }
    } catch { /* silently fail */ }
  }

  async function handleToggleLike(targetId, targetType) {
    if (!user) {
      showToast('Anda harus login untuk memberi like.', 'error')
      return
    }
    try {
      const existing = await supabase
        .from('forum_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .maybeSingle()

      if (existing.data) {
        await supabase.from('forum_likes').delete().eq('id', existing.data.id)
      } else {
        await supabase.from('forum_likes').insert({
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
        })
      }
      fetchLikes()
    } catch { /* silently fail */ }
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!replyContent.trim() || !session?.user) return
    setSubmitting(true)

    let content = replyContent.trim()
    if (replyingTo) {
      const snippet = replyingTo.content.replace(/<!--replyto:.*?-->\n?/s, '').trim()
      content = `<!--replyto:${replyingTo.authorName}|${snippet.slice(0, 80)}-->\n${content}`
    }

    try {
      const { error } = await supabase.from('forum_replies').insert({
      post_id: id,
      author_id: session.user.id,
      content,
    })
    if (!error) {
      setReplyContent('')
      setReplyingTo(null)
      showToast('Balasan berhasil dikirim', 'success')
      fetchReplies()
      setTimeout(() => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } else {
      showToast(error.message, 'error')
    }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal mengirim balasan', 'error')
    }
    if (!cancelledRef.current) setSubmitting(false)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', id).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Diskusi berhasil dihapus', 'success')
        navigate('/forum')
      }
    } catch (err) {
      showToast(err.message || 'Gagal menghapus diskusi', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  async function handleEditReply(replyId) {
    const reply = replies.find(r => r.id === replyId)
    if (!reply) return
    const parsed = parseReplyContent(reply.content)
    setEditingReplyId(replyId)
    setEditingReplyContent(parsed.message)
  }

  async function handleSaveEditReply(replyId) {
    if (!editingReplyContent.trim()) return
    setEditingReplySubmitting(true)
    try {
      const reply = replies.find(r => r.id === replyId)
      const parsed = parseReplyContent(reply.content)
      let newContent = editingReplyContent.trim()
      if (parsed.quoted) {
        newContent = `<!--replyto:${parsed.quoted.authorName}|${parsed.quoted.content}-->\n${newContent}`
      }
      const { error } = await supabase.from('forum_replies').update({ content: newContent }).eq('id', replyId).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setEditingReplyId(null)
        setEditingReplyContent('')
        showToast('Balasan berhasil diedit', 'success')
        fetchReplies()
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengedit balasan', 'error')
    }
    setEditingReplySubmitting(false)
  }

  function handleEditPost() {
    setEditPostTitle(post.title)
    setEditPostContent(post.content)
    setIsEditingPost(true)
  }

  async function handleSaveEditPost() {
    if (!editPostTitle.trim() || !editPostContent.trim()) return
    setEditingPostSubmitting(true)
    try {
      const { error } = await supabase.from('forum_posts').update({
        title: editPostTitle.trim(),
        content: editPostContent.trim(),
      }).eq('id', id).eq('author_id', user?.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        setIsEditingPost(false)
        showToast('Diskusi berhasil diedit', 'success')
        fetchPost()
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengedit diskusi', 'error')
    }
    setEditingPostSubmitting(false)
  }

  function handleCancelReply() {
    if (replyContent.trim()) {
      setShowCancelConfirm(true)
    } else {
      setReplyingTo(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
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
          <div className="flex items-center gap-2">
            {user?.id === post.author_id && !isEditingPost && (
              <>
                <button
                  type="button"
                  onClick={handleEditPost}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-brand-accent hover:bg-brand-accent/10 transition-colors"
                  title="Edit diskusi"
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  title="Hapus diskusi"
                >
                  <Trash2 size={14} />
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-32 max-w-2xl mx-auto w-full space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5">
          {isEditingPost ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-brand-text">Edit Diskusi</h2>
              <input
                type="text"
                value={editPostTitle}
                onChange={(e) => setEditPostTitle(e.target.value)}
                className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
              />
              <textarea
                rows={4}
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveEditPost}
                  disabled={editingPostSubmitting || !editPostTitle.trim() || !editPostContent.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {editingPostSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: getAvatarColor(post.author_id) }}
                >
                  {getInitials(post.profiles?.first_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-brand-accent">
                      {post.profiles?.first_name || 'Anonymous'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F] text-white">
                      OP
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5">{timeAgo(post.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 text-brand-muted shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id, 'post')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-bg transition-colors ${userPostLiked ? 'text-blue-500' : 'text-brand-muted hover:text-brand-accent'}`}
                  >
                    <ThumbsUp size={14} fill={userPostLiked ? 'currentColor' : 'none'} />
                    <span className="text-xs font-medium">{postLikes}</span>
                  </button>
                </div>
              </div>
              <h1 className="text-lg font-bold text-brand-text leading-snug mt-4">{post.title}</h1>
              <p className="text-sm text-brand-text mt-3 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-brand-text">{replies.length} {t('forum.reply')}</h2>
          </div>
          {replies.length === 0 ? (
            <div className="text-center py-12 bg-brand-surface/50 rounded-2xl border border-dashed border-brand-border">
              <MessageCircle size={28} className="mx-auto text-brand-muted/30" />
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                Belum ada balasan. Jadilah yang pertama membalas!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => {
                const parsed = parseReplyContent(reply.content)
                const isEditing = editingReplyId === reply.id
                return (
                  <div key={reply.id} className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 transition-all duration-200 hover:shadow-md">
                    {isEditing ? (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-brand-text">Edit Balasan</h3>
                        <textarea
                          rows={3}
                          value={editingReplyContent}
                          onChange={(e) => setEditingReplyContent(e.target.value)}
                          className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveEditReply(reply.id)}
                            disabled={editingReplySubmitting || !editingReplyContent.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                          >
                            {editingReplySubmitting ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingReplyId(null); setEditingReplyContent('') }}
                            className="px-3 py-2.5 rounded-xl text-xs font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: getAvatarColor(reply.author_id) }}
                          >
                            {getInitials(reply.profiles?.first_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-brand-accent">
                                {reply.profiles?.first_name || 'Anonymous'}
                              </span>
                              {reply.author_id === post.author_id && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1E3A5F] text-white leading-none">
                                  OP
                                </span>
                              )}
                              <span className="text-xs text-brand-muted">&bull;</span>
                              <span className="text-xs text-brand-muted">{timeAgo(reply.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-brand-muted shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(reply.id, 'reply')}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-brand-bg transition-colors ${userReplyLiked[reply.id] ? 'text-blue-500' : 'text-brand-muted hover:text-brand-accent'}`}
                            >
                              <ThumbsUp size={13} fill={userReplyLiked[reply.id] ? 'currentColor' : 'none'} />
                              <span className="text-[11px] font-medium">{replyLikes[reply.id] || 0}</span>
                            </button>
                          </div>
                        </div>
                        {parsed.quoted && <QuoteBox quoted={parsed.quoted} />}
                        <div className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap mt-2">{parsed.message}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({ id: reply.id, authorName: reply.profiles?.first_name || 'Anonymous', content: reply.content })
                              replyInputRef.current?.focus()
                            }}
                            className="text-xs font-medium text-brand-muted hover:text-brand-accent transition-colors"
                          >
                            Balas
                          </button>
                          {user?.id === reply.author_id && (
                            <button
                              type="button"
                              onClick={() => handleEditReply(reply.id)}
                              className="text-xs font-medium text-brand-muted hover:text-brand-accent transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <div ref={repliesEndRef} />
            </div>
          )}
        </div>

        {session?.user ? (
          <form onSubmit={handleReply} className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 transition-all duration-300 sticky bottom-4">
            {replyingTo && (
              <div className="flex items-start gap-3 mb-3 pl-3 border-l-[3px] border-brand-accent bg-brand-bg/70 rounded-r-xl py-2.5 px-3 transition-all duration-300 ease-out">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-accent">{replyingTo.authorName}</p>
                  <p className="text-xs text-brand-muted leading-snug line-clamp-2">{replyingTo.content.replace(/<!--replyto:.*?-->\n?/s, '').trim()}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={replyInputRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={replyingTo ? `Balas ${replyingTo.authorName}...` : t('forum.postContentPlaceholder')}
                  rows={2}
                  className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:brightness-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-brand-surface/80 backdrop-blur-sm rounded-2xl shadow-sm border border-brand-border p-6 text-center">
            <MessageCircle size={28} className="mx-auto text-brand-muted/30" />
            <p className="text-sm text-brand-muted mt-3 leading-relaxed">
              Silakan masuk (login) atau daftar untuk ikut berdiskusi.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200"
            >
              Login / Daftar
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
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
        onConfirm={() => { setShowCancelConfirm(false); setReplyingTo(null); setReplyContent('') }}
        title="Batalkan Balasan?"
        description="Pesan yang sudah ditulis akan hilang."
        confirmText="Ya, Batalkan"
        cancelText="Lanjutkan Menulis"
        icon={AlertTriangle}
        danger={false}
      />
    </div>
  )
}
