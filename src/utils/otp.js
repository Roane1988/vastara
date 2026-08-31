import { supabase } from '../supabaseClient'

const OTP_DAILY_LIMIT = 5

// ---------------------------------------------------------------------------
// OTP delivery is abstracted behind this service so the app can switch from the
// email-based MVP to a dedicated WhatsApp sender without touching the UI flows.
//
// MVP (zero-config) channel = 'email'  -> Supabase's built-in Email OTP.
// Future    channel = 'whatsapp'      -> an edge function 'send-otp' that
//                                         calls the WhatsApp Business API once
//                                         a provider + token are provisioned.
// ---------------------------------------------------------------------------

function edgeFunctionAvailable() {
  return typeof supabase.functions !== 'undefined' && !!supabase.functions
}

/**
 * Request an OTP to be sent for sign-in / verification.
 * For the MVP this sends a 6-digit code by email via Supabase.
 *
 * @param {object} opts
 * @param {string} opts.channel  'email' (MVP) or 'whatsapp' (future)
 * @param {string} opts.identifier email address (MVP) or phone number
 * @param {boolean} [opts.shouldCreateUser] only valid for email channel
 */
export async function requestOtp({ channel = 'email', identifier, email, phone, shouldCreateUser = true }) {
  if (channel === 'whatsapp') {
    return requestWhatsAppOtp(identifier ?? phone)
  }

  const target = ((identifier ?? email) || '').trim()
  if (!target) {
    throw new Error('Email wajib diisi.')
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: target,
    options: { shouldCreateUser },
  })

  if (error) throw error
  return data
}

/**
 * Verify an OTP code.
 *
 * @param {object} opts
 * @param {string} opts.channel    'email' (MVP) or 'whatsapp' (future)
 * @param {string} opts.identifier email address (MVP) or phone number
 * @param {string} opts.token      6-digit code
 * @param {string} [opts.type]     'email' | 'signup' | etc.
 */
export async function verifyOtp({ channel = 'email', identifier, email, phone, token, type = 'email' }) {
  const target = channel === 'whatsapp' ? (identifier ?? phone) : ((identifier ?? email) || '').trim()

  if (channel === 'whatsapp') {
    return verifyWhatsAppOtp(target, token)
  }

  if (!target || !token) {
    throw new Error('Kode OTP wajib diisi.')
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: target,
    token,
    type,
  })

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// WhatsApp channel: wired to a 'send-otp' edge function. Until that function and
// a Meta WhatsApp Business token are provisioned, requests fail with a clear
// message instead of silently doing nothing.
// ---------------------------------------------------------------------------

async function requestWhatsAppOtp(phone) {
  if (!edgeFunctionAvailable()) {
    throw new Error('Verifikasi WhatsApp belum diaktifkan. Gunakan kode via email untuk saat ini.')
  }

  const { error } = await supabase.functions.invoke('send-otp', {
    body: { purpose: 'signin', phone, channel: 'whatsapp' },
  })

  if (error) throw error
  return {}
}

async function verifyWhatsAppOtp(phone, token) {
  const { error } = await supabase.functions.invoke('verify-otp', {
    body: { purpose: 'signin', phone, code: token, channel: 'whatsapp' },
  })

  if (error) throw error
  return {}
}

export { OTP_DAILY_LIMIT }
