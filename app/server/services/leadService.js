const leadRepository = require('../repositories/leadRepository')
const userRepository = require('../repositories/userRepository')
const dealService = require('./dealService')
const convertedDealRepository = require('../repositories/convertedDealRepository')
const { AppError } = require('../utils/appError')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')
const { createLeadNotificationMessage, notifyUsers } = require('./notificationService')
const remarkService = require('./remarkService')
const { applyOwnershipMetadata, assertRecordAccess, isPrivilegedRole, toNumberOrNull } = require('../security/accessScope')
const { getCrmGroupOwnerCodesForUser, getCrmOwnerRecord } = require('../features/crmUserDirectory')

const normalizeLeadId = (leadId) => {
  const parsed = toNumberOrNull(leadId)
  if (parsed === null) {
    throw new AppError('Lead id is invalid.', 400)
  }

  return parsed
}

const normalizeOwnerNameInput = (value) => String(value || '')
  .trim()
  .replace(/^\d+\s*-\s*/u, '')

const normalizeOwnerCodeInput = (value) => {
  const parsedValue = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const emitConvertedDealRealtime = (action, convertedDeal, actor) => {
  const socketServer = getSocketServer()
  if (!socketServer || !convertedDeal) return

  const payload = {
    action,
    record: convertedDeal,
    recordId: convertedDeal.id,
    entityType: 'converted-deal',
    actor: { id: actor.id, name: actor.name, role: actor.role },
  }

  socketServer.emitToAdmins(`converted-deal:${action}`, payload)
  const assignedUserId = convertedDeal.assignedTo || convertedDeal.ownerUserId || convertedDeal.createdBy
  if (assignedUserId) {
    socketServer.emitToUser(assignedUserId, `converted-deal:${action}`, payload)
  }
}

const resolveAssignedUser = async (payload = {}, actor) => {
  if (payload.assignedTo) {
    return userRepository.findUserById(payload.assignedTo)
  }

  const ownerName = normalizeOwnerNameInput(payload.accountOwner || payload.ownerName || '')
  if (ownerName) {
    const user = await userRepository.findUserByName(ownerName)
    if (user) {
      return user
    }
  }

  return actor.role === 'user'
    ? userRepository.findUserById(actor.id)
    : null
}

const resolveAccountScope = async (actor, { includeGroupScope = true } = {}) => {
  if (isPrivilegedRole(actor.role) || !includeGroupScope) {
    return {
      actor,
      queryOptions: { companyWide: isPrivilegedRole(actor.role) },
    }
  }

  const scopeOwnerCodes = getCrmGroupOwnerCodesForUser(actor)
  const groupUsers = scopeOwnerCodes.length
    ? await userRepository.findUsersByOwnerCodes(scopeOwnerCodes, actor.companyId)
    : []
  const scopeUserIds = Array.from(new Set([
    actor.id,
    ...groupUsers.map((entry) => entry.id),
  ].filter(Boolean)))

  const scopedActor = {
    ...actor,
    scopeUserIds,
    scopeOwnerCodes,
  }

  return {
    actor: scopedActor,
    queryOptions: {
      companyWide: false,
      scopeUserIds,
      scopeOwnerCodes,
    },
  }
}

const isLeadCreatedByActor = (lead = {}, actor = {}) => {
  if (isPrivilegedRole(actor.role)) return true
  const actorId = String(actor.id || '')
  return [
    lead.createdBy,
    lead.createdByUserId,
    lead.userId,
    lead.formData?.userId,
    lead.formData?.createdByUserId,
  ].map((value) => String(value || '')).filter(Boolean).includes(actorId)
}

const buildLeadPayload = async (payload = {}, actor, existingLead = null) => {
  const sanitizedPayload = { ...payload }
  delete sanitizedPayload.accountNumber
  delete sanitizedPayload.accountNo
  delete sanitizedPayload.account_no

  const assignedUser = await resolveAssignedUser(sanitizedPayload, actor)
  const requestedOwnerCode = normalizeOwnerCodeInput(
    payload.accountOwnerCode
    || payload.ownerCode
    || existingLead?.accountOwnerCode
    || existingLead?.ownerCode
  )
  const ownerRecord = getCrmOwnerRecord(
    requestedOwnerCode
    || sanitizedPayload.accountOwner
    || sanitizedPayload.ownerName
    || assignedUser?.ownerCode
    || assignedUser?.name
    || existingLead?.accountNo
    || existingLead?.accountOwner
  )
  const ownerName = normalizeOwnerNameInput(
    ownerRecord?.name
    || sanitizedPayload.accountOwner
    || sanitizedPayload.ownerName
    || assignedUser?.name
    || existingLead?.accountOwner
    || ''
  )
  const ownerCode = ownerRecord?.ownerCode || requestedOwnerCode || assignedUser?.ownerCode || existingLead?.accountOwnerCode || null
  const accountNo = existingLead?.accountNo
    || existingLead?.accountNumber
    || payload.accountNo
    || payload.accountNumber
    || payload.account_no
    || null
  const normalizedPayload = applyOwnershipMetadata(actor, {
    customerName: sanitizedPayload.accountName || sanitizedPayload.customerName || existingLead?.customerName || '',
    mobile: sanitizedPayload.alternatePhone || sanitizedPayload.mobile || existingLead?.mobile || '',
    email: sanitizedPayload.alternateEmail || sanitizedPayload.email || existingLead?.email || '',
    company: sanitizedPayload.projectName || sanitizedPayload.company || existingLead?.company || '',
    projectName: sanitizedPayload.projectName || existingLead?.projectName || '',
    status: sanitizedPayload.accountState || sanitizedPayload.status || existingLead?.status || 'pending',
    assignedTo: assignedUser?.id || existingLead?.assignedTo || null,
    createdBy: existingLead?.createdBy || actor.id,
    ownerName,
    notes: sanitizedPayload.remark || sanitizedPayload.notes || existingLead?.notes || '',
    formType: sanitizedPayload.formType || existingLead?.formType || 'account',
    accountNo,
    createdByUserId: existingLead?.createdByUserId || existingLead?.createdBy || actor.id,
    createdByUserName: existingLead?.createdByUserName || actor.name || actor.username || '',
    employeeId: sanitizedPayload.employeeId || existingLead?.employeeId || actor.ownerCode || '',
    department: sanitizedPayload.department || existingLead?.department || '',
    userEmail: sanitizedPayload.userEmail || existingLead?.userEmail || actor.email || '',
    formData: {
      ...(existingLead || {}),
      ...sanitizedPayload,
      accountNumber: accountNo,
      accountNo,
      account_no: accountNo,
      accountOwner: ownerName,
      accountOwnerCode: ownerCode,
      ownerId: assignedUser?.id || existingLead?.assignedTo || null,
      assignedUserId: assignedUser?.id || existingLead?.assignedTo || null,
      userId: existingLead?.createdBy || actor.id,
      createdByUserId: existingLead?.createdByUserId || existingLead?.createdBy || actor.id,
      createdByUserName: existingLead?.createdByUserName || actor.name || actor.username || '',
      employeeId: sanitizedPayload.employeeId || existingLead?.employeeId || actor.ownerCode || '',
      department: sanitizedPayload.department || existingLead?.department || '',
      userEmail: sanitizedPayload.userEmail || existingLead?.userEmail || actor.email || '',
      status: sanitizedPayload.accountState || sanitizedPayload.status || existingLead?.status || 'pending',
    },
  }, existingLead)

  return normalizedPayload
}

const emitLeadRealtime = async ({ action, lead, actor, assignedUserId, previousLead = null }) => {
  const socketServer = getSocketServer()
  if (!socketServer) {
    return
  }

  const recipients = [assignedUserId, isPrivilegedRole(actor.role) ? null : actor.id].filter(Boolean)
  const recordName = lead.accountName || lead.customerName || 'lead'
  const notificationMessage = createLeadNotificationMessage({
    actorName: actor.name,
    recordName,
    action,
  })

  const notificationRecipients = isPrivilegedRole(actor.role)
    ? [assignedUserId].filter(Boolean)
    : []

  if (action === 'created') {
    socketServer.emitToAdmins(SOCKET_EVENTS.CREATE_LEAD, lead)
    socketServer.emitToAdmins(SOCKET_EVENTS.NEW_LEAD, { action: 'created', record: lead })
  } else {
    socketServer.emitToAdmins(SOCKET_EVENTS.UPDATE_LEAD, lead)
    socketServer.emitToAdmins(SOCKET_EVENTS.LEAD_UPDATED, { action: 'updated', record: lead, previousRecord: previousLead })
    socketServer.emitToAdmins(SOCKET_EVENTS.FORM_UPDATED, lead)
  }

  socketServer.emitToAdmins(SOCKET_EVENTS.DASHBOARD_UPDATE, {
    entityType: 'lead',
    action,
    recordId: lead.id,
    record: lead,
    companyId: actor.companyId,
  })

  if (assignedUserId) {
    if (action === 'created') {
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.CREATE_LEAD, lead)
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.NEW_LEAD, { action: 'created', record: lead })
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.LEAD_ASSIGNED, lead)
    } else {
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.UPDATE_LEAD, lead)
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.LEAD_UPDATED, { action: 'updated', record: lead, previousRecord: previousLead })
      socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.FORM_UPDATED, lead)
    }

    socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.DASHBOARD_UPDATE, {
      entityType: 'lead',
      action,
      recordId: lead.id,
      record: lead,
      companyId: actor.companyId,
    })
  }

  if (notificationRecipients.length > 0) {
    const notifications = await notifyUsers({
      senderId: actor.id,
      receiverIds: notificationRecipients,
      message: notificationMessage,
      companyId: actor.companyId,
    })

    notifications.forEach((notification) => {
      socketServer.emitToUser(notification.receiverId, SOCKET_EVENTS.PRIVATE_NOTIFICATION, notification)
      socketServer.emitToUser(notification.receiverId, SOCKET_EVENTS.NOTIFICATION, notification)
    })
  }

  if (!isPrivilegedRole(actor.role)) {
    const adminUsers = await userRepository.listAllUsers(actor.companyId)
    const adminIds = adminUsers.filter((entry) => isPrivilegedRole(entry.role)).map((entry) => entry.id)
    const notifications = await notifyUsers({
      senderId: actor.id,
      receiverIds: adminIds,
      message: notificationMessage,
      companyId: actor.companyId,
    })

    notifications.forEach((notification) => {
      socketServer.emitToUser(notification.receiverId, SOCKET_EVENTS.PRIVATE_NOTIFICATION, notification)
      socketServer.emitToUser(notification.receiverId, SOCKET_EVENTS.NOTIFICATION, notification)
    })
  }

  socketServer.pushActivity(`lead-${action}`, actor, {
    leadId: lead.id,
    assignedUserId,
    recipients,
  })
}

