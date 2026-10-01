const messageRepository = require('../repositories/messageRepository')
const notificationRepository = require('../repositories/notificationRepository')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')
const { AppError } = require('../utils/appError')
const userRepository = require('../repositories/userRepository')

const listMessages = async (actor) => {
  return messageRepository.listMessagesForUser(actor)
}

const sendMessage = async (actor, payload = {}) => {
  const receiverIds = Array.from(
    new Set([
      payload.receiverId,
      ...(payload.recipientUserIds || []),
    ].filter(Boolean))
  )
  const body = String(payload.body || '').trim()

  if (receiverIds.length === 0 || !body) {
    throw new AppError('Receiver and message body are required.', 400)
  }

  const allowedRecipients = await userRepository.findUsersByIds(receiverIds, actor.companyId)
  if (allowedRecipients.length !== receiverIds.length) {
    throw new AppError('One or more message recipients are invalid or outside your company scope.', 403)
  }

  const socketServer = getSocketServer()
  const createdMessages = []

  for (const receiverId of receiverIds) {
    const recipientIndex = payload.recipientUserIds?.indexOf(receiverId) ?? -1
    const receiverName = recipientIndex >= 0
      ? payload.recipientUserNames?.[recipientIndex] || ''
      : payload.receiverName || ''

    const message = await messageRepository.createMessage({
      senderId: actor.id,
      senderName: actor.name,
      receiverId,
      receiverName,
      message: body,
      companyId: actor.companyId,
    })

    const notification = await notificationRepository.createNotification({
      senderId: actor.id,
      receiverId,
      message: `${actor.name} sent you a new message.`,
      companyId: actor.companyId,
    })

    if (socketServer) {
      socketServer.emitToUser(receiverId, SOCKET_EVENTS.RECEIVE_MESSAGE, message)
      socketServer.emitToUser(receiverId, SOCKET_EVENTS.PRIVATE_NOTIFICATION, notification)
      socketServer.emitToUser(receiverId, SOCKET_EVENTS.NOTIFICATION, notification)
      socketServer.emitToAdmins(SOCKET_EVENTS.RECEIVE_MESSAGE, message)
    }

    createdMessages.push(message)
  }

  if (socketServer) {
    socketServer.pushActivity('message-created', actor, {
      recipientCount: createdMessages.length,
    })
  }

  return createdMessages
}

module.exports = {
  listMessages,
  sendMessage,
}
