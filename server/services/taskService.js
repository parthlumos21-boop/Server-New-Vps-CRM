const taskRepository = require('../repositories/taskRepository')
const { createCrudService } = require('./crudServiceFactory')
const { task } = require('../validation/schemas')

const buildPayload = (body, actor, existing) => ({
  title: body.title ?? existing?.title ?? 'Untitled Task',
  description: body.description ?? existing?.description ?? '',
  status: body.status ?? existing?.status ?? 'open',
  priority: body.priority ?? existing?.priority ?? 'medium',
  dueDate: body.dueDate ?? existing?.dueDate ?? null,
  relatedEntityType: body.relatedEntityType ?? existing?.relatedEntityType ?? null,
  relatedEntityId: body.relatedEntityId != null ? String(body.relatedEntityId) : existing?.relatedEntityId ?? null,
  assignedTo: body.assignedTo ?? existing?.assignedTo ?? (actor.role === 'user' ? actor.id : null),
  createdBy: existing?.createdBy ?? actor.id,
  data: { ...(existing?.data || {}), ...body },
})

const service = createCrudService({
  repository: taskRepository,
  entityLabel: 'Task',
  entityType: 'task',
  buildPayload,
})

service.validation = {
  create: task,
  update: task,
}

module.exports = service
