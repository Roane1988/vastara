import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const WA_REGEX = /^(08|62|\+62)\d{8,12}$/

export default function WhatsAppVerificationBanner() {
  const { t } = useTranslation()
  const { user, profile, setWhatsappVerified } = useAuth()
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (!user || profile?.whatsapp_verified === true) return null

  const handleSave = async () => {
    const cleaned = whatsapp.trim()
    if (!cleaned || !WA_REGEX.test(cleaned)) {
      setError(t('whatsappVerify.invalid'))
      return
    }
    setError('')
    setSaving(true)
    setNotice('')
    try {
      const { error: rpcErr } = await supabase.rpc('set_whatsapp_verified', {
        p_whatsapp: cleaned.replace(/\D/g, ''),
      })
      if (rpcErr) {
        setError(rpcErr.message)
        return
      }
      setWhatsappVerified(cleaned.replace(/\D/g, ''))
      setNotice(t('whatsappVerify.success'))
    } catch (err) {
      setError(err?.message || t('whatsappVerify.failed'))
    } finally {
      setSaving(false)
    }
  }

  const showForm = profile?.whatsapp_verified === false

  return (
    <div className="fixed inset-x-0 top-14 z-40 px-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 shadow-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {showForm ? t('whatsappVerify.title') : t('whatsappVerify.titleMissing')}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {showForm ? t('whatsappVerify.subtitle') : t('whatsappVerify.subtitleMissing')}
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setWhatsapp('')}
              className="inline-flex justify-center items-center px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium disabled:opacity-50"
              disabled={saving}
            >
              {saving ? t('whatsappVerify.saving') : t('whatsappVerify.add')}
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder={t('whatsappVerify.placeholder')}
              className="flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex justify-center items-center px-5 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium disabled:opacity-50"
              disabled={saving}
            >
              {saving ? t('whatsappVerify.saving') : t('whatsappVerify.verify')}
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {notice && <p className="mt-2 text-xs text-green-700">{notice}</p>}
      </div>
    </div>
  )
}
