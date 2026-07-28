import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ALLOWED_MODEL = 'llama-3.3-70b-versatile'

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
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                if (parsed.model !== ALLOWED_MODEL) {
                  res.writeHead(403, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: { message: 'Model tidak diizinkan' } }))
                  return
                }
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.GROQ_API_KEY}`,
                  },
                  body,
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
