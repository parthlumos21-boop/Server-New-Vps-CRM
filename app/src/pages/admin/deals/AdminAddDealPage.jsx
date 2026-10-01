import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FaArrowLeft, FaArrowRight, FaUserPlus } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { ACCOUNT_OWNER_OPTIONS } from '../../../features/accounts/config/accountDropdownOptions'
import { DEAL_CITY_OPTIONS } from '../../../features/adminDeals/config/dealCityOptions'
import {
  CUSTOMER_QUOTATION_STATUS_OPTIONS,
  DEAL_LIFECYCLE_STATUS_OPTIONS,
  normalizeDealCity,
  normalizeOptionalNumberInput,
} from '../../../features/adminDeals/config/dealUtils'
import { customerService } from '../../../services/customerService'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { formatCurrency } from '../../../utils/helpers'
import './AdminAddDealPage.css'

const steps = [
  { key: 'customer', label: 'Customer' },
  { key: 'customer-details', label: 'Customer Details' },
  { key: 'deal-details', label: 'Deal Details' },
  { key: 'contacts', label: 'Contacts' },
]

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const DEAL_SOURCE_OPTIONS = ['LUMOS', 'SWATI', 'PURCHASE ENQUIRY', 'TENDER ENQUIRY']

const DEAL_VALUE_CURRENCIES = ['INR', 'USD', 'AED', 'NZ$', 'CAD', 'SEK', 'SGD', 'AUD', 'JPY', 'Euro', 'GBP', 'QAR', 'SAR', 'OMR']

const CUSTOMER_ORDER_STATUS_OPTIONS = DEAL_LIFECYCLE_STATUS_OPTIONS

const normalizeConvertedCity = (value) => {
  const normalizedCity = normalizeDealCity(value)
  if (normalizedCity === 'Ahmedabad') return 'Ahmedabad'
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'vadodara' || normalized === 'baroda') return 'Vadodara'
  return ''
}

const buildInitialFormData = () => {
  const todayDate = new Date().toISOString().slice(0, 10)
  
  return {
    dealDate: todayDate,
    dealName: '',
    description: '',
    poValue: '',
    dealCoOwners: '',
    value: '',
    valueCurrency: 'INR',
    dealScore: '',
    consultantName: '',
    customerRefNo: '',
    projectName: '',
    customerQuotationStatus: '',
    dealType: '',
    dealOwner: '',
    dealSource: '',
    dealSubsource: '',
    address: '',
    expectedClosureDate: todayDate,
    probability: '1',
    productCategory: '',
    customerRefDate: todayDate,
    gstin: '',
    jobNo: '',
    customerOrderStatus: '',
    status: 'new',
    stage: '',
    closeDate: todayDate,
    city: '',
    contactPerson: '',
    contactPhone: '',
    contactMobile: '',
    contactEmail: '',
    contactDesignation: '',
  }
}

const getPrimaryContact = (customer) => customer?.contacts?.[0] || {}

const CONTACT_PREFIX_OPTIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.']

