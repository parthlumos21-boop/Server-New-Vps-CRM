import { generateId } from '../utils/helpers'
import {
  CRM_FILTER_USERS,
  getCanonicalCrmUserName,
  getCrmOwnerCode,
  getCrmOwnerDisplay,
  getCrmOwnerRecord,
  normalizeCrmUserName,
} from '../features/users/crmUserDirectory'

const DEFAULT_DEAL_NUMBER_START = 2871
const DEFAULT_SR_NUMBER_START = 1
const DEFAULT_QUOTATION_NUMBER_START = 1001
const DEFAULT_PROJECT_NUMBER_START = 1

const normalizeMarketingValue = (value = '') => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'MARKETING-LUMOS') return 'LUMOS'
  if (normalized === 'MARKETING-SWATI') return 'SWATI'
  return String(value || '').trim()
}

class DataService {
  constructor() {
    this.storagePrefix = 'crm_'
  }

  // Generic storage methods
  getFromStorage(key) {
    const data = localStorage.getItem(this.storagePrefix + key)
    return data ? JSON.parse(data) : []
  }

  saveToStorage(key, data) {
    localStorage.setItem(this.storagePrefix + key, JSON.stringify(data))
  }

  normalizeValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  }

  resolveScopedUser(userOrId) {
    if (!userOrId) {
      return { id: '', name: '' }
    }

    if (typeof userOrId === 'object') {
      return {
        id: userOrId.id || '',
        name: userOrId.name || '',
      }
    }

    return {
      id: String(userOrId),
      name: '',
    }
  }

  resolveLinkedUserScope(userOrId) {
    const scopedUser = this.resolveScopedUser(userOrId)
    const userRecord = typeof userOrId === 'object' ? userOrId : {}
    const ownerRecord = getCrmOwnerRecord(userRecord.ownerCode || userRecord.owner_code || scopedUser.name || userRecord.username)
    const linkedUsers = ownerRecord?.userGroup
      ? CRM_FILTER_USERS.filter((entry) => entry.userGroup === ownerRecord.userGroup)
      : []

    return {
      ids: [
        scopedUser.id,
        userRecord.id,
        userRecord.userId,
        ...linkedUsers.map((entry) => entry.id),
      ].map((value) => String(value || '')).filter(Boolean),
      names: [
        scopedUser.name,
        userRecord.name,
        userRecord.username,
        ownerRecord?.name,
        ...linkedUsers.map((entry) => entry.name),
      ].map(normalizeCrmUserName).filter(Boolean),
      ownerCodes: [
        userRecord.ownerCode,
        userRecord.owner_code,
        ownerRecord?.ownerCode,
        ...linkedUsers.map((entry) => entry.ownerCode),
      ].map((value) => String(value || '')).filter(Boolean),
    }
  }

  matchesUserScope(record = {}, userOrId) {
    const linkedScope = this.resolveLinkedUserScope(userOrId)
    if (linkedScope.ids.length === 0 && linkedScope.names.length === 0 && linkedScope.ownerCodes.length === 0) {
      return false
    }

    const relevantIds = [
      record.userId,
      record.ownerUserId,
      record.ownerId,
      record.assignedTo,
      record.assignedToId,
      record.assignedUserId,
      record.createdBy,
      ...(record.assignedUserIds || []),
      ...(record.recipientUserIds || []),
    ].map((value) => String(value || '')).filter(Boolean)

    if (relevantIds.some((id) => linkedScope.ids.includes(id))) {
      return true
    }

    const relevantNames = [
      record.accountOwner,
      record.ownerName,
      record.dealOwner,
      record.customerOwner,
      record.addedByName,
      record.closedByName,
      record.assignedUserName,
      ...(record.recipientUserNames || []),
    ]
      .map((value) => normalizeCrmUserName(value))
      .filter(Boolean)

    if (relevantNames.some((name) => linkedScope.names.includes(name))) {
      return true
    }

    const relevantOwnerCodes = [
      record.accountNo,
      record.accountNumber,
      record.ownerCode,
      record.owner_code,
      record.dealOwnerCode,
      record.customerOwnerCode,
    ].map((value) => String(value || '')).filter(Boolean)

    return relevantOwnerCodes.some((ownerCode) => linkedScope.ownerCodes.includes(ownerCode))
  }

  buildDealNumber(sequence) {
    return `DL${String(sequence).padStart(5, '0')}`
  }

  parseDealNumber(dealNumber = '') {
    const match = String(dealNumber).match(/(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : NaN
  }

  getNextDealSequence(existingDeals = this.getFromStorage('deals')) {
    const maxSequence = existingDeals.reduce((currentMax, deal) => {
      const parsedValue = this.parseDealNumber(deal.dealNumber)
      return Number.isFinite(parsedValue) ? Math.max(currentMax, parsedValue) : currentMax
    }, DEFAULT_DEAL_NUMBER_START - 1)

    return maxSequence + 1
  }

  buildSupportRequestNumber(sequence) {
    return `SR${String(sequence).padStart(6, '0')}`
  }

  parseSupportRequestNumber(srNumber = '') {
    const match = String(srNumber).match(/(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : NaN
  }

  getNextSupportRequestSequence(existingSupportRequests = this.getFromStorage('supportRequests')) {
    const maxSequence = existingSupportRequests.reduce((currentMax, supportRequest) => {
      const parsedValue = this.parseSupportRequestNumber(supportRequest.srNumber)
      return Number.isFinite(parsedValue) ? Math.max(currentMax, parsedValue) : currentMax
    }, DEFAULT_SR_NUMBER_START - 1)

    return maxSequence + 1
  }

  getQuotationSequenceMonth(referenceDate = new Date()) {
    const date = new Date(referenceDate || Date.now())
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date
    const year = validDate.getFullYear()
    const month = String(validDate.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  buildQuotationNumber(sequence, referenceDate = new Date()) {
    const year = new Date(referenceDate || Date.now()).getFullYear()
    return `SSIPL/${year}/${String(sequence).padStart(4, '0')}`
  }

  parseQuotationNumber(quotationNumber = '') {
    const match = String(quotationNumber).match(/(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : NaN
  }

  buildProjectCode(sequence) {
    return `PRJ${String(sequence).padStart(3, '0')}`
  }

  parseProjectCode(projectCode = '') {
    const match = String(projectCode).match(/(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : NaN
  }

  getNextProjectSequence(existingProjects = this.getFromStorage('projects')) {
    const maxSequence = existingProjects.reduce((currentMax, project) => {
      const parsedValue = this.parseProjectCode(project.projectCode)
      return Number.isFinite(parsedValue) ? Math.max(currentMax, parsedValue) : currentMax
    }, DEFAULT_PROJECT_NUMBER_START - 1)

    return maxSequence + 1
  }

  getNextQuotationSequence(existingQuotations = this.getFromStorage('quotations'), referenceDate = new Date()) {
    const sequenceMonth = this.getQuotationSequenceMonth(referenceDate)
    const maxSequence = existingQuotations.reduce((currentMax, quotation) => {
      const quotationMonth = quotation.quotationSequenceMonth || quotation.data?.quotationSequenceMonth || this.getQuotationSequenceMonth(quotation.quotationDate || quotation.createdAt)
      const parsedValue = this.parseQuotationNumber(quotation.quotationNumber || quotation.quoteNumber || quotation.data?.quotationNumber)
      return quotationMonth === sequenceMonth && Number.isFinite(parsedValue) && parsedValue >= DEFAULT_QUOTATION_NUMBER_START && parsedValue < 10000
        ? Math.max(currentMax, parsedValue)
        : currentMax
    }, DEFAULT_QUOTATION_NUMBER_START - 1)

    return maxSequence + 1
  }

  normalizeDeal(deal = {}, sequenceNumber = DEFAULT_DEAL_NUMBER_START) {
    const createdAt = deal.createdAt || new Date().toISOString()
    const updatedAt = deal.updatedAt || createdAt
    const dealOwner = getCanonicalCrmUserName(deal.dealOwner || deal.ownerName) || String(deal.dealOwner || deal.ownerName || '').trim()
    const customerOwner = getCanonicalCrmUserName(deal.customerOwner) || String(deal.customerOwner || '').trim()
    const ownerUserId = String(
      deal.ownerUserId
      || deal.ownerId
      || deal.assignedTo
      || deal.assignedUserId
      || deal.userId
      || ''
    )
    const assignedTo = String(
      deal.assignedTo
      || deal.assignedUserId
      || ownerUserId
      || deal.userId
      || ''
    )
    const createdBy = String(deal.createdBy || deal.userId || ownerUserId || '')

    return {
      id: deal.id || generateId('DEAL'),
      dealNumber: deal.dealNumber || this.buildDealNumber(sequenceNumber),
      dealDate: deal.dealDate || createdAt.slice(0, 10),
      name: deal.name || '',
      value: Number.isFinite(Number(deal.value)) ? Number(deal.value) : 0,
      status: deal.status || 'new',
      stage: deal.stage || '',
      closeDate: deal.closeDate || '',
      expectedClosureDate: deal.expectedClosureDate || deal.closeDate || '',
      actualClosureDate: deal.actualClosureDate || '',
      description: deal.description || '',
      address: deal.address || '',
      projectName: deal.projectName || '',
      city: deal.city || '',
      ownerName: dealOwner,
      dealOwner,
      dealOwnerName: dealOwner,
      dealOwnerCode: getCrmOwnerCode(dealOwner),
      dealOwnerDisplay: getCrmOwnerDisplay(dealOwner),
      ownerUserId,
      ownerId: ownerUserId,
      dealType: normalizeMarketingValue(deal.dealType || deal.customerCategory || ''),
      dealSource: normalizeMarketingValue(deal.dealSource || deal.source || ''),
      source: normalizeMarketingValue(deal.source || deal.dealSource || ''),
      dealSubsource: deal.dealSubsource || deal.subsource || '',
      subsource: deal.subsource || deal.dealSubsource || '',
      dealCoOwners: deal.dealCoOwners || '',
      quotationCustomerStatus: deal.quotationCustomerStatus || '',
      orderCustomerStatus: deal.orderCustomerStatus || '',
      poValue: deal.poValue || '',
      jobNo: deal.jobNo || '',
      consultantName: deal.consultantName || '',
      probability: Number.isFinite(Number(deal.probability)) ? Number(deal.probability) : 0,
      dealScore: Number.isFinite(Number(deal.dealScore)) ? Number(deal.dealScore) : 0,
      valueCurrency: deal.valueCurrency || 'INR',
      productCategory: deal.productCategory || '',
      customerRefNo: deal.customerRefNo || deal.customerReferenceNumber || '',
      customerReferenceNumber: deal.customerReferenceNumber || deal.customerRefNo || '',
      customerRefDate: deal.customerRefDate || deal.customerReferenceDate || '',
      customerReferenceDate: deal.customerReferenceDate || deal.customerRefDate || '',
      reasonForLost: deal.reasonForLost || '',
      reminderDate: deal.reminderDate || '',
      reminderMode: deal.reminderMode || '',
      reminderNote: deal.reminderNote || '',
      accountId: deal.accountId || '',
      accountName: deal.accountName || '',
      accountNumber: deal.accountNumber || '',
      customerId: deal.customerId || '',
      customerName: deal.customerName || '',
      customerNumber: deal.customerNumber || '',
      customerOwner,
      customerOwnerName: customerOwner,
      customerOwnerCode: getCrmOwnerCode(customerOwner),
      customerOwnerDisplay: getCrmOwnerDisplay(customerOwner),
      customerCategory: deal.customerCategory || '',
      companyName: deal.companyName || '',
      companyProfile: deal.companyProfile || '',
      companyLogo: deal.companyLogo || '',
      gstin: deal.gstin || '',
      contactPerson: deal.contactPerson || '',
      contactName: deal.contactName || deal.contactPerson || '',
      contactPhone: deal.contactPhone || '',
      phone: deal.phone || deal.contactPhone || deal.contactMobile || '',
      contactMobile: deal.contactMobile || '',
      contactEmail: deal.contactEmail || '',
      email: deal.email || deal.contactEmail || '',
      contactDesignation: deal.contactDesignation || '',
      contacts: Array.isArray(deal.contacts)
        ? deal.contacts.map((contact) => ({
          prefix: contact.prefix || '',
          contactPerson: contact.contactPerson || contact.name || '',
          designation: contact.designation || contact.contactDesignation || '',
          phone: contact.phone || contact.mobile || '',
          mobile: contact.mobile || contact.phone || '',
          email: contact.email || '',
          isPrimary: Boolean(contact.isPrimary),
        }))
        : [],
      userId: deal.userId || '',
      assignedTo,
      assignedUserId: deal.assignedUserId || assignedTo,
      assignedUserName: deal.assignedUserName || '',
      createdBy,
      createdAt,
      updatedAt,
    }
  }

  isDuplicateDeal(existingDeals = [], candidate = {}, excludeId = '') {
    const normalizedTitle = this.normalizeValue(candidate.name || candidate.title)
    if (!normalizedTitle) {
      return false
    }

    const normalizedExcludeId = String(excludeId || '').trim()
    const normalizedExcludeDealNumber = this.normalizeValue(candidate.dealNumber)
    const normalizedAccountId = String(candidate.accountId || '').trim()
    const normalizedCustomerId = String(candidate.customerId || '').trim()
    const normalizedAccountName = this.normalizeValue(candidate.accountName || candidate.companyName)
    const normalizedCustomerName = this.normalizeValue(candidate.customerName || candidate.companyName)

    return existingDeals.some((deal) => {
      const dealId = String(deal.id || '').trim()
      const dealNumber = this.normalizeValue(deal.dealNumber)

      if (
        (normalizedExcludeId && dealId === normalizedExcludeId)
        || (normalizedExcludeDealNumber && dealNumber === normalizedExcludeDealNumber)
      ) {
        return false
      }

      const sameTitle = this.normalizeValue(deal.name || deal.title) === normalizedTitle
      if (!sameTitle) {
        return false
      }

      const sameAccountId = String(deal.accountId || '').trim() && String(deal.accountId || '').trim() === normalizedAccountId
      const sameCustomerId = String(deal.customerId || '').trim() && String(deal.customerId || '').trim() === normalizedCustomerId
      const sameAccountName = normalizedAccountName && this.normalizeValue(deal.accountName) === normalizedAccountName
      const sameCustomerName = normalizedCustomerName && this.normalizeValue(deal.customerName) === normalizedCustomerName

      return sameAccountId || sameCustomerId || sameAccountName || sameCustomerName
    })
  }

  shouldCheckDealDuplicate(existingDeal = {}, updates = {}) {
    const duplicateSensitiveFields = [
      'name',
      'title',
      'accountId',
      'customerId',
      'accountName',
      'customerName',
      'companyName',
    ]

    return duplicateSensitiveFields.some((field) => (
      Object.prototype.hasOwnProperty.call(updates, field)
      && this.normalizeValue(updates[field]) !== this.normalizeValue(existingDeal[field])
    ))
  }

  normalizeSupportRequest(supportRequest = {}, sequenceNumber = DEFAULT_SR_NUMBER_START) {
    const createdAt = supportRequest.createdAt || new Date().toISOString()
    const updatedAt = supportRequest.updatedAt || createdAt

    return {
      id: supportRequest.id || generateId('SR'),
      srNumber: supportRequest.srNumber || this.buildSupportRequestNumber(sequenceNumber),
      customerName: supportRequest.customerName || '',
      customerEmail: supportRequest.customerEmail || '',
      customerPhone: supportRequest.customerPhone || '',
      customerMobile: supportRequest.customerMobile || '',
      customerCompany: supportRequest.customerCompany || '',
      requestType: supportRequest.requestType || '',
      title: supportRequest.title || '',
      description: supportRequest.description || '',
      onSiteRequirements: supportRequest.onSiteRequirements || '',
      onHoldReason: supportRequest.onHoldReason || '',
      postponedReason: supportRequest.postponedReason || '',
      priority: supportRequest.priority || 'medium',
      status: supportRequest.status || 'open',
      srDate: supportRequest.srDate || createdAt.slice(0, 10),
      referenceNumber: supportRequest.referenceNumber || '',
      reopenedOn: supportRequest.reopenedOn || '',
      locationName: supportRequest.locationName || '',
      country: supportRequest.country || '',
      state: supportRequest.state || '',
      city: supportRequest.city || '',
      address: supportRequest.address || '',
      zipCode: supportRequest.zipCode || '',
      latitude: supportRequest.latitude || '',
      longitude: supportRequest.longitude || '',
      locationAccuracy: supportRequest.locationAccuracy || '',
      locationCapturedAt: supportRequest.locationCapturedAt || '',
      locationSource: supportRequest.locationSource || '',
      contactPerson: supportRequest.contactPerson || '',
      contactDesignation: supportRequest.contactDesignation || '',
      contactEmail: supportRequest.contactEmail || '',
      contactPhone: supportRequest.contactPhone || '',
      contactMobile: supportRequest.contactMobile || '',
      notes: supportRequest.notes || '',
      remarks: Array.isArray(supportRequest.remarks) ? supportRequest.remarks : [],
      reminders: Array.isArray(supportRequest.reminders) ? supportRequest.reminders : [],
      documents: Array.isArray(supportRequest.documents) ? supportRequest.documents : [],
      extensions: Array.isArray(supportRequest.extensions) ? supportRequest.extensions : [],
      reminderDate: supportRequest.reminderDate || '',
      reminderTime: supportRequest.reminderTime || '',
      reminderMode: supportRequest.reminderMode || '',
      reminderNote: supportRequest.reminderNote || '',
      extendedUntil: supportRequest.extendedUntil || '',
      extendedTime: supportRequest.extendedTime || '',
      extendReason: supportRequest.extendReason || '',
      attachmentNames: Array.isArray(supportRequest.attachmentNames) ? supportRequest.attachmentNames : [],
      ownerId: supportRequest.ownerId || '',
      ownerName: supportRequest.ownerName || '',
      addedByName: supportRequest.addedByName || '',
      closedOn: supportRequest.closedOn || '',
      closedByName: supportRequest.closedByName || '',
      userId: supportRequest.userId || '',
      createdAt,
      updatedAt,
    }
  }

  normalizeProject(project = {}, sequenceNumber = DEFAULT_PROJECT_NUMBER_START) {
    const createdAt = project.createdAt || project.createdDate || new Date().toISOString()
    const updatedAt = project.updatedAt || project.updatedDate || createdAt

    return {
      id: project.id || project.projectId || generateId('PRJ'),
      projectId: project.projectId || project.id || '',
      projectCode: project.projectCode || this.buildProjectCode(sequenceNumber),
      projectName: project.projectName || '',
      projectDescription: project.projectDescription || '',
      accountId: project.accountId || '',
      accountName: project.accountName || '',
      customerId: project.customerId || '',
      customerName: project.customerName || '',
      consultantName: project.consultantName || '',
      architectName: project.architectName || '',
      pmcName: project.pmcName || '',
      projectType: project.projectType || '',
      projectStatus: project.projectStatus || 'Active',
      projectLocation: project.projectLocation || '',
      projectValue: Number.isFinite(Number(project.projectValue)) ? Number(project.projectValue) : 0,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      createdBy: project.createdBy || project.userId || '',
      updatedBy: project.updatedBy || project.userId || '',
      userId: project.userId || project.createdBy || '',
      createdAt,
      updatedAt,
    }
  }

  // Projects
  async getProjects(userOrId, isAdmin = false) {
    await this.simulateDelay()
    const rawProjects = this.getFromStorage('projects')
    let nextSequence = this.getNextProjectSequence(rawProjects)

    const projects = rawProjects.map((project) => {
      const normalizedProject = this.normalizeProject(project, nextSequence)
      if (!project.projectCode) {
        nextSequence += 1
      }
      return normalizedProject
    })

    return isAdmin ? projects : projects.filter((project) => this.matchesUserScope(project, userOrId))
  }

  async createProject(projectData) {
    await this.simulateDelay()
    const projects = await this.getProjects('', true)
    const nextSequence = this.getNextProjectSequence(projects)
    const project = this.normalizeProject({
      ...projectData,
      id: generateId('PRJ'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, nextSequence)

    projects.push(project)
    this.saveToStorage('projects', projects)
    return project
  }

  async updateProject(id, updates) {
    await this.simulateDelay()
    const projects = await this.getProjects('', true)
    const index = projects.findIndex((project) => String(project.id) === String(id) || String(project.projectId) === String(id))
    if (index === -1) throw new Error('Project not found')

    projects[index] = this.normalizeProject({
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }, this.parseProjectCode(projects[index].projectCode) || this.getNextProjectSequence(projects))

    this.saveToStorage('projects', projects)
    return projects[index]
  }

  async deleteProject(id) {
    await this.simulateDelay()
    const projects = await this.getProjects('', true)
    const filteredProjects = projects.filter((project) => String(project.id) !== String(id) && String(project.projectId) !== String(id))
    this.saveToStorage('projects', filteredProjects)
  }

  // Deals
  async getDeals(userOrId, isAdmin = false) {
    await this.simulateDelay()
    const rawDeals = this.getFromStorage('deals')
    let nextSequence = this.getNextDealSequence(rawDeals)

    const deals = rawDeals.map((deal) => {
      const normalizedDeal = this.normalizeDeal(deal, nextSequence)
      if (!deal.dealNumber) {
        nextSequence += 1
      }
      return normalizedDeal
    })

    return isAdmin ? deals : deals.filter((deal) => this.matchesUserScope(deal, userOrId))
  }

  async createDeal(dealData) {
    await this.simulateDelay()
    const deals = await this.getDeals('', true)
    const nextSequence = this.getNextDealSequence(deals)
    if (this.isDuplicateDeal(deals, dealData)) {
      throw new Error('A deal with the same name already exists for this account or customer')
    }

    const newDeal = this.normalizeDeal({
      ...dealData,
      id: generateId('DEAL'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, nextSequence)

    deals.push(newDeal)
    this.saveToStorage('deals', deals)
    return newDeal
  }

  async updateDeal(id, updates) {
    await this.simulateDelay()
    const deals = await this.getDeals('', true)
    const index = deals.findIndex(d => d.id === id)

    if (index === -1) throw new Error('Deal not found')

    const existingDeal = deals[index]
    const nextDeal = {
      ...existingDeal,
      ...updates,
    }
    if (this.shouldCheckDealDuplicate(existingDeal, updates) && this.isDuplicateDeal(deals, nextDeal, id)) {
      throw new Error('A deal with the same name already exists for this account or customer')
    }

    deals[index] = this.normalizeDeal({
      ...nextDeal,
      updatedAt: new Date().toISOString()
    }, this.parseDealNumber(deals[index].dealNumber) || this.getNextDealSequence(deals))

    this.saveToStorage('deals', deals)
    return deals[index]
  }

  async deleteDeal(id) {
    await this.simulateDelay()
    const deals = await this.getDeals('', true)
    const filteredDeals = deals.filter((deal) => deal.id !== id)
    this.saveToStorage('deals', filteredDeals)
  }

  // Support Requests
  async getSupportRequests(userOrId, isAdmin = false) {
    await this.simulateDelay()
    const rawSupportRequests = this.getFromStorage('supportRequests')
    let nextSequence = this.getNextSupportRequestSequence(rawSupportRequests)

    const supportRequests = rawSupportRequests.map((supportRequest) => {
      const normalizedSupportRequest = this.normalizeSupportRequest(supportRequest, nextSequence)
      if (!supportRequest.srNumber) {
        nextSequence += 1
      }
      return normalizedSupportRequest
    })

    return isAdmin
      ? supportRequests
      : supportRequests.filter((supportRequest) => this.matchesUserScope(supportRequest, userOrId))
  }

  async createSupportRequest(supportRequestData) {
    await this.simulateDelay()
    const supportRequests = await this.getSupportRequests('', true)
    const nextSequence = this.getNextSupportRequestSequence(supportRequests)

    const newSupportRequest = this.normalizeSupportRequest({
      ...supportRequestData,
      id: generateId('SR'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, nextSequence)

    supportRequests.push(newSupportRequest)
    this.saveToStorage('supportRequests', supportRequests)
    return newSupportRequest
  }

  async updateSupportRequest(id, updates) {
    await this.simulateDelay()
    const supportRequests = await this.getSupportRequests('', true)
    const index = supportRequests.findIndex((supportRequest) => supportRequest.id === id)

    if (index === -1) throw new Error('Support request not found')

    supportRequests[index] = this.normalizeSupportRequest({
      ...supportRequests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }, this.parseSupportRequestNumber(supportRequests[index].srNumber) || this.getNextSupportRequestSequence(supportRequests))

    this.saveToStorage('supportRequests', supportRequests)
    return supportRequests[index]
  }

  async deleteSupportRequest(id) {
    await this.simulateDelay()
    const supportRequests = await this.getSupportRequests('', true)
    const filteredSupportRequests = supportRequests.filter((supportRequest) => supportRequest.id !== id)
    this.saveToStorage('supportRequests', filteredSupportRequests)
  }

  // Tasks
  async getTasks(userOrId, isAdmin = false) {
    await this.simulateDelay()
    const tasks = this.getFromStorage('tasks')
    return isAdmin ? tasks : tasks.filter((task) => this.matchesUserScope(task, userOrId))
  }

  async createTask(taskData) {
    await this.simulateDelay()
    const tasks = this.getFromStorage('tasks')

    const newTask = {
      id: generateId('TASK'),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    tasks.push(newTask)
    this.saveToStorage('tasks', tasks)
    return newTask
  }

  async updateTask(id, updates) {
    await this.simulateDelay()
    const tasks = this.getFromStorage('tasks')
    const index = tasks.findIndex(t => t.id === id)

    if (index === -1) throw new Error('Task not found')

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.saveToStorage('tasks', tasks)
    return tasks[index]
  }

  async deleteTask(id) {
    await this.simulateDelay()
    const tasks = this.getFromStorage('tasks')
    const filtered = tasks.filter(t => t.id !== id)
    this.saveToStorage('tasks', filtered)
  }

  // Quotations
  async getQuotations(userId, isAdmin = false) {
    await this.simulateDelay()
    const quotations = this.getFromStorage('quotations')
    return isAdmin ? quotations : quotations.filter(q => q.userId === userId)
  }

  async createQuotation(quotationData) {
    await this.simulateDelay()
    const quotations = this.getFromStorage('quotations')
    const sequence = this.getNextQuotationSequence(quotations)
    const computedAmount = Number.isFinite(Number(quotationData.amount)) ? Number(quotationData.amount) : 0

    const newQuotation = {
      ...quotationData,
      id: generateId('QUO'),
      quotationNumber: quotationData.quotationNumber || this.buildQuotationNumber(sequence),
      clientName: quotationData.clientName || '',
      companyName: quotationData.companyName || '',
      projectName: quotationData.projectName || '',
      amount: computedAmount,
      validUntil: quotationData.validUntil || new Date().toISOString().slice(0, 10),
      status: quotationData.status || 'draft',
      userId: quotationData.userId || '',
      quotationFileName: quotationData.quotationFileName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    quotations.push(newQuotation)
    this.saveToStorage('quotations', quotations)
    return newQuotation
  }

  async updateQuotation(id, updates) {
    await this.simulateDelay()
    const quotations = this.getFromStorage('quotations')
    const index = quotations.findIndex((quotation) => quotation.id === id)

    if (index === -1) {
      throw new Error('Quotation not found')
    }

    const amount = updates.amount === undefined
      ? quotations[index].amount
      : (Number.isFinite(Number(updates.amount)) ? Number(updates.amount) : 0)

    quotations[index] = {
      ...quotations[index],
      ...updates,
      amount,
      updatedAt: new Date().toISOString(),
    }

    this.saveToStorage('quotations', quotations)
    return quotations[index]
  }

  // Utility
  simulateDelay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Keep a no-op initializer for older callers; new accounts start with empty data.
  initializeSampleData() {
    return []
  }
}

export const dataService = new DataService()