const listLeads = async (actor, query = {}) => {
  if (!isPrivilegedRole(actor.role) && leadRepository.listCreatedLeadsForActor) {
    return leadRepository.listCreatedLeadsForActor(actor, query)
  }

  const scope = await resolveAccountScope(actor)
  if (leadRepository.listLeadsForActor) {
    return leadRepository.listLeadsForActor(scope.actor, {
      ...scope.queryOptions,
      filters: query,
    })
  }

  return isPrivilegedRole(actor.role)
    ? leadRepository.listAllLeads()
    : leadRepository.listAssignedLeads(actor.id)
}

const getLeadById = async (actor, leadId, { includeGroupScope = true } = {}) => {
  const normalizedLeadId = normalizeLeadId(leadId)
  const scope = await resolveAccountScope(actor, { includeGroupScope })
  const lead = leadRepository.findLeadByIdForActor
    ? await leadRepository.findLeadByIdForActor(normalizedLeadId, scope.actor, scope.queryOptions)
    : await leadRepository.findLeadById(normalizedLeadId)

  if (!lead) {
    throw new AppError('Lead not found.', 404)
  }

  assertRecordAccess(scope.actor, lead, 'lead')
  if (!isLeadCreatedByActor(lead, actor)) {
    throw new AppError('You do not have permission to access this lead.', 403)
  }

  return lead
}

