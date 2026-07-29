import { LRUCache } from 'lru-cache'

const ALLOWED_MODEL = 'llama-3.3-70b-versatile'
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

const SYSTEM_PROMPTS = {
  chat: {
    role: 'system',
    content:
      'Kamu adalah HuniBot, asisten virtual platform properti HuniOne. ' +
      'Jawablah setiap pertanyaan pengguna dengan ramah, profesional, sangat ringkas, ' +
      'padat, dan langsung ke intinya (maksimal 2-3 paragraf pendek). ' +
      'Tugasmu HANYA menjawab pertanyaan seputar properti, KPR, investasi real estate, ' +
      'dan hukum jual-beli tanah di Indonesia. Jika user bertanya di luar topik tersebut, ' +
      'tolak dengan halus dan arahkan kembali ke topik properti.',
  },
  translation: {
    role: 'system',
    content:
      'You are a professional Indonesian-to-English translator for a property platform. ' +
      'Translate the following Indonesian property fields to English. ' +
      'Keep it natural and accurate for real estate context. ' +
      'Return ONLY a valid JSON object with the same keys. No explanation, no markdown.',
  },
}

const rateLimiter = new LRUCache({
  max: 500,
  ttl: RATE_LIMIT_WINDOW_MS,
})

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown'
}

function isValidBody(body) {
  if (!body || typeof body !== 'object') return false
  if (!Array.isArray(body.messages) || body.messages.length === 0) return false
  for (const msg of body.messages) {
    if (!msg || typeof msg !== 'object') return false
    if (!['system', 'user', 'assistant'].includes(msg.role)) return false
    if (typeof msg.content !== 'string') return false
    if (msg.content.length > 10_000) return false
  }
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const ip = getClientIP(req)
  const requestCount = (rateLimiter.get(ip) || 0) + 1
  rateLimiter.set(ip, requestCount)
  if (requestCount > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: { message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' } })
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: { message: 'Format permintaan tidak valid.' } })
  }

  if (req.body.model !== ALLOWED_MODEL) {
    return res.status(403).json({ error: { message: 'Model tidak diizinkan.' } })
  }

  const purpose = req.body.purpose === 'translation' ? 'translation' : 'chat'
  const systemPrompt = SYSTEM_PROMPTS[purpose]

  const clientMessages = req.body.messages.filter(m => m.role !== 'system')
  const safeMessages = [systemPrompt, ...clientMessages]

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: req.body.model,
        messages: safeMessages,
        max_tokens: purpose === 'translation' ? 2048 : 1024,
        temperature: purpose === 'translation' ? 0.3 : 0.7,
      }),
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch {
    res.status(500).json({ error: { message: 'Gagal terhubung ke server AI' } })
  }
}
