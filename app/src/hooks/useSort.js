import { useState, useMemo } from 'react'

export const useSort = (items, defaultKey = null, defaultOrder = 'asc') => {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortOrder, setSortOrder] = useState(defaultOrder)

  const sortedItems = useMemo(() => {
    if (!sortKey) return items

    return [...items].sort((a, b) => {
      const aVal = sortKey.split('.').reduce((obj, k) => obj?.[k], a)
      const bVal = sortKey.split('.').reduce((obj, k) => obj?.[k], b)

      if (aVal === bVal) return 0

      const comparison = aVal < bVal ? -1 : 1
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [items, sortKey, sortOrder])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const resetSort = () => {
    setSortKey(defaultKey)
    setSortOrder(defaultOrder)
  }

  return {
    sortedItems,
    sortKey,
    sortOrder,
    toggleSort,
    resetSort
  }
}
