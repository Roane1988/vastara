import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { CheckCircle, Clock, Users, Briefcase } from 'lucide-react'

function CardSkeleton() {
  return (
    <div className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-border" />
        <div className="w-12 h-3 rounded bg-brand-border" />
      </div>
      <div className="h-8 w-20 rounded bg-brand-border mb-1" />
      <div className="h-3 w-16 rounded bg-brand-border" />
    </div>
  )
}

const CARD_CONFIG = [
  {
    key: 'verified',
    icon: CheckCircle,
    label: 'Properti Terverifikasi',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'pending',
    icon: Clock,
    label: 'Menunggu Verifikasi',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    key: 'totalUsers',
    icon: Users,
    label: 'Total Pengguna',
    bg: 'bg-sky-50',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    key: 'agentCount',
    icon: Briefcase,
    label: 'Agen & Developer',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
]

export default function AdminAnalyticsCards() {
  const cancelledRef = useRef(false)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cancelledRef.current = false

    async function fetchStats() {
      try {
        const [
          { count: verified, error: err1 },
          { count: pending, error: err2 },
          { count: totalUsers, error: err3 },
          { count: agentCount, error: err4 },
        ] = await Promise.all([
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['agent', 'developer']),
        ])

        if (cancelledRef.current) return

        if (err1 || err2 || err3 || err4) {
          console.warn('Gagal memuat statistik dashboard')
          setStats({ verified: 0, pending: 0, totalUsers: 0, agentCount: 0 })
        } else {
          setStats({ verified: verified ?? 0, pending: pending ?? 0, totalUsers: totalUsers ?? 0, agentCount: agentCount ?? 0 })
        }
      } catch (err) {
        if (!cancelledRef.current) {
          console.warn('Gagal memuat statistik dashboard:', err.message)
          setStats({ verified: 0, pending: 0, totalUsers: 0, agentCount: 0 })
        }
      }
      if (!cancelledRef.current) setLoading(false)
    }

    fetchStats()
    return () => { cancelledRef.current = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  const getValue = (key) => {
    switch (key) {
      case 'verified': return stats.verified
      case 'pending': return stats.pending
      case 'totalUsers': return stats.totalUsers
      case 'agentCount': return stats.agentCount
      default: return 0
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {CARD_CONFIG.map((card) => {
        const Icon = card.icon
        const value = getValue(card.key)
        return (
          <div key={card.key} className="bg-brand-surface rounded-2xl shadow-sm border border-brand-border p-5 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                <Icon size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.bg} ${card.iconColor} border ${card.iconBg.replace('bg-', 'border-')}/50`}>
                {card.key === 'verified' ? 'Verified' : card.key === 'pending' ? 'Pending' : card.key === 'totalUsers' ? 'Total' : 'Aktif'}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-brand-text">{value.toLocaleString('id-ID')}</p>
            <p className="text-xs text-brand-muted mt-0.5">{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}
