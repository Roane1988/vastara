const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'

export function parseImages(imageUrl) {
  if (!imageUrl) return []
  if (Array.isArray(imageUrl)) return imageUrl.filter(Boolean)
  try {
    const parsed = JSON.parse(imageUrl)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [imageUrl]
  } catch {
    return [imageUrl]
  }
}

export function getImageSrc(imageUrl) {
  const images = parseImages(imageUrl)
  return images.length > 0 ? images[0] : FALLBACK_IMAGE
}
