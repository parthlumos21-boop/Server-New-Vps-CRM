const notificationRepository = require('../repositories/notificationRepository')

const createLeadNotificationMessage = ({ actorName, recordName, action }) => {
  if (action === 'created') {
    return `${actorName} created ${recordName}.`
  }

  return `${actorName} updated ${recordName}.`
}

const notifyUsers = async ({ senderId, receiverIds, message, companyId }) => {
  const uniqueReceiverIds = Array.from(new Set((receiverIds || []).filter(Boolean)))

  const records = await Promise.all(
    uniqueReceiverIds.map((receiverId) =>
        notificationRepository.createNotification({
          senderId,
          receiverId,
          message,
          companyId,
        }))
  )

  return records
}

module.exports = {
  createLeadNotificationMessage,
  notifyUsers,
}
