const customViewRepository = require('../repositories/customViewRepository')
const { AppError } = require('../utils/appError')
const { normalizeId } = require('./crudServiceFactory')
const { isPrivilegedRole } = require('../security/accessScope')

const list = (actor, entityType) => customViewRepository.listForUser(actor, entityType)

const get = async (actor, id) => {
  const view = await customViewRepository.findById(normalizeId(id, 'View'), actor)
  if (!view) throw new AppError('View not found.', 404)
  if (!view.isShared && !isPrivilegedRole(actor.role) && view.userId !== actor.id) {
    throw new AppError('Permission denied.', 403)
  }
  return view
}

const create = async (actor, body) => {
  if (!body?.name || !body?.entityType) {
    throw new AppError('name and entityType are required.', 400)
  }
  return customViewRepository.create({
    userId: actor.id,
    companyId: actor.companyId,
    entityType: body.entityType,
    name: body.name,
    columns: body.columns,
    filters: body.filters,
    sort: body.sort,
    isDefault: body.isDefault,
    isShared: body.isShared,
  })
}

const update = async (actor, id, body) => {
  const existing = await get(actor, id)
  if (!isPrivilegedRole(actor.role) && existing.userId !== actor.id) {
    throw new AppError('Permission denied.', 403)
  }
  return customViewRepository.update(existing.id, actor, body || {})
}

const remove = async (actor, id) => {
  const existing = await get(actor, id)
  if (!isPrivilegedRole(actor.role) && existing.userId !== actor.id) {
    throw new AppError('Permission denied.', 403)
  }
  await customViewRepository.remove(existing.id, actor)
  return { id: existing.id }
}

module.exports = { list, get, create, update, remove }
