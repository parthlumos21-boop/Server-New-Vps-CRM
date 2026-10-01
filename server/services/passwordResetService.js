const passwordResetRepository = require('../repositories/passwordResetRepository')
const userRepository = require('../repositories/userRepository')
const { AppError } = require('../utils/appError')
const { hashPassword } = require('../utils/password')

const MIN_PASSWORD_LENGTH = 8
const DIRECT_RESET_ATTEMPTS = 1

const normalizeLogin = (value) => String(value || '').trim().toLowerCase()

const validatePasswords = (newPassword, confirmPassword) => {
  const passwordValue = String(newPassword || '')
  const confirmValue = String(confirmPassword || '')

  if (!passwordValue || !confirmValue) {
    throw new AppError('New password and confirm password are required.', 400)
  }
  if (passwordValue !== confirmValue) {
    throw new AppError('New password and confirm password must match.', 400)
  }
  if (passwordValue.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400)
  }
}

const requestPasswordReset = async ({ login, newPassword, confirmPassword }, requestMeta = {}) => {
  const loginValue = normalizeLogin(login)
  if (!loginValue) {
    throw new AppError('Enter your username or email before requesting a password reset.', 400)
  }

  validatePasswords(newPassword, confirmPassword)

  const user = await userRepository.findUserByLogin(loginValue)
  if (!user) {
    throw new AppError('No CRM user was found for that username or email.', 404)
  }

  const pendingRequest = await passwordResetRepository.findPendingRequestByUserId(user.id)
  if (pendingRequest) {
    throw new AppError('A password reset request is already pending for administrator approval.', 409)
  }

  const requestCount = await passwordResetRepository.countRequestsByUserId(user.id)
  const attemptCount = requestCount + 1
  const newPasswordHash = await hashPassword(newPassword)
  const shouldApplyImmediately = attemptCount === 1
  const updatedUser = shouldApplyImmediately
    ? await userRepository.updateUserPasswordHash(user.id, newPasswordHash, newPassword)
    : null

  if (shouldApplyImmediately && !updatedUser) {
    throw new AppError('Unable to update user password.', 404)
  }

  const resetRequest = await passwordResetRepository.createRequest({
    user,
    newPasswordHash,
    assignedPassword: newPassword,
    status: shouldApplyImmediately ? 'completed' : 'pending',
    attemptCount,
    maxAttempts: DIRECT_RESET_ATTEMPTS,
    adminActionAt: shouldApplyImmediately ? new Date() : null,
    adminComment: shouldApplyImmediately ? 'Auto-completed first reset attempt.' : '',
    requestMeta,
  })

  await passwordResetRepository.createAuditLog({
    requestId: resetRequest.id,
    userId: user.id,
    email: user.email,
    action: 'submitted',
    metadata: requestMeta,
  })
  if (shouldApplyImmediately) {
    await passwordResetRepository.createAuditLog({
      requestId: resetRequest.id,
      userId: user.id,
      email: user.email,
      action: 'completed',
      comment: 'Auto-completed first reset attempt.',
      metadata: requestMeta,
    })
  }

  return {
    request: resetRequest,
    message: shouldApplyImmediately
      ? 'Password reset successful. You can now sign in with your new password.'
      : 'Password reset request submitted for administrator approval.',
  }
}

const listPasswordResetRequests = async ({ status = 'pending' } = {}) => ({
  requests: await passwordResetRepository.listRequests({ status }),
})

const approvePasswordResetRequest = async (requestId, admin = {}) => {
  const request = await passwordResetRepository.findRequestRecordById(requestId)
  if (!request) {
    throw new AppError('Reset request not found.', 404)
  }
  if (request.status !== 'pending') {
    throw new AppError('Request has already been processed.', 400)
  }

  const updatedUser = await userRepository.updateUserPasswordHash(
    request.userId,
    request.newPasswordHash,
    request.assignedPassword ?? request.assigned_password ?? null
  )
  if (!updatedUser) {
    throw new AppError('Unable to update user password.', 404)
  }

  const adminName = admin.name || admin.username || admin.email || ''
  const sanitizedRequest = await passwordResetRepository.updateRequestStatus(requestId, {
    status: 'completed',
    adminId: admin.id || null,
    adminName,
    adminActionAt: new Date(),
    adminComment: '',
  })

  await passwordResetRepository.createAuditLog({
    requestId: sanitizedRequest.id,
    userId: request.userId,
    email: request.email,
    action: 'approved',
    actorId: admin.id || null,
    actorName: adminName,
  })
  await passwordResetRepository.createAuditLog({
    requestId: sanitizedRequest.id,
    userId: request.userId,
    email: request.email,
    action: 'completed',
    actorId: admin.id || null,
    actorName: adminName,
  })

  return {
    request: sanitizedRequest,
    user: updatedUser,
    message: 'Password reset approved and password updated.',
  }
}

const rejectPasswordResetRequest = async (requestId, admin = {}, comment = '') => {
  const request = await passwordResetRepository.findRequestRecordById(requestId)
  if (!request) {
    throw new AppError('Reset request not found.', 404)
  }
  if (request.status !== 'pending') {
    throw new AppError('Request has already been processed.', 400)
  }

  const adminName = admin.name || admin.username || admin.email || ''
  const adminComment = String(comment || '').trim()
  const sanitizedRequest = await passwordResetRepository.updateRequestStatus(requestId, {
    status: 'rejected',
    adminId: admin.id || null,
    adminName,
    adminActionAt: new Date(),
    adminComment,
  })
  await passwordResetRepository.createAuditLog({
    requestId: sanitizedRequest.id,
    userId: request.userId,
    email: request.email,
    action: 'rejected',
    actorId: admin.id || null,
    actorName: adminName,
    comment: adminComment,
  })

  return {
    request: sanitizedRequest,
    message: 'Password reset request rejected. Existing password was not changed.',
  }
}

module.exports = {
  approvePasswordResetRequest,
  listPasswordResetRequests,
  rejectPasswordResetRequest,
  requestPasswordReset,
}
