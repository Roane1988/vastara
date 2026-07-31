import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../utils/format'

export default function CountUp({ value, format = formatCurrency, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (value == null || value <= 0) { setDisplay(0); return }
    const start = performance.now()
    ref.current = requestAnimationFrame(function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    })
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value, duration])

  return <>{format(display)}</>
}
