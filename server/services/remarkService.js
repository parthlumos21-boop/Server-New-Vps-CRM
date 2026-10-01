const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { AppError } = require('../utils/appError')
const leadRepository = require('../repositories/leadRepository')
const { assertRecordAccess, isPrivilegedRole, toNumberOrNull } = require('../security/accessScope')

const Remark = getMongoModel('remarks')
const RemarkReminder = getMongoModel('remark_reminders')
const MainReminder = getMongoModel('reminders')
const User = getMongoModel('users')
const AuditLog = getMongoModel('audit_log')

const byLegacyId = (id) => {
  const numericId = toNumberOrNull(id)
  if (numericId === null) return { _id: null }
  return {
    $or: [
      { legacyId: numericId },
      { id: numericId },
    ],
  }
}
const toNumber = toNumberOrNull

const normalizeText = (value) => String(value || '').trim()
const normalizeNameKey = (value) => normalizeText(value).toLowerCase().replace(/\s+/g, ' ')

const normalizeReminderUserRefs = (reminder = {}) => {
  const refs = []
  const addRef = (ref) => {
    if (!ref) return
    if (typeof ref === 'object') {
      const id = normalizeText(ref.id ?? ref.legacyId ?? ref.value)
      const name = normalizeText(ref.name || ref.ownerDisplayName || ref.label || ref.username || ref.email)
      const ownerCode = normalizeText(ref.ownerCode || ref.owner_code)
      if (id || name || ownerCode) {
        refs.push({
          id,
          name,
          ownerCode,
          username: normalizeText(ref.username),
          email: normalizeText(ref.email),
        })
      }
      return
    }

    const id = normalizeText(ref)
    if (id) refs.push({ id, name: '', ownerCode: '', username: '', email: '' })
  }

  if (Array.isArray(reminder.assignedUsers)) {
    reminder.assignedUsers.forEach(addRef)
  }

  if (Array.isArray(reminder.assignedUserIds)) {
    reminder.assignedUserIds.forEach((id) => {
      if (!refs.some((ref) => ref.id === normalizeText(id))) addRef(id)
    })
  }

  addRef(reminder.assignedTo)

  const seen = new Set()
  return refs.filter((ref) => {
    const key = ref.ownerCode ? `code:${ref.ownerCode}` : ref.id ? `id:${ref.id}` : `name:${normalizeNameKey(ref.name)}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const mapReminder = (reminder) => {
  if (!reminder) return null
  return {
    ...reminder,
    id: reminder.legacyId ?? reminder.id,
    accountId: reminder.accountId,
    account_id: reminder.accountId,
    remark_id: reminder.remarkId,
    remarkId: reminder.remarkId,
    reminder_date: reminder.reminderDate,
    reminder_time: reminder.reminderTime,
    assigned_to: reminder.assignedTo,
    assignedOwnerName: reminder.assignedOwnerName,
    assigned_owner_name: reminder.assignedOwnerName,
    assignedOwnerCode: reminder.assignedOwnerCode,
    assigned_owner_code: reminder.assignedOwnerCode,
    reminder_note: reminder.reminderNote,
    is_completed: Boolean(reminder.isCompleted),
    company_id: reminder.companyId,
    owner_user_id: reminder.ownerUserId,
    created_at: reminder.createdAt,
    updated_at: reminder.updatedAt,
  }
}

const mapRemark = async (remark) => {
  if (!remark) return null
  const createdBy = remark.createdBy ?? remark.created_by
  const user = createdBy ? await User.findOne(byLegacyId(createdBy)).lean().catch(() => null) : null

  return {
    ...remark,
    id: remark.legacyId ?? remark.id,
    account_id: remark.accountId,
    accountId: remark.accountId,
    deal_id: remark.dealId,
    dealId: remark.dealId,
    created_by: createdBy,
    createdBy,
    created_by_name: remark.createdByName || user?.name || user?.username || '',
    createdByName: remark.createdByName || user?.name || user?.username || '',
    created_by_email: remark.createdByEmail || user?.email || '',
    createdByEmail: remark.createdByEmail || user?.email || '',
    account_owner_id: remark.accountOwnerId,
    accountOwnerId: remark.accountOwnerId,
    account_owner_name: remark.accountOwnerName || '',
    accountOwnerName: remark.accountOwnerName || '',
    account_owner_email: remark.accountOwnerEmail || '',
    accountOwnerEmail: remark.accountOwnerEmail || '',
    account_created_by_id: remark.accountCreatedById,
    accountCreatedById: remark.accountCreatedById,
    account_created_by_name: remark.accountCreatedByName || '',
    accountCreatedByName: remark.accountCreatedByName || '',
    account_created_by_email: remark.accountCreatedByEmail || '',
    accountCreatedByEmail: remark.accountCreatedByEmail || '',
    deal_owner_id: remark.dealOwnerId,
    dealOwnerId: remark.dealOwnerId,
    deal_owner_name: remark.dealOwnerName || '',
    dealOwnerName: remark.dealOwnerName || '',
    deal_owner_email: remark.dealOwnerEmail || '',
    dealOwnerEmail: remark.dealOwnerEmail || '',
    account_name: remark.accountName || '',
    accountName: remark.accountName || '',
    deal_name: remark.dealName || '',
    dealName: remark.dealName || '',
    company_id: remark.companyId,
    companyId: remark.companyId,
    owner_user_id: remark.ownerUserId,
    ownerUserId: remark.ownerUserId,
    project_id: remark.projectId,
    workflow_id: remark.workflowId,
    assignment_mode: remark.assignmentMode,
    assigned_user_ids: remark.assignedUserIds || [],
    assigned_user_types: remark.assignedUserTypes || [],
    assigned_user_groups: remark.assignedUserGroups || [],
    created_at: remark.createdAt,
    updated_at: remark.updatedAt,
  }
}

class RemarkService {
  async resolveRemarkUserTrackingDetails(actor, lead, deal) {
    // 1. Creator info
    const creatorId = actor?.id ? toNumber(actor.id) : null
    let creatorUser = creatorId ? await User.findOne(byLegacyId(creatorId)).lean().catch(() => null) : null
    if (!creatorUser && actor?.email) {
      creatorUser = await User.findOne({ email: actor.email }).lean().catch(() => null)
    }
    const createdBy = creatorId || actor?.id || null
    const createdByName = creatorUser?.name || creatorUser?.username || actor?.name || actor?.username || ''
    const createdByEmail = creatorUser?.email || actor?.email || ''

    // 2. Account owner info (from lead or account context)
    const rawAccountOwnerName = lead?.accountOwner || lead?.ownerName || lead?.addedBy || lead?.accountOwnerName || ''
    const accountOwnerCode = lead?.accountOwnerCode || lead?.ownerCode || lead?.employeeId || null
    const accountName = lead?.accountName || lead?.customerName || lead?.name || ''
    
    let accountOwnerUser = null
    const accountOwnerSearchConditions = []
    if (rawAccountOwnerName) {
      accountOwnerSearchConditions.push(
        { name: rawAccountOwnerName },
        { ownerDisplayName: rawAccountOwnerName },
        { username: rawAccountOwnerName }
      )
    }
    if (accountOwnerCode) {
      const numericCode = toNumber(accountOwnerCode)
      if (numericCode !== null) {
        accountOwnerSearchConditions.push({ ownerCode: numericCode }, { owner_code: numericCode })
      }
      accountOwnerSearchConditions.push({ ownerCode: String(accountOwnerCode) }, { employeeId: String(accountOwnerCode) })
    }

    if (accountOwnerSearchConditions.length > 0) {
      accountOwnerUser = await User.findOne({ $or: accountOwnerSearchConditions }).lean().catch(() => null)
    }

    const accountOwnerId = accountOwnerUser?.legacyId || accountOwnerUser?.id || lead?.assignedTo || lead?.ownerUserId || lead?.ownerId || null
    const accountOwnerName = accountOwnerUser?.name || rawAccountOwnerName || lead?.accountOwner || ''
    const accountOwnerEmail = accountOwnerUser?.email || lead?.userEmail || lead?.createdUserBy || lead?.email || lead?.formData?.userEmail || lead?.formData?.createdUserBy || ''

    // Account Created By info
    const rawAccountCreatedByName = lead?.createdByUserName || lead?.createdUserBy || ''
    const rawAccountCreatedByUserId = lead?.createdByUserId || lead?.createdBy || null
    let accountCreatedUser = rawAccountCreatedByUserId ? await User.findOne(byLegacyId(rawAccountCreatedByUserId)).lean().catch(() => null) : null
    if (!accountCreatedUser && rawAccountCreatedByName) {
      accountCreatedUser = await User.findOne({ $or: [{ name: rawAccountCreatedByName }, { username: rawAccountCreatedByName }, { email: rawAccountCreatedByName }] }).lean().catch(() => null)
    }
    const accountCreatedById = accountCreatedUser?.legacyId || accountCreatedUser?.id || rawAccountCreatedByUserId || null
    const accountCreatedByName = accountCreatedUser?.name || rawAccountCreatedByName || accountOwnerName
    const accountCreatedByEmail = accountCreatedUser?.email || lead?.createdUserBy || lead?.userEmail || accountOwnerEmail

    // 3. Deal Owner info (from deal context if provided)
    let dealOwnerId = null
    let dealOwnerName = ''
    let dealOwnerEmail = ''
    let dealCreatedById = null
    let dealCreatedByName = ''
    let dealCreatedByEmail = ''
    let dealName = ''

    if (deal) {
      dealName = deal.title || deal.dealName || deal.name || lead?.dealName || ''
      const rawDealOwnerName = deal.dealOwner || deal.ownerName || deal.data?.dealOwner || deal.data?.ownerName || accountOwnerName
      let dealOwnerUser = null
      if (rawDealOwnerName) {
        dealOwnerUser = await User.findOne({
          $or: [
            { name: rawDealOwnerName },
            { ownerDisplayName: rawDealOwnerName },
            { username: rawDealOwnerName },
          ],
        }).lean().catch(() => null)
      }
      dealOwnerId = dealOwnerUser?.legacyId || dealOwnerUser?.id || deal.assignedTo || deal.ownerUserId || deal.createdBy || accountOwnerId
      dealOwnerName = dealOwnerUser?.name || rawDealOwnerName || accountOwnerName
      dealOwnerEmail = dealOwnerUser?.email || deal.contactEmail || deal.email || deal.data?.contactEmail || deal.data?.email || accountOwnerEmail

      const rawDealCreatedById = deal.createdBy || deal.ownerUserId || null
      let dealCreatedUser = rawDealCreatedById ? await User.findOne(byLegacyId(rawDealCreatedById)).lean().catch(() => null) : null
      dealCreatedById = dealCreatedUser?.legacyId || dealCreatedUser?.id || rawDealCreatedById
      dealCreatedByName = dealCreatedUser?.name || dealCreatedUser?.username || dealOwnerName
      dealCreatedByEmail = dealCreatedUser?.email || dealOwnerEmail
    }

    return {
      createdBy,
      createdByName,
      createdByEmail,
      accountOwnerId: accountOwnerId ? toNumber(accountOwnerId) : null,
      accountOwnerName,
      accountOwnerEmail,
      accountCreatedById: accountCreatedById ? toNumber(accountCreatedById) : null,
      accountCreatedByName,
      accountCreatedByEmail,
      dealOwnerId: dealOwnerId ? toNumber(dealOwnerId) : null,
      dealOwnerName,
      dealOwnerEmail,
      dealCreatedById: dealCreatedById ? toNumber(dealCreatedById) : null,
      dealCreatedByName,
      dealCreatedByEmail,
      accountName,
      dealName,
    }
  }

  async getAccessibleLead(accountId, actor) {
    const lead = leadRepository.findLeadByIdForActor
      ? await leadRepository.findLeadByIdForActor(accountId, actor, { companyWide: isPrivilegedRole(actor?.role) })
      : await leadRepository.findLeadById(accountId)

    if (!lead) {
      throw new AppError('Account not found or not accessible', 404)
    }

    return lead
  }

  async getRemarkById(remarkId, actor) {
    const remark = await mapRemark(await Remark.findOne({
      ...byLegacyId(remarkId),
      companyId: actor.companyId || 1,
    }).lean())

    if (!remark) {
      throw new AppError('Remark not found', 404)
    }

    assertRecordAccess(actor, remark, 'remark')
    return remark
  }

  async getReminderById(reminderId, actor) {
    const reminder = mapReminder(await RemarkReminder.findOne({
      ...byLegacyId(reminderId),
      companyId: actor.companyId || 1,
    }).lean())

    if (!reminder) {
      throw new AppError('Reminder not found', 404)
    }

    assertRecordAccess(actor, reminder, 'remark reminder')
    return reminder
  }

  formatReminderNote(reminder = {}) {
    const detailLines = [
      reminder.actionType ? `Action: ${reminder.actionType}` : '',
      reminder.priority ? `Priority: ${reminder.priority}` : '',
      reminder.status ? `Status: ${reminder.status}` : '',
      reminder.followupType ? `Followup Type: ${reminder.followupType}` : '',
    ].filter(Boolean)
    const note = String(reminder.note || '').trim()
    if (detailLines.length === 0) return note
    return note ? `${detailLines.join('\n')}\n\n${note}` : detailLines.join('\n')
  }

  normalizeAssignment(assignment = {}) {
    const allowedModes = new Set(['user', 'type', 'group'])
    const mode = allowedModes.has(assignment.mode) ? assignment.mode : null
    const normalizeList = (value) => (
      Array.isArray(value)
        ? Array.from(new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean)))
        : []
    )

    return {
      mode,
      userIds: normalizeList(assignment.userIds || assignment.selectedUserIds || assignment.expandedUserIds),
      userTypes: normalizeList(assignment.userTypes || assignment.selectedUserTypes),
      userGroups: normalizeList(assignment.userGroups || assignment.selectedUserGroups),
    }
  }

  async createRemark(remarkData) {
    const { actor, accountId, dealId, category = 'general', content, createdBy, reminder, startTime, endTime, remarkDate, callLogTime, relatedEntityType } = remarkData
    const assignment = this.normalizeAssignment(remarkData.assignment)
    if (!actor || (!accountId && !dealId) || !content) {
      throw new AppError('Account ID or Deal ID and content are required', 400)
    }

    const Deal = getMongoModel('deals')
    const lead = accountId ? await this.getAccessibleLead(accountId, actor).catch(() => null) : null
    const deal = dealId ? await Deal.findOne(byLegacyId(dealId)).lean().catch(() => null) : null
    const trackingDetails = await this.resolveRemarkUserTrackingDetails(actor, lead, deal)

    const legacyId = await getNextLegacyId('remarks')
    const companyId = actor.companyId || lead?.companyId || deal?.companyId || 1
    const now = new Date()

    const remark = await Remark.create({
      legacyId,
      accountId: accountId ? toNumber(accountId) : null,
      dealId: dealId ? toNumber(dealId) : null,
      relatedEntityId: String(dealId || accountId || ''),
      relatedEntityType: relatedEntityType || (dealId ? 'deal' : 'account'),
      category,
      content,
      startTime: startTime || null,
      endTime: endTime || null,
      remarkDate: remarkDate || null,
      callLogTime: callLogTime || null,
      ...trackingDetails,
      createdBy: trackingDetails.createdBy || createdBy || actor.id,
      companyId,
      ownerUserId: actor.id,
      projectId: lead?.projectId || null,
      workflowId: remarkData.workflowId || lead?.workflowId || null,
      assignmentMode: assignment.mode,
      assignedUserIds: assignment.userIds,
      assignedUserTypes: assignment.userTypes,
      assignedUserGroups: assignment.userGroups,
      createdAt: now,
      updatedAt: now,
    })

    const reminderUserRefs = reminder ? normalizeReminderUserRefs(reminder) : []

    if (reminder && reminder.date && reminder.time && reminderUserRefs.length > 0) {
      const numericUserIds = Array.from(new Set(reminderUserRefs.map((ref) => toNumber(ref.id)).filter((entry) => entry !== null)))
      const ownerCodes = Array.from(new Set(reminderUserRefs.map((ref) => ref.ownerCode).filter(Boolean)))
      const assignedUserFilters = []
      if (numericUserIds.length > 0) {
        assignedUserFilters.push({ legacyId: { $in: numericUserIds } }, { id: { $in: numericUserIds } })
      }
      if (ownerCodes.length > 0) {
        assignedUserFilters.push({ ownerCode: { $in: ownerCodes } }, { owner_code: { $in: ownerCodes } })
      }

      const assignedUsers = assignedUserFilters.length > 0
        ? await User.find({ $or: assignedUserFilters }).lean()
        : []
      const assignedUserById = new Map(assignedUsers.map((user) => [toNumber(user.legacyId || user.id), user]))
      const assignedUserByOwnerCode = new Map(assignedUsers.flatMap((user) => {
        const code = normalizeText(user.ownerCode || user.owner_code)
        return code ? [[code, user]] : []
      }))
      const assignedUserByName = new Map(assignedUsers.flatMap((user) => {
        const names = [user.name, user.username, user.email].map(normalizeNameKey).filter(Boolean)
        return names.map((name) => [name, user])
      }))

      for (const reminderUserRef of reminderUserRefs) {
        const numericRefId = toNumber(reminderUserRef.id)
        const assignedUser = (
          (numericRefId !== null ? assignedUserById.get(numericRefId) : null)
          || (reminderUserRef.ownerCode ? assignedUserByOwnerCode.get(reminderUserRef.ownerCode) : null)
          || assignedUserByName.get(normalizeNameKey(reminderUserRef.name))
          || null
        )
        const assignedUserId = toNumber(assignedUser?.legacyId || assignedUser?.id)
          ?? numericRefId
          ?? reminderUserRef.id
          ?? reminderUserRef.ownerCode
          ?? reminderUserRef.name
        const assignedOwnerName = assignedUser?.name || reminderUserRef.name || reminderUserRef.username || reminderUserRef.email || ''
        const assignedOwnerCode = assignedUser?.ownerCode || assignedUser?.owner_code || reminderUserRef.ownerCode || null

        await RemarkReminder.create({
          legacyId: await getNextLegacyId('remark_reminders'),
          remarkId: legacyId,
          accountId: toNumber(accountId),
          reminderDate: reminder.date,
          reminderTime: reminder.time,
          assignedTo: assignedUserId,
          assignedOwnerName,
          assignedOwnerCode,
          reminderNote: this.formatReminderNote(reminder),
          closeOldReminders: Boolean(reminder.closeOldReminders),
          isCompleted: false,
          createdBy,
          companyId,
          ownerUserId: assignedUserId,
          projectId: lead.projectId || null,
          workflowId: remarkData.workflowId || lead.workflowId || null,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    await this.logAudit({
      actorId: createdBy,
      companyId,
      action: 'CREATE',
      entityType: 'remark',
      entityId: String(legacyId),
      changes: { content, category, assignment },
    })

    return mapRemark(remark.toObject())
  }

  canSeeReminder(actor, reminder) {
    if (!actor) return false
    if (isPrivilegedRole(actor.role)) return true
    const actorId = toNumber(actor.id)
    return (
      reminder.ownerUserId === actorId
      || reminder.assignedTo === actorId
      || reminder.createdBy === actorId
    )
  }

  async listRemarkReminders(actor) {
    const companyId = actor.companyId || 1
    const baseFilter = { companyId }

    if (!isPrivilegedRole(actor.role)) {
      const actorId = toNumber(actor.id)
      baseFilter.$or = [
        { assignedTo: actorId },
        { ownerUserId: actorId },
        { createdBy: actorId },
      ]
    }

    const records = await RemarkReminder
      .find(baseFilter)
      .sort({ reminderDate: 1, reminderTime: 1, legacyId: 1 })
      .lean()

    const remarkIds = Array.from(new Set(records.map((record) => toNumber(record.remarkId)).filter(Boolean)))
    const remarks = remarkIds.length
      ? await Remark.find({ legacyId: { $in: remarkIds }, companyId }).lean()
      : []
    const remarkById = new Map(remarks.map((remark) => [toNumber(remark.legacyId), remark]))

    return records
      .filter((record) => this.canSeeReminder(actor, record))
      .map((record) => {
        const remark = remarkById.get(toNumber(record.remarkId)) || null
        const mapped = mapReminder(record)
        const accountId = mapped.accountId || remark?.accountId || ''
        return {
          ...mapped,
          accountId,
          account_id: accountId,
          remarkContent: remark?.content || '',
          category: remark?.category || '',
          assignmentMode: remark?.assignmentMode || '',
          assignedUserIds: remark?.assignedUserIds || [],
          assignedUserTypes: remark?.assignedUserTypes || [],
          assignedUserGroups: remark?.assignedUserGroups || [],
        }
      })
  }

  async getRemarksByAccount(accountId, actor) {
    await this.getAccessibleLead(accountId, actor).catch(() => null)
    const numId = toNumber(accountId)
    const strId = String(accountId || '')
    const remarks = await Remark
      .find({
        companyId: actor?.companyId || 1,
        $or: [
          ...(numId !== null ? [{ accountId: numId }, { relatedEntityId: numId }, { relatedEntityId: String(numId) }] : []),
          ...(strId ? [{ accountId: strId }, { relatedEntityId: strId }] : []),
        ]
      })
      .sort({ createdAt: -1, legacyId: -1 })
      .lean()

    const mappedRemarks = []
    for (const remark of remarks) {
      const mappedRemark = await mapRemark(remark)
      const reminders = await RemarkReminder.find({ remarkId: mappedRemark.id, companyId: actor?.companyId || 1 }).lean()
      mappedRemarks.push({
        ...mappedRemark,
        reminders: reminders.map(mapReminder),
      })
    }

    return mappedRemarks
  }

  async getRemarksByDeal(dealId, limit = 50, offset = 0, actor = null) {
    const numId = toNumber(dealId)
    const strId = String(dealId || '')
    const baseFilter = {
      companyId: actor?.companyId || 1,
      $or: [
        ...(numId !== null ? [{ dealId: numId }, { relatedEntityId: numId }, { relatedEntityId: String(numId) }] : []),
        ...(strId ? [{ dealId: strId }, { relatedEntityId: strId }] : []),
      ]
    }
    const records = await Remark
      .find(baseFilter)
      .sort({ createdAt: -1, legacyId: -1 })
      .skip(Math.max(0, Number(offset) || 0))
      .limit(Math.max(1, Number(limit) || 50))
      .lean()

    const visibleRecords = records.filter((remark) => this.canSeeRemark(actor, remark))
    const remarks = []
    for (const remark of visibleRecords) {
      remarks.push(await mapRemark(remark))
    }

    return {
      remarks,
      total: await Remark.countDocuments(baseFilter),
    }
  }

  async updateRemark(remarkId, updateData) {
    const { actor, content, category, createdBy } = updateData
    await this.getRemarkById(remarkId, actor)
    const updates = { updatedAt: new Date() }
    if (content !== undefined) updates.content = content
    if (category !== undefined) updates.category = category

    const updatedRemark = await Remark.findOneAndUpdate(
      { ...byLegacyId(remarkId), companyId: actor.companyId || 1 },
      { $set: updates },
      { new: true }
    ).lean()

    if (!updatedRemark) {
      throw new AppError('Remark not found', 404)
    }

    await this.logAudit({
      actorId: createdBy,
      companyId: actor.companyId || 1,
      action: 'UPDATE',
      entityType: 'remark',
      entityId: String(remarkId),
      changes: { content, category },
    })

    return mapRemark(updatedRemark)
  }

  async deleteRemark(remarkId, actor) {
    await this.getRemarkById(remarkId, actor)
    await RemarkReminder.deleteMany({ remarkId: toNumber(remarkId), companyId: actor.companyId || 1 })
    await Remark.deleteOne({ ...byLegacyId(remarkId), companyId: actor.companyId || 1 })
    await this.logAudit({
      actorId: actor.id,
      companyId: actor.companyId || 1,
      action: 'DELETE',
      entityType: 'remark',
      entityId: String(remarkId),
    })
    return { success: true, message: 'Remark deleted successfully' }
  }

  async createReminder(reminderId, updateData) {
    const { actor, isCompleted, reminderDate, reminderTime, reminderNote } = updateData
    await this.getReminderById(reminderId, actor)
    const updates = { updatedAt: new Date() }
    if (isCompleted !== undefined) updates.isCompleted = Boolean(isCompleted)
    if (reminderDate !== undefined) updates.reminderDate = reminderDate
    if (reminderTime !== undefined) updates.reminderTime = reminderTime
    if (reminderNote !== undefined) updates.reminderNote = reminderNote

    const updatedReminder = await RemarkReminder.findOneAndUpdate(
      { ...byLegacyId(reminderId), companyId: actor.companyId || 1 },
      { $set: updates },
      { new: true }
    ).lean()

    if (!updatedReminder) {
      throw new AppError('Reminder not found', 404)
    }

    return mapReminder(updatedReminder)
  }

  async logAudit(auditData) {
    const { actorId, companyId, action, entityType, entityId, changes } = auditData
    try {
      await AuditLog.create({
        legacyId: await getNextLegacyId('audit_log'),
        actorId,
        companyId: companyId || 1,
        action,
        entityType,
        entityId,
        changes: changes || {},
        createdAt: new Date(),
      })
    } catch (_error) {
      // Audit logging should never block user-facing CRM actions.
    }
  }

  canSeeRemark(actor, remark) {
    if (!actor) return false
    if (isPrivilegedRole(actor.role)) return true
    return (
      remark.ownerUserId === actor.id
      || remark.createdBy === actor.id
      || !remark.assignmentMode
      || (Array.isArray(remark.assignedUserIds) && remark.assignedUserIds.includes(String(actor.id)))
    )
  }

  async getRemarksHistory(accountId, limit = 50, offset = 0, actor = null) {
    await this.getAccessibleLead(accountId, actor).catch(() => null)
    const numId = toNumber(accountId)
    const strId = String(accountId || '')
    const baseFilter = {
      companyId: actor?.companyId || 1,
      $or: [
        ...(numId !== null ? [{ accountId: numId }, { relatedEntityId: numId }, { relatedEntityId: String(numId) }] : []),
        ...(strId ? [{ accountId: strId }, { relatedEntityId: strId }] : []),
      ]
    }
    const records = await Remark
      .find(baseFilter)
      .sort({ createdAt: -1, legacyId: -1 })
      .skip(Math.max(0, Number(offset) || 0))
      .limit(Math.max(1, Number(limit) || 50))
      .lean()

    const visibleRecords = records.filter((remark) => this.canSeeRemark(actor, remark))
    const remarks = []
    for (const remark of visibleRecords) {
      remarks.push(await mapRemark(remark))
    }

    return {
      remarks,
      total: await Remark.countDocuments(baseFilter),
    }
  }

  async getAllRemarks(actor = null, limit = 200) {
    const baseFilter = { companyId: actor?.companyId || 1 }
    const records = await Remark
      .find(baseFilter)
      .sort({ createdAt: -1, legacyId: -1 })
      .limit(Math.max(1, Number(limit) || 200))
      .lean()

    const visibleRecords = actor ? records.filter((remark) => this.canSeeRemark(actor, remark)) : records
    const remarks = []
    for (const remark of visibleRecords) {
      remarks.push(await mapRemark(remark))
    }
    return remarks
  }
}

module.exports = new RemarkService()
