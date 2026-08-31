import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getFavorites } from '../utils/favorites'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPriceDisplay, formatCount } from '../utils/format'
import { getFinancialProfile } from '../utils/financialProfile'
import {
  LayoutDashboard,
  Loader2,
  Heart,
  CalendarClock,
  Search,
  Wallet,
  Eye,
  MessageCircle,
  TrendingUp,
  Home,
  Plus,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  UserPlus,
  Check,
  X,
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent || 'bg-brand-highlight text-brand-accent'}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-brand-muted">{label}</p>
        <p className="text-xl font-bold text-brand-text leading-tight">{value}</p>
        {sub && <p className="text-xs text-brand-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ title, to, cta }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-brand-text">{title}</h2>
      {to && cta && (
        <Link to={to} className="text-xs font-semibold text-brand-accent hover:text-brand-primary inline-flex items-center gap-1 transition-colors">
          {cta} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc, to, cta }) {
  return (
    <div className="bg-brand-surface rounded-2xl border border-dashed border-brand-border p-6 text-center">
      <Icon size={28} className="text-brand-muted mx-auto mb-2" />
      <p className="text-sm font-semibold text-brand-text">{title}</p>
      {desc && <p className="text-xs text-brand-muted mt-1">{desc}</p>}
      {to && cta && (
        <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:text-brand-primary transition-colors">
          {cta} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}

const VISIT_STATUS = {
  pending: { label: 'Menunggu', cls: 'bg-brand-pending/15 text-brand-pending' },
  confirmed: { label: 'Dikonfirmasi', cls: 'bg-brand-verified-bg text-brand-verified' },
  completed: { label: 'Selesai', cls: 'bg-brand-highlight text-brand-accent' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-brand-sold/20 text-brand-sold' },
}

export default function DashboardPage() {
  const { user, showToast } = useAuth()

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)

  // Buyer data
  const [savedProps, setSavedProps] = useState([])
  const [savedSearches, setSavedSearches] = useState([])
  const [visits, setVisits] = useState([])
  const [financialProfile, setFinancialProfile] = useState(null)

  // Seller data
  const [listings, setListings] = useState([])
  const [viewCount, setViewCount] = useState(0)
  const [leadCount, setLeadCount] = useState(0)
  const [visitCountSeller, setVisitCountSeller] = useState(0)
  const [soldCount, setSoldCount] = useState(0)

  // Mark as sold modal
  const [sellTarget, setSellTarget] = useState(null)
  const [soldSource, setSoldSource] = useState('external')
  const [soldBuyerId, setSoldBuyerId] = useState('')
  const [soldLoading, setSoldLoading] = useState(false)
  const [buyerOptions, setBuyerOptions] = useState([])

  const firstName = user?.user_metadata?.first_name || ''

  const loadBuyerData = useCallback(async () => {
    if (!user) return

    const favIds = getFavorites()
    if (favIds.length > 0) {
      const { data } = await supabase
        .from('properties')
        .select('id, title, price, price_period, category, image_url, city')
        .in('id', favIds)
      setSavedProps(data || [])
    }

    const [{ data: searches }, { data: visitData }, { data: fp }] = await Promise.all([
      supabase.from('saved_searches').select('id, name, filters, active, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('site_visits').select('id, property_id, scheduled_date, scheduled_time, status, created_at, properties!property_id(title, image_url, price, price_period, category)').eq('buyer_id', user.id).order('scheduled_date', { ascending: false }),
      getFinancialProfile(),
    ])
    if (searches) setSavedSearches(searches)
    if (visitData) setVisits(visitData)
    if (fp?.profile) setFinancialProfile(fp.profile)
  }, [user])

  const loadSellerData = useCallback(async () => {
    if (!user) return

    const { data: props, error } = await supabase
      .from('properties')
      .select('id, title, price, price_period, category, status, image_url, address, sold_source')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      showToast('Gagal memuat data properti.', 'error')
      return
    }
    setListings(props || [])

    const ids = (props || []).map((p) => p.id)
    setSoldCount((props || []).filter((p) => p.status === 'sold').length)

    if (ids.length === 0) return

    const [{ data: views }, { data: leads }, { data: visits }] = await Promise.all([
      supabase.from('property_views').select('viewed_on').in('property_id', ids),
      supabase.from('whatsapp_leads').select('id, buyer_id, profiles!buyer_id(first_name)').in('property_id', ids),
      supabase.from('site_visits').select('id').in('property_id', ids),
    ])

    setViewCount((views || []).length)
    setVisitCountSeller((visits || []).length)

    const buyerOptionsMap = {}
    ;(leads || []).forEach((l) => {
      if (l.buyer_id && l.profiles?.first_name) buyerOptionsMap[l.buyer_id] = l.profiles.first_name
    })

    const { data: chatAll } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id')
      .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)

    const partnerIdSet = new Set()
    ;(chatAll || []).forEach((m) => {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      if (other && other !== user.id) partnerIdSet.add(other)
    })

    let chatPartnerProfiles = []
    const partnerIds = Array.from(partnerIdSet)
    if (partnerIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name')
        .in('id', partnerIds)
        .neq('role', 'admin')
      chatPartnerProfiles = profs || []
    }

    const chatPartnerIds = new Set(chatPartnerProfiles.map((p) => p.id))
    chatPartnerProfiles.forEach((p) => { buyerOptionsMap[p.id] = p.first_name })

    const uniqueLeadSet = new Set()
    chatPartnerIds.forEach((id) => uniqueLeadSet.add(id))
    ;(leads || []).forEach((l) => { if (l.buyer_id) uniqueLeadSet.add(l.buyer_id) })

    setLeadCount(uniqueLeadSet.size)

    setBuyerOptions(Object.keys(buyerOptionsMap).map((id) => ({ id, name: buyerOptionsMap[id] || 'Pengguna' })))
  }, [user, showToast])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        if (!user) return

        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id)

        const hasListings = (count || 0) > 0
        if (cancelled) return

        if (hasListings) {
          setMode('seller')
          await loadSellerData()
        } else {
          setMode('buyer')
          await loadBuyerData()
        }
      } catch {
        /* non-critical */
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, loadSellerData, loadBuyerData])

  const openSellModal = (p) => {
    setSellTarget(p)
    setSoldSource('external')
    setSoldBuyerId('')
  }

  const handleConfirmSold = async () => {
    if (!sellTarget || soldLoading) return
    setSoldLoading(true)
    try {
      const payload = {
        status: 'sold',
        sold_source: soldSource,
        sold_at: new Date().toISOString(),
        ...(soldSource === 'internal' ? { sold_buyer_id: soldBuyerId || null } : { sold_buyer_id: null }),
      }
      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', sellTarget.id)
      if (error) throw error

      setListings((prev) =>
        prev.map((p) => (p.id === sellTarget.id ? { ...p, status: 'sold', ...payload } : p))
      )
      setSoldCount((c) => c + 1)
      showToast('Properti berhasil ditandai terjual', 'success')
      setSellTarget(null)
    } catch {
      showToast('Gagal menandai properti. Silakan coba lagi.', 'error')
    } finally {
      setSoldLoading(false)
    }
  }

  const activeSearches = (savedSearches || []).filter((s) => s.active).length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="text-brand-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <LayoutDashboard size={24} className="text-brand-accent" />
          Dashboard
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          {firstName ? `Halo, ${firstName}!` : 'Halo!'}
          {' '}— ini ringkasan aktivitas {mode === 'seller' ? 'penjualan' : 'pencarian properti'} kamu di HuniOne.
        </p>
      </header>

      {mode === 'seller' ? (
        <SellerDashboard
          listings={listings}
          viewCount={viewCount}
          leadCount={leadCount}
          visitCount={visitCountSeller}
          soldCount={soldCount}
          openSellModal={openSellModal}
        />
      ) : (
        <BuyerDashboard
          savedProps={savedProps}
          savedSearches={savedSearches}
          activeSearches={activeSearches}
          visits={visits}
          financialProfile={financialProfile}
        />
      )}

      <MarkAsSoldModal
        target={sellTarget}
        source={soldSource}
        setSource={setSoldSource}
        buyerId={soldBuyerId}
        setBuyerId={setSoldBuyerId}
        buyerOptions={buyerOptions}
        loading={soldLoading}
        onConfirm={handleConfirmSold}
        onClose={() => { setSellTarget(null); setSoldBuyerId(''); setSoldSource('external') }}
      />
    </div>
  )
}

