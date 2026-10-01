const userDeviceRepository = require('../repositories/userDeviceRepository')

const registerDevice = async (actor, payload) => {
  const { pushToken, platform, deviceId } = payload
  if (!pushToken) {
    throw new Error('Push token is required')
  }

  return userDeviceRepository.registerDevice({
    userId: actor.id,
    companyId: actor.companyId,
    pushToken,
    platform: platform || 'unknown',
    deviceId,
  })
}

const unregisterDevice = async (actor, payload) => {
  const { pushToken } = payload
  if (!pushToken) {
    throw new Error('Push token is required')
  }
  return userDeviceRepository.unregisterDevice(pushToken)
}

module.exports = {
  registerDevice,
  unregisterDevice,
}
