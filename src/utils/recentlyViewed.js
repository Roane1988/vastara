const STORAGE_KEY = 'vastara_recently_viewed'
const MAX_ITEMS = 10

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
      category: property.category || property.typeLabel || '',
      image_url: property.image_url || '',
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      area_sqm: property.area_sqm || property.sqm || 0,
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* localStorage not available */
  }
}
