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

export function toErrorMessage(err) {
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err.message === 'string' && err.message.trim()) return err.message
  return ''
}
