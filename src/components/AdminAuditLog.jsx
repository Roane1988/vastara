import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { timeAgo } from '../utils/time'
import { History, RefreshCw, Search, AlertCircle } from 'lucide-react'

const PAGE_SIZE = 50

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

const ACTION_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'verify_property', label: 'Verifikasi' },
  { key: 'reject_property', label: 'Ditolak' },
  { key: 'change_role', label: 'Ubah Role' },
]

function getActionLabel(type) {
  return ACTION_LABELS[type] || type
}

function getActionColor(type) {
  return ACTION_COLORS[type] || 'text-brand-muted bg-brand-bg border-brand-border'
}

function getTargetSummary(log) {
  if (!log.target_detail) return log.target_id || '-'
  let detail
  try {
    detail = typeof log.target_detail === 'string' ? JSON.parse(log.target_detail) : log.target_detail
  } catch {
    return log.target_id || '-'
  }
  if (log.action_type === 'verify_property' || log.action_type === 'reject_property') {
    return detail.property_title || log.target_id || '-'
  }
  if (log.action_type === 'change_role') {
    const name = detail.user_name || detail.user_email || 'Unknown'
    const oldLabel = detail.old_role || '?'
    const newLabel = detail.new_role || '?'
    return `${name}: ${oldLabel} → ${newLabel}`
  }
  return log.target_id || '-'
}

function formatExactTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
}

export default function AdminAuditLog() {
  const cancelledRef = useRef(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    cancelledRef.current = false

    async function fetchInitial() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1)

        if (cancelledRef.current) return

        if (error) {
          setError(error.message)
        } else {
          setLogs(data || [])
          setHasMore((data?.length || 0) >= PAGE_SIZE)
        }
      } catch (err) {
        if (!cancelledRef.current) setError(err.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchInitial()
    return () => { cancelledRef.current = true }
  }, [])

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1)

      if (cancelledRef.current) return

      if (error) {
        setError(error.message)
      } else {
        setLogs(data || [])
        setHasMore((data?.length || 0) >= PAGE_SIZE)
      }
    } catch (err) {
      if (!cancelledRef.current) setError(err.message)
    }
    if (!cancelledRef.current) setRefreshing(false)
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const from = logs.length
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (cancelledRef.current) return

      if (error) {
        setError(error.message)
      } else if (data) {
        setLogs((prev) => [...prev, ...data])
        setHasMore(data.length >= PAGE_SIZE)
      }
    } catch (err) {
      if (!cancelledRef.current) setError(err.message)
    }
    if (!cancelledRef.current) setLoadingMore(false)
  }

  const filteredLogs = useMemo(() => {
    let list = logs
    if (actionFilter !== 'all') {
      list = list.filter((l) => l.action_type === actionFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((l) => {
        const admin = (l.admin_name || '').toLowerCase()
        const target = getTargetSummary(l).toLowerCase()
        return admin.includes(q) || target.includes(q)
      })
    }
    return list
  }, [logs, actionFilter, searchQuery])

  const hasActiveFilter = actionFilter !== 'all' || searchQuery.trim() !== ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-brand-surface rounded-2xl shadow-sm border border-brand-border">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-brand-text">Gagal Memuat Audit Log</h2>
        <p className="text-sm text-brand-muted mt-1 mb-5 max-w-xs text-center">{error}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Coba Lagi
        </button>
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
      <div className="px-5 py-4 border-b border-brand-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-brand-text">Audit Trail</h2>
            <span className="text-xs text-brand-muted">
              {hasActiveFilter ? `${filteredLogs.length} dari ${logs.length} entri` : `${logs.length} entri`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text hover:bg-brand-bg/70 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
          <div className="flex gap-1.5 flex-wrap">
            {ACTION_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActionFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  actionFilter === f.key
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-brand-bg text-brand-muted border-brand-border hover:text-brand-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari admin / target..."
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 placeholder:text-brand-muted"
            />
          </div>
        </div>
      </div>

      {error && logs.length > 0 && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle size={13} />
          Terjadi kesalahan saat memuat data: {error}
        </div>
      )}

      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <History size={24} className="text-brand-muted/40 mb-3" />
          <p className="text-sm font-semibold text-brand-text">Tidak ada entri yang cocok</p>
          <p className="text-xs text-brand-muted mt-1">Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <>
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
                {filteredLogs.map((log) => (
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
                    <td
                      className="px-5 py-4 whitespace-nowrap text-right text-xs text-brand-muted"
                      title={formatExactTime(log.created_at)}
                    >
                      {timeAgo(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="px-5 py-4 border-t border-brand-border flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-xs font-semibold text-brand-primary bg-brand-bg border border-brand-border rounded-xl px-5 py-2.5 hover:bg-brand-bg/70 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Memuat...
                  </>
                ) : (
                  'Muat Lebih Banyak'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
