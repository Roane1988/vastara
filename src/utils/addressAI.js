import { getAuthHeaders } from './groqClient'
import { cleanCityName } from './wilayah'

const digitsOnly = (value = '') => String(value).replace(/[^0-9]/g, '')

export const ADDRESS_FIELDS = ['rt', 'rw', 'kelurahan', 'kecamatan', 'kota']

export const ADDRESS_FIELD_LABELS = {
  rt: 'RT',
  rw: 'RW',
  kelurahan: 'Kelurahan',
  kecamatan: 'Kecamatan',
  kota: 'Kota/Kabupaten',
}

function parseJson(content) {
  const cleaned = String(content)
    .replace(/^```(json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function extractAddressWithAI(text) {
  const prompt = `Ekstrak informasi alamat dari teks berikut ke dalam objek JSON. Teks: "${text}"

Gunakan bidang: rt, rw, kelurahan, kecamatan, kota.
- rt dan rw: hanya angka (misal "005", "02").
- kelurahan: nama kelurahan/desa.
- kecamatan: nama kecamatan.
- kota: nama kota/kabupaten TANPA kata "Kota" atau "Kabupaten" di awal.
- Jika sebuah informasi tidak ada, tidak jelas, atau hanya bisa ditebak, isi dengan string kosong ("").
- Sertakan juga daftar "ambiguous" berisi nama bidang (judul JSON) yang tidak pasti atau hanya perkiraan, misal ["rt", "kota"].

Contoh format JSON (hanya JSON, tanpa teks lain):
{ "rt": "005", "rw": "002", "kelurahan": "Serua Indah", "kecamatan": "Ciputat", "kota": "Tangerang Selatan", "ambiguous": [] }`

  const res = await fetch('/api/groq', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      purpose: 'chat',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    let msg = 'Gagal menganalisis alamat.'
    try {
      const j = await res.json()
      msg = j?.error?.message || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Respon AI kosong. Coba lagi.')
  const parsed = parseJson(content)
  if (!parsed) throw new Error('Format respon AI tidak valid. Coba lagi.')

  const values = {
    rt: digitsOnly(parsed.rt),
    rw: digitsOnly(parsed.rw),
    kelurahan: String(parsed.kelurahan || '').trim(),
    kecamatan: String(parsed.kecamatan || '').trim(),
    kota: cleanCityName(parsed.kota),
  }

  const missing = ADDRESS_FIELDS.filter((k) => !values[k])

  const rawAmbiguous = Array.isArray(parsed.ambiguous)
    ? parsed.ambiguous.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
    : []
  const ambiguous = [...new Set([...rawAmbiguous, ...missing])].filter((k) =>
    ADDRESS_FIELDS.includes(k)
  )

  return {
    values: { ...values, city: values.kota },
    missing,
    ambiguous,
  }
}
