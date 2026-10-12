const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { mapMongoDocument } = require('../utils/mongoRecordMapper')
const { sortFromOrder } = require('./mongoQueryHelpers')

const baseRepo = createCrudRepository({ table: 'tasks', jsonbColumns: ['data'] })
const TaskModel = getMongoModel('tasks')
const defaultSort = sortFromOrder('updated_at DESC, id DESC')

const listForActor = async (actor, options = {}) => {
  const visibleFilter = { frontendDeleted: { $ne: true } }
  const isPrivileged = ['admin', 'super_admin'].includes((actor?.role || '').toLowerCase())

  if (isPrivileged || options.companyWide) {
    const records = await TaskModel.find(visibleFilter).sort(defaultSort).lean()
    return records.map(mapMongoDocument)
  }

  const actorEmail = String(actor?.email || actor?.username || '').trim().toLowerCase()
  const actorId = actor?.id ? Number(actor.id) : -1

  const userFilter = {
    ...visibleFilter,
    $or: [
      { assignedTo: actorEmail },
      { assignedToUserEmails: actorEmail },
      { createdBy: actorEmail },
      { createdByEmail: actorEmail },
      ...(actorId > 0 ? [{ assignedTo: actorId }, { ownerUserId: actorId }, { createdBy: actorId }] : []),
    ],
  }

  const records = await TaskModel.find(userFilter).sort(defaultSort).lean()
  return records.map(mapMongoDocument)
}

module.exports = {
  ...baseRepo,
  listForActor,
}
