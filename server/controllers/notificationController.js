const notificationRepository = require('../repositories/notificationRepository')
const { isPrivilegedRole } = require('../security/accessScope')

const listNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationRepository.listNotificationsByReceiver(
      req.user,
      isPrivilegedRole(req.user.role)
    )

    res.json({
      success: true,
      data: notifications,
    })
  } catch (error) {
    next(error)
  }
}

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await notificationRepository.markNotificationRead(req.params.id, req.user)
    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listNotifications,
  markNotificationRead,
}
