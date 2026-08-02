import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePropertyStore, MAX_ITEMS } from '../store/usePropertyStore'

export function useCompare(showToast) {
  const { t } = useTranslation()
  const compareList = usePropertyStore((s) => s.compareList)
  const addToCompare = usePropertyStore((s) => s.addToCompare)
  const removeFromCompare = usePropertyStore((s) => s.removeFromCompare)

  const compareSet = useMemo(() => new Set(compareList.map(p => p.id)), [compareList])

  const toggleCompare = useCallback((property) => {
    if (compareSet.has(property.id)) {
      removeFromCompare(property.id)
    } else {
      const added = addToCompare(property)
      if (!added) {
        showToast?.(t('compare.toast_max', { max: MAX_ITEMS }), 'error')
      }
    }
  }, [compareSet, addToCompare, removeFromCompare, showToast, t])

  return { compareSet, toggleCompare }
}
