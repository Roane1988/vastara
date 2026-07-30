const STORAGE_KEY = 'hunione_favorites'
let supabaseClient = null

export function setSupabase(client) {
  supabaseClient = client
}

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
  } catch { return [] }
}

export async function initFavorites(userId) {
  if (!supabaseClient || !userId) return getFavorites()
  try {
    const { data } = await supabaseClient.from('saved_properties').select('property_id').eq('user_id', userId)
    if (data) {
      const ids = data.map((r) => r.property_id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    }
  } catch { /* use local fallback */ }
  return getFavorites()
}

export async function toggleFavorite(id) {
  const favorites = getFavorites()
  const idx = favorites.indexOf(id)
  if (idx === -1) {
    favorites.push(id)
  } else {
    favorites.splice(idx, 1)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))

  if (supabaseClient) {
    try {
      if (idx === -1) {
        await supabaseClient.from('saved_properties').insert({ property_id: id }).select()
      } else {
        await supabaseClient.from('saved_properties').delete().eq('property_id', id)
      }
    } catch { /* background sync failed, local is intact */ }
  }

  return favorites
}

export async function syncFavorite(id) {
  return toggleFavorite(id)
}

export function isFavorite(id) {
  return getFavorites().includes(id)
}

export function clearFavorites() {
  localStorage.removeItem(STORAGE_KEY)
}
