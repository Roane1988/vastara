const STORAGE_KEY = 'hunione_favorites'

export function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)

    const oldKey = 'vastara_favorites'
    const oldRaw = localStorage.getItem(oldKey)
    if (oldRaw) {
      const oldData = JSON.parse(oldRaw)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData))
      localStorage.removeItem(oldKey)
      return oldData
    }

    return []
  } catch {
    return []
  }
}

function toggleFavourite(id) {
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

export function toggleFavorite(id) {
  return toggleFavourite(id)
}

export function isFavorite(id) {
  return getFavorites().includes(id)
}

export function clearFavorites() {
  localStorage.removeItem(STORAGE_KEY)
}
