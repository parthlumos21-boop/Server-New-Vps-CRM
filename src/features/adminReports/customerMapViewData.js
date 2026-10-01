const INDIA_REGION_MAP_BOUNDS = {
  north: 37.5,
  south: 6,
  west: 67,
  east: 97.5,
}

const INDIA_CITY_COORDINATES = {
  ahmedabad: { label: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
  bangalore: { label: 'Bangalore', latitude: 12.9716, longitude: 77.5946 },
  bengaluru: { label: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  chennai: { label: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  delhi: { label: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  hyderabad: { label: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  indore: { label: 'Indore', latitude: 22.7196, longitude: 75.8577 },
  jaipur: { label: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  kolkata: { label: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
  mumbai: { label: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  nagpur: { label: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
  new_delhi: { label: 'New Delhi', latitude: 28.6139, longitude: 77.209 },
  pune: { label: 'Pune', latitude: 18.5204, longitude: 73.8567 },
  rajkot: { label: 'Rajkot', latitude: 22.3039, longitude: 70.8022 },
  surat: { label: 'Surat', latitude: 21.1702, longitude: 72.8311 },
  vadodara: { label: 'Vadodara', latitude: 22.3072, longitude: 73.1812 },
}

const INDIAN_STATE_CITY_FALLBACKS = {
  gujarat: 'Ahmedabad',
  delhi: 'Delhi',
  karnataka: 'Bengaluru',
  maharashtra: 'Mumbai',
  rajasthan: 'Jaipur',
  tamil_nadu: 'Chennai',
  telangana: 'Hyderabad',
  west_bengal: 'Kolkata',
  madhya_pradesh: 'Indore',
}

const normalizeCoordinate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const normalizeToken = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')

const titleize = (value = '') =>
  String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

const extractCoordinates = (customer = {}) => {
  const candidatePairs = [
    { lat: customer.latitude, lng: customer.longitude },
    { lat: customer.lat, lng: customer.lng },
    { lat: customer.lat, lng: customer.lon },
    { lat: customer.coordinates?.lat, lng: customer.coordinates?.lng },
    { lat: customer.coordinates?.latitude, lng: customer.coordinates?.longitude },
  ]

  for (const candidate of candidatePairs) {
    const latitude = normalizeCoordinate(candidate.lat)
    const longitude = normalizeCoordinate(candidate.lng)

    if (
      latitude !== null
      && longitude !== null
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180
    ) {
      return { latitude, longitude, source: 'coordinates', cityLabel: '' }
    }
  }

  return { latitude: null, longitude: null, source: '', cityLabel: '' }
}

const inferCityFromAddress = (address = '', state = '') => {
  const normalizedAddress = normalizeToken(address)

  const matchedEntry = Object.entries(INDIA_CITY_COORDINATES).find(([cityKey]) => {
    const normalizedKey = cityKey.replace(/_/g, ' ')
    return normalizedAddress.includes(normalizedKey)
  })

  if (matchedEntry) {
    const [, cityMeta] = matchedEntry
    return {
      cityLabel: cityMeta.label,
      latitude: cityMeta.latitude,
      longitude: cityMeta.longitude,
      source: 'address',
    }
  }

  const normalizedState = normalizeToken(state).replace(/\s+/g, '_')
  const fallbackCityLabel = INDIAN_STATE_CITY_FALLBACKS[normalizedState]
  if (fallbackCityLabel) {
    const fallbackCityKey = normalizeToken(fallbackCityLabel).replace(/\s+/g, '_')
    const cityMeta = INDIA_CITY_COORDINATES[fallbackCityKey]
    if (cityMeta) {
      return {
        cityLabel: cityMeta.label,
        latitude: cityMeta.latitude,
        longitude: cityMeta.longitude,
        source: 'state',
      }
    }
  }

  return {
    cityLabel: '',
    latitude: null,
    longitude: null,
    source: '',
  }
}

const buildViewportPosition = (latitude, longitude) => {
  if (latitude === null || longitude === null) {
    return null
  }

  const { north, south, west, east } = INDIA_REGION_MAP_BOUNDS
  if (latitude > north || latitude < south || longitude < west || longitude > east) {
    return null
  }

  const leftPercent = ((longitude - west) / (east - west)) * 100
  const topPercent = ((north - latitude) / (north - south)) * 100

  return {
    leftPercent,
    topPercent,
  }
}

const buildCityWiseMarkers = (records = []) => {
  const groupedRecords = records.reduce((lookup, record) => {
    const groupingKey = record.cityKey || record.id
    if (!lookup[groupingKey]) {
      lookup[groupingKey] = {
        id: `city-${groupingKey}`,
        cityLabel: record.cityLabel || 'Configured Location',
        latitude: record.latitude,
        longitude: record.longitude,
        viewportPosition: record.viewportPosition,
        customers: [],
      }
    }

    lookup[groupingKey].customers.push(record)
    return lookup
  }, {})

  return Object.values(groupedRecords)
    .map((entry) => ({
      ...entry,
      count: entry.customers.length,
      label: `${entry.cityLabel} (${entry.customers.length})`,
      title: `${entry.cityLabel}: ${entry.customers.map((customer) => customer.name).join(', ')}`,
    }))
    .sort((left, right) => right.count - left.count || left.cityLabel.localeCompare(right.cityLabel))
}

export const buildCustomerMapViewData = (customers = []) => {
  const records = customers.map((customer, index) => {
    const coordinateMeta = extractCoordinates(customer)
    const inferredLocation = coordinateMeta.latitude === null
      ? inferCityFromAddress(customer.address, customer.state)
      : coordinateMeta

    const latitude = coordinateMeta.latitude ?? inferredLocation.latitude
    const longitude = coordinateMeta.longitude ?? inferredLocation.longitude
    const cityLabel = inferredLocation.cityLabel || ''
    const viewportPosition = buildViewportPosition(latitude, longitude)
    const hasPlottableLocation = latitude !== null && longitude !== null && Boolean(viewportPosition)

    return {
      id: String(customer.id || customer.customerNumber || `customer-${index + 1}`),
      name: customer.customerName || customer.customerNumber || `Customer ${index + 1}`,
      customerNumber: customer.customerNumber || '',
      owner: customer.customerOwner || '',
      address: customer.address || '',
      state: titleize(customer.state || ''),
      cityLabel,
      cityKey: cityLabel ? normalizeToken(cityLabel).replace(/\s+/g, '_') : '',
      latitude,
      longitude,
      locationSource: coordinateMeta.latitude !== null ? 'coordinates' : inferredLocation.source,
      hasPlottableLocation,
      viewportPosition,
    }
  })

  const customersWithLocations = records.filter((record) => record.hasPlottableLocation)
  const customersWithoutLocations = records.filter((record) => !record.hasPlottableLocation)
  const cityWiseMarkers = buildCityWiseMarkers(customersWithLocations)

  return {
    records,
    customersWithLocations,
    customersWithoutLocations,
    cityWiseMarkers,
    bounds: INDIA_REGION_MAP_BOUNDS,
  }
}
