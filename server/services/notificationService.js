const notificationRepository = require('../repositories/notificationRepository')

const createLeadNotificationMessage = ({ actorName, recordName, action }) => {
  if (action === 'created') {
    return `${actorName} created ${recordName} Account.`
  }

  return `${actorName} updated ${recordName} Account.`
}

const { Expo } = require('expo-server-sdk')
const expo = new Expo()
const userDeviceRepository = require('../repositories/userDeviceRepository')
const userRepository = require('../repositories/userRepository')

const notifyUsers = async ({ senderId, receiverIds, message, companyId, notificationType, entityType, entityId }) => {
  const uniqueReceiverIds = Array.from(new Set((receiverIds || []).filter(Boolean)))
  
  console.log('\n=======================================')
  console.log('[NOTIFICATION] Activity triggered')
  console.log(`[NOTIFICATION] Sender ID: ${senderId}`)
  console.log(`[NOTIFICATION] Receivers: [${uniqueReceiverIds.join(', ')}]`)
  console.log(`[NOTIFICATION] Message: "${message}"`)
  console.log(`[NOTIFICATION] Entity: ${entityType}/${entityId}`)
  console.log('=======================================')

  if (uniqueReceiverIds.length === 0) {
    console.warn('[NOTIFICATION] No valid receivers. Aborting notification.')
    return []
  }

  const records = await Promise.all(
    uniqueReceiverIds.map((receiverId) =>
        notificationRepository.createNotification({
          senderId,
          receiverId,
          message,
          companyId,
          notificationType,
          entityType,
          entityId,
        }))
  )

  try {
    const socketServer = require('../socket/socketServer').getSocketServer()
    const onlineUsers = await userRepository.listOnlineUsers()
    
    // Normalize IDs to strings for robust Set matching
    const onlineUserIds = new Set(onlineUsers.map(u => String(u.id)))
    const onlineReceiverIds = uniqueReceiverIds.map(String).filter(id => onlineUserIds.has(id))

    // 1. Send via WebSocket (UNCHANGED for existing web/mobile realtime mechanism)
    if (socketServer && onlineReceiverIds.length > 0) {
      records.forEach(record => {
        if (onlineReceiverIds.includes(String(record.receiverId))) {
          console.log(`[NOTIFICATION] Emitting 'crm_notification' via Socket to user: ${record.receiverId}`)
          socketServer.emitToUser(record.receiverId, 'crm_notification', record)
        }
      })
    }

    // 2. Mobile OS Push (Expo Push Service) sent UNCONDITIONALLY
    // Convert receiver IDs to numbers because the mobile app registers the device token with a numeric legacyId!
    const resolvedNumericIds = []
    for (const rid of uniqueReceiverIds) {
      const num = Number(rid)
      if (!isNaN(num)) {
        console.log(`[NOTIFICATION-DIAG] Receiver ${rid} parsed as Numeric ID: ${num}`)
        resolvedNumericIds.push(num)
      } else if (typeof rid === 'string' && rid.length === 24) {
        console.log(`[NOTIFICATION-DIAG] Receiver ${rid} identified as MongoDB ObjectId. Looking up legacy ID in users collection...`)
        // It's a Mongoose ObjectId. We must translate it to the legacyId!
        try {
          const userRec = await userRepository.findRawUserById(rid)
          if (userRec && userRec.id) {
            console.log(`[NOTIFICATION-DIAG] SUCCESS: MongoDB user ${rid} resolves to Legacy ID ${userRec.id}`)
            resolvedNumericIds.push(Number(userRec.id))
          } else {
            console.warn(`[NOTIFICATION-DIAG] FAILED: User found but missing legacy 'id' field for ObjectId ${rid}`)
          }
        } catch (e) {
          console.warn(`[NOTIFICATION-DIAG] ERROR: Failed to query MongoDB users collection for ${rid}`, e.message)
        }
      } else {
         console.warn(`[NOTIFICATION-DIAG] UNKNOWN ID FORMAT for receiver: ${rid}`)
      }
    }
    
    console.log(`[NOTIFICATION-DIAG] Querying user_devices collection for legacy IDs: [${resolvedNumericIds.join(', ')}]`)
    const devices = await userDeviceRepository.getActiveDevicesForUsers(resolvedNumericIds)
    const messages = []

    console.log(`[NOTIFICATION] Mobile devices found: ${devices.length}`)

    for (const device of devices) {
      if (!Expo.isExpoPushToken(device.pushToken)) {
        console.warn(`[NOTIFICATION] Invalid push token for user ${device.userId}: ${device.pushToken}`)
        continue
      }

      console.log(`[NOTIFICATION] Platform: ${device.platform || 'android'}`)
      console.log(`[NOTIFICATION] Push token found for user ${device.userId}: yes`)
      console.log(`[NOTIFICATION] FULL Token: ${device.pushToken}`)

      const record = records.find(r => String(r.receiverId) === String(device.userId))
      
      messages.push({
        to: device.pushToken,
        sound: 'default',
        title: 'CRM Notification',
        body: message,
        data: record || { notificationType, entityType, entityId },
        channelId: 'crm-high-priority', // Uses the newly created Android channel
        priority: 'high', // Forces Android to wake up and show lockscreen notification
        badge: 1,
      })
    }

    if (messages.length > 0) {
      console.log(`[NOTIFICATION] Sending ${messages.length} mobile push notification(s)`)
      console.log(`[NOTIFICATION] EXACT Payload being sent to Expo:`, JSON.stringify(messages, null, 2))
      const chunks = expo.chunkPushNotifications(messages)
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
          console.log(`[NOTIFICATION] Expo ticket:`)
          console.log(JSON.stringify(ticketChunk, null, 2))
          
          // Check for explicit errors in the ticket chunk
          ticketChunk.forEach((ticket, idx) => {
            if (ticket.status === 'error') {
              console.error(`[NOTIFICATION] ERROR sending to ${chunk[idx].to.slice(0, 18)}...:`, ticket.message, ticket.details)
            }
          })
        } catch (pushErr) {
          console.error(`[NOTIFICATION] FATAL EXPO PUSH ERROR:`, pushErr)
        }
      }
    } else {
      console.warn(`[NOTIFICATION] No valid push tokens found for receivers. Mobile Push dropped.`)
    }
    
  } catch (err) {
    console.error('[NOTIFICATION] Failed to process notifications:', err)
  }

  return records
}

module.exports = {
  createLeadNotificationMessage,
  notifyUsers,
}
