const designationRepository = require('../repositories/designationRepository')
const { createCrudService } = require('./crudServiceFactory')

const buildPayload = (body, actor, existing) => ({
  name: body.name ?? existing?.name ?? 'Untitled Designation',
  description: body.description ?? existing?.description ?? '',
  departmentId: body.departmentId != null ? Number(body.departmentId) : existing?.departmentId ?? null,
  companyId: existing?.companyId ?? actor.companyId,
})

module.exports = createCrudService({
  repository: designationRepository,
  entityLabel: 'Designation',
  entityType: 'designation',
  buildPayload,
})
