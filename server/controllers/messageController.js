const messageService = require('../services/messageService')

const listMessages = async (req, res, next) => {
  try {
    const messages = await messageService.listMessages(req.user)
    res.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    next(error)
  }
}

const sendMessage = async (req, res, next) => {
  try {
    const message = await messageService.sendMessage(req.user, req.body || {})
    res.status(201).json({
      success: true,
      data: message,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listMessages,
  sendMessage,
}
