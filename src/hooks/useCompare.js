import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { addToCompare, removeFromCompare, getCompareList, MAX_ITEMS } from '../utils/compare'

export function useCompare(showToast) {
  const { t } = useTranslation()
  const [compareSet, setCompareSet] = useState(() => new Set(getCompareList().map(p => p.id)))

  useEffect(() => {
    const sync = () => setCompareSet(new Set(getCompareList().map(p => p.id)))
    window.addEventListener('compare-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('compare-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggleCompare = useCallback((property) => {
    if (compareSet.has(property.id)) {
      removeFromCompare(property.id)
      setCompareSet(prev => { const s = new Set(prev); s.delete(property.id); return s })
    } else {
      const updated = addToCompare(property)
      if (!updated.some(x => x.id === property.id)) {
        showToast?.(t('compare.toast_max', { max: MAX_ITEMS }), 'error')
      }
      setCompareSet(new Set(updated.map(x => x.id)))
    }
    window.dispatchEvent(new Event('compare-updated'))
  }, [compareSet, showToast, t])

  return { compareSet, toggleCompare }
}