const createLead = async (actor, payload) => {
  const leadPayload = await buildLeadPayload(payload, actor)
  const lead = await leadRepository.createLead(leadPayload)
  await emitLeadRealtime({
    action: 'created',
    lead,
    actor,
    assignedUserId: lead.assignedTo,
  })

  return lead
}

const deleteLead = async (actor, leadId) => {
  const existingLead = await getLeadById(actor, leadId, { includeGroupScope: false })
  const removed = await leadRepository.deleteLead(normalizeLeadId(leadId))

  if (!removed) {
    throw new AppError('Lead not found.', 404)
  }

  const socketServer = getSocketServer()
  if (socketServer) {
    socketServer.emitToAdmins(SOCKET_EVENTS.LEAD_UPDATED, {
      action: 'deleted',
      record: existingLead,
      previousRecord: existingLead,
    })
    socketServer.emitToAdmins(SOCKET_EVENTS.DASHBOARD_UPDATE, {
      entityType: 'lead',
      action: 'deleted',
      recordId: existingLead.id,
      record: existingLead,
      companyId: actor.companyId,
    })
    if (existingLead.assignedTo) {
      socketServer.emitToUser(existingLead.assignedTo, SOCKET_EVENTS.LEAD_UPDATED, {
        action: 'deleted',
        record: existingLead,
        previousRecord: existingLead,
      })
    }
    socketServer.pushActivity('lead-deleted', actor, {
      leadId: existingLead.id,
      assignedUserId: existingLead.assignedTo,
    })
  }

  return existingLead
}

