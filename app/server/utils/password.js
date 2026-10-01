const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const HASH_LENGTH = 64
const BCRYPT_ROUNDS = 12

const hashPassword = async (password) => bcrypt.hash(String(password || ''), BCRYPT_ROUNDS)

const verifyLegacyScryptPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) {
    return false
  }

  const [salt, originalHash] = storedHash.split(':')
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, HASH_LENGTH, (error, key) => {
      if (error) {
        reject(error)
        return
      }

      resolve(key.toString('hex'))
    })
  })

  const left = Buffer.from(originalHash, 'hex')
  const right = Buffer.from(derivedKey, 'hex')

  if (left.length !== right.length) {
    return false
  }

  return crypto.timingSafeEqual(left, right)
}

const verifyPassword = async (password, storedHash) => {
  const hashValue = String(storedHash || '')

  if (!hashValue) {
    return false
  }

  if (hashValue.startsWith('$2a$') || hashValue.startsWith('$2b$') || hashValue.startsWith('$2y$')) {
    return bcrypt.compare(String(password || ''), hashValue)
  }

  return verifyLegacyScryptPassword(String(password || ''), hashValue)
}

module.exports = {
  hashPassword,
  verifyPassword,
}
