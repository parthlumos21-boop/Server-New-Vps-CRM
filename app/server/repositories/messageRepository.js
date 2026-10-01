const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')

const baseRepository = createCrudRepository({
  table: 'messages',
  ownerColumn: 'receiver_id',
})

const Message = getMongoModel('messages')

const mapMessageRow = (record) => {
  const row = baseRepository.map(record)
  if (!row) return null

  const recipientUserIds = row.recipientUserIds || [row.receiverId].filter(Boolean)
  const recipientUserNames = row.recipientUserNames || [row.receiverName].filter(Boolean)

  return {
    id: row.id,
    companyId: row.companyId || 1,
    senderId: row.senderId,
    senderName: row.senderName,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    recipientUserIds,
    recipientUserNames,
    targetNames: row.targetNames || recipientUserNames,
    recipientCount: row.recipientCount ?? recipientUserIds.length,
    body: row.body || row.message,
    message: row.message || row.body,
    createdAt: row.createdAt,
  }
}

const createMessage = async ({ senderId, senderName, receiverId, receiverName, message, companyId }) => {
  const created = await baseRepository.create({
    senderId,
    senderName,
    receiverId,
    receiverName,
    message,
    body: message,
    recipientUserIds: [receiverId].filter(Boolean),
    recipientUserNames: [receiverName].filter(Boolean),
    companyId: companyId || 1,
  })

  return mapMessageRow(created)
}

const listMessagesForUser = async (user) => {
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const userIdValues = Array.from(new Set([user.id, String(user.id), Number(user.id)].filter((value) => value !== '' && !Number.isNaN(value))))
  const filter = isAdmin
    ? { companyId: user.companyId || 1 }
    : {
        companyId: user.companyId || 1,
        $or: [
          { senderId: { $in: userIdValues } },
          { receiverId: { $in: userIdValues } },
          { recipientUserIds: { $in: userIdValues } },
        ],
      }

  const records = await Message.find(filter).sort({ createdAt: -1, legacyId: -1 }).lean()
  return records.map(mapMessageRow)
}

module.exports = {
  createMessage,
  listMessagesForUser,
}
