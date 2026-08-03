import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ChevronDown, RefreshCw } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'pembeli', label: 'Pembeli' },
  { value: 'owner', label: 'Owner' },
  { value: 'agent', label: 'Agent' },
  { value: 'developer', label: 'Developer' },
  { value: 'admin', label: 'Admin' },
]

function getRoleLabel(role) {
  const found = ROLE_OPTIONS.find((r) => r.value === role)
  return found ? found.label : (role || 'Pembeli')
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin':
      return 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
    case 'agent':
    case 'developer':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'owner':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default:
      return 'bg-brand-bg text-brand-muted border-brand-border'
  }
}

export default function AdminUserManagement() {
  const { showToast, user: currentUser, role } = useAuth()
  const cancelledRef = useRef(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    cancelledRef.current = false

    async function fetchUsers() {
      setLoading(true)
      setLoadError('')
      try {
        const { data, error } = await supabase.rpc('get_admin_users')

        if (cancelledRef.current) return

        if (error) {
          setLoadError(error.message)
        } else if (data) {
          setUsers(data)
        }
      } catch (err) {
        if (!cancelledRef.current) setLoadError(err.message || 'Gagal memuat pengguna.')
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchUsers()
    return () => { cancelledRef.current = true }
  }, [reloadKey])

  async function handleRoleChange(userId, newRole) {
    if (updatingId || role !== 'admin') return
    setUpdatingId(userId)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (cancelledRef.current) return

      if (updateError) {
        showToast(updateError.message, 'error')
        setUpdatingId(null)
        return
      }

      const targetUser = users.find((u) => u.id === userId)
      const oldRole = targetUser?.role || 'pembeli'

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))

      const { error: auditError } = await supabase.rpc('record_audit', {
        p_action_type: 'change_role',
        p_target_type: 'user',
        p_target_id: userId,
        p_target_detail: {
          user_name: targetUser?.first_name || 'Unknown',
          user_email: targetUser?.email || '',
          old_role: oldRole,
          new_role: newRole,
        },
      })

      if (!cancelledRef.current) {
        if (auditError) {
          showToast('Role diubah, tapi audit gagal dicatat: ' + auditError.message, 'error')
        } else {
          showToast(`Role ${targetUser?.first_name || 'pengguna'} diubah ke ${getRoleLabel(newRole)}`, 'success')
        }
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal mengubah role', 'error')
    }
    if (!cancelledRef.current) setUpdatingId(null)
  }

  const currentSuperAdmin = users.find((u) => u.id === currentUser?.id)?.is_super_admin === true

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-brand-text">Manajemen Pengguna</h2>
          <p className="text-xs text-brand-muted mt-0.5">
            {currentSuperAdmin
              ? 'Kamu super admin — dapat mengubah peran semua pengguna.'
              : 'Hanya super admin yang dapat mengubah peran pengguna.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="flex items-center gap-1.5 text-xs font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 hover:text-brand-text hover:bg-brand-bg/70 transition-colors">
            <RefreshCw size={13} />
            Refresh
          </button>
          <span className="text-xs text-brand-muted">{users.length} pengguna</span>
        </div>
      </div>
      {loadError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <p className="text-sm font-semibold text-brand-text">Gagal memuat pengguna</p>
          <p className="text-xs text-brand-muted mt-1 mb-5 max-w-xs">{loadError}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all">
            Coba Lagi
          </button>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Nama</th>
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Email</th>
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">WhatsApp</th>
              <th className="text-left font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Role Saat Ini</th>
              <th className="text-right font-semibold text-brand-muted px-5 py-4 whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-brand-muted">
                  Belum ada pengguna terdaftar.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = currentUser?.id === u.id
                return (
                  <tr key={u.id} className="hover:bg-brand-bg/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-xs font-bold shrink-0">
                          {(u.first_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-brand-text">{u.first_name || 'Anonymous'}</span>
                          {isSelf && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                              Anda
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-brand-muted">{u.email || '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-brand-muted">{u.whatsapp || '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeClass(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                        {u.role === 'admin' && u.is_super_admin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-accent text-white border border-brand-accent">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {currentSuperAdmin ? (
                        <div className="relative inline-block">
                          <select
                            value={u.role || 'pembeli'}
                            disabled={updatingId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            aria-label={`Ubah role ${u.first_name || 'pengguna'}`}
                            className="appearance-none bg-brand-bg border border-brand-border rounded-xl px-3 py-2 pr-8 text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-muted" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-brand-muted bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1.5">
                          Dikelola super admin
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
