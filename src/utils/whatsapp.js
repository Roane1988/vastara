const WA_REGEX = /^(08|62|\+62)\d{8,12}$/

export function isValidWhatsAppNumber(value) {
  const cleaned = String(value || '').replace(/\D/g, '')
  if (!cleaned) return false
  return WA_REGEX.test(cleaned)
}

export function normalizeWhatsAppNumber(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  if (digits.startsWith('620')) digits = '62' + digits.slice(2)
  return digits
}
