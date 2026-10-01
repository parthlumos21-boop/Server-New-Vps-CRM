const bookmarkRepository = require('../repositories/bookmarkRepository')
const { AppError } = require('../utils/appError')
const { normalizeId } = require('./crudServiceFactory')
const { isPrivilegedRole } = require('../security/accessScope')
const { bookmark } = require('../validation/schemas')

const ensureOwn = (actor, bookmark) => {
  if (!bookmark) throw new AppError('Bookmark not found.', 404)
  if (!isPrivilegedRole(actor.role) && bookmark.userId !== actor.id) {
    throw new AppError('Permission denied.', 403)
  }
}

const list = (actor) => bookmarkRepository.listForUser(actor.id)

const get = async (actor, id) => {
  const bookmark = await bookmarkRepository.findById(normalizeId(id, 'Bookmark'))
  ensureOwn(actor, bookmark)
  return bookmark
}

const create = async (actor, body) => {
  if (!body?.label || !body?.targetPath) {
    throw new AppError('label and targetPath are required.', 400)
  }
  return bookmarkRepository.create({
    userId: actor.id,
    label: body.label,
    targetPath: body.targetPath,
    icon: body.icon || null,
    position: body.position || 0,
  })
}

const update = async (actor, id, body) => {
  const existing = await get(actor, id)
  return bookmarkRepository.update(existing.id, {
    label: body.label,
    targetPath: body.targetPath,
    icon: body.icon,
    position: body.position,
  })
}

const remove = async (actor, id) => {
  const existing = await get(actor, id)
  await bookmarkRepository.remove(existing.id)
  return { id: existing.id }
}

module.exports = { list, get, create, update, remove }
module.exports.validation = {
  create: bookmark,
  update: bookmark,
}
