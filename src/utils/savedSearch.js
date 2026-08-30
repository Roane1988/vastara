import { estimateMonthlyRent } from './financialProfile'

export function serializeFilters({ searchCategory, searchText, filterType, filterPrice, filterBeds, filterPremium }) {
  const f = {}
  if (searchCategory) f.category = searchCategory
  if (searchText && searchText.trim()) f.search = searchText.trim()
  if (filterType) f.type = filterType
  if (filterPrice) f.price = filterPrice
  if (filterBeds) f.beds = filterBeds
  if (filterPremium) f.premium = true
  return f
}

export const NEW_LISTING_DAYS = 30

export function getListingTimestamp(p) {
  const ts = new Date(p.published_at || p.created_at)
  return isNaN(ts.getTime()) ? 0 : ts.getTime()
}

export function isNewListing(p, days = NEW_LISTING_DAYS) {
  if (getListingTimestamp(p) <= Date.now() - days * 24 * 60 * 60 * 1000) return false
  const price = Number(p.price) || 0
  const original = Number(p.original_price) || 0
  if (original > 0 && original > price) return false
  return true
}

export function matchesFilters(p, filters = {}) {
  const f = filters || {}

  if (f.category === 'dijual' && p.category !== 'Dijual') return false
  if (f.category === 'disewa' && p.category !== 'Disewa') return false
  if (f.category === 'baru' && !isNewListing(p)) return false

  if (f.search) {
    const q = String(f.search).toLowerCase()
    const haystack = [p.title, p.address, p.city, p.district, p.description_id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }

  if (f.type && p.property_type !== f.type) return false
  if (f.premium && !p.is_premium) return false

  if (f.beds) {
    const beds = Number(p.bedrooms) || 0
    if (f.beds === '5+') {
      if (beds < 5) return false
    } else if (beds !== parseInt(f.beds, 10)) {
      return false
    }
  }

  const isRent = p.category === 'Disewa' || p.typeLabel === 'Disewa'

  if (f.price) {
    if (isRent) {
      const rent = estimateMonthlyRent(p)
      if (f.price === '0-1jt' && rent >= 1_000_000) return false
      if (f.price === '1-3jt' && (rent < 1_000_000 || rent >= 3_000_000)) return false
      if (f.price === '3jt+' && rent < 3_000_000) return false
    } else {
      const price = Number(p.price) || 0
      if (f.price === '0-1M' && price >= 1_000_000_000) return false
      if (f.price === '1-3M' && (price < 1_000_000_000 || price > 3_000_000_000)) return false
      if (f.price === '3M+' && price <= 3_000_000_000) return false
    }
  }

  return true
}

export function matchesSavedSearch(p, search) {
  return search?.active !== false && matchesFilters(p, search.filters)
}

export function describeFilters(filters = {}, t) {
  const f = filters || {}
  const chips = []

  const typeLabels = {
    Rumah: t('explore.filter.property_types.house'),
    Apartemen: t('explore.filter.property_types.apartment'),
    Villa: t('explore.filter.property_types.villa'),
    Tanah: t('explore.filter.property_types.land'),
    Kantor: t('explore.filter.property_types.office'),
    Ruko: t('explore.filter.property_types.ruko'),
  }
  if (f.type && typeLabels[f.type]) chips.push(typeLabels[f.type])

  const priceLabels = {
    '0-1M': t('explore.filter.price_options.under_1b'),
    '1-3M': t('explore.filter.price_options.one_to_3b'),
    '3M+': t('explore.filter.price_options.above_3b'),
    '0-1jt': t('explore.filter.price_options.rent_under_1jt'),
    '1-3jt': t('explore.filter.price_options.rent_1_3jt'),
    '3jt+': t('explore.filter.price_options.rent_above_3jt'),
  }
  if (f.price && priceLabels[f.price]) chips.push(priceLabels[f.price])

  if (f.beds) chips.push(`${f.beds} ${t('saved_searches.chip_kt')}`)
  if (f.premium) chips.push(t('explore.filter.premium_badge'))
  if (f.search) chips.push(`"${f.search}"`)

  return chips
}

export function buildQueryString(filters = {}) {
  const params = new URLSearchParams()
  const f = filters || {}
  if (f.category) params.set('category', f.category)
  if (f.search) params.set('q', f.search)
  if (f.type) params.set('type', f.type)
  if (f.price) params.set('price', f.price)
  if (f.beds) params.set('beds', f.beds)
  if (f.premium) params.set('premium', '1')
  const s = params.toString()
  return s ? `?${s}` : ''
}
