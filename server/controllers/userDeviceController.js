const userDeviceService = require('../services/userDeviceService')

const registerDevice = async (req, res, next) => {
  try {
    const result = await userDeviceService.registerDevice(req.user, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

const unregisterDevice = async (req, res, next) => {
  try {
    const result = await userDeviceService.unregisterDevice(req.user, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
}
