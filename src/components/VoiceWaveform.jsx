import { useRef, useEffect, useCallback, memo } from 'react'

const VoiceWaveform = memo(function VoiceWaveform({ peaks, progress, accent, trackColor, onSeek, height = 36 }) {
  const canvasRef = useRef(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const h = height
    canvas.width = Math.max(1, width * dpr)
    canvas.height = Math.max(1, h * dpr)
    const g = canvas.getContext('2d')
    g.scale(dpr, dpr)
    g.clearRect(0, 0, width, h)

    const bars = peaks && peaks.length ? peaks : []
    const barCount = bars.length
    if (barCount === 0) return
    const gap = 1.5
    const barW = Math.max(1.5, (width - gap * (barCount - 1)) / barCount)
    const mid = h / 2

    const progressClamped = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
    const progressX = (progressClamped / 100) * width

    for (let i = 0; i < barCount; i++) {
      const amp = Math.min(1, Math.max(0.03, bars[i] || 0))
      const barH = Math.max(2, amp * (h - 4))
      const x = i * (barW + gap)
      const drawnX = x + barW / 2
      const past = drawnX <= progressX

      if (past) {
        g.fillStyle = accent
      } else {
        g.fillStyle = trackColor
      }
      g.beginPath()
      if (typeof g.roundRect === 'function') {
        g.roundRect(x, mid - barH / 2, barW, barH, barW / 2)
      } else {
        g.rect(x, mid - barH / 2, barW, barH)
      }
      g.fill()
    }
  }, [peaks, progress, accent, trackColor, height])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  const handleClick = useCallback((e) => {
    if (!onSeek) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(ratio)
  }, [onSeek])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      role="slider"
      aria-label="Gelombang pesan suara"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Number.isFinite(progress) ? progress : 0)}
      className="flex-1 min-w-0 cursor-pointer"
      style={{ height, touchAction: 'none' }}
    />
  )
})

export default VoiceWaveform
