// ============================================================================
// Signed URL untuk Storage privat (HuniOne)
// ----------------------------------------------------------------------------
// Bucket chat bersifat PRIVATE, sehingga objek hanya bisa dibaca memakai
// signed URL yang dibuat server-side.
//
// Cache berlapis:
//   1. Cache modul (Map) dengan TTL -> signed URL tidak dibuat ulang untuk
//      lampiran yang sama (mencegah fetch berulang / tak berujung).
//   2. Batch request -> beberapa lampiran yang dimuat bersamaan ditandatangani
//      dalam satu panggilan createSignedUrls().
//   3. Refresh otomatis sebelum masa berlaku habis, tanpa memuat ulang ulang.
//
// Semua komponen yang menampilkan lampiran yang sama BERTAKSI fallback ke
// cache yang sama, jadi satu lampiran = satu request.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const SIGNED_TTL_SECONDS = 3600
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const BATCH_WINDOW_MS = 60
const MAX_BATCH_SIZE = 50
const RETRY_DELAYS = [1200, 3000, 8000]

const cache = new Map()
const subscribers = new Map()
const pending = new Map()
let flushTimer = null

function cacheKey(bucket, path) {
  return `${bucket}:${path}`
}

/** Baca cache tanpa mengubahnya. */
function readCache(bucket, path) {
  if (!bucket || !path) return null
  const entry = cache.get(cacheKey(bucket, path))
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) return null
  return entry
}

function notify(key, url) {
  const listeners = subscribers.get(key)
  if (!listeners || listeners.size === 0) return
  for (const listener of listeners) {
    try {
      listener(url, 'ready')
    } catch {
      /* non-critical */
    }
  }
}

function storeSignedUrl(bucket, path, url) {
  const key = cacheKey(bucket, path)
  cache.set(key, { url, expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000 })
  notify(key, url)
}

function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}

async function flush() {
  flushTimer = null
  if (pending.size === 0) return

  purgeExpired()

  const entries = [...pending.entries()]
  pending.clear()

  const byBucket = new Map()
  for (const [key, entry] of entries) {
    if (!byBucket.has(entry.bucket)) byBucket.set(entry.bucket, [])
    byBucket.get(entry.bucket).push({ key, path: entry.path, entry })
  }

  for (const [bucket, items] of byBucket) {
    for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
      const chunk = items.slice(i, i + MAX_BATCH_SIZE)
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrls(chunk.map((item) => item.path), SIGNED_TTL_SECONDS)
        if (error) throw error
        const results = Array.isArray(data) ? data : []
        // Cocokkan berdasarkan path (respons storage bisa tidak urut).
        const byPath = new Map()
        for (const row of results) {
          if (row?.path) byPath.set(row.path, row)
        }
        await Promise.all(chunk.map(async (item, index) => {
          const row = byPath.get(item.path) || results[index] || null
          const signed = row?.signedUrl || row?.signedURL || null
          if (signed) {
            storeSignedUrl(bucket, item.path, signed)
            item.entry.resolve(signed)
            return
          }
          // Path ini gagal dalam batch -> coba sendiri agar satu lampiran
          // bermasalah tidak menggagalkan lampiran lain di batch yang sama.
          try {
            const single = await supabase.storage.from(bucket).createSignedUrl(item.path, SIGNED_TTL_SECONDS)
            const url = single?.data?.signedUrl || null
            if (!url) throw single?.error || new Error('Gagal membuat URL bertanda tangan untuk lampiran')
            storeSignedUrl(bucket, item.path, url)
            item.entry.resolve(url)
          } catch (singleErr) {
            item.entry.reject(singleErr)
          }
        }))
      } catch (err) {
        chunk.forEach((item) => item.entry.reject(err))
      }
    }
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush().catch(() => { /* non-critical */ })
  }, BATCH_WINDOW_MS)
}

/**
 * Ambil signed URL untuk satu objek. Memakai cache, dan hanya meminta
 * signature baru bila belum ada / hampir kedaluwarsa.
 */
export function requestSignedUrl(bucket, path) {
  if (!bucket || !path) return Promise.reject(new Error('Lampiran tidak valid'))

  const key = cacheKey(bucket, path)
  const cached = readCache(bucket, path)
  if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return Promise.resolve(cached.url)
  }

  const existing = pending.get(key)
  if (existing) return existing.promise

  let resolveFn = null
  let rejectFn = null
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  pending.set(key, { bucket, path, resolve: resolveFn, reject: rejectFn, promise })
  scheduleFlush()
  return promise
}

/** Signed URL yang sudah di-cache, tanpa memicu request baru. */
export function peekSignedUrl(bucket, path) {
  const cached = readCache(bucket, path)
  return cached ? cached.url : null
}

/** Kosongkan cache (dipanggil saat pengguna keluar). */
export function clearSignedUrlCache() {
  for (const [, entry] of pending) {
    try {
      entry.reject(new Error('Sesi berakhir'))
    } catch {
      /* non-critical */
    }
  }
  pending.clear()
  cache.clear()
  subscribers.clear()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

/**
 * Hook untuk merender lampiran privat.
 *
 * Mengembalikan { url, status } dengan status:
 *   'idle'    -> tidak ada rujukan objek
 *   'loading' -> signed URL sedang dibuat
 *   'ready'   -> signed URL tersedia
 *   'error'   -> gagal memuat (setelah beberapa percobaan)
 *
 * Effect hanya bergantung pada (bucket, path) sehingga tidak pernah memicu
 * fetch berulang. Bila permintaan gagal (mis. baris pesan belum tersimpan
 * saat lampiran diunggah), hook mencoba ulang beberapa kali.
 */
export function useSignedUrl(bucket, path, enabled = true) {
  const key = enabled && bucket && path ? cacheKey(bucket, path) : null
  const [state, setState] = useState({ key: null, url: null, status: 'loading' })

  useEffect(() => {
    if (!key || !bucket || !path) return undefined

    let active = true
    let retryTimer = null
    let attempt = 0

    const apply = (next, status) => {
      if (!active) return
      setState({ key, url: next || null, status: status || 'ready' })
    }

    const scheduleRetry = () => {
      if (!active) return
      if (attempt >= RETRY_DELAYS.length) {
        apply(null, 'error')
        return
      }
      const delay = RETRY_DELAYS[attempt]
      attempt += 1
      retryTimer = setTimeout(() => {
        requestSignedUrl(bucket, path)
          .then((url) => apply(url, 'ready'))
          .catch(scheduleRetry)
      }, delay)
    }

    const cached = readCache(bucket, path)
    if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      apply(cached.url, 'ready')
    } else {
      requestSignedUrl(bucket, path)
        .then((url) => apply(url, 'ready'))
        .catch(scheduleRetry)
    }

    let listeners = subscribers.get(key)
    if (!listeners) {
      listeners = new Set()
      subscribers.set(key, listeners)
    }
    listeners.add(apply)

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      listeners.delete(apply)
      if (listeners.size === 0) subscribers.delete(key)
    }
  }, [key, bucket, path])

  if (!key) return { url: null, status: 'idle' }
  if (state.key === key) return { url: state.url, status: state.status }
  const cached = readCache(bucket, path)
  return cached ? { url: cached.url, status: 'ready' } : { url: null, status: 'loading' }
}
