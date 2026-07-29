import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { LRUCache } from 'lru-cache'

const ALLOWED_MODEL = 'llama-3.3-70b-versatile'
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

const SYSTEM_PROMPT = {
  role: 'system',
  content:
    'Kamu adalah HuniBot, asisten virtual platform properti HuniOne. ' +
    'Jawablah setiap pertanyaan pengguna dengan ramah, profesional, sangat ringkas, ' +
    'padat, dan langsung ke intinya (maksimal 2-3 paragraf pendek). ' +
    'Tugasmu HANYA menjawab pertanyaan seputar properti, KPR, investasi real estate, ' +
    'dan hukum jual-beli tanah di Indonesia. Jika user bertanya di luar topik tersebut, ' +
    'tolak dengan halus dan arahkan kembali ke topik properti.',
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'groq-proxy',
        configureServer(server) {
          server.middlewares.use('/api/groq', async (req, res) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
              return
            }

            const ip = getClientIP(req)
            const requestCount = (rateLimiter.get(ip) || 0) + 1
            rateLimiter.set(ip, requestCount)
            if (requestCount > RATE_LIMIT_MAX) {
              res.writeHead(429, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: { message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' } }))
              return
            }

            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                if (!isValidBody(parsed)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: { message: 'Format permintaan tidak valid.' } }))
                  return
                }
                if (parsed.model !== ALLOWED_MODEL) {
                  res.writeHead(403, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: { message: 'Model tidak diizinkan.' } }))
                  return
                }
                const clientMessages = parsed.messages.filter(m => m.role !== 'system')
                const safeMessages = [SYSTEM_PROMPT, ...clientMessages]
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.GROQ_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: parsed.model,
                    messages: safeMessages,
                    max_tokens: 1024,
                    temperature: 0.7,
                  }),
                })
                const data = await response.json()
                res.writeHead(response.status, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(data))
              } catch {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: { message: 'Gagal terhubung ke server AI' } }))
              }
            })
          })
        },
      },
    ],
  }
})
