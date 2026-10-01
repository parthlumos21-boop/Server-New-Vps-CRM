import React, { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  FaRegBuilding, FaLayerGroup, FaUserAlt, FaMapMarkerAlt, FaRegFileAlt, FaRegMap, 
  FaCalendarAlt, FaCodeBranch, FaRegUser, FaUserTie, FaBuilding, FaHashtag, 
  FaCalendarDay, FaIndustry, FaBriefcase, FaHardHat 
} from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import LegacyFormField from '../../components/accounts/LegacyFormField'
import LegacyFormSection from '../../components/accounts/LegacyFormSection'
import WizardStepper from '../../components/accounts/WizardStepper'
import { normalizeAccountRecord } from '../../features/adminAccounts/adapters/normalizeAccountRecord'
import { getCrmOwnerOptions } from '../../features/users/crmUserDirectory'
import {
  ACCOUNT_SOURCE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_TYPE_OPTIONS,
  STATE_OPTIONS,
} from '../../features/accounts/config/accountDropdownOptions'
import { getAccountCategoryLogo } from '../../features/accounts/config/accountCategoryLogo'
import { customerService } from '../../services/customerService'
import {
  CUSTOMER_QUOTATION_STATUS_OPTIONS,
  DEAL_LIFECYCLE_STATUS_OPTIONS,
} from '../../features/adminDeals/config/dealUtils'
import { userApi } from '../../services/userApi'
import {
  getAccountOwnerOptionLabel,
  loadAccountOwnerOptions,
  filterAccountOwnerOptionsByVertical,
} from '../../features/adminAccounts/utils/accountOwnerOptions'
import './AddAccountWizard.css'

const steps = [
  { id: 'basic', label: 'Account Basic Details' },
  { id: 'contacts', label: 'Contacts' },
]

const MANDATORY_BASIC_FIELDS = new Set([
  'accountName',
  'accountCategory',
  'accountOwner',
  'accountDate',
  'accountSource',
  'state',
  'industryType',
  'customerType',
])

const accountCategories = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
]

const accountSources = ACCOUNT_SOURCE_OPTIONS
const customerTypes = CUSTOMER_TYPE_OPTIONS
const industryTypes = INDUSTRY_TYPE_OPTIONS
const states = STATE_OPTIONS

const reminderTypes = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'visit', label: 'Visit' },
  { value: 'email', label: 'Email' },
]

const dealTypes = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const dealSources = ['LUMOS', 'SWATI', 'PURCHASE ENQUIRY', 'TENDER ENQUIRY']
const dealStatuses = ['new', 'negotiation', 'won', 'lost', 'hold', 'dropped']

const initialFormData = {
  accountName: '',
  accountOwner: '',
  projectName: '',
  projectCode: '',
  projectType: '',
  projectLocation: '',
  projectValue: '',
  projectStatus: 'Active',
  projectDescription: '',
  state: '',
  description: '',
  address: '',
  customerName: '',
  accountDate: new Date().toISOString().slice(0, 10),
  accountCategory: '',
  accountSource: '',
  accountState: '',
  customerType: '',
  productCategory: '',
  panelAssemblies: [],
  industryType: '',
  customerRefNo: '',
  customerRefDate: '',
  consultantName: '',
  pmcName: '',
  architectName: '',
  contactPerson: '',
  contactDesignation: '',
  contactEmail: '',
  contactPhone: '',
  contactMobile: '',
  reminderDate: '',
  reminderMode: '',
  remark: '',
  // Deal Details Fields
  dealDate: new Date().toISOString().slice(0, 10),
  dealName: '',
  dealDescription: '',
  poValue: '',
  dealValue: '',
  customerQuotationStatus: '',
  dealType: '',
  dealOwner: '',
  dealCity: '',
  expectedClosureDate: new Date().toISOString().slice(0, 10),
  probability: '1',
  gstin: '',
  jobNo: '',
  customerOrderStatus: '',
  valueCurrency: 'INR',
  dealStatus: 'new',
  dealStage: '',
}

const requiredMessages = {
  accountName: 'Account Name: Please provide Account Name',
  accountCategory: 'Vertical Name: Please select Vertical Name',
  accountOwner: 'Account Owner: Please select Account Owner',
  accountSource: 'Account Source: Please select Account Source',
  state: 'State: Please provide State',
  industryType: 'Industry type: Please select Industry type',
  dealOwner: 'Deal Owner: Please select Deal Owner',
}

