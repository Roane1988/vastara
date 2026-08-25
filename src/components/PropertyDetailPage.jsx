import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageCircle, MessageSquare, Phone, ChevronDown, ChevronRight, X, ChevronLeft, Calendar, Share2, MapPin, Tag, TrendingDown, Flag, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatPriceDisplay } from '../utils/format'
import { getAvatarColor, getInitials } from '../utils/avatar'
import { parseImages, FALLBACK_IMAGE } from '../utils/images'
import { getFinancialProfile, computeAffordability, estimateMonthlyRent } from '../utils/financialProfile'
import { useGroqTranslation } from '../hooks/useGroqTranslation'
import useSEO from '../hooks/useSEO'
import { usePropertyStore } from '../store/usePropertyStore'
import NotFoundPage from './NotFoundPage'
// import KprSimulator from './KprSimulator'
import InvestmentAnalyzer from './InvestmentAnalyzer'
import FairPriceAnalyzer from './FairPriceAnalyzer'
import ScheduleVisit from './ScheduleVisit'
import ReportListingModal from './ReportListingModal'
import { DUMMY_PROPERTIES } from '../data/dummyProperties'

function normalizeWhatsAppNumber(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  return digits
}

function ArrowLeftIcon() {  return (
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

function dropPct(p) {
  if (!p?.original_price || !p?.price) return 0
  const orig = Number(p.original_price)
  const curr = Number(p.price)
  if (orig <= curr || orig <= 0) return 0
  return ((orig - curr) / orig) * 100
}

function SpecGrid({ property }) {
  const pricePerSqmText = Number(property?.area_sqm) > 0 && Number(property?.price) > 0
    ? formatPrice(Math.round(Number(property.price) / Number(property.area_sqm)))
    : '-'
  const tiles = [
    { icon: <BedIcon />, label: 'Kamar', value: property?.bedrooms ?? '-' },
    { icon: <BathIcon />, label: 'Kamar Mandi', value: property?.bathrooms ?? '-' },
    { icon: <SqmIcon />, label: 'Luas Bangunan', value: `${property?.area_sqm || property?.sqm || '-'} m²` },
  ]
  if (Number(property?.land_area_sqm) > 0) {
    tiles.push({ icon: <SqmIcon />, label: 'Luas Tanah', value: `${property.land_area_sqm} m²` })
  }
  const furnishedMap = { furnished: 'Furnished', semi_furnished: 'Semi Furnished', unfurnished: 'Kosong' }
  const furnishedLabel = property?.category === 'Disewa' ? furnishedMap[property?.furnished] : null
  if (furnishedLabel) {
    tiles.push({ icon: <Tag size={18} />, label: 'Kondisi Isi', value: furnishedLabel })
  }
  if (property?.category !== 'Disewa') {
    tiles.push({ icon: <Tag size={18} />, label: 'Harga /m²', value: pricePerSqmText })
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-brand-bg/50 border border-brand-border p-3">
          <span className="text-brand-muted inline-block">{t.icon}</span>
          <p className="text-[10px] font-medium uppercase tracking-wide text-brand-muted mt-1.5">{t.label}</p>
          <p className="text-sm font-bold text-brand-text mt-0.5 truncate">{t.value}</p>
        </div>
      ))}
    </div>
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
  const drop = dropPct(property)

  if (images.length >= 5) {
    const remaining = images.slice(0, 5)
    return (
      <div className="hidden lg:grid lg:grid-cols-4 lg:grid-rows-2 lg:gap-2 lg:h-[420px] lg:rounded-2xl lg:overflow-hidden">
        <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(0)}>
          {drop > 0 && (
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow">
              <TrendingDown size={12} />
              Turun {drop.toFixed(1)}%
            </span>
          )}
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

  if (images.length === 4) {
    return (
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-2 lg:h-[360px] lg:rounded-2xl lg:overflow-hidden">
        {images.map((url, i) => (
          <div key={i} className="relative overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(i)}>
            <img loading="lazy" src={url} alt={`${property.title} ${i + 1}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
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
    <div className="hidden lg:block lg:rounded-2xl overflow-hidden cursor-pointer relative" onClick={() => onOpenLightbox(0)}>
      {drop > 0 && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow">
          <TrendingDown size={12} />
          Turun {drop.toFixed(1)}%
        </span>
      )}
      <img loading="lazy" src={heroImage} alt={property.title} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
    </div>
  )
}

function GalleryMobile({ images, property, onOpenLightbox }) {
  const [current, setCurrent] = useState(0)
  const touchRef = useRef({ startX: 0, startY: 0, diffX: 0, swiping: false })
  const [swipeOffset, setSwipeOffset] = useState(0)

  const galleryImages = images.length > 0 ? images : [FALLBACK_IMAGE]
  const totalCount = images.length
  const drop = dropPct(property)

  function goTo(index) {
    setCurrent(Math.max(0, Math.min(index, galleryImages.length - 1)))
    setSwipeOffset(0)
  }

  function onTouchStart(e) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, diffX: 0, swiping: false }
  }

  function onTouchMove(e) {
    const dx = e.touches[0].clientX - touchRef.current.startX
    const dy = Math.abs(e.touches[0].clientY - touchRef.current.startY)
    if (dy > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) return
    touchRef.current.swiping = true
    setSwipeOffset(dx)
  }

  function onTouchEnd() {
    if (!touchRef.current.swiping) return
    if (swipeOffset < -60 && current < galleryImages.length - 1) goTo(current + 1)
    else if (swipeOffset > 60 && current > 0) goTo(current - 1)
    else goTo(current)
    touchRef.current.swiping = false
  }

  function onMouseDown(e) {
    touchRef.current.startX = e.clientX
    touchRef.current.startY = e.clientY
    touchRef.current.swiping = false
    const onMove = (ev) => {
      const dx = ev.clientX - touchRef.current.startX
      const dy = Math.abs(ev.clientY - touchRef.current.startY)
      if (dy > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) { document.removeEventListener('mousemove', onMove); return }
      touchRef.current.swiping = true
      setSwipeOffset(dx)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!touchRef.current.swiping) { onOpenLightbox(current); return }
      if (swipeOffset < -60 && current < galleryImages.length - 1) goTo(current + 1)
      else if (swipeOffset > 60 && current > 0) goTo(current - 1)
      else goTo(current)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="lg:hidden">
      <div className="relative aspect-[4/3] overflow-hidden select-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown}>
        <div className="flex w-full h-full" style={{ transform: `translateX(calc(-${current * 100}% + ${swipeOffset}px))`, transition: swipeOffset !== 0 ? 'none' : 'transform 0.3s ease-out' }}>
          {galleryImages.map((url, i) => (
            <div key={i} className="w-full h-full flex-none">
              <img loading={i === 0 ? 'eager' : 'lazy'} src={url} alt={`${property.title} ${i + 1}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
        {totalCount > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {galleryImages.map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-3' : 'bg-white/50'}`} />
            ))}
          </div>
        )}
        {totalCount > 0 && (
          <div className="absolute top-3 right-3 z-10 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {current + 1}/{totalCount}
          </div>
        )}
        {drop > 0 && (
          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            <TrendingDown size={11} />
            Turun {drop.toFixed(1)}%
          </div>
        )}
      </div>
      {totalCount > 0 && (
        <div className="grid grid-cols-4 gap-0.5">
          {galleryImages.slice(0, 4).map((url, i) => (
            <div key={i} className={`relative aspect-[4/3] overflow-hidden cursor-pointer border-b-2 transition-colors ${i === current ? 'border-brand-primary' : 'border-transparent'}`} onClick={() => goTo(i)}>
              <img loading="lazy" src={url} alt={`${property.title} ${i + 1}`} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover" />
            </div>
          ))}
          {totalCount > 4 && (
            <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onOpenLightbox(current)}>
              <img loading="lazy" src={galleryImages[4]} alt="" onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <span className="text-white text-xs font-bold">+{totalCount - 4}</span>
              </div>
            </div>
          )}
        </div>
      )}
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
  const { user, showToast } = useAuth()
  const addRecentlyViewed = usePropertyStore((s) => s.addRecentlyViewed)

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accordionState, setAccordionState] = useState({ panduan: false, disclaimer: false })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const agentCardRef = useRef(null)
  const [showFloatingBtn, setShowFloatingBtn] = useState(true)
  const [similar, setSimilar] = useState([])
  const [sellerPortfolioCount, setSellerPortfolioCount] = useState(0)
  const [showScheduleVisit, setShowScheduleVisit] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [showReport, setShowReport] = useState(false)

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

  const { getText, loading: transLoading } = useGroqTranslation(
    property?.id && !property.id.startsWith('dummy-') ? property.id : null,
    transFields
  )

  const displayTitle = getText('title', property?.title || '')
  const displayAddress = getText('address', property?.address || property?.location || 'Indonesia')

  const description = lang === 'en' && property?.description_en
    ? property.description_en
    : (property?.description_id || (
        lang === 'en'
          ? `${displayTitle} — ${property?.bedrooms ?? '-'} bedrooms, ${property?.bathrooms ?? '-'} bathrooms, ${property?.area_sqm || property?.sqm || '-'} m².`
          : `${displayTitle} — ${property?.bedrooms ?? '-'} kamar, ${property?.bathrooms ?? '-'} kamar mandi, ${property?.area_sqm || property?.sqm || '-'} m².`
      ))

  function handleShare() {
    const shareData = {
      title: property?.title,
      text: `${displayTitle} - ${displayPrice}`,
      url: window.location.href,
    }
    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        showToast('Gagal membagikan properti. Coba lagi.', 'error')
      })
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(
        () => showToast('Link properti disalin', 'success'),
        () => showToast('Gagal menyalin link. Coba lagi.', 'error')
      )
    }
  }

  function handleReportClick() {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    setShowReport(true)
  }

  const openLightbox = (index) => {
    if (images.length === 0) return
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const prevImage = () => {
    if (images.length === 0) return
    setLightboxIndex((i) => (i - 1 + images.length) % images.length)
  }

  const nextImage = () => {
    if (images.length === 0) return
    setLightboxIndex((i) => (i + 1) % images.length)
  }

  useEffect(() => {
    if (!isLightboxOpen || images.length === 0) return
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
            addRecentlyViewed(match)
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
          .select('*, profiles!seller_id(first_name, role)')
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
        addRecentlyViewed(data)
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
  }, [id, addRecentlyViewed])

  useEffect(() => {
    const propId = property?.id
    const propCategory = property?.category
    const propCity = property?.city
    if (!propId || propId.startsWith('dummy-')) return
    let cancelled = false
    const orFilters = []
    if (propCategory) orFilters.push(`category.eq.${propCategory}`)
    if (propCity) orFilters.push(`city.ilike.%${propCity}%`)
    let query = supabase
      .from('properties')
      .select('id, title, price, category, price_period, bedrooms, bathrooms, area_sqm, address, city, image_url')
      .neq('id', propId)
      .eq('status', 'verified')
      .limit(6)
    if (orFilters.length > 0) query = query.or(orFilters.join(','))
    query.then(({ data }) => {
      if (!cancelled && data) setSimilar(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [property?.id, property?.category, property?.city])

  useEffect(() => {
    const sellerId = property?.seller_id
    if (!sellerId || property?.id?.startsWith('dummy-')) return
    let cancelled = false
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'verified')
      .neq('id', property.id)
      .then(({ count }) => {
        if (!cancelled) setSellerPortfolioCount(count ?? 0)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [property])

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

  useEffect(() => {
    function onScroll() { setShowStickyBar(window.scrollY > 300) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isRent = property?.category === 'Disewa' || property?.typeLabel === 'Disewa'
  const [rentAfford, setRentAfford] = useState(null)
  useEffect(() => {
    if (!isRent) return
    let cancelled = false
    getFinancialProfile().then(({ profile, isAuthenticated }) => {
      if (cancelled) return
      if (!isAuthenticated || !profile) { setRentAfford(null); return }
      const maxRent = computeAffordability(profile)?.maxInstallment || 0
      const monthlyRent = estimateMonthlyRent(property)
      setRentAfford({
        maxRent,
        monthlyRent,
        affordable: maxRent > 0 && monthlyRent > 0 && monthlyRent <= maxRent,
        hasProfile: maxRent > 0,
      })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRent, property?.id, property?.price, property?.price_period])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return <NotFoundPage message={error} onBack={() => navigate(-1)} />
  }

  const hasWhatsapp = Boolean(property.seller_whatsapp || property.agent_whatsapp)
  const rawNumber = hasWhatsapp ? (property.seller_whatsapp || property.agent_whatsapp) : ''
  const waNumber = normalizeWhatsAppNumber(rawNumber)
  const displayPrice = formatPriceDisplay(property)
  const locationText = [property.district, property.city].filter(Boolean).join(', ')
  const propertyLink = typeof window !== 'undefined' ? window.location.href : ''
  const waText = lang === 'en'
    ? `Hello, I'm interested in ${displayTitle}${locationText ? ` (${locationText})` : ''} — ${displayPrice}. Is it still available? ${propertyLink}`
    : `Halo, saya tertarik dengan properti ${displayTitle}${locationText ? ` (${locationText})` : ''} — ${displayPrice}. Apakah masih tersedia? ${propertyLink}`
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` : null

  const trackWaClick = () => {
    if (!property?.id || !property?.seller_id) return
    supabase
      .from('whatsapp_leads')
      .insert({ property_id: property.id, seller_id: property.seller_id, buyer_id: user?.id || null })
      .then(() => {})
      .catch(() => {})
  }

  const sellerName = property.profiles?.first_name || 'Agen Properti'
  const sellerRole = property.seller_type === 'developer' ? 'Pengembang'
    : property.seller_type === 'agent' ? 'Agen Properti'
    : 'Pemilik Langsung'

  const phoneShort = waNumber ? `+${waNumber.slice(0, 4)}...${waNumber.slice(-3)}` : null

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="w-full max-w-7xl mx-auto lg:px-5 lg:mt-5 relative">
        <nav className="hidden lg:flex items-center gap-1.5 text-xs text-brand-muted px-1 pb-3" aria-label="Breadcrumb">
          <Link to="/explore" className="hover:text-brand-text transition-colors">Beranda</Link>
          <span aria-hidden="true">/</span>
          {property.category && (
            <>
              <span>{property.category}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          {property.city && (
            <>
              <span className="truncate max-w-[180px]">{property.city}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-brand-text font-semibold truncate max-w-[280px]">{displayTitle}</span>
        </nav>
        <GalleryDesktop images={images} property={property} onOpenLightbox={openLightbox} />
        <GalleryMobile images={images} property={property} onOpenLightbox={openLightbox} />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-md hover:bg-white transition-colors cursor-pointer"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-md hover:bg-white transition-colors cursor-pointer"
          aria-label="Share"
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-5 pt-5 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1">
                <MapPinIcon />
                <span>{locationText || displayAddress}</span>
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
                {displayPrice}
              </p>
              {property.area_sqm > 0 && property.price > 0 && !isRent && (
                <p className="text-sm text-brand-muted mt-0.5">
                  {formatPrice(Math.round(property.price / property.area_sqm))} / m&sup2;
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {property.is_premium && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-400 text-amber-950 border border-amber-500">
                  {lang === 'en' ? 'Premium' : 'Premium'}
                </span>
              )}
              {property.certificate_status && !isRent && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {property.certificate_status}
                </span>
              )}
              {property.category && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {property.category}
                </span>
              )}
              {property.status === 'verified' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-highlight/40 text-brand-text border border-brand-accent/30">
                  Verified
                </span>
              )}
            </div>

            <div className="mt-4">
              <SpecGrid property={property} />
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center text-brand-muted">
                  <MapPin size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-text mb-0.5">{lang === 'en' ? 'Location' : 'Lokasi'}</p>
                  <p className="text-sm text-brand-muted leading-relaxed">{locationText || displayAddress}</p>
                </div>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(locationText || displayAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-primary hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                {lang === 'en' ? 'View area on map' : 'Lihat lokasi di peta'}
              </a>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackWaClick}
                  className="mt-2.5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-brand-text border border-brand-border hover:bg-brand-bg transition-colors active:scale-[0.98]"
                >
                  <WhatsAppIcon />
                  {lang === 'en' ? 'Get full address via WhatsApp' : 'Dapatkan alamat lengkap'}
                </a>
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-brand-text mb-2">
                {lang === 'en' ? 'Description' : 'Deskripsi'}
              </h2>
              <div className={`text-sm text-brand-muted leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}>
                {description}
              </div>
              {description.length > 120 && (
                <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="text-xs font-semibold text-brand-primary mt-1 hover:underline cursor-pointer">
                  {descExpanded ? (lang === 'en' ? 'Show less' : 'Sembunyikan') : (lang === 'en' ? 'Read more' : 'Baca selengkapnya')}
                </button>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200">
              {isRent ? (
                <>
                  <h3 className="text-2xl font-bold text-brand-text mb-6">Simulasi Sewa</h3>
                  <div className="bg-brand-bg/60 rounded-2xl border border-brand-border p-5">
                    <p className="text-sm text-brand-muted leading-relaxed">
                      Properti ini disewakan dengan biaya sewa{' '}
                      <b className="text-brand-primary">{formatPriceDisplay(property)}</b>.
                    </p>
                    {rentAfford?.hasProfile ? (
                      <div className={`mt-4 rounded-xl border px-4 py-3.5 ${rentAfford.affordable ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <p className={`flex items-center gap-2 text-sm font-bold ${rentAfford.affordable ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {rentAfford.affordable ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                          {rentAfford.affordable ? 'Sewa dalam jangkauan budgetmu' : 'Sewa ini di atas budget idealmu'}
                        </p>
                        <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                          Sewa <b>{formatPrice(rentAfford.monthlyRent)}</b>/bulan vs budget ideal{' '}
                          <b>{formatPrice(rentAfford.maxRent)}</b>/bulan (dari profil keuanganmu).
                        </p>
                        <div className="mt-3 h-1.5 rounded-full bg-white/70 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rentAfford.affordable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.round((rentAfford.monthlyRent / rentAfford.maxRent) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { if (!user) { navigate('/login'); return } window.dispatchEvent(new Event('open-financial-profile')) }}
                        className="mt-4 inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-accent/10 text-brand-accent border border-brand-accent/20 text-sm font-bold hover:bg-brand-accent/20 transition-all"
                      >
                        <Wallet size={16} />
                        Isi profil keuangan untuk lihat jangkauan sewa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowScheduleVisit(true)}
                      className="mt-4 inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-primary text-white text-sm font-bold hover:brightness-90 active:scale-[0.98] transition-all"
                    >
                      <Calendar size={16} />
                      Atur Jadwal Inspeksi
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {!isRent && (
              <div className="mt-10 pt-8 border-t border-gray-200">
                <InvestmentAnalyzer property={property} />
              </div>
            )}

            {!isRent && (
              <div className="mt-10 pt-8 border-t border-gray-200">
                <FairPriceAnalyzer property={property} />
              </div>
            )}

            <AccordionBlock id="panduan" title={isRent ? 'Panduan Menyewa Properti' : 'Panduan Membeli Properti'} isOpen={accordionState.panduan} onToggle={(id) => setAccordionState((prev) => ({ ...prev, [id]: !prev[id] }))}>
              <ol className="list-decimal pl-4 space-y-1.5">
                {isRent ? (
                  <>
                    <li>Tentukan anggaran sewa dan kebutuhan Anda.</li>
                    <li>Cari properti sewa yang sesuai dengan kriteria Anda.</li>
                    <li>Lakukan survei langsung ke lokasi properti.</li>
                    <li>Periksa kondisi properti dan kelengkapan dokumen.</li>
                    <li>Negosiasikan harga sewa dan jangka waktu kontrak.</li>
                    <li>Tandatangani perjanjian sewa-menyewa yang jelas.</li>
                  </>
                ) : (
                  <>
                    <li>Tentukan anggaran dan kebutuhan properti Anda.</li>
                    <li>Cari properti yang sesuai dengan kriteria Anda.</li>
                    <li>Lakukan survei langsung ke lokasi properti.</li>
                    <li>Periksa kelengkapan dokumen legalitas properti.</li>
                    <li>Lakukan negosiasi harga dengan penjual.</li>
                    <li>Proses akad jual beli di hadapan Pejabat Pembuat Akta Tanah (PPAT).</li>
                  </>
                )}
              </ol>
            </AccordionBlock>

            <AccordionBlock id="disclaimer" title="Disclaimer" isOpen={accordionState.disclaimer} onToggle={(id) => setAccordionState((prev) => ({ ...prev, [id]: !prev[id] }))}>
              Informasi yang ditampilkan pada halaman ini disediakan oleh pengiklan dan/atau pihak ketiga. HuniOne tidak bertanggung jawab atas keakuratan, kelengkapan, atau keabsahan informasi tersebut. Segala transaksi dan kesepakatan sepenuhnya merupakan tanggung jawab antara pembeli dan penjual.
            </AccordionBlock>

            <button
              type="button"
              onClick={handleReportClick}
              className="mt-8 flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-red-600 transition-colors cursor-pointer"
            >
              <Flag size={13} />
              {lang === 'en' ? 'Report this listing' : 'Laporkan Iklan'}
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-xl shadow-md border border-brand-border p-5">
                <p className="text-2xl font-extrabold text-brand-primary leading-none">{displayPrice}</p>
                {property.area_sqm > 0 && property.price > 0 && !isRent && (
                  <p className="text-sm text-brand-muted mt-1.5">
                    {formatPrice(Math.round(property.price / property.area_sqm))} / m&sup2;
                  </p>
                )}
                <div className="mt-4">
                  <SpecGrid property={property} />
                </div>
              </div>
              <div ref={agentCardRef} className="bg-white rounded-xl shadow-md border border-brand-border p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Link to={`/seller/${property.seller_id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: getAvatarColor(property.seller_id) }}
                    >
                      {getInitials(sellerName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-text truncate group-hover:text-brand-accent transition-colors">{sellerName}</p>
                      <p className="text-xs text-brand-muted flex items-center gap-1">
                        {sellerRole}
                        <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      {sellerPortfolioCount >= 1 && (
                        <p className="text-xs font-medium text-brand-accent mt-0.5 group-hover:underline">
                          {lang === 'en' ? `View ${sellerPortfolioCount} more properties` : `Lihat ${sellerPortfolioCount} properti lainnya`}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
                <div className="flex flex-col gap-3">
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackWaClick}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-brand-text border border-brand-border hover:bg-brand-bg transition-colors active:scale-[0.98]"
                    >
                      <Phone size={16} className="text-brand-muted" />
                      {phoneShort}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowScheduleVisit(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-brand-text border border-brand-border hover:bg-brand-bg transition-colors active:scale-[0.98]"
                  >
                    <Calendar size={16} className="text-brand-muted" />
                    {isRent ? 'Jadwal Inspeksi' : 'Jadwal Survei'}
                  </button>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackWaClick}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors active:scale-[0.98]"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  )}
                  {property.seller_id && (
                    <Link
                      to={`/chat?user=${property.seller_id}&property=${property.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 hover:bg-brand-primary/10 transition-colors active:scale-[0.98]"
                    >
                      <MessageSquare size={16} />
                      Chat di HuniOne
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Lightbox isOpen={isLightboxOpen} images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} propertyTitle={property.title} />

      <div className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border shadow-sm transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : '-translate-y-full'} hidden lg:block`}>
        <div className="max-w-7xl mx-auto px-5 py-2.5 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-4">
            <p className="text-sm font-bold text-brand-text truncate">{displayTitle}</p>
            <p className="text-xs font-semibold text-brand-primary">{displayPrice}</p>
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={trackWaClick} className="shrink-0 flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors active:scale-[0.97]">
              <MessageCircle size={16} />
              WhatsApp
            </a>
          )}
          {property.seller_id && (
            <Link to={`/chat?user=${property.seller_id}&property=${property.id}`} className="shrink-0 flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-bold text-brand-primary bg-brand-primary/5 border border-brand-primary/20 hover:bg-brand-primary/10 transition-colors active:scale-[0.97]">
              <MessageSquare size={16} />
              Chat
            </Link>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="max-w-7xl mx-auto px-5 pb-6">
          <h2 className="text-lg font-bold text-brand-text mb-4">Properti Serupa</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {similar.map((p) => (
              <Link key={p.id} to={`/property/${p.id}`} className="group block bg-brand-surface rounded-xl overflow-hidden border border-brand-border/50 hover:shadow-md hover:border-brand-border transition-all duration-200">
                <div className="aspect-[4/3] overflow-hidden bg-brand-border/30">
                  <img loading="lazy" src={parseImages(p.image_url)?.[0] || FALLBACK_IMAGE} alt={p.title} onError={(e) => { e.target.src = FALLBACK_IMAGE }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-brand-text truncate">{p.title}</p>
                  <p className="text-xs font-bold text-brand-primary mt-0.5">{formatPriceDisplay(p)}</p>
                  <p className="text-[10px] text-brand-muted truncate mt-0.5">{p.bedrooms} KT &bull; {p.bathrooms} KM &bull; {p.area_sqm} m&sup2;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showScheduleVisit && (
        <ScheduleVisit property={property} onClose={() => setShowScheduleVisit(false)} />
      )}

      <ReportListingModal
        key={`report-${showReport}-${property?.id}`}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        propertyId={property?.id}
        propertyTitle={property?.title}
        onSubmitted={() => {}}
      />

      {waLink && (
        <div className={`fixed bottom-0 left-0 right-0 w-full z-50 lg:hidden transition-transform duration-300 ease-in-out ${showFloatingBtn ? 'translate-y-0' : 'translate-y-[150%]'}`}>
          <div className="bg-brand-surface/95 backdrop-blur-md border-t border-brand-border px-5 py-4 flex items-center gap-4">
            <div className="min-w-0 shrink">
              <p className="text-[10px] font-medium uppercase tracking-wide text-brand-muted">{lang === 'en' ? 'Price' : 'Harga'}</p>
              <p className="text-lg font-extrabold text-brand-text leading-tight truncate">{displayPrice}</p>
              {Number(property?.price) > 0 && Number(property?.area_sqm) > 0 && !isRent && (
                <p className="text-[11px] text-brand-muted truncate">{formatPrice(Math.round(Number(property.price) / Number(property.area_sqm)))} /m²</p>
              )}
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackWaClick}
              className="shrink-0 flex-1 min-w-0 py-3 rounded-xl font-bold text-white bg-brand-primary hover:brightness-90 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-sm"
            >
              <WhatsAppIcon />
              <span className="truncate">Hubungi via WA</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
