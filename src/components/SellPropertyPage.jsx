import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const STEPS = [
  { id: 'kontak', label: 'Kontak', desc: 'Nomor WhatsApp' },
  { id: 'properti', label: 'Properti', desc: 'Jenis & Estimasi' },
  { id: 'lokasi', label: 'Lokasi', desc: 'Alamat & Peta' },
  { id: 'detail', label: 'Detail', desc: 'Spesifikasi Bangunan' },
  { id: 'dokumen', label: 'Dokumen', desc: 'Upload Berkas Legal' },
]

const DEFAULT_CENTER = [-6.3025, 106.6520]

const JENIS_PROPERTI = ['Rumah', 'Apartemen', 'Villa', 'Tanah', 'Ruko', 'Kantor', 'Lainnya']
const STATUS_SERTIFIKAT = ['SHM', 'SHGB', 'PPJB', 'Belum Bersertifikat', 'Lainnya']

/* ─── SVG Icons ─────────────────────────────────────────────────── */

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

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

function ToastIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

/* ─── Map Location Picker ──────────────────────────────────────── */

function LocationPicker({ position, onPositionChange }) {
  useMapEvents({
    click(e) { onPositionChange([e.latlng.lat, e.latlng.lng]) },
  })
  return position ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const m = e.target
          onPositionChange([m.getLatLng().lat, m.getLatLng().lng])
        },
      }}
    />
  ) : null
}

/* ─── Toast Notification ───────────────────────────────────────── */

