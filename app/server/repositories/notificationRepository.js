const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'notifications',
  ownerColumn: 'receiver_id',
})

const Notification = getMongoModel('notifications')

const mapNotificationRow = (record) => {
  const row = baseRepository.map(record)
  if (!row) return null

  return {
    id: row.id,
    companyId: row.companyId || 1,
    senderId: row.senderId,
    receiverId: row.receiverId,
    message: row.message,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt,
  }
}

const createNotification = async ({ senderId, receiverId, message, companyId }) => {
  const created = await baseRepository.create({
    senderId,
    receiverId,
    message,
    isRead: false,
    companyId: companyId || 1,
  })

  return mapNotificationRow(created)
}

const listNotificationsByReceiver = async (actor, includeAdminFeed = false) => {
  const receiverFilter = includeAdminFeed
    ? {}
    : { receiverId: actor.id }

  const records = await Notification
    .find({
      companyId: actor.companyId || 1,
      ...receiverFilter,
      isRead: { $ne: true },
      is_read: { $ne: true },
    })
    .sort({ createdAt: -1, legacyId: -1 })
    .lean()

  return records.map(mapNotificationRow)
}

const markNotificationRead = async (notificationId, actor) => {
  const isAdmin = actor.role === 'admin' || actor.role === 'super_admin'
  const record = await Notification.findOneAndUpdate(
    {
      ...byLegacyId(notificationId),
      companyId: actor.companyId || 1,
      ...(isAdmin ? {} : { receiverId: actor.id }),
    },
    { $set: { isRead: true, is_read: true } },
    { new: true }
  ).lean()

  return mapNotificationRow(record)
}

module.exports = {
  createNotification,
  listNotificationsByReceiver,
  markNotificationRead,
  mapNotificationRow,
}