const buildContactCardId = () =>
  `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const buildContactCard = (contact = {}, options = {}) => ({
  id: buildContactCardId(),
  prefix: contact.prefix || 'Mr.',
  name: contact.contactPerson || contact.name || '',
  designation: contact.designation || '',
  phone: contact.mobile || contact.phone || '',
  email: contact.email || '',
  selected: options.selected !== undefined ? !!options.selected : true,
  isPrimary: !!options.isPrimary,
})

const buildDealContactsForCustomer = (customer) => {
  const sourceContacts = Array.isArray(customer?.contacts) ? customer.contacts : []
  if (sourceContacts.length === 0) {
    return [buildContactCard({}, { selected: true, isPrimary: true })]
  }
  return sourceContacts.map((contact, index) => buildContactCard(contact, {
    selected: index === 0,
    isPrimary: index === 0,
  }))
}

const collectSelectedDealContacts = (dealContacts) =>
  dealContacts
    .filter((entry) => entry.selected && (entry.name.trim() || entry.phone.trim() || entry.email.trim()))
    .map((entry) => ({
      prefix: entry.prefix,
      name: entry.name.trim(),
      designation: entry.designation.trim(),
      phone: entry.phone.trim(),
      email: entry.email.trim(),
      isPrimary: !!entry.isPrimary,
    }))

const buildConvertedCustomerFallback = (convertedAccount) => {
  if (!convertedAccount) {
    return null
  }

  return {
    id: '',
    customerNumber: convertedAccount.accountNumber || '',
    customerName: convertedAccount.customerName || convertedAccount.accountName || convertedAccount.name || '',
    customerOwner: convertedAccount.accountOwner || '',
    customerOwnerDisplay: convertedAccount.accountOwnerDisplay || getCrmOwnerDisplay(convertedAccount.accountOwner || ''),
    customerCategory: convertedAccount.accountCategory || '',
    customerStatus: convertedAccount.customerStatus || '',
    address: convertedAccount.address || '',
    contacts: [
      {
        contactPerson: convertedAccount.contactPerson || '',
        phone: convertedAccount.contactPhone || '',
        mobile: convertedAccount.contactMobile || '',
        email: convertedAccount.contactEmail || '',
        designation: convertedAccount.contactDesignation || '',
      },
    ],
  }
}

const buildCustomerFromAccount = (account = {}) => ({
  id: `account-${account.id || account.accountId || account.accountNumber || account.accountNo || account.name}`,
  sourceType: 'account',
  accountId: account.id || account.accountId || '',
  customerNumber: account.customerNumber || account.customerRefNo || account.accountNumber || account.accountNo || '',
  customerName: account.customerName || account.accountName || account.name || account.company || '',
  customerOwner: account.accountOwner || account.ownerName || account.assignedUserName || '',
  customerOwnerDisplay: account.accountOwnerDisplay || getCrmOwnerDisplay(account.accountOwner || account.ownerName || ''),
  customerCategory: account.customerCategory || account.accountCategory || account.category || '',
  customerStatus: account.customerStatus || account.accountStatus || account.status || '',
  address: account.address || '',
  gstin: account.gstin || '',
  consultantName: account.consultantName || '',
  jobNo: account.jobNo || '',
  projectName: account.projectName || '',
  contacts: [
    {
      contactPerson: account.contactPerson || account.contactName || '',
      phone: account.contactPhone || account.phone || '',
      mobile: account.contactMobile || account.mobile || account.contactPhone || account.phone || '',
      email: account.contactEmail || account.email || '',
      designation: account.contactDesignation || account.designation || '',
    },
  ],
})

const buildDealPayload = ({ convertedAccount, resolvedCustomer, formData, user, dealContacts = [] }) => {
  const resolvedAccountId = convertedAccount?.id || convertedAccount?.accountId || resolvedCustomer?.accountId || ''
  const resolvedAccountName =
    convertedAccount?.accountName
    || convertedAccount?.name
    || resolvedCustomer?.customerName
    || ''
  const resolvedAccountNumber =
    convertedAccount?.accountNumber
    || resolvedCustomer?.accountNumber
    || resolvedCustomer?.customerNumber
    || ''
  const resolvedCustomerName =
    resolvedCustomer?.customerName
    || convertedAccount?.customerName
    || resolvedAccountName
    || ''
  const resolvedCustomerNumber =
    resolvedCustomer?.customerNumber
    || convertedAccount?.accountNumber
    || ''
  const resolvedDealOwner =
    convertedAccount?.accountOwner
    || resolvedCustomer?.customerOwner
    || user?.name
    || ''
  const resolvedCompanyName =
    convertedAccount?.company
    || convertedAccount?.accountName
    || convertedAccount?.name
    || resolvedCustomer?.customerName
    || ''
  const resolvedCompanyProfile =
    convertedAccount?.companyProfile
    || convertedAccount?.company
    || convertedAccount?.accountName
    || convertedAccount?.name
    || convertedAccount?.accountCategory
    || resolvedCustomer?.customerCategory
    || ''

  return {
    name: formData.dealName.trim(),
    dealDate: formData.dealDate,
    value: normalizeOptionalNumberInput(formData.value),
    valueCurrency: formData.valueCurrency || 'INR',
    status: formData.status,
    stage: formData.stage.trim(),
    closeDate: formData.expectedClosureDate || formData.closeDate,
    expectedClosureDate: formData.expectedClosureDate,
    projectName: formData.projectName.trim(),
    consultantName: formData.consultantName.trim(),
    jobNo: formData.jobNo.trim(),
    city: formData.city,
    description: formData.description.trim(),
    dealOwner: formData.dealOwner.trim() || resolvedDealOwner,
    ownerName: resolvedDealOwner,
    assignedUserId: convertedAccount?.assignedUserId || user?.id || '',
    assignedUserName: convertedAccount?.assignedUserName || resolvedDealOwner,
    dealType: formData.dealType.trim() || resolvedCustomer?.customerCategory || convertedAccount?.accountCategory || '',
    dealCoOwners: formData.dealCoOwners.trim(),
    quotationCustomerStatus: formData.customerQuotationStatus.trim() || resolvedCustomer?.customerStatus || convertedAccount?.customerStatus || '',
    orderCustomerStatus: formData.customerOrderStatus.trim(),
    poValue: normalizeOptionalNumberInput(formData.poValue),
    dealScore: normalizeOptionalNumberInput(formData.dealScore),
    probability: normalizeOptionalNumberInput(formData.probability),
    productCategory: formData.productCategory.trim(),
    customerRefNo: formData.customerRefNo.trim(),
    customerRefDate: formData.customerRefDate,
    gstin: formData.gstin.trim(),
    dealSource: formData.dealSource.trim(),
    source: formData.dealSource.trim(),
    dealSubsource: formData.dealSubsource.trim(),
    subsource: formData.dealSubsource.trim(),
    accountId: resolvedAccountId,
    convertedFromAccount: Boolean(convertedAccount),
    conversionSource: convertedAccount ? 'search-account' : '',
    accountName: resolvedAccountName,
    accountNumber: resolvedAccountNumber,
    companyName: resolvedCompanyName,
    companyProfile: resolvedCompanyProfile,
    companyLogo: convertedAccount?.companyLogo || '',
    customerId: resolvedCustomer?.id || '',
    customerName: resolvedCustomerName,
    customerNumber: resolvedCustomerNumber,
    customerOwner: resolvedCustomer?.customerOwner || resolvedDealOwner,
    customerCategory: resolvedCustomer?.customerCategory || convertedAccount?.accountCategory || '',
    address: formData.address.trim() || resolvedCustomer?.address || convertedAccount?.address || '',
    contactPerson: formData.contactPerson.trim(),
    contactPhone: formData.contactPhone.trim(),
    contactMobile: formData.contactMobile.trim(),
    contactEmail: formData.contactEmail.trim(),
    contactDesignation: formData.contactDesignation.trim(),
    ...(() => {
      const selectedContacts = collectSelectedDealContacts(dealContacts)
      if (selectedContacts.length === 0) {
        return { contacts: [] }
      }
      const primary = selectedContacts.find((entry) => entry.isPrimary) || selectedContacts[0]
      return {
        contacts: selectedContacts,
        contactPerson: primary.name || formData.contactPerson.trim(),
        contactPhone: primary.phone || formData.contactPhone.trim(),
        contactMobile: primary.phone || formData.contactMobile.trim(),
        contactEmail: primary.email || formData.contactEmail.trim(),
        contactDesignation: primary.designation || formData.contactDesignation.trim(),
      }
    })(),
  }
}

const AdminAddDealPage = ({
  basePath = '/admin/deals',
  customerBasePath = '/admin/customers',
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accounts, createDeal, addNotification } = useData()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [formData, setFormData] = useState(buildInitialFormData)
  const [dealContacts, setDealContacts] = useState(() => [buildContactCard({}, { selected: true, isPrimary: true })])
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const convertedAccountIdFromQuery = searchParams.get('accountId') || ''
  const conversionSource = searchParams.get('conversion') || ''
  const convertedAccountFromState = location.state?.convertedAccount || null
  const normalizedBasePath = String(basePath || '/admin/deals').replace(/\/+$/, '')
  const normalizedCustomerBasePath = String(customerBasePath || '/admin/customers').replace(/\/+$/, '')
  const viewDealRoute = `${normalizedBasePath}/view`
  const convertedAccount = useMemo(() => {
    if (convertedAccountFromState?.id) {
      return convertedAccountFromState
    }

    if (conversionSource !== 'account' || !convertedAccountIdFromQuery) {
      return null
    }

    return accounts.find((entry) => String(entry.id) === String(convertedAccountIdFromQuery)) || null
  }, [accounts, conversionSource, convertedAccountFromState, convertedAccountIdFromQuery])
  const targetDealRoute = searchParams.get('returnTo') || convertedAccount?.targetDealRoute || viewDealRoute

  const customerIdFromQuery = searchParams.get('customerId') || ''
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

  const customerOptions = useMemo(() => {
    const customerRecords = customers.map((customer) => ({
      ...customer,
      sourceType: customer.sourceType || 'customer',
    }))
    const customerKeys = new Set(customerRecords.flatMap((customer) => [
      String(customer.id || '').toLowerCase(),
      String(customer.customerName || '').trim().toLowerCase(),
      String(customer.customerNumber || '').trim().toLowerCase(),
    ].filter(Boolean)))
    const accountRecords = accounts
      .map(buildCustomerFromAccount)
      .filter((customer) => customer.customerName)
      .filter((customer) => ![
        String(customer.accountId || '').toLowerCase(),
        String(customer.customerName || '').trim().toLowerCase(),
        String(customer.customerNumber || '').trim().toLowerCase(),
      ].some((key) => customerKeys.has(key)))

    return [...customerRecords, ...accountRecords]
  }, [accounts, customers])

  const selectedCustomer = useMemo(
    () => customerOptions.find((customer) => customer.id === selectedCustomerId) || null,
    [customerOptions, selectedCustomerId]
  )
  const convertedCustomerFallback = useMemo(
    () => buildConvertedCustomerFallback(convertedAccount),
    [convertedAccount]
  )
  const activeCustomer = selectedCustomer || convertedCustomerFallback

  const filteredCustomers = useMemo(() => {
    const searchValue = customerSearch.trim().toLowerCase()

    if (!searchValue) {
      return []
    }

    return customerOptions
      .map((customer) => {
        const primaryContact = getPrimaryContact(customer)
        const searchableFields = [
          customer.customerName,
          customer.customerNumber,
          customer.customerOwner,
          customer.customerCategory,
          customer.customerStatus,
          customer.address,
          primaryContact.email,
          primaryContact.mobile,
          primaryContact.phone,
          primaryContact.contactPerson,
        ].map((field) => String(field || '').toLowerCase())
        const matched = searchableFields.some((field) => field.includes(searchValue))
        const name = String(customer.customerName || '').toLowerCase()
        const number = String(customer.customerNumber || '').toLowerCase()
        const score = name === searchValue
          ? 0
          : name.startsWith(searchValue)
            ? 1
            : number.startsWith(searchValue)
              ? 2
              : 3

        return { customer, matched, score }
      })
      .filter((entry) => entry.matched)
      .sort((left, right) => left.score - right.score || String(left.customer.customerName || '').localeCompare(String(right.customer.customerName || '')))
      .map((entry) => entry.customer)
      .slice(0, 12)
  }, [customerOptions, customerSearch])

  useEffect(() => {
    if (!customerIdFromQuery) {
      return
    }

    const nextCustomer = customers.find((customer) => customer.id === customerIdFromQuery)

    if (!nextCustomer) {
      return
    }

    setSelectedCustomerId(nextCustomer.id)
    setCustomerSearch(nextCustomer.customerName)
    const primaryContact = getPrimaryContact(nextCustomer)
    setFormData((currentValue) => ({
      ...currentValue,
      contactPerson: primaryContact.contactPerson || '',
      contactPhone: primaryContact.phone || '',
      contactMobile: primaryContact.mobile || '',
      contactEmail: primaryContact.email || '',
      contactDesignation: primaryContact.designation || '',
    }))
  }, [customerIdFromQuery, customers])

  useEffect(() => {
    if (!convertedAccount) {
      return
    }

    const linkedCustomerId = convertedAccount.customerId || ''
    const matchedCustomer = linkedCustomerId
      ? customers.find((customer) => String(customer.id) === String(linkedCustomerId))
      : customers.find((customer) => String(customer.customerName || '').trim().toLowerCase() === String(convertedAccount.customerName || convertedAccount.name || '').trim().toLowerCase())

    if (matchedCustomer) {
      setSelectedCustomerId(matchedCustomer.id)
      setCustomerSearch(matchedCustomer.customerName)
    } else if (!selectedCustomerId) {
      setCustomerSearch(convertedAccount.customerName || convertedAccount.name || '')
    }

    const primaryContact = matchedCustomer ? getPrimaryContact(matchedCustomer) : {}
    const normalizedCity = normalizeConvertedCity(convertedAccount.city)

    setFormData((currentValue) => ({
      ...currentValue,
      dealName: currentValue.dealName || convertedAccount.projectName || `${convertedAccount.name || 'Account'} Deal`,
      projectName: currentValue.projectName || convertedAccount.projectName || '',
      consultantName: currentValue.consultantName || convertedAccount.consultantName || '',
      jobNo: currentValue.jobNo || convertedAccount.jobNo || '',
      city: currentValue.city || normalizedCity,
      description: currentValue.description || convertedAccount.description || `Converted from account ${convertedAccount.accountNumber || convertedAccount.id || ''}`.trim(),
      contactPerson: currentValue.contactPerson || primaryContact.contactPerson || convertedAccount.contactPerson || '',
      contactPhone: currentValue.contactPhone || primaryContact.phone || convertedAccount.contactPhone || '',
      contactMobile: currentValue.contactMobile || primaryContact.mobile || convertedAccount.contactMobile || '',
      contactEmail: currentValue.contactEmail || primaryContact.email || convertedAccount.contactEmail || '',
      contactDesignation: currentValue.contactDesignation || primaryContact.designation || convertedAccount.contactDesignation || '',
    }))
  }, [convertedAccount, customers, selectedCustomerId])

  const handleSelectCustomer = (customer) => {
    const primaryContact = getPrimaryContact(customer)

    setSelectedCustomerId(customer.id)
    setCustomerSearch(customer.customerName)
    setErrors((currentValue) => {
      const nextErrors = { ...currentValue }
      delete nextErrors.customer
      return nextErrors
    })
    setFormData((currentValue) => ({
      ...currentValue,
      contactPerson: primaryContact.contactPerson || '',
      contactPhone: primaryContact.phone || '',
      contactMobile: primaryContact.mobile || '',
      contactEmail: primaryContact.email || '',
      contactDesignation: primaryContact.designation || '',
      address: currentValue.address || customer.address || '',
      gstin: currentValue.gstin || customer.gstin || '',
      consultantName: currentValue.consultantName || customer.consultantName || '',
      jobNo: currentValue.jobNo || customer.jobNo || '',
      projectName: currentValue.projectName || customer.projectName || '',
      dealType: currentValue.dealType || customer.customerCategory || '',
      productCategory: currentValue.productCategory || customer.customerCategory || '',
    }))
  }

  const handleFormChange = (name, value) => {
    setFormData((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))

    setErrors((currentValue) => {
      if (!currentValue[name]) {
        return currentValue
      }

      const nextErrors = { ...currentValue }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const activeCustomerKey = activeCustomer
    ? activeCustomer.id || activeCustomer.customerNumber || activeCustomer.customerName || ''
    : ''

  useEffect(() => {
    setDealContacts(buildDealContactsForCustomer(activeCustomer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustomerKey])

  const handleContactFieldChange = (id, field, value) => {
    setDealContacts((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    )
    setErrors((current) => {
      if (!current.contacts) return current
      const next = { ...current }
      delete next.contacts
      return next
    })
  }

  const handleToggleContactSelected = (id) => {
    setDealContacts((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry
        const nextSelected = !entry.selected
        return {
          ...entry,
          selected: nextSelected,
          isPrimary: nextSelected ? entry.isPrimary : false,
        }
      })
    )
    setErrors((current) => {
      if (!current.contacts) return current
      const next = { ...current }
      delete next.contacts
      return next
    })
  }

  const handleSetPrimaryContact = (id) => {
    setDealContacts((current) =>
      current.map((entry) => ({
        ...entry,
        selected: entry.id === id ? true : entry.selected,
        isPrimary: entry.id === id,
      }))
    )
    setErrors((current) => {
      if (!current.contacts) return current
      const next = { ...current }
      delete next.contacts
      return next
    })
  }

  const handleAddContact = () => {
    setDealContacts((current) => {
      const hasPrimary = current.some((entry) => entry.selected && entry.isPrimary)
      return [
        ...current,
        buildContactCard({}, { selected: true, isPrimary: !hasPrimary }),
      ]
    })
  }

  const validateCurrentStep = () => {
    const nextErrors = {}

    if (currentStep === 0 && !selectedCustomerId && !convertedCustomerFallback) {
      nextErrors.customer = 'Please select a customer before continuing.'
    }

    if (currentStep === 2) {
      const normalizedProbability = normalizeOptionalNumberInput(formData.probability)

      if (!formData.dealName.trim()) nextErrors.dealName = 'Please provide Deal Name.'
      if (!formData.description.trim()) nextErrors.description = 'Please provide Description.'
      if (!formData.dealType.trim()) nextErrors.dealType = 'Please select Deal Type.'
      if (!formData.dealSource.trim()) nextErrors.dealSource = 'Please select Deal Source.'
      if (!formData.dealOwner.trim()) nextErrors.dealOwner = 'Please select Deal Owner.'
      if (!formData.expectedClosureDate) {
        nextErrors.expectedClosureDate = 'Please provide Expected Closure Date.'
      } else if (formData.dealDate && formData.expectedClosureDate < formData.dealDate) {
        nextErrors.expectedClosureDate = 'Expected Closure Date should not be older than Deal Date.'
      }
      if (normalizeOptionalNumberInput(formData.value) === null) nextErrors.value = 'Deal Value is required.'
      if (normalizedProbability !== null && (normalizedProbability < 1 || normalizedProbability > 100)) {
        nextErrors.probability = 'Probability must be between 1 and 100.'
      }
      if (!formData.status) nextErrors.status = 'Status is required.'
    }

    if (currentStep === 3) {
      const selectedContacts = collectSelectedDealContacts(dealContacts)
      if (selectedContacts.length === 0) {
        nextErrors.contacts = 'Select or add at least one contact for the deal.'
      } else {
        const primary = selectedContacts.find((entry) => entry.isPrimary)
        if (!primary) {
          nextErrors.contacts = 'Mark one selected contact as the Primary Deal Contact.'
        } else if (!primary.name) {
          nextErrors.contacts = 'The Primary Deal Contact needs a name.'
        } else if (!primary.phone && !primary.email) {
          nextErrors.contacts = 'Provide a phone or email for the Primary Deal Contact.'
        }
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const firstInvalid = document.querySelector('.admin-add-deal-input-error')
          if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' })
            if (typeof firstInvalid.focus === 'function') {
              firstInvalid.focus({ preventScroll: true })
            }
          }
        })
      }
      return
    }

    setCurrentStep((currentValue) => Math.min(currentValue + 1, steps.length - 1))
  }

  const handleBack = () => {
    if (currentStep === 0) {
      navigate(targetDealRoute)
      return
    }

    setCurrentStep((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleSave = async () => {
    const resolvedCustomer = activeCustomer

    if (!validateCurrentStep() || !resolvedCustomer) {
      return
    }

    setIsSaving(true)
    const result = await createDeal(buildDealPayload({
      convertedAccount,
      resolvedCustomer,
      formData,
      user,
      dealContacts,
    }))
    setIsSaving(false)

    if (result.success) {
      const createdDealNumber = result.data?.dealNumber || ''
      const successMessage = convertedAccount
        ? `Deal${createdDealNumber ? ` ${createdDealNumber}` : ''} created from converted account - now visible in View Deal and Search Deal.`
        : 'Deal created successfully. It is now linked with View Deal and Search Deal.'
      addNotification('success', 'Success', successMessage)
      navigate(targetDealRoute, {
        state: {
          quotationDealLookup: {
            dealNumber: result.data?.dealNumber || '',
            projectName: result.data?.name || result.data?.projectName || '',
            companyName: result.data?.accountName || result.data?.customerName || result.data?.companyName || '',
          },
        },
      })
      return
    }

    addNotification('error', 'Error', result.message)
  }

  const renderCustomerStep = () => (
    <div className="admin-add-deal-step-content">
      <div className="admin-add-deal-step-head">
        <h2>Select the Customer to add the new Deal:</h2>
        <button
          type="button"
          className="admin-add-deal-customer-button"
          onClick={() => navigate(`${normalizedCustomerBasePath}/add?returnTo=${encodeURIComponent(`${normalizedBasePath}/add`)}`)}
        >
          <FaUserPlus />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="admin-add-deal-note">
        <strong>Note:</strong> Search and select a customer. Add New Customer if not found in the list.
      </div>

      <div className="admin-add-deal-field-row admin-add-deal-field-row-centered">
        <label htmlFor="deal-customer-search" className="admin-add-deal-label">
          Customer
          <span className="admin-add-deal-required">*</span>
        </label>
        <div className="admin-add-deal-input-column">
          <input
            id="deal-customer-search"
            type="text"
            value={customerSearch}
            onChange={(event) => {
              setCustomerSearch(event.target.value)
              setSelectedCustomerId('')
            }}
            placeholder="Start typing the customer name"
            className={`admin-add-deal-input ${errors.customer ? 'admin-add-deal-input-error' : ''}`}
          />

          {filteredCustomers.length > 0 ? (
            <div className="admin-add-deal-customer-results">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={`admin-add-deal-customer-option ${selectedCustomerId === customer.id ? 'admin-add-deal-customer-option-active' : ''}`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <span className="admin-add-deal-customer-option-name">{customer.customerName}</span>
                  <span className="admin-add-deal-customer-option-meta">
                    <span className="admin-add-deal-customer-option-source">
                      {customer.sourceType === 'account' ? 'Account' : 'Customer'}
                    </span>
                    {customer.customerNumber || 'No number'} | {customer.customerOwnerDisplay || getCrmOwnerDisplay(customer.customerOwner) || 'No owner'}
                  </span>
                </button>
              ))}
            </div>
          ) : customerSearch.trim() ? (
            <div className="admin-add-deal-empty-results">No customers found for this search.</div>
          ) : null}

          {activeCustomer ? (
            <div className="admin-add-deal-selection-chip">
              Selected: <strong>{activeCustomer.customerName}</strong> ({activeCustomer.customerNumber || convertedAccount?.accountNumber || 'Account'})
            </div>
          ) : null}

          {errors.customer ? <div className="admin-add-deal-error">{errors.customer}</div> : null}
        </div>
      </div>
    </div>
  )

  const renderCustomerDetailsStep = () => {
    const leftFields = [
      { label: 'Customer Name', value: activeCustomer?.customerName || convertedAccount?.customerName || convertedAccount?.accountName || '' },
      { label: 'Customer Owner', value: activeCustomer?.customerOwnerDisplay || convertedAccount?.accountOwnerDisplay || getCrmOwnerDisplay(activeCustomer?.customerOwner || convertedAccount?.accountOwner || '') || '' },
    ]
    const rightFields = [
      { label: 'Customer Category', value: activeCustomer?.customerCategory || convertedAccount?.accountCategory || '' },
      { label: 'Customer Status', value: activeCustomer?.customerStatus || convertedAccount?.customerStatus || convertedAccount?.accountStatus || '' },
    ]
    const renderField = (field) => (
      <div key={field.label} className="admin-add-deal-detail-field">
        <label>{field.label}</label>
        <input
          type="text"
          value={field.value || ''}
          readOnly
          className="admin-add-deal-input admin-add-deal-input-readonly"
        />
      </div>
    )

    return (
      <div className="admin-add-deal-step-content">
        <h2>Customer Details</h2>
        <div className="admin-add-deal-detail-two-col">
          <div className="admin-add-deal-detail-col">{leftFields.map(renderField)}</div>
          <div className="admin-add-deal-detail-col">{rightFields.map(renderField)}</div>
        </div>
      </div>
    )
  }

  const renderDealDetailsStep = () => {
    const renderTextField = (id, label, valueKey, opts = {}) => (
      <div className="admin-add-deal-detail-field">
        <label htmlFor={id}>
          {label}{opts.required ? <span className="admin-add-deal-required">*</span> : null}
        </label>
        <div className="admin-add-deal-detail-field-input">
          <input
            id={id}
            type={opts.type || 'text'}
            value={formData[valueKey] || ''}
            onChange={(event) => handleFormChange(valueKey, event.target.value)}
            placeholder={opts.placeholder || ''}
            className={`admin-add-deal-input ${errors[valueKey] ? 'admin-add-deal-input-error' : ''}`}
          />
          {errors[valueKey] ? <div className="admin-add-deal-error">{errors[valueKey]}</div> : null}
        </div>
      </div>
    )
    const renderSelectField = (id, label, valueKey, options, opts = {}) => (
      <div className="admin-add-deal-detail-field">
        <label htmlFor={id}>
          {label}{opts.required ? <span className="admin-add-deal-required">*</span> : null}
        </label>
        <div className="admin-add-deal-detail-field-input">
          <select
            id={id}
            value={formData[valueKey] || ''}
            onChange={(event) => handleFormChange(valueKey, event.target.value)}
            className={`admin-add-deal-input ${errors[valueKey] ? 'admin-add-deal-input-error' : ''}`}
          >
            <option value="">{opts.placeholder || 'Select'}</option>
            {options.map((option) => {
              const normalizedOption = typeof option === 'string'
                ? { value: option, label: option }
                : option

              return (
                <option key={normalizedOption.value} value={normalizedOption.value}>
                  {normalizedOption.label}
                </option>
              )
            })}
          </select>
          {errors[valueKey] ? <div className="admin-add-deal-error">{errors[valueKey]}</div> : null}
        </div>
      </div>
    )
    const renderTextareaField = (id, label, valueKey, opts = {}) => (
      <div className="admin-add-deal-detail-field">
        <label htmlFor={id}>
          {label}{opts.required ? <span className="admin-add-deal-required">*</span> : null}
        </label>
        <div className="admin-add-deal-detail-field-input">
          <textarea
            id={id}
            rows={opts.rows || 3}
            value={formData[valueKey] || ''}
            onChange={(event) => handleFormChange(valueKey, event.target.value)}
            className={`admin-add-deal-input admin-add-deal-textarea ${errors[valueKey] ? 'admin-add-deal-input-error' : ''}`}
          />
          {errors[valueKey] ? <div className="admin-add-deal-error">{errors[valueKey]}</div> : null}
        </div>
      </div>
    )

    return (
      <div className="admin-add-deal-step-content">
        <h2>Deal Details</h2>
        <div className="admin-add-deal-detail-two-col">
          <div className="admin-add-deal-detail-col">
            {renderTextField('deal-date', 'Deal Date', 'dealDate', { type: 'date', required: true })}
            {renderTextField('deal-name', 'Deal Name', 'dealName', { required: true })}
            {renderTextareaField('deal-description', 'Description', 'description', { required: true })}
            {renderTextField('deal-po-value', 'PO Value', 'poValue', { type: 'number' })}
            {renderSelectField('deal-co-owners', 'Deal Co-Owners', 'dealCoOwners', ACCOUNT_OWNER_OPTIONS)}
            <div className="admin-add-deal-detail-field">
              <label htmlFor="deal-value">
                Deal Value<span className="admin-add-deal-required">*</span>
              </label>
              <div className="admin-add-deal-detail-field-input admin-add-deal-detail-value-row">
                <select
                  value={formData.valueCurrency || 'INR'}
                  onChange={(event) => handleFormChange('valueCurrency', event.target.value)}
                  className="admin-add-deal-input admin-add-deal-currency-select"
                >
                  {DEAL_VALUE_CURRENCIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <input
                  id="deal-value"
                  type="number"
                  value={formData.value}
                  onChange={(event) => handleFormChange('value', event.target.value)}
                  className={`admin-add-deal-input ${errors.value ? 'admin-add-deal-input-error' : ''}`}
                />
              </div>
              {errors.value ? <div className="admin-add-deal-error">{errors.value}</div> : null}
            </div>
            {renderTextField('deal-score', 'Deal Score', 'dealScore', { type: 'number' })}
            {renderTextField('deal-consultant-name', 'Consultant Name', 'consultantName')}
            {renderTextField('deal-customer-ref-no', 'Customer Ref. No.', 'customerRefNo')}
            {renderTextField('deal-project-name', 'Project Name', 'projectName')}
            {renderSelectField('deal-customer-quotation-status', 'Status Of Customer as per quotation Given', 'customerQuotationStatus', CUSTOMER_QUOTATION_STATUS_OPTIONS)}
          </div>

          <div className="admin-add-deal-detail-col">
            {renderSelectField('deal-type', 'Deal Type', 'dealType', DEAL_TYPE_OPTIONS, { required: true })}
            {renderSelectField('deal-source', 'Deal Source', 'dealSource', DEAL_SOURCE_OPTIONS, { required: true })}
            {renderSelectField('deal-owner', 'Deal Owner', 'dealOwner', ACCOUNT_OWNER_OPTIONS, { required: true })}
            {renderTextField('deal-subsource', 'Deal Subsource', 'dealSubsource', { placeholder: 'Enter Deal Subsource' })}
            {renderTextareaField('deal-address', 'Address', 'address', { rows: 2 })}
            {renderSelectField('deal-city', 'City', 'city', DEAL_CITY_OPTIONS)}
            {renderTextField('deal-expected-closure-date', 'Expected Closure Date', 'expectedClosureDate', { type: 'date', required: true })}
            <div className="admin-add-deal-detail-field">
              <label htmlFor="deal-probability">Probability</label>
              <div className="admin-add-deal-detail-field-input admin-add-deal-detail-probability-row">
                <input
                  id="deal-probability"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={formData.probability}
                  onChange={(event) => handleFormChange('probability', event.target.value)}
                  className="admin-add-deal-probability-slider"
                  aria-label="Deal probability"
                />
                <span className="admin-add-deal-probability-value">
                  {formData.probability === '' ? '1%' : `${formData.probability}%`}
                </span>
              </div>
              {errors.probability ? <small className="admin-add-deal-field-error">{errors.probability}</small> : null}
            </div>
            {renderTextField('deal-product-category', 'Product Category', 'productCategory')}
            {renderTextField('deal-customer-ref-date', 'Customer Ref. Date', 'customerRefDate', { type: 'date' })}
            {renderTextField('deal-gstin', 'GSTIN', 'gstin')}
            {renderTextField('deal-job-no', 'Job No', 'jobNo')}
            {renderSelectField('deal-customer-order-status', 'Status of Customer as per Order Received', 'customerOrderStatus', CUSTOMER_ORDER_STATUS_OPTIONS)}
          </div>
        </div>

        {formData.value ? (
          <div className="admin-add-deal-value-preview">
            Deal value preview: <strong>{formatCurrency(normalizeOptionalNumberInput(formData.value))}</strong>
          </div>
        ) : null}
      </div>
    )
  }

  const renderContactsStep = () => (
    <div className="admin-add-deal-step-content">
      <h2>Select or add contacts to associate with the Deal</h2>
      <div className="admin-add-deal-contacts-grid">
        {dealContacts.map((contact) => (
          <div
            key={contact.id}
            className={`admin-add-deal-contact-card ${contact.selected ? 'admin-add-deal-contact-card--selected' : ''}`}
          >
            <div className="admin-add-deal-contact-row">
              <label className="admin-add-deal-contact-check">
                <input
                  type="checkbox"
                  checked={contact.selected}
                  onChange={() => handleToggleContactSelected(contact.id)}
                  aria-label="Associate this contact with the deal"
                />
              </label>
              <select
                value={contact.prefix}
                onChange={(event) => handleContactFieldChange(contact.id, 'prefix', event.target.value)}
                className="admin-add-deal-contact-prefix"
                aria-label="Title prefix"
              >
                {CONTACT_PREFIX_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                type="text"
                value={contact.name}
                onChange={(event) => handleContactFieldChange(contact.id, 'name', event.target.value)}
                placeholder="Contact name"
                className="admin-add-deal-contact-name"
              />
            </div>

            <input
              type="text"
              value={contact.designation}
              onChange={(event) => handleContactFieldChange(contact.id, 'designation', event.target.value)}
              placeholder="Designation"
              className="admin-add-deal-contact-input"
            />

            <div className="admin-add-deal-contact-phone-row">
              <span className="admin-add-deal-contact-flag" aria-hidden="true">🇮🇳 +91</span>
              <input
                type="tel"
                value={contact.phone}
                onChange={(event) => handleContactFieldChange(contact.id, 'phone', event.target.value)}
                placeholder="Phone"
                className="admin-add-deal-contact-phone"
              />
            </div>

            <input
              type="email"
              value={contact.email}
              onChange={(event) => handleContactFieldChange(contact.id, 'email', event.target.value)}
              placeholder="Email"
              className="admin-add-deal-contact-input"
            />

            <label className="admin-add-deal-contact-primary">
              <input
                type="radio"
                name="primary-deal-contact"
                checked={contact.isPrimary}
                onChange={() => handleSetPrimaryContact(contact.id)}
              />
              <span>Primary Deal Contact?</span>
            </label>
          </div>
        ))}
      </div>

      {errors.contacts ? <div className="admin-add-deal-error">{errors.contacts}</div> : null}

      <div className="admin-add-deal-contacts-actions">
        <button type="button" className="admin-add-deal-add-contact-btn" onClick={handleAddContact}>
          + Add Contact
        </button>
      </div>
    </div>
  )

  const renderStepContent = () => {
    if (currentStep === 0) return renderCustomerStep()
    if (currentStep === 1) return renderCustomerDetailsStep()
    if (currentStep === 2) return renderDealDetailsStep()
    return renderContactsStep()
  }

  const renderNavigationButtons = () => (
    <div className="admin-add-deal-nav-row">
      <button type="button" className="admin-add-deal-nav-button admin-add-deal-nav-button-secondary" onClick={handleBack}>
        <FaArrowLeft />
        <span>Back</span>
      </button>

      {currentStep < steps.length - 1 ? (
        <button type="button" className="admin-add-deal-nav-button" onClick={handleNext}>
          <span>Next</span>
          <FaArrowRight />
        </button>
      ) : (
        <button type="button" className="admin-add-deal-nav-button" onClick={handleSave} disabled={isSaving}>
          <span>{isSaving ? 'Saving...' : 'Save Deal'}</span>
          <FaArrowRight />
        </button>
      )}
    </div>
  )

  return (
    <div className="admin-add-deal-page">
      <section className="admin-add-deal-card">
        <div className="admin-add-deal-header">
          <h1>Add Deal</h1>
        </div>

        <div className="admin-add-deal-stepper">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`admin-add-deal-step ${index === currentStep ? 'admin-add-deal-step-active' : ''} ${index < currentStep ? 'admin-add-deal-step-complete' : ''}`}
            >
              <span className="admin-add-deal-step-count">{index + 1}</span>
              <span className="admin-add-deal-step-arrow">-&gt;</span>
              <span className="admin-add-deal-step-label">{step.label}</span>
            </div>
          ))}
        </div>

        {renderNavigationButtons()}
        {renderStepContent()}
        {renderNavigationButtons()}
      </section>
    </div>
  )
}

export default AdminAddDealPage
