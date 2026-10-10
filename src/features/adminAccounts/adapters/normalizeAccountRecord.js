import { format } from 'date-fns'
import { ACCOUNT_STAGES, DEFAULT_ACCOUNT_STAGE } from '../config/accountStages'
import { getCanonicalCrmUserName, getCrmOwnerCode } from '../../users/crmUserDirectory'

const stageLookup = ACCOUNT_STAGES.reduce((lookup, stage) => {
  lookup[stage.key] = stage
  return lookup
}, {})

const ownerByUserId = {
  'user-001': 'John Doe',
  'user-002': 'Jane Smith',
  'user-003': 'Mike Johnson',
  'admin-001': 'System Administrator',
}

const MISSING_VALUE = 'Not Available'

const titleize = (value) => {
  if (!value) return ''

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

const resolveAddedByName = (account = {}) => {
  const value = (
    account.addedByDisplay
    || account.addedByName
    || account.createdByUserName
    || account.createdByName
    || account.raw?.addedByDisplay
    || account.raw?.addedByName
    || account.raw?.createdByUserName
    || account.raw?.createdByName
    || account.addedBy
    || ''
  )

  return getCanonicalCrmUserName(value) || titleize(value)
}

const isBlank = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

const cleanNullableText = (value) => {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return ''
  return text
}

const formatLegacyDate = (value, formatPattern = 'dd-MM-yyyy') => {
  if (isBlank(value)) return MISSING_VALUE

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return format(date, formatPattern)
}

const toDrawerField = (label, value, options = {}) => {
  const { formatter } = options
  const resolvedValue = formatter ? formatter(value) : value
  const missing = isBlank(resolvedValue) || resolvedValue === MISSING_VALUE

  return {
    label,
    value: missing ? MISSING_VALUE : resolvedValue,
    missing,
  }
}

const normalizeStageKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const resolveStage = (account) => {
  const explicitStage = normalizeStageKey(account.stage || account.boardStage || account.pipelineStage)
  if (stageLookup[explicitStage]) {
    return explicitStage
  }

  if (account.stage) {
    const explicitStageKey = normalizeStageKey(account.stage)
    if (stageLookup[explicitStageKey]) {
      return explicitStageKey
    }
  }

  const normalizedStatus = normalizeStageKey(account.status || account.accountStatus || account.accountState)
  if (stageLookup[normalizedStatus]) {
    return normalizedStatus
  }

  const statusToStage = {
    pending: 'new',
    active: 'contacted',
    inactive: 'closed',
    hold: 'follow_up',
    in_progress: 'follow_up',
    technical_review: 'technical_offer',
    commercial_review: 'commercial_offer',
    quotation_shared: 'quotation_sent',
    revision_requested: 'quote_revision',
    won: 'order_received',
    not_quoted: 'not_quoted',
    awaiting_po: 'convert_to_po',
    po_converted: 'convert_to_po',
    lost: 'order_lost',
    converted: 'converted',
    rejected: 'rejected',
    closed: 'closed',
  }

  return statusToStage[normalizedStatus] || DEFAULT_ACCOUNT_STAGE
}

export const normalizeAccountRecord = (account = {}, index = 0, options = {}) => {
  void index
  const primaryContact = Array.isArray(account.contacts) ? account.contacts[0] || {} : {}
  const stage = resolveStage(account)
  const stageMeta = stageLookup[stage] || stageLookup[DEFAULT_ACCOUNT_STAGE]
  const fallbackDate = account.createdAt || new Date().toISOString()
  const rawAccountOwner = account.accountOwnerName || account.accountOwner || account.ownerName || account.raw?.accountOwnerName || account.raw?.accountOwner || account.raw?.ownerName || ownerByUserId[account.userId] || 'Unassigned'
  const accountOwner = getCanonicalCrmUserName(rawAccountOwner) || titleize(rawAccountOwner)
  const accountOwnerCode = String(
    account.accountOwnerCode
    || account.ownerCode
    || account.raw?.accountOwnerCode
    || account.raw?.ownerCode
    || account.raw?.formData?.accountOwnerCode
    || account.raw?.formData?.ownerCode
    || account.formData?.accountOwnerCode
    || account.formData?.ownerCode
    || getCrmOwnerCode(accountOwner)
    || ''
  ).trim()
  const rawAccNo = account.accountNumber || account.accountNo || account.account_no || account.raw?.accountNumber || account.raw?.accountNo || account.raw?.account_no || '';
  const isRawAccNoPureNumber = /^\d+$/.test(rawAccNo);
  const accountNumber = accountOwnerCode && (!rawAccNo || isRawAccNoPureNumber)
    ? accountOwnerCode
    : (accountOwnerCode && rawAccNo && !rawAccNo.startsWith(accountOwnerCode))
      ? `${accountOwnerCode}-${rawAccNo}`
      : rawAccNo || accountOwnerCode || '';
  const accountOwnerDisplay = accountOwner

  const isNotQuotedStage = stage === 'not_quoted' || normalizeStageKey(account.status || account.accountStatus) === 'not_quoted'
  const isPoConvertedStage = stage === 'convert_to_po' || normalizeStageKey(account.status || account.accountStatus) === 'convert_to_po' || normalizeStageKey(account.status || account.accountStatus) === 'po_converted'

  const status = isNotQuotedStage
    ? 'Not Quoted'
    : (isPoConvertedStage ? 'PO Converted' : titleize(account.status || account.accountStatus || account.accountState || stageMeta.label))
  const accountStatus = isNotQuotedStage
    ? 'not_quoted'
    : (isPoConvertedStage ? 'convert_to_po' : status)
  const accountState = isNotQuotedStage
    ? 'not_quoted'
    : (isPoConvertedStage ? 'convert_to_po' : titleize(account.accountState || account.status || account.accountStatus || stageMeta.label))
  const reasonForLost =
    account.reasonForLost ||
    ((stage === 'order_lost' || stage === 'rejected') ? account.remark || 'Not specified' : '')
  const primaryEmail = account.email || account.contactEmail || primaryContact.email || account.alternateEmail || ''
  const primaryPhone = account.phone || account.contactPhone || primaryContact.phone || account.contactMobile || primaryContact.mobile || account.alternatePhone || ''
  const accountSource = titleize(account.accountSource || account.source || '')
  const accountSubsource = titleize(account.accountSubsource || account.subsource || '')
  const addedByName = resolveAddedByName(account)
  const latestRemark = account.latestRemark || account.remark || account.description || ''
  const convertedAs = titleize(account.convertedAs || account.convertedType || ((stage === 'converted') ? 'Customer' : ''))
  const convertedContextNumber = account.convertedContextNumber || account.convertedReferenceNumber || account.customerRefNo || ''
  const isConverted = Boolean(account.isConverted || account.dealId || account.convertedDealId || account.convertedFromAccount)

  const formData = (account.formData && typeof account.formData === 'object') ? account.formData : {}

  const rawAccountCategory = account.accountCategory || formData['Account Category'] || formData.accountCategory || ''
  const parsedAccountCategory = rawAccountCategory.toLowerCase() === 'prospect' ? '' : rawAccountCategory

  const rawCustomerType = account.customerType || formData['Customer Type'] || formData.customerType || account.raw?.customerType || account.raw?.formData?.['Customer Type'] || account.raw?.formData?.customerType || ''
  const parsedCustomerType = rawCustomerType.toLowerCase() === 'prospect' ? '' : rawCustomerType

  const data = (account.data || account.raw?.data || {})
  const accountNameCandidates = [
    account.raw?.accountName,
    account.raw?.customerName,
    account.raw?.name,
    account.accountName,
    account.customerName,
    account.name,
    formData['Account Name'],
    formData.accountName,
    formData.customerName,
    formData.name,
    data.accountName,
    data.customerName,
    data.name,
    data['Account Name'],
    data['Customer Name'],
    account.raw?.formData?.['Account Name'],
    account.raw?.formData?.accountName,
    account.raw?.formData?.customerName,
    account.raw?.formData?.name,
    account.raw?.data?.accountName,
    account.raw?.data?.customerName,
    account.raw?.data?.name,
    account.company,
    account.raw?.company,
  ]
  const isCodePattern = (str) => typeof str === 'string' && /^[A-Z]{2,4}\d{4,8}$/i.test(str.trim())
  const validAccountName = accountNameCandidates.find((val) => typeof val === 'string' && val.trim() && !isCodePattern(val))
  const accountNameVal = validAccountName ? validAccountName.trim() : 'Untitled Account'
  if (typeof accountNameVal === 'string' && /Report Filter/i.test(accountNameVal)) {
    return null
  }
  const dealNameVal = cleanNullableText(account.dealName) || cleanNullableText(account.data?.dealName) || cleanNullableText(account.raw?.data?.dealName) || cleanNullableText(account.raw?.dealName) || cleanNullableText(formData['Deal Name']) || cleanNullableText(formData.dealName) || cleanNullableText(account.raw?.formData?.dealName)
  const rawProjectName = cleanNullableText(account.projectName) || cleanNullableText(account.data?.projectName) || cleanNullableText(formData['Project Name']) || cleanNullableText(formData.projectName) || cleanNullableText(account.raw?.projectName) || cleanNullableText(account.raw?.formData?.['Project Name']) || cleanNullableText(account.raw?.formData?.projectName)
  const projectNameVal = rawProjectName || dealNameVal || ''
  const primaryEmailVal = primaryEmail || formData['Email'] || formData.email || formData['Alternate Email'] || account.raw?.email || account.raw?.contactEmail || ''
  const primaryPhoneVal = primaryPhone || formData['Phone'] || formData.phone || formData['Alternate Phone'] || account.raw?.phone || account.raw?.contactPhone || ''
  const contactPersonVal = account.contactPerson || formData['Contact Person'] || formData.contactPerson || primaryContact.name || account.raw?.contactPerson || account.raw?.formData?.['Contact Person'] || ''
  const locationVal = titleize(account.location || formData['Location'] || formData.location || account.raw?.location || '')
  const stateVal = titleize(account.state || formData['State'] || formData.state || account.raw?.state || '')
  const industryTypeVal = titleize(account.industryType || account.industry || formData['Industry type'] || formData['Industry Type'] || formData.industryType || account.raw?.industryType || account.raw?.industry || '')
  const customerRefNoVal = account.customerRefNo || formData['Customer Ref. No.'] || formData.customerRefNo || account.raw?.customerRefNo || ''
  const consultantNameVal = account.consultantName || formData['Consultant Name'] || formData.consultantName || account.raw?.consultantName || account.raw?.formData?.['Consultant Name'] || ''
  const poValueVal = account.poValue || formData['PO Value'] || formData.poValue || account.raw?.poValue || ''
  const productCategoryVal = titleize(account.productCategory || formData['Product Category'] || formData.productCategory || account.raw?.productCategory || '')
  const userGroupVal = account.userGroup || formData['User Group'] || formData.userGroup || account.raw?.userGroup || account.raw?.formData?.['User Group'] || ''

  const normalized = {
    id: String(account.id || account._id || accountNumber),
    accountNumber,
    name: accountNameVal,
    accountName: accountNameVal,
    accountCategory: parsedAccountCategory,
    dealName: dealNameVal,
    projectName: projectNameVal,
    reasonForLost,
    accountDate: account.accountDate || formData['Account Date'] || fallbackDate,
    accountOwner,
    accountOwnerName: accountOwner,
    accountOwnerCode,
    accountOwnerDisplay,
    stage,
    stageLabel: stageMeta.label,
    status,
    accountStatus: status,
    email: primaryEmailVal,
    phone: primaryPhoneVal,
    website: account.website || '',
    source: accountSource,
    accountSource,
    accountSubsource,
    accountState,
    description: account.description || '',
    address: account.address || '',
    location: locationVal,
    state: stateVal,
    industryType: industryTypeVal,
    customerName: account.customerName || accountNameVal,
    customerType: parsedCustomerType,
    productCategory: productCategoryVal,
    customerRefNo: customerRefNoVal,
    customerRefDate: account.customerRefDate || '',
    consultantName: consultantNameVal,
    architectName: account.architectName || '',
    pmcName: account.pmcName || '',
    projectCode: account.projectCode || '',
    projectType: titleize(account.projectType || ''),
    projectLocation: account.projectLocation || '',
    projectValue: account.projectValue || poValueVal || '',
    projectStatus: account.projectStatus || '',
    projectDescription: account.projectDescription || '',
    contactPerson: contactPersonVal,
    contactDesignation: account.contactDesignation || primaryContact.designation || '',
    contactEmail: account.contactEmail || primaryContact.email || primaryEmailVal,
    contactPhone: account.contactPhone || primaryContact.phone || primaryPhoneVal,
    contactMobile: account.contactMobile || primaryContact.mobile || primaryPhoneVal,
    poValue: poValueVal,
    userGroup: userGroupVal,
    reminderDate: account.reminderDate || '',
    reminderMode: titleize(account.reminderMode || ''),
    remark: account.remark || '',
    latestRemark,
    convertedAs,
    convertedContextNumber,
    isConverted,
    convertedAt: account.convertedAt || '',
    convertedBy: account.convertedBy || '',
    dealId: account.dealId || '',
    convertedDealId: account.convertedDealId || '',
    addedBy: addedByName,
    addedByDisplay: addedByName,
    alternatePhone: account.alternatePhone || '',
    alternateEmail: account.alternateEmail || '',
    gstin: account.gstin || '',
    stateCode: account.stateCode || '',
    poValue: poValueVal,
    statusAsPerQuotationGiven: account.statusAsPerQuotationGiven || '',
    statusAsPerOrderReceived: account.statusAsPerOrderReceived || '',
    jobNo: (typeof (account.jobNo || formData['Job No'] || formData.jobNo) === 'string' && String(account.jobNo || formData['Job No'] || formData.jobNo).trim().toLowerCase() === 'email') ? '' : (account.jobNo || formData['Job No'] || formData.jobNo || ''),
    quotationNumber: account.quotationNumber || account.quotationNo || account.latestQuotationNo || formData['Quotation No'] || formData['Quotation No.'] || formData.quotationNumber || '',
    quotationOwnerName: account.quotationOwnerName || account.quotationOwner || account.latestQuotationOwner || formData['Quotation Owner Name'] || formData.quotationOwnerName || '',
    reasonForLost: account.reasonForLost || account.reasonForLostOrder || formData['Reason Lost'] || formData['Reason For Lost'] || '',
    createdAt: account.createdAt || fallbackDate,
    updatedAt: account.updatedAt || account.createdAt || fallbackDate,
    recordSource: options.recordSource || account.recordSource || 'live',
    raw: account,
  }

  normalized.accountDateDisplay = formatLegacyDate(normalized.accountDate)
  normalized.createdAtDisplay = formatLegacyDate(normalized.createdAt, 'dd-MM-yyyy hh:mm a')
  normalized.updatedAtDisplay = formatLegacyDate(normalized.updatedAt, 'dd-MM-yyyy hh:mm a')

  normalized.drawerSummary = [
    toDrawerField('Account No.', normalized.accountNumber),
    toDrawerField('Email', normalized.email),
    toDrawerField('Account Date', normalized.accountDate, { formatter: () => normalized.accountDateDisplay }),
    toDrawerField('Added By', normalized.addedByDisplay || normalized.addedBy),
    toDrawerField('Last Updated', normalized.updatedAt, { formatter: () => normalized.updatedAtDisplay }),
  ]

  normalized.detailSections = [
    {
      title: 'Account Overview',
      fields: [
        toDrawerField('Account Name', normalized.name),
        toDrawerField('Account Date', normalized.accountDateDisplay),
        toDrawerField('Added By', normalized.addedByDisplay || normalized.addedBy),
        toDrawerField('Email', normalized.email),
        toDrawerField('Last Updated', normalized.updatedAtDisplay),
      ],
    },
    {
      title: 'Business Details',
      fields: [
        toDrawerField('Account Category', normalized.accountCategory),
        toDrawerField('Account Status', normalized.status),
        toDrawerField('Account Owner', normalized.accountOwnerDisplay || normalized.accountOwner),
        toDrawerField('Account Source', normalized.accountSource),
        toDrawerField('Account Subsource', normalized.accountSubsource),
        toDrawerField('GSTIN', normalized.gstin),
      ],
    },
    {
      title: 'Contact And Location',
      fields: [
        toDrawerField('Contact Person', normalized.contactPerson),
        toDrawerField('Location', normalized.location),
        toDrawerField('Description', normalized.description),
        toDrawerField('Address', normalized.address),
      ],
    },
    {
      title: 'Other Details',
      fields: [
        toDrawerField('Customer Type', normalized.customerType),
        toDrawerField('Project Name', normalized.projectName),
        toDrawerField('Project Code', normalized.projectCode),
        toDrawerField('Project Type', normalized.projectType),
        toDrawerField('Project Location', normalized.projectLocation),
        toDrawerField('Project Value', normalized.projectValue),
        toDrawerField('Project Status', normalized.projectStatus),
        toDrawerField('Project Description', normalized.projectDescription),
        toDrawerField('Product Category', normalized.productCategory),
        toDrawerField('State', normalized.state),
        toDrawerField('Industry Type', normalized.industryType),
        toDrawerField('Inquiry Ref No.', normalized.customerRefNo),
        toDrawerField('Inquiry Ref Date', normalized.customerRefDate),
        toDrawerField('Consultant Name', normalized.consultantName),
        toDrawerField('Architect Name', normalized.architectName),
        toDrawerField('PMC Name', normalized.pmcName),
        toDrawerField('PO Value', normalized.poValue),
        toDrawerField('Status Of Customer As Per Order Received', normalized.statusAsPerOrderReceived),
        toDrawerField('Status Of Customer As Per Quotation Given', normalized.statusAsPerQuotationGiven),
        toDrawerField('Job No', normalized.jobNo),
        toDrawerField('Reason For Lost', normalized.reasonForLost),
        toDrawerField('Customer Name', normalized.customerName),
        toDrawerField('Reminder Date', normalized.reminderDate, { formatter: (value) => isBlank(value) ? MISSING_VALUE : formatLegacyDate(value) }),
        toDrawerField('Reminder Mode', normalized.reminderMode),
        toDrawerField('Website', normalized.website),
        toDrawerField('Latest Remark', normalized.latestRemark),
        toDrawerField('Remark', normalized.remark),
      ],
    },
  ]

  return normalized
}
