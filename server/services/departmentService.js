const departmentRepository = require('../repositories/departmentRepository')
const { createCrudService } = require('./crudServiceFactory')

const buildPayload = (body, actor, existing) => ({
  name: body.name ?? existing?.name ?? 'Untitled Department',
  description: body.description ?? existing?.description ?? '',
  managerId: body.managerId != null ? Number(body.managerId) : existing?.managerId ?? null,
  companyId: existing?.companyId ?? actor.companyId,
})

module.exports = createCrudService({
  repository: departmentRepository,
  entityLabel: 'Department',
  entityType: 'department',
  buildPayload,
})
