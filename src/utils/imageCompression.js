import imageCompression from 'browser-image-compression'

export const IMAGE_MAX_SIZE_MB = 0.5
export const IMAGE_MAX_WIDTH_OR_HEIGHT = 1920

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function compressImage(file) {
  if (!file || !COMPRESSIBLE_TYPES.has(file.type)) return file
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: IMAGE_MAX_SIZE_MB,
      maxWidthOrHeight: IMAGE_MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
      fileType: file.type,
    })
    if (!compressed || compressed.size >= file.size) return file
    return new File([compressed], file.name, { type: compressed.type || file.type })
  } catch {
    return file
  }
}
