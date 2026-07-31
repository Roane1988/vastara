import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { parseImages, FALLBACK_IMAGE } from '../utils/images'
import ConfirmModal from './ConfirmModal'
import AdminAnalyticsCards from './AdminAnalyticsCards'
import AdminUserManagement from './AdminUserManagement'
import AdminAuditLog from './AdminAuditLog'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit Trail' },
]

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'Survei' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'rejected', label: 'Ditolak' },
]

const PAGE_SIZE = 10

function statusBadgeClass(status) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700'
  if (status === 'in_review') return 'bg-indigo-50 text-indigo-700'
  if (status === 'rejected') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

function statusLabel(status) {
  if (status === 'verified') return 'Verified'
  if (status === 'in_review') return 'Survei'
  if (status === 'rejected') return 'Ditolak'
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
  if (!property) return null
  const images = parseImages(property.image_url)
  const [imgIndex, setImgIndex] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-brand-surface rounded-2xl shadow-xl border border-brand-border overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <h2 className="font-bold text-brand-text truncate pr-4">{property.title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors shrink-0">
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
                    <button key={i} type="button" onClick={() => setImgIndex(i)} className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${i === imgIndex ? 'border-brand-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}>
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
  const { showToast, user, role } = useAuth()
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
  const [verifyLoading, setVerifyLoading] = useState(null)
  const [bulkVerifying, setBulkVerifying] = useState(false)

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [role, navigate])

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('properties')
        .select('*, profiles(first_name, whatsapp)')
        .order('created_at', { ascending: false })

      if (filterTab !== 'all') {
        query = query.eq('status', filterTab)
      }

      const { data, error } = await query

      if (!cancelledRef.current) {
        if (!error && data) {
          setProperties(data)
        } else if (error) {
          console.warn('Gagal memuat properti:', error.message)
        }
        setLoading(false)
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.warn('Gagal memuat properti:', err.message)
        setLoading(false)
      }
    }
  }, [filterTab])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    if (!cancelledRef.current) setSelectedIds(new Set())
  }, [filterTab])

  useEffect(() => {
    const channel = supabase
      .channel('admin-properties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'properties' }, (payload) => {
        if (payload.new && !cancelledRef.current) {
          fetchProperties()
          showToast('Properti baru masuk: ' + (payload.new.title || 'Tanpa judul'), 'info')
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'properties' }, () => {
        if (!cancelledRef.current) fetchProperties()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchProperties, showToast])

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

  useEffect(() => {
    if (safePage !== page) setPage(safePage)
  }, [safePage, page])

  async function insertAuditLog(actionType, targetType, targetId, targetDetail) {
    try {
      const adminName = user?.user_metadata?.first_name || user?.email || 'Admin'
      await supabase.from('audit_logs').insert({
        admin_id: user?.id, admin_name: adminName,
        action_type: actionType, target_type: targetType,
        target_id: targetId, target_detail: targetDetail,
      })
    } catch { /* audit must never block */ }
  }

  async function handleVerify(id) {
    setVerifyLoading(id)
    try {
      const { error } = await supabase.from('properties').update({ status: 'verified' }).eq('id', id)
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        const target = properties.find((p) => p.id === id)
        setProperties((prev) => prev.map((p) => p.id === id ? { ...p, status: 'verified' } : p))
        showToast('Properti berhasil diverifikasi', 'success')
        insertAuditLog('verify_property', 'property', id, { property_title: target?.title || '', property_price: target?.price || null })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) setVerifyLoading(null)
  }

  async function handleStartReview(id) {
    setVerifyLoading(id)
    try {
      const { error } = await supabase.from('properties').update({ status: 'in_review' }).eq('id', id)
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        const target = properties.find((p) => p.id === id)
        setProperties((prev) => prev.map((p) => p.id === id ? { ...p, status: 'in_review' } : p))
        showToast('Properti masuk antrian survei', 'success')
        insertAuditLog('start_review', 'property', id, { property_title: target?.title || '', property_price: target?.price || null })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) setVerifyLoading(null)
  }

  async function handleBulkVerify() {
    if (selectedIds.size === 0) return
    setBulkVerifying(true)
    const ids = Array.from(selectedIds)
    try {
      const { error } = await supabase.from('properties').update({ status: 'verified' }).in('id', ids)
      if (cancelledRef.current) return
      if (error) {
        showToast(error.message, 'error')
      } else {
        setProperties((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status: 'verified' } : p))
        showToast(`${ids.length} properti berhasil diverifikasi`, 'success')
        setSelectedIds(new Set())
        for (const id of ids) {
          const target = properties.find((p) => p.id === id)
          insertAuditLog('verify_property', 'property', id, { property_title: target?.title || '', property_price: target?.price || null })
        }
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) setBulkVerifying(false)
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
            <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0">
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

            <div className="mt-6 bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-1">
                  {FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => { setFilterTab(f.key); setPage(0) }}
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
                    <button type="button" onClick={handleBulkVerify} disabled={bulkVerifying}
                      className="whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-1.5">
                      {bulkVerifying ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      Verifikasi ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
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
                    <table className="w-full text-sm">
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
                          const waNumber = p.seller_whatsapp || p.profiles?.whatsapp || ''
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
                                  <button type="button" onClick={() => setPreviewProperty(p)}
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
                                    {waLink && (
                                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:text-green-700">WA</a>
                                    )}
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
                                      <button type="button" onClick={() => handleVerify(p.id)} disabled={verifyLoading === p.id}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-1">
                                        {verifyLoading === p.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                                        Setujui
                                      </button>
                                      {p.status === 'pending' && (
                                        <button type="button" onClick={() => handleStartReview(p.id)} disabled={verifyLoading === p.id}
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
                                  {p.status === 'rejected' && (
                                    <button type="button" onClick={() => handleRestore(p.id)}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-[0.97] transition-all">
                                      Pulihkan
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
                        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-text bg-brand-surface border border-brand-border hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Sebelumnya</button>
                        <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-text bg-brand-surface border border-brand-border hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Selanjutnya</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

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
    </div>
  )
}