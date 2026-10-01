const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')
const { toNumberOrNull } = require('../security/accessScope')

const User = getMongoModel('users')

const normalizeNumber = toNumberOrNull

const toLegacyUser = (record) => {
  if (!record) return null
  const id = record.legacyId ?? record.id

  return {
    id,
    username: record.username,
    name: record.name,
    owner_code: record.ownerCode ?? record.owner_code ?? null,
    ownerCode: record.ownerCode ?? record.owner_code ?? null,
    auth_token_version: record.authTokenVersion ?? record.auth_token_version ?? 0,
    authTokenVersion: record.authTokenVersion ?? record.auth_token_version ?? 0,
    email: record.email,
    role: record.role,
    actualRole: record.actualRole ?? record.actual_role ?? record.role,
    userRoleMode: record.userRoleMode ?? record.user_role_mode ?? '',
    canActAsUser: Boolean(record.canActAsUser ?? record.can_act_as_user ?? false),
    company_id: record.companyId ?? record.company_id ?? 1,
    companyId: record.companyId ?? record.company_id ?? 1,
    status: record.status,
    is_approved: record.isApproved ?? record.is_approved ?? false,
    isApproved: record.isApproved ?? record.is_approved ?? false,
    is_online: record.isOnline ?? record.is_online ?? false,
    isOnline: record.isOnline ?? record.is_online ?? false,
    password_hash: record.passwordHash ?? record.password_hash,
    passwordHash: record.passwordHash ?? record.password_hash,
    assignedPassword: record.assignedPassword ?? record.assigned_password ?? '',
    created_at: record.createdAt,
    createdAt: record.createdAt,
  }
}

const sanitizeUserRow = (row) => {
  const user = toLegacyUser(row)
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    ownerCode: user.ownerCode,
    authTokenVersion: user.authTokenVersion,
    email: user.email,
    role: user.role,
    actualRole: user.actualRole,
    userRoleMode: user.userRoleMode,
    canActAsUser: user.canActAsUser,
    companyId: user.companyId,
    status: user.status,
    isApproved: user.isApproved,
    isOnline: user.isOnline,
    assignedPassword: user.assignedPassword,
    createdAt: user.createdAt,
  }
}

const sanitizeSession = (session = {}) => ({
  id: session.id || session.sessionId || '',
  deviceName: session.deviceName || 'Unknown device',
  browser: session.browser || 'Unknown browser',
  ipAddress: session.ipAddress || '',
  loginTime: session.loginTime || session.createdAt || null,
  lastActivity: session.lastActivity || null,
  expiresAt: session.expiresAt || null,
})

