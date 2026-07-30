import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, X, Plus, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const BSD_CENTER = [-6.3006, 106.6527]

function DraggableMarker({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng)
    },
  })

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const pos = e.target.getLatLng()
          onPositionChange(pos.lat, pos.lng)
        },
      }}
    />
  )
}

function VerticalStepper({ steps, current }) {
  return (
    <div className="flex flex-col w-full">
      {steps.map((s, i) => {
        const isCompleted = i < current
        const isActive = i === current
        const isLast = i === steps.length - 1

        return (
          <div key={s.id} className="flex flex-col">
            <div className="flex items-stretch gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isCompleted
                    ? 'bg-brand-primary text-white'
                    : isActive
                    ? 'bg-brand-primary text-white ring-4 ring-brand-accent/30'
                    : 'bg-brand-bg border border-brand-border text-brand-muted'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[2rem] transition-colors duration-300 ${
                      isCompleted ? 'bg-brand-primary' : 'bg-brand-border'
                    }`}
                  />
                )}
              </div>

              <div className="pb-6 flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-brand-text'
                      : isCompleted
                      ? 'text-brand-accent'
                      : 'text-brand-muted'
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-brand-muted truncate mt-0.5">{s.desc}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SellPropertyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast, loading: authLoading } = useAuth()
  const ALLOWED_ROLES = ['owner', 'agent', 'developer']
  const rawRole = location.state?.role || 'owner'
  const userRole = ALLOWED_ROLES.includes(rawRole) ? rawRole : 'owner'

  const STEPS = useMemo(() => [
    { id: 'kontak', label: t('sellProperty.steps.contact'), desc: t('sellProperty.steps.contact_desc') },
    { id: 'properti', label: t('sellProperty.steps.property'), desc: t('sellProperty.steps.property_desc') },
    { id: 'lokasi', label: t('sellProperty.steps.location'), desc: t('sellProperty.steps.location_desc') },
    { id: 'detail', label: t('sellProperty.steps.detail'), desc: t('sellProperty.steps.detail_desc') },
    { id: 'dokumen', label: t('sellProperty.steps.document'), desc: t('sellProperty.steps.document_desc') },
  ], [t])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    whatsapp: '',
    title: '',
    jenis_properti: '',
    status_sertifikat: '',
    estimasi_harga: '',
    address: '',
    description: '',
    sqm: '',
    bedrooms: '',
    bathrooms: '',
    latitude: null,
    longitude: null,
  })
  const [locationUrl, setLocationUrl] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imageUploadError, setImageUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)


  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return form.whatsapp.replace(/\D/g, '').length >= 10
      case 1: return form.title.trim() && form.jenis_properti && form.status_sertifikat && form.estimasi_harga
      case 2: return form.address.trim().length > 0
      case 3: return form.description.trim() && form.sqm && form.bedrooms && form.bathrooms
      case 4: return imageFiles.length > 0
      default: return true
    }
  }, [step, form, imageFiles.length])

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const MAX_IMAGES = 10

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

  const handleImagesSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return

    const remaining = MAX_IMAGES - imageFiles.length
    if (remaining <= 0) {
      setImageUploadError(`Maksimal ${MAX_IMAGES} foto. Hapus salah satu untuk menambah.`)
      return
    }

    const validFiles = selectedFiles.slice(0, remaining)
    const invalidType = validFiles.find((f) => !ALLOWED_MIME_TYPES.includes(f.type))
    if (invalidType) {
      setImageUploadError('Hanya file gambar (JPG, PNG, WEBP, AVIF) yang diperbolehkan.')
      return
    }

    const oversized = validFiles.find((f) => f.size > 5 * 1024 * 1024)
    if (oversized) {
      setImageUploadError('Ukuran file maksimal 5MB per gambar.')
      return
    }

    setImageFiles((prev) => [...prev, ...validFiles])
    setImageUploadError('')
    e.target.value = ''
  }

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showToast('Sesi habis, silakan login ulang.', 'error')
        setSubmitting(false)
        return
      }

      const { error: roleError } = await supabase.from('profiles').update({ role: userRole }).eq('id', user.id)
      if (roleError) {
        console.warn('Gagal memperbarui role:', roleError.message)
      }

      let uploadedImageUrls = []
      if (imageFiles.length > 0) {
        try {
          const uploads = imageFiles.map(async (file) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const fileName = `${user.id}-${Date.now()}-${safeName}`
            const { error: uploadErr } = await supabase.storage
              .from('PROPERTIES_IMAGE')
              .upload(fileName, file)
            if (uploadErr) throw new Error(uploadErr.message)
            const { data: { publicUrl } } = supabase.storage
              .from('PROPERTIES_IMAGE')
              .getPublicUrl(fileName)
            return publicUrl
          })
          uploadedImageUrls = await Promise.all(uploads)
        } catch (err) {
          showToast('Gagal mengunggah gambar: ' + err.message, 'error')
          setSubmitting(false)
          return
        }
      }

      const { error: insertError } = await supabase
        .from('properties')
        .insert({
          seller_id: user.id,
          category: 'Dijual',
          title: form.title,
          property_type: form.jenis_properti,
          seller_whatsapp: form.whatsapp,
          description_id: form.description,
          address: form.address,
          price: form.estimasi_harga ? Number(form.estimasi_harga) : null,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 0,
          area_sqm: Number(form.sqm) || 0,
          image_url: JSON.stringify(uploadedImageUrls),
          status: 'pending',
          latitude: form.latitude,
          longitude: form.longitude,
        })

      if (insertError) {
        showToast(insertError.message, 'error')
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      showToast('Properti berhasil dikirim', 'success')
      setIsSubmitted(true)
    } catch (err) {
      showToast('Terjadi kesalahan: ' + (err.message || 'Silakan coba lagi.'), 'error')
      setSubmitting(false)
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.contact_step.whatsapp_label')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">
                  +62
                </span>
                <input
                  type="tel"
                  placeholder={t('sellProperty.contact_step.phone_placeholder')}
                  value={form.whatsapp}
                  onChange={handleChange('whatsapp')}
                  className="w-full py-4 pl-12 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>
              <p className="text-xs text-brand-muted mt-1.5">
                {t('sellProperty.contact_step.helper')}
              </p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.property_step.title_label')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t('sellProperty.property_step.title_placeholder')}
                value={form.title}
                onChange={handleChange('title')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.property_step.type_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.jenis_properti}
                onChange={handleChange('jenis_properti')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors appearance-none"
              >
                <option value="">{t('sellProperty.property_step.type_placeholder')}</option>
                <option value="Rumah">{t('sellProperty.property_types.rumah')}</option>
                <option value="Apartemen">{t('sellProperty.property_types.apartemen')}</option>
                <option value="Villa">{t('sellProperty.property_types.villa')}</option>
                <option value="Tanah">{t('sellProperty.property_types.tanah')}</option>
                <option value="Ruko">{t('sellProperty.property_types.ruko')}</option>
                <option value="Kantor">{t('sellProperty.property_types.kantor')}</option>
                <option value="Lainnya">{t('sellProperty.property_types.lainnya')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.property_step.certificate_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status_sertifikat}
                onChange={handleChange('status_sertifikat')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors appearance-none"
              >
                <option value="">{t('sellProperty.property_step.certificate_placeholder')}</option>
                <option value="SHM">{t('sellProperty.certificate_statuses.shm')}</option>
                <option value="SHGB">{t('sellProperty.certificate_statuses.shgb')}</option>
                <option value="PPJB">{t('sellProperty.certificate_statuses.ppjb')}</option>
                <option value="Belum Bersertifikat">{t('sellProperty.certificate_statuses.belum')}</option>
                <option value="Lainnya">{t('sellProperty.certificate_statuses.lainnya')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.property_step.price_label')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('sellProperty.property_step.price_placeholder')}
                  value={form.estimasi_harga}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setForm((p) => ({ ...p, estimasi_harga: raw }))
                  }}
                  className="w-full py-4 pl-10 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>
              {form.estimasi_harga && (
                <p className="text-xs text-brand-muted mt-1.5">
                  Rp {Number(form.estimasi_harga).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.location_step.address_label')} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder={t('sellProperty.location_step.address_placeholder')}
                value={form.address}
                onChange={handleChange('address')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block flex items-center gap-1.5">
                <MapPin size={15} />
                Lokasi di Peta <span className="text-xs text-brand-muted font-normal">(opsional)</span>
              </label>
              <p className="text-xs text-brand-muted mb-2">
                Seret marker atau klik peta untuk menentukan lokasi properti.
              </p>
              <div className="rounded-xl overflow-hidden border border-brand-border">
                <MapContainer
                  center={BSD_CENTER}
                  zoom={13}
                  className="h-[300px] w-full"
                  style={{ height: '300px', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <DraggableMarker
                    position={
                      form.latitude != null && form.longitude != null
                        ? [form.latitude, form.longitude]
                        : BSD_CENTER
                    }
                    onPositionChange={(lat, lng) =>
                      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                    }
                  />
                </MapContainer>
              </div>
              {form.latitude != null && form.longitude != null && (
                <p className="text-xs text-brand-muted mt-1.5">
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  {t('sellProperty.detail_step.area_label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder={t('sellProperty.detail_step.area_placeholder')}
                  value={form.sqm}
                  onChange={handleChange('sqm')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  {t('sellProperty.detail_step.bedroom_label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={t('sellProperty.detail_step.bedroom_placeholder')}
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  {t('sellProperty.detail_step.bathroom_label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={t('sellProperty.detail_step.bathroom_placeholder')}
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                {t('sellProperty.detail_step.description_label')} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder={t('sellProperty.detail_step.description_placeholder')}
                value={form.description}
                onChange={handleChange('description')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none"
              />
            </div>
          </div>
        )

      case 4: {
        const allImages = [...imageFiles]

        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Foto Properti <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-brand-muted mb-3">
                Unggah minimal 1 foto properti Anda (maksimal {MAX_IMAGES} foto, maks 5MB per file).
              </p>

              {allImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                  {allImages.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="relative group aspect-square rounded-xl overflow-hidden border border-brand-border bg-brand-bg">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  ))}
                  {allImages.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-brand-border bg-brand-bg/50 flex flex-col items-center justify-center cursor-pointer hover:border-brand-accent hover:bg-brand-bg transition-colors">
                      <Plus size={24} className="text-brand-muted" />
                      <span className="text-[10px] text-brand-muted mt-1 font-medium">Tambah</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagesSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {allImages.length === 0 && (
                <label className="flex flex-col items-center justify-center w-full py-10 px-4 border-2 border-dashed rounded-xl cursor-pointer border-brand-border bg-brand-bg hover:border-brand-accent transition-colors">
                  <UploadIcon />
                  <span className="mt-3 text-sm font-medium text-brand-text">
                    Klik untuk unggah foto
                  </span>
                  <span className="mt-1 text-xs text-brand-muted">
                    Maksimal {MAX_IMAGES} foto, format JPG/PNG, maks 5MB per file
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesSelect}
                    className="hidden"
                  />
                </label>
              )}

              {imageUploadError && (
                <p className="text-xs text-red-500 mt-2">{imageUploadError}</p>
              )}
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      {isSubmitted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle size={48} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-brand-text">Berhasil Terkirim!</h2>
          <p className="text-brand-muted mt-2 mb-8 max-w-md leading-relaxed">
            Tim HuniOne sedang memverifikasi kelengkapan dokumen legalitas Anda. Iklan akan otomatis tayang dalam 1x24 jam setelah disetujui.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            Kembali ke Beranda
          </button>
        </div>
      ) : (
        <>
        <header className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-lg font-bold text-brand-text">{t('sellProperty.title')}</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="md:w-64 md:min-h-screen md:border-r md:border-brand-border md:bg-brand-bg md:sticky md:top-0">
          <div className="px-5 py-6 md:py-10 md:px-6">
            <VerticalStepper steps={STEPS} current={step} />
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 px-5 pt-6 pb-4 overflow-y-auto">
            {renderStep()}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-brand-surface/95 backdrop-blur-md border-t border-brand-border px-5 py-4 z-40">
            <div className="flex gap-3 max-w-lg mx-auto">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 py-4 rounded-xl font-medium text-sm text-brand-text bg-brand-bg hover:bg-brand-border transition-colors active:scale-[0.98] border border-brand-border"
                >
                  {t('sellProperty.back')}
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {t('sellProperty.next')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitting && <SpinnerIcon />}
                  {submitting ? t('sellProperty.sending') : t('sellProperty.submit')}
                </button>
              )}
            </div>
          </div>

          <div className="h-24" />
        </div>
      </div>
      </>
      )}
    </div>
  )
}
