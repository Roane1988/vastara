import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { getRecentlyViewed } from '../utils/recentlyViewed'
import { formatPrice } from '../utils/format'
import { getImageSrc } from '../utils/images'

export default function RecentlyViewed() {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(getRecentlyViewed())
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-brand-muted" />
        <h2 className="text-sm font-bold text-brand-text">Terakhir Dilihat</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/property/${p.id}`}
            className="shrink-0 w-36 rounded-xl bg-white border border-brand-border overflow-hidden hover:shadow-sm transition-shadow"
          >
            <div className="h-20 bg-gray-100">
              {p.image_url ? (
                <img src={getImageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-muted/40 text-xs">
                  No Image
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-[11px] font-semibold text-brand-text truncate leading-tight">{p.title}</p>
              <p className="text-[10px] text-brand-muted mt-0.5">
                {p.bedrooms} KT &middot; {p.bathrooms} KM &middot; {p.area_sqm} m&sup2;
              </p>
              <p className="text-[11px] font-bold text-brand-primary mt-0.5">{formatPrice(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
