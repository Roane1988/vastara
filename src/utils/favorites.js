const STORAGE_KEY = 'vastara_favorites'

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function toggleFavorite(id) {
  const favorites = getFavorites()
  const idx = favorites.indexOf(id)
  if (idx === -1) {
    favorites.push(id)
  } else {
    favorites.splice(idx, 1)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  return favorites
}

export function isFavorite(id) {
  return getFavorites().includes(id)
}

export function clearFavorites() {
  localStorage.removeItem(STORAGE_KEY)
}
