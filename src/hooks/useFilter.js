import { useState, useMemo } from 'react'

export const useFilter = (items, initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters)

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === 'all') return true

        const itemValue = key.split('.').reduce((obj, k) => obj?.[k], item)

        if (Array.isArray(value)) {
          return value.includes(itemValue)
        }

        return itemValue === value
      })
    })
  }, [items, filters])

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilter = (key) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setFilters(initialFilters)
  }

  return {
    filters,
    filteredItems,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasFilters: Object.keys(filters).length > 0
  }
}
