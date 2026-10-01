const uniqueSortedValues = (records, key) =>
  Array.from(
    new Set(
      records
        .map((record) => record[key])
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right)))

const includesText = (value, query) =>
  String(value || '').toLowerCase().includes(String(query || '').trim().toLowerCase())

const normalizeStatus = (value) => String(value || '').toLowerCase()

export const getSupportRequestCustomViewFilterOptions = (supportRequests = []) => ({
  owners: uniqueSortedValues(supportRequests, 'ownerName'),
  statuses: uniqueSortedValues(supportRequests, 'status'),
  priorities: uniqueSortedValues(supportRequests, 'priority'),
  requestTypes: uniqueSortedValues(supportRequests, 'requestType'),
  cities: uniqueSortedValues(supportRequests, 'city'),
  states: uniqueSortedValues(supportRequests, 'state'),
  addedByUsers: uniqueSortedValues(supportRequests, 'addedByName'),
})

export const getCustomViewSupportRequests = (supportRequests = [], user, customViewDefinition = {}) => {
  const filters = customViewDefinition.filters || {}
  const classification = customViewDefinition.classification || 'all_requests'
  const now = Date.now()
  const recentThreshold = now - (7 * 24 * 60 * 60 * 1000)

  return supportRequests
    .filter((supportRequest) => {
      if (classification === 'open_requests') {
        return normalizeStatus(supportRequest.status) !== 'closed'
      }

      if (classification === 'closed_requests') {
        return normalizeStatus(supportRequest.status) === 'closed'
      }

      if (classification === 'my_requests') {
        return supportRequest.ownerId === user?.id
      }

      if (classification === 'recently_updated') {
        return new Date(supportRequest.updatedAt || supportRequest.createdAt || 0).getTime() >= recentThreshold
      }

      return true
    })
    .filter((supportRequest) => {
      if (filters.ownerIn?.length > 0 && !filters.ownerIn.includes(supportRequest.ownerName)) return false
      if (filters.statusIn?.length > 0 && !filters.statusIn.includes(supportRequest.status)) return false
      if (filters.priorityIn?.length > 0 && !filters.priorityIn.includes(supportRequest.priority)) return false
      if (filters.requestTypeIn?.length > 0 && !filters.requestTypeIn.includes(supportRequest.requestType)) return false
      if (filters.cityIn?.length > 0 && !filters.cityIn.includes(supportRequest.city)) return false
      if (filters.stateIn?.length > 0 && !filters.stateIn.includes(supportRequest.state)) return false
      if (filters.addedByIn?.length > 0 && !filters.addedByIn.includes(supportRequest.addedByName)) return false
      if (filters.hasContactEmail && !supportRequest.contactEmail) return false
      if (filters.hasContactMobile && !(supportRequest.contactMobile || supportRequest.contactPhone)) return false
      if (filters.hasOnSiteRequirements && !supportRequest.onSiteRequirements) return false
      if (filters.customerNameContains && !includesText(supportRequest.customerName, filters.customerNameContains)) return false
      if (filters.titleContains && !includesText(supportRequest.title, filters.titleContains)) return false
      if (filters.contactPersonContains && !includesText(supportRequest.contactPerson, filters.contactPersonContains)) return false
      if (filters.referenceNumberContains && !includesText(supportRequest.referenceNumber, filters.referenceNumberContains)) return false

      return true
    })
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
}
