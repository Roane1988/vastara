import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, XCircle, RefreshCw, Briefcase, Mail, Phone } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

function statusBadgeClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function statusLabel(status) {
  if (status === 'approved') return 'Disetujui'
  if (status === 'rejected') return 'Ditolak'
  return 'Pending'
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminAgentApplications() {
  const { showToast, user } = useAuth()
  const cancelledRef = useRef(false)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processingId, setProcessingId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        let query = supabase.from('agent_applications').select('*').order('created_at', { ascending: false })
        if (filter !== 'all') query = query.eq('status', filter)
        const { data, error } = await query
        if (!active) return
        if (error) {
          console.warn('Gagal memuat pengajuan agent:', error.message)
        } else {
          setApplications(data || [])
        }
      } catch (err) {
        if (active) console.warn('Gagal memuat pengajuan agent:', err.message)
      }
      if (active) setLoading(false)
    }

    load()

    return () => { active = false }
  }, [filter, reloadKey])

  async function insertAuditLog(actionType, targetId, targetDetail) {
    try {
      await supabase.rpc('record_audit', {
        p_action_type: actionType,
        p_target_type: 'agent_application',
        p_target_id: targetId,
        p_target_detail: targetDetail,
      })
    } catch { /* audit must never block */ }
  }

  async function handleApprove(id) {
    if (processingId) return
    setProcessingId(id)
    try {
      const { error } = await supabase
        .from('agent_applications')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        const target = applications.find((a) => a.id === id)
        setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: 'approved', reviewed_at: new Date().toISOString() } : a))
        showToast(`Pengajuan ${target?.full_name || ''} disetujui`, 'success')
        insertAuditLog('approve_agent', id, { agent_name: target?.full_name || '', agent_email: target?.email || '' })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) setProcessingId(null)
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return
    setProcessingId(rejectTarget)
    try {
      const { error } = await supabase
        .from('agent_applications')
        .update({ status: 'rejected', reject_reason: rejectReason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', rejectTarget)

      if (cancelledRef.current) return

      if (error) {
        showToast(error.message, 'error')
      } else {
        const target = applications.find((a) => a.id === rejectTarget)
        setApplications((prev) => prev.map((a) => a.id === rejectTarget ? { ...a, status: 'rejected', reject_reason: rejectReason, reviewed_at: new Date().toISOString() } : a))
        showToast(`Pengajuan ${target?.full_name || ''} ditolak`, 'success')
        insertAuditLog('reject_agent', rejectTarget, { agent_name: target?.full_name || '', agent_email: target?.email || '', reason: rejectReason || '' })
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal', 'error')
    }
    if (!cancelledRef.current) {
      setProcessingId(null)
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const FILTERS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'all', label: 'Semua' },
  ]

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-brand-text">Pengajuan Menjadi Agen</h2>
            <p className="text-xs text-brand-muted mt-0.5">Form pendaftaran dari calon agen di luar platform.</p>
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
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-bg flex items-center justify-center mb-4">
            <Briefcase size={24} className="text-brand-muted/50" />
          </div>
          <p className="text-sm font-semibold text-brand-text">Tidak ada pengajuan</p>
          <p className="text-xs text-brand-muted mt-1">Pengajuan dari calon agen akan muncul di sini.</p>
        </div>
      ) : (
        <div className="divide-y divide-brand-border">
          {applications.map((a) => (
            <div key={a.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-sm shrink-0">
                      {(a.full_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-text truncate">{a.full_name}</p>
                      <p className="text-xs text-brand-muted">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-brand-muted">
                    <span className="flex items-center gap-1.5"><Mail size={12} />{a.email}</span>
                    <span className="flex items-center gap-1.5"><Phone size={12} />{a.whatsapp}</span>
                    {a.agency && <span className="flex items-center gap-1.5"><Briefcase size={12} />{a.agency}</span>}
                  </div>
                  {(a.experience || a.region) && (
                    <p className="mt-2 text-xs text-brand-muted">
                      Pengalaman: <b className="text-brand-text">{a.experience || '-'} tahun</b>
                      {a.region && <> · Wilayah: <b className="text-brand-text">{a.region}</b></>}
                    </p>
                  )}
                  {a.portfolio && (
                    <p className="mt-2 text-xs text-brand-muted bg-brand-bg rounded-lg px-3 py-2 border border-brand-border">
                      <span className="font-semibold text-brand-text">Portofolio: </span>{a.portfolio}
                    </p>
                  )}
                  {a.reject_reason && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                      Alasan penolakan: {a.reject_reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass(a.status)}`}>
                    {statusLabel(a.status)}
                  </span>
                  {a.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(a.id)}
                        disabled={processingId === a.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        {processingId === a.id ? <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
                        Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectTarget(a.id); setRejectReason('') }}
                        disabled={processingId === a.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Tolak
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={rejectTarget !== null}
        onClose={() => !processingId && setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title="Tolak Pengajuan Agen"
        description="Pengajuan ini akan ditandai sebagai ditolak. Cantumkan alasan untuk pelamar."
        confirmText="Ya, Tolak"
        cancelText="Batal"
        loading={processingId === rejectTarget}
        danger={false}
        icon={() => <XCircle size={24} className="text-red-500" />}
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
