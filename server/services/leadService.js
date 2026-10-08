const leadRepository = require('../repositories/leadRepository')
const userRepository = require('../repositories/userRepository')
const dealService = require('./dealService')
const customerService = require('./customerService')
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
  const ownerName = normalizeOwnerNameInput(payload.accountOwner || payload.ownerName || '')
  if (ownerName) {
    const user = await userRepository.findUserByName(ownerName)
    if (user) {
      return user
    }
  }

  if (payload.assignedTo) {
    try {
      const userById = await userRepository.findUserById(payload.assignedTo)
      if (userById) return userById
    } catch (err) {
      // ignore cast error
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

  const scopeOwnerCodes = await getCrmGroupOwnerCodesForUser(actor)
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
  const actorName = String(actor.name || '')
  
  const hasIdMatch = [
    lead.createdBy,
    lead.createdByUserId,
    lead.userId,
    lead.formData?.userId,
    lead.formData?.createdByUserId,
    lead.assignedTo,
    lead.assignedUserId,
    lead.ownerId,
    lead.ownerUserId,
  ].map((value) => String(value || '')).filter(Boolean).includes(actorId)

  const hasNameMatch = actorName && [
    lead.accountOwner,
    lead.accountOwnerName,
    lead.ownerName,
    lead.assignedUser?.name,
    lead.formData?.accountOwner,
    lead.formData?.ownerName
  ].map((value) => String(value || '')).filter(Boolean).includes(actorName)

  return hasIdMatch || hasNameMatch
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
  const ownerRecord = await getCrmOwnerRecord(
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
  const isNotQuotedPayload = sanitizedPayload.stage === 'not_quoted' || sanitizedPayload.status === 'not_quoted' || sanitizedPayload.accountStatus === 'not_quoted' || sanitizedPayload.status === 'Not Quoted' || sanitizedPayload.stage === 'Not Quoted'
  const isPoConvertedStage = sanitizedPayload.stage === 'convert_to_po' || sanitizedPayload.status === 'convert_to_po' || sanitizedPayload.accountStatus === 'PO Converted' || sanitizedPayload.accountStatus === 'convert_to_po'
  const isExistingSourceProject = sanitizedPayload.creationMode === 'existing-source-project'
  const resolvedPoValue = String(sanitizedPayload.poValue ?? existingLead?.poValue ?? existingLead?.formData?.poValue ?? '').trim()
  if (isPoConvertedStage && !resolvedPoValue && !isExistingSourceProject) {
    throw new AppError('PO Value is required to convert account to PO Converted status.', 400)
  }

  const hasReasonForLost = Object.prototype.hasOwnProperty.call(sanitizedPayload, 'reasonForLost') || Object.prototype.hasOwnProperty.call(sanitizedPayload, 'reasonForLostOrder')
  const resolvedReasonForLost = hasReasonForLost
    ? (sanitizedPayload.reasonForLost || sanitizedPayload.reasonForLostOrder || '')
    : (existingLead?.reasonForLost || existingLead?.reasonForLostOrder || existingLead?.formData?.reasonForLost || existingLead?.formData?.reasonForLostOrder || '')

  const shouldPreserveStatus = Boolean(sanitizedPayload.preserveStatus)
  const targetStatus = shouldPreserveStatus
    ? (existingLead?.status || sanitizedPayload.accountState || sanitizedPayload.status || 'pending')
    : (isExistingSourceProject ? 'new' : (isNotQuotedPayload ? 'not_quoted' : (Boolean(resolvedPoValue) ? 'convert_to_po' : (sanitizedPayload.accountState || sanitizedPayload.status || existingLead?.status || 'pending'))))
  const targetAccountStatus = shouldPreserveStatus
    ? (existingLead?.accountStatus || sanitizedPayload.accountStatus || existingLead?.formData?.accountStatus || 'Pending')
    : (isExistingSourceProject ? 'new' : (isNotQuotedPayload ? 'not_quoted' : (Boolean(resolvedPoValue) ? 'convert_to_po' : (sanitizedPayload.accountStatus || existingLead?.accountStatus || existingLead?.formData?.accountStatus || 'Pending'))))
  const targetAccountState = shouldPreserveStatus
    ? (existingLead?.accountState || sanitizedPayload.accountState || existingLead?.formData?.accountState || 'Pending')
    : (isExistingSourceProject ? 'new' : (isNotQuotedPayload ? 'not_quoted' : (Boolean(resolvedPoValue) ? 'convert_to_po' : (sanitizedPayload.accountState || existingLead?.accountState || existingLead?.formData?.accountState || 'Pending'))))

  const normalizedPayload = applyOwnershipMetadata(actor, {
    ...sanitizedPayload,
    customerName: sanitizedPayload.accountName || sanitizedPayload.customerName || existingLead?.customerName || '',
    mobile: sanitizedPayload.alternatePhone || sanitizedPayload.mobile || existingLead?.mobile || '',
    email: sanitizedPayload.alternateEmail || sanitizedPayload.email || existingLead?.email || '',
    company: sanitizedPayload.projectName !== undefined ? sanitizedPayload.projectName : (sanitizedPayload.company || existingLead?.company || ''),
    projectName: sanitizedPayload.projectName !== undefined ? sanitizedPayload.projectName : (existingLead?.projectName || ''),
    dealName: sanitizedPayload.dealName !== undefined ? sanitizedPayload.dealName : (sanitizedPayload.projectName !== undefined ? sanitizedPayload.projectName : (existingLead?.dealName || existingLead?.projectName || '')),
    status: targetStatus,
    stage: shouldPreserveStatus ? (existingLead?.stage || 'new') : (isExistingSourceProject ? 'new' : (isNotQuotedPayload ? 'not_quoted' : (sanitizedPayload.stage || existingLead?.stage || 'new'))),
    accountStatus: targetAccountStatus,
    accountState: targetAccountState,
    reasonForLost: resolvedReasonForLost,
    reasonForLostOrder: resolvedReasonForLost,
    assignedTo: assignedUser?.id || existingLead?.assignedTo || null,
    createdBy: existingLead?.createdBy || actor.id,
    ownerName,
    notes: sanitizedPayload.remark || sanitizedPayload.notes || existingLead?.notes || '',
    formType: sanitizedPayload.formType || existingLead?.formType || 'account',
    accountNo,
    createdByUserId: existingLead?.createdByUserId || existingLead?.createdBy || actor.id,
    createdByUserName: existingLead?.createdByUserName || actor.name || actor.username || '',
    createdUserBy: existingLead?.createdUserBy || actor.email || actor.username || '',
    ownerCode: ownerCode || existingLead?.ownerCode || actor.ownerCode || null,
    accountOwnerCode: ownerCode || existingLead?.accountOwnerCode || null,
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
      assignedTo: assignedUser?.id || existingLead?.assignedTo || null,
      ownerId: assignedUser?.id || existingLead?.assignedTo || null,
      assignedUserId: assignedUser?.id || existingLead?.assignedTo || null,
      userId: existingLead?.createdBy || actor.id,
      createdByUserId: existingLead?.createdByUserId || existingLead?.createdBy || actor.id,
      createdByUserName: existingLead?.createdByUserName || actor.name || actor.username || '',
      createdUserBy: existingLead?.createdUserBy || actor.email || actor.username || '',
      ownerCode: existingLead?.ownerCode || actor.ownerCode || null,
      employeeId: sanitizedPayload.employeeId || existingLead?.employeeId || actor.ownerCode || '',
      department: sanitizedPayload.department || existingLead?.department || '',
      userEmail: sanitizedPayload.userEmail || existingLead?.userEmail || actor.email || '',
      status: targetStatus,
      stage: isNotQuotedPayload ? 'not_quoted' : (sanitizedPayload.stage || existingLead?.stage || 'new'),
      accountStatus: targetAccountStatus,
      accountState: targetAccountState,
      projectName: sanitizedPayload.projectName !== undefined ? sanitizedPayload.projectName : (existingLead?.projectName || ''),
      dealName: sanitizedPayload.dealName !== undefined ? sanitizedPayload.dealName : (sanitizedPayload.projectName !== undefined ? sanitizedPayload.projectName : (existingLead?.dealName || existingLead?.projectName || '')),
      reasonForLost: resolvedReasonForLost,
      reasonForLostOrder: resolvedReasonForLost,
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

  const notificationRecipients = [assignedUserId].filter((id) => Boolean(id) && id !== actor.id)

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
      notificationType: `account_${action}`,
      entityType: 'account',
      entityId: lead.id,
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
      notificationType: `account_${action}`,
      entityType: 'account',
      entityId: lead.id,
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

const augmentLeadsWithOwnerCode = async (leads) => {
  if (!Array.isArray(leads)) return leads

  return leads.map((lead) => {
    const ownerCode = lead.ownerCode || null

    if (ownerCode) {
      return {
        ...lead,
        accountNumber: ownerCode,
        accountNo: ownerCode,
      }
    }

    return lead
  })
}

const augmentLeadWithOwnerCode = async (lead) => {
  if (!lead) return lead
  const augmented = await augmentLeadsWithOwnerCode([lead])
  return augmented[0]
}

const listLeads = async (actor, query = {}) => {
  let leads = []
  if (!isPrivilegedRole(actor.role) && leadRepository.listCreatedLeadsForActor) {
    leads = await leadRepository.listCreatedLeadsForActor(actor, query)
  } else {
    const scope = await resolveAccountScope(actor)
    if (leadRepository.listLeadsForActor) {
      leads = await leadRepository.listLeadsForActor(scope.actor, {
        ...scope.queryOptions,
        filters: query,
      })
    } else {
      leads = isPrivilegedRole(actor.role)
        ? await leadRepository.listAllLeads()
        : await leadRepository.listAssignedLeads(actor.id)
    }
  }

  return augmentLeadsWithOwnerCode(leads)
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

  return augmentLeadWithOwnerCode(lead)
}

const createLead = async (actor, payload) => {
  const leadPayload = await buildLeadPayload(payload, actor)
  const lead = await leadRepository.createLead(leadPayload)
  await emitLeadRealtime({
    action: 'created',
    lead,
    actor,
    assignedUserId: lead.assignedUserId || lead.ownerUserId || lead.ownerId || lead.assignedTo,
  })

  return augmentLeadWithOwnerCode(lead)
}

const deleteLead = async (actor, leadId) => {
  const userRepository = require('../repositories/userRepository')
  const allUsers = userRepository.listAllUsers ? await userRepository.listAllUsers() : []
  const targetKeywords = ['keval', 'parth', 'rushabh', 'samir']
  const authorizedEmails = new Set(
    (Array.isArray(allUsers) ? allUsers : [])
      .filter((u) => {
        const uName = String(u?.name || u?.username || '').trim().toLowerCase()
        const uEmail = String(u?.email || '').trim().toLowerCase()
        return targetKeywords.some((k) => uName.includes(k) || uEmail.includes(k))
      })
      .map((u) => String(u?.email || '').trim().toLowerCase())
      .filter(Boolean)
  )

  const actorEmail = String(actor?.email || '').trim().toLowerCase()
  const actorName = String(actor?.name || actor?.username || '').trim().toLowerCase()
  const isAuthorized = (actorEmail && authorizedEmails.has(actorEmail)) || targetKeywords.some((k) => actorName.includes(k) || actorEmail.includes(k))

  if (!isAuthorized) {
    throw new AppError('Only authorized users can allow to delete accounts.', 403)
  }

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
      assignedUserId: existingLead.assignedUserId || existingLead.ownerUserId || existingLead.ownerId || existingLead.assignedTo,
    })
  }

  return existingLead
}

const frontendDeleteLead = async (actor, leadId) => {
  const existingLead = await getLeadById(actor, leadId, { includeGroupScope: false })
  const updatedLead = await leadRepository.frontendDeleteLead(normalizeLeadId(leadId), actor)

  if (!updatedLead) {
    throw new AppError('Lead not found.', 404)
  }

  const socketServer = getSocketServer()
  if (socketServer) {
    socketServer.emitToAdmins(SOCKET_EVENTS.LEAD_UPDATED, {
      action: 'updated',
      record: updatedLead,
      previousRecord: existingLead,
    })
    socketServer.emitToAdmins(SOCKET_EVENTS.DASHBOARD_UPDATE, {
      entityType: 'lead',
      action: 'updated',
      recordId: updatedLead.id,
      record: updatedLead,
      companyId: actor.companyId,
    })
    if (updatedLead.assignedTo) {
      socketServer.emitToUser(updatedLead.assignedTo, SOCKET_EVENTS.LEAD_UPDATED, {
        action: 'updated',
        record: updatedLead,
        previousRecord: existingLead,
      })
    }
    socketServer.pushActivity('lead-frontend-delete', actor, {
      leadId: updatedLead.id,
      assignedUserId: updatedLead.assignedUserId || updatedLead.ownerUserId || updatedLead.ownerId || updatedLead.assignedTo,
    })
  }

  return { id: existingLead.id }
}

const updateLead = async (actor, leadId, payload) => {
  const existingLead = await getLeadById(actor, leadId, { includeGroupScope: false })

  const targetStage = payload.stage || payload.status || payload.accountStatus || payload.formData?.stage || payload.formData?.status || ''
  const isPoConversionTarget = targetStage === 'convert_to_po' || targetStage === 'po_converted' || targetStage === 'PO Converted'
  if (isPoConversionTarget) {
    const resolvedPoValue = payload.poValue || payload.formData?.poValue || existingLead.poValue || existingLead.formData?.poValue || ''
    if (!String(resolvedPoValue).trim()) {
      throw new AppError('PO Value is mandatory when converting account to PO status.', 400)
    }
  }

  const leadPayload = await buildLeadPayload(payload, actor, existingLead)
  let updatedLead = await leadRepository.updateLead(normalizeLeadId(leadId), leadPayload)

  if (!updatedLead) {
    throw new AppError('Lead not found.', 404)
  }

  if (payload.projectName !== undefined || payload.dealName !== undefined) {
    const nextProjectName = payload.projectName !== undefined ? payload.projectName : payload.dealName
    const { getMongoModel } = require('../models/mongoModels')
    const Deal = getMongoModel('deals')
    if (Deal) {
      await Deal.updateMany(
        { $or: [{ accountId: normalizeLeadId(leadId) }, { accountId: String(leadId) }], frontendDeleted: { $ne: true } },
        {
          $set: {
            projectName: nextProjectName,
            dealName: nextProjectName,
            updatedAt: new Date().toISOString(),
          },
        }
      ).catch(() => {})
    }
  }

  if (isPoConversionTarget) {
    const { getMongoModel } = require('../models/mongoModels')
    const Deal = getMongoModel('deals')
    const Customer = getMongoModel('customers')
    await Deal.updateMany(
      { accountId: normalizeLeadId(leadId), frontendDeleted: { $ne: true } },
      {
        $set: {
          stage: 'convert_to_po',
          status: 'convert_to_po',
          accountStatus: 'convert_to_po',
          accountState: 'convert_to_po',
          poValue: leadPayload.poValue,
          statusAsPerOrderReceived: leadPayload.statusAsPerOrderReceived,
          statusAsPerQuotationGiven: leadPayload.statusAsPerQuotationGiven,
          gstin: leadPayload.gstin,
          jobNo: leadPayload.jobNo,
          updatedAt: new Date().toISOString(),
        },
      }
    )
    await Customer.updateMany(
      { $or: [{ accountId: normalizeLeadId(leadId) }, { accountId: String(leadId) }] },
      {
        $set: {
          customerStatus: 'convert_to_po',
          status: 'convert_to_po',
          accountState: 'convert_to_po',
          poValue: leadPayload.poValue,
          gstin: leadPayload.gstin,
          jobNo: leadPayload.jobNo,
          updatedAt: new Date().toISOString(),
        },
      }
    ).catch(() => {})
  }

  const isRejectedTarget = targetStage === 'rejected' || payload.stage === 'rejected' || payload.status === 'rejected' || Boolean(payload.reasonForLost) || Boolean(payload.reasonForLostOrder)
  if (isRejectedTarget) {
    const { getMongoModel } = require('../models/mongoModels')
    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')
    const Customer = getMongoModel('customers')
    const reasonValue = payload.reasonForLost || payload.reasonForLostOrder || leadPayload.reasonForLost || ''
    
    await Lead.updateOne(
      { legacyId: normalizeLeadId(leadId) },
      {
        $set: {
          stage: 'rejected',
          reasonForLost: reasonValue,
          reasonForLostOrder: reasonValue,
          'formData.stage': 'rejected',
          'formData.reasonForLost': reasonValue,
          'formData.reasonForLostOrder': reasonValue,
          updatedAt: new Date().toISOString(),
        },
      }
    ).catch(() => {})

    await Deal.updateMany(
      { accountId: normalizeLeadId(leadId), frontendDeleted: { $ne: true } },
      {
        $set: {
          stage: 'rejected',
          reasonForLost: reasonValue,
          reasonForLostOrder: reasonValue,
          updatedAt: new Date().toISOString(),
          'data.stage': 'rejected',
          'data.reasonForLost': reasonValue,
          'data.reasonForLostOrder': reasonValue,
          'formData.stage': 'rejected',
          'formData.reasonForLost': reasonValue,
          'formData.reasonForLostOrder': reasonValue,
        },
      }
    ).catch(() => {})

    await Customer.updateMany(
      { $or: [{ accountId: normalizeLeadId(leadId) }, { accountId: String(leadId) }] },
      {
        $set: {
          customerStatus: 'rejected',
          status: 'rejected',
          accountState: 'rejected',
          reasonForLost: reasonValue,
          reasonForLostOrder: reasonValue,
          updatedAt: new Date().toISOString(),
          'data.customerStatus': 'rejected',
          'data.reasonForLost': reasonValue,
          'formData.reasonForLost': reasonValue,
          'formData.reasonForLostOrder': reasonValue,
        },
      }
    ).catch(() => {})
  }

  // Create re-assignment To-Do task if owner has changed
  const newOwner = payload.assignedTo || payload.ownerId || payload.assignedUserId || payload.accountOwner
  if (newOwner && String(newOwner) !== String(existingLead.assignedTo)) {
    try {
      const { getMongoModel } = require('../models/mongoModels')
      const Task = getMongoModel('tasks')
      const newTaskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      await Task.create({
        id: newTaskId,
        title: `Account Reassigned: ${updatedLead.accountName || updatedLead.name || updatedLead.companyName || 'Account'}`,
        description: `Account has been reassigned to you.`,
        status: 'pending',
        activityType: 're-assign-account',
        assignedTo: newOwner,
        ownerUserId: newOwner,
        createdBy: actor.id,
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        accountName: updatedLead.accountName || updatedLead.name,
        accountId: updatedLead.id,
      })
    } catch (err) {
      console.error('Failed to create reassignment task:', err)
    }
  }

  const skipAutoConvert = Boolean(payload.skipAutoConvert || payload.isSaveSettings || payload.preserveStatus)
  const hasDealDetails = Boolean(payload.dealName || payload.dealValue || payload.dealDescription || payload.expectedClosureDate || payload.dealOwner)
  const isStatusConverted = payload.status === 'converted' || payload.stage === 'converted' || payload.accountState === 'converted' || payload.status === 'staged' || payload.stage === 'staged' || payload.accountState === 'staged' || payload.status === 'convert_to_po' || payload.stage === 'convert_to_po' || payload.accountState === 'convert_to_po' || Boolean(payload.poValue)
  
  if ((!skipAutoConvert && (hasDealDetails || isStatusConverted)) || updatedLead.isConverted) {
    const { getMongoModel } = require('../models/mongoModels')
    const Deal = getMongoModel('deals')
    const Customer = getMongoModel('customers')
    const existingDeal = await Deal.findOne({ accountId: normalizeLeadId(leadId), frontendDeleted: { $ne: true } }).lean()
    
    if (existingDeal) {
      const dealPayload = buildDealPayloadFromAccount(updatedLead, actor)
      const targetDealId = existingDeal.legacyId || existingDeal.id || existingDeal._id
      await dealService.update(actor, targetDealId, dealPayload).catch((err) => console.warn('Deal update sync warning:', err.message))
      
      const convertedAt = new Date().toISOString()
      const targetState = skipAutoConvert
        ? (updatedLead.status || updatedLead.stage || updatedLead.accountState || existingDeal.status || existingDeal.stage || 'new')
        : ((updatedLead.status === 'convert_to_po' || updatedLead.stage === 'convert_to_po' || updatedLead.accountStatus === 'PO Converted') ? 'convert_to_po' : (updatedLead.status === 'staged' || updatedLead.stage === 'staged' ? 'staged' : (updatedLead.status || 'staged')))
      await leadRepository.updateLead(normalizeLeadId(leadId), {
        isConverted: true,
        convertedAt,
        convertedBy: actor.id,
        accountId: leadId,
        dealId: targetDealId,
        status: targetState,
        accountState: targetState,
        formData: {
          ...(updatedLead.formData || {}),
          isConverted: true,
          convertedAt,
          convertedBy: actor.id,
          dealId: targetDealId,
          status: targetState,
          accountState: targetState,
        }
      })
      updatedLead = await getLeadById(actor, leadId, { includeGroupScope: false })
    } else if (!updatedLead.isConverted && !skipAutoConvert) {
      await convertLeadToDeal(actor, leadId).catch((err) => console.warn('Convert lead to deal warning:', err.message))
      updatedLead = await getLeadById(actor, leadId, { includeGroupScope: false })
    }

    // Multi-collection sync for MongoDB customers collection
    const accountCustName = updatedLead.accountName || updatedLead.customerName || updatedLead.name || ''
    const existingCustomer = await Customer.findOne({
      $or: [
        { accountId: normalizeLeadId(leadId) },
        { accountId: String(leadId) },
        ...(accountCustName ? [{ customerName: accountCustName }, { name: accountCustName }] : [])
      ]
    }).lean()

    const targetCustomerStatus = (updatedLead.status === 'convert_to_po' || updatedLead.stage === 'convert_to_po' || updatedLead.accountStatus === 'PO Converted') ? 'convert_to_po' : (updatedLead.status || updatedLead.stage || 'staged')
    if (existingCustomer) {
      await Customer.updateOne(
        { _id: existingCustomer._id },
        {
          $set: {
            customerStatus: targetCustomerStatus,
            status: targetCustomerStatus,
            accountState: targetCustomerStatus,
            poValue: updatedLead.poValue || payload.poValue || 0,
            gstin: updatedLead.gstin || payload.gstin || '',
            jobNo: updatedLead.jobNo || payload.jobNo || '',
            updatedAt: new Date().toISOString(),
            'data.customerStatus': targetCustomerStatus,
            'data.status': targetCustomerStatus,
            'data.poValue': updatedLead.poValue || payload.poValue || 0,
            'data.gstin': updatedLead.gstin || payload.gstin || '',
            'data.jobNo': updatedLead.jobNo || payload.jobNo || '',
          }
        }
      ).catch((err) => console.warn('Customer update sync warning:', err.message))
    } else {
      try {
        const custLegacyId = await getNextLegacyId('customers')
        await Customer.create({
          legacyId: custLegacyId,
          name: accountCustName || 'Account Customer',
          customerName: accountCustName || 'Account Customer',
          customerNumber: `CUST-${custLegacyId < 1001 ? custLegacyId + 1000 : custLegacyId}`,
          accountId: normalizeLeadId(leadId),
          customerStatus: targetCustomerStatus,
          status: targetCustomerStatus,
          accountState: targetCustomerStatus,
          customerOwner: updatedLead.accountOwner || updatedLead.ownerName || actor.name || '',
          customerCategory: updatedLead.accountCategory || updatedLead.customerCategory || 'SWATI',
          poValue: updatedLead.poValue || payload.poValue || 0,
          gstin: updatedLead.gstin || payload.gstin || '',
          jobNo: updatedLead.jobNo || payload.jobNo || '',
          createdBy: actor.id,
          companyId: actor.companyId || 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: {
            accountId: normalizeLeadId(leadId),
            customerStatus: targetCustomerStatus,
            poValue: updatedLead.poValue || payload.poValue || 0,
            gstin: updatedLead.gstin || payload.gstin || '',
            jobNo: updatedLead.jobNo || payload.jobNo || '',
          }
        })
      } catch (custErr) {
        console.warn('Customer create sync warning:', custErr.message)
      }
    }
  }

  await emitLeadRealtime({
    action: 'updated',
    lead: updatedLead,
    actor,
    assignedUserId: updatedLead.assignedUserId || updatedLead.ownerUserId || updatedLead.ownerId || updatedLead.assignedTo,
    previousLead: existingLead,
  })

  return augmentLeadWithOwnerCode(updatedLead)
}

const buildDealPayloadFromAccount = (account = {}, actor = {}) => {
  const dealTitle = account.dealName || account.projectName || account.accountName || account.customerName || account.name || 'Converted Deal'
  const ownerUserId = account.ownerUserId || account.assignedTo || account.createdBy || actor.id
  const ownerName = account.accountOwner || account.ownerName || actor.name || ''
  const dealOwner = account.dealOwner || ownerName
  const accountName = account.accountName || account.name || account.customerName || ''
  const accountNumber = account.accountNumber || account.accountNo || ''
  const customerName = account.customerName || accountName
  const city = account.dealCity || account.city || account.location || account.branch || account.branchLocation || account.projectLocation || ''

  return {
    title: dealTitle,
    name: dealTitle,
    customerName,
    accountId: account.id,
    accountName,
    accountNumber,
    linkedAccountName: accountName,
    linkedAccountNumber: accountNumber,
    customerId: account.customerId || null,
    customerNumber: account.customerNumber || accountNumber,
    amount: account.dealValue || account.projectValue || account.value || account.amount || null,
    value: account.dealValue || account.projectValue || account.value || account.amount || null,
    currency: account.currency || 'INR',
    stage: (account.stage === 'convert_to_po' || account.status === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
    status: (account.stage === 'convert_to_po' || account.status === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
    assignedTo: ownerUserId,
    ownerUserId,
    ownerName,
    dealOwner,
    dealCoOwners: account.dealCoOwners || '',
    dealType: account.dealType || '',
    dealSource: account.dealSource || '',
    dealScore: account.dealScore || 0,
    probability: account.probability || null,
    expectedCloseDate: account.expectedClosureDate || null,
    closeDate: account.expectedClosureDate || null,
    expectedClosureDate: account.expectedClosureDate || null,
    createdBy: account.createdBy || actor.id,
    convertedFromAccount: true,
    conversionSource: 'search-account',
    convertedAt: new Date().toISOString(),
    convertedBy: actor.id,
    projectName: account.projectName || '',
    consultantName: account.consultantName || '',
    jobNo: account.jobNo || '',
    city,
    location: city,
    address: account.address || '',
    contactPerson: account.contactPerson || account.contactName || '',
    contactName: account.contactName || account.contactPerson || '',
    contactMobile: account.contactMobile || account.mobile || account.phone || account.contactPhone || '',
    contactPhone: account.contactPhone || account.phone || account.contactMobile || account.mobile || '',
    phone: account.phone || account.contactMobile || account.contactPhone || account.mobile || '',
    contactEmail: account.contactEmail || account.email || '',
    email: account.email || account.contactEmail || '',
    contactDesignation: account.contactDesignation || account.designation || '',
    productCategory: account.productCategory || account.accountCategory || account.customerCategory || '',
    customerCategory: account.customerCategory || account.accountCategory || '',
    customerStatus: account.customerStatus || account.accountStatus || account.status || '',
    companyName: account.company || account.companyName || accountName,
    companyProfile: account.companyProfile || account.company || account.companyName || account.accountCategory || '',
    companyLogo: account.companyLogo || '',
    gstin: account.gstin || '',
    description: account.dealDescription || account.description || account.notes || '',
    notes: `Converted from account ${accountNumber || account.id || ''}`.trim(),
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
    status: (account.status === 'convert_to_po' || account.stage === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
    accountState: (account.status === 'convert_to_po' || account.stage === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
    formData: {
      ...(account.formData || account.raw?.formData || {}),
      ...account,
      isConverted: true,
      convertedAt,
      convertedBy: actor.id,
      accountId: account.id,
      dealId: deal.id,
      convertedDealId: convertedDeal?.id || null,
      accountState: (account.status === 'convert_to_po' || account.stage === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
      status: (account.status === 'convert_to_po' || account.stage === 'convert_to_po' || account.accountStatus === 'PO Converted') ? 'convert_to_po' : 'staged',
    },
  })

  try {
    const { findUserById } = require('../repositories/userRepository')
    const assignedUserId = updatedAccount.assignedTo || updatedAccount.ownerUserId || actor.id
    const userRecord = assignedUserId ? await findUserById(assignedUserId) : null
    const ownerName = userRecord?.name || updatedAccount.ownerName || updatedAccount.accountOwner || ''
    const ownerCode = userRecord?.ownerCode || updatedAccount.ownerCode || ''

    const customerPayload = {
      ...(updatedAccount.formData || {}),
      name: updatedAccount.accountName || updatedAccount.customerName || updatedAccount.name || 'Converted Deal Customer',
      email: updatedAccount.email || updatedAccount.contactEmail || null,
      phone: updatedAccount.phone || updatedAccount.mobile || updatedAccount.contactMobile || null,
      company: updatedAccount.company || updatedAccount.companyName || null,
      assignedTo: assignedUserId,
      accountId: updatedAccount.id,
      customerOwner: ownerName,
      customerOwnerName: ownerName,
      customerOwnerDisplay: ownerName,
      customerOwnerCode: ownerCode,
      customerStatus: updatedAccount.status || updatedAccount.accountState || 'pending',
      customerCategory: updatedAccount.customerCategory || updatedAccount.accountCategory || 'SWATI',
      contacts: updatedAccount.contacts || [],
      documents: updatedAccount.documents || []
    };
    
    delete customerPayload.data;
    
    await customerService.create(actor, customerPayload)
  } catch (err) {
    console.warn('Could not auto-create customer upon conversion', err)
  }

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

const applyCompanyWide = (actor) => ({ ...actor, role: 'admin' })

module.exports = {
  listLeads: (actor, query) => listLeads(applyCompanyWide(actor), query),
  getLeadById: (actor, id) => getLeadById(applyCompanyWide(actor), id),
  createLead,
  updateLead,
  deleteLead,
  frontendDeleteLead,
  convertLeadToDeal,
  bulkAddRemark,
  bulkReassign,
}
