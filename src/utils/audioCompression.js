export const VOICE_TARGET_RATE = 16000

export async function decodeAudioBuffer(blob) {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return null
  let arrayBuffer
  try {
    arrayBuffer = await blob.arrayBuffer()
  } catch {
    return null
  }
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx({ sampleRate: VOICE_TARGET_RATE })
  try {
    const buf = await ctx.decodeAudioData(arrayBuffer)
    return { buffer: buf, ctx }
  } catch {
    try { ctx.close() } catch { /* non-critical */ }
    return null
  }
}

export function toMono(resampled) {
  try {
    const l = resampled.getChannelData(0)
    if (!l || l.length === 0) return new Float32Array(0)
    if (resampled.numberOfChannels === 1) return l
    const mono = new Float32Array(l.length)
    for (let i = 0; i < l.length; i++) {
      let sum = 0
      for (let c = 0; c < resampled.numberOfChannels; c++) {
        const data = resampled.getChannelData(c)
        if (data && data[i] != null) sum += data[i]
      }
      mono[i] = sum / resampled.numberOfChannels
    }
    return mono
  } catch {
    return new Float32Array(0)
  }
}

export function extractWaveformPeaks(audioBuffer, buckets = 60) {
  if (!audioBuffer) return []
  const channel = toMono(audioBuffer)
  if (channel.length === 0) return []
  const bucketsSafe = Math.max(1, Math.min(buckets, channel.length))
  const perBucket = Math.max(1, Math.floor(channel.length / bucketsSafe))
  const peaks = []
  for (let i = 0; i < bucketsSafe; i++) {
    const start = Math.min(i * perBucket, Math.max(0, channel.length - 1))
    let max = 0
    let sum = 0
    for (let j = start; j < start + perBucket && j < channel.length; j++) {
      const abs = Math.abs(channel[j])
      sum += abs
      if (abs > max) max = abs
    }
    const count = Math.max(1, Math.min(perBucket, channel.length - start))
    peaks.push(Math.min(1, max * 0.5 + (sum / count) * 0.5))
  }
  return peaks
}

export async function recompressVoiceBlob(blob) {
  if (typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined') {
    return { blob, compressed: false, duration: 0 }
  }
  const decoded = await decodeAudioBuffer(blob)
  if (!decoded || !decoded.buffer) return { blob, compressed: false, duration: 0 }
  const { buffer, ctx } = decoded
  const duration = buffer.duration
  if (!Number.isFinite(duration) || duration <= 0) {
    try { ctx.close() } catch { /* non-critical */ }
    return { blob, compressed: false, duration }
  }

  const mime = pickCompressMime()

  let source
  let dest
  try {
    source = ctx.createBufferSource()
    source.buffer = buffer
    dest = ctx.createMediaStreamDestination()
    source.connect(dest)
  } catch {
    try { ctx.close() } catch { /* non-critical */ }
    return { blob, compressed: false, duration }
  }

  let recorder
  try {
    recorder = new MediaRecorder(dest.stream, mime ? { mimeType: mime.mime } : undefined)
  } catch {
    try { ctx.close() } catch { /* non-critical */ }
    return { blob, compressed: false, duration }
  }

  const chunks = []
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }

  let finishedFlag = false
  const finish = () => { if (!finishedFlag) { finishedFlag = true } }
  const done = new Promise((resolve) => {
    recorder.onstop = () => { finish(); resolve() }
    recorder.onerror = () => { finish(); resolve() }
  })

  recorder.start()
  source.start()

  const stopTimers = []
  stopTimers.push(setTimeout(() => {
    try { source.stop() } catch { /* non-critical */ }
    try {
      if (recorder.state !== 'inactive') recorder.stop()
    } catch { /* non-critical */ }
  }, Math.ceil(duration * 1000) + 600))

  stopTimers.push(setTimeout(() => {
    if (!finishedFlag) {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch { /* non-critical */ }
    }
  }, Math.max(3000, Math.ceil(duration * 1000) + 2500)))

  await done
  stopTimers.forEach((t) => clearTimeout(t))
  try { ctx.close() } catch { /* non-critical */ }

  if (chunks.length === 0) return { blob, compressed: false, duration }
  const outBlob = new Blob(chunks, { type: mime ? mime.type : blob.type })
  if (!outBlob || outBlob.size === 0 || outBlob.size >= blob.size) {
    return { blob, compressed: false, duration }
  }
  return { blob: outBlob, compressed: true, duration, mime: mime ? mime.type : '' }
}

function pickCompressMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    { mime: 'audio/webm;codecs=opus', type: 'audio/webm' },
    { mime: 'audio/webm', type: 'audio/webm' },
    { mime: 'audio/ogg;codecs=opus', type: 'audio/ogg' },
    { mime: 'audio/mp4', type: 'audio/mp4' },
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c
    } catch { /* lanjut */ }
  }
  return null
}
