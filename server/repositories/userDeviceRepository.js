const { getMongoModel } = require('../models/mongoModels')

const registerDevice = async ({ userId, companyId, pushToken, platform, deviceId }) => {
  const Model = getMongoModel('user_devices')
  const now = new Date().toISOString()
  
  const query = { pushToken }
  const update = {
    $set: {
      userId,
      companyId,
      pushToken,
      platform,
      deviceId,
      isActive: true,
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  }

  const result = await Model.findOneAndUpdate(query, update, { new: true, upsert: true }).lean()
  return result
}

const unregisterDevice = async (pushToken) => {
  const Model = getMongoModel('user_devices')
  const result = await Model.findOneAndUpdate(
    { pushToken },
    { $set: { isActive: false, updatedAt: new Date().toISOString() } },
    { new: true }
  ).lean()
  return result
}

const getActiveDevicesForUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return []
  const Model = getMongoModel('user_devices')
  return Model.find({ userId: { $in: userIds }, isActive: true }).lean()
}

module.exports = {
  registerDevice,
  unregisterDevice,
  getActiveDevicesForUsers,
}
