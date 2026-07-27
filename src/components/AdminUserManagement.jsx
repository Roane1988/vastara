import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ChevronDown } from 'lucide-react'

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
      return 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20'
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
  const { showToast, user: currentUser } = useAuth()
  const cancelledRef = useRef(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    cancelledRef.current = false

    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false, nullsLast: true })

        if (cancelledRef.current) return

        if (error) {
          console.warn('Gagal memuat pengguna:', error.message)
        } else if (data) {
          setUsers(data)
        }
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat pengguna:', err.message)
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchUsers()
    return () => { cancelledRef.current = true }
  }, [])

  async function handleRoleChange(userId, newRole) {
    if (updatingId) return
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

      const adminName = currentUser?.user_metadata?.first_name || currentUser?.email || 'Admin'
      await supabase.from('audit_logs').insert({
        admin_id: currentUser?.id,
        admin_name: adminName,
        action_type: 'change_role',
        target_type: 'user',
        target_id: userId,
        target_detail: {
          user_name: targetUser?.first_name || 'Unknown',
          user_email: targetUser?.email || '',
          old_role: oldRole,
          new_role: newRole,
        },
      })

      if (!cancelledRef.current) {
        showToast(`Role ${targetUser?.first_name || 'pengguna'} diubah ke ${getRoleLabel(newRole)}`, 'success')
      }
    } catch (err) {
      if (!cancelledRef.current) showToast(err.message || 'Gagal mengubah role', 'error')
    }
    if (!cancelledRef.current) setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <h2 className="text-base font-bold text-brand-text">Manajemen Pengguna</h2>
        <span className="text-xs text-brand-muted">{users.length} pengguna</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
                        <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary text-xs font-bold shrink-0">
                          {(u.first_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-brand-text">{u.first_name || 'Anonymous'}</span>
                          {isSelf && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">
                              Anda
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-brand-muted">{u.email || '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-brand-muted">{u.whatsapp || '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeClass(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <select
                          value={u.role || 'pembeli'}
                          disabled={updatingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="appearance-none bg-brand-bg border border-brand-border rounded-xl px-3 py-2 pr-8 text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-muted" />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
