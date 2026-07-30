import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageCircle, Phone, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { formatPrice } from '../utils/format'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { parseImages, FALLBACK_IMAGE } from '../utils/images'
import { useGroqTranslation } from '../hooks/useGroqTranslation'
import useSEO from '../hooks/useSEO'
import NotFoundPage from './NotFoundPage'
import KprSimulator from './KprSimulator'
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

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg animate-pulse">
      <div className="w-full max-w-7xl mx-auto lg:px-5">
        <div className="h-72 sm:h-96 bg-brand-border lg:rounded-2xl lg:mt-5" />
      </div>
      <div className="px-5 pt-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-8 bg-brand-border rounded-lg w-3/4" />
        <div className="h-4 bg-brand-border rounded w-1/2" />
        <div className="h-7 bg-brand-border rounded w-1/3" />
        <div className="flex gap-4 pt-2">
          <div className="h-10 w-20 bg-brand-border rounded-lg" />
          <div className="h-10 w-20 bg-brand-border rounded-lg" />
          <div className="h-10 w-20 bg-brand-border rounded-lg" />
        </div>
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-brand-border rounded w-full" />
          <div className="h-4 bg-brand-border rounded w-full" />
          <div className="h-4 bg-brand-border rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

function GalleryDesktop({ images, property, onOpenLightbox }) {
  const heroImage = images[0] || FALLBACK_IMAGE

  if (images.length >= 4) {
    const remaining = images.slice(0, 5)
    return (
      <div className="hidden lg:grid lg:grid-cols-4 lg:grid-rows-2 lg:gap-2 lg:h-[420px] lg:rounded-2xl lg:overflow-hidden">
        <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(0)}>
          <img loading="lazy" src={remaining[0]} alt={property.title} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
        {remaining.slice(1, 5).map((url, i) => (
          <div key={i} className="relative overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(i + 1)}>
            <img loading="lazy" src={url} alt={`${property.title} ${i + 2}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    )
  }

  if (images.length === 2 || images.length === 3) {
    const cols = images.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
    return (
      <div className={`hidden lg:grid ${cols} lg:gap-2 lg:h-[360px] lg:rounded-2xl lg:overflow-hidden`}>
        {images.map((url, i) => (
          <div key={i} className="relative overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(i)}>
            <img loading="lazy" src={url} alt={`${property.title} ${i + 1}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="hidden lg:block lg:rounded-2xl overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(0)}>
      <img loading="lazy" src={heroImage} alt={property.title} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
    </div>
  )
}

function GalleryMobile({ images, property, onOpenLightbox }) {
  const thumbStartIndex = 1
  const thumbImages = images.slice(thumbStartIndex, thumbStartIndex + 4)
  return (
    <div className="lg:hidden">
      <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(0)}>
        <img loading="lazy" src={images[0] || FALLBACK_IMAGE} alt={property.title} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="grid grid-cols-4 gap-0.5">
        {thumbImages.map((url, i) => {
          const imgIndex = thumbStartIndex + i
          const isLast = i === 3 && images.length > 5
          return (
            <div key={i} className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(isLast ? 0 : imgIndex)}>
              <img loading="lazy" src={url} alt={`${property.title} ${imgIndex + 1}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              {isLast && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-bold">Lihat Semua</span>
                </div>
              )}
            </div>
          )
        })}
        {Array.from({ length: Math.max(0, 4 - thumbImages.length) }).map((_, n) => (
          <div key={n} className="aspect-[4/3] bg-brand-border" />
        ))}
      </div>
    </div>
  )
}

function Lightbox({ isOpen, images, currentIndex, onClose, onPrev, onNext, propertyTitle }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>
        <span className="text-sm text-white/80 font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="w-10" />
      </div>
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4">
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <img loading="lazy"
          src={images[currentIndex]}
          alt={`${propertyTitle} ${currentIndex + 1}`}
          onError={(e) => { e.target.src = FALLBACK_IMAGE }}
          className="max-w-full max-h-full object-contain"
        />
        <button
          type="button"
          onClick={onNext}
          className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}

function AccordionBlock({ id, title, children, isOpen, onToggle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold text-brand-text">{title}</span>
        <ChevronDown
          size={18}
          className={`text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-xs text-brand-muted leading-relaxed border-t border-brand-border pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang = i18n.language

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accordionState, setAccordionState] = useState({ panduan: false, disclaimer: false })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const agentCardRef = useRef(null)
  const [showFloatingBtn, setShowFloatingBtn] = useState(true)

  useSEO(property ? {
    title: property.title,
    description: `${property.property_type || 'Properti'} di ${property.city || 'Indonesia'} — ${property.bedrooms || 0} KT / ${property.bathrooms || 0} KM, ${property.area_sqm || '-'} m²`,
    image: parseImages?.(property.image_url)?.[0],
  } : { title: 'Detail Properti' })

  const images = property ? parseImages(property.image_url) : []

  const transFields = property ? {
    title: property.title,
    address: property.address || property.location || '',
    property_type: property.property_type || '',
  } : {}

  const { getText, loading: transLoading } = useGroqTranslation(property?.id || id, transFields)

  const displayTitle = getText('title', property?.title || '')
  const displayAddress = getText('address', property?.address || property?.location || 'Indonesia')
  const displayType = getText('property_type', property?.property_type || '')

  const openLightbox = (index) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const prevImage = () => {
    setLightboxIndex((i) => (i - 1 + images.length) % images.length)
  }

  const nextImage = () => {
    setLightboxIndex((i) => (i + 1) % images.length)
  }

  useEffect(() => {
    if (!isLightboxOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isLightboxOpen, images.length])

  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Properti tidak ditemukan')
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchProperty() {
      if (!cancelled) { setLoading(true); setError(null) }

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

      try {
        const { data, error: fetchError } = await supabase
          .from('properties')
          .select('*, profiles(first_name, role)')
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
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Gagal memuat properti')
          setLoading(false)
        }
      }
    }

    fetchProperty()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const el = agentCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingBtn(!entry.isIntersecting)
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px 50px 0px'
      }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return <NotFoundPage message={error} onBack={() => navigate(-1)} />
  }

  const waNumber = property.seller_whatsapp || property.agent_whatsapp || '6281234567890'
  const waMessage = encodeURIComponent(
    lang === 'en'
      ? `Hello, I am interested in ${displayTitle}`
      : `Halo, saya tertarik dengan properti ${displayTitle}`
  )
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`

  const sellerName = property.profiles?.first_name || 'Agen Properti'
  const sellerRole = property.profiles?.role === 'agent' ? 'Agen Properti'
    : property.profiles?.role === 'developer' ? 'Pengembang'
    : property.profiles?.role === 'owner' ? 'Pemilik Langsung'
    : 'Agen Properti'

  const phoneShort = `+${waNumber.slice(0, 4)}...${waNumber.slice(-3)}`

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="w-full max-w-7xl mx-auto lg:px-5 lg:mt-5 relative">
        <GalleryDesktop images={images} property={property} onOpenLightbox={openLightbox} />
        <GalleryMobile images={images} property={property} onOpenLightbox={openLightbox} />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-md hover:bg-white transition-colors cursor-pointer"
        >
          <ArrowLeftIcon />
        </button>

        <div className="lg:hidden px-4 pt-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={18} />
            Hubungi Pengiklan Segera
          </a>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-5 pt-5 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1">
                <MapPinIcon />
                <span>{displayAddress}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-text leading-tight">
                {displayTitle}
                {transLoading && lang === 'en' && (
                  <span className="inline-block ml-2 align-middle w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                )}
              </h1>
            </div>

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
                <span className="text-sm font-medium">{property.area_sqm || property.sqm || '-'} m&sup2;</span>
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-brand-text mb-2">
                {lang === 'en' ? 'Description' : 'Deskripsi'}
              </h2>
              <p className="text-sm text-brand-muted leading-relaxed">
                {lang === 'en' && property.description_en
                  ? property.description_en
                  : (property.description_id || `${displayTitle} — ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms, ${property.area_sqm || property.sqm || '-'} m².`)}
              </p>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Simulasi KPR</h3>
              <KprSimulator initialPrice={property?.price || 900000000} />
            </div>

            <AccordionBlock id="panduan" title="Panduan Membeli Properti" isOpen={accordionState.panduan} onToggle={(id) => setAccordionState((prev) => ({ ...prev, [id]: !prev[id] }))}>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Tentukan anggaran dan kebutuhan properti Anda.</li>
                <li>Cari properti yang sesuai dengan kriteria Anda.</li>
                <li>Lakukan survei langsung ke lokasi properti.</li>
                <li>Periksa kelengkapan dokumen legalitas properti.</li>
                <li>Lakukan negosiasi harga dengan penjual.</li>
                <li>Proses akad jual beli di hadapan Pejabat Pembuat Akta Tanah (PPAT).</li>
              </ol>
            </AccordionBlock>

            <AccordionBlock id="disclaimer" title="Disclaimer" isOpen={accordionState.disclaimer} onToggle={(id) => setAccordionState((prev) => ({ ...prev, [id]: !prev[id] }))}>
              Informasi yang ditampilkan pada halaman ini disediakan oleh pengiklan dan/atau pihak ketiga. HuniOne tidak bertanggung jawab atas keakuratan, kelengkapan, atau keabsahan informasi tersebut. Segala transaksi dan kesepakatan sepenuhnya merupakan tanggung jawab antara pembeli dan penjual.
            </AccordionBlock>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div ref={agentCardRef} className="bg-white rounded-xl shadow-md border border-brand-border p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: getAvatarColor(property.seller_id) }}
                  >
                    {getInitials(sellerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-text">{sellerName}</p>
                    <p className="text-xs text-brand-muted">{sellerRole}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-brand-text border border-brand-border hover:bg-brand-bg transition-colors active:scale-[0.98]"
                  >
                    <Phone size={16} className="text-brand-muted" />
                    {phoneShort}
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors active:scale-[0.98]"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Lightbox isOpen={isLightboxOpen} images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} propertyTitle={property.title} />

      <div className={`fixed bottom-0 left-0 right-0 w-full z-50 transition-transform duration-300 ease-in-out ${showFloatingBtn ? 'translate-y-0' : 'translate-y-[150%]'}`}>
        <div className="bg-brand-surface/95 backdrop-blur-md border-t border-brand-border px-5 py-4">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl font-bold text-white bg-brand-primary hover:brightness-90 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm"
          >
            <WhatsAppIcon />
            Hubungi Agent via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
