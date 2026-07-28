import express from 'express'
import { config } from 'dotenv'

config({ path: '.env.local' })

const app = express()
app.use(express.json({ limit: '1mb' }))

app.post('/api/groq', async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: { message: 'Internal server error' } })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Groq proxy running on http://localhost:${PORT}`)
})
