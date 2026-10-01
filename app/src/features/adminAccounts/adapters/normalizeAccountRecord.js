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

  const normalizedStatus = normalizeStageKey(account.status || account.accountState)
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
    awaiting_po: 'convert_to_po',
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
  const rawAccountOwner = account.accountOwner || account.ownerName || account.raw?.accountOwner || account.raw?.ownerName || ownerByUserId[account.userId] || 'Unassigned'
  const accountOwner = getCanonicalCrmUserName(rawAccountOwner) || titleize(rawAccountOwner)
  const accountOwnerCode = getCrmOwnerCode(accountOwner)
  const accountNumber = account.accountNumber || account.accountNo || account.account_no || account.raw?.accountNumber || account.raw?.accountNo || account.raw?.account_no || accountOwnerCode || ''
  const accountOwnerDisplay = accountOwner
  const status = titleize(account.status || account.accountState || stageMeta.label)
  const reasonForLost =
    account.reasonForLost ||
    ((stage === 'order_lost' || stage === 'rejected') ? account.remark || 'Not specified' : '')
  const primaryEmail = account.email || account.contactEmail || primaryContact.email || account.alternateEmail || ''
  const primaryPhone = account.phone || account.contactPhone || primaryContact.phone || account.contactMobile || primaryContact.mobile || account.alternatePhone || ''
  const accountState = titleize(account.accountState || '')
  const accountSource = titleize(account.accountSource || account.source || '')
  const accountSubsource = titleize(account.accountSubsource || account.subsource || '')
  const addedByName = resolveAddedByName(account)
  const latestRemark = account.latestRemark || account.remark || account.description || ''
  const convertedAs = titleize(account.convertedAs || account.convertedType || ((stage === 'converted') ? 'Customer' : ''))
  const convertedContextNumber = account.convertedContextNumber || account.convertedReferenceNumber || account.customerRefNo || ''
  const isConverted = Boolean(account.isConverted || account.dealId || account.convertedDealId || account.convertedFromAccount)

  const normalized = {
    id: String(account.id || accountNumber),
    accountNumber,
    name: account.name || account.accountName || account.customerName || 'Untitled Account',
    accountCategory: titleize(account.accountCategory || account.customerType || account.industryType || account.industry || 'Prospect'),
    projectName: account.projectName || titleize(account.productCategory) || 'General Enquiry',
    reasonForLost,
    accountDate: account.accountDate || fallbackDate,
    accountOwner,
    accountOwnerName: accountOwner,
    accountOwnerCode,
    accountOwnerDisplay,
    stage,
    stageLabel: stageMeta.label,
    status,
    email: primaryEmail,
    phone: primaryPhone,
    website: account.website || '',
    source: accountSource,
    accountSource,
    accountSubsource,
    accountState,
    description: account.description || '',
    address: account.address || '',
    location: titleize(account.location || ''),
    state: titleize(account.state || ''),
    industryType: titleize(account.industryType || account.industry || ''),
    customerName: account.customerName || '',
    customerType: titleize(account.customerType || ''),
    productCategory: titleize(account.productCategory || ''),
    customerRefNo: account.customerRefNo || '',
    customerRefDate: account.customerRefDate || '',
    consultantName: account.consultantName || '',
    architectName: account.architectName || '',
    pmcName: account.pmcName || '',
    projectCode: account.projectCode || '',
    projectType: titleize(account.projectType || ''),
    projectLocation: account.projectLocation || '',
    projectValue: account.projectValue || '',
    projectStatus: account.projectStatus || '',
    projectDescription: account.projectDescription || '',
    contactPerson: account.contactPerson || primaryContact.name || '',
    contactDesignation: account.contactDesignation || primaryContact.designation || '',
    contactEmail: account.contactEmail || primaryContact.email || account.email || '',
    contactPhone: account.contactPhone || primaryContact.phone || '',
    contactMobile: account.contactMobile || primaryContact.mobile || account.phone || '',
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
    poValue: account.poValue || '',
    statusAsPerQuotationGiven: account.statusAsPerQuotationGiven || '',
    statusAsPerOrderReceived: account.statusAsPerOrderReceived || '',
    jobNo: account.jobNo || '',
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
        toDrawerField('Account State', normalized.accountState),
        toDrawerField('Account Source', normalized.accountSource),
        toDrawerField('Account Subsource', normalized.accountSubsource),
        toDrawerField('GSTIN', normalized.gstin),
        toDrawerField('State Code', normalized.stateCode),
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
        toDrawerField('Alternate Phone', normalized.alternatePhone),
        toDrawerField('Alternate Email', normalized.alternateEmail),
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
