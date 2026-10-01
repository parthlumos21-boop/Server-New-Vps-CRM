const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const includesNormalized = (source, targetValues = []) =>
  targetValues.some((value) => normalizeValue(value) === normalizeValue(source))

const applyDealCustomViewFilters = (deal, filters = {}) => {
  const {
    ownerIn = [],
    cityIn = [],
    statusIn = [],
    dealTypeIn = [],
    hasProjectName = false,
    hasPoValue = false,
    projectNameContains = '',
    jobNoContains = '',
    reasonForLostContains = '',
  } = filters

  if (ownerIn.length > 0 && !includesNormalized(deal.dealOwner || deal.ownerName, ownerIn)) {
    return false
  }

  if (cityIn.length > 0 && !includesNormalized(deal.city, cityIn)) {
    return false
  }

  if (statusIn.length > 0 && !includesNormalized(deal.status, statusIn)) {
    return false
  }

  if (dealTypeIn.length > 0 && !includesNormalized(deal.dealType || deal.customerCategory, dealTypeIn)) {
    return false
  }

  if (hasProjectName && !String(deal.projectName || '').trim()) {
    return false
  }

  if (hasPoValue && !String(deal.poValue || '').trim()) {
    return false
  }

  if (normalizeValue(projectNameContains) && !normalizeValue(deal.projectName).includes(normalizeValue(projectNameContains))) {
    return false
  }

  if (normalizeValue(jobNoContains) && !normalizeValue(deal.jobNo).includes(normalizeValue(jobNoContains))) {
    return false
  }

  if (normalizeValue(reasonForLostContains) && !normalizeValue(deal.reasonForLost).includes(normalizeValue(reasonForLostContains))) {
    return false
  }

  return true
}

const getBaseDeals = (deals = [], definition = {}) => {
  switch (definition.baseViewKey) {
    case 'projectDetails':
      return deals.filter((deal) => String(deal.projectName || '').trim() !== '')
    case 'ahmadabad':
      return deals.filter((deal) => normalizeValue(deal.city) === 'ahmadabad')
    case 'vadodara':
      return deals.filter((deal) => normalizeValue(deal.city) === 'vadodara')
    case 'ownerWise':
    case 'search':
    case 'view':
    default:
      return deals
  }
}

export const getCustomViewDeals = (deals = [], definition = {}) =>
  getBaseDeals(deals, definition).filter((deal) => applyDealCustomViewFilters(deal, definition.filters))
