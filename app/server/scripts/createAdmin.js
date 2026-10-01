const { connectDatabase, disconnectDatabase } = require('../config/db')
const { env } = require('../config/env')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { hashPassword } = require('../utils/password')

const User = getMongoModel('users')

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag)
  if (index === -1) return ''
  return process.argv[index + 1] || ''
}

const logSection = (title) => {
  console.log(`\n=== ${title} ===`)
}

const validateInputs = ({ email, password, username, name }) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || !password) {
    console.error('Usage: npm run admin:create -- --email admin@yourcompany.com --password YourAdminPassword123 [--username admin] [--name "System Administrator"]')
    process.exitCode = 1
    return false
  }

  if (!emailRegex.test(email)) {
    console.error('Please provide a valid admin email address.')
    process.exitCode = 1
    return false
  }

  if (password.length < 6) {
    console.error('Admin password must be at least 6 characters.')
    process.exitCode = 1
    return false
  }

  if (!username) {
    console.error('Admin username cannot be empty.')
    process.exitCode = 1
    return false
  }

  if (!name) {
    console.error('Admin display name cannot be empty.')
    process.exitCode = 1
    return false
  }

  return true
}

const exactRegex = (value) => new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

const loadPreflight = async ({ email, username }) => {
  const [emailMatch, usernameMatch, adminAccounts] = await Promise.all([
    User.findOne({ email: exactRegex(email) }).lean(),
    User.findOne({ username: exactRegex(username) }).lean(),
    User.find({ role: 'admin' }).sort({ legacyId: 1, id: 1, createdAt: 1 }).lean(),
  ])

  return {
    emailMatch,
    usernameMatch,
    adminAccounts,
  }
}

const resolveTargetRow = ({ emailMatch, usernameMatch, username, email }) => {
  if (!emailMatch && !usernameMatch) {
    return { mode: 'insert', targetId: null }
  }

  if (emailMatch && usernameMatch && String(emailMatch._id) !== String(usernameMatch._id)) {
    throw new Error(
      `Conflict detected: email "${email}" belongs to user "${emailMatch.username}", while username "${username}" belongs to "${usernameMatch.email}". Resolve one of those records first.`
    )
  }

  const matchedRow = emailMatch || usernameMatch
  if (!matchedRow) {
    return { mode: 'insert', targetId: null }
  }

  if (usernameMatch && !emailMatch && usernameMatch.role !== 'admin') {
    throw new Error(
      `Username "${username}" already belongs to non-admin user "${usernameMatch.email}". Use a different --username or update that user first.`
    )
  }

  return { mode: 'update', targetId: matchedRow._id }
}

const printConnectionTarget = () => {
  logSection('Connection Target')
  console.log(`Mongo database: ${env.mongo.dbName}`)
  console.log(`Mongo URI: ${env.mongo.uri ? 'set' : 'missing'}`)
}

const main = async () => {
  const email = String(getArgValue('--email') || '').trim().toLowerCase()
  const password = String(getArgValue('--password') || '')
  const username = String(getArgValue('--username') || 'admin').trim().toLowerCase()
  const name = String(getArgValue('--name') || 'System Administrator').trim()

  if (!validateInputs({ email, password, username, name })) {
    return
  }

  const passwordHash = await hashPassword(password)

  try {
    printConnectionTarget()
    await connectDatabase()

    const preflight = await loadPreflight({ email, username })
    const { mode, targetId } = resolveTargetRow({
      emailMatch: preflight.emailMatch,
      usernameMatch: preflight.usernameMatch,
      username,
      email,
    })

    logSection('Preflight')
    console.log(`Existing admin accounts: ${preflight.adminAccounts.length}`)
    console.log(`Target action: ${mode === 'insert' ? 'create new admin account' : 'update existing account into the fixed admin account'}`)

    const legacyId = mode === 'insert'
      ? await getNextLegacyId('users')
      : (preflight.emailMatch || preflight.usernameMatch).legacyId || (preflight.emailMatch || preflight.usernameMatch).id || await getNextLegacyId('users')

    const adminPayload = {
      legacyId,
      id: legacyId,
      username,
      name,
      email,
      passwordHash,
      password_hash: passwordHash,
      role: 'admin',
      status: 'approved',
      isApproved: true,
      is_approved: true,
      isOnline: false,
      is_online: false,
      companyId: 1,
      company_id: 1,
      authTokenVersion: 0,
      auth_token_version: 0,
    }

    const row = mode === 'update'
      ? await User.findByIdAndUpdate(targetId, { $set: adminPayload }, { new: true, runValidators: true }).lean()
      : await User.create(adminPayload)

    const adminCount = await User.countDocuments({ role: 'admin' })

    logSection('Result')
    console.log('Admin account is ready.')
    console.log(`Username: ${row.username}`)
    console.log(`Email: ${row.email}`)
    console.log(`Status: ${row.status}`)
    console.log(`Approved: ${row.isApproved ?? row.is_approved}`)
    console.log(`Admin accounts in database: ${adminCount}`)

    if (adminCount > 1) {
      console.log('Warning: more than one admin account exists. Keep only the intended admin accounts for production access control.')
    }
  } catch (error) {
    console.log('Failed to create or update the admin account.')
    console.log(error.message)
    console.log('\nRecommended checks:')
    console.log('1. Run npm run doctor and confirm MongoDB is connected.')
    console.log('2. Confirm server/.env has MONGODB_URI or MONGO_URI set correctly.')
    console.log('3. If the error mentions a username or email conflict, clean up that existing user or choose a different --username.')
    process.exitCode = 1
  } finally {
    await disconnectDatabase().catch(() => {})
  }
}

main()
