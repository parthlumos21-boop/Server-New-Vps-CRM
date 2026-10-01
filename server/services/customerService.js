const customerRepository = require('../repositories/customerRepository')
const { createCrudService } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { customerCreate, customerUpdate } = require('../validation/schemas')

const buildPayload = (body, actor, existing) => {
  const name = body.name ?? existing?.name
  if (!name) throw new AppError('Customer name is required.', 400)
  return {
    name,
    email: body.email ?? existing?.email ?? null,
    phone: body.phone ?? existing?.phone ?? null,
    company: body.company ?? existing?.company ?? null,
    address: body.address ?? existing?.address ?? null,
    city: body.city ?? existing?.city ?? null,
    state: body.state ?? existing?.state ?? null,
    country: body.country ?? existing?.country ?? null,
    postalCode: body.postalCode ?? existing?.postalCode ?? null,
    status: body.status ?? existing?.status ?? 'active',
    source: body.source ?? existing?.source ?? null,
    assignedTo: body.assignedTo ?? existing?.assignedTo ?? (actor.role === 'user' ? actor.id : null),
    createdBy: existing?.createdBy ?? actor.id,
    data: { ...(existing?.data || {}), ...body },
  }
}

const service = createCrudService({
  repository: customerRepository,
  entityLabel: 'Customer',
  entityType: 'customer',
  buildPayload,
})

service.validation = {
  create: customerCreate,
  update: customerUpdate,
}

const applyStrictIsolation = (actor) => {
  const email = String(actor?.email || '').toLowerCase().trim()
  if (email === 'keval@swatiswitchgears.com') return { ...actor, role: 'admin' }
  return { ...actor, role: 'user' }
}

module.exports = {
  ...service,
  list: (actor, filters = {}) => service.list(applyStrictIsolation(actor), filters),
  get: (actor, id) => service.get(applyStrictIsolation(actor), id),
  search: (actor, query) => service.search(applyStrictIsolation(actor), query),
}
