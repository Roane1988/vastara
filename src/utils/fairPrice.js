function avg(nums) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function median(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function pricePerSqm(p) {
  const price = Number(p?.price)
  const area = Number(p?.area_sqm || p?.sqm)
  if (!price || price <= 0 || !area || area <= 0) return null
  return price / area
}

export function computeMarketStats(property, comparables) {
  const targetPsqm = pricePerSqm(property)
  const compPsqm = (comparables || [])
    .map(pricePerSqm)
    .filter((v) => v != null && v > 0)

  const med = median(compPsqm)
  const deltaPct = targetPsqm != null && med != null && med > 0
    ? Math.round(((targetPsqm - med) / med) * 1000) / 10
    : null

  return {
    comparableCount: compPsqm.length,
    targetPricePerSqm: targetPsqm != null ? Math.round(targetPsqm) : null,
    medianPricePerSqm: med != null ? Math.round(med) : null,
    avgPricePerSqm: avg(compPsqm) != null ? Math.round(avg(compPsqm)) : null,
    minPricePerSqm: compPsqm.length ? Math.round(Math.min(...compPsqm)) : null,
    maxPricePerSqm: compPsqm.length ? Math.round(Math.max(...compPsqm)) : null,
    deltaPct,
  }
}

export function verdictFromMarket(stats) {
  if (!stats || !stats.comparableCount) {
    return { verdict: 'Data Terbatas', color: 'gray', rec: 'Data Terbatas' }
  }
  if (stats.deltaPct == null) {
    return { verdict: 'Data Terbatas', color: 'gray', rec: 'Data Terbatas' }
  }
  if (stats.deltaPct > 8) {
    return { verdict: 'Di Atas Pasar', color: 'red', rec: 'Nego' }
  }
  if (stats.deltaPct < -8) {
    return { verdict: 'Di Bawah Pasar', color: 'emerald', rec: 'Worth It' }
  }
  return { verdict: 'Wajar', color: 'emerald', rec: 'Worth It' }
}
