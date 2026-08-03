import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { timeAgo } from '../utils/time'
import { History, RefreshCw, Search, AlertCircle, Download, X, Calendar } from 'lucide-react'

const PAGE_SIZE = 50

const ACTION_META = {
  verify_property: { label: 'Verifikasi Properti', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  start_review: { label: 'Mulai Review', color: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20' },
  reject_property: { label: 'Tolak Properti', color: 'text-red-600 bg-red-50 border-red-200' },
  restore_property: { label: 'Pulihkan Properti', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  change_role: { label: 'Ubah Role', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  approve_agent: { label: 'Terima Agen', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  reject_agent: { label: 'Tolak Agen', color: 'text-red-600 bg-red-50 border-red-200' },
  delete_agent_application: { label: 'Hapus Pengajuan Agen', color: 'text-rose-600 bg-rose-50 border-rose-200' },
}

const ACTION_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'verify_property', label: 'Verifikasi' },
  { key: 'start_review', label: 'Mulai Review' },
  { key: 'reject_property', label: 'Ditolak' },
  { key: 'restore_property', label: 'Dipulihkan' },
  { key: 'change_role', label: 'Ubah Role' },
  { key: 'approve_agent', label: 'Agen Diterima' },
  { key: 'reject_agent', label: 'Agen Ditolak' },
  { key: 'delete_agent_application', label: 'Pengajuan Dihapus' },
]

function getActionMeta(type) {
  return ACTION_META[type] || { label: type, color: 'text-brand-muted bg-brand-bg border-brand-border' }
}

function parseDetail(log) {
  if (!log?.target_detail) return null
  if (typeof log.target_detail === 'string') {
    try { return JSON.parse(log.target_detail) } catch { return null }
  }
  return log.target_detail
}

function getTargetSummary(log) {
  const detail = parseDetail(log)
  const fallback = log?.target_id || '-'
  switch (log?.action_type) {
    case 'verify_property':
    case 'reject_property':
    case 'start_review':
    case 'restore_property':
      return detail?.property_title || fallback
    case 'change_role': {
      const name = detail?.user_name || detail?.user_email || 'Unknown'
      return `${name}: ${detail?.old_role || '?'} → ${detail?.new_role || '?'}`
    }
    case 'approve_agent':
    case 'reject_agent':
    case 'delete_agent_application': {
      const name = detail?.agent_name || detail?.agent_email || 'Unknown'
      return detail?.reason ? `${name} — ${detail.reason}` : name
    }
    default:
      return fallback
  }
}

function formatExactTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })
}

