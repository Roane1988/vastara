// ============================================================================
// Utilitas Storage percakapan (HuniOne)
// ----------------------------------------------------------------------------
// Bucket chat (CHAT_IMAGES / CHAT_FILES / CHAT_VOICE) bersifat PRIVATE.
// Frontend tidak boleh mengambil URL mentah: objek hanya bisa dibaca melalui
// signed URL yang dibuat server-side (lihat utils/signedUrl.js).
//
// Pola di database:
//   - image_path  -> object path di bucket CHAT_IMAGES
//   - file_path   -> object path di bucket CHAT_FILES atau CHAT_VOICE
//   - file_bucket -> 'CHAT_FILES' | 'CHAT_VOICE'
// Kolom *_path adalah penunjuk kanonik. Kolom image_url / file_url (URL
// publik lama) tetap dipertahankan sebagai fallback untuk baris yang belum
// pernah di-backfill.
// ============================================================================

export const CHAT_BUCKET = {
  image: 'CHAT_IMAGES',
  file: 'CHAT_FILES',
  voice: 'CHAT_VOICE',
}

const CHAT_BUCKETS = new Set(Object.values(CHAT_BUCKET))
const PUBLIC_URL_PATTERN = /\/object\/public\/([^/?#]+)\/(.+)$/

/**
 * Pecah URL storage lama menjadi { bucket, path }.
 * Mengembalikan null bila URL bukan rujukan objek storage.
 */
export function parseStorageRef(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(PUBLIC_URL_PATTERN)
  if (!match) return null
  const bucket = match[1]
  const path = match[2].split('#')[0]
  if (!bucket || !path) return null
  return { bucket, path }
}

/** Nama file dari object path (untuk nama berkas saat diunduh). */
export function basenameFromPath(path) {
  if (!path || typeof path !== 'string') return ''
  const parts = path.split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

function isAudioMessage(message) {
  return (message?.file_type || '').toLowerCase().startsWith('audio/')
}

/**
 * Rujukan objek gambar pada sebuah pesan.
 * @returns {{ bucket: string, path: string } | null}
 */
export function resolveMessageImage(message) {
  if (!message) return null

  if (message.image_path) {
    return { bucket: CHAT_BUCKET.image, path: message.image_path }
  }

  const ref = parseStorageRef(message.image_url)
  if (ref && ref.bucket === CHAT_BUCKET.image) return ref

  return null
}

/**
 * Rujukan objek file (dokumen / voice note) pada sebuah pesan.
 * @returns {{ bucket: string, path: string } | null}
 */
export function resolveMessageFile(message) {
  if (!message) return null

  if (message.file_path) {
    const bucket = message.file_bucket || (isAudioMessage(message) ? CHAT_BUCKET.voice : CHAT_BUCKET.file)
    if (!CHAT_BUCKETS.has(bucket)) return null
    return { bucket, path: message.file_path }
  }

  const ref = parseStorageRef(message.file_url)
  if (ref && CHAT_BUCKETS.has(ref.bucket)) return ref

  return null
}
