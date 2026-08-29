import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import {
  MessageCircle, ArrowLeft, Send, Trash2, Search, Edit3, Check, AlertTriangle,
  Pin, Flame, Eye, BarChart2, Share2, Plus, X, Users, User, MessageSquare, Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { timeAgo } from '../utils/time'
import { formatCount } from '../utils/format'
import ConfirmModal from './ConfirmModal'
import Markdown from './Markdown'

const FORUM_CATEGORIES = ['Umum', 'KPR', 'Legalitas', 'Tips Properti', 'Rekomendasi']
const POSTS_PER_PAGE = 10

const categoryColors = {
  'Umum': 'bg-blue-100 text-blue-700',
  'KPR': 'bg-green-100 text-green-700',
  'Legalitas': 'bg-amber-100 text-amber-700',
  'Tips Properti': 'bg-purple-100 text-purple-700',
  'Rekomendasi': 'bg-rose-100 text-rose-700',
}

function parseTags(text) {
  return String(text || '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => s.replace(/^#/, '').toLowerCase())
    .filter(Boolean)
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-bg" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-brand-bg rounded w-3/4" />
          <div className="h-3 bg-brand-bg rounded w-1/2" />
          <div className="h-3 bg-brand-bg rounded w-full" />
          <div className="h-3 bg-brand-bg rounded w-5/6" />
        </div>
      </div>
    </div>
  )
}

export default function ForumPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, session, showToast, role } = useAuth()
  const [posts, setPosts] = useState([])
  const [reactionTotals, setReactionTotals] = useState({})
  const [stats, setStats] = useState({ replies: 0, members: 0 })
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Umum')
  const [tagsText, setTagsText] = useState('')
  const [poll, setPoll] = useState({ enabled: false, question: '', options: ['', ''] })
  const [composeTab, setComposeTab] = useState('write')
  const [submitting, setSubmitting] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTag, setFilterTag] = useState(() => searchParams.get('tag') || '')
  const [filterAuthor, setFilterAuthor] = useState(() => searchParams.get('author') || '')
  const [authorName, setAuthorName] = useState('')
  const [sortMode, setSortMode] = useState('terbaru')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editingSubmitting, setEditingSubmitting] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const composeRef = useRef(null)

  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    fetchPosts()
    fetchStats()
    return () => { cancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetPagination = () => setVisibleCount(POSTS_PER_PAGE)

  useEffect(() => {
    if (!filterAuthor) return
    let cancelled = false
    supabase.from('profiles')
      .select('first_name')
      .eq('id', filterAuthor)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setAuthorName(data?.first_name || '') })
      .catch(() => {})
    return () => { cancelled = true }
  }, [filterAuthor])

  async function fetchStats() {
    try {
      const [{ count: replies }, { count: members }] = await Promise.all([
        supabase.from('forum_replies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      if (!cancelledRef.current) setStats({ replies: replies || 0, members: members || 0 })
    } catch { /* non-critical */ }
  }

  async function fetchReactions(postIds) {
    if (!postIds.length) return
    try {
      const { data, error } = await supabase
        .from('forum_reactions')
        .select('target_id, reaction')
        .in('target_id', postIds)
        .eq('target_type', 'post')
      if (error || !data || cancelledRef.current) return
      const totals = {}
      data.forEach((r) => {
        if (!totals[r.target_id]) totals[r.target_id] = { count: 0, by: {} }
        totals[r.target_id].count += 1
        totals[r.target_id].by[r.reaction] = (totals[r.target_id].by[r.reaction] || 0) + 1
      })
      setReactionTotals(totals)
    } catch { /* non-critical */ }
  }

  async function fetchPosts() {
    if (!cancelledRef.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('id, title, content, category, created_at, author_id, views, is_pinned, tags, poll, solved_reply_id, profiles(first_name), forum_replies(id, created_at, author_id, profiles(first_name))')
        .order('created_at', { ascending: false })
      if (!cancelledRef.current) {
        if (!error && data) {
          setPosts(data)
          fetchReactions(data.map((p) => p.id))
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

  function scrollToComposer() {
    if (!user) {
      showToast('Anda harus login terlebih dahulu untuk membuat diskusi.', 'error')
      return
    }
    setIsComposing(true)
    setTimeout(() => composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (!user) {
      showToast('Anda harus login terlebih dahulu untuk membuat diskusi.', 'error')
      return
    }
    let pollPayload = null
    if (poll.enabled) {
      const options = poll.options.map((o) => o.trim()).filter(Boolean)
      if (options.length < 2 || !poll.question.trim()) {
        showToast('Polling butuh pertanyaan dan minimal 2 opsi.', 'error')
        return
      }
      pollPayload = { question: poll.question.trim(), options }
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('forum_posts').insert({
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category,
        tags: parseTags(tagsText),
        poll: pollPayload,
      })
      if (error) {
        showToast(error.message, 'error')
      } else {
        setTitle('')
        setContent('')
        setCategory('Umum')
        setTagsText('')
        setPoll({ enabled: false, question: '', options: ['', ''] })
        setComposeTab('write')
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
        showToast('Diskusi berhasil dihapus', 'success')
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

  async function handleTogglePin(post) {
    try {
      const { error } = await supabase.from('forum_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast(post.is_pinned ? 'Diskusi dilepas dari sematan' : 'Diskusi disematkan', 'success')
        fetchPosts()
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function handleShare(post) {
    const url = `${window.location.origin}/forum/${post.id}`
    const text = `Cek diskusi di HuniOne Forum:\n${post.title}\n${url}`
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
    const width = 520
    const height = 600
    window.open(wa, '_blank', `width=${width},height=${height},left=${(window.innerWidth - width) / 2},top=${(window.innerHeight - height) / 2}`)
  }

  function handleCancelComposing() {
    if (title.trim() || content.trim()) {
      setShowCancelConfirm(true)
    } else {
      setIsComposing(false)
    }
  }

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return posts
      .filter(post => {
        const matchesSearch = !q ||
          post.title.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          (post.tags || []).some(tag => tag.toLowerCase().includes(q))
        const matchesCategory = !filterCategory || post.category === filterCategory
        const matchesTag = !filterTag || (post.tags || []).includes(filterTag)
        const matchesAuthor = !filterAuthor || post.author_id === filterAuthor
        return matchesSearch && matchesCategory && matchesTag && matchesAuthor
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        const scoreA = (a.forum_replies?.length || 0) + (reactionTotals[a.id]?.count || 0)
        const scoreB = (b.forum_replies?.length || 0) + (reactionTotals[b.id]?.count || 0)
        if (sortMode === 'populer') {
          if (scoreB !== scoreA) return scoreB - scoreA
          return new Date(b.created_at) - new Date(a.created_at)
        }
        if (sortMode === 'belum_dijawab') {
          const aEmpty = (a.forum_replies?.length || 0) === 0
          const bEmpty = (b.forum_replies?.length || 0) === 0
          if (aEmpty !== bEmpty) return aEmpty ? -1 : 1
          return new Date(b.created_at) - new Date(a.created_at)
        }
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [posts, reactionTotals, searchQuery, filterCategory, filterTag, filterAuthor, sortMode])

  const visiblePosts = filteredPosts.slice(0, visibleCount)
  const activeTag = filterTag
  const activeAuthor = filterAuthor

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="sticky top-14 bg-brand-surface/90 backdrop-blur-md z-30 pb-3 px-5 border-b border-brand-border">
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

      <div className="flex-1 px-5 pt-5 pb-24 space-y-5 max-w-2xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E3A5F] via-[#23486f] to-[#2f6690] text-white p-6 shadow-sm">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-14 -left-8 w-44 h-44 rounded-full bg-white/5" />
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase bg-white/10 rounded-full px-3 py-1">
            <Sparkles size={12} />
            {t('forum.heroBadge')}
          </span>
          <h2 className="text-xl font-extrabold mt-3 leading-tight">{t('forum.heroTitle')}</h2>
          <p className="text-xs text-white/80 mt-1.5 max-w-xs">{t('forum.heroSubtitle')}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={14} className="text-white/60" />
              <span className="text-xs font-bold">{posts.length}</span>
              <span className="text-[10px] text-white/60">{t('forum.statsDiscussions')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle size={14} className="text-white/60" />
              <span className="text-xs font-bold">{formatCount(stats.replies)}</span>
              <span className="text-[10px] text-white/60">{t('forum.statsReplies')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-white/60" />
              <span className="text-xs font-bold">{formatCount(stats.members)}</span>
              <span className="text-[10px] text-white/60">{t('forum.statsMembers')}</span>
            </div>
          </div>
        </div>

        {session?.user && (
          <div ref={composeRef} className="transition-all duration-300">
            {!isComposing ? (
              <button
                type="button"
                onClick={() => setIsComposing(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <Send size={16} />
                + {t('forum.createPost')}
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-accent p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-brand-text">{t('forum.composeTitle')}</h2>
                  <button
                    type="button"
                    onClick={() => setComposeTab(composeTab === 'write' ? 'preview' : 'write')}
                    className="text-xs font-medium text-brand-accent hover:bg-brand-accent/10 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    {composeTab === 'write' ? `👁 ${t('forum.preview')}` : `✏️ ${t('forum.write')}`}
                  </button>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('forum.postTitlePlaceholder')}
                  className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                />
                {composeTab === 'preview' ? (
                  <div className="min-h-[96px] border border-brand-border rounded-xl py-3 px-4 bg-brand-surface/50">
                    {content.trim() ? (
                      <Markdown content={content} />
                    ) : (
                      <p className="text-sm text-brand-muted">{t('forum.noPosts')}</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('forum.postContentPlaceholder')}
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted resize-none"
                  />
                )}
                <p className="text-[11px] text-brand-muted -mt-1">{t('forum.markdownHint')}</p>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                  >
                    {FORUM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder={t('forum.tagsPlaceholder')}
                    className="w-full border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                  />
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-surface/40 p-3">
                  {!poll.enabled ? (
                    <button
                      type="button"
                      onClick={() => setPoll((p) => ({ ...p, enabled: true }))}
                      className="flex items-center gap-2 text-xs font-semibold text-brand-accent hover:bg-brand-accent/10 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      <BarChart2 size={14} />
                      + {t('forum.addPoll')}
                    </button>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wide">
                          <BarChart2 size={12} className="inline mr-1" />
                          {t('forum.pollBadge')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPoll({ enabled: false, question: '', options: ['', ''] })}
                          aria-label="Hapus kolom polling"
                          className="w-6 h-6 rounded-full flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={poll.question}
                        onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
                        placeholder={t('forum.pollQuestionPlaceholder')}
                        className="w-full border border-brand-border rounded-xl py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                      />
                      {poll.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => setPoll((p) => {
                              const options = [...p.options]
                              options[i] = e.target.value
                              return { ...p, options }
                            })}
                            placeholder={`${t('forum.pollOptionPlaceholder')} ${i + 1}`}
                            className="flex-1 border border-brand-border rounded-xl py-2.5 px-3 text-sm text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
                          />
                          {poll.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setPoll((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                              aria-label={`Hapus opsi ${i + 1}`}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={poll.options.length >= 4}
                        onClick={() => setPoll((p) => ({ ...p, options: [...p.options, ''] }))}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-accent/10 rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        <Plus size={13} />
                        {t('forum.addOption')}
                      </button>
                    </div>
                  )}
                </div>

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
                    {t('forum.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!session?.user && (
          <div className="bg-brand-surface/80 rounded-2xl shadow-sm border border-brand-border p-6 text-center">
            <Sparkles size={28} className="mx-auto text-brand-muted/30" />
            <p className="text-sm text-brand-muted mt-3 leading-relaxed">{t('forum.guestsTitle')}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-4 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200"
            >
              {t('forum.loginCta')}
            </button>
          </div>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetPagination() }}
            placeholder={t('forum.searchPlaceholder')}
            className="w-full border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-brand-text bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors placeholder:text-brand-muted"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          <button
            type="button"
            onClick={() => { setFilterCategory(''); setFilterTag(''); setFilterAuthor(''); resetPagination() }}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${!filterCategory && !filterTag && !filterAuthor
              ? 'bg-[#1E3A5F] text-white shadow-sm'
              : 'bg-white border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/30'}`}
          >
            {t('forum.filterAll')}
          </button>
          {FORUM_CATEGORIES.map(cat => {
            const count = posts.filter(p => p.category === cat).length
            const active = filterCategory === cat && !filterTag
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setFilterCategory(cat); setFilterTag(''); resetPagination() }}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${active
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/30'}`}
              >
                {cat}
                <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-brand-muted/60'}`}>({count})</span>
              </button>
            )
          })}
        </div>

        {activeTag && (
          <div className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-brand-accent">#{activeTag}</span>
            <button
              type="button"
              onClick={() => { setFilterTag(''); resetPagination() }}
              aria-label="Bersihkan filter tag"
              className="w-5 h-5 rounded-full flex items-center justify-center text-brand-accent hover:bg-brand-accent/20 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {activeAuthor && (
          <div className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 rounded-xl px-3 py-2">
            <User size={13} className="text-brand-accent shrink-0" />
            <span className="text-xs font-semibold text-brand-accent">
              {authorName || 'Author'}: {activeAuthor}
            </span>
            <button
              type="button"
              onClick={() => { setFilterAuthor(''); resetPagination() }}
              aria-label="Bersihkan filter pembuat"
              className="w-5 h-5 rounded-full flex items-center justify-center text-brand-accent hover:bg-brand-accent/20 transition-colors ml-auto"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {[
            { key: 'terbaru', label: t('forum.sortNewest') },
            { key: 'populer', label: t('forum.sortPopular') },
            { key: 'belum_dijawab', label: t('forum.sortUnanswered') },
          ].map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setSortMode(s.key); resetPagination() }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortMode === s.key
                ? 'bg-brand-accent/15 text-brand-accent'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-border/50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mx-auto">
              <MessageCircle size={32} className="text-brand-muted/40" />
            </div>
            <p className="text-sm font-semibold text-brand-text mt-4">{t('forum.emptyTitle')}</p>
            <p className="text-sm text-brand-muted mt-1">{t('forum.emptySubtitle')}</p>
            <button
              type="button"
              onClick={scrollToComposer}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:brightness-90 transition-all"
            >
              <Send size={14} />
              {t('forum.emptyCta')}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visiblePosts.map((post) => {
                const replies = post.forum_replies || []
                const commentCount = replies.length
                const sortedReplies = [...replies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                const latestReply = sortedReplies[0]
                const uniqueRepliers = Array.from(
                  new Map(replies.map(r => [r.author_id, r.profiles])).values()
                ).filter(Boolean)
                const authorName = post.profiles?.first_name || 'Anonymous'
                const isEditing = editingPostId === post.id
                const categoryColor = categoryColors[post.category] || 'bg-gray-100 text-gray-700'
                const totalReactions = reactionTotals[post.id]?.count || 0
                const topReaction = reactionTotals[post.id]
                  ? Object.entries(reactionTotals[post.id].by).sort((a, b) => b[1] - a[1])[0]?.[0]
                  : null
                const isHot = commentCount + totalReactions >= 5

                if (isEditing) {
                  return (
                    <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-brand-border border-l-4 border-l-brand-accent p-5 space-y-4">
                      <h3 className="text-sm font-bold text-brand-text">{t('forum.edit')} {t('forum.statsDiscussions')}</h3>
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
                          {t('forum.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-4 py-3 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-all"
                        >
                          {t('forum.cancel')}
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
                    className={`relative bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md hover:border-brand-accent/20 active:scale-[0.99] transition-all duration-200 cursor-pointer ${
                      post.is_pinned ? 'border-brand-accent/30 border-l-4 border-l-brand-accent' : 'border-brand-border'
                    }`}
                  >
                    {post.is_pinned && (
                      <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-brand-accent">
                        <Pin size={12} />
                        {t('forum.pinnedBadge')}
                      </div>
                    )}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {post.poll && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">
                              <BarChart2 size={10} />
                              {t('forum.pollBadge')}
                            </span>
                          )}
                          {post.solved_reply_id && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                              <Check size={10} />
                              {t('forum.solvedBadge')}
                            </span>
                          )}
                          {isHot && !post.is_pinned && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0">
                              <Flame size={10} />
                              {t('forum.hotBadge')}
                            </span>
                          )}
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColor}`}>{post.category || 'Umum'}</span>
                        </div>
                        <h3 className="text-base font-bold text-brand-text leading-snug mt-1">{post.title}</h3>
                        <p className="text-xs text-brand-muted mt-1">
                          {latestReply ? (
                            <>↳ {t('forum.replyingTo')} <span className="font-medium text-brand-accent">{latestReply.profiles?.first_name || 'Anonymous'}</span> {timeAgo(latestReply.created_at, i18n.language)}</>
                          ) : (
                            <>{authorName} &bull; {timeAgo(post.created_at, i18n.language)}</>
                          )}
                        </p>
                        <p className="text-sm text-brand-muted mt-2 leading-relaxed line-clamp-2">{post.content}</p>
                        {(post.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {post.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[11px] font-medium text-brand-accent bg-brand-accent/10 rounded-full px-2 py-0.5">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-center gap-2">
                        {(session?.user?.id === post.author_id || role === 'admin') && (
                          <div className="flex flex-col gap-1">
                            {role === 'admin' && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleTogglePin(post) }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${post.is_pinned ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10'}`}
                                title={t('forum.pinToggle')}
                                aria-label={t('forum.pinToggle')}
                              >
                                <Pin size={14} />
                              </button>
                            )}
                            {session?.user?.id === post.author_id && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleEditPost(e, post)}
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors"
                                  title={t('forum.edit')}
                                  aria-label={t('forum.edit')}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openDeleteModal(post.id) }}
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title={t('forum.delete')}
                                  aria-label={t('forum.delete')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleShare(post) }}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors"
                          title={t('forum.share')}
                          aria-label={t('forum.share')}
                        >
                          <Share2 size={14} />
                        </button>
                        <div className="flex items-center gap-1 text-xs text-brand-muted whitespace-nowrap">
                          <MessageCircle size={12} />
                          <span>{commentCount}</span>
                        </div>
                        {totalReactions > 0 && (
                          <div className="flex items-center gap-1 text-xs text-brand-muted whitespace-nowrap">
                            <span>{topReaction}</span>
                            <span>{totalReactions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-border/60">
                      <div className="flex -space-x-2">
                        {uniqueRepliers.slice(0, 3).map((replier) => (
                          <div
                            key={replier.id}
                            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: getAvatarColor(replier.id) }}
                            title={replier.first_name || 'Anonymous'}
                          >
                            {getInitials(replier.first_name)}
                          </div>
                        ))}
                        {uniqueRepliers.length > 3 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-brand-muted flex items-center justify-center text-white text-[10px] font-bold">
                            +{uniqueRepliers.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-brand-muted">
                        {commentCount > 0
                          ? `${commentCount} ${t('forum.statsReplies').toLowerCase()}`
                          : t('forum.sortUnanswered').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-brand-muted ml-auto">
                        <Eye size={12} />
                        {formatCount(post.views || 0)} {t('forum.viewsLabel')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredPosts.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount(c => c + POSTS_PER_PAGE)}
                className="w-full py-3 rounded-xl text-sm font-bold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/15 transition-colors"
              >
                {t('forum.loadMore')} ({filteredPosts.length - visibleCount})
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
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
        onConfirm={() => { setShowCancelConfirm(false); setIsComposing(false); setTitle(''); setContent(''); setCategory('Umum'); setTagsText(''); setPoll({ enabled: false, question: '', options: ['', ''] }) }}
        title={t('forum.cancelComposeTitle')}
        description={t('forum.cancelComposeDesc')}
        confirmText={t('forum.cancelComposeConfirm')}
        cancelText={t('forum.cancelComposeCancel')}
        icon={AlertTriangle}
        danger={false}
      />
    </div>
  )
}
