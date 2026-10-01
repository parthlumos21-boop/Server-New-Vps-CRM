const passwordResetService = require('../services/passwordResetService')

const getRequestMeta = (req) => ({
  userAgent: req.headers['user-agent'] || '',
  ipAddress: req.ip || req.socket?.remoteAddress || '',
})

const submitRequest = async (req, res, next) => {
  try {
    const result = await passwordResetService.requestPasswordReset(req.body || {}, getRequestMeta(req))
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.request,
    })
  } catch (error) {
    next(error)
  }
}

const listRequests = async (req, res, next) => {
  try {
    const result = await passwordResetService.listPasswordResetRequests({ status: req.query?.status || 'pending' })
    res.json({
      success: true,
      data: result.requests,
    })
  } catch (error) {
    next(error)
  }
}

const approveRequest = async (req, res, next) => {
  try {
    const result = await passwordResetService.approvePasswordResetRequest(req.params.id, req.user)
    res.json({
      success: true,
      message: result.message,
      data: result.request,
    })
  } catch (error) {
    next(error)
  }
}

const rejectRequest = async (req, res, next) => {
  try {
    const result = await passwordResetService.rejectPasswordResetRequest(req.params.id, req.user, req.body?.comment)
    res.json({
      success: true,
      message: result.message,
      data: result.request,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  approveRequest,
  listRequests,
  rejectRequest,
  submitRequest,
}
