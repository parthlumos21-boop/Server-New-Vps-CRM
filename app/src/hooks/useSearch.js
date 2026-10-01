import { useState, useMemo } from 'react'
import { useDebounce } from './useDebounce'

export const useSearch = (items, searchKeys = []) => {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items

    const lowerSearchTerm = debouncedSearchTerm.toLowerCase()

    return items.filter(item => {
      return searchKeys.some(key => {
        const value = key.split('.').reduce((obj, k) => obj?.[k], item)
        return value?.toString().toLowerCase().includes(lowerSearchTerm)
      })
    })
  }, [items, debouncedSearchTerm, searchKeys])

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    hasResults: filteredItems.length > 0
  }
}
