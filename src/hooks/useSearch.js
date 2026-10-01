import { useState, useMemo } from 'react'
import { useDebounce } from './useDebounce'
import { getSectionSearchValues, normalizeSectionSearchValue } from '../utils/sectionSearch'

export const useSearch = (items, searchKeys = []) => {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items

    const lowerSearchTerm = normalizeSectionSearchValue(debouncedSearchTerm)

    return items.filter(item => {
      return searchKeys.some(key => {
        return getSectionSearchValues(item, key)
          .some((value) => normalizeSectionSearchValue(value).includes(lowerSearchTerm))
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
