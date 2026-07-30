const STORAGE_KEY = 'vastara_compare'
const MAX_ITEMS = 3

export function getCompareList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToCompare(property) {
  if (!property?.id) return getCompareList()
  const list = getCompareList().filter(p => p.id !== property.id)
  if (list.length >= MAX_ITEMS) return list
  list.push({
    id: property.id,
    title: property.title || '',
    price: property.price || 0,
    image_url: property.image_url || '',
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function removeFromCompare(propertyId) {
  if (!propertyId) return []
  const list = getCompareList().filter(p => p.id !== propertyId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function isInCompare(propertyId) {
  return getCompareList().some(p => p.id === propertyId)
}

export function clearCompare() {
  localStorage.removeItem(STORAGE_KEY)
}
