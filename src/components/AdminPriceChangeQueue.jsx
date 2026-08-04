import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { timeAgo } from '../utils/time'
import ConfirmModal from './ConfirmModal'
import { RefreshCw, Check, X, AlertCircle } from 'lucide-react'

const THRESHOLD = 0.15

function deltaPct(oldPrice, newPrice) {
  if (!oldPrice) return null
  return ((newPrice - oldPrice) / oldPrice) * 100
}

export default function AdminPriceChangeQueue() {
  const { showToast } = useAuth()
  const cancelledRef = useRef(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    cancelledRef.current = false

    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, city, district, price, price_requested, price_change_status, price_requested_at, seller_id, seller_type')
          .eq('price_change_status', 'pending')
          .order('price_requested_at', { ascending: true })

        if (cancelledRef.current) return

        if (error) {
          setLoadError(error.message)
        } else {
          setRequests(data || [])
        }
      } catch (err) {
        if (!cancelledRef.current) setLoadError(err.message || 'Gagal memuat permintaan harga.')
      }
      if (!cancelledRef.current) setLoading(false)
    }

    load()
    return () => { cancelledRef.current = true }
  }, [reloadKey])

  async function handleConfirm(action, property) {
    setBusyId(property.id)

    try {
      if (action === 'approve') {
        const { error } = await supabase
          .from('properties')
          .update({
            price: property.price_requested,
            price_change_status: 'approved',
            price_requested: null,
            price_reviewed_at: new Date().toISOString(),
          })
          .eq('id', property.id)
        if (cancelledRef.current) return
        if (error) {
          showToast(error.message, 'error')
          setBusyId(null)
          return
        }
      } else {
        const { error } = await supabase
          .from('properties')
          .update({
            price_change_status: 'rejected',
            price_requested: null,
            price_reviewed_at: new Date().toISOString(),
          })
          .eq('id', property.id)
        if (cancelledRef.current) return
        if (error) {
          showToast(error.message, 'error')
          setBusyId(null)
          return
        }
      }

      const { error: auditError } = await supabase.rpc('record_audit', {
        p_action_type: action === 'approve' ? 'approve_price_change' : 'reject_price_change',
        p_target_type: 'property',
        p_target_id: property.id,
        p_target_detail: {
          property_title: property.title,
          old_price: property.price,
          new_price: property.price_requested,
          requested_at: property.price_requested_at,
          reason: reason || null,
        },
      })

      if (cancelledRef.current) return

      if (auditError) {
        showToast(`${action === 'approve' ? 'Harga disetujui' : 'Permintaan ditolak'}, tapi audit gagal dicatat: ` + auditError.message, 'error')
      } else {
        showToast(action === 'approve' ? 'Harga baru disetujui' : 'Permintaan ditolak', 'success')
      }

      setReason('')
      setPendingAction(null)
      setReloadKey((k) => k + 1)
      setBusyId(null)
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Terjadi kesalahan.', 'error')
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-brand-text">Perubahan Harga</h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Permintaan ubah harga di luar ambang {THRESHOLD * 100}%. Setujui untuk menerapkan harga baru, atau tolak untuk mempertahankan harga lama.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap self-start sm:self-auto">
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text hover:bg-brand-bg/70 transition-colors">
            <RefreshCw size={13} />
            Refresh
          </button>
          <span className="text-xs text-brand-muted">{requests.length} menunggu</span>
        </div>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <p className="text-sm font-semibold text-brand-text">Gagal memuat permintaan</p>
          <p className="text-xs text-brand-muted mt-1 mb-5 max-w-xs">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all">
            Coba Lagi
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <p className="text-sm font-semibold text-brand-text">Tidak ada permintaan menunggu</p>
          <p className="text-xs text-brand-muted mt-1 max-w-xs">Saat seller mengubah harga melebihi {THRESHOLD * 100}%, permintaannya akan muncul di sini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Properti</th>
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Harga Lama</th>
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Harga Diminta</th>
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Perubahan</th>
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Diminta</th>
                <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const dp = deltaPct(r.price, r.price_requested)
                const up = dp >= 0
                return (
                  <tr key={r.id} className="border-b border-brand-border last:border-0 hover:bg-brand-bg/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-text">{r.title || 'Tanpa judul'}</p>
                      <p className="text-xs text-brand-muted">{r.city ? r.city : ''} {r.city && r.district ? '· ' : ''}{r.district || ''}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-brand-muted line-through">{formatPrice(r.price)}</td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-brand-text">{formatPrice(r.price_requested)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${up ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {dp == null ? 'n/a' : `${up ? '+' : ''}${dp.toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-brand-muted">{r.price_requested_at ? timeAgo(r.price_requested_at) : '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => setPendingAction({ action: 'approve', property: r })}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:brightness-90 active:scale-[0.98] disabled:opacity-50 transition-all"
                        >
                          <Check size={13} /> Setujui
                        </button>
                        <button
                          type="button"
                          disabled={!!busyId}
                          onClick={() => setPendingAction({ action: 'reject', property: r })}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:brightness-90 active:scale-[0.98] disabled:opacity-50 transition-all"
                        >
                          <X size={13} /> Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pendingAction && (
        <ConfirmModal
          isOpen
          onClose={() => setPendingAction(null)}
          onConfirm={() => handleConfirm(pendingAction.action, pendingAction.property)}
          title={pendingAction.action === 'approve' ? 'Setujui Perubahan Harga' : 'Tolak Perubahan Harga'}
          confirmText={pendingAction.action === 'approve' ? 'Setujui' : 'Tolak'}
          danger={pendingAction.action !== 'approve'}
          loading={!!busyId}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-brand-bg border border-brand-border p-3 text-sm">
              <AlertCircle size={16} className="text-brand-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-brand-text">{pendingAction.property.title}</p>
                <p className="text-brand-muted mt-1">
                  <span className="line-through">{formatPrice(pendingAction.property.price)}</span>
                  <span className="mx-2">→</span>
                  <span className="font-bold text-brand-text">{formatPrice(pendingAction.property.price_requested)}</span>
                </p>
              </div>
            </div>
            {pendingAction.action === 'reject' && (
              <div>
                <label htmlFor="price-reject-reason" className="text-xs font-medium text-brand-muted mb-1 block">Alasan penolakan (opsional)</label>
                <textarea
                  id="price-reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Contoh: harga tidak wajar terhadap pasar"
                  className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            )}
            <p className="text-xs text-brand-muted">
              {pendingAction.action === 'approve'
                ? 'Menerapkan harga baru pada properti dan mencatat tindakan di audit trail.'
                : 'Harga lama tetap berlaku; permintaan dihapus dan dicatat di audit trail.'}
            </p>
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}