function DetailModal({ log, onClose }) {
  if (!log) return null
  const meta = getActionMeta(log.action_type)
  const detail = parseDetail(log)
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-brand-surface rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-brand-surface">
          <div className="flex items-center gap-2.5">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>{meta.label}</span>
          </div>
          <button type="button" onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-brand-muted mb-0.5">Admin</p>
              <p className="font-semibold text-brand-text">{log.admin_name || 'Admin'}</p>
            </div>
            <div>
              <p className="text-[11px] text-brand-muted mb-0.5">Waktu</p>
              <p className="font-semibold text-brand-text">{formatExactTime(log.created_at)}</p>
            </div>
            <div>
              <p className="text-[11px] text-brand-muted mb-0.5">Target</p>
              <p className="font-medium text-brand-text break-words">{log.target_type} · {log.target_id || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-brand-muted mb-0.5">IP Address</p>
              <p className="font-medium text-brand-text">{log.ip_address || '—'}</p>
            </div>
          </div>
          {log.user_agent && (
            <div>
              <p className="text-[11px] text-brand-muted mb-0.5">User Agent</p>
              <p className="text-xs text-brand-muted break-words">{log.user_agent}</p>
            </div>
          )}
          {detail && (
            <div>
              <p className="text-[11px] text-brand-muted mb-1">Detail</p>
              <pre className="bg-brand-bg border border-brand-border rounded-xl p-3 text-[11px] text-brand-text overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function csvCell(value) {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export default function AdminAuditLog() {
  const cancelledRef = useRef(false)
  const fetchVersionRef = useRef(0)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const buildQuery = useMemo(() => {
    return () => {
      let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
      if (actionFilter !== 'all') q = q.eq('action_type', actionFilter)
      if (dateFrom) q = q.gte('created_at', new Date(`${dateFrom}T00:00:00`).toISOString())
      if (dateTo) q = q.lte('created_at', new Date(`${dateTo}T23:59:59`).toISOString())
      const s = debouncedSearch.trim()
      if (s) q = q.or(`admin_name.ilike.%${s}%,target_id.ilike.%${s}%,target_detail::text.ilike.%${s}%`)
      return q
    }
  }, [actionFilter, dateFrom, dateTo, debouncedSearch])

  useEffect(() => {
    cancelledRef.current = false
    fetchVersionRef.current += 1
    const version = fetchVersionRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)

    async function fetchFirstPage() {
      try {
        const { data, error: err } = await buildQuery().range(0, PAGE_SIZE - 1)
        if (cancelledRef.current || version !== fetchVersionRef.current) return
        if (err) {
          setError(err.message)
        } else {
          setLogs(data || [])
          setHasMore((data?.length || 0) >= PAGE_SIZE)
        }
      } catch (e) {
        if (cancelledRef.current || version !== fetchVersionRef.current) return
        setError(e.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchFirstPage()
    return () => { cancelledRef.current = true }
  }, [buildQuery])

  const hasActiveFilter = actionFilter !== 'all' || searchQuery.trim() !== '' || dateFrom || dateTo

  function resetFilters() {
    setActionFilter('all')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    setError(null)
    const version = fetchVersionRef.current
    try {
      const { data, error: err } = await buildQuery().range(0, PAGE_SIZE - 1)
      if (cancelledRef.current || version !== fetchVersionRef.current) return
      if (err) {
        setError(err.message)
      } else {
        setLogs(data || [])
        setHasMore((data?.length || 0) >= PAGE_SIZE)
      }
    } catch (e) {
      if (cancelledRef.current || version !== fetchVersionRef.current) return
      setError(e.message)
    }
    if (!cancelledRef.current) setRefreshing(false)
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const version = fetchVersionRef.current
    try {
      const from = logs.length
      const { data, error: err } = await buildQuery().range(from, from + PAGE_SIZE - 1)
      if (cancelledRef.current || version !== fetchVersionRef.current) return
      if (err) {
        setError(err.message)
      } else if (data) {
        setLogs((prev) => [...prev, ...data])
        setHasMore(data.length >= PAGE_SIZE)
      }
    } catch (e) {
      if (cancelledRef.current || version !== fetchVersionRef.current) return
      setError(e.message)
    }
    if (!cancelledRef.current) setLoadingMore(false)
  }

  function handleExport() {
    if (logs.length === 0) return
    const header = ['Admin', 'Tindakan', 'Target', 'Waktu', 'IP']
    const rows = logs.map((l) => [
      csvCell(l.admin_name || 'Admin'),
      csvCell(getActionMeta(l.action_type).label),
      csvCell(getTargetSummary(l)),
      csvCell(formatExactTime(l.created_at)),
      csvCell(l.ip_address || ''),
    ])
    const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
        <p className="text-sm text-brand-muted mt-1 max-w-sm text-center">
          {hasActiveFilter ? 'Tidak ada entri yang cocok dengan filter saat ini.' : 'Riwayat tindakan admin akan muncul di sini.'}
        </p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-bg border border-brand-border text-xs font-semibold text-brand-text hover:bg-brand-bg/70"
          >
            Reset Filter
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-brand-text">Audit Trail</h2>
              <span className="text-xs text-brand-muted">
                {hasActiveFilter ? `${logs.length} entri tampil (difilter)` : `${logs.length} entri`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text hover:bg-brand-bg/70 transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                CSV
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text hover:bg-brand-bg/70 transition-colors"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-3 mt-4">
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

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:ml-auto">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari admin / target..."
                  className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 placeholder:text-brand-muted"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-brand-muted shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text"
                />
                <span className="text-xs text-brand-muted">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text"
                />
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-medium text-brand-accent hover:text-brand-primary whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && logs.length > 0 && (
          <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle size={13} />
            Terjadi kesalahan saat memuat data: {error}
          </div>
        )}

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
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-brand-bg/50 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-medium text-brand-text">{log.admin_name || 'Admin'}</span>
                    {log.ip_address && (
                      <span className="block text-[10px] text-brand-muted mt-0.5">{log.ip_address}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getActionMeta(log.action_type).color}`}>
                      {getActionMeta(log.action_type).label}
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
      </div>

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  )
}
