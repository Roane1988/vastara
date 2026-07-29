import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { timeAgo } from '../utils/time'
import { History } from 'lucide-react'

const ACTION_LABELS = {
  verify_property: 'Verifikasi Properti',
  reject_property: 'Tolak Properti',
  change_role: 'Ubah Role Pengguna',
}

const ACTION_COLORS = {
  verify_property: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  reject_property: 'text-red-600 bg-red-50 border-red-200',
  change_role: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20',
}

function getActionLabel(type) {
  return ACTION_LABELS[type] || type
}

function getActionColor(type) {
  return ACTION_COLORS[type] || 'text-brand-muted bg-brand-bg border-brand-border'
}

function getTargetSummary(log) {
  if (!log.target_detail) return log.target_id || '-'
  try {
    const detail = typeof log.target_detail === 'string' ? JSON.parse(log.target_detail) : log.target_detail
    if (log.action_type === 'verify_property' || log.action_type === 'reject_property') {
      return detail.property_title || log.target_id || '-'
    }
    if (log.action_type === 'change_role') {
      const name = detail.user_name || 'Unknown'
      const oldLabel = detail.old_role || '?'
      const newLabel = detail.new_role || '?'
      return `${name}: ${oldLabel} → ${newLabel}`
    }
    return log.target_id || '-'
  } catch {
    return log.target_id || '-'
  }
}

export default function AdminAuditLog() {
  const cancelledRef = useRef(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cancelledRef.current = false

    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (cancelledRef.current) return

        if (error) {
          console.warn('Gagal memuat audit log:', error.message)
        } else if (data) {
          setLogs(data)
        }
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat audit log:', err.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchLogs()
    return () => { cancelledRef.current = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-brand-surface rounded-2xl shadow-sm border border-brand-border">
        <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4">
          <History size={28} className="text-brand-muted" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">Belum Ada Aktivitas</h2>
        <p className="text-sm text-brand-muted mt-1">Riwayat tindakan admin akan muncul di sini.</p>
      </div>
    )
  }

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <h2 className="text-base font-bold text-brand-text">Audit Trail</h2>
        <span className="text-xs text-brand-muted">{logs.length} entri</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Admin</th>
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Tindakan</th>
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Target</th>
              <th className="text-right font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-brand-bg/50 transition-colors">
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="font-medium text-brand-text">{log.admin_name || 'Admin'}</span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getActionColor(log.action_type)}`}>
                    {getActionLabel(log.action_type)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-brand-muted text-xs leading-snug block max-w-xs truncate">
                    {getTargetSummary(log)}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right text-xs text-brand-muted">
                  {timeAgo(log.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
