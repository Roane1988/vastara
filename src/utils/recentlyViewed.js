const STORAGE_KEY = 'vastara_recently_viewed'
const MAX_ITEMS = 10
const CHANGE_EVENT = 'recently-viewed-changed'

function persist(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(property) {
  if (!property?.id) return
  try {
    const list = getRecentlyViewed().filter(p => p.id !== property.id)
    list.unshift({
      id: property.id,
      title: property.title || '',
      price: property.price || 0,
      priceDisplay: property.priceDisplay || '',
      category: property.category || property.typeLabel || '',
      image_url: property.image_url || '',
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      area_sqm: property.area_sqm || property.sqm || 0,
      viewed_at: new Date().toISOString(),
    })
    persist(list)
  } catch {
    /* localStorage not available */
  }
}

export function removeRecentlyViewed(propertyId) {
  if (!propertyId) return
  try {
    persist(getRecentlyViewed().filter(p => p.id !== propertyId))
  } catch {
    /* localStorage not available */
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    /* localStorage not available */
  }
}

export { CHANGE_EVENT }
