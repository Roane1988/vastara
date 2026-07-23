import { useState } from 'react'

// TODO: Fetch agent contacts from Supabase 'agents' table
const CONTACTS = [
  {
    id: 1,
    name: 'Aqsha',
    role: 'Senior Property Agent',
    description: 'Menangani jadwal survei dan negosiasi harga',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    wa: '6281234567890',
    online: true,
  },
  {
    id: 2,
    name: 'Tim Legal (Rai)',
    role: 'Chief Legal Officer',
    description: 'Menangani verifikasi dokumen dan proses notaris',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
    wa: '6281234567891',
    online: true,
  },
]

const FAQS = [
  {
    id: 1,
    question: 'Apa syarat dokumen KPR?',
    answer:
      'Dokumen yang diperlukan: KTP, KK, NPWP, slip gaji 3 bulan terakhir, rekening koran 3 bulan, dan PBB rumah yang akan dibiayai. Untuk pengajuan joint income, tambahkan dokumen pasangan.',
  },
  {
    id: 2,
    question: 'Bagaimana prosedur booking fee?',
    answer:
      'Booking fee sebesar Rp 5–20 juta (tergantung unit) dibayarkan setelah unit dipilih. Dana ini akan menjadi bagian dari DP jika deal, atau dikembalikan 100% jika kredit Anda tidak disetujui bank.',
  },
  {
    id: 3,
    question: 'Berapa lama proses legalitas?',
    answer:
      'Proses legalitas umumnya memakan waktu 14–21 hari kerja sejak dokumen lengkap. Tim legal kami akan mengurus sertifikat, AJB, balik nama, dan cek keabsahan lahan ke BPN.',
  },
]

const OPEN_HOUR = 9
const CLOSE_HOUR = 18

function isWithinHours() {
  const h = new Date().getHours()
  return h >= OPEN_HOUR && h < CLOSE_HOUR
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChevronDown({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ContactCard({ contact }) {
  const handleChat = () => {
    window.open(`https://wa.me/${contact.wa}`, '_blank')
  }

  return (
    <button
      type="button"
      onClick={handleChat}
      className="w-full bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform text-left"
    >
      <div className="relative shrink-0">
        <img
          src={contact.photo}
          alt={contact.name}
          className="w-14 h-14 rounded-full object-cover"
        />
        {contact.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-brand-surface rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-brand-text">{contact.name}</span>
          <span className="text-[10px] text-emerald-500 font-medium">Online</span>
        </div>
        <p className="text-xs text-brand-secondary font-medium mt-0.5">{contact.role}</p>
        <p className="text-xs text-brand-muted mt-1 flex items-center gap-1">
          Klik untuk chat via WhatsApp
          <WhatsAppIcon />
        </p>
      </div>
    </button>
  )
}

function FaqItem({ faq, open, onToggle }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <span className="text-sm font-semibold text-brand-text pr-2">
          {faq.question}
        </span>
        <ChevronDown open={open} />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="p-4 pt-0 text-sm text-brand-muted leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ChatHubPage({ onNavigate }) {
  const [openFaq, setOpenFaq] = useState(null)
  const online = isWithinHours()

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
            <ChatIcon />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">Pesan & Bantuan</h1>
        </div>
        <p className="text-sm text-brand-muted ml-[52px]">
          Hubungi agen atau tim legal kami untuk bantuan instan.
        </p>
        <div className="ml-[52px] mt-3">
          <div className="inline-flex items-center gap-2 bg-brand-bg px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-brand-border'}`} />
            <ClockIcon />
            <span className="text-xs text-brand-muted font-medium">
              Jam Operasional: 09:00 – 18:00 WIB
            </span>
            <span className={`text-[10px] font-medium ${online ? 'text-emerald-600' : 'text-brand-muted'}`}>
              · {online ? 'Sedang buka' : 'Tutup'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Active Contacts ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-5 pb-6">
        {CONTACTS.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
        {/* TODO: Fetch contacts from Supabase 'agents' table */}
      </div>

      {/* ─── FAQ Accordion ─────────────────────────────────────── */}
      <div className="px-5 pb-6">
        <h2 className="text-lg font-bold text-brand-text mb-4">
          Pertanyaan Umum
        </h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq) => (
            <FaqItem
              key={faq.id}
              faq={faq}
              open={openFaq === faq.id}
              onToggle={() => toggleFaq(faq.id)}
            />
          ))}
        </div>
        {/* TODO: Fetch FAQs from Supabase 'faqs' table */}
      </div>
    </div>
  )
}
