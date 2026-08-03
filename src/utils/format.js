export function formatPrice(value) {
  if (value == null) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return `Rp ${num.toLocaleString('id-ID')}`
}

export function formatCurrency(value) {
  const num = Number(value)
  if (value == null || isNaN(num) || !Number.isFinite(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatShort(value) {
  if (value == null || isNaN(value)) return 'Rp 0'
  const num = Number(value)
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)} Jt`
  return formatCurrency(value)
}

export function formatCompact(value) {
  const num = Number(value)
  if (value == null || isNaN(num) || !Number.isFinite(num)) return ''
  if (Math.abs(num) >= 1_000_000_000) return `Rp${(num / 1_000_000_000).toFixed(1)}M`
  if (Math.abs(num) >= 1_000_000) return `Rp${(num / 1_000_000).toFixed(0)}Jt`
  if (Math.abs(num) >= 1_000) return `Rp${(num / 1_000).toFixed(0)}rb`
  return `Rp${Math.round(num)}`
}

export function formatPriceDisplay(property) {
  if (property?.priceDisplay) return property.priceDisplay
  const isRent = property?.category === 'Disewa' || property?.typeLabel === 'Disewa'
  if (isRent && property?.price) return `${formatPrice(property.price)} /bulan`
  return formatPrice(property?.price)
}

export function formatCount(value) {
  const num = Number(value || 0)
  if (num >= 1_000_000) {
    const m = (num / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')
    return `${m}jt`
  }
  if (num >= 1_000) {
    const k = (num / 1_000).toFixed(1).replace('.0', '').replace('.', ',')
    return `${k}rb`
  }
  return String(num)
}
