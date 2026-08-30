import { useCallback, useMemo } from 'react'
import { usePropertyStore } from '../store/usePropertyStore'

export function useCompare() {
  const compareList = usePropertyStore((s) => s.compareList)
  const addToCompare = usePropertyStore((s) => s.addToCompare)
  const removeFromCompare = usePropertyStore((s) => s.removeFromCompare)
  const setCompareNotice = usePropertyStore((s) => s.setCompareNotice)

  const compareSet = useMemo(() => new Set(compareList.map(p => p.id)), [compareList])

  const toggleCompare = useCallback((property) => {
    if (compareSet.has(property.id)) {
      removeFromCompare(property.id)
      return
    }
    const result = addToCompare(property)
    if (result === 'max' || result === 'type_mismatch') {
      setCompareNotice(result)
    }
  }, [compareSet, addToCompare, removeFromCompare, setCompareNotice])

  return { compareSet, toggleCompare }
}