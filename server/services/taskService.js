const taskRepository = require('../repositories/taskRepository')
const { createCrudService } = require('./crudServiceFactory')
const { task, taskUpdate } = require('../validation/schemas')
const { getMongoModel } = require('../models/mongoModels')

const User = getMongoModel('users')

const calculateProgress = (subtasks, fallbackProgress) => {
  if (Array.isArray(subtasks) && subtasks.length > 0) {
    const completedCount = subtasks.filter((s) => Boolean(s.completed)).length
    return Math.round((completedCount / subtasks.length) * 100)
  }
  return typeof fallbackProgress === 'number' ? fallbackProgress : 0
}

const buildPayload = async (body, actor, existing) => {
  const actorEmail = String(actor?.email || actor?.username || actor?.id || '').trim().toLowerCase()
  const rawSubtasks = Array.isArray(body.subtasks) ? body.subtasks : (existing?.subtasks || [])
  const progress = calculateProgress(rawSubtasks, body.progress ?? existing?.progress)

  const assignedToUserEmails = Array.isArray(body.assignedToUserEmails)
    ? body.assignedToUserEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
    : (existing?.assignedToUserEmails || (body.assignedTo ? [String(body.assignedTo).trim().toLowerCase()] : []))

  const primaryAssignedTo = assignedToUserEmails.length > 0
    ? assignedToUserEmails[0]
    : (body.assignedTo ?? existing?.assignedTo ?? (actor.role === 'user' ? actorEmail : null))

  let createdByName = existing?.createdByName || actor?.name || ''
  if (!createdByName && actorEmail) {
    try {
      const userDoc = await User.findOne({ $or: [{ email: actorEmail }, { legacyId: Number(actor?.id) || -1 }] }).lean()
      if (userDoc) {
        createdByName = userDoc.name || userDoc.username || actorEmail
      }
    } catch (e) {}
  }
  if (!createdByName) createdByName = actor?.name || actorEmail.split('@')[0] || 'User'

  return {
    title: body.title ?? existing?.title ?? 'Untitled Task',
    description: body.description ?? existing?.description ?? '',
    status: body.status ?? existing?.status ?? 'open',
    priority: body.priority ?? existing?.priority ?? 'medium',
    dueDate: body.dueDate ?? existing?.dueDate ?? null,
    startDate: body.startDate ?? existing?.startDate ?? null,
    relatedEntityType: body.relatedEntityType ?? existing?.relatedEntityType ?? null,
    relatedEntityId: body.relatedEntityId != null ? String(body.relatedEntityId) : existing?.relatedEntityId ?? null,
    assignedTo: primaryAssignedTo,
    assignedToUserEmails,
    createdBy: existing?.createdBy ?? actorEmail,
    createdByEmail: existing?.createdByEmail ?? actorEmail,
    createdByName,
    followers: Array.isArray(body.followers) ? body.followers : (existing?.followers || []),
    subtasks: rawSubtasks,
    progress,
    estimatedMinutes: Number(body.estimatedMinutes ?? existing?.estimatedMinutes ?? 0),
    actualMinutes: Number(body.actualMinutes ?? existing?.actualMinutes ?? 0),
    isTimerRunning: Boolean(body.isTimerRunning ?? existing?.isTimerRunning ?? false),
    slaDeadline: body.slaDeadline ?? existing?.slaDeadline ?? null,
    slaStatus: body.slaStatus ?? existing?.slaStatus ?? 'compliant',
    projectId: body.projectId != null ? String(body.projectId) : (existing?.projectId ?? null),
    dealId: body.dealId != null ? String(body.dealId) : (existing?.dealId ?? null),
    accountId: body.accountId != null ? String(body.accountId) : (existing?.accountId ?? null),
    quotationId: body.quotationId != null ? String(body.quotationId) : (existing?.quotationId ?? null),
    customerId: body.customerId != null ? String(body.customerId) : (existing?.customerId ?? null),
    tags: Array.isArray(body.tags) ? body.tags : (existing?.tags || []),
    data: { ...(existing?.data || {}), ...body, assignedToUserEmails, createdByEmail: actorEmail, createdByName },
  }
}

const service = createCrudService({
  repository: taskRepository,
  entityLabel: 'Task',
  entityType: 'task',
  buildPayload,
})

service.validation = {
  create: task,
  update: taskUpdate,
}

module.exports = service
