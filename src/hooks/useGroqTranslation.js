import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getAuthHeaders } from '../utils/groqClient'

const STORAGE_KEY = 'vastara_translation_cache_v1'
const MAX_CACHE_ENTRIES = 300

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return new Map(Object.entries(JSON.parse(raw)))
  } catch {
    return new Map()
  }
}

const cache = loadCache()
const inflight = new Map()

function persistCache() {
  try {
    if (cache.size > MAX_CACHE_ENTRIES) {
      const entries = [...cache.entries()]
      cache.clear()
      for (const [k, v] of entries.slice(-MAX_CACHE_ENTRIES)) cache.set(k, v)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch { /* storage penuh / tidak tersedia — abaikan */ }
}

function normalizeKey(obj) {
  return Object.keys(obj).sort().map((k) => `${k}:${String(obj[k]).slice(0, 80)}`).join('|')
}

function cacheKey(propertyId, fields) {
  return `${propertyId}|${normalizeKey(fields)}`
}

async function fetchTranslation(texts, signal) {
  const res = await fetch('/api/groq', {
    method: 'POST',
    signal,
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      purpose: 'translation',
      messages: [
        { role: 'user', content: JSON.stringify(texts) },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(typeof errBody?.error === 'string' ? errBody.error : (errBody?.error?.message || 'Translation failed'))
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')

  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid response format')
  return JSON.parse(match[0])
}

function getFromCache(propertyId, fields) {
  const key = cacheKey(propertyId, fields)
  return cache.get(key) || null
}

function setCache(propertyId, fields, result) {
  const key = cacheKey(propertyId, fields)
  cache.set(key, result)
  persistCache()
}

function batchNeeded(properties) {
  const batch = {}
  for (const p of properties) {
    const key = cacheKey(p.id, { title: p.title, address: p.address || p.location || '', property_type: p.property_type || '' })
    if (!cache.has(key) && !inflight.has(key)) {
      batch[p.id] = {
        title: p.title,
        address: p.address || p.location || '',
        property_type: p.property_type || '',
      }
    }
  }
  return batch
}

export async function batchTranslate(properties, signal) {
  const batch = batchNeeded(properties)
  const ids = Object.keys(batch)
  if (ids.length === 0) return

  const inflightKey = 'batch:' + ids.sort().join(',')
  if (inflight.has(inflightKey)) return inflight.get(inflightKey)

  const promise = (async () => {
    const result = await fetchTranslation(batch, signal)
    for (const id of ids) {
      if (result[id]) {
        setCache(id, batch[id], result[id])
      }
    }
    return result
  })()

  inflight.set(inflightKey, promise)
  promise.finally(() => inflight.delete(inflightKey))
  return promise
}

export function useGroqTranslation(propertyId, fields) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [translated, setTranslated] = useState(null)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const fieldsRef = useRef(fields)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    fieldsRef.current = fields
  }, [fields])

  const hasFields = fields && Object.keys(fields).length > 0
  const active = lang === 'en' && hasFields && propertyId

  useEffect(() => {
    if (!active) return

    const currentFields = fieldsRef.current
    const cached = getFromCache(propertyId, currentFields)
    if (cached) {
      setTranslated(cached)
      setLoading(false)
      return
    }

    const key = cacheKey(propertyId, currentFields)
    let cancelled = false

    setLoading(true)

    if (inflight.has(key)) {
      inflight.get(key)
        .then((result) => {
          if (!cancelled && mountedRef.current) {
            const merged = { ...currentFields, ...result }
            setTranslated(merged)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled && mountedRef.current) setLoading(false)
        })
      return () => { cancelled = true }
    }

    const promise = fetchTranslation(currentFields)
      .then((result) => {
        const merged = { ...currentFields, ...result }
        setCache(propertyId, currentFields, merged)
        if (!cancelled && mountedRef.current) {
          setTranslated(merged)
          setLoading(false)
        }
        return merged
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) setLoading(false)
      })

    inflight.set(key, promise)
    promise.finally(() => { if (inflight.get(key) === promise) inflight.delete(key) })

    return () => { cancelled = true }
  }, [lang, propertyId, active])

  const effectiveTranslated = active ? translated : null
  const effectiveLoading = active ? loading : false

  const getText = useCallback((field, fallback) => {
    if (lang !== 'en') return fallback
    return effectiveTranslated?.[field] ?? fallback
  }, [lang, effectiveTranslated])

  return { translated: effectiveTranslated, loading: effectiveLoading, getText }
}
