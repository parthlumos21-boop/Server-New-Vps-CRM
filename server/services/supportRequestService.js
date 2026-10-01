const supportRequestRepository = require('../repositories/supportRequestRepository')
const supportReplyRepository = require('../repositories/supportReplyRepository')
const { createCrudService, emitEntity } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { supportRequest } = require('../validation/schemas')
const { Types } = require('mongoose')

const DEFAULT_SR_NUMBER_START = 1

const buildSupportRequestNumber = (sequence) => `SR${String(sequence).padStart(6, '0')}`

const parseSupportRequestNumber = (srNumber = '') => {
  const match = String(srNumber || '').match(/(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : NaN
}

const getRecordSrNumber = (record = {}) => record.srNumber || record.data?.srNumber || ''

const getSupportRequestReplyIds = (record = {}) => {
  const values = [
    record._id,
    record.mongoId,
    record.id,
    record.legacyId,
    record.data?.id,
    record.data?.legacyId,
  ].filter((value) => value !== undefined && value !== null && value !== '')

  const variants = []
  values.forEach((value) => {
    variants.push(value)
    variants.push(String(value))

    if (Types.ObjectId.isValid(String(value))) {
      variants.push(new Types.ObjectId(String(value)))
    }

    const numericValue = Number.parseInt(String(value), 10)
    if (Number.isFinite(numericValue) && String(numericValue) === String(value)) {
      variants.push(numericValue)
    }
  })

  const seen = new Set()
  return variants.filter((value) => {
    const key = `${typeof value}:${String(value)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const getNextSupportRequestNumber = async (actor = {}) => {
  const records = await supportRequestRepository.listAll()
  const actorCompanyId = actor.companyId || 1
  const maxSequence = records.reduce((currentMax, record) => {
    if (record.companyId && record.companyId !== actorCompanyId) return currentMax

    const parsedValue = parseSupportRequestNumber(getRecordSrNumber(record))
    return Number.isFinite(parsedValue) ? Math.max(currentMax, parsedValue) : currentMax
  }, DEFAULT_SR_NUMBER_START - 1)

  return buildSupportRequestNumber(maxSequence + 1)
}

const buildPayload = async (body, actor, existing) => {
  const subject = body.subject ?? existing?.subject
  if (!subject) throw new AppError('Subject is required.', 400)
  const srNumber = (
    existing?.srNumber
    || existing?.data?.srNumber
    || await getNextSupportRequestNumber(actor)
  )

  return {
    srNumber,
    subject,
    description: body.description ?? existing?.description ?? '',
    priority: body.priority ?? existing?.priority ?? 'normal',
    status: body.status ?? existing?.status ?? 'open',
    category: body.category ?? existing?.category ?? null,
    customerId: body.customerId ?? existing?.customerId ?? null,
    customerNumber: body.customerNumber ?? body.customerNo ?? existing?.customerNumber ?? existing?.data?.customerNumber ?? null,
    customerNo: body.customerNo ?? body.customerNumber ?? existing?.customerNo ?? existing?.data?.customerNo ?? null,
    customerName: body.customerName ?? existing?.customerName ?? null,
    customerEmail: body.customerEmail ?? existing?.customerEmail ?? null,
    assignedTo: body.assignedTo ?? existing?.assignedTo ?? null,
    requestType: body.requestType ?? body.request_type ?? existing?.requestType ?? null,
    userEmail: actor.email || actor.username || existing?.userEmail || null,
    createdBy: existing?.createdBy ?? actor.id,
    updatedBy: actor.id,
    resolvedAt: body.status === 'resolved' && existing?.status !== 'resolved' ? new Date() : existing?.resolvedAt ?? null,
    data: { ...(existing?.data || {}), ...body, srNumber },
  }
}

const base = createCrudService({
  repository: supportRequestRepository,
  entityLabel: 'Support request',
  entityType: 'support-request',
  buildPayload,
  bypassScopeForRoles: ['support'],
  customScopeBypass: (actor) => {
    const email = (actor?.email || '').toLowerCase().trim()
    return email === 'keval@swatiswitchgears.com' || email.endsWith('@support.com')
  },
})

const { sendEmail } = require('./emailService')

const originalCreate = base.create
const create = async (actor, body) => {
  const record = await originalCreate(actor, body)

  const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000'
  const link = `${frontendUrl}/admin/tickets`

  sendEmail({
    to: 'parth21082002@gmail.com',
    subject: `New CRM Support Request: ${record.srNumber || 'Untitled'}`,
    html: `
      <h2>New Support Request Detected</h2>
      <p><strong>Subject:</strong> ${record.subject || 'N/A'}</p>
      <p><strong>Priority:</strong> ${record.priority || 'normal'}</p>
      <br/>
      <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Open Support Requests</a></p>
    `,
  }).catch((err) => {
    console.error('Failed to send email notification for support request:', err)
  })

  return record
}

const bulkUpdate = async (actor, body) => {
  const ids = (body?.ids || []).map((id) => Number.parseInt(id, 10)).filter(Boolean)
  if (ids.length === 0) throw new AppError('No ids provided.', 400)
  for (const id of ids) {
    await base.get(actor, id)
  }
  const records = await supportRequestRepository.bulkUpdate(actor, ids, body?.updates || {})
  records.forEach((record) => emitEntity('support-request', 'updated', record, actor))
  return records
}

const bulkDelete = async (actor, body) => {
  const ids = (body?.ids || []).map((id) => Number.parseInt(id, 10)).filter(Boolean)
  if (ids.length === 0) throw new AppError('No ids provided.', 400)
  for (const id of ids) {
    await base.get(actor, id)
  }
  const removed = await supportRequestRepository.bulkDelete(actor, ids)
  removed.forEach((id) => emitEntity('support-request', 'deleted', { id }, actor))
  return { removed }
}

const populateMetadata = async (records) => {
  if (!records || records.length === 0) return records

  const ownerIds = Array.from(new Set(records.map(r => r.ownerUserId || r.assignedTo || r.data?.ownerId || r.data?.assignedTo).filter(Boolean)))
  const closerEmails = Array.from(new Set(records.map(r => r.data?.closedBy || r.closedBy).filter(e => typeof e === 'string' && e.includes('@'))))
  const closerIds = Array.from(new Set(records.map(r => r.updatedBy || r.data?.updatedBy).filter(Boolean)))

  const { getMongoModel } = require('../models/mongoModels')
  const User = getMongoModel('users')

  const users = await User.find({
    $or: [
      { legacyId: { $in: [...ownerIds, ...closerIds] } },
      { email: { $in: closerEmails } }
    ]
  }).lean()

  const userMapById = new Map(users.map(u => [u.legacyId || u.id, u.name || u.username]))
  const userMapByEmail = new Map(users.map(u => [u.email?.toLowerCase(), u.name || u.username]))

  return records.map(r => {
    const ownerId = r.ownerUserId || r.assignedTo || r.data?.ownerId || r.data?.assignedTo
    const ownerName = userMapById.get(ownerId) || r.data?.ownerName || r.ownerName || '-'

    const rawClosedBy = r.data?.closedBy || r.closedBy
    let closedBy = '-'
    if (rawClosedBy) {
      if (rawClosedBy.includes('@')) {
        closedBy = userMapByEmail.get(rawClosedBy.toLowerCase()) || rawClosedBy
      } else {
        closedBy = rawClosedBy
      }
    } else {
      const closerId = r.updatedBy || r.data?.updatedBy
      if (closerId && (r.status || '').toLowerCase() === 'closed') {
        closedBy = userMapById.get(closerId) || String(closerId)
      }
    }

    return {
      ...r,
      ownerName,
      closedBy,
      data: {
        ...(r.data || {}),
        ownerName,
        closedBy
      }
    }
  })
}

const get = async (actor, id) => {
  const record = await base.get(actor, id)
  if (!record) return null
  const populated = await populateMetadata([record])
  return populated[0]
}

const originalList = base.list
const list = async (actor) => {
  const records = await originalList(actor)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const filteredRecords = records.filter((record) => {
    if ((record.status || '').toLowerCase() === 'closed') {
      const recordDate = new Date(record.updatedAt || record.createdAt || 0)
      if (recordDate < twoDaysAgo) return false
    }
    return true
  })

  const replyIdGroups = filteredRecords.map((record) => ({
    recordId: (record._id || record.id).toString(),
    replyIds: getSupportRequestReplyIds(record),
  }))
  const recordIds = replyIdGroups.flatMap((group) => group.replyIds)
  
  let replyCounts = []
  if (recordIds.length > 0) {
    replyCounts = await supportReplyRepository.model.aggregate([
      { $match: { support_request_id: { $in: recordIds } } },
      { $group: { _id: "$support_request_id", count: { $sum: 1 } } }
    ])
  }

  const countMap = {}
  replyCounts.forEach(rc => {
    const matchedGroup = replyIdGroups.find((group) => (
      group.replyIds.some((replyId) => String(replyId) === String(rc._id))
    ))
    if (matchedGroup) countMap[matchedGroup.recordId] = (countMap[matchedGroup.recordId] || 0) + rc.count
  })

  const mappedRecords = filteredRecords.map(record => {
    const isMongoose = typeof record.toObject === 'function'
    const doc = isMongoose ? record.toObject() : record
    return {
      ...doc,
      replyCount: countMap[(doc._id || doc.id).toString()] || 0
    }
  })

  return populateMetadata(mappedRecords)
}

const addReply = async (actor, id, message) => {
  const existing = await base.get(actor, id)
  if (!existing) throw new AppError('Support request not found.', 404)

  const isSupportAgent = String(actor.email || '') === 'parth@support.com' || String(actor.email || '') === 'rushabh@support.com'
  const senderType = isSupportAgent ? 'support_agent' : 'user'
  
  let recipientId = null
  let recipientType = null
  let recipientEmail = null
  
  if (isSupportAgent) {
    recipientType = 'user'
    recipientEmail = existing.userEmail || existing.customerEmail || existing.contactEmail || null
    // Assuming customer is tied to `customerId` or `accountId`, we just use what's available
    recipientId = existing.customerId || existing.accountId || null
  } else {
    recipientType = 'support_agent'
    recipientEmail = 'parth@support.com, rushabh@support.com'
    recipientId = existing.assignedTo || existing.ownerUserId || null
  }

  const newReply = {
    support_request_id: existing.id,
    sender_id: actor.id || actor._id,
    sender_type: senderType,
    sender_email: actor.email,
    recipient_id: recipientId,
    recipient_type: recipientType,
    recipient_email: recipientEmail,
    message,
    attachments: [],
    is_internal: false,
    created_at: new Date(),
    updated_at: new Date()
  }

  await supportReplyRepository.model.create(newReply)

  emitEntity('support-request', 'updated', existing, actor)
  return existing
}

const getReplies = async (actor, id) => {
  const existing = await base.get(actor, id)
  if (!existing) throw new AppError('Support request not found.', 404)

  const replies = await supportReplyRepository.model.find({
    support_request_id: { $in: getSupportRequestReplyIds(existing) }
  }).sort({ created_at: 1 }).lean()

  return replies
}

const getTodoReplies = async (actor) => {
  const escapedEmail = String(actor.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const replies = await supportReplyRepository.model.find({
    recipient_email: { $regex: escapedEmail, $options: 'i' }
  })
    .sort({ created_at: -1 })
    .limit(50)
    .lean()

  return replies
}

const closeTicket = async (actor, id) => {
  const allowedEmails = ['parth@support.com', 'rushabh@support.com']
  if (!allowedEmails.includes(actor.email)) {
    throw new AppError('Forbidden. Only authorized support agents can close tickets.', 403)
  }

  const existing = await base.get(actor, id)
  if (!existing) throw new AppError('Support request not found.', 404)

  const { findUserByEmail } = require('../repositories/userRepository')
  const fullUser = await findUserByEmail(actor.email)
  const closerName = fullUser ? (fullUser.name || fullUser.username || actor.email) : actor.email

  const updated = await base.update(actor, id, {
    status: 'closed',
    closedBy: closerName,
    closedAt: new Date().toISOString()
  })
  emitEntity('support-request', 'updated', updated, actor)
  return updated
}

module.exports = { ...base, get, create, list, bulkUpdate, bulkDelete, addReply, getReplies, getTodoReplies, closeTicket }
module.exports.validation = {
  create: supportRequest,
  update: supportRequest,
}
