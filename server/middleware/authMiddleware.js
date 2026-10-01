const { env } = require('../config/env')
const userRepository = require('../repositories/userRepository')
const { AppError } = require('../utils/appError')
const { verifyJwt } = require('../utils/jwt')
const { isPrivilegedRole } = require('../security/accessScope')
const userTypeService = require('../services/userTypeService')

const extractBearerToken = (authorizationHeader = '') => {
  const [scheme, token] = String(authorizationHeader || '').split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return ''
  }

  return token
}

const extractToken = (req) => {
  const bearer = extractBearerToken(req.headers.authorization)
  if (bearer) return bearer
  if (req.cookies?.token) return req.cookies.token
  return ''
}

const authenticateToken = async (token) => {
  const payload = verifyJwt(token, env.jwtSecret)
  const currentUser = await userRepository.findUserById(payload.userId)

  if (!currentUser) {
    throw new AppError('User not found.', 401)
  }

  const tokenVersion = Number.parseInt(String(payload.tokenVersion ?? 0), 10)
  const currentTokenVersion = Number.parseInt(String(currentUser.authTokenVersion ?? 0), 10)
  if (tokenVersion !== currentTokenVersion) {
    throw new AppError('Authentication token has been invalidated.', 401)
  }

  if (!isPrivilegedRole(currentUser.role)) {
    if (!currentUser.isApproved || currentUser.status !== 'approved') {
      throw new AppError('Your account is not approved to access this resource.', 403)
    }
  }

  const tokenRole = String(payload.role || '').trim().toLowerCase()
  const effectiveRole = tokenRole === 'user' && currentUser.canActAsUser && isPrivilegedRole(currentUser.role)
    ? 'user'
    : currentUser.role

  const user = {
    id: currentUser.id,
    role: effectiveRole,
    actualRole: currentUser.role,
    userRoleMode: currentUser.userRoleMode,
    canActAsUser: currentUser.canActAsUser,
    companyId: currentUser.companyId,
    name: currentUser.name,
    email: currentUser.email,
    username: currentUser.username,
    ownerCode: currentUser.ownerCode,
    status: currentUser.status,
    isApproved: currentUser.isApproved,
  }

  const access = await userTypeService.getEffectivePermissionsForUser(user)
  user.assignedUserTypeIds = access.assignedTypeIds
  user.permissions = access.permissions

  return user
}

const requireAuth = async (req, _res, next) => {
  try {
    const token = extractToken(req)
    req.user = await authenticateToken(token)
    next()
  } catch (error) {
    next(error)
  }
}

const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractToken(req)
    req.user = token ? await authenticateToken(token) : null
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  extractBearerToken,
  extractToken,
}