function Toast({ message, visible, onClose }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="fixed bottom-28 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:w-96 animate-slide-up">
      <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-2xl">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <ToastIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Pengajuan Terkirim</p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5 leading-relaxed">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 transition-colors shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── Vertical Stepper ─────────────────────────────────────────── */

function VerticalStepper({ steps, current }) {
  return (
    <nav aria-label="Progress steps" className="flex md:flex-col items-start gap-0 md:gap-0 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const isCompleted = i < current
        const isActive = i === current
        const isLast = i === steps.length - 1

        return (
          <div key={s.id} className="flex md:flex-col items-center md:items-stretch w-full">
            <div className="flex items-start gap-3 w-full">
              {/* Circle + line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-orange-500 text-white'
                      : isActive
                      ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 dark:ring-orange-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
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
                    className={`w-0.5 h-10 md:h-8 transition-colors duration-300 ${
                      isCompleted ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>

              {/* Label — visible on md+, hidden on mobile */}
              <div className="hidden md:block pt-1.5 min-w-0">
                <p
                  className={`text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : isCompleted
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{s.desc}</p>
              </div>
            </div>

            {/* Mobile step label — shown below active step */}
            {isActive && (
              <div className="md:hidden mt-3 mb-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Langkah {i + 1} dari {steps.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.label} &mdash; {s.desc}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ─── Success Modal ────────────────────────────────────────────── */

function SuccessModal({ agentWa, onClose }) {
  const waLink = `https://wa.me/${agentWa}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang listing properti saya.')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Pengajuan Terkirim!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Listing process started. An agent will contact you soon.
        </p>

        <div className="mt-7 space-y-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            View Agent WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────── */

export default function SellPropertyPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    whatsapp: '',
    jenis_properti: '',
    status_sertifikat: '',
    estimasi_harga: '',
    address: '',
    description: '',
    sqm: '',
    bedrooms: '',
    bathrooms: '',
  })
  const [lat, setLat] = useState(DEFAULT_CENTER[0])
  const [lng, setLng] = useState(DEFAULT_CENTER[1])
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [agentWa, setAgentWa] = useState('6281234567890')

  useEffect(() => {
    supabase
      .from('agents')
      .select('whatsapp')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.whatsapp) setAgentWa(data.whatsapp)
      })
  }, [])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return form.whatsapp.replace(/\D/g, '').length >= 10
      case 1: return form.jenis_properti && form.status_sertifikat && form.estimasi_harga
      case 2: return form.address.trim().length > 0
      case 3: return form.description.trim() && form.sqm && form.bedrooms && form.bathrooms
      case 4: return true
      default: return true
    }
  }, [step, form])

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5 MB')
      return
    }

    setFile(selectedFile)
    setUploadError('')
    setUploading(true)

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `listings/${Date.now()}_${safeName}`

    const { error: uploadErr } = await supabase.storage
      .from('legal_documents')
      .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

    if (uploadErr) {
      setUploadError('Gagal mengunggah: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('legal_documents')
      .getPublicUrl(filePath)

    setFileUrl(publicUrl)
    setUploading(false)
  }

  const removeFile = () => {
    setFile(null)
    setFileUrl('')
    setUploadError('')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('property_listings_requests')
      .insert({
        user_id: user?.id || null,
        whatsapp: form.whatsapp,
        jenis_properti: form.jenis_properti,
        status_sertifikat: form.status_sertifikat,
        estimasi_harga: form.estimasi_harga,
        address: form.address,
        lat,
        lng,
        description: form.description,
        sqm: Number(form.sqm) || 0,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        file_url: fileUrl || null,
        status: 'pending',
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setShowToast(true)
    setShowSuccess(true)
  }

  const closeSuccess = () => {
    setShowSuccess(false)
    navigate('/explore')
  }

  /* ─── Step Content ─────────────────────────────────────────────── */

  function renderStep() {
    switch (step) {
      /* ── Step 1: Kontak ───────────────────────────────────── */
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Nomor WhatsApp <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 font-medium">
                  +62
                </span>
                <input
                  type="tel"
                  placeholder="81234567890"
                  value={form.whatsapp}
                  onChange={handleChange('whatsapp')}
                  className="w-full py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                Tim kami akan menghubungi Anda via nomor ini
              </p>
            </div>
          </div>
        )

      /* ── Step 2: Properti ─────────────────────────────────── */
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Jenis Properti <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {JENIS_PROPERTI.map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, jenis_properti: j }))}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      form.jenis_properti === j
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Status Sertifikat <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_SERTIFIKAT.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status_sertifikat: s }))}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      form.status_sertifikat === s
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Estimasi Harga <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 font-medium">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1.500.000.000"
                  value={form.estimasi_harga}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setForm((p) => ({ ...p, estimasi_harga: raw }))
                  }}
                  className="w-full py-3.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
              {form.estimasi_harga && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  Rp {Number(form.estimasi_harga).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        )

      /* ── Step 3: Lokasi ───────────────────────────────────── */
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Alamat Lengkap <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Masukkan alamat properti..."
                value={form.address}
                onChange={handleChange('address')}
                className="w-full py-3 px-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors resize-none"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                Klik peta untuk menandai lokasi properti
              </p>
              <div className="h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={14}
                  className="w-full h-full"
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker
                    position={lat !== DEFAULT_CENTER[0] || lng !== DEFAULT_CENTER[1] ? [lat, lng] : null}
                    onPositionChange={([newLat, newLng]) => { setLat(newLat); setLng(newLng) }}
                  />
                </MapContainer>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 text-right font-mono">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            </div>
          </div>
        )

      /* ── Step 4: Detail ───────────────────────────────────── */
      case 3:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Luas (m&sup2;) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="150"
                  value={form.sqm}
                  onChange={handleChange('sqm')}
                  className="w-full py-3 px-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Kamar Tidur <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="3"
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  className="w-full py-3 px-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Kamar Mandi <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="2"
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  className="w-full py-3 px-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Deskripsi Properti <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan properti Anda secara detail — lingkungan, fasilitas, akses, dll."
                value={form.description}
                onChange={handleChange('description')}
                className="w-full py-3 px-4 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors resize-none"
              />
            </div>
          </div>
        )

      /* ── Step 5: Dokumen ──────────────────────────────────── */
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Dokumen Legalitas
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                Upload SHM, PBB, atau dokumen lainnya (PDF/JPG/PNG, maks 5 MB)
              </p>

              {!file ? (
                <label className="flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors active:bg-slate-100 dark:active:bg-slate-700/50">
                  <UploadIcon />
                  <span className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Klik untuk upload dokumen
                  </span>
                  <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    atau seret file ke sini
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {uploading ? (
                      <SpinnerIcon />
                    ) : fileUrl ? (
                      <span className="text-emerald-500"><CheckIcon /></span>
                    ) : null}
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-2">{uploadError}</p>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Dokumen tidak wajib, tetapi akan mempercepat proses verifikasi
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row">
      <Toast
        message="Listing process started. An agent will contact you soon."
        visible={showToast}
        onClose={() => setShowToast(false)}
      />

      {showSuccess && (
        <SuccessModal agentWa={agentWa} onClose={closeSuccess} />
      )}

      {/* ─── Vertical Stepper Sidebar ─────────────────────────── */}
      <aside className="md:w-64 md:min-h-screen md:border-r md:border-slate-100 md:dark:border-slate-800 md:bg-slate-50/50 md:dark:bg-slate-900/50 md:sticky md:top-0">
        <div className="px-5 pt-12 pb-4 md:py-10 md:px-6">
          <div className="flex md:flex-col items-center md:items-stretch md:gap-0 gap-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="md:hidden w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              <ArrowLeftIcon />
            </button>
            <h1 className="hidden md:block text-lg font-bold text-slate-900 dark:text-white mb-8">
              Jual Properti
            </h1>
            <VerticalStepper steps={STEPS} current={step} />
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              <ArrowLeftIcon />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Jual Properti
            </h1>
          </div>
        </header>

        {/* Form Body */}
        <div className="flex-1 px-5 pt-6 pb-4 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 text-center mb-3 bg-red-50 dark:bg-red-950/40 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3.5 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
              >
                Kembali
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                Lanjut
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {submitting && <SpinnerIcon />}
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
