import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, X, Plus, Sparkles } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { getImageSrc } from '../utils/images'

const DRAFT_KEY = 'hunione_sell_draft'
const MAX_IMAGES = 10
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraft(form, imageNames) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, imageNames }))
  } catch { /* quota exceeded */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

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

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted">
      <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="16" y2="18" />
    </svg>
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
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted ? 'bg-brand-primary text-white' : isActive ? 'bg-brand-primary text-white ring-4 ring-brand-accent/30' : 'bg-brand-bg border border-brand-border text-brand-muted'
                }`}>
                  {isCompleted ? <CheckIcon /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-[2rem] transition-colors duration-300 ${isCompleted ? 'bg-brand-primary' : 'bg-brand-border'}`} />}
              </div>
              <div className="pb-6 flex-1 min-w-0">
                <p className={`text-sm font-semibold transition-colors ${isActive ? 'text-brand-text' : isCompleted ? 'text-brand-accent' : 'text-brand-muted'}`}>{s.label}</p>
                <p className="text-xs text-brand-muted truncate mt-0.5">{s.desc}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PreviewCard({ form, image }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      <div className="aspect-[16/9] bg-brand-bg flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand-muted/50">
            <UploadIcon />
            <span className="text-xs">Belum ada foto</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-extrabold text-brand-primary">{form.estimasi_harga ? formatPrice(Number(form.estimasi_harga)) : 'Rp 0'}</p>
        <p className="text-sm font-semibold text-brand-text mt-0.5">{form.title || 'Judul Properti'}</p>
        <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          {form.city || form.kecamatan || form.address ? `${form.city || ''}${form.kota || ''}` : 'Lokasi'} 
        </p>
        <div className="flex gap-3 text-xs text-brand-muted mt-2 pt-2 border-t border-brand-border">
          <span>{form.bedrooms || '0'} KT</span>
          <span>{form.bathrooms || '0'} KM</span>
          <span>{form.sqm || '-'} m&sup2;</span>
        </div>
      </div>
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
    { id: 'info', label: 'Info Properti', desc: 'Judul, harga, tipe, & deskripsi' },
    { id: 'foto', label: 'Foto & Lokasi', desc: 'Upload gambar & lokasi properti' },
    { id: 'review', label: 'Review & Kirim', desc: 'Periksa kembali & submit' },
  ], [])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    title: '',
    category: 'Dijual',
    jenis_properti: '',
    estimasi_harga: '',
    bedrooms: '',
    bathrooms: '',
    sqm: '',
    status_sertifikat: '',
    description: '',
    address: '',
    city: '',
    kecamatan: '',
    whatsapp: '',
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imageUploadError, setImageUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [generatingDesc, setGeneratingDesc] = useState(false)

  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setForm(draft.form)
      setImageFiles(draft.imageNames.map((n) => new File([], n)) || [])
    }
  }, [])

  useEffect(() => {
    if (!isSubmitted) {
      const id = setTimeout(() => saveDraft(form, imageFiles.map((f) => f.name)), 500)
      return () => clearTimeout(id)
    }
  }, [form, imageFiles, isSubmitted])

  useEffect(() => {
    const urls = imageFiles.filter((f) => f.size > 0).map((f) => URL.createObjectURL(f))
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles.length])

  const updateForm = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }, [])

  const updateFormValue = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return form.title.trim().length >= 3 && form.jenis_properti && form.estimasi_harga && form.description.trim().length >= 10 && form.address.trim().length >= 5 && form.city.trim().length >= 2
      case 1:
        return imageFiles.length > 0
      case 2:
        return form.whatsapp.replace(/\D/g, '').length >= 10
      default:
        return true
    }
  }, [step, form, imageFiles.length])

  const nextStep = () => { if (step < STEPS.length - 1) setStep((s) => s + 1) }
  const prevStep = () => { if (step > 0) setStep((s) => s - 1) }

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

  const moveImage = useCallback((from, to) => {
    setImageFiles((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }, [])

  const generateDescription = async () => {
    if (!form.title || !form.jenis_properti) {
      showToast('Isi judul dan tipe properti terlebih dahulu.', 'error')
      return
    }
    setGeneratingDesc(true)
    try {
      const features = [
        form.bedrooms && `${form.bedrooms} kamar tidur`,
        form.bathrooms && `${form.bathrooms} kamar mandi`,
        form.sqm && `${form.sqm} m² luas bangunan`,
        form.status_sertifikat && `sertifikat ${form.status_sertifikat}`,
      ].filter(Boolean).join(', ')
      const prompt = `Buat deskripsi properti di Bahasa Indonesia yang menarik untuk ${form.jenis_properti} berjudul "${form.title}". ${features ? `Spesifikasi: ${features}.` : ''} Gunakan gaya bahasa profesional dan persuasif. Maksimal 3 kalimat.`
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await response.json()
      if (data.content) {
        updateFormValue('description', data.content)
      } else if (data.error) {
        showToast('Gagal menghasilkan deskripsi: ' + data.error, 'error')
      }
    } catch {
      showToast('Gagal menghasilkan deskripsi. Coba lagi.', 'error')
    } finally {
      setGeneratingDesc(false)
    }
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
      if (roleError) console.warn('Gagal memperbarui role:', roleError.message)

      let uploadedImageUrls = []
      const realFiles = imageFiles.filter((f) => f.size > 0)
      if (realFiles.length > 0) {
        try {
          const uploads = realFiles.map(async (file) => {
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
          category: form.category,
          title: form.title,
          property_type: form.jenis_properti,
          seller_whatsapp: form.whatsapp,
          description_id: form.description,
          address: form.address,
          city: form.city,
          district: form.kecamatan,
          price: form.estimasi_harga ? Number(form.estimasi_harga) : null,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 0,
          area_sqm: Number(form.sqm) || 0,
          certificate_status: form.status_sertifikat,
          image_url: JSON.stringify(uploadedImageUrls),
          status: 'pending',
        })

      if (insertError) {
        showToast(insertError.message, 'error')
        setSubmitting(false)
        return
      }

      clearDraft()
      setSubmitting(false)
      showToast('Properti berhasil dikirim', 'success')
      setIsSubmitted(true)
    } catch (err) {
      showToast('Terjadi kesalahan: ' + (err.message || 'Silakan coba lagi.'), 'error')
      setSubmitting(false)
    }
  }

  const previewImage = imageFiles.filter((f) => f.size > 0)[0]
  const previewSrc = previewImage ? URL.createObjectURL(previewImage) : ''

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Kategori <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={updateForm('category')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors appearance-none">
                  <option value="Dijual">Dijual</option>
                  <option value="Disewa">Disewa</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Tipe Properti <span className="text-red-500">*</span></label>
                <select value={form.jenis_properti} onChange={updateForm('jenis_properti')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors appearance-none">
                  <option value="">Pilih tipe</option>
                  <option value="Rumah">Rumah</option>
                  <option value="Apartemen">Apartemen</option>
                  <option value="Villa">Villa</option>
                  <option value="Tanah">Tanah</option>
                  <option value="Ruko">Ruko</option>
                  <option value="Kantor">Kantor</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Judul Properti <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Contoh: Rumah Minimalis 2 Lantai di BSD" value={form.title} onChange={updateForm('title')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Harga <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">Rp</span>
                <input type="text" inputMode="numeric" placeholder="500.000.000" value={form.estimasi_harga} onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm((p) => ({ ...p, estimasi_harga: raw })) }} className="w-full py-4 pl-10 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
              {form.estimasi_harga && <p className="text-xs text-brand-muted mt-1.5">Rp {Number(form.estimasi_harga).toLocaleString('id-ID')}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Kamar Tidur</label>
                <input type="number" min="0" placeholder="2" value={form.bedrooms} onChange={updateForm('bedrooms')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Kamar Mandi</label>
                <input type="number" min="0" placeholder="1" value={form.bathrooms} onChange={updateForm('bathrooms')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Luas (m&sup2;)</label>
                <input type="number" min="1" placeholder="60" value={form.sqm} onChange={updateForm('sqm')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Status Sertifikat</label>
              <select value={form.status_sertifikat} onChange={updateForm('status_sertifikat')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors appearance-none">
                <option value="">Pilih status</option>
                <option value="SHM">SHM</option>
                <option value="SHGB">SHGB</option>
                <option value="PPJB">PPJB</option>
                <option value="Belum Bersertifikat">Belum Bersertifikat</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-brand-text">Deskripsi <span className="text-red-500">*</span></label>
                <button type="button" onClick={generateDescription} disabled={generatingDesc} className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors disabled:opacity-50">
                  <Sparkles size={14} />
                  {generatingDesc ? 'Memproses...' : 'Saran AI'}
                </button>
              </div>
              <textarea rows={4} placeholder="Jelaskan properti Anda secara detail..." value={form.description} onChange={updateForm('description')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none" />
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Alamat <span className="text-red-500">*</span></label>
              <textarea rows={2} placeholder="Contoh: Jl. Merpati No. 10, RT 05 RW 02" value={form.address} onChange={updateForm('address')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Kota/Kabupaten <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Tangerang Selatan" value={form.city} onChange={updateForm('city')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
              <div>
                <label className="text-sm font-semibold text-brand-text mb-1.5 block">Kecamatan</label>
                <input type="text" placeholder="Serpong" value={form.kecamatan} onChange={updateForm('kecamatan')} className="w-full py-4 px-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Foto Properti <span className="text-red-500">*</span></label>
              <p className="text-xs text-brand-muted mb-3">Unggah minimal 1 foto properti Anda (maksimal {MAX_IMAGES} foto, maks 5MB per file). Seret untuk mengatur urutan.</p>

              {imageFiles.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {imageFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) moveImage(dragIndex, i) }}
                      onDragEnd={() => setDragIndex(null)}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition-all ${dragIndex === i ? 'opacity-50 border-brand-accent' : 'border-brand-border'}`}
                    >
                      <div className="cursor-grab active:cursor-grabbing"><GripIcon /></div>
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-bg border border-brand-border shrink-0">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-brand-text truncate">{file.name}</p>
                        <p className="text-[10px] text-brand-muted">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeImage(i)} className="w-7 h-7 rounded-full flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500 transition-colors"><X size={14} /></button>
                    </div>
                  ))}
                  {imageFiles.length < MAX_IMAGES && (
                    <label className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand-border bg-brand-bg/50 cursor-pointer hover:border-brand-accent hover:bg-brand-bg transition-colors text-sm text-brand-muted font-medium">
                      <Plus size={18} /> Tambah Foto
                      <input type="file" accept="image/*" multiple onChange={handleImagesSelect} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {imageFiles.length === 0 && (
                <label className="flex flex-col items-center justify-center w-full py-10 px-4 border-2 border-dashed rounded-xl cursor-pointer border-brand-border bg-brand-bg hover:border-brand-accent transition-colors">
                  <UploadIcon />
                  <span className="mt-3 text-sm font-medium text-brand-text">Klik untuk unggah foto</span>
                  <span className="mt-1 text-xs text-brand-muted">Maksimal {MAX_IMAGES} foto, format JPG/PNG/WEBP, maks 5MB per file</span>
                  <input type="file" accept="image/*" multiple onChange={handleImagesSelect} className="hidden" />
                </label>
              )}

              {imageUploadError && <p className="text-xs text-red-500 mt-2">{imageUploadError}</p>}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <PreviewCard form={form} image={previewSrc} />

            <div className="bg-brand-bg/50 rounded-2xl p-5 border border-brand-border">
              <p className="font-semibold text-brand-text text-sm mb-1">Ringkasan</p>
              <div className="text-xs text-brand-muted space-y-1">
                <p>Kategori: {form.category}</p>
                <p>Tipe: {form.jenis_properti}</p>
                <p>Sertifikat: {form.status_sertifikat || '-'}</p>
                <p>Lokasi: {[form.city, form.kecamatan].filter(Boolean).join(', ') || form.address?.slice(0, 30)}</p>
                <p>Kamar: {form.bedrooms || 0} KT / {form.bathrooms || 0} KM / {form.sqm || '-'} m&sup2;</p>
                <p>Foto: {imageFiles.length} file</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-brand-text mb-1.5 block">Nomor WhatsApp <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-muted font-medium">+62</span>
                <input type="tel" placeholder="81234567890" value={form.whatsapp} onChange={updateForm('whatsapp')} className="w-full py-4 pl-12 pr-4 text-sm text-brand-text bg-brand-surface border border-brand-border rounded-xl placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors" />
              </div>
              <p className="text-xs text-brand-muted mt-1.5">Calon pembeli akan menghubungi Anda via nomor ini</p>
            </div>
          </div>
        )

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
            Tim HuniOne akan memverifikasi iklan Anda. Iklan akan tayang dalam 1x24 jam setelah disetujui.
          </p>
          <button type="button" onClick={() => navigate('/')} className="px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 active:scale-[0.98] transition-all duration-200 shadow-sm">Kembali ke Beranda</button>
        </div>
      ) : (
        <>
          <header className="sticky top-0 bg-brand-surface/90 backdrop-blur-md z-30 pt-12 pb-3 px-5 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors shrink-0"><ArrowLeftIcon /></button>
              <h1 className="text-lg font-bold text-brand-text">Iklankan Properti</h1>
            </div>
          </header>

          <div className="flex-1 flex flex-col md:flex-row">
            <aside className="md:w-64 md:min-h-screen md:border-r md:border-brand-border md:bg-brand-bg md:sticky md:top-0">
              <div className="px-5 py-6 md:py-10 md:px-6">
                <VerticalStepper steps={STEPS} current={step} />
              </div>
            </aside>

            <div className="flex-1 flex flex-col">
              <div className="flex-1 px-5 pt-6 pb-28 overflow-y-auto">{renderStep()}</div>

              <div className="fixed bottom-0 left-0 right-0 bg-brand-surface/95 backdrop-blur-md border-t border-brand-border px-5 py-4 z-40">
                <div className="flex gap-3 max-w-lg mx-auto">
                  {step > 0 && (
                    <button type="button" onClick={prevStep} className="flex-1 py-4 rounded-xl font-medium text-sm text-brand-text bg-brand-bg hover:bg-brand-border transition-colors active:scale-[0.98] border border-brand-border">Kembali</button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={nextStep} disabled={!canProceed()} className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-brand-primary hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]">Lanjut</button>
                  ) : (
                    <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]">
                      {submitting && <SpinnerIcon />}
                      {submitting ? 'Mengirim...' : 'Kirim Iklan'}
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
