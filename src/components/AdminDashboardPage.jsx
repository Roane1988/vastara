import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import ConfirmModal from './ConfirmModal'
import AdminAnalyticsCards from './AdminAnalyticsCards'
import AdminUserManagement from './AdminUserManagement'
import AdminAuditLog from './AdminAuditLog'

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit Trail' },
]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { showToast, user, role } = useAuth()
  const cancelledRef = useRef(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(null)

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
  }, [role, navigate])

  useEffect(() => {
    let cancelled = false

    async function fetchPending() {
      if (!cancelled) setLoading(true)
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*, profiles(first_name, whatsapp)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (!cancelled) {
          if (!error && data) {
            setProperties(data)
          } else if (error) {
            console.warn('Gagal memuat properti pending:', error.message)
          }
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Gagal memuat properti pending:', err.message)
          setLoading(false)
        }
      }
    }

    fetchPending()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

  async function insertAuditLog(actionType, targetType, targetId, targetDetail) {
    try {
      const adminName = user?.user_metadata?.first_name || user?.email || 'Admin'
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        admin_name: adminName,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        target_detail: targetDetail,
      })
    } catch {
      /* audit logging must never block the main operation */
    }
  }

  async function handleVerify(id) {
    setVerifyLoading(id)
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'verified' })
        .eq('id', id)

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        const target = properties.find((p) => p.id === id)
        setProperties((prev) => prev.filter((p) => p.id !== id))
        showToast('Properti berhasil diverifikasi & diterbitkan', 'success')
        insertAuditLog('verify_property', 'property', id, {
          property_title: target?.title || '',
          property_price: target?.price || null,
        })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal memverifikasi properti', 'error')
    }
    if (!cancelledRef.current) setVerifyLoading(null)
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return
    setRejecting(true)
    const targetId = rejectTarget
    const target = properties.find((p) => p.id === targetId)
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', targetId)

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setProperties((prev) => prev.filter((p) => p.id !== targetId))
        showToast('Properti berhasil ditolak & dihapus', 'success')
        insertAuditLog('reject_property', 'property', targetId, {
          property_title: target?.title || '',
          property_price: target?.price || null,
        })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal menolak properti', 'error')
    }
    if (!cancelledRef.current) {
      setRejecting(false)
      setRejectTarget(null)
    }
  }

  if (role !== 'admin') return null

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-lg font-bold text-brand-text">Internal Dashboard</h1>
              <p className="text-xs text-brand-muted">{loading ? 'Memuat...' : `${properties.length} properti menunggu verifikasi`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {properties.length} Pending
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-brand-secondary'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-secondary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        {activeTab === 'overview' && (
          <>
            <AdminAnalyticsCards />

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-brand-surface rounded-2xl shadow-sm border border-brand-border">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 mb-4">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <h2 className="text-lg font-bold text-brand-text">Semua properti sudah terverifikasi</h2>
                <p className="text-sm text-brand-muted mt-1">Tidak ada properti yang menunggu verifikasi.</p>
              </div>
            ) : (
              <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
                <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
                  <h2 className="text-base font-bold text-brand-text">Verifikasi Properti</h2>
                  <span className="text-xs text-brand-muted">{properties.length} menunggu</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border bg-brand-bg/50">
                        <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Tanggal</th>
                        <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Judul Properti</th>
                        <th className="text-right font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Harga</th>
                        <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Penjual</th>
                        <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Kontak</th>
                        <th className="text-right font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {properties.map((p) => {
                        const sellerName = p.profiles?.first_name || 'Anonymous'
                        const waNumber = p.seller_whatsapp || p.profiles?.whatsapp || ''
                        const waLink = waNumber ? `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}` : null
                        const dateStr = p.created_at
                          ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '-'

                        return (
                          <tr key={p.id} className="hover:bg-brand-bg/50 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap text-brand-muted">{dateStr}</td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => navigate(`/property/${p.id}`)}
                                className="font-semibold text-brand-text hover:text-brand-secondary transition-colors text-left"
                              >
                                {p.title}
                              </button>
                              <div className="flex gap-1.5 mt-1">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted border border-brand-border">
                                  {p.property_type || 'Properti'}
                                </span>
                                {p.bedrooms != null && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted border border-brand-border">
                                    {p.bedrooms} KT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right font-bold text-brand-text">
                              {formatPrice(p.price)}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary text-xs font-bold shrink-0">
                                  {sellerName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-brand-text">{sellerName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {waLink ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                  <span className="text-xs">Hubungi</span>
                                </a>
                              ) : (
                                <span className="text-xs text-brand-muted">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleVerify(p.id)}
                                  disabled={verifyLoading === p.id}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {verifyLoading === p.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                  {verifyLoading === p.id ? '...' : 'Verifikasi & Terbitkan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectTarget(p.id)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-[0.97] transition-all duration-200"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  Tolak
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <AdminUserManagement />
        )}

        {activeTab === 'audit' && (
          <AdminAuditLog />
        )}
      </div>

      <ConfirmModal
        isOpen={rejectTarget !== null}
        onClose={() => !rejecting && setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title="Tolak Properti"
        description="Properti ini akan dihapus permanen. Penjual akan diberitahu melalui sistem. Lanjutkan?"
        confirmText="Ya, Tolak"
        cancelText="Batal"
        loading={rejecting}
      />
    </div>
  )
}
