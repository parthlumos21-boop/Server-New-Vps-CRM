import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiArrowRight,
  FiChevronDown,
  FiInfo,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { customerService } from '../../../services/customerService'
import { SUPPORT_REQUEST_TYPE_OPTIONS } from './SupportRequestShared'
import './AddSupportRequest.css'

const CUSTOMER_PAGE_SIZE = 15

const STEP_CONFIG = [
  { number: 1, title: 'Customer Details' },
  { number: 2, title: 'SR Details' },
  { number: 3, title: 'Location' },
  { number: 4, title: 'Contact' },
]

const COUNTRY_STATE_CITY = {
  India: {
    Gujarat: ['Ahmedabad', 'Vadodara', 'Surat', 'Rajkot'],
    Maharashtra: ['Mumbai', 'Pune', 'Nashik'],
    Rajasthan: ['Jaipur', 'Udaipur'],
  },
  USA: {
    California: ['Los Angeles', 'San Francisco', 'San Diego'],
    Texas: ['Austin', 'Dallas', 'Houston'],
  },
}

const REQUIRED_FIELDS_BY_STEP = {
  0: [
    { key: 'customerName', label: 'Customer Name', message: 'Please provide Customer Name.' },
    { key: 'customerMobile', label: 'Mobile Number', message: 'Please provide Mobile Number.' },
    { key: 'customerEmail', label: 'Email', message: 'Please provide Email.' },
    { key: 'customerCompany', label: 'Company Name', message: 'Please provide Company Name.' },
    { key: 'requestType', label: 'SR Type / Complaint Type', message: 'Please select SR Type / Complaint Type.' },
  ],
  1: [
    { key: 'ownerId', label: 'Owner', message: 'Please select Owner.' },
    { key: 'description', label: 'Description', message: 'Please provide Description.' },
  ],
  2: [
    { key: 'locationName', label: 'Location Name', message: 'Please provide Location Name.' },
    { key: 'address', label: 'Address', message: 'Please provide Address.' },
    { key: 'country', label: 'Country', message: 'Please select Country.' },
    { key: 'state', label: 'State', message: 'Please select State.' },
    { key: 'city', label: 'City', message: 'Please select City.' },
  ],
  3: [
    { key: 'contactPerson', label: 'Contact Name', message: 'Please provide Contact Name.' },
    { key: 'contactPhone', label: 'Contact Phone', message: 'Please provide Contact Phone.' },
  ],
}

const requiredLabel = (label) => (
  <>
    {label} <span className="sr-required">*</span>
  </>
)

const compactAddress = (...parts) => (
  parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .filter((part, index, values) => values.indexOf(part) === index)
    .join(', ')
)

const getCityFromAddress = (address = {}) => (
  address.city
  || address.town
  || address.village
  || address.municipality
  || address.city_district
  || address.county
  || ''
)

const getLocationNameFromAddress = (address = {}, fallback = '') => (
  address.building
  || address.office
  || address.shop
  || address.amenity
  || address.road
  || address.neighbourhood
  || address.suburb
  || fallback
  || ''
)

const parseLocationResult = (place = {}) => {
  const address = place.address || {}
  const city = getCityFromAddress(address)
  const locationName = getLocationNameFromAddress(address, place.name)
  const streetAddress = compactAddress(
    address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
    address.neighbourhood,
    address.suburb,
    city,
    address.state,
    address.postcode,
    address.country
  )

  return {
    locationName,
    address: streetAddress || place.display_name || '',
    country: address.country || '',
    state: address.state || '',
    city,
    zipCode: address.postcode || '',
    latitude: place.lat ? Number(place.lat).toFixed(7) : '',
    longitude: place.lon ? Number(place.lon).toFixed(7) : '',
  }
}

const fetchReverseGeocode = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
  )

  if (!response.ok) {
    throw new Error('Unable to fetch address for this location.')
  }

  return response.json()
}

const fetchJson = async (url) => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Unable to search location.')
  }

  return response.json()
}

const getLocationSearchVariants = (query) => {
  const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ')
  const commaNormalizedQuery = normalizedQuery.replace(/\s*,\s*/g, ', ')
  const variants = [
    normalizedQuery,
    commaNormalizedQuery,
    normalizedQuery.replace(/\s+-\s+/g, ', '),
  ].filter(Boolean)

  return variants.filter((value, index) => variants.indexOf(value) === index)
}

const fetchNominatimSearch = async (query) => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    extratags: '1',
    dedupe: '1',
    limit: '5',
    q: query,
  })
  const language = typeof navigator !== 'undefined' ? navigator.language : ''

  if (language) {
    params.set('accept-language', language)
  }

  const places = await fetchJson(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
  return Array.isArray(places) ? places[0] : null
}

const parsePhotonResult = (feature = {}) => {
  const properties = feature.properties || {}
  const coordinates = feature.geometry?.coordinates || []
  const longitude = coordinates[0]
  const latitude = coordinates[1]
  const city = properties.city || properties.town || properties.village || properties.county || ''
  const locationName = properties.name || properties.street || city || ''

  return {
    locationName,
    address: compactAddress(
      properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street,
      properties.district,
      city,
      properties.state,
      properties.postcode,
      properties.country
    ),
    country: properties.country || '',
    state: properties.state || '',
    city,
    zipCode: properties.postcode || '',
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude).toFixed(7) : '',
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude).toFixed(7) : '',
  }
}

