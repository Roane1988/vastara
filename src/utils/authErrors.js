const RATE_LIMIT_STATUS = 429

const RATE_LIMIT_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /too many attempts/i,
]

export function isRateLimitError(error) {
  if (!error) return false
  if (error.status === RATE_LIMIT_STATUS || error.statusCode === RATE_LIMIT_STATUS) return true
  if (typeof error.code === 'string' && /rate|over_request/i.test(error.code)) return true
  const message = error.message || String(error)
  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message))
}

function isEmptyObjectText(s) {
  return s === '{}' || s === '"{}"'
}

export function toErrorMessage(err) {
  if (typeof err === 'string' && err.trim() && !isEmptyObjectText(err.trim())) return err
  if (err) {
    if (typeof err.message === 'string' && err.message.trim() && !isEmptyObjectText(err.message.trim())) return err.message
    if (err.message && typeof err.message === 'object') {
      try {
        const s = JSON.stringify(err.message)
        if (s && !isEmptyObjectText(s)) return s
      } catch { /* ignore */ }
    }
    if (typeof err.error === 'string' && err.error.trim() && !isEmptyObjectText(err.error.trim())) return err.error
    if (typeof err.error_description === 'string' && err.error_description.trim() && !isEmptyObjectText(err.error_description.trim())) return err.error_description
    if (err.message && typeof err.message === 'string') return ''
  }
  return ''
}
// Normalisasi error Supabase menjadi kode stabil agar bisa dipetakan ke pesan
// i18n yang ramah pengguna (mengembalikan string kosong jika tidak dikenali).
export function getAuthErrorCode(err) {
  if (!err) return ''
  const code = typeof err.code === 'string' ? err.code : ''
  const status = String(err.status || err.statusCode || '')
  const msg = `${typeof err.message === 'string' ? err.message : ''} ${code} ${status}`

  if (code === '23505') return 'duplicate'
  if (/user already registered|already been registered|user already exists|email.*already.*regist/i.test(msg)) return 'email_in_use'
  if (/email not confirmed|before you can log in|confirm your email/i.test(msg)) return 'email_not_confirmed'
  if (/whatsapp.*(already|unique|exists)|duplicate key value.*whatsapp/i.test(msg)) return 'whatsapp_in_use'
  if (/invalid login credentials|invalid email or password|invalid login/i.test(msg)) return 'invalid_credentials'
  return ''
}
