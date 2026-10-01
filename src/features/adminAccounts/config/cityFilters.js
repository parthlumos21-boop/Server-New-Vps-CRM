import { SW_BARODA_MUM_TABS } from './swBarodaMumTabs'

export const getCityForUser = (ownerName) => {
  const normalized = String(ownerName || '').trim().toLowerCase()
  if (!normalized) return 'Ahemedabad' // Default fallback

  const isBarodaMum = SW_BARODA_MUM_TABS.some(tab => 
    tab.ownerNames.some(name => {
      const normalizedName = name.toLowerCase()
      return normalizedName === normalized || normalized.includes(normalizedName)
    })
  )

  if (isBarodaMum) {
    if (normalized.includes('mumbai') || normalized.includes('tajamul') || normalized.includes('solkar')) {
      return 'Mumbai'
    }
    return 'Baroda'
  }

  return 'Ahemedabad'
}
