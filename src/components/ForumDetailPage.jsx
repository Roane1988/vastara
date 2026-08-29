import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import {
  ArrowLeft, Send, MessageCircle, Trash2, X, Edit3, Check, AlertTriangle,
  Eye, Share2, CheckCircle2, BarChart2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { formatCount } from '../utils/format'
import ConfirmModal from './ConfirmModal'
import Markdown from './Markdown'

const REACTIONS = ['👍', '❤️', '🔥', '💡']

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

function ReactionRow({ reactions, userReaction, onReact, size = 'sm' }) {
  const emojiClass = size === 'lg' ? 'text-base' : 'text-sm'
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTIONS.map(emoji => {
        const count = reactions?.by?.[emoji] || 0
        const active = userReaction === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
              active
                ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent'
                : 'bg-brand-bg/60 border-transparent hover:bg-brand-bg text-brand-muted'
            }`}
          >
            <span className={emojiClass}>{emoji}</span>
            {count > 0 && <span className="text-[11px] font-semibold">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function ForumDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
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
  const [postReactions, setPostReactions] = useState({ count: 0, by: {} })
  const [userPostReaction, setUserPostReaction] = useState(null)
  const [replyReactions, setReplyReactions] = useState({})
  const [userReplyReaction, setUserReplyReaction] = useState({})
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [editingReplyContent, setEditingReplyContent] = useState('')
  const [editingReplySubmitting, setEditingReplySubmitting] = useState(false)
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [editingPostSubmitting, setEditingPostSubmitting] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [relatedPosts, setRelatedPosts] = useState([])
  const [votes, setVotes] = useState({ count: 0, byIndex: {}, userIndex: null })
  const replyInputRef = useRef(null)
  const repliesEndRef = useRef(null)
  const cancelledRef = useRef(false)
  const repliesRef = useRef([])
  const viewedRef = useRef(false)

  useEffect(() => { repliesRef.current = replies }, [replies])

  useEffect(() => {
    cancelledRef.current = false

    fetchPost().catch(() => {})
    fetchReplies().catch(() => {})
    fetchVotes().catch(() => {})

    const channel = supabase
      .channel(`forum-detail-${id}`)
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
            fetchReactions(repliesRef.current.map((r) => r.id))
          } catch {
            if (!cancelledRef.current) {
              const newReply = {
                ...payload.new,
                profiles: { first_name: null },
              }
              setReplies((prev) =>
                prev.some((r) => r.id === newReply.id) ? prev : [...prev, newReply]
              )
              fetchReactions(repliesRef.current.map((r) => r.id))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_reactions',
          filter: `target_id=eq.${id}`,
        },
        () => {
          if (!cancelledRef.current) fetchReactions(repliesRef.current.map((r) => r.id))
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
        if (!viewedRef.current && data.id) {
          viewedRef.current = true
          supabase.rpc('increment_forum_views', { p_post_id: data.id }).then(() => {}).catch(() => {})
        }
        fetchRelated(data)
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
        fetchReactions(data.map((r) => r.id))
      }
    } catch (err) {
      if (cancelledRef.current) return
      showToast(err.message || 'Gagal memuat balasan', 'error')
    }
  }

  async function fetchRelated(postData) {
    try {
      const { data } = await supabase
        .from('forum_posts')
        .select('id, title, category, created_at, forum_replies(id)')
        .eq('category', postData.category)
        .neq('id', postData.id)
        .order('created_at', { ascending: false })
        .limit(3)
      if (!cancelledRef.current && data) setRelatedPosts(data || [])
    } catch { /* non-critical */ }
  }

  async function fetchReactions(replyIds) {
    try {
      const { data: postData } = await supabase
        .from('forum_reactions')
        .select('user_id, reaction')
        .eq('target_id', id)
        .eq('target_type', 'post')
      if (!cancelledRef.current && postData) {
        const by = {}
        postData.forEach((r) => { by[r.reaction] = (by[r.reaction] || 0) + 1 })
        setPostReactions({ count: postData.length, by })
        setUserPostReaction(user ? (postData.find((r) => r.user_id === user.id)?.reaction || null) : null)
      }

      if (replyIds.length > 0) {
        const { data: repliesData } = await supabase
          .from('forum_reactions')
          .select('target_id, user_id, reaction')
          .in('target_id', replyIds)
          .eq('target_type', 'reply')
        if (!cancelledRef.current && repliesData) {
          const counts = {}
          const userReactions = {}
          replyIds.forEach((rid) => { counts[rid] = { count: 0, by: {} } })
          repliesData.forEach((r) => {
            if (!counts[r.target_id]) counts[r.target_id] = { count: 0, by: {} }
            counts[r.target_id].count += 1
            counts[r.target_id].by[r.reaction] = (counts[r.target_id].by[r.reaction] || 0) + 1
            if (user && r.user_id === user.id) userReactions[r.target_id] = r.reaction
          })
          setReplyReactions(counts)
          setUserReplyReaction(userReactions)
        }
      }
    } catch { /* silently fail */ }
  }

  async function fetchVotes() {
    try {
      const { data } = await supabase
        .from('forum_poll_votes')
        .select('option_index, user_id')
        .eq('post_id', id)
      if (cancelledRef.current || !data) return
      const byIndex = {}
      let userIndex = null
      data.forEach((v) => {
        byIndex[v.option_index] = (byIndex[v.option_index] || 0) + 1
        if (user && v.user_id === user.id) userIndex = v.option_index
      })
      setVotes({ count: data.length, byIndex, userIndex })
    } catch { /* silently fail */ }
  }

  async function handleToggleReaction(targetId, targetType, emoji) {
    if (!user) {
      showToast('Anda harus login untuk memberi reaksi.', 'error')
      return
    }
    try {
      const existing = await supabase
        .from('forum_reactions')
        .select('id, reaction')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .maybeSingle()

      if (existing.data) {
        if (existing.data.reaction === emoji) {
          await supabase.from('forum_reactions').delete().eq('id', existing.data.id)
        } else {
          await supabase.from('forum_reactions').update({ reaction: emoji }).eq('id', existing.data.id)
        }
      } else {
        await supabase.from('forum_reactions').insert({
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
          reaction: emoji,
        })
      }
      fetchReactions(repliesRef.current.map((r) => r.id))
    } catch { /* silently fail */ }
  }

  async function handleVote(optionIndex) {
    if (!user) {
      showToast('Anda harus login untuk memberi vote.', 'error')
      return
    }
    try {
      await supabase.from('forum_poll_votes').upsert(
        { post_id: id, user_id: user.id, option_index: optionIndex },
        { onConflict: 'post_id,user_id' }
      )
      fetchVotes()
    } catch { /* silently fail */ }
  }

  async function handleToggleSolution(replyId) {
    try {
      const next = post.solved_reply_id === replyId ? null : replyId
      const { error } = await supabase.from('forum_posts').update({ solved_reply_id: next }).eq('id', id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast(next ? 'Balasan ditandai sebagai solusi' : 'Solusi dihapus', 'success')
        fetchPost()
      }
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui solusi', 'error')
    }
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

  function handleShare() {
    const url = `${window.location.origin}/forum/${id}`
    const text = `Cek diskusi di HuniOne Forum:\n${post.title}\n${url}`
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
    const width = 520
    const height = 600
    window.open(wa, '_blank', `width=${width},height=${height},left=${(window.innerWidth - width) / 2},top=${(window.innerHeight - height) / 2}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col">
        <div className="sticky top-14 bg-brand-surface/90 backdrop-blur-md z-30 pb-3 px-5 border-b border-brand-border">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-full bg-brand-border animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 rounded-full bg-brand-border animate-pulse" />
              <div className="w-14 h-8 rounded-full bg-brand-border animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 px-5 py-5 max-w-3xl mx-auto w-full space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-border" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-brand-border rounded" />
                <div className="h-2.5 w-1/5 bg-brand-border rounded" />
              </div>
            </div>
            <div className="h-5 w-3/4 bg-brand-border rounded" />
            <div className="h-3 w-full bg-brand-border rounded" />
            <div className="h-3 w-2/3 bg-brand-border rounded" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 animate-pulse space-y-2">
            <div className="h-4 w-1/4 bg-brand-border rounded" />
            <div className="h-12 w-full bg-brand-border rounded" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 animate-pulse space-y-2">
            <div className="h-4 w-1/4 bg-brand-border rounded" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-border" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 bg-brand-border rounded" />
                <div className="h-2.5 w-full bg-brand-border rounded" />
              </div>
            </div>
          </div>
        </div>
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

  const totalPostReactions = postReactions.count
  const solvedReplyId = post.solved_reply_id
  const poll = post.poll

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-14 bg-brand-surface/90 backdrop-blur-md z-30 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/forum')}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors"
              title={t('forum.share')}
            >
              <Share2 size={14} />
              {t('forum.share')}
            </button>
            {user?.id === post.author_id && !isEditingPost && (
              <>
                <button
                  type="button"
                  onClick={handleEditPost}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-brand-accent hover:bg-brand-accent/10 transition-colors"
                  title={t('forum.edit')}
                >
                  <Edit3 size={14} />
                  {t('forum.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  title={t('forum.delete')}
                >
                  <Trash2 size={14} />
                  {t('forum.delete')}
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
              <h2 className="text-sm font-bold text-brand-text">{t('forum.edit')} {t('forum.statsDiscussions')}</h2>
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
                  {t('forum.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                >
                  {t('forum.cancel')}
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
                    {solvedReplyId && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={10} />
                        {t('forum.solvedBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-2">
                    <span>{timeAgo(post.created_at, i18n.language)}</span>
                    <span className="flex items-center gap-1"><Eye size={11} />{formatCount(post.views || 0)} {t('forum.viewsLabel')}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-brand-muted shrink-0">
                  <span className="text-xs font-semibold">{totalPostReactions > 0 ? `+${totalPostReactions}` : ''}</span>
                </div>
              </div>
              <h1 className="text-lg font-bold text-brand-text leading-snug mt-4">{post.title}</h1>
              <div className="mt-3">
                <Markdown content={post.content} onTag={(tag) => navigate(`/forum?tag=${tag}`)} />
              </div>
              {(post.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => navigate(`/forum?tag=${tag}`)}
                      className="text-[11px] font-medium text-brand-accent bg-brand-accent/10 rounded-full px-2 py-0.5 hover:bg-brand-accent/15 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-brand-border/60">
                <ReactionRow
                  size="lg"
                  reactions={postReactions}
                  userReaction={userPostReaction}
                  onReact={(emoji) => handleToggleReaction(post.id, 'post', emoji)}
                />
              </div>
            </>
          )}
        </div>

        {poll && (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-text">
              <BarChart2 size={16} className="text-teal-600" />
              {poll.question}
            </div>
            <div className="space-y-2.5 mt-4">
              {poll.options.map((option, i) => {
                const count = votes.byIndex[i] || 0
                const pct = votes.count > 0 ? Math.round((count / votes.count) * 100) : 0
                const mine = votes.userIndex === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleVote(i)}
                    className={`w-full text-left relative overflow-hidden rounded-xl border px-4 py-3 transition-all ${
                      mine
                        ? 'border-brand-accent bg-brand-accent/5'
                        : 'border-brand-border bg-brand-surface/40 hover:border-brand-accent/40'
                    }`}
                  >
                    {votes.userIndex != null && (
                      <span
                        className={`absolute inset-y-0 left-0 ${mine ? 'bg-brand-accent/15' : 'bg-brand-bg'}`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <span className="relative flex items-center justify-between gap-3">
                      <span className={`text-sm ${mine ? 'font-bold text-brand-accent' : 'font-medium text-brand-text'}`}>
                        {option}
                        {mine && <span className="ml-2 text-[10px] font-bold text-brand-accent">✓ {t('forum.yourVote')}</span>}
                      </span>
                      {votes.userIndex != null && (
                        <span className="text-xs font-bold text-brand-muted">{pct}%</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-brand-muted mt-3">{votes.count} {t('forum.votesLabel')}</p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-brand-text">{replies.length} {t('forum.reply')}</h2>

          {replies.length === 0 ? (
            <div className="text-center py-12 bg-brand-surface/50 rounded-2xl border border-dashed border-brand-border">
              <MessageCircle size={28} className="mx-auto text-brand-muted/30" />
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                {t('forum.emptyTitle')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => {
                const parsed = parseReplyContent(reply.content)
                const isEditing = editingReplyId === reply.id
                const isSolved = solvedReplyId === reply.id
                const replyReacts = replyReactions[reply.id] || { count: 0, by: {} }
                return (
                  <div
                    key={reply.id}
                    className={`bg-white rounded-2xl shadow-sm border p-4 transition-all duration-200 hover:shadow-md ${
                      isSolved ? 'border-emerald-300 bg-emerald-50/40' : 'border-brand-border'
                    }`}
                  >
                    {isSolved && (
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 size={14} />
                        {t('forum.bestAnswer')}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-brand-text">{t('forum.edit')} {t('forum.reply')}</h3>
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
                            {t('forum.save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingReplyId(null); setEditingReplyContent('') }}
                            className="px-3 py-2.5 rounded-xl text-xs font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                          >
                            {t('forum.cancel')}
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
                              <span className="text-xs text-brand-muted">{timeAgo(reply.created_at, i18n.language)}</span>
                            </div>
                          </div>
                        </div>
                        {parsed.quoted && <div className="mt-2"><QuoteBox quoted={parsed.quoted} /></div>}
                        <div className="text-sm text-brand-text leading-relaxed mt-2">
                          <Markdown content={parsed.message} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-brand-border/50">
                          <ReactionRow
                            reactions={replyReacts}
                            userReaction={userReplyReaction[reply.id] || null}
                            onReact={(emoji) => handleToggleReaction(reply.id, 'reply', emoji)}
                          />
                          <div className="flex items-center gap-4 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({ id: reply.id, authorName: reply.profiles?.first_name || 'Anonymous', content: reply.content })
                                replyInputRef.current?.focus()
                              }}
                              className="text-xs font-medium text-brand-muted hover:text-brand-accent transition-colors"
                            >
                              {t('forum.reply')}
                            </button>
                            {user?.id === reply.author_id && (
                              <button
                                type="button"
                                onClick={() => handleEditReply(reply.id)}
                                className="text-xs font-medium text-brand-muted hover:text-brand-accent transition-colors"
                              >
                                {t('forum.edit')}
                              </button>
                            )}
                            {user?.id === post.author_id && (
                              <button
                                type="button"
                                onClick={() => handleToggleSolution(reply.id)}
                                className={`text-xs font-semibold transition-colors ${isSolved ? 'text-emerald-600' : 'text-brand-muted hover:text-emerald-600'}`}
                              >
                                {isSolved ? `✓ ${t('forum.unmarkSolution')}` : t('forum.markAsSolution')}
                              </button>
                            )}
                          </div>
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

        {relatedPosts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5">
            <h2 className="text-sm font-bold text-brand-text mb-3">{t('forum.relatedThreads')}</h2>
            <div className="space-y-2">
              {relatedPosts.map(rp => (
                <button
                  key={rp.id}
                  type="button"
                  onClick={() => navigate(`/forum/${rp.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-bg transition-colors text-left"
                >
                  <span className="text-sm font-medium text-brand-text line-clamp-1 flex-1">{rp.title}</span>
                  <span className="flex items-center gap-1 text-xs text-brand-muted shrink-0">
                    <MessageCircle size={11} />
                    {rp.forum_replies?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {session?.user ? (
          <form onSubmit={handleReply} className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 transition-all duration-300 sticky bottom-4">
            {replyingTo && (
              <div className="flex items-start gap-3 mb-3 pl-3 border-l-[3px] border-brand-accent bg-brand-bg/70 rounded-r-xl py-2.5 px-3 transition-all duration-300 ease-out">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-accent">{t('forum.replyingTo')} {replyingTo.authorName}</p>
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
                  placeholder={replyingTo ? `${t('forum.replyingTo')} ${replyingTo.authorName}...` : t('forum.postContentPlaceholder')}
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
              {t('forum.guestsSubtitle')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200"
            >
              {t('forum.loginCta')}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={t('forum.deleteConfirmTitle')}
        description={t('forum.deleteConfirmDesc')}
        confirmText={t('forum.deleteConfirmText')}
        cancelText={t('forum.cancel')}
        loading={deleting}
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => { setShowCancelConfirm(false); setReplyingTo(null); setReplyContent('') }}
        title={t('forum.cancelReplyTitle')}
        description={t('forum.cancelReplyDesc')}
        confirmText={t('forum.cancelReplyConfirm')}
        cancelText={t('forum.cancelReplyCancel')}
        icon={AlertTriangle}
        danger={false}
      />
    </div>
  )
}
