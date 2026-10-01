const { env } = require('../config/env')
const userRepository = require('../repositories/userRepository')
const { verifyJwt } = require('../utils/jwt')
const { isPrivilegedRole } = require('../security/accessScope')

const parseCookieHeader = (cookieHeader = '') => (
  String(cookieHeader || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex <= 0) return cookies

      const key = entry.slice(0, separatorIndex).trim()
      const value = entry.slice(separatorIndex + 1).trim()
      if (key) {
        cookies[key] = decodeURIComponent(value)
      }

      return cookies
    }, {})
)

const socketAuth = async (socket, next) => {
  try {
    const cookies = parseCookieHeader(socket.handshake.headers?.cookie)
    const token = socket.handshake.auth?.token || cookies.token || ''
    const payload = verifyJwt(token, env.jwtSecret)
    const currentUser = await userRepository.findUserById(payload.userId)

    if (!currentUser) {
      throw new Error('Socket user not found')
    }

    const tokenVersion = Number.parseInt(String(payload.tokenVersion ?? 0), 10)
    const currentTokenVersion = Number.parseInt(String(currentUser.authTokenVersion ?? 0), 10)
    if (tokenVersion !== currentTokenVersion) {
      throw new Error('Socket token has been invalidated')
    }

    if (!isPrivilegedRole(currentUser.role)
      && (!currentUser.isApproved || currentUser.status !== 'approved')) {
      throw new Error('Socket user account is not active')
    }

    socket.user = {
      id: currentUser.id,
      role: currentUser.role,
      companyId: currentUser.companyId,
      name: currentUser.name,
      email: currentUser.email,
      username: currentUser.username,
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  socketAuth,
}