const fetchPhotonSearch = async (query) => {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    lang: 'en',
  })
  const data = await fetchJson(`https://photon.komoot.io/api/?${params.toString()}`)
  const feature = Array.isArray(data.features) ? data.features[0] : null

  return feature ? parsePhotonResult(feature) : null
}

const fetchLocationSearch = async (query) => {
  const variants = getLocationSearchVariants(query)
  let lastError = null

  for (const variant of variants) {
    try {
      const place = await fetchNominatimSearch(variant)

      if (place) {
        return parseLocationResult(place)
      }
    } catch (error) {
      lastError = error
    }
  }

  for (const variant of variants) {
    try {
      const place = await fetchPhotonSearch(variant)

      if (place) {
        return place
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}

const SearchableRequestTypeField = ({ value, options, error, onChange }) => {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [options, searchTerm])

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    setSearchTerm(nextValue)
    setIsOpen(true)

    if (!nextValue.trim()) {
      onChange('')
    }
  }

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Enter' && filteredOptions.length > 0) {
      event.preventDefault()
      handleSelect(filteredOptions[0].value)
    }
  }

  const inputValue = isOpen
    ? (searchTerm || selectedOption?.label || '')
    : (selectedOption?.label || '')

  return (
    <label className={`sr-new-field ${error ? 'sr-new-field--error' : ''}`}>
      <span>{requiredLabel('Request Type')}</span>
      <div
        ref={containerRef}
        className={`sr-new-searchable-select ${error ? 'sr-new-searchable-select--error' : ''}`}
      >
        <input
          type="text"
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Select"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
          aria-label="SR Type / Complaint Type"
        />
        <button
          type="button"
          className="sr-new-searchable-toggle"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-label="Toggle SR Type / Complaint Type options"
        >
          <FiChevronDown />
        </button>

        {isOpen ? (
          <div className="sr-new-searchable-menu" role="listbox" aria-label="SR Type / Complaint Type options">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`sr-new-searchable-option ${option.value === value ? 'sr-new-searchable-option--active' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            )) : (
              <div className="sr-new-searchable-empty">No matching request type found.</div>
            )}
          </div>
        ) : null}
      </div>
      {error ? <small>{error}</small> : null}
    </label>
  )
}

const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase()

const getPrimaryContact = (customer) => customer.contacts?.[0] || {}

const buildCustomerSearchRow = (customer) => {
  const primaryContact = getPrimaryContact(customer)

  return {
    id: customer.id,
    customerNumber: customer.customerNumber || '',
    customerName: customer.customerName || '',
    email: primaryContact.email || '',
    phone: primaryContact.phone || primaryContact.mobile || '',
    customerOwner: customer.customerOwnerDisplay || customer.customerOwnerName || customer.customerOwner || '',
    customer,
    primaryContact,
  }
}

const CustomerPickerModal = ({ isOpen, customerRows, onClose, onSelect }) => {
  const [searchState, setSearchState] = useState({
    customerNumber: '',
    customerName: '',
    email: '',
    phone: '',
    customerOwner: '',
  })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchState])

  if (!isOpen) {
    return null
  }

  const filteredRows = customerRows.filter((row) => (
    (!searchState.customerNumber || normalizeFilterValue(row.customerNumber).includes(normalizeFilterValue(searchState.customerNumber))) &&
    (!searchState.customerName || normalizeFilterValue(row.customerName).includes(normalizeFilterValue(searchState.customerName))) &&
    (!searchState.email || normalizeFilterValue(row.email).includes(normalizeFilterValue(searchState.email))) &&
    (!searchState.phone || normalizeFilterValue(row.phone).includes(normalizeFilterValue(searchState.phone))) &&
    (!searchState.customerOwner || normalizeFilterValue(row.customerOwner).includes(normalizeFilterValue(searchState.customerOwner)))
  ))

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / CUSTOMER_PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * CUSTOMER_PAGE_SIZE
  const visibleRows = filteredRows.slice(pageStart, pageStart + CUSTOMER_PAGE_SIZE)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((pageNumber) => Math.abs(pageNumber - safePage) <= 1 || pageNumber === 1 || pageNumber === totalPages)
    .slice(0, 5)

  const updateSearch = (field, value) => {
    setSearchState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }))
  }

  return (
    <div className="sr-customer-modal-backdrop" role="presentation">
      <div className="sr-customer-modal" role="dialog" aria-modal="true" aria-labelledby="sr-customer-modal-title">
        <div className="sr-customer-modal-header">
          <h2 id="sr-customer-modal-title">Customer List</h2>
          <button type="button" className="sr-customer-modal-close" onClick={onClose} aria-label="Close customer list">
            <FiX />
          </button>
        </div>

        <div className="sr-customer-modal-note">
          <FiInfo />
          <span>Note: Please double click on the customer to select a customer.</span>
          <button type="button" className="sr-customer-modal-note-close" onClick={onClose} aria-label="Close customer note">
            <FiX />
          </button>
        </div>

        <div className="sr-customer-table-shell">
          <table className="sr-customer-table">
            <thead>
              <tr>
                <th>Customer No.</th>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Customer Owner</th>
              </tr>
              <tr className="sr-customer-table-search-row">
                <th>
                  <input
                    type="text"
                    value={searchState.customerNumber}
                    onChange={(event) => updateSearch('customerNumber', event.target.value)}
                    placeholder="Search here ..."
                  />
                </th>
                <th>
                  <input
                    type="text"
                    value={searchState.customerName}
                    onChange={(event) => updateSearch('customerName', event.target.value)}
                    placeholder="Search here ..."
                  />
                </th>
                <th>
                  <input
                    type="text"
                    value={searchState.email}
                    onChange={(event) => updateSearch('email', event.target.value)}
                    placeholder="Search here ..."
                  />
                </th>
                <th>
                  <input
                    type="text"
                    value={searchState.phone}
                    onChange={(event) => updateSearch('phone', event.target.value)}
                    placeholder="Search here ..."
                  />
                </th>
                <th>
                  <input
                    type="text"
                    value={searchState.customerOwner}
                    onChange={(event) => updateSearch('customerOwner', event.target.value)}
                    placeholder="Search here ..."
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length > 0 ? visibleRows.map((row) => (
                <tr key={row.id} onDoubleClick={() => onSelect(row)} title="Double click to select customer">
                  <td>{row.customerNumber || '-'}</td>
                  <td>{row.customerName || '-'}</td>
                  <td>{row.email || '-'}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.customerOwner || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="sr-customer-table-empty">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sr-customer-modal-footer">
          <div className="sr-customer-modal-total">Total records: {filteredRows.length}</div>
          <div className="sr-customer-modal-pagination">
            <button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={safePage === 1}>
              prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === safePage ? 'is-active' : ''}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={safePage === totalPages}>
              next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AddSupportRequest = ({ panelMode = false, onClose, onSuccess }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { addNotification, createSupportRequest, supportRequests } = useData()
  const fileInputRef = useRef(null)
  const locationWatchIdRef = useRef(null)
  const liveReverseLookupRef = useRef({ latitude: '', longitude: '', checkedAt: 0 })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [validationSummary, setValidationSummary] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isLocationEditorOpen, setIsLocationEditorOpen] = useState(false)
  const [isContactFormOpen, setIsContactFormOpen] = useState(false)
  const [isLiveLocationActive, setIsLiveLocationActive] = useState(false)
  const [locationSearchTerm, setLocationSearchTerm] = useState('')
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [formData, setFormData] = useState({
    customerId: '',
    customerNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerMobile: '',
    customerCompany: '',
    requestType: '',
    title: '',
    description: '',
    notes: '',
    locationName: '',
    country: '',
    state: '',
    city: '',
    address: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    locationAccuracy: '',
    locationCapturedAt: '',
    locationSource: '',
    contactPerson: '',
    contactDesignation: '',
    contactEmail: '',
    contactPhone: '',
    contactMobile: '',
    ownerId: user?.id || '',
    ownerName: user?.name || user?.username || '',
  })

  const isAdminRoute = location.pathname.startsWith('/admin')
  const backPath = isAdminRoute ? '/admin/support-requests/list' : '/support-requests/list'

  useEffect(() => {
    if (user?.id && !formData.ownerId) {
      setFormData((currentValue) => ({
        ...currentValue,
        ownerId: user.id,
        ownerName: user.name || user.username || '',
      }))
    }
  }, [formData.ownerId, user?.id, user?.name, user?.username])

  const [customers, setCustomers] = useState(() => customerService.getCustomers())
  useEffect(() => {
    const unsubscribe = customerService.subscribe((nextCustomers) => {
      setCustomers([...nextCustomers])
    })

    customerService.loadCustomers()
      .then((nextCustomers) => setCustomers([...nextCustomers]))
      .catch(() => {})

    return unsubscribe
  }, [])

  const customerRows = useMemo(
    () => customers.map(buildCustomerSearchRow),
    [customers]
  )

  const selectedCustomer = useMemo(
    () => customerRows.find((row) => String(row.id) === String(formData.customerId))?.customer || null,
    [customerRows, formData.customerId]
  )

  const customerLocations = useMemo(() => {
    const rawLocations = [
      ...(Array.isArray(selectedCustomer?.locations) ? selectedCustomer.locations : []),
      ...(Array.isArray(selectedCustomer?.serviceLocations) ? selectedCustomer.serviceLocations : []),
      ...(Array.isArray(selectedCustomer?.addresses) ? selectedCustomer.addresses : []),
    ]

    return rawLocations
      .filter(Boolean)
      .map((entry, index) => ({
        id: entry.id || `customer-location-${index + 1}`,
        locationName: entry.locationName || entry.name || entry.title || `Location ${index + 1}`,
        address: entry.address || entry.displayAddress || '',
        country: entry.country || '',
        state: entry.state || '',
        city: entry.city || '',
        zipCode: entry.zipCode || entry.postalCode || entry.pincode || '',
        latitude: entry.latitude || entry.lat || '',
        longitude: entry.longitude || entry.lng || entry.lon || '',
      }))
  }, [selectedCustomer])

  const customerContacts = useMemo(() => (
    Array.isArray(selectedCustomer?.contacts)
      ? selectedCustomer.contacts.filter(Boolean)
      : []
  ), [selectedCustomer])

  const srNumberPreview = useMemo(() => {
    const maxSequence = (supportRequests || []).reduce((currentMax, supportRequest) => {
      const sequence = Number.parseInt(String(supportRequest?.srNumber || '').replace(/\D/g, ''), 10)
      return Number.isFinite(sequence) ? Math.max(currentMax, sequence) : currentMax
    }, 0)

    return `SR${String(maxSequence + 1).padStart(6, '0')}`
  }, [supportRequests])

  const countryOptions = useMemo(() => {
    const options = Object.keys(COUNTRY_STATE_CITY)
    return formData.country && !options.includes(formData.country)
      ? [formData.country, ...options]
      : options
  }, [formData.country])

  const stateOptions = useMemo(() => {
    const states = Object.keys(COUNTRY_STATE_CITY[formData.country] || {})
    return formData.state && !states.includes(formData.state)
      ? [formData.state, ...states]
      : states
  }, [formData.country, formData.state])

  const cityOptions = useMemo(() => {
    const cities = COUNTRY_STATE_CITY[formData.country]?.[formData.state] || []
    return formData.city && !cities.includes(formData.city)
      ? [formData.city, ...cities]
      : cities
  }, [formData.city, formData.country, formData.state])

  const attachmentSummary = useMemo(
    () => selectedFiles.map((file) => file.name).join(', '),
    [selectedFiles]
  )

  const selectedCustomerSummary = useMemo(() => {
    if (!formData.customerName) {
      return ''
    }

    if (!formData.customerNumber) {
      return formData.customerName
    }

    return `${formData.customerName} (${formData.customerNumber})`
  }, [formData.customerName, formData.customerNumber])

  const coordinateSummary = useMemo(() => {
    if (!formData.latitude || !formData.longitude) {
      return ''
    }

    const accuracy = formData.locationAccuracy
      ? ` | Accuracy ${Math.round(Number(formData.locationAccuracy))} m`
      : ''

    return `${formData.latitude}, ${formData.longitude}${accuracy}`
  }, [formData.latitude, formData.longitude, formData.locationAccuracy])

  const hasSelectedLocation = Boolean(
    formData.locationName
    || formData.address
    || formData.city
    || formData.state
    || (formData.latitude && formData.longitude)
  )

  const hasMapCoordinates = Boolean(formData.latitude && formData.longitude)

  const handleChange = (field, value) => {
    setFormData((currentValue) => {
      const nextValue = { ...currentValue, [field]: value }

      if (field === 'country') {
        nextValue.state = ''
        nextValue.city = ''
      }

      if (field === 'state') {
        nextValue.city = ''
      }

      return nextValue
    })
    if (errors[field]) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors[field]
        return nextErrors
      })
    }
    if (validationSummary.length > 0) {
      setValidationSummary((currentSummary) => currentSummary.filter((entry) => entry.key !== field))
    }
  }

  const clearLiveLocationWatch = () => {
    if (locationWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }

    setIsLiveLocationActive(false)
  }

  useEffect(() => () => {
    if (locationWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }
  }, [])

  const applyLocationToForm = (locationDetails, source, extra = {}) => {
    setFormData((currentValue) => ({
      ...currentValue,
      locationName: locationDetails.locationName || currentValue.locationName,
      country: locationDetails.country || currentValue.country,
      state: locationDetails.state || currentValue.state,
      city: locationDetails.city || currentValue.city,
      zipCode: locationDetails.zipCode || currentValue.zipCode,
      address: locationDetails.address || currentValue.address,
      latitude: locationDetails.latitude || currentValue.latitude,
      longitude: locationDetails.longitude || currentValue.longitude,
      locationAccuracy: extra.accuracy ? String(extra.accuracy) : currentValue.locationAccuracy,
      locationCapturedAt: extra.capturedAt || new Date().toISOString(),
      locationSource: source,
    }))
  }

  const shouldRefreshLiveAddress = (latitude, longitude) => {
    const previousLookup = liveReverseLookupRef.current
    const checkedAt = Number(previousLookup.checkedAt) || 0
    const movedEnough = (
      Math.abs(Number(latitude) - Number(previousLookup.latitude || 0)) > 0.00035
      || Math.abs(Number(longitude) - Number(previousLookup.longitude || 0)) > 0.00035
    )

    return !previousLookup.latitude || movedEnough || Date.now() - checkedAt > 45000
  }

  const applyGpsPosition = async (position, source = 'live-location') => {
    const latitude = position.coords.latitude.toFixed(7)
    const longitude = position.coords.longitude.toFixed(7)
    const capturedAt = new Date().toISOString()
    const accuracy = position.coords.accuracy
    let locationDetails = { latitude, longitude }
    let addressLookupFailed = false

    if (shouldRefreshLiveAddress(latitude, longitude)) {
      try {
        const place = await fetchReverseGeocode(latitude, longitude)
        locationDetails = {
          ...parseLocationResult(place),
          latitude,
          longitude,
        }
        liveReverseLookupRef.current = {
          latitude,
          longitude,
          checkedAt: Date.now(),
        }
      } catch {
        addressLookupFailed = true
      }
    }

    applyLocationToForm(locationDetails, source, {
      accuracy,
      capturedAt,
    })

    setLocationBusy(false)
    setLocationMessage(addressLookupFailed ? 'Live GPS added. Address lookup pending.' : 'Live location added.')
  }

  const handleOpenLocationEditor = () => {
    setIsLocationEditorOpen(true)
    if (!locationMessage) {
      setLocationMessage('Ready')
    }
  }

  const handleUseCustomerLocation = (locationDetails) => {
    clearLiveLocationWatch()
    applyLocationToForm(locationDetails, 'customer-location')
    setIsLocationEditorOpen(true)
    setLocationMessage('Customer location loaded.')
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser.')
      return
    }

    setIsLocationEditorOpen(true)
    setLocationBusy(true)
    setLocationMessage('Starting live GPS...')

    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setIsLiveLocationActive(true)
        applyGpsPosition(position, 'live-location')
      },
      (error) => {
        setLocationBusy(false)
        setIsLiveLocationActive(false)
        setLocationMessage(error.message || 'Unable to fetch current location.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    )
  }

  const handleLocationSearch = async () => {
    const query = locationSearchTerm.trim()

    if (!query) {
      setLocationMessage('Enter a location to search.')
      return
    }

    clearLiveLocationWatch()
    setLocationBusy(true)
    setLocationMessage('Searching location...')

    try {
      const place = await fetchLocationSearch(query)

      if (!place) {
        setLocationMessage('No matching location found.')
        return
      }

      applyLocationToForm(place, 'search')
      setLocationMessage('Location added from search.')
    } catch (error) {
      setLocationMessage(error.message || 'Unable to search location.')
    } finally {
      setLocationBusy(false)
    }
  }

  const handleLocationSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleLocationSearch()
    }
  }

  const handleFileSelection = (event) => {
    const nextFiles = Array.from(event.target.files || [])
    setSelectedFiles(nextFiles)
  }

  const validateStep = (stepIndex) => {
    const nextErrors = {}
    const nextSummary = []

    ;(REQUIRED_FIELDS_BY_STEP[stepIndex] || []).forEach((field) => {
      if (!String(formData[field.key] || '').trim()) {
        nextErrors[field.key] = field.message
        nextSummary.push(field)
      }
    })

    setErrors((currentErrors) => ({
      ...Object.fromEntries(Object.keys(currentErrors).filter((key) => (
        !(REQUIRED_FIELDS_BY_STEP[stepIndex] || []).some((field) => field.key === key)
      )).map((key) => [key, currentErrors[key]])),
      ...nextErrors,
    }))
    setValidationSummary(nextSummary)

    if (stepIndex === 2 && nextSummary.length > 0) {
      setIsLocationEditorOpen(true)
    }

    if (stepIndex === 3 && nextSummary.length > 0) {
      setIsContactFormOpen(true)
    }

    return Object.keys(nextErrors).length === 0
  }

  const validateAll = () => {
    for (let stepIndex = 0; stepIndex < STEP_CONFIG.length; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setCurrentStep(stepIndex)
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((value) => Math.min(STEP_CONFIG.length - 1, value + 1))
    }
  }

  const handleCustomerSelect = (row) => {
    const { customer, primaryContact } = row

    clearLiveLocationWatch()
    setFormData((currentValue) => ({
      ...currentValue,
      customerId: customer.id || '',
      customerNumber: customer.customerNumber || '',
      customerName: customer.customerName || '',
      customerEmail: primaryContact.email || '',
      customerPhone: primaryContact.phone || '',
      customerMobile: primaryContact.mobile || primaryContact.phone || '',
      customerCompany: customer.companyName || customer.company || customer.customerCompany || customer.customerName || '',
      state: currentValue.state || '',
      city: currentValue.city || '',
      address: customer.address || currentValue.address || '',
      zipCode: currentValue.zipCode || '',
      contactPerson: primaryContact.contactPerson || '',
      contactDesignation: primaryContact.designation || '',
      contactEmail: primaryContact.email || '',
      contactPhone: primaryContact.phone || '',
      contactMobile: primaryContact.mobile || primaryContact.phone || '',
    }))
    setIsLocationEditorOpen(false)
    setIsContactFormOpen(false)
    setLocationSearchTerm('')
    setLocationMessage('')

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.customerId
      delete nextErrors.customerName
      delete nextErrors.customerMobile
      delete nextErrors.customerEmail
      delete nextErrors.customerCompany
      return nextErrors
    })
    setIsCustomerModalOpen(false)
  }

  const handleContactSelect = (contact) => {
    setFormData((currentValue) => ({
      ...currentValue,
      contactPerson: contact.contactPerson || contact.name || contact.person || '',
      contactDesignation: contact.designation || contact.contactDesignation || '',
      contactEmail: contact.email || contact.contactEmail || '',
      contactPhone: contact.phone || contact.contactPhone || contact.mobile || '',
      contactMobile: contact.mobile || contact.contactMobile || contact.phone || '',
    }))
    setIsContactFormOpen(false)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.contactPerson
      delete nextErrors.contactPhone
      return nextErrors
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateAll()) {
      addNotification('error', 'Required Fields', 'Please complete all required fields.')
      return
    }

    setSaving(true)

    const result = await createSupportRequest({
      requestType: formData.requestType,
      title: formData.title.trim() || `${formData.requestType || 'Service Request'} - ${formData.customerName.trim()}`,
      description: formData.description.trim(),
      status: 'open',
      customerName: formData.customerName.trim(),
      customerEmail: formData.customerEmail.trim(),
      customerPhone: formData.customerPhone.trim(),
      customerMobile: formData.customerMobile.trim(),
      customerCompany: formData.customerCompany.trim(),
      state: formData.state.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      zipCode: formData.zipCode.trim(),
      contactPerson: formData.contactPerson.trim(),
      contactDesignation: formData.contactDesignation.trim(),
      contactEmail: formData.contactEmail.trim(),
      contactPhone: formData.contactPhone.trim(),
      contactMobile: formData.contactMobile.trim(),
      ownerId: formData.ownerId,
      ownerName: formData.ownerName,
      attachmentNames: selectedFiles.map((file) => file.name),
      notes: formData.notes.trim(),
      locationName: formData.locationName.trim(),
      country: formData.country.trim(),
      latitude: formData.latitude.trim(),
      longitude: formData.longitude.trim(),
      locationAccuracy: formData.locationAccuracy.trim(),
      locationCapturedAt: formData.locationCapturedAt,
      locationSource: formData.locationSource,
      addedByName: user?.name || '',
    })

    setSaving(false)

    if (!result.success) {
      addNotification('error', 'Save Failed', result.message || 'Unable to submit support request.')
      return
    }

    addNotification('success', 'Support Request Created', 'Your support request was submitted successfully.')

    if (panelMode) {
      onSuccess?.()
      onClose?.()
      return
    }

    navigate(backPath)
  }

  const handleCancel = () => {
    if (panelMode) {
      onClose?.()
      return
    }

    navigate(backPath)
  }

  return (
    <div className={`sr-new-page ${panelMode ? 'sr-new-page--panel' : ''}`}>
      <div className="sr-new-shell">
        <form className="sr-new-card sr-new-card--wizard" onSubmit={handleSubmit}>
          <div className="sr-new-header">
            <div>
              <h1>Add Service Request</h1>
              <p>Create the SR with customer, location, and contact details.</p>
            </div>

            <div className="sr-new-header-actions">
              {currentStep < STEP_CONFIG.length - 1 ? (
                <button
                  type="button"
                  className="sr-new-btn sr-new-btn--primary"
                  onClick={handleNext}
                >
                  <span>Next</span>
                  <FiArrowRight />
                </button>
              ) : (
                <button
                  type="submit"
                  className="sr-new-btn sr-new-btn--primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Create SR'}
                </button>
              )}

              <button
                type="button"
                className="sr-new-btn sr-new-btn--cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="sr-new-steps" aria-label="Support request steps">
            {STEP_CONFIG.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.number} className={`sr-new-step ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-complete' : ''}`}>
                  <div className="sr-new-step-index">{step.number}</div>
                  <div className="sr-new-step-copy">{step.title}</div>
                </div>
              )
            })}
          </div>

          <div className="sr-new-panel">
            {validationSummary.length > 0 ? (
              <div className="sr-validation-summary" role="alert">
                <strong>{validationSummary.length} error(s) found, please check and proceed.</strong>
                <ol>
                  {validationSummary.map((entry) => (
                    <li key={entry.key}>{entry.label}: {entry.message}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {currentStep === 0 ? (
              <div className="sr-new-form-grid">
                <label className="sr-new-field sr-new-field--full">
                  <span>{requiredLabel('Customer Name')}</span>
                  <div className={`sr-new-customer-search ${errors.customerName ? 'sr-new-customer-search--error' : ''}`}>
                    <input
                      type="text"
                      readOnly
                      value={selectedCustomerSummary}
                      placeholder="Search in Customer list"
                    />
                    <button type="button" className="sr-new-customer-search-btn" onClick={() => setIsCustomerModalOpen(true)}>
                      <FiSearch />
                    </button>
                  </div>
                  {errors.customerName ? <small>{errors.customerName}</small> : null}
                </label>

                <SearchableRequestTypeField
                  value={formData.requestType}
                  options={SUPPORT_REQUEST_TYPE_OPTIONS}
                  error={errors.requestType}
                  onChange={(nextValue) => handleChange('requestType', nextValue)}
                />

                <label className="sr-new-field">
                  <span>Customer No.</span>
                  <input type="text" value={formData.customerNumber} readOnly />
                </label>

                <label className={`sr-new-field ${errors.customerEmail ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Email')}</span>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(event) => handleChange('customerEmail', event.target.value)}
                  />
                  {errors.customerEmail ? <small>{errors.customerEmail}</small> : null}
                </label>

                <label className="sr-new-field">
                  <span>Phone</span>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(event) => handleChange('customerPhone', event.target.value)}
                  />
                </label>

                <label className={`sr-new-field ${errors.customerMobile ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Mobile Number')}</span>
                  <input
                    type="text"
                    value={formData.customerMobile}
                    onChange={(event) => handleChange('customerMobile', event.target.value)}
                  />
                  {errors.customerMobile ? <small>{errors.customerMobile}</small> : null}
                </label>

                <label className={`sr-new-field sr-new-field--full ${errors.customerCompany ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Company Name')}</span>
                  <input
                    type="text"
                    value={formData.customerCompany}
                    onChange={(event) => handleChange('customerCompany', event.target.value)}
                  />
                  {errors.customerCompany ? <small>{errors.customerCompany}</small> : null}
                </label>
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="sr-new-form-grid">
                <label className="sr-new-field">
                  <span>SR Number</span>
                  <input type="text" value={srNumberPreview} readOnly />
                </label>

                <label className={`sr-new-field ${errors.ownerId ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Owner')}</span>
                  <select
                    value={formData.ownerId}
                    onChange={(event) => {
                      const selectedOwnerId = event.target.value
                      handleChange('ownerId', selectedOwnerId)
                      handleChange('ownerName', selectedOwnerId ? (user?.name || user?.username || '') : '')
                    }}
                  >
                    <option value="">Select Owner</option>
                    <option value={user?.id || ''}>{user?.name || user?.username || 'Current User'}</option>
                  </select>
                  {errors.ownerId ? <small>{errors.ownerId}</small> : null}
                </label>

                <label className="sr-new-field sr-new-field--full">
                  <span>Title</span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => handleChange('title', event.target.value)}
                  />
                </label>

                <label className={`sr-new-field sr-new-field--full ${errors.description ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Description')}</span>
                  <textarea
                    rows="7"
                    value={formData.description}
                    onChange={(event) => handleChange('description', event.target.value)}
                  />
                  {errors.description ? <small>{errors.description}</small> : null}
                </label>

                <label className="sr-new-field sr-new-field--full">
                  <span>Internal Notes</span>
                  <textarea
                    rows="4"
                    value={formData.notes}
                    onChange={(event) => handleChange('notes', event.target.value)}
                  />
                </label>

                <div className="sr-new-field sr-new-field--full">
                  <span>File Attachments</span>
                  <div className="sr-new-upload-row">
                    <input
                      type="text"
                      readOnly
                      value={attachmentSummary}
                      placeholder="No file selected"
                    />
                    <button
                      type="button"
                      className="sr-new-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-new-file-input"
                    onChange={handleFileSelection}
                  />
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="sr-location-step">
                <div className="sr-location-customer-bar">
                  <FiInfo />
                  <span>
                    {customerLocations.length > 0
                      ? `${customerLocations.length} location${customerLocations.length === 1 ? '' : 's'} available in Customer`
                      : 'No locations available in Customer'}
                  </span>
                </div>

                <div className="sr-location-picker-box">
                  {customerLocations.length > 0 ? (
                    <div className="sr-location-customer-list">
                      {customerLocations.map((customerLocation) => (
                        <button
                          key={customerLocation.id}
                          type="button"
                          className="sr-location-customer-item"
                          onClick={() => handleUseCustomerLocation(customerLocation)}
                        >
                          <strong>{customerLocation.locationName}</strong>
                          <span>{customerLocation.address || compactAddress(customerLocation.city, customerLocation.state, customerLocation.country) || '-'}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="sr-location-empty-picker">
                      <button
                        type="button"
                        className="sr-location-add-btn"
                        onClick={handleOpenLocationEditor}
                      >
                        <FiPlus />
                        <span>Add New Location</span>
                      </button>
                    </div>
                  )}

                  {customerLocations.length > 0 ? (
                    <button
                      type="button"
                      className="sr-location-add-btn sr-location-add-btn--inline"
                      onClick={handleOpenLocationEditor}
                    >
                      <FiPlus />
                      <span>Add New Location</span>
                    </button>
                  ) : null}
                </div>

                {hasSelectedLocation && !isLocationEditorOpen ? (
                  <div className="sr-location-selected-card">
                    <div>
                      <strong>{formData.locationName || 'Selected Location'}</strong>
                      <span>{formData.address || compactAddress(formData.city, formData.state, formData.country) || coordinateSummary}</span>
                    </div>
                    <button type="button" onClick={handleOpenLocationEditor}>Edit</button>
                  </div>
                ) : null}

                {isLocationEditorOpen ? (
                  <div className="sr-location-layout">
                    <div className="sr-location-map-panel">
                      <div className="sr-location-search">
                        <input
                          type="text"
                          value={locationSearchTerm}
                          onChange={(event) => setLocationSearchTerm(event.target.value)}
                          onKeyDown={handleLocationSearchKeyDown}
                          placeholder="Search location"
                        />
                        <button
                          type="button"
                          className="sr-location-icon-btn"
                          onClick={handleLocationSearch}
                          disabled={locationBusy}
                          aria-label="Search location"
                        >
                          <FiSearch />
                        </button>
                        <button
                          type="button"
                          className={`sr-location-current-btn ${isLiveLocationActive ? 'sr-location-current-btn--active' : ''}`}
                          onClick={handleUseCurrentLocation}
                          disabled={locationBusy}
                        >
                          <FiNavigation />
                          <span>{isLiveLocationActive ? 'Live GPS' : 'Current'}</span>
                        </button>
                      </div>

                      <div className={`sr-location-map ${hasMapCoordinates ? 'sr-location-map--selected' : ''}`}>
                        {hasMapCoordinates ? (
                          <>
                            <iframe
                              title="Selected service location map"
                              className="sr-location-map-embed"
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.latitude)},${encodeURIComponent(formData.longitude)}&z=15&output=embed`}
                              loading="lazy"
                            />
                            <div className="sr-location-map-controls" aria-hidden="true">
                              <span>+</span>
                              <span>-</span>
                            </div>
                            <div className="sr-location-map-marker" aria-hidden="true">
                              <FiMapPin />
                            </div>
                            <div className="sr-location-map-caption">
                              <strong>{formData.locationName || (isLiveLocationActive ? 'Live GPS location' : 'Selected location')}</strong>
                              <span>{coordinateSummary}</span>
                            </div>
                          </>
                        ) : (
                          <div className="sr-location-empty-map">
                            <FiMapPin />
                            <span>Search or use current location</span>
                          </div>
                        )}
                      </div>

                      <div className="sr-location-status">
                        <span>{locationBusy ? 'Working...' : (locationMessage || 'Ready')}</span>
                        {coordinateSummary ? <strong>{coordinateSummary}</strong> : null}
                      </div>
                    </div>

                    <div className="sr-location-form-panel">
                      <div className="sr-new-form-grid sr-location-fields">
                        <label className={`sr-new-field ${errors.locationName ? 'sr-new-field--error' : ''}`}>
                          <span>{requiredLabel('Location Name')}</span>
                          <input
                            type="text"
                            value={formData.locationName}
                            onChange={(event) => handleChange('locationName', event.target.value)}
                          />
                          {errors.locationName ? <small>{errors.locationName}</small> : null}
                        </label>

                        <label className={`sr-new-field ${errors.country ? 'sr-new-field--error' : ''}`}>
                          <span>{requiredLabel('Country')}</span>
                          <select
                            value={formData.country}
                            onChange={(event) => handleChange('country', event.target.value)}
                          >
                            <option value="">Select Country</option>
                            {countryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          {errors.country ? <small>{errors.country}</small> : null}
                        </label>

                        <label className={`sr-new-field ${errors.state ? 'sr-new-field--error' : ''}`}>
                          <span>{requiredLabel('State')}</span>
                          <select
                            value={formData.state}
                            onChange={(event) => handleChange('state', event.target.value)}
                          >
                            <option value="">Select State</option>
                            {stateOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          {errors.state ? <small>{errors.state}</small> : null}
                        </label>

                        <label className={`sr-new-field ${errors.city ? 'sr-new-field--error' : ''}`}>
                          <span>{requiredLabel('City')}</span>
                          <select
                            value={formData.city}
                            onChange={(event) => handleChange('city', event.target.value)}
                          >
                            <option value="">Select City</option>
                            {cityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          {errors.city ? <small>{errors.city}</small> : null}
                        </label>

                        <label className="sr-new-field">
                          <span>Pincode</span>
                          <input
                            type="text"
                            value={formData.zipCode}
                            onChange={(event) => handleChange('zipCode', event.target.value)}
                          />
                        </label>

                        <label className="sr-new-field">
                          <span>Latitude</span>
                          <input
                            type="text"
                            value={formData.latitude}
                            onChange={(event) => handleChange('latitude', event.target.value)}
                          />
                        </label>

                        <label className="sr-new-field">
                          <span>Longitude</span>
                          <input
                            type="text"
                            value={formData.longitude}
                            onChange={(event) => handleChange('longitude', event.target.value)}
                          />
                        </label>

                        <label className={`sr-new-field sr-new-field--full ${errors.address ? 'sr-new-field--error' : ''}`}>
                          <span>{requiredLabel('Address')}</span>
                          <textarea
                            rows="5"
                            value={formData.address}
                            onChange={(event) => handleChange('address', event.target.value)}
                          />
                          {errors.address ? <small>{errors.address}</small> : null}
                        </label>

                        <label className="sr-new-field">
                          <span>Contact Name</span>
                          <input type="text" value={formData.contactPerson} onChange={(event) => handleChange('contactPerson', event.target.value)} />
                        </label>

                        <label className="sr-new-field">
                          <span>Contact Phone</span>
                          <input type="text" value={formData.contactPhone} onChange={(event) => handleChange('contactPhone', event.target.value)} />
                        </label>

                        <label className="sr-new-field">
                          <span>Contact Email</span>
                          <input type="email" value={formData.contactEmail} onChange={(event) => handleChange('contactEmail', event.target.value)} />
                        </label>

                        <label className="sr-new-field sr-new-field--full">
                          <span>Note</span>
                          <textarea rows="3" value={formData.notes} onChange={(event) => handleChange('notes', event.target.value)} />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="sr-contact-step">
                {customerContacts.length > 0 ? (
                  <div className="sr-contact-card-grid">
                    {customerContacts.map((contact, index) => (
                      <button
                        key={contact.id || `${contact.email || contact.phone || index}`}
                        type="button"
                        className={`sr-contact-card ${formData.contactPerson === (contact.contactPerson || contact.name || contact.person || '') ? 'sr-contact-card--selected' : ''}`}
                        onClick={() => handleContactSelect(contact)}
                      >
                        <strong>{contact.contactPerson || contact.name || contact.person || `Contact ${index + 1}`}</strong>
                        <span>{contact.designation || contact.contactDesignation || '-'}</span>
                        <span>{contact.email || contact.contactEmail || '-'}</span>
                        <span>{contact.phone || contact.contactPhone || contact.mobile || '-'}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="sr-contact-add-btn"
                  onClick={() => setIsContactFormOpen((currentValue) => !currentValue)}
                >
                  <FiPlus />
                  <span>Add New Contact</span>
                </button>

                {isContactFormOpen || customerContacts.length === 0 ? (
                  <div className="sr-new-form-grid">
                <label className={`sr-new-field ${errors.contactPerson ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Contact Person')}</span>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(event) => handleChange('contactPerson', event.target.value)}
                  />
                  {errors.contactPerson ? <small>{errors.contactPerson}</small> : null}
                </label>

                <label className="sr-new-field">
                  <span>Designation</span>
                  <input
                    type="text"
                    value={formData.contactDesignation}
                    onChange={(event) => handleChange('contactDesignation', event.target.value)}
                  />
                </label>

                <label className="sr-new-field">
                  <span>Contact Email</span>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(event) => handleChange('contactEmail', event.target.value)}
                  />
                </label>

                <label className={`sr-new-field ${errors.contactPhone ? 'sr-new-field--error' : ''}`}>
                  <span>{requiredLabel('Contact Phone')}</span>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(event) => handleChange('contactPhone', event.target.value)}
                  />
                  {errors.contactPhone ? <small>{errors.contactPhone}</small> : null}
                </label>

                <label className="sr-new-field">
                  <span>Contact Mobile</span>
                  <input
                    type="text"
                    value={formData.contactMobile}
                    onChange={(event) => handleChange('contactMobile', event.target.value)}
                  />
                </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

        </form>
      </div>

      <CustomerPickerModal
        isOpen={isCustomerModalOpen}
        customerRows={customerRows}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  )
}

export default AddSupportRequest
