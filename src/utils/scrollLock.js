let lockCount = 0
let originalOverflow = ''

export function lockScroll() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
  }
  lockCount += 1
  document.body.style.overflow = 'hidden'
}

export function unlockScroll() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow
  }
}

export function resetScrollLock() {
  if (lockCount > 0) {
    document.body.style.overflow = originalOverflow
  }
  lockCount = 0
  originalOverflow = ''
}