const fieldGroups = {
  basicLeft: [
    { name: 'accountName', label: 'Account Name', required: true, icon: <FaRegBuilding /> },
    { name: 'accountCategory', label: 'Vertical Name', type: 'select', options: accountCategories, icon: <FaLayerGroup /> },
    { name: 'accountOwner', label: 'Account Owner', type: 'select', options: [], icon: <FaUserAlt /> },
    { name: 'state', label: 'State', type: 'select', options: states, icon: <FaMapMarkerAlt /> },
    { name: 'description', label: 'Remark', type: 'textarea', textareaRows: 3, fieldClassName: 'min-h-[88px]', icon: <FaRegFileAlt /> },
    { name: 'address', label: 'Address', type: 'textarea', textareaRows: 3, fieldClassName: 'min-h-[88px]', icon: <FaRegMap /> },
  ],
  basicRight: [
    { name: 'accountDate', label: 'Account Date', type: 'date', icon: <FaCalendarAlt /> },
    { name: 'accountSource', label: 'Account Source', type: 'select', options: accountSources, icon: <FaCodeBranch /> },
    { name: 'customerName', label: 'Customer Name', icon: <FaRegUser /> },
    { name: 'consultantName', label: 'Consultant/AR Name', icon: <FaUserTie /> },
    { name: 'customerType', label: 'Customer Type', type: 'select', options: customerTypes, icon: <FaBuilding /> },
    { name: 'customerRefNo', label: 'Inquiry Ref No.', icon: <FaHashtag /> },
    { name: 'customerRefDate', label: 'Inquiry Ref Date', type: 'date', icon: <FaCalendarDay /> },
    { name: 'industryType', label: 'Industry Type', type: 'select', options: industryTypes, icon: <FaIndustry /> },
  ],
  dealDetailsLeft: [
    { name: 'dealDate', label: 'Deal Date', type: 'date', icon: <FaCalendarAlt /> },
    { name: 'dealName', label: 'Project Name', icon: <FaBriefcase /> },
    { name: 'dealDescription', label: 'Description', type: 'textarea', textareaRows: 2, icon: <FaRegFileAlt /> },
    { name: 'poValue', label: 'PO Value', type: 'number', icon: <FaHashtag /> },
    { name: 'dealValue', label: 'Deal Value', type: 'number', icon: <FaHashtag /> },
    { name: 'consultantName', label: 'Consultant/AR Name', icon: <FaUserTie /> },
    { name: 'customerRefNo', label: 'Customer Ref. No.', icon: <FaHashtag /> },
    { name: 'customerQuotationStatus', label: 'Status Of Customer as per quotation Given', type: 'select', options: CUSTOMER_QUOTATION_STATUS_OPTIONS, icon: <FaRegFileAlt /> },
    { name: 'dealType', label: 'Deal Type', type: 'select', options: dealTypes, icon: <FaLayerGroup /> },
  ],
  dealDetailsRight: [
    { name: 'dealOwner', label: 'Deal Owner', type: 'select', options: [], required: true, icon: <FaUserAlt /> },
    { name: 'pmcName', label: 'PMC Name', icon: <FaHardHat /> },
    { name: 'address', label: 'Address', type: 'textarea', textareaRows: 2, icon: <FaRegMap /> },
    { name: 'dealCity', label: 'City', icon: <FaMapMarkerAlt /> },
    { name: 'expectedClosureDate', label: 'Expected Closure Date', type: 'date', icon: <FaCalendarDay /> },
    { name: 'probability', label: 'Probability (%)', type: 'range', icon: <FaHashtag /> },
    { name: 'productCategory', label: 'Product Category', type: 'select', options: [{ value: 'TTA', label: 'TTA' }, { value: 'Non TTA', label: 'Non TTA' }, { value: 'LT', label: 'LT' }, { value: 'HT', label: 'HT' }, { value: 'BUSDUC', label: 'BUSDUC' }, { value: 'AUTOMATION', label: 'AUTOMATION' }], icon: <FaLayerGroup /> },
    { name: 'customerRefDate', label: 'Customer Ref. Date', type: 'date', icon: <FaCalendarAlt /> },
    { name: 'gstin', label: 'GSTIN', icon: <FaHashtag /> },
    { name: 'jobNo', label: 'Job No', icon: <FaBriefcase /> },
    { name: 'customerOrderStatus', label: 'Status of Customer as per Order Received', type: 'select', options: DEAL_LIFECYCLE_STATUS_OPTIONS, icon: <FaRegFileAlt /> },
  ],
  contactsLeft: [
    { name: 'contactPerson', label: 'Contact Person', icon: <FaRegUser /> },
    { name: 'contactDesignation', label: 'Designation', icon: <FaUserTie /> },
  ],
  contactsRight: [
    { name: 'contactEmail', label: 'Contact Email', type: 'email', icon: <FaRegFileAlt /> },
    { name: 'contactPhone', label: 'Contact Phone', type: 'tel', icon: <FaHashtag /> },
    { name: 'contactMobile', label: 'Contact Mobile', type: 'tel', icon: <FaHashtag /> },
  ],
  reminderLeft: [
    { name: 'reminderDate', label: 'Reminder Date', type: 'date', icon: <FaCalendarAlt /> },
    { name: 'reminderMode', label: 'Reminder Mode', type: 'select', options: reminderTypes, icon: <FaLayerGroup /> },
  ],
  reminderRight: [
    { name: 'remark', label: 'Remark', type: 'textarea', textareaRows: 4, fieldClassName: 'min-h-[100px]', icon: <FaRegFileAlt /> },
  ],
}