const updateLead = async (actor, leadId, payload) => {
  const existingLead = await getLeadById(actor, leadId, { includeGroupScope: false })

  if (!isPrivilegedRole(actor.role)) {
    const disallowedKeys = ['assignedTo', 'ownerId', 'assignedUserId']
    const attemptedRestrictedChange = disallowedKeys.some((key) => payload[key] && payload[key] !== existingLead.assignedTo)

    if (attemptedRestrictedChange) {
      throw new AppError('You cannot reassign this lead.', 403)
    }
  }

  const leadPayload = await buildLeadPayload(payload, actor, existingLead)
  const updatedLead = await leadRepository.updateLead(normalizeLeadId(leadId), leadPayload)

  if (!updatedLead) {
    throw new AppError('Lead not found.', 404)
  }

  await emitLeadRealtime({
    action: 'updated',
    lead: updatedLead,
    actor,
    assignedUserId: updatedLead.assignedTo,
    previousLead: existingLead,
  })

  if (updatedLead.isConverted && updatedLead.dealId) {
    const convertedDeal = await convertedDealRepository.syncFromDeal({ id: updatedLead.dealId })
    emitConvertedDealRealtime('updated', convertedDeal, actor)
  }

  return updatedLead
}

const buildDealPayloadFromAccount = (account = {}, actor = {}) => {
  const dealTitle = account.projectName || account.accountName || account.customerName || account.name || 'Converted Deal'
  const ownerUserId = account.ownerUserId || account.assignedTo || account.createdBy || actor.id
  const ownerName = account.accountOwner || account.ownerName || actor.name || ''

  return {
    title: dealTitle,
    name: dealTitle,
    customerName: account.customerName || account.accountName || account.name || '',
    accountId: account.id,
    accountName: account.accountName || account.name || account.customerName || '',
    accountNumber: account.accountNumber || account.accountNo || '',
    linkedAccountName: account.accountName || account.name || account.customerName || '',
    linkedAccountNumber: account.accountNumber || account.accountNo || '',
    customerId: account.customerId || null,
    customerNumber: account.customerNumber || account.accountNumber || account.accountNo || '',
    amount: account.projectValue || account.value || account.amount || null,
    value: account.projectValue || account.value || account.amount || null,
    currency: account.currency || 'INR',
    stage: 'converted',
    status: 'converted',
    assignedTo: ownerUserId,
    ownerUserId,
    ownerName,
    dealOwner: ownerName,
    createdBy: account.createdBy || actor.id,
    convertedFromAccount: true,
    conversionSource: 'search-account',
    convertedAt: new Date().toISOString(),
    convertedBy: actor.id,
    projectName: account.projectName || '',
    consultantName: account.consultantName || '',
    description: account.description || account.notes || '',
    notes: `Converted from account ${account.accountNumber || account.accountNo || account.id || ''}`.trim(),
    companyId: account.companyId || actor.companyId || 1,
    organizationId: account.organizationId || account.companyId || actor.companyId || 1,
  }
}

