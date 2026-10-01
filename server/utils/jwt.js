const crypto = require('crypto')
const { AppError } = require('./appError')

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

const base64UrlDecode = (value) => {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const padding = normalized.length % 4
  const paddedValue = padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`
  return Buffer.from(paddedValue, 'base64').toString('utf8')
}

const parseExpiry = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const rawValue = String(value || '1d').trim()
  const match = rawValue.match(/^(\d+)([smhd])$/i)

  if (!match) {
    return 24 * 60 * 60
  }

  const amount = Number.parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 's':
      return amount
    case 'm':
      return amount * 60
    case 'h':
      return amount * 60 * 60
    case 'd':
    default:
      return amount * 24 * 60 * 60
  }
}

const createSignature = (input, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(input)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

const signJwt = (payload, secret, expiresIn = '1d') => {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const body = {
    ...payload,
    iat: now,
    exp: now + parseExpiry(expiresIn),
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(body))
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`, secret)

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

const verifyJwt = (token, secret) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('Authentication token is required.', 401)
  }

  const [encodedHeader, encodedPayload, signature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new AppError('Authentication token is invalid.', 401)
  }

  const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`, secret)
  const expectedBuffer = Buffer.from(expectedSignature)
  const signatureBuffer = Buffer.from(signature)
  if (
    expectedBuffer.length !== signatureBuffer.length
    || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new AppError('Authentication token signature is invalid.', 401)
  }

  let payload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload))
  } catch (error) {
    throw new AppError('Authentication token payload is invalid.', 401, error.message)
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    throw new AppError('Authentication token has expired.', 401)
  }

  return payload
}

module.exports = {
  signJwt,
  verifyJwt,
}