const findUserByLogin = async (loginValue) => {
  const normalizedLogin = String(loginValue || '').trim().toLowerCase()
  const escapedLogin = normalizedLogin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizedName = normalizedLogin.replace(/[^a-z0-9]+/g, ' ').trim()
  const namePattern = normalizedName
    ? new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}$`, 'i')
    : null
  const record = await User.findOne({
    $or: [
      { username: new RegExp(`^${escapedLogin}$`, 'i') },
      { email: new RegExp(`^${escapedLogin}$`, 'i') },
      ...(namePattern ? [{ name: namePattern }] : []),
    ],
  }).lean()

  return toLegacyUser(record)
}

const findUserById = async (userId) => sanitizeUserRow(await User.findOne(byLegacyId(userId)).lean())

const findRawUserById = async (userId) => toLegacyUser(await User.findOne(byLegacyId(userId)).lean())

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const record = await User.findOne({ email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean()
  return sanitizeUserRow(record)
}

const findUserByName = async (name) => {
  const normalizedName = String(name || '').trim()
  const record = await User.findOne({ name: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean()
  return sanitizeUserRow(record)
}

const listAllUsers = async (companyId = null) => {
  const filter = companyId ? { companyId } : {}
  const records = await User.find(filter).sort({ role: 1, name: 1 }).lean()
  return records.map(sanitizeUserRow)
}

const listUsersByStatus = async (status, companyId = null) => {
  const records = await User
    .find({ status, ...(companyId ? { companyId } : {}) })
    .sort({ createdAt: -1 })
    .lean()

  return records.map(sanitizeUserRow)
}

const listOnlineUsers = async (companyId = null) => {
  const records = await User
    .find({ isOnline: true, ...(companyId ? { companyId } : {}) })
    .sort({ name: 1 })
    .lean()

  return records.map(sanitizeUserRow)
}

const listUserDirectory = async (companyId = null) => {
  const records = await User
    .find({
      ...(companyId ? { companyId } : {}),
      $or: [
        { role: { $in: ['admin', 'super_admin'] } },
        { status: 'approved' },
      ],
    })
    .sort({ role: 1, name: 1 })
    .lean()

  return records.map(sanitizeUserRow)
}

const updateUserOnlineStatus = async (userId, isOnline) => {
  await User.updateOne(byLegacyId(userId), { $set: { isOnline: Boolean(isOnline) } })
}

const incrementAuthTokenVersion = async (userId) => {
  await User.updateOne(byLegacyId(userId), { $inc: { authTokenVersion: 1 } })
}

const saveRefreshTokenHash = async (userId, refreshTokenHash, refreshTokenExpiresAt, session = {}) => {
  const sessionId = session.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const sessionRecord = {
    id: sessionId,
    refreshTokenHash,
    deviceName: session.deviceName || 'Unknown device',
    browser: session.browser || 'Unknown browser',
    ipAddress: session.ipAddress || '',
    portalRole: session.portalRole || '',
    loginTime: session.loginTime || new Date(),
    lastActivity: session.lastActivity || new Date(),
    expiresAt: refreshTokenExpiresAt,
  }

  await User.updateOne(
    byLegacyId(userId),
    {
      $set: {
        refreshTokenHash,
        refreshTokenExpiresAt,
        lastLoginAt: new Date(),
      },
      $pull: {
        refreshSessions: { expiresAt: { $lte: new Date() } },
      },
    }
  )

  await User.updateOne(
    byLegacyId(userId),
    {
      $push: {
        refreshSessions: sessionRecord,
      },
    }
  )

  return sessionRecord
}

const findUserByRefreshTokenHash = async (refreshTokenHash) => {
  if (!refreshTokenHash) return null

  const record = await User.findOne({
    $or: [
      {
        refreshTokenHash,
        refreshTokenExpiresAt: { $gt: new Date() },
      },
      {
        refreshSessions: {
          $elemMatch: {
            refreshTokenHash,
            expiresAt: { $gt: new Date() },
          },
        },
      },
    ],
  }).lean()

  return toLegacyUser(record)
}

const rotateRefreshSession = async (oldRefreshTokenHash, newRefreshTokenHash, refreshTokenExpiresAt) => {
  const record = await User.findOneAndUpdate(
    {
      'refreshSessions.refreshTokenHash': oldRefreshTokenHash,
      'refreshSessions.expiresAt': { $gt: new Date() },
    },
    {
      $set: {
        'refreshSessions.$.refreshTokenHash': newRefreshTokenHash,
        'refreshSessions.$.expiresAt': refreshTokenExpiresAt,
        'refreshSessions.$.lastActivity': new Date(),
      },
    },
    { new: true }
  ).lean()

  if (record) {
    return {
      user: toLegacyUser(record),
      session: (record.refreshSessions || []).find((session) => session.refreshTokenHash === newRefreshTokenHash) || null,
    }
  }

  const legacyRecord = await User.findOneAndUpdate(
    {
      refreshTokenHash: oldRefreshTokenHash,
      refreshTokenExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt,
        lastLoginAt: new Date(),
      },
    },
    { new: true }
  ).lean()

  return legacyRecord ? { user: toLegacyUser(legacyRecord), session: null } : null
}

const revokeRefreshToken = async (userId) => {
  await User.updateOne(
    byLegacyId(userId),
    {
      $unset: {
        refreshTokenHash: '',
        refreshTokenExpiresAt: '',
      },
      $set: {
        refreshSessions: [],
      },
    }
  )
}

const revokeRefreshSessionByHash = async (refreshTokenHash) => {
  if (!refreshTokenHash) return
  await User.updateOne(
    {
      $or: [
        { refreshTokenHash },
        { 'refreshSessions.refreshTokenHash': refreshTokenHash },
      ],
    },
    {
      $unset: {
        refreshTokenHash: '',
        refreshTokenExpiresAt: '',
      },
      $pull: {
        refreshSessions: { refreshTokenHash },
      },
    }
  )
}

const listRefreshSessions = async (userId) => {
  const record = await User.findOne(byLegacyId(userId), { refreshSessions: 1 }).lean()
  return (record?.refreshSessions || [])
    .filter((session) => !session.expiresAt || new Date(session.expiresAt).getTime() > Date.now())
    .map(sanitizeSession)
}

const revokeRefreshSessionById = async (userId, sessionId) => {
  await User.updateOne(
    byLegacyId(userId),
    {
      $pull: {
        refreshSessions: { id: String(sessionId || '') },
      },
    }
  )
}

const updateUserStatus = async (userId, status) => {
  const isApproved = status === 'approved'
  const record = await User.findOneAndUpdate(
    byLegacyId(userId),
    { $set: { status, isApproved } },
    { new: true }
  ).lean()

  return sanitizeUserRow(record)
}

const createUser = async ({ username, name, email, passwordHash, assignedPassword = '', role, companyId = 1, status = 'pending', isApproved = false }) => {
  const legacyId = await getNextLegacyId('users')
  const record = await User.create({
    legacyId,
    username,
    name,
    email,
    passwordHash,
    assignedPassword,
    role,
    companyId,
    status,
    isApproved,
    isOnline: false,
    authTokenVersion: 0,
  })

  return sanitizeUserRow(record)
}

const upsertMicrosoftUser = async ({
  microsoftUserId = '',
  tenantId = '',
  displayName = '',
  email = '',
  username = '',
  profilePhoto = '',
}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return null

  const now = new Date()
  const existing = await User.findOne({
    $or: [
      { email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ...(microsoftUserId ? [{ microsoftUserId }] : []),
    ],
  }).lean()

  if (existing) {
    const record = await User.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          microsoftUserId,
          microsoftTenantId: tenantId,
          name: displayName || existing.name || normalizedEmail,
          email: normalizedEmail,
          username: existing.username || username || normalizedEmail.split('@')[0],
          profilePhoto: profilePhoto || existing.profilePhoto || '',
          outlookConnected: true,
          lastLoginAt: now,
          status: existing.status || 'approved',
          isApproved: existing.isApproved ?? existing.is_approved ?? true,
          updatedAt: now,
        },
      },
      { new: true }
    ).lean()
    return sanitizeUserRow(record)
  }

  const legacyId = await getNextLegacyId('users')
  const record = await User.create({
    legacyId,
    microsoftUserId,
    microsoftTenantId: tenantId,
    username: username || normalizedEmail.split('@')[0],
    name: displayName || normalizedEmail,
    email: normalizedEmail,
    passwordHash: '',
    assignedPassword: '',
    role: 'user',
    companyId: 1,
    profilePhoto,
    outlookConnected: true,
    status: 'approved',
    isApproved: true,
    isOnline: false,
    authTokenVersion: 0,
    lastLoginAt: now,
  })

  return sanitizeUserRow(record)
}

const updateUserDetails = async (userId, { name, email, passwordHash = null, assignedPassword = null }) => {
  const updates = { name, email }
  if (passwordHash) {
    updates.passwordHash = passwordHash
    updates.assignedPassword = assignedPassword || ''
  }

  const record = await User.findOneAndUpdate(byLegacyId(userId), { $set: updates }, { new: true }).lean()
  return sanitizeUserRow(record)
}

const deleteUser = async (userId) => sanitizeUserRow(await User.findOneAndDelete(byLegacyId(userId)).lean())

const findUsersByIds = async (userIds = [], companyId = null) => {
  const normalizedIds = Array.from(new Set((userIds || []).map(normalizeNumber).filter((value) => value !== null)))
  if (normalizedIds.length === 0) return []

  const records = await User
    .find({
      legacyId: { $in: normalizedIds },
      ...(companyId !== null && companyId !== undefined ? { companyId } : {}),
    })
    .sort({ name: 1 })
    .lean()

  return records.map(sanitizeUserRow)
}

const findUsersByOwnerCodes = async (ownerCodes = [], companyId = null) => {
  const normalizedOwnerCodes = Array.from(new Set((ownerCodes || []).map(normalizeNumber).filter((value) => value !== null)))
  if (normalizedOwnerCodes.length === 0) return []

  const records = await User
    .find({
      ownerCode: { $in: normalizedOwnerCodes },
      ...(companyId !== null && companyId !== undefined ? { companyId } : {}),
    })
    .sort({ name: 1 })
    .lean()

  return records.map(sanitizeUserRow)
}

module.exports = {
  findUserByLogin,
  findUserById,
  findRawUserById,
  findUserByEmail,
  findUserByName,
  listAllUsers,
  listUsersByStatus,
  listOnlineUsers,
  listUserDirectory,
  updateUserOnlineStatus,
  incrementAuthTokenVersion,
  saveRefreshTokenHash,
  findUserByRefreshTokenHash,
  rotateRefreshSession,
  revokeRefreshToken,
  revokeRefreshSessionByHash,
  listRefreshSessions,
  revokeRefreshSessionById,
  updateUserStatus,
  createUser,
  upsertMicrosoftUser,
  updateUserDetails,
  deleteUser,
  findUsersByIds,
  findUsersByOwnerCodes,
  sanitizeUserRow,
}