const AddAccountWizard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { accounts, createAccount, createDeal, createReminder, addNotification } = useData()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [validationNotice, setValidationNotice] = useState([])
  const [saving, setSaving] = useState(false)
  const [ownerOptions, setOwnerOptions] = useState([])

  const [isExistingCustomer, setIsExistingCustomer] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customers, setCustomers] = useState(() => customerService.getCustomers())

  useEffect(() => {
    let isMounted = true
    loadAccountOwnerOptions()
      .then((options) => {
        if (isMounted) setOwnerOptions(options)
      })
      .catch((err) => console.error('Failed to load account owners:', err))

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!user || !Array.isArray(ownerOptions) || ownerOptions.length === 0) return

    const userNames = [
      user.name,
      user.ownerDisplayName,
      user.username,
      user.email,
    ].map(v => String(v || '').trim().toLowerCase()).filter(Boolean)

    const userOwnerCode = String(user.ownerCode || user.employeeId || '').trim()

    const matchedOwner = ownerOptions.find((owner) => {
      const ownerName = String(owner.name || owner.username || '').trim().toLowerCase()
      const ownerCode = String(owner.ownerCode || owner.employeeId || '').trim()
      const ownerEmail = String(owner.email || '').trim().toLowerCase()

      const nameMatch = userNames.some(n => n && (n === ownerName || ownerName.includes(n) || n.includes(ownerName)))
      const codeMatch = Boolean(userOwnerCode && ownerCode && userOwnerCode === ownerCode)
      const emailMatch = Boolean(ownerEmail && userNames.some(n => n === ownerEmail))

      return nameMatch || codeMatch || emailMatch
    })

    const defaultOwnerName = matchedOwner?.name || user.name || user.username || ''

    if (defaultOwnerName) {
      setFormData((prev) => {
        let changed = false
        const next = { ...prev }
        if (!next.accountOwner) {
          next.accountOwner = defaultOwnerName
          changed = true
        }
        if (!next.dealOwner) {
          next.dealOwner = defaultOwnerName
          changed = true
        }
        return changed ? next : prev
      })
    }
  }, [user, ownerOptions])

  useEffect(() => {
    const unsubscribe = customerService.subscribe((nextCustomers) => {
      setCustomers([...nextCustomers])
    })
    customerService.loadCustomers().then((nextCustomers) => setCustomers([...nextCustomers])).catch(() => {})
    return unsubscribe
  }, [])

  const categoryUpper = String(formData.accountCategory || '').toUpperCase().trim()
  const activeOwners = filterAccountOwnerOptionsByVertical(ownerOptions, formData.accountCategory).map(owner => ({
    value: owner.name,
    label: getAccountOwnerOptionLabel(owner),
    userObj: owner,
  }))

  const isAdmin = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname])
  const backPath = isAdmin ? '/admin/accounts/my-accounts' : '/accounts/my-group-accounts'
  const categoryLogo = useMemo(
    () => getAccountCategoryLogo(formData.accountCategory),
    [formData.accountCategory]
  )

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

    const buildCustomerFromAccount = (account = {}) => ({
      id: `account-${account.id || account.accountId || account.accountNumber || account.accountNo || account.name}`,
      sourceType: 'account',
      accountId: account.id || account.accountId || '',
      customerNumber: account.customerNumber || account.customerRefNo || account.accountNumber || account.accountNo || '',
      customerName: account.customerName || account.accountName || account.name || account.company || '',
      customerOwner: account.accountOwner || account.ownerName || account.assignedUserName || '',
      customerOwnerDisplay: account.accountOwnerDisplay || getAccountOwnerOptionLabel({ name: account.accountOwner || account.ownerName || '' }),
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

  const filteredCustomers = useMemo(() => {
    const searchValue = customerSearch.trim().toLowerCase()
    if (!searchValue) return []
    return customerOptions
      .map((customer) => {
        const primaryContact = customer.contacts?.[0] || {}
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
        return { customer, matched }
      })
      .filter((entry) => entry.matched)
      .map((entry) => entry.customer)
      .slice(0, 12)
  }, [customerOptions, customerSearch])

  const handleSelectCustomer = (customer) => {
    const primaryContact = customer.contacts?.[0] || {}
    setSelectedCustomerId(customer.id)
    setCustomerSearch(customer.customerName)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.customer
      return next
    })

    setFormData((prev) => ({
      ...prev,
      accountName: customer.customerName || prev.accountName,
      customerName: customer.customerName || prev.customerName,
      address: customer.address || prev.address,
      state: customer.state || prev.state,
      gstin: customer.gstin || prev.gstin,
      industryType: customer.industryType || customer.industry || prev.industryType,
      accountOwner: customer.customerOwner || customer.accountOwner || prev.accountOwner,
      accountState: (customer.customerStatus && customer.customerStatus !== 'converted') ? customer.customerStatus : 'pending',
      contactPerson: primaryContact.contactPerson || primaryContact.name || prev.contactPerson,
      contactPhone: primaryContact.phone || prev.contactPhone,
      contactMobile: primaryContact.mobile || prev.contactMobile,
      contactEmail: primaryContact.email || prev.contactEmail,
      contactDesignation: primaryContact.designation || prev.contactDesignation,
      consultantName: customer.consultantName || prev.consultantName,
      architectName: customer.architectName || prev.architectName,
      pmcName: customer.pmcName || prev.pmcName,
      projectName: customer.projectName || prev.projectName,
      accountCategory: customer.customerCategory || customer.accountCategory || prev.accountCategory,
      productCategory: customer.productCategory || prev.productCategory,
      customerRefNo: customer.customerRefNo || prev.customerRefNo,
      customerRefDate: customer.customerRefDate || prev.customerRefDate,
      jobNo: customer.jobNo || prev.jobNo,
      poValue: customer.poValue || prev.poValue,
      dealValue: customer.dealValue || customer.projectValue || prev.dealValue,
      dealName: `${customer.customerName || 'Account'} Deal`,
      dealType: customer.customerCategory || prev.dealType,
      dealOwner: customer.customerOwner || customer.accountOwner || prev.dealOwner,
    }))
  }

  const validateStep = (stepIndex) => {
    const nextErrors = {}

    if (stepIndex === 0) {
      if (isExistingCustomer) {
        if (!selectedCustomerId) {
          nextErrors.customer = 'Select an existing customer before continuing.'
        }
      } else {
        if (!String(formData.accountName || '').trim()) nextErrors.accountName = 'Account Name is required.'
        if (!String(formData.accountCategory || '').trim()) nextErrors.accountCategory = 'Vertical Name is required.'
        if (!String(formData.accountOwner || '').trim()) nextErrors.accountOwner = 'Account Owner is required.'
        if (!String(formData.accountDate || '').trim()) nextErrors.accountDate = 'Account Date is required.'
        if (!String(formData.accountSource || '').trim()) nextErrors.accountSource = 'Account Source is required.'
        if (!String(formData.state || formData.accountState || '').trim()) nextErrors.state = 'State is required.'
        if (!String(formData.industryType || '').trim()) nextErrors.industryType = 'Industry Type is required.'
        if (!String(formData.customerType || formData.customerCategory || '').trim()) nextErrors.customerType = 'Customer Type is required.'
      }
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      nextErrors.contactEmail = 'Enter a valid contact email.'
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const validateAllSteps = () => {
    const collectedErrors = {}

    if (isExistingCustomer) {
      if (!selectedCustomerId) {
        collectedErrors.customer = 'Select an existing customer before saving.'
      }
    } else {
      if (!String(formData.accountName || '').trim()) collectedErrors.accountName = 'Account Name is required.'
      if (!String(formData.accountCategory || '').trim()) collectedErrors.accountCategory = 'Vertical Name is required.'
      if (!String(formData.accountOwner || '').trim()) collectedErrors.accountOwner = 'Account Owner is required.'
      if (!String(formData.accountDate || '').trim()) collectedErrors.accountDate = 'Account Date is required.'
      if (!String(formData.accountSource || '').trim()) collectedErrors.accountSource = 'Account Source is required.'
      if (!String(formData.state || formData.accountState || '').trim()) collectedErrors.state = 'State is required.'
      if (!String(formData.industryType || '').trim()) collectedErrors.industryType = 'Industry Type is required.'
      if (!String(formData.customerType || formData.customerCategory || '').trim()) collectedErrors.customerType = 'Customer Type is required.'
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      collectedErrors.contactEmail = 'Enter a valid contact email.'
    }

    setErrors(collectedErrors)
    return collectedErrors
  }

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setValidationNotice([])
    setErrors((prev) => {
      if (!prev[name]) return prev
      const nextErrors = { ...prev }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleStepChange = (targetStep) => {
    if (targetStep > currentStep) {
      if (!validateStep(currentStep)) {
        triggerErrorScroll()
        return
      }
    }
    setCurrentStep(targetStep)
    setValidationNotice([])
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      triggerErrorScroll()
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    setValidationNotice([])
  }

  const triggerErrorScroll = () => {
    setTimeout(() => {
      const firstInvalid = document.querySelector('.legacy-form-error-message, .admin-add-deal-input-error, .border-red-500')
      if (firstInvalid) {
        const fieldContainer = firstInvalid.closest('.legacy-form-row, .legacy-form-field-stack, .add-account-landscape-field-column, .relative') || firstInvalid
        fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validateAllSteps()

    if (Object.keys(validationErrors).length > 0) {
      // Find which step failed and redirect
      const errorKeys = Object.keys(validationErrors)
      let stepWithError = 0
      if (errorKeys.some(key => ['accountName', 'accountCategory', 'accountOwner', 'accountDate', 'accountSource', 'state', 'industryType', 'customerType', 'customer'].includes(key))) {
        stepWithError = 0
      } else if (errorKeys.some(key => ['dealOwner', 'dealValue', 'contactEmail'].includes(key))) {
        stepWithError = 1
      }
      
      if (currentStep !== stepWithError) {
        setCurrentStep(stepWithError)
      }
      triggerErrorScroll()
      addNotification('error', 'Required Fields', 'Please complete all required fields marked as required.')
      return
    }

    setSaving(true)
    setValidationNotice([])

    const selectedOwner = activeOwners.find(o => o.value === formData.accountOwner)
    const finalOwnerName = selectedOwner ? selectedOwner.userObj.name : formData.accountOwner
    const finalOwnerCode = selectedOwner && selectedOwner.userObj ? (selectedOwner.userObj.ownerCode || '') : ''

    const accountPayload = {
      name: formData.accountName,
      email: formData.contactEmail,
      phone: formData.contactMobile || formData.contactPhone,
      industry: formData.industryType,
      status: formData.accountState || 'pending',
      accountState: formData.accountState || 'pending',
      source: formData.accountSource,
      ownerName: finalOwnerName,
      addedBy: user?.name || user?.username || '',
      address: formData.address,
      createdByUserId: user?.id || '',
      createdByUserName: user?.name || user?.username || '',
      employeeId: user?.employeeId || user?.ownerCode || '',
      department: user?.department || '',
      userEmail: user?.email || '',
      ...formData,
      accountOwner: finalOwnerName,
      accountOwnerCode: finalOwnerCode,
      company: selectedOwner?.userObj?.company || selectedOwner?.userObj?.companyName || formData.accountCategory || '',
      contacts: [
        {
          name: formData.contactPerson,
          designation: formData.contactDesignation,
          email: formData.contactEmail,
          phone: formData.contactPhone,
          mobile: formData.contactMobile,
        },
      ],
      projects: [
        {
          projectName: formData.projectName,
          projectCode: formData.projectCode,
          projectType: formData.projectType,
          projectLocation: formData.projectLocation,
          consultantName: formData.consultantName,
          architectName: formData.architectName,
          pmcName: formData.pmcName,
          projectValue: formData.projectValue,
          projectStatus: formData.projectStatus,
          projectDescription: formData.projectDescription,
        },
      ],
    }

    // Always create account first
    const accountResult = await createAccount(accountPayload)

    if (accountResult.success) {
      const createdAccountId = accountResult.data?.id || accountResult.data?._id || ''
      const createdAccountName = accountResult.data?.name || formData.accountName || ''

      // If Deal Name is provided OR isExistingCustomer is checked, create a Deal in MongoDB deals collection
      const targetDealName = formData.dealName.trim() || (isExistingCustomer ? `${formData.customerName || createdAccountName || 'Account'} Deal` : '')
      if (targetDealName) {
        const dealPayload = {
          name: targetDealName,
          dealDate: formData.dealDate || new Date().toISOString().slice(0, 10),
          description: formData.dealDescription || '',
          poValue: parseFloat(formData.poValue) || 0,
          dealCoOwners: formData.dealCoOwners || '',
          value: parseFloat(formData.dealValue) || 0,
          valueCurrency: formData.valueCurrency || 'INR',
          dealScore: parseFloat(formData.dealScore) || 0,
          consultantName: formData.consultantName || '',
          customerRefNo: formData.customerRefNo || '',
          projectName: formData.projectName || '',
          quotationCustomerStatus: formData.customerQuotationStatus || '',
          dealType: formData.dealType || formData.accountCategory,
          dealSource: formData.dealSource || formData.accountSource,
          dealOwner: formData.dealOwner || finalOwnerName,
          ownerName: formData.dealOwner || finalOwnerName,
          city: formData.dealCity || '',
          closeDate: formData.expectedClosureDate,
          expectedClosureDate: formData.expectedClosureDate,
          probability: parseFloat(formData.probability) || 1,
          productCategory: formData.productCategory || '',
          customerRefDate: formData.customerRefDate || '',
          gstin: formData.gstin || '',
          jobNo: formData.jobNo || '',
          orderCustomerStatus: formData.customerOrderStatus || '',
          status: isExistingCustomer ? 'pending' : (formData.dealStatus || 'pending'),
          stage: isExistingCustomer ? 'new' : (formData.dealStage || 'new'),
          accountId: createdAccountId,
          accountName: createdAccountName,
          customerName: formData.customerName || createdAccountName,
          contacts: [
            {
              name: formData.contactPerson,
              designation: formData.contactDesignation,
              email: formData.contactEmail,
              phone: formData.contactPhone,
              mobile: formData.contactMobile,
            }
          ]
        }
        await createDeal(dealPayload).catch((err) => console.error('Failed to create deal', err))
      }

      // Create reminder if fields filled
      if (formData.reminderDate || formData.remark) {
        await createReminder({
          title: 'Account Follow-up',
          message: formData.remark?.trim() || '',
          remindAt: formData.reminderDate ? `${formData.reminderDate}T10:00:00` : new Date().toISOString(),
          status: 'scheduled',
          relatedEntityType: 'account',
          relatedEntityId: createdAccountId,
          assignedTo: finalOwnerName,
          reminderDate: formData.reminderDate,
          reminderTime: '10:00',
          reminderMode: formData.reminderMode,
        }).catch((err) => console.error('Failed to create reminder', err))
      }



      addNotification(
        'success',
        'Records Created',
        `${formData.accountName} is now visible in Search Account.`
      )

      if (accountResult.data) {
        const normalizedAccount = normalizeAccountRecord(accountResult.data)
        const nextParams = new URLSearchParams({
          stage: normalizedAccount.stage || 'new',
          accountId: normalizedAccount.id,
          page: '1',
        })
        navigate(`${backPath}?${nextParams.toString()}`, {
          state: {
            newAccountId: normalizedAccount.id,
            newAccountName: normalizedAccount.name,
          },
        })
      } else {
        navigate(backPath)
      }
    } else {
      addNotification('error', 'Save Failed', accountResult.message || 'Unable to create account.')
    }
    
    setSaving(false)
  }

  const renderFieldGroup = (fields, options = {}) =>
    fields.map((field) => {
      const isRequired = field.required || (!isExistingCustomer && MANDATORY_BASIC_FIELDS.has(field.name))
      const isCurrencyField = field.name === 'poValue' || field.name === 'dealValue'
      if (isCurrencyField) {
        return (
          <div key={field.name} className="legacy-form-row">
            <label className="legacy-form-label">
              {field.icon ? (
                <span className="legacy-form-icon-wrap">
                  {field.icon}
                </span>
              ) : null}
              <span className="legacy-form-label-text">
                {field.label} {isRequired && <span className="text-red-500">*</span>}
              </span>
            </label>
            <div>
              <div className="flex items-center gap-1.5 w-full">
              <select
                value={formData.valueCurrency || 'INR'}
                onChange={(e) => handleChange('valueCurrency', e.target.value)}
                className="min-h-[38px] py-1.5 px-2.5 text-xs font-bold border border-slate-300 rounded-md bg-slate-50 text-slate-700 outline-none focus:border-[#c60016] focus:ring-1 focus:ring-[#c60016]/20 shrink-0"
              >
                {['INR', 'USD', 'AED', 'EUR', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                name={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder || '0.00'}
                className={`legacy-form-control w-full min-h-[38px] py-1.5 px-3 text-sm border rounded-md outline-none bg-white text-slate-800 focus:border-[#c60016] focus:ring-1 focus:ring-[#c60016]/20 ${errors[field.name] ? 'border-[#c60016]' : 'border-slate-300'}`}
              />
            </div>
            {errors[field.name] && <p className="text-xs text-red-600 mt-1 legacy-form-error-message">{errors[field.name]}</p>}
            </div>
          </div>
        )
      }

      return (
        <LegacyFormField
          key={field.name}
          label={field.label}
          name={field.name}
          type={field.type}
          value={formData[field.name]}
          onChange={handleChange}
          required={isRequired}
          options={field.options}
          error={errors[field.name]}
          placeholder={field.placeholder}
          textareaRows={field.textareaRows}
          fieldClassName={field.fieldClassName}
          layout={options.layout}
          rowClassName={[options.rowClassName, field.rowClassName, field.type === 'textarea' ? 'legacy-form-row-textarea' : ''].filter(Boolean).join(' ')}
          inputWrapperClassName={options.inputWrapperClassName}
          icon={field.icon}
        />
      )
    })

  return (
    <div className="add-account-landscape-page">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
        className="add-account-landscape-form"
      >
        <WizardStepper
          steps={steps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          className="add-account-landscape-stepper"
        />

        {currentStep === 0 ? (
          <>
            <div className="add-account-landscape-section add-account-basic-section add-account-unified-section">
              <div className="add-account-mockup-header-row">
                <div className="add-account-mockup-header-title">
                  <div className="add-account-mockup-header-title-bar"></div>
                  <div>
                    <h2>Account Basic Details</h2>
                    <p>Enter the key details about the account. Fields marked with an asterisk (*) are mandatory.</p>
                  </div>
                </div>
                <div className="add-account-mockup-step-chip" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
                  <span>STEP {currentStep + 1} OF {steps.length}</span>
                  {steps.map((step, index) => (
                    <i
                      key={step.id}
                      className={index === currentStep ? 'is-active' : ''}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              <label className="add-account-mockup-existing-banner">
                <input 
                  type="checkbox" 
                  checked={isExistingCustomer} 
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsExistingCustomer(checked)
                    setErrors({})
                    setValidationNotice([])
                  }} 
                />
                Are your current Account is existing customer?
              </label>
              
              {isExistingCustomer && (
                <div className="mb-6 relative">
                  <label className="block text-[11px] font-medium mb-1 text-slate-500">
                    Customer Search <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setSelectedCustomerId('')
                    }}
                    placeholder="Start typing the customer name (e.g. Tata, Demo)"
                    className={`w-full max-w-md py-1.5 px-2 text-sm border rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-shadow ${errors.customer ? 'border-red-500 admin-add-deal-input-error' : 'border-gray-300'}`}
                  />
                  {errors.customer && <p className="text-xs text-red-600 mt-1 legacy-form-error-message">{errors.customer}</p>}
                  {filteredCustomers.length > 0 && !selectedCustomerId && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0">
                          <div className="font-semibold text-sm text-slate-800">{c.customerName}</div>
                          <div className="text-xs text-slate-500">
                            <span className="bg-gray-100 px-1 py-0.5 rounded mr-2">{c.sourceType === 'account' ? 'Account' : 'Customer'}</span>
                            {c.customerNumber || 'No number'} | {c.customerOwnerDisplay || 'No owner'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCustomerId && customerSearch.trim() && (
                    <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-100">
                      Selected: <strong>{customerSearch}</strong>. Details auto-filled!
                    </div>
                  )}
                </div>
              )}

              {isExistingCustomer ? (
                selectedCustomerId ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                    <h3 className="text-base font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Customer Details (Non-Editable)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div><span className="font-semibold text-slate-600">Customer Name:</span> <span className="text-slate-900 font-medium">{formData.customerName || formData.accountName || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Product Category:</span> <span className="text-slate-900 font-medium">{formData.productCategory || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Customer Category:</span> <span className="text-slate-900 font-medium">{formData.accountCategory || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Project Name:</span> <span className="text-slate-900 font-medium">{formData.projectName || formData.dealName || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Customer Owner:</span> <span className="text-slate-900 font-medium">{formData.accountOwner || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">State:</span> <span className="text-slate-900 font-medium">{formData.state || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Customer Status:</span> <span className="text-slate-900 font-medium">{formData.accountState || 'converted'}</span></div>
                      <div><span className="font-semibold text-slate-600">Industry Type:</span> <span className="text-slate-900 font-medium">{formData.industryType || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">Address:</span> <span className="text-slate-900 font-medium">{formData.address || '-'}</span></div>
                      <div><span className="font-semibold text-slate-600">GSTIN:</span> <span className="text-slate-900 font-medium">{formData.gstin || '-'}</span></div>
                    </div>
                  </div>
                ) : null
              ) : (
                (() => {
                  const basicLeftFieldsPrepared = fieldGroups.basicLeft.map(f => (
                    f.name === 'accountOwner' ? { ...f, options: activeOwners } : f
                  ))
                  const basicRightFieldsPrepared = fieldGroups.basicRight

                  return (
                    <div className="add-account-mockup-columns">
                      <div className="add-account-mockup-column">
                        {renderFieldGroup(basicLeftFieldsPrepared, { layout: 'inline' })}
                      </div>
                      <div className="add-account-mockup-column">
                        {renderFieldGroup(basicRightFieldsPrepared, { layout: 'inline' })}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>

            <div className="add-account-landscape-section add-account-project-section add-account-unified-section">
              <div className="add-account-mockup-header-row">
                <div className="add-account-mockup-header-title">
                  <div className="add-account-mockup-header-title-bar"></div>
                  <div>
                    <h2>Project Details</h2>
                    <p>Key project and deal information for this account.</p>
                  </div>
                </div>
              </div>

              {(() => {
                const dealLeftFieldsPrepared = fieldGroups.dealDetailsLeft.map((f) => ({
                  ...f,
                  required: isExistingCustomer ? false : f.required,
                }))
                const dealRightFieldsWithOwners = fieldGroups.dealDetailsRight.map((f) => ({
                  ...f,
                  options: f.name === 'dealOwner' ? activeOwners : f.options,
                  required: isExistingCustomer ? false : f.required,
                }))

                return (
                  <div className="add-account-mockup-columns">
                    <div className="add-account-mockup-column">
                      {renderFieldGroup(dealLeftFieldsPrepared, { layout: 'inline' })}
                    </div>
                    <div className="add-account-mockup-column">
                      {dealRightFieldsWithOwners.map((field) => (
                        <React.Fragment key={field.name}>
                          {renderFieldGroup([field], { layout: 'inline' })}
                          {field.name === 'productCategory' && formData.productCategory === 'TTA' && (
                            <div className="add-account-panel-assemblies">
                              <label className="add-account-panel-assemblies-title">
                                Panel Assemblies
                              </label>
                              <div className="add-account-panel-assemblies-options">
                                {['L&T/L&K', 'ABP', 'Siemens', 'Schneider'].map((option) => {
                                  const isChecked = Array.isArray(formData.panelAssemblies)
                                    ? formData.panelAssemblies.includes(option)
                                    : String(formData.panelAssemblies || '').split(',').map((s) => s.trim()).includes(option)

                                  return (
                                    <label key={option} className="add-account-panel-assembly-option">
                                      <input
                                        type="checkbox"
                                        value={option}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const current = Array.isArray(formData.panelAssemblies)
                                            ? [...formData.panelAssemblies]
                                            : (formData.panelAssemblies ? String(formData.panelAssemblies).split(',').map((s) => s.trim()) : [])
                                          
                                          let next = []
                                          if (e.target.checked) {
                                            next = [...new Set([...current, option])]
                                          } else {
                                            next = current.filter((item) => item !== option)
                                          }
                                          setFormData((prev) => ({ ...prev, panelAssemblies: next }))
                                        }}
                                      />
                                      <span>{option}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        ) : null}

        {currentStep === 1 ? (
          <div className="add-account-landscape-section add-account-unified-section">
            <div className="add-account-mockup-header-row">
              <div className="add-account-mockup-header-title">
                <div className="add-account-mockup-header-title-bar"></div>
                <div>
                  <h2>Contacts</h2>
                  <p>Add the primary contact details linked to this account.</p>
                </div>
              </div>
              <div className="add-account-mockup-step-chip" aria-label={`Step 2 of ${steps.length}`}>
                <span>STEP 2 OF {steps.length}</span>
                {steps.map((step, index) => (
                  <i
                    key={step.id}
                    className={index === 1 ? 'is-active' : ''}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            <div className="add-account-mockup-columns">
              <div className="add-account-mockup-column">
                {renderFieldGroup(fieldGroups.contactsLeft, { layout: 'inline' })}
              </div>
              <div className="add-account-mockup-column">
                {renderFieldGroup(fieldGroups.contactsRight, { layout: 'inline' })}
              </div>
            </div>
          </div>
        ) : null}


        <div className="add-account-landscape-footer">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="add-account-landscape-button add-account-landscape-button-cancel"
          >
            Cancel
          </button>
          <div className="add-account-mockup-footer-actions">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="add-account-landscape-button add-account-landscape-button-secondary"
            >
              &lt; Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
              className="add-account-landscape-button add-account-landscape-button-primary"
            >
                Next <span aria-hidden="true">-&gt;</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="add-account-landscape-button add-account-landscape-button-primary"
              >
                {saving ? 'Saving...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddAccountWizard
