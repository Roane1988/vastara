import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BellRing, BellOff, Trash2, Search, ArrowLeft, MapPin, TrendingUp, RefreshCw, Eye } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getImageSrc, FALLBACK_IMAGE } from '../utils/images'
import { formatPriceDisplay } from '../utils/format'
import { matchesSavedSearch, describeFilters, buildQueryString } from '../utils/savedSearch'

const SAVED_FIELDS = 'id, name, filters, active, last_checked_at, created_at'

export default function SavedSearchesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searches, setSearches] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSearches([])
        setProperties([])
        return
      }
      const [{ data: sData, error: sErr }, { data: pData, error: pErr }] = await Promise.all([
        supabase.from('saved_searches').select(SAVED_FIELDS).eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('properties').select('*').eq('status', 'verified').order('created_at', { ascending: false }),
      ])
      if (sErr) throw sErr
      if (pErr) throw pErr
      setSearches(sData || [])
      setProperties(pData || [])
    } catch (err) {
      console.warn('Gagal memuat pencarian tersimpan:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch(() => {})
  }, [loadData])

  const enriched = useMemo(() => {
    return searches.map((s) => {
      const matches = properties.filter((p) => matchesSavedSearch(p, s))
      const base = s.last_checked_at ? new Date(s.last_checked_at).getTime() : new Date(s.created_at).getTime()
      const newMatches = matches.filter((p) => new Date(p.created_at).getTime() > base)
      return { ...s, matches, newCount: newMatches.length }
    })
  }, [searches, properties])

  async function markChecked(id) {
    if (busyId) return
    setBusyId(id)
    try {
      const { error } = await supabase.from('saved_searches').update({ last_checked_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, last_checked_at: new Date().toISOString() } : s)))
    } catch (err) {
      console.warn('Gagal memperbarui pengecekan:', err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(s) {
    if (busyId) return
    setBusyId(s.id)
    try {
      const { error } = await supabase.from('saved_searches').update({ active: !s.active }).eq('id', s.id)
      if (error) throw error
      setSearches((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))
    } catch (err) {
      console.warn('Gagal mengubah status alert:', err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function removeSearch(id) {
    if (!window.confirm(t('saved_searches.delete_confirm'))) return
    setBusyId(id)
    try {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id)
      if (error) throw error
      setSearches((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.warn('Gagal menghapus pencarian:', err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 bg-brand-surface/80 backdrop-blur-md z-10 border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" aria-label="Kembali" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-brand-text flex items-center gap-2">
              <BellRing size={18} className="text-brand-accent" />
              {t('saved_searches.title')}
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              {t('saved_searches.subtitle')}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : enriched.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-bg flex items-center justify-center mb-4">
              <BellOff size={30} className="text-brand-muted/40" />
            </div>
            <p className="text-sm font-semibold text-brand-text">{t('saved_searches.empty_title')}</p>
            <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">{t('saved_searches.empty_desc')}</p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
            >
              <Search size={15} />
              {t('saved_searches.empty_cta')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {enriched.map((s) => {
              const chips = describeFilters(s.filters, t)
              const preview = s.matches.slice(0, 3)
              const isBusy = busyId === s.id
              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-opacity ${s.active ? 'border-brand-border' : 'border-brand-border opacity-75'}`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-brand-text truncate">{s.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {chips.length > 0 ? chips.map((c, i) => (
                            <span key={i} className="text-[10px] font-semibold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-border">
                              {c}
                            </span>
                          )) : (
                            <span className="text-[10px] font-semibold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-border">
                              {t('saved_searches.all_properties')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {s.newCount > 0 && s.active && (
                          <span className="inline-flex items-center gap-1 bg-brand-accent/10 text-brand-accent border border-brand-accent/25 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            <TrendingUp size={11} />
                            {s.newCount} {t('saved_searches.new_badge')}
                          </span>
                        )}
                        {!s.active && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            <BellOff size={11} />
                            {t('saved_searches.paused')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-brand-muted">
                      <span className="font-bold text-brand-text">{s.matches.length}</span> {t('saved_searches.matches')}
                      {s.last_checked_at && (
                        <span className="hidden sm:inline">· {t('saved_searches.last_checked')}{' '}
                          {new Date(s.last_checked_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {preview.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {preview.map((p) => (
                          <Link
                            key={p.id}
                            to={`/property/${p.id}`}
                            className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-brand-bg"
                          >
                            <img
                              loading="lazy"
                              src={getImageSrc(p.image_url)}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                            />
                            <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white bg-black/55 backdrop-blur px-1.5 py-0.5 rounded-md truncate">
                              {formatPriceDisplay(p)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-brand-border">
                      <Link
                        to={`/explore${buildQueryString(s.filters)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold hover:brightness-90 active:scale-[0.98] transition-all"
                      >
                        <Eye size={13} />
                        {t('saved_searches.view_results')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => markChecked(s.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-xs font-semibold text-brand-text hover:bg-brand-border transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        {t('saved_searches.mark_checked')}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${
                          s.active
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {s.active ? <BellOff size={13} /> : <BellRing size={13} />}
                        {s.active ? t('saved_searches.pause') : t('saved_searches.resume')}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSearch(s.id)}
                        disabled={isBusy}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {t('saved_searches.delete')}
                      </button>
                    </div>
                  </div>

                  {preview.length > 0 && s.matches.length > 3 && (
                    <div className="px-4 sm:px-5 pb-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/explore${buildQueryString(s.filters)}`)}
                        className="text-xs font-semibold text-brand-accent hover:text-brand-primary transition-colors inline-flex items-center gap-1"
                      >
                        {t('saved_searches.show_all')} {s.matches.length} <MapPin size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
