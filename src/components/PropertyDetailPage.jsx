import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import NotFoundPage from './NotFoundPage'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function BedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  )
}

function BathIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" />
      <path d="M6 12V5a2 2 0 0 1 2-2h3v2.25" />
      <path d="M4 21l1-1.5" />
      <path d="M20 21l-1-1.5" />
    </svg>
  )
}

function SqmIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9]/g, '')) : Number(value)
  if (isNaN(num)) return `Rp ${value}`
  return `Rp ${num.toLocaleString('id-ID')}`
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg animate-pulse">
      <div className="h-72 sm:h-96 bg-slate-200 " />
      <div className="px-5 pt-6 space-y-4">
        <div className="h-8 bg-slate-200  rounded-lg w-3/4" />
        <div className="h-4 bg-slate-200  rounded w-1/2" />
        <div className="h-7 bg-slate-200  rounded w-1/3" />
        <div className="flex gap-4 pt-2">
          <div className="h-10 w-20 bg-slate-200  rounded-lg" />
          <div className="h-10 w-20 bg-slate-200  rounded-lg" />
          <div className="h-10 w-20 bg-slate-200  rounded-lg" />
        </div>
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-slate-200  rounded w-full" />
          <div className="h-4 bg-slate-200  rounded w-full" />
          <div className="h-4 bg-slate-200  rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'

export default function PropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProperty() {
      setLoading(true)
      setError(null)

      if (id.startsWith('dummy-')) {
        const match = DUMMY_PROPERTIES.find((p) => p.id === id)
        if (!cancelled) {
          if (match) {
            setProperty(match)
          } else {
            setError('Properti tidak ditemukan')
          }
          setLoading(false)
        }
        return
      }

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      if (!data) {
        setError('Properti tidak ditemukan')
        setLoading(false)
        return
      }

      setProperty(data)
      setLoading(false)
    }

    fetchProperty()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return <NotFoundPage message={error} onBack={() => navigate(-1)} />
  }

  const waNumber = property.agent_whatsapp || '6281234567890'
  const waMessage = encodeURIComponent(`Halo, saya tertarik dengan properti ${property.title}`)
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="relative h-72 sm:h-96 overflow-hidden">
        <img
          src={property.image_url || FALLBACK_IMAGE}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-md hover:bg-white transition-colors"
        >
          <ArrowLeftIcon />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1.5">
            <MapPinIcon />
            <span>{property.location || 'Indonesia'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {property.title}
          </h1>
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-28 space-y-6">
        <div>
          <p className="text-2xl font-extrabold text-brand-primary">
            {formatPrice(property.price)}
          </p>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-brand-muted ">
            <BedIcon />
            <span className="text-sm font-medium">{property.bedrooms} Kamar</span>
          </div>
          <div className="flex items-center gap-2 text-brand-muted ">
            <BathIcon />
            <span className="text-sm font-medium">{property.bathrooms} Kamar Mandi</span>
          </div>
          <div className="flex items-center gap-2 text-brand-muted ">
            <SqmIcon />
            <span className="text-sm font-medium">{property.sqm} m&sup2;</span>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-brand-text mb-2">
            Deskripsi
          </h2>
          <p className="text-sm text-brand-muted  leading-relaxed">
            {property.description || `${property.title} — properti premium dengan ${property.bedrooms} kamar tidur dan ${property.bathrooms} kamar mandi, luas bangunan ${property.sqm} m&sup2;.`}
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-brand-surface/95 backdrop-blur-md border-t border-brand-border px-5 py-4">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl font-bold text-white bg-brand-primary hover:bg-[#152d4a] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg"
        >
          <WhatsAppIcon />
          Hubungi Agent via WhatsApp
        </a>
      </div>
    </div>
  )
}
