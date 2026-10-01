const reminderRepository = require('../repositories/reminderRepository')
const { createCrudService } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { reminder } = require('../validation/schemas')

const buildPayload = (body, actor, existing) => {
  const remindAt = body.remindAt ?? existing?.remindAt
  if (!remindAt) {
    throw new AppError('Reminder requires remindAt.', 400)
  }
  return {
    title: body.title ?? existing?.title ?? 'Reminder',
    message: body.message ?? existing?.message ?? '',
    remindAt,
    recurrence: body.recurrence ?? existing?.recurrence ?? 'none',
    status: body.status ?? existing?.status ?? 'scheduled',
    relatedEntityType: body.relatedEntityType ?? existing?.relatedEntityType ?? null,
    relatedEntityId: body.relatedEntityId != null ? String(body.relatedEntityId) : existing?.relatedEntityId ?? null,
    assignedTo: body.assignedTo ?? existing?.assignedTo ?? actor.id,
    createdBy: existing?.createdBy ?? actor.id,
    data: { ...(existing?.data || {}), ...body },
  }
}

const service = createCrudService({
  repository: reminderRepository,
  entityLabel: 'Reminder',
  entityType: 'reminder',
  buildPayload,
})

service.validation = {
  create: reminder,
  update: reminder,
}

module.exports = service
