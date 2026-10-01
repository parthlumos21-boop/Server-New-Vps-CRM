const settingsRepository = require('../repositories/settingsRepository')
const { env } = require('../config/env')
const { connectDatabase } = require('../config/db')
const { getMongoModel } = require('../models/mongoModels')
const { AppError } = require('../utils/appError')
const { isPrivilegedRole } = require('../security/accessScope')

const listGlobal = () => settingsRepository.list('global', null)
const listUser = (actor) => settingsRepository.list('user', String(actor.id))

const getUserSetting = (actor, key) => settingsRepository.getOne('user', String(actor.id), key)
const setUserSetting = (actor, key, value) => settingsRepository.upsert('user', String(actor.id), key, value)
const removeUserSetting = (actor, key) => settingsRepository.remove('user', String(actor.id), key)

const setGlobalSetting = (actor, key, value) => {
  if (!isPrivilegedRole(actor.role)) throw new AppError('Only admins can change global settings.', 403)
  return settingsRepository.upsert('global', null, key, value)
}

const removeGlobalSetting = (actor, key) => {
  if (!isPrivilegedRole(actor.role)) throw new AppError('Only admins can change global settings.', 403)
  return settingsRepository.remove('global', null, key)
}

const getSetupStatus = async (actor) => {
  if (!isPrivilegedRole(actor.role)) throw new AppError('Only admins can view setup status.', 403)

  await connectDatabase()
  const User = getMongoModel('users')
  const usersCollectionExists = true
  const baseStatus = {
    database: {
      connected: true,
      storage: 'MongoDB',
      target: {
        mode: 'mongodb_uri',
        databaseUrlConfigured: Boolean(env.mongo.uri),
        database: env.mongo.dbName,
      },
    },
    schema: {
      usersCollectionExists,
    },
    admin: {
      exists: false,
      count: 0,
      accounts: [],
    },
    users: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      disabled: 0,
      online: 0,
    },
    setupComplete: false,
    nextSteps: [],
    accessGuide: {
      admin: 'Login with the fixed MongoDB admin account after running npm run admin:create.',
      user: 'Create users from Admin > User Management, then approve them before first login.',
    },
  }

  const [adminRecords, counts] = await Promise.all([
    User.find({ role: 'admin' }).sort({ legacyId: 1 }).lean(),
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          disabled: { $sum: { $cond: [{ $eq: ['$status', 'disabled'] }, 1, 0] } },
          online: { $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] } },
        },
      },
    ]),
  ])

  const adminAccounts = adminRecords.map((row) => ({
    id: row.legacyId ?? row.id,
    username: row.username,
    email: row.email,
    status: row.status,
    isApproved: row.isApproved ?? row.is_approved,
  }))
  const userCounts = counts[0] || {}

  const nextSteps = []
  if (adminAccounts.length === 0) {
    nextSteps.push('Create the fixed admin account with npm run admin:create -- --email admin@yourcompany.com --password YourAdminPassword123')
  }
  if (adminAccounts.length > 1) {
    nextSteps.push('More than one admin account exists. Keep only the fixed admin account for production access control.')
  }
  if (Number(userCounts.pending || 0) > 0) {
    nextSteps.push('Approve pending users from Admin > User Management before they can access the user dashboard.')
  }

  return {
    ...baseStatus,
    admin: {
      exists: adminAccounts.length > 0,
      count: adminAccounts.length,
      accounts: adminAccounts,
    },
    users: {
      total: Number(userCounts.total || 0),
      pending: Number(userCounts.pending || 0),
      approved: Number(userCounts.approved || 0),
      rejected: Number(userCounts.rejected || 0),
      disabled: Number(userCounts.disabled || 0),
      online: Number(userCounts.online || 0),
    },
    setupComplete: adminAccounts.length === 1,
    nextSteps: nextSteps.length > 0 ? nextSteps : ['System setup looks ready. Admin and approved users can access the CRM.'],
  }
}

module.exports = {
  listGlobal, listUser,
  getUserSetting, setUserSetting, removeUserSetting,
  setGlobalSetting, removeGlobalSetting,
  getSetupStatus,
}