function BuyerDashboard({ savedProps, savedSearches, activeSearches, visits, financialProfile }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Heart}
          label="Properti Tersimpan"
          value={savedProps.length}
          sub="favorit kamu"
          accent="bg-red-50 text-red-500"
        />
        <StatCard
          icon={CalendarClock}
          label="Jadwal Kunjungan"
          value={visits.length}
          sub={`${visits.filter((v) => v.status === 'pending' && new Date(v.scheduled_date) >= new Date()).length} akan datang`}
          accent="bg-brand-verified-bg text-brand-verified"
        />
        <StatCard
          icon={Search}
          label="Pencarian Tersimpan"
          value={savedSearches.length}
          sub={`${activeSearches} aktif`}
          accent="bg-brand-highlight text-brand-accent"
        />
        <StatCard
          icon={Wallet}
          label="Profil Keuangan"
          value={financialProfile ? 'Terisi' : 'Belum diisi'}
          sub={financialProfile ? 'Siap referensi KPR' : 'Lengkapi untuk KPR'}
          accent={financialProfile ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}
        />
      </div>

      <section>
        <SectionHeader title="Properti Tersimpan" to="/explore" cta="Jelajahi properti" />
        {savedProps.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Belum ada properti tersimpan"
            desc="Simpan properti favorit untuk dibandingkan nanti."
            to="/explore"
            cta="Lihat properti"
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {savedProps.map((p) => (
              <Link
                key={p.id}
                to={`/property/${p.id}`}
                className="bg-brand-surface rounded-2xl border border-brand-border p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <img src={getImageSrc(p.image_url)} alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-text truncate">{p.title || 'Properti'}</p>
                  <p className="text-xs text-brand-muted truncate">{p.city || ''}</p>
                  <p className="text-sm font-bold text-brand-accent">{formatPriceDisplay(p)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Jadwal Kunjungan" to="/explore" cta="Jadwalkan kunjungan" />
        {visits.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Belum ada jadwal kunjungan"
            desc="Jadwalkan kunjungan ke properti yang kamu minati."
            to="/explore"
            cta="Cari properti"
          />
        ) : (
          <div className="space-y-2">
            {visits.slice(0, 5).map((v) => {
              const st = VISIT_STATUS[v.status] || VISIT_STATUS.pending
              return (
                <div key={v.id} className="bg-brand-surface rounded-2xl border border-brand-border p-3 flex items-center gap-3">
                  {v.properties?.image_url ? (
                    <img src={getImageSrc(v.properties.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-brand-highlight flex items-center justify-center shrink-0"><CalendarClock size={18} className="text-brand-accent" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text truncate">{v.properties?.title || 'Properti'}</p>
                    <p className="text-xs text-brand-muted">
                      {v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      {v.scheduled_time ? ` · ${v.scheduled_time}` : ''}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Pencarian Tersimpan" to="/saved-searches" cta="Kelola" />
        {savedSearches.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Belum ada pencarian tersimpan"
            desc="Simpan kriteria pencarian dan dapatkan notifikasi properti baru."
            to="/explore"
            cta="Mulai mencari"
          />
        ) : (
          <div className="space-y-2">
            {savedSearches.slice(0, 5).map((s) => (
              <div key={s.id} className="bg-brand-surface rounded-2xl border border-brand-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-text truncate">{s.name || 'Pencarian saya'}</p>
                  <p className="text-xs text-brand-muted">{s.filters?.search || 'Semua properti'}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${s.active ? 'bg-brand-verified-bg text-brand-verified' : 'bg-brand-sold/20 text-brand-sold'}`}>
                  {s.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SellerDashboard({ listings, viewCount, leadCount, visitCount, soldCount, openSellModal }) {
  return (    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="Total Tayangan" value={formatCount(viewCount)} sub="kali dilihat" accent="bg-brand-highlight text-brand-accent" />
        <StatCard icon={MessageCircle} label="Total Leads" value={formatCount(leadCount)} sub="obrolan & WA masuk" accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={CalendarClock} label="Jadwal Kunjungan" value={formatCount(visitCount)} sub="permintaan kunjungan" accent="bg-orange-50 text-orange-500" />
        <StatCard icon={CheckCircle2} label="Terjual" value={formatCount(soldCount)} sub="properti laku" accent="bg-violet-50 text-violet-600" />
      </div>

      <section>
        <SectionHeader title="Iklan Saya" to="/my-listings" cta="Kelola lengkap" />
        {listings.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Belum ada iklan properti"
            desc="Buat listing pertamamu untuk mulai menerima leads."
            to="/sell"
            cta="Mulai jual properti"
          />
        ) : (
          <div className="space-y-2">
            {listings.map((p) => {
              const sold = p.status === 'sold'
              const pending = p.status === 'pending' || p.status === 'in_review'
              return (
                <div key={p.id} className={`bg-brand-surface rounded-2xl border border-brand-border p-3 flex items-center gap-3 ${sold ? 'opacity-75' : ''}`}>
                  <img src={getImageSrc(p.image_url)} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text truncate">{p.title}</p>
                    <p className="text-xs text-brand-muted truncate">{formatPriceDisplay(p)}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                    sold ? 'bg-brand-sold/20 text-brand-sold' : pending ? 'bg-brand-pending/15 text-brand-pending' : 'bg-brand-verified-bg text-brand-verified'
                  }`}>
                    {sold ? 'Terjual' : pending ? 'Menunggu' : 'Aktif'}
                  </span>
                  {!sold && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/sell?edit=${p.id}`}
                        className="text-[11px] font-semibold text-brand-accent border border-brand-accent/30 hover:bg-brand-highlight rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); openSellModal(p) }}
                        className="text-[11px] font-semibold text-brand-danger border border-brand-danger/30 hover:bg-brand-danger/10 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Tandai Terjual
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {listings.length > 0 && (
          <div className="mt-3">
            <Link
              to="/sell"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors"
            >
              <Plus size={16} /> Iklankan properti baru
            </Link>
          </div>
        )}
      </section>

      <div className="bg-brand-highlight rounded-2xl border border-brand-accent/20 p-4 flex items-start gap-3">
        <TrendingUp size={20} className="text-brand-accent shrink-0 mt-0.5" />
        <div className="text-sm text-brand-text">
          <p className="font-semibold">Tips performa</p>
          <p className="text-xs text-brand-muted mt-1">
            Aktifkan notifikasi chat dan segera balas leads untuk meningkatkan rasio konversi. Listing dengan foto lengkap cenderung mendapat lebih banyak kunjungan.
          </p>
        </div>
      </div>
    </div>
  )
}

function MarkAsSoldModal({ target, source, setSource, buyerId, setBuyerId, buyerOptions, loading, onConfirm, onClose }) {
  const options = (buyerOptions || []).filter((b) => b.id)
  return (
    <AnimatePresence>
      {target && (
        <>
          <button type="button" aria-label="Tutup" onClick={onClose} className="fixed inset-0 bg-black/40 z-40 cursor-default p-0 border-0" />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface rounded-t-3xl py-6 px-5 pb-8 max-h-[80vh] overflow-y-auto"
          >
            <button type="button" aria-label="Tutup" onClick={onClose} className="absolute top-4 right-4 text-brand-muted hover:text-brand-text">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <CheckCircle2 size={20} className="text-brand-verified" />
              Tandai Properti Terjual
            </h3>
            <p className="text-xs text-brand-muted mt-1 mb-4">Pilih dari mana pembeli properti ini berasal. Atribusi membantu kamu melacak performa channel penjualan.</p>

            <div className="space-y-3">
              <div
                onClick={() => setSource('internal')}
                className={`border rounded-2xl p-4 cursor-pointer transition-colors ${source === 'internal' ? 'border-brand-accent bg-brand-highlight' : 'border-brand-border hover:border-brand-accent/40'}`}
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-brand-accent" />
                  <span className="text-sm font-semibold text-brand-text">Prospek Internal HuniOne</span>
                  {source === 'internal' && <Check size={16} className="text-brand-accent ml-auto" />}
                </div>
                <p className="text-xs text-brand-muted mt-1">Terjual dari prospek yang berinteraksi lewat chat atau WhatsApp di platform.</p>
                {source === 'internal' && (
                  <select
                    value={buyerId}
                    onChange={(e) => setBuyerId(e.target.value)}
                    className="mt-3 w-full text-sm bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-accent"
                  >
                    <option value="">Pilih pembeli…</option>
                    {options.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div
                onClick={() => setSource('external')}
                className={`border rounded-2xl p-4 cursor-pointer transition-colors ${source === 'external' ? 'border-brand-accent bg-brand-highlight' : 'border-brand-border hover:border-brand-accent/40'}`}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={18} className="text-brand-sold" />
                  <span className="text-sm font-semibold text-brand-text">Eksternal (Luar Platform)</span>
                  {source === 'external' && <Check size={16} className="text-brand-accent ml-auto" />}
                </div>
                <p className="text-xs text-brand-muted mt-1">Terjual melalui kanal di luar HuniOne (referensi, marketplace lain, dll).</p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-sm font-semibold text-brand-muted border border-brand-border rounded-xl py-3 hover:bg-brand-bg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || (source === 'internal' && !buyerId)}
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-brand-verified hover:bg-emerald-700 rounded-xl py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Tandai Terjual
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
