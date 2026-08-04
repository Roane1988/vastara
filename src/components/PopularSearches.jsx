import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { getImageSrc } from '../utils/images'
import { formatCount } from '../utils/format'

function buildCards(props) {
  const byCity = {}
  const byType = {}

  for (const p of props) {
    const city = (p.city || '').trim()
    if (city) {
      if (!byCity[city]) byCity[city] = { count: 0, image: '', types: new Set() }
      byCity[city].count++
      if (!byCity[city].image && p.image_url) byCity[city].image = p.image_url
      if (p.property_type) byCity[city].types.add(p.property_type)
    }
    const type = (p.property_type || '').trim()
    if (type) {
      if (!byType[type]) byType[type] = { count: 0, image: '', cities: new Set() }
      byType[type].count++
      if (!byType[type].image && p.image_url) byType[type].image = p.image_url
      if (p.city) byType[type].cities.add(p.city)
    }
  }

  const cityCards = Object.entries(byCity)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([city, g]) => ({
      kind: 'city',
      title: `Properti di ${city}`,
      to: `/explore?q=${encodeURIComponent(city)}`,
      tags: [...g.types].slice(0, 3),
      count: g.count,
      image: g.image,
    }))

  const typeCards = Object.entries(byType)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([type, g]) => ({
      kind: 'type',
      title: `${type} untuk Anda`,
      to: `/explore?type=${encodeURIComponent(type)}`,
      tags: [...g.cities].slice(0, 3),
      count: g.count,
      image: g.image,
    }))

  return [...cityCards, ...typeCards].slice(0, 4)
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden flex items-stretch animate-pulse">
      <div className="w-24 sm:w-32 shrink-0 bg-brand-bg" />
      <div className="flex-1 p-4 space-y-2">
        <div className="h-4 w-2/3 bg-brand-bg rounded-md" />
        <div className="h-3 w-24 bg-brand-bg rounded-md" />
        <div className="h-3 w-1/2 bg-brand-bg rounded-md" />
      </div>
    </div>
  )
}

export default function PopularSearches() {
  const { t } = useTranslation()
  const cancelledRef = useRef(false)
  const [items, setItems] = useState([])
  const [order, setOrder] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cancelledRef.current = false

    async function load() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('city, district, property_type, image_url, title')
          .eq('status', 'verified')
          .limit(1000)
        if (cancelledRef.current) return
        if (error) {
          console.warn('Gagal memuat pencarian populer:', error.message)
          setItems([])
          setOrder([])
          return
        }
        const cards = buildCards(data || [])
        setItems(cards)
        setOrder(cards.map((_, i) => i))
      } catch (err) {
        if (!cancelledRef.current) console.warn('Gagal memuat pencarian populer:', err.message)
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    load()

    return () => { cancelledRef.current = true }
  }, [])

  function handleShuffle() {
    const shuffled = [...order]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setOrder(shuffled)
  }

  const visible = order.map((i) => items[i]).filter(Boolean)

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="h-6 w-52 bg-brand-bg rounded-md animate-pulse mb-4" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-brand-text">
          {t('explore.popular_searches.title')}
        </h2>
        <button
          type="button"
          onClick={handleShuffle}
          className="text-sm font-semibold text-brand-accent hover:text-brand-primary transition-colors"
        >
          {t('explore.popular_searches.shuffle')}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {visible.map((item) => (
          <Link
            key={`${item.kind}-${item.title}`}
            to={item.to}
            className="bg-brand-surface rounded-2xl shadow-sm overflow-hidden flex items-stretch group"
          >
            <div className="w-24 sm:w-32 shrink-0 overflow-hidden">
              <img loading="lazy"
                src={item.image ? getImageSrc(item.image) : getImageSrc(null)}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center">
              <h3 className="text-sm sm:text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">
                {item.title}
              </h3>
              <p className="text-xs font-semibold text-brand-primary mt-0.5">
                {formatCount(item.count)} properti
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