const convertLeadToDeal = async (actor, leadId) => {
  const account = await getLeadById(actor, leadId, { includeGroupScope: false })
  if (account.isConverted || account.dealId) {
    throw new AppError('This Account is already converted to a Deal.', 409)
  }

  const deal = await dealService.create(actor, buildDealPayloadFromAccount(account, actor))
  const convertedDeal = await convertedDealRepository.syncFromDeal(deal)
  const convertedAt = new Date().toISOString()
  const updatedAccount = await leadRepository.updateLead(normalizeLeadId(leadId), {
    isConverted: true,
    convertedAt,
    convertedBy: actor.id,
    accountId: account.id,
    dealId: deal.id,
    convertedDealId: convertedDeal?.id || null,
    status: 'converted',
    accountState: 'converted',
    formData: {
      ...(account.formData || account.raw?.formData || {}),
      ...account,
      isConverted: true,
      convertedAt,
      convertedBy: actor.id,
      accountId: account.id,
      dealId: deal.id,
      convertedDealId: convertedDeal?.id || null,
      accountState: 'converted',
      status: 'converted',
    },
  })

  await emitLeadRealtime({
    action: 'updated',
    lead: updatedAccount,
    actor,
    assignedUserId: updatedAccount.assignedTo,
    previousLead: account,
  })
  emitConvertedDealRealtime('created', convertedDeal, actor)

  return {
    account: updatedAccount,
    deal,
    convertedDeal,
  }
}

const normalizeBulkIds = (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Please select at least one account.', 400)
  }

  return Array.from(new Set(ids.map((id) => normalizeLeadId(id))))
}

const bulkAddRemark = async (actor, payload = {}) => {
  const ids = normalizeBulkIds(payload.ids)
  const content = String(payload.content || payload.remark || '').trim()
  const category = String(payload.category || 'general').trim() || 'general'

  if (!content) {
    throw new AppError('Remark is required.', 400)
  }

  const remarks = []

  for (const leadId of ids) {
    await getLeadById(actor, leadId, { includeGroupScope: false })
    const remark = await remarkService.createRemark({
      actor,
      accountId: leadId,
      category,
      content,
      createdBy: actor.id,
    })
    remarks.push(remark)
  }

  return {
    updatedCount: remarks.length,
    remarks,
  }
}

const bulkReassign = async (actor, payload = {}) => {
  if (!isPrivilegedRole(actor.role)) {
    throw new AppError('You cannot reassign this lead.', 403)
  }

  const ids = normalizeBulkIds(payload.ids)
  const assignedTo = payload.assignedTo || payload.ownerId || payload.assignedUserId || ''
  const ownerName = normalizeOwnerNameInput(payload.ownerName || payload.accountOwner || '')
  const hasNumericAssignedTo = /^\d+$/.test(String(assignedTo))

  if (!hasNumericAssignedTo && !ownerName) {
    throw new AppError('Assigned user is required.', 400)
  }

  const updatedLeads = []

  for (const leadId of ids) {
    const leadPayload = {
      accountOwner: ownerName,
      ownerName,
    }

    if (hasNumericAssignedTo) {
      leadPayload.assignedTo = assignedTo
      leadPayload.ownerId = assignedTo
      leadPayload.assignedUserId = assignedTo
    }

    const updatedLead = await updateLead(actor, leadId, leadPayload)
    updatedLeads.push(updatedLead)
  }

  return {
    updatedCount: updatedLeads.length,
    records: updatedLeads,
  }
}

module.exports = {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToDeal,
  bulkAddRemark,
  bulkReassign,
}
