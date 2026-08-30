import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const MAX_ITEMS = 3
export const MAX_RECENT_ITEMS = 10

const STORAGE_KEY = 'vastara_property_store'
const LEGACY_COMPARE_KEY = 'vastara_compare'
const LEGACY_RECENT_KEY = 'vastara_recently_viewed'

function readLegacy(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const isRentCategory = (category) => category === 'Disewa'

function normalizeCompareItem(property) {
  return {
    id: property.id,
    title: property.title || '',
    price: property.price || 0,
    image_url: property.image_url || '',
    category: property.category || property.typeLabel || '',
  }
}

function normalizeRecentItem(property) {
  return {
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
  }
}

export const usePropertyStore = create(
  persist(
    (set, get) => ({
      compareList: [],
      recentlyViewed: [],
      compareNotice: null,

      addToCompare: (property) => {
        if (!property?.id) return 'invalid'
        const list = get().compareList.filter((p) => p.id !== property.id)
        if (list.length >= MAX_ITEMS) return 'max'
        const newIsRent = isRentCategory(property.category) || isRentCategory(property.typeLabel)
        const firstCategory = list[0]?.category
        if (list.length > 0 && firstCategory && isRentCategory(firstCategory) !== newIsRent) {
          return 'type_mismatch'
        }
        set({ compareList: [...list, normalizeCompareItem(property)] })
        return 'added'
      },

      removeFromCompare: (propertyId) => {
        if (!propertyId) return
        set({ compareList: get().compareList.filter((p) => p.id !== propertyId) })
      },

      clearCompare: () => set({ compareList: [] }),

      setCompareNotice: (notice) => set({ compareNotice: notice }),

      clearCompareNotice: () => set({ compareNotice: null }),

      isInCompare: (propertyId) => get().compareList.some((p) => p.id === propertyId),

      addRecentlyViewed: (property) => {
        if (!property?.id) return
        const list = get().recentlyViewed.filter((p) => p.id !== property.id)
        list.unshift(normalizeRecentItem(property))
        set({ recentlyViewed: list.slice(0, MAX_RECENT_ITEMS) })
      },

      removeRecentlyViewed: (propertyId) => {
        if (!propertyId) return
        set({ recentlyViewed: get().recentlyViewed.filter((p) => p.id !== propertyId) })
      },

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        compareList: state.compareList,
        recentlyViewed: state.recentlyViewed,
      }),
      merge: (persisted, current) => {
        if (!persisted) {
          const merged = { ...current }
          const legacyCompare = readLegacy(LEGACY_COMPARE_KEY)
          const legacyRecent = readLegacy(LEGACY_RECENT_KEY)
          if (Array.isArray(legacyCompare) && legacyCompare.length > 0) merged.compareList = legacyCompare
          if (Array.isArray(legacyRecent) && legacyRecent.length > 0) merged.recentlyViewed = legacyRecent
          return merged
        }
        return { ...current, ...persisted }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) usePropertyStore.persist.rehydrate()
  })
}
