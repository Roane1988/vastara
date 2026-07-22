import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const STEPS = [
  { id: 'kontak', label: 'Kontak', desc: 'Nomor WhatsApp' },
  { id: 'properti', label: 'Properti', desc: 'Jenis & Estimasi' },
  { id: 'lokasi', label: 'Lokasi', desc: 'Alamat & Peta' },
  { id: 'detail', label: 'Detail', desc: 'Spesifikasi Bangunan' },
  { id: 'dokumen', label: 'Dokumen', desc: 'Upload Berkas Legal' },
]

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

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function AppToast({ message, type, visible, onClose }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
      `}</style>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 animate-fade-in">
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg border ${
          type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {type === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <p className="text-sm font-semibold flex-1">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

function SuccessModal({ agentWa, onClose }) {
  const waLink = `https://wa.me/${agentWa}?text=${encodeURIComponent('Halo, saya ingin bertanya tentang listing properti saya.')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-brand-surface rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl border border-brand-border">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2">Pengajuan Terkirim!</h2>
        <p className="text-sm text-brand-muted leading-relaxed">
          Listing process started. An agent will contact you soon.
        </p>
        <div className="mt-7 space-y-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-brand-accent hover:bg-[#237044] active:bg-[#1a5a35] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            View Agent WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-sm text-brand-muted bg-brand-bg hover:bg-slate-100 transition-colors border border-brand-border"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
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
                      ? 'bg-brand-primary text-white ring-4 ring-brand-secondary/30'
                      : 'bg-slate-100 border border-slate-300 text-slate-500'
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
                      isCompleted ? 'bg-brand-primary' : 'bg-slate-200'
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
                      ? 'text-brand-secondary'
                      : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{s.desc}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SellPropertyPage() {
  const navigate = useNavigate()

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
  })
  const [locationUrl, setLocationUrl] = useState('')
  const [skipUpload, setSkipUpload] = useState(false)
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [agentWa, setAgentWa] = useState('6281234567890')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

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
      case 1: return form.title.trim() && form.jenis_properti && form.status_sertifikat && form.estimasi_harga
      case 2: return form.address.trim().length > 0
      case 3: return form.description.trim() && form.sqm && form.bedrooms && form.bathrooms
      case 4: return skipUpload || !!fileUrl
      default: return true
    }
  }, [step, form, skipUpload, fileUrl])

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

    const { data: { user } } = await supabase.auth.getUser()

    const listingStatus = fileUrl ? 'verified' : 'pending'

    const { error: insertError } = await supabase
      .from('properties')
      .insert({
        user_id: user?.id || null,
        title: form.title,
        property_type: form.jenis_properti,
        description: form.description,
        location: form.address,
        price: form.estimasi_harga ? Number(form.estimasi_harga) : null,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        sqm: Number(form.sqm) || 0,
        location_url: locationUrl || null,
        status: listingStatus,
      })

    if (insertError) {
      setNotification({ show: true, message: insertError.message, type: 'error' })
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setNotification({ show: true, message: 'Properti berhasil dikirim!', type: 'success' })
    setShowSuccess(true)
  }

  const closeSuccess = () => {
    setShowSuccess(false)
    navigate('/explore')
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Nomor WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">
                  +62
                </span>
                <input
                  type="tel"
                  placeholder="81234567890"
                  value={form.whatsapp}
                  onChange={handleChange('whatsapp')}
                  className="w-full py-4 pl-12 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>
              <p className="text-xs text-brand-muted mt-1.5">
                Tim kami akan menghubungi Anda via nomor ini
              </p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Judul Properti <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Jual Rumah Mewah di BSD..."
                value={form.title}
                onChange={handleChange('title')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Jenis Properti <span className="text-red-500">*</span>
              </label>
              <select
                value={form.jenis_properti}
                onChange={handleChange('jenis_properti')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors appearance-none"
              >
                <option value="">Pilih jenis properti</option>
                <option value="Rumah">Rumah</option>
                <option value="Apartemen">Apartemen</option>
                <option value="Villa">Villa</option>
                <option value="Tanah">Tanah</option>
                <option value="Ruko">Ruko</option>
                <option value="Kantor">Kantor</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Status Sertifikat <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status_sertifikat}
                onChange={handleChange('status_sertifikat')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors appearance-none"
              >
                <option value="">Pilih status sertifikat</option>
                <option value="SHM">SHM (Sertifikat Hak Milik)</option>
                <option value="SHGB">SHGB (Sertifikat Hak Guna Bangunan)</option>
                <option value="PPJB">PPJB</option>
                <option value="Belum Bersertifikat">Belum Bersertifikat</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Estimasi Harga <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">
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
                  className="w-full py-4 pl-10 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
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
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Masukkan alamat properti..."
                value={form.address}
                onChange={handleChange('address')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Link Lokasi Google Maps
              </label>
              <input
                type="url"
                placeholder="Tempel link Google Maps properti Anda di sini"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
              />
              <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                Cara: Buka Google Maps, cari lokasi properti, klik &quot;Bagikan&quot; (Share), dan pilih &quot;Salin Link&quot;
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  Luas (m&sup2;) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="150"
                  value={form.sqm}
                  onChange={handleChange('sqm')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  Kamar Tidur <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="3"
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                  Kamar Mandi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="2"
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Deskripsi Properti <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan properti Anda secara detail — lingkungan, fasilitas, akses, dll."
                value={form.description}
                onChange={handleChange('description')}
                className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary transition-colors resize-none"
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">
                Dokumen Legalitas
              </label>
              <p className="text-xs text-brand-muted mb-3">
                Upload SHM, PBB, atau dokumen lainnya (PDF/JPG/PNG, maks 5 MB)
              </p>

              {!file ? (
                <label className={`flex flex-col items-center justify-center w-full py-10 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors active:bg-brand-bg ${
                  skipUpload
                    ? 'border-brand-border bg-brand-bg/50 opacity-50'
                    : 'border-brand-border bg-brand-bg hover:border-brand-secondary'
                }`}>
                  <UploadIcon />
                  <span className="mt-3 text-sm font-medium text-brand-text">
                    Klik untuk upload dokumen
                  </span>
                  <span className="mt-1 text-xs text-brand-muted">
                    atau seret file ke sini
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    disabled={skipUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 border border-brand-border rounded-xl bg-brand-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-secondary/10 flex items-center justify-center shrink-0">
                      <FileIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {uploading ? (
                      <SpinnerIcon />
                    ) : fileUrl ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-brand-muted hover:text-red-500 transition-colors p-1"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-500 mt-2">{uploadError}</p>
              )}

              <p className="text-xs text-brand-muted mt-2">
                Dokumen tidak wajib, tetapi akan mempercepat proses verifikasi
              </p>
            </div>

            <div className="border-t border-brand-border pt-5">
              <button
                type="button"
                onClick={() => {
                  setSkipUpload((prev) => !prev)
                  if (!skipUpload && file) {
                    removeFile()
                  }
                }}
                className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  skipUpload
                    ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                    : 'bg-brand-surface text-brand-muted border border-brand-border hover:border-brand-muted'
                }`}
              >
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  skipUpload
                    ? 'bg-brand-primary border-brand-primary'
                    : 'border-brand-muted'
                }`}>
                  {skipUpload && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                Saya akan unggah dokumen nanti
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      <AppToast
        message={notification.message}
        type={notification.type}
        visible={notification.show}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />

      {showSuccess && (
        <SuccessModal agentWa={agentWa} onClose={closeSuccess} />
      )}

      <header className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-lg font-bold text-brand-text">Jual Properti</h1>
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
                  className="flex-1 py-4 rounded-xl font-medium text-sm text-brand-text bg-brand-bg hover:bg-slate-100 transition-colors active:scale-[0.98] border border-brand-border"
                >
                  Kembali
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-brand-primary hover:bg-[#152d4a] active:bg-[#0f2640] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Lanjut
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-brand-accent hover:bg-[#237044] active:bg-[#1a5a35] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitting && <SpinnerIcon />}
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              )}
            </div>
          </div>

          <div className="h-24" />
        </div>
      </div>
    </div>
  )
}
