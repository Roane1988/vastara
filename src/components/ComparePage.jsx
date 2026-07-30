import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'
import { formatPrice } from '../utils/format'
import { getCompareList, removeFromCompare, clearCompare } from '../utils/compare'
import { getImageSrc } from '../utils/images'

export default function ComparePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [fullData, setFullData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = getCompareList()
    setItems(ids)
    if (ids.length === 0) { setLoading(false); return }

    async function fetchData() {
      const dummies = ids.filter(p => p.id.startsWith('dummy-'))
      const real = ids.filter(p => !p.id.startsWith('dummy-'))

      const results = []

      for (const d of dummies) {
        const match = DUMMY_PROPERTIES.find(p => p.id === d.id)
        if (match) results.push(match)
      }

      if (real.length > 0) {
        const { data } = await supabase
          .from('properties')
          .select('*')
          .in('id', real.map(p => p.id))
        if (data) results.push(...data)
      }

      setFullData(results)
      setLoading(false)
    }
    fetchData()
  }, [])

  function handleRemove(id) {
    removeFromCompare(id)
    const updated = getCompareList()
    setItems(updated)
    window.dispatchEvent(new Event('compare-updated'))
    if (updated.length === 0) {
      setFullData([])
    } else {
      setFullData(prev => prev.filter(p => p.id !== id))
    }
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-brand-border bg-brand-surface">
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-brand-text">Bandingkan Properti</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-brand-muted" />
          </div>
          <p className="text-sm text-brand-muted">Belum ada properti untuk dibandingkan.</p>
        </div>
      </div>
    )
  }

  const rows = [
    { label: 'Harga', key: 'price', render: (p) => formatPrice(p.price || p.price) },
    { label: 'Tipe', key: 'property_type', alt: 'category', render: (p) => p.property_type || p.category || '-' },
    { label: 'Kamar Tidur', key: 'bedrooms', render: (p) => `${p.bedrooms || 0} KT` },
    { label: 'Kamar Mandi', key: 'bathrooms', render: (p) => `${p.bathrooms || 0} KM` },
    { label: 'Luas', key: 'area_sqm', alt: 'sqm', render: (p) => `${p.area_sqm || p.sqm || '-'} m²` },
    { label: 'Kota', key: 'city', render: (p) => p.city || p.location?.split(',').pop()?.trim() || '-' },
    { label: 'Alamat', key: 'address', render: (p) => p.address || p.location || '-' },
    { label: 'Status Sertifikat', key: 'certificate_status', render: (p) => p.certificate_status || '-' },
  ]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-brand-border bg-brand-surface">
        <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-brand-text flex-1">Bandingkan Properti</h1>
        {fullData.length > 0 && (
          <button
            type="button"
            onClick={() => { clearCompare(); setItems([]); setFullData([]); window.dispatchEvent(new Event('compare-updated')) }}
            className="text-xs text-red-500 hover:text-red-600 font-semibold"
          >
            Hapus Semua
          </button>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[640px] max-w-5xl mx-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-32 p-3 text-left text-xs font-bold text-brand-muted uppercase" />
                  {fullData.map(p => (
                    <th key={p.id} className="p-3 text-center relative">
                      <button
                        type="button"
                        onClick={() => handleRemove(p.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <Link to={`/property/${p.id}`} className="block">
                        <div className="h-28 rounded-xl overflow-hidden bg-gray-100 mb-2">
                          <img src={getImageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <p className="text-sm font-semibold text-brand-text leading-tight line-clamp-2">{p.title}</p>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key}>
                    <td className="p-3 border-t border-brand-border/50 text-xs font-bold text-brand-muted">{r.label}</td>
                    {fullData.map(p => (
                      <td key={p.id} className="p-3 border-t border-brand-border/50 text-sm text-brand-text text-center">
                        {r.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
