import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Flag, Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { parseImages, FALLBACK_IMAGE } from '../utils/images'
import { formatPrice } from '../utils/format'
import ConfirmModal from './ConfirmModal'

const REASON_LABELS = {
  penipuan: 'Iklan penipuan / palsu',
  harga: 'Harga tidak wajar',
  terjual: 'Properti sudah terjual / tidak tersedia',
  duplikat: 'Iklan duplikat',
  lokasi: 'Lokasi / foto tidak sesuai',
  lainnya: 'Lainnya',
}

function statusBadgeClass(status) {
  if (status === 'actioned') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'dismissed') return 'bg-gray-100 text-gray-500 border-gray-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function statusLabel(status) {
  if (status === 'actioned') return 'Diproses'
  if (status === 'dismissed') return 'Ditutup'
  return 'Pending'
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPropertyReports() {
  const { showToast, user } = useAuth()
  const cancelledRef = useRef(false)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [reloadKey, setReloadKey] = useState(0)
  const [processingId, setProcessingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [dismissTarget, setDismissTarget] = useState(null)

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        let query = supabase
          .from('property_reports')
          .select('*, properties(title, city, district, price, image_url, status), profiles!reporter_id(first_name)')
          .order('created_at', { ascending: false })
        if (filter !== 'all') query = query.eq('status', filter)
        const { data, error } = await query
        if (!active) return
        if (error) {
          console.warn('Gagal memuat laporan:', error.message)
        } else {
          setReports(data || [])
        }
      } catch (err) {
        if (active) console.warn('Gagal memuat laporan:', err.message)
      }
      if (active) setLoading(false)
    }

    load()

    return () => { active = false }
  }, [filter, reloadKey])

  async function insertAuditLog(actionType, targetType, targetId, targetDetail) {
    try {
      const { error } = await supabase.rpc('record_audit', {
        p_action_type: actionType,
        p_target_type: targetType,
        p_target_id: targetId,
        p_target_detail: targetDetail,
      })
      if (error) {
        console.warn('Audit gagal dicatat:', error.message)
        showToast('Audit gagal dicatat: ' + error.message, 'error')
      }
    } catch (err) {
      console.warn('Audit gagal dicatat:', err.message)
      showToast('Audit gagal dicatat: ' + err.message, 'error')
    }
  }

  async function deletePropertyImages(report) {
    const prop = report.properties
    if (!prop?.image_url) return
    const paths = parseImages(prop.image_url)
      .map((url) => {
        const m = String(url).match(/\/object\/public\/PROPERTIES_IMAGE\/(.+)$/)
        return m ? m[1] : null
      })
      .filter(Boolean)
    if (paths.length === 0) return
    try {
      await supabase.storage.from('PROPERTIES_IMAGE').remove(paths)
    } catch {
      /* best effort: foto yatim tidak menghalangi proses hapus */
    }
  }

  async function handleConfirmDelete() {
    const report = reports.find((r) => r.id === deleteTarget)
    if (!report) return
    setProcessingId(report.id)
    try {
      await deletePropertyImages(report)

      const { error: propError } = await supabase
        .from('properties')
        .delete()
        .eq('id', report.property_id)

      if (cancelledRef.current) return

      if (propError) {
        showToast(propError.message, 'error')
      } else {
        const { error: reportError } = await supabase
          .from('property_reports')
          .update({ status: 'actioned', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .eq('id', report.id)

        if (cancelledRef.current) return

        setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: 'actioned', reviewed_at: new Date().toISOString() } : r))
        showToast(`Listing "${report.properties?.title || ''}" dihapus`, 'success')
        insertAuditLog('delete_property', 'property', report.property_id, {
          title: report.properties?.title || '',
          city: report.properties?.city || '',
          report_id: report.id,
          reason: report.reason,
        })
        if (reportError) console.warn('Gagal memperbarui status laporan:', reportError.message)
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal menghapus listing', 'error')
    }
    if (!cancelledRef.current) {
      setProcessingId(null)
      setDeleteTarget(null)
    }
  }

  async function handleConfirmDismiss() {
    if (!dismissTarget) return
    setProcessingId(dismissTarget)
    const report = reports.find((r) => r.id === dismissTarget)
    try {
      const { error } = await supabase
        .from('property_reports')
        .update({ status: 'dismissed', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', dismissTarget)

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        setReports((prev) => prev.map((r) => r.id === dismissTarget ? { ...r, status: 'dismissed', reviewed_at: new Date().toISOString() } : r))
        showToast('Laporan ditutup (tidak ditindaklanjuti)', 'success')
        insertAuditLog('dismiss_report', 'property_report', dismissTarget, {
          property_id: report?.property_id || '',
          reason: report?.reason || '',
        })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal menutup laporan', 'error')
    }
    if (!cancelledRef.current) {
      setProcessingId(null)
      setDismissTarget(null)
    }
  }

  const FILTERS = [
    { key: 'pending', label: 'Pending' },
    { key: 'actioned', label: 'Diproses' },
    { key: 'dismissed', label: 'Ditutup' },
    { key: 'all', label: 'Semua' },
  ]

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-brand-text">Laporan Iklan</h2>
            <p className="text-xs text-brand-muted mt-0.5">Laporan dari pengguna tentang properti yang mencurigakan.</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text transition-colors self-start"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-brand-bg text-brand-muted border-brand-border hover:text-brand-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-bg flex items-center justify-center mb-4">
            <Flag size={24} className="text-brand-muted/50" />
          </div>
          <p className="text-sm font-semibold text-brand-text">Tidak ada laporan</p>
          <p className="text-xs text-brand-muted mt-1">Laporan pengguna tentang iklan akan muncul di sini.</p>
        </div>
      ) : (
        <div className="divide-y divide-brand-border">
          {reports.map((r) => {
            const prop = r.properties
            return (
              <div key={r.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-border/30 shrink-0">
                      <img
                        src={parseImages(prop?.image_url)?.[0] || FALLBACK_IMAGE}
                        alt={prop?.title || 'Properti'}
                        onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-text truncate">{prop?.title || '(properti telah dihapus)'}</p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {[prop?.district, prop?.city].filter(Boolean).join(', ') || '-'}
                        {prop?.price > 0 && <span className="font-semibold text-brand-text"> · {formatPrice(prop.price)}</span>}
                      </p>
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-200 inline-block">
                        <b>{REASON_LABELS[r.reason] || r.reason}</b>
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-brand-muted">
                        <p>Pelapor: <b className="text-brand-text">{r.profiles?.first_name || 'Pengguna'}</b> · {formatDate(r.created_at)}</p>
                        {r.note && (
                          <p className="bg-brand-bg rounded-lg px-3 py-2 border border-brand-border">
                            <span className="font-semibold text-brand-text">Catatan: </span>{r.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                    {r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r.id)}
                          disabled={processingId === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-[0.97] transition-all disabled:opacity-50"
                          title="Hapus listing dari database"
                        >
                          {processingId === r.id ? <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                          Hapus Listing
                        </button>
                        <button
                          type="button"
                          onClick={() => setDismissTarget(r.id)}
                          disabled={processingId === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-brand-muted bg-brand-bg border border-brand-border hover:text-brand-text active:scale-[0.97] transition-all disabled:opacity-50"
                          title="Tidak ditindaklanjuti"
                        >
                          <XCircle size={13} />
                          Tutup
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => !processingId && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Listing"
        description="Listing ini akan dihapus permanen dari database (termasuk leads, jadwal survei, dan favorit terkait). Foto di storage juga akan dihapus. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, Hapus Listing"
        cancelText="Batal"
        loading={processingId === deleteTarget}
        danger
        icon={() => <Trash2 size={24} className="text-red-500" />}
      />

      <ConfirmModal
        isOpen={dismissTarget !== null}
        onClose={() => !processingId && setDismissTarget(null)}
        onConfirm={handleConfirmDismiss}
        title="Tutup Laporan"
        description="Laporan ini akan ditandai sebagai tidak ditindaklanjuti. Listing tetap aktif."
        confirmText="Ya, Tutup"
        cancelText="Batal"
        loading={processingId === dismissTarget}
        danger={false}
        icon={() => <CheckCircle2 size={24} className="text-amber-500" />}
      />
    </div>
  )
}
