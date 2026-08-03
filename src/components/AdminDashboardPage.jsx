import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { parseImages, FALLBACK_IMAGE } from '../utils/images'
import ConfirmModal from './ConfirmModal'
import AdminAnalyticsCards from './AdminAnalyticsCards'
import AdminUserManagement from './AdminUserManagement'
import AdminAuditLog from './AdminAuditLog'
import AdminAgentApplications from './AdminAgentApplications'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'agents', label: 'Agen' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit Trail' },
]

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'Survei' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'sold', label: 'Terjual' },
  { key: 'rejected', label: 'Ditolak' },
]

const PAGE_SIZE = 10

function statusBadgeClass(status) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700'
  if (status === 'in_review') return 'bg-indigo-50 text-indigo-700'
  if (status === 'rejected') return 'bg-red-50 text-red-700'
  if (status === 'sold') return 'bg-gray-100 text-gray-600'
  return 'bg-amber-50 text-amber-700'
}

function statusLabel(status) {
  if (status === 'verified') return 'Verified'
  if (status === 'in_review') return 'Survei'
  if (status === 'rejected') return 'Ditolak'
  if (status === 'sold') return 'Terjual'
  return 'Pending'
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function PropertyPreviewModal({ property, onClose }) {
  const [imgIndex, setImgIndex] = useState(0)
  if (!property) return null
  const images = parseImages(property.image_url)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <h2 className="font-bold text-brand-text truncate pr-4">{property.title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup pratinjau" className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {images.length > 0 && (
            <div>
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-brand-bg border border-brand-border">
                <img src={images[imgIndex] || FALLBACK_IMAGE} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = FALLBACK_IMAGE }} />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {images.map((url, i) => (
                    <button key={i} type="button" onClick={() => setImgIndex(i)} aria-label={`Lihat gambar ${i + 1}`} className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${i === imgIndex ? 'border-brand-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = FALLBACK_IMAGE }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Harga</p>
              <p className="font-bold text-brand-text">{formatPrice(property.price)}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Status</p>
              <span className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(property.status)}`}>{statusLabel(property.status)}</span>
            </div>
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Tipe</p>
              <p className="font-semibold text-brand-text">{property.property_type || '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Kategori</p>
              <p className="font-semibold text-brand-text">{property.category || '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Luas / KT / KM</p>
              <p className="font-semibold text-brand-text">{property.area_sqm || '-'} m&sup2; / {property.bedrooms || 0} KT / {property.bathrooms || 0} KM</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted">Sertifikat</p>
              <p className="font-semibold text-brand-text">{property.certificate_status || '-'}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
            <p className="text-xs text-brand-muted mb-1">Alamat</p>
            <p className="text-sm text-brand-text">{[property.address, property.city, property.district].filter(Boolean).join(', ') || '-'}</p>
          </div>
          {property.description_id && (
            <div className="p-3 rounded-xl bg-brand-bg border border-brand-border">
              <p className="text-xs text-brand-muted mb-1">Deskripsi</p>
              <p className="text-sm text-brand-text leading-relaxed">{property.description_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { showToast, role } = useAuth()
  const cancelledRef = useRef(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [filterTab, setFilterTab] = useState('all')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [previewProperty, setPreviewProperty] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [statusCounts, setStatusCounts] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [role, navigate])

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  const fetchStatusCounts = useCallback(async () => {
    try {
      const [verified, pending, sold] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      ])
      if (cancelledRef.current) return
      setStatusCounts({
        verified: verified.count ?? 0,
        pending: pending.count ?? 0,
        sold: sold.count ?? 0,
      })
    } catch (err) {
      if (!cancelledRef.current) {
        console.warn('Gagal memuat distribusi status:', err.message)
        setStatusCounts({ verified: 0, pending: 0, sold: 0 })
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatusCounts()
  }, [fetchStatusCounts])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      let query = supabase
        .from('properties')
        .select('*, profiles!seller_id(first_name)')
        .order('created_at', { ascending: false })

      if (filterTab !== 'all') {
        query = query.eq('status', filterTab)
      }

      const { data, error } = await query

      if (!cancelledRef.current) {
        if (error) {
          setLoadError(error.message)
        } else {
          setProperties(data || [])
        }
        setLoading(false)
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setLoadError(err.message || 'Gagal memuat properti.')
        setLoading(false)
      }
    }
  }, [filterTab])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    const channel = supabase
      .channel('admin-properties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'properties' }, (payload) => {
        if (payload.new && !cancelledRef.current) {
          fetchProperties()
          fetchStatusCounts()
          showToast('Properti baru masuk: ' + (payload.new.title || 'Tanpa judul'), 'info')
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'properties' }, () => {
        if (!cancelledRef.current) {
          fetchProperties()
          fetchStatusCounts()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchProperties, fetchStatusCounts, showToast])

  const filtered = useMemo(() => {
    if (!search.trim()) return properties
    const q = search.toLowerCase()
    return properties.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.property_type || '').toLowerCase().includes(q) ||
      (p.profiles?.first_name || '').toLowerCase().includes(q)
    )
  }, [properties, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  async function insertAuditLog(actionType, targetType, targetId, targetDetail) {
    try {
      await supabase.rpc('record_audit', {
        p_action_type: actionType,
        p_target_type: targetType,
        p_target_id: targetId,
        p_target_detail: targetDetail,
      })
    } catch { /* audit must never block */ }
  }

  async function applyStatusChange(ids, newStatus, toastMessage, auditAction, prevMap) {
    const { error } = await supabase.from('properties').update({ status: newStatus }).in('id', ids)
    if (cancelledRef.current) return false
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    setProperties((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status: newStatus } : p))
    showToast(toastMessage, 'success', {
      label: 'Undo',
      onClick: () => undoStatusChange(ids, prevMap),
    })
    for (const id of ids) {
      const target = properties.find((p) => p.id === id)
      insertAuditLog(auditAction, 'property', id, { property_title: target?.title || '', property_price: target?.price || null })
    }
    return true
  }

  async function undoStatusChange(ids, prevMap) {
    const grouped = {}
    ids.forEach((id) => {
      const status = prevMap[id] || 'pending'
      ;(grouped[status] ||= []).push(id)
    })
    for (const status of Object.keys(grouped)) {
      const { error } = await supabase.from('properties').update({ status }).in('id', grouped[status])
      if (error) { showToast(error.message, 'error'); return }
    }
    setProperties((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status: prevMap[p.id] || 'pending' } : p))
    showToast('Aksi dibatalkan', 'success')
  }

  const openConfirm = (type, ids) => {
    const prevMap = {}
    properties.forEach((p) => { if (ids.includes(p.id)) prevMap[p.id] = p.status })
    setConfirmAction({ type, ids, prevMap })
  }

  async function handleConfirmAction() {
    if (!confirmAction) return
    const { type, ids, prevMap } = confirmAction
    setConfirming(true)
    let newStatus, toastMessage, auditAction
    if (type === 'review') {
      newStatus = 'in_review'
      auditAction = 'start_review'
      toastMessage = ids.length > 1 ? `${ids.length} properti masuk antrian survei` : 'Properti masuk antrian survei'
    } else {
      newStatus = 'verified'
      auditAction = 'verify_property'
      toastMessage = ids.length > 1 ? `${ids.length} properti berhasil diverifikasi` : 'Properti berhasil diverifikasi'
    }
    const ok = await applyStatusChange(ids, newStatus, toastMessage, auditAction, prevMap)
    if (cancelledRef.current) return
    if (ok) {
      setConfirmAction(null)
      if (type === 'bulkVerify') setSelectedIds(new Set())
    }
    setConfirming(false)
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return
    setRejecting(true)
    const targetId = rejectTarget
    const target = properties.find((p) => p.id === targetId)
    try {
      const { error } = await supabase.from('properties').update({ status: 'rejected' }).eq('id', targetId)
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        setProperties((prev) => prev.map((p) => p.id === targetId ? { ...p, status: 'rejected' } : p))
        showToast('Properti ditolak', 'success')
        insertAuditLog('reject_property', 'property', targetId, {
          property_title: target?.title || '',
          property_price: target?.price || null,
          reason: rejectReason || undefined,
        })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) {
      setRejecting(false)
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  async function handleRestore(id) {
    try {
      const { error } = await supabase.from('properties').update({ status: 'pending' }).eq('id', id)
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        setProperties((prev) => prev.map((p) => p.id === id ? { ...p, status: 'pending' } : p))
        showToast('Properti dikembalikan ke antrian pending', 'success')
        insertAuditLog('restore_property', 'property', id, {})
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paged.map((p) => p.id)))
    }
  }

  if (role !== 'admin') return null

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Kembali" className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-lg font-bold text-brand-text">Internal Dashboard</h1>
              <p className="text-xs text-brand-muted">{loading ? 'Memuat...' : `${filtered.length} properti`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              properties.filter((p) => p.status === 'pending').length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${properties.filter((p) => p.status === 'pending').length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {properties.filter((p) => p.status === 'pending').length} Pending
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 -mb-px">
            {TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-text'
                }`}>
                {tab.label}
                {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        {activeTab === 'overview' && (
          <>
            <AdminAnalyticsCards />

            <div className="mt-6">
              <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-brand-text">Distribusi Status Properti</h3>
                    <p className="text-xs text-brand-muted mt-0.5">Verified, Pending, dan Terjual</p>
                  </div>
                </div>
                {statusCounts ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Verified', value: statusCounts.verified },
                            { name: 'Pending', value: statusCounts.pending },
                            { name: 'Sold', value: statusCounts.sold },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          stroke="var(--color-brand-surface)"
                          strokeWidth={2}
                        >
                          <Cell fill="var(--color-brand-verified)" />
                          <Cell fill="var(--color-brand-pending)" />
                          <Cell fill="var(--color-brand-sold)" />
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} properti`, name]}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid var(--color-brand-border)',
                            background: 'var(--color-brand-surface)',
                            fontSize: 12,
                            color: 'var(--color-brand-text)',
                          }}
                          itemStyle={{ color: 'var(--color-brand-text)' }}
                          labelStyle={{ color: 'var(--color-brand-muted)' }}
                        />
                        <Legend
                          formatter={(value) => <span className="text-xs text-brand-muted">{value}</span>}
                          iconSize={10}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-1">
                  {FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => { setFilterTab(f.key); setPage(0); setSelectedIds(new Set()) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filterTab === f.key ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <input type="text" placeholder="Cari properti..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                    className="w-full sm:w-48 py-2 px-3 text-xs bg-brand-bg border border-brand-border rounded-lg placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
                  {selectedIds.size > 0 && filterTab === 'pending' && (
                    <button type="button" onClick={() => openConfirm('bulkVerify', Array.from(selectedIds))} disabled={confirming}
                      className="whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-1.5">
                      {confirming ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      Verifikasi ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400 mb-4">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-sm font-semibold text-brand-text">Gagal memuat properti</p>
                  <p className="text-xs text-brand-muted mt-1 mb-5 max-w-xs">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchProperties}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-muted/50 mb-4">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-sm text-brand-muted">Tidak ada properti {filterTab !== 'all' ? `dengan status "${filterTab}"` : ''}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-brand-border bg-brand-bg/50">
                          <th className="px-3 py-4 w-10">
                            <input type="checkbox" checked={paged.length > 0 && selectedIds.size === paged.length} onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent/30 cursor-pointer" />
                          </th>
                          <th className="text-left font-semibold text-brand-muted px-3 py-4 whitespace-nowrap">Properti</th>
                          <th className="text-right font-semibold text-brand-muted px-3 py-4 whitespace-nowrap">Harga</th>
                          <th className="text-left font-semibold text-brand-muted px-3 py-4 whitespace-nowrap hidden sm:table-cell">Penjual</th>
                          <th className="text-left font-semibold text-brand-muted px-3 py-4 whitespace-nowrap hidden md:table-cell">Status</th>
                          <th className="text-right font-semibold text-brand-muted px-3 py-4 whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {paged.map((p) => {
                          const images = parseImages(p.image_url)
                          const sellerName = p.profiles?.first_name || 'Anonymous'
                          const waNumber = p.seller_whatsapp || ''
                          const waLink = waNumber ? `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}` : null
                          const dateStr = p.created_at
                            ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '-'

                          return (
                            <tr key={p.id} className="hover:bg-brand-bg/50 transition-colors">
                              <td className="px-3 py-4">
                                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                                  className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent/30 cursor-pointer" />
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex items-center gap-3">
                                  <button type="button" disabled={confirming} onClick={() => setPreviewProperty(p)} aria-label={`Lihat detail ${p.title || 'properti'}`}
                                    className="w-10 h-10 rounded-lg overflow-hidden bg-brand-bg border border-brand-border shrink-0 hover:opacity-80 transition-opacity">
                                    <img src={images[0] || FALLBACK_IMAGE} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = FALLBACK_IMAGE }} />
                                  </button>
                                  <div className="min-w-0">
                                    <button type="button" onClick={() => setPreviewProperty(p)}
                                      className="font-semibold text-brand-text hover:text-brand-accent transition-colors text-left truncate block max-w-[200px]">
                                      {p.title}
                                    </button>
                                    <div className="flex gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-bg text-brand-muted border border-brand-border">
                                        {p.property_type || 'Properti'}
                                      </span>
                                      <span className="text-[10px] text-brand-muted">{dateStr}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-right font-bold text-brand-text">{formatPrice(p.price)}</td>
                              <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-[10px] font-bold shrink-0">
                                    {sellerName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-brand-text truncate max-w-[100px]">{sellerName}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {p.seller_type === 'agent' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">AGEN</span>
                                      )}
                                      {p.seller_type === 'developer' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#284D7A]/10 text-[#284D7A] border border-[#284D7A]/20">DEVELOPER</span>
                                      )}
                                      {waLink && (
                                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:text-green-700">WA</a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                                <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${statusBadgeClass(p.status)}`}>
                                  {statusLabel(p.status)}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {(p.status === 'pending' || p.status === 'in_review') && (
                                    <>
                                      <button type="button" onClick={() => openConfirm('verify', [p.id])} disabled={confirming}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-1">
                                        {confirming ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                                        Setujui
                                      </button>
                                      {p.status === 'pending' && (
                                        <button type="button" onClick={() => openConfirm('review', [p.id])} disabled={confirming}
                                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 active:scale-[0.97] transition-all">
                                          Survei
                                        </button>
                                      )}
                                      <button type="button" onClick={() => { setRejectTarget(p.id); setRejectReason('') }}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-[0.97] transition-all">
                                        Tolak
                                      </button>
                                    </>
                                  )}
                                  {(p.status === 'rejected' || p.status === 'sold') && (
                                    <button type="button" onClick={() => handleRestore(p.id)}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-[0.97] transition-all">
                                      {p.status === 'sold' ? 'Aktifkan Lagi' : 'Pulihkan'}
                                    </button>
                                  )}
                                  {p.status === 'verified' && (
                                    <span className="text-[11px] text-brand-muted">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-brand-border bg-brand-bg/30">
                      <p className="text-xs text-brand-muted">{safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length}</p>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-text bg-brand-surface border border-brand-border hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Sebelumnya</button>
                        <button type="button" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-text bg-brand-surface border border-brand-border hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Selanjutnya</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'agents' && <AdminAgentApplications />}
        {activeTab === 'users' && <AdminUserManagement />}
        {activeTab === 'audit' && <AdminAuditLog />}
      </div>

      {previewProperty && (
        <PropertyPreviewModal property={previewProperty} onClose={() => setPreviewProperty(null)} />
      )}

      <ConfirmModal
        isOpen={rejectTarget !== null}
        onClose={() => !rejecting && setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title="Tolak Properti"
        description="Properti akan ditandai sebagai ditolak. Penjual dapat mengirim ulang setelah diperbaiki."
        confirmText="Ya, Tolak"
        cancelText="Batal"
        loading={rejecting}
        danger={false}
        icon={() => (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
          confirmDisabled={!rejectReason.trim()}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Alasan penolakan (wajib diisi)..."
          rows={3}
          className="w-full py-3 px-4 text-sm text-brand-text bg-brand-bg border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
        />
      </ConfirmModal>

      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => !confirming && setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === 'review'
            ? 'Mulai Survei'
            : confirmAction?.type === 'bulkVerify'
              ? `Verifikasi ${confirmAction.ids.length} Properti`
              : 'Setujui Properti'
        }
        description={
          confirmAction?.type === 'review'
            ? 'Properti akan masuk antrian survei lokasi. Lanjutkan?'
            : `Properti akan diverifikasi dan langsung tayang untuk publik${confirmAction?.type === 'bulkVerify' ? ` (${confirmAction.ids.length} terpilih)` : ''}. Lanjutkan?`
        }
        confirmText={
          confirmAction?.type === 'review'
            ? 'Ya, Mulai Survei'
            : confirmAction?.type === 'bulkVerify'
              ? `Ya, Verifikasi ${confirmAction.ids.length}`
              : 'Ya, Setujui'
        }
        cancelText="Batal"
        loading={confirming}
        danger={false}
      />
    </div>
  )
}