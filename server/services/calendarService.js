const calendarRepository = require('../repositories/calendarRepository')
const { createCrudService } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { calendarEvent } = require('../validation/schemas')

const buildPayload = (body, actor, existing) => {
  const startAt = body.startAt ?? existing?.startAt
  if (!startAt) throw new AppError('startAt is required.', 400)
  return {
    title: body.title ?? existing?.title ?? 'Event',
    description: body.description ?? existing?.description ?? '',
    startAt,
    endAt: body.endAt ?? existing?.endAt ?? null,
    allDay: body.allDay ?? existing?.allDay ?? false,
    location: body.location ?? existing?.location ?? null,
    category: body.category ?? existing?.category ?? null,
    color: body.color ?? existing?.color ?? null,
    relatedEntityType: body.relatedEntityType ?? existing?.relatedEntityType ?? null,
    relatedEntityId: body.relatedEntityId != null ? String(body.relatedEntityId) : existing?.relatedEntityId ?? null,
    assignedTo: body.assignedTo ?? existing?.assignedTo ?? actor.id,
    createdBy: existing?.createdBy ?? actor.id,
    data: { ...(existing?.data || {}), ...body },
  }
}

const service = createCrudService({
  repository: calendarRepository,
  entityLabel: 'Calendar event',
  entityType: 'calendar-event',
  buildPayload,
})

service.validation = {
  create: calendarEvent,
  update: calendarEvent,
}

module.exports = service
