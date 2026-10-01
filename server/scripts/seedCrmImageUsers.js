const { connectDatabase, disconnectDatabase } = require('../config/db')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { hashPassword } = require('../utils/password')

const User = getMongoModel('users')

const CRM_IMAGE_USERS = [
  { name: 'Nita Bhavsar', email: 'mkt@swatiswitchgears.com', password: 'Nita@crm', ownerCode: '1009', canActAsUser: true },
  { name: 'Jay Pandya', email: 'sales2@swatiswitchgears.com', password: 'jays@crm', ownerCode: '1004' },
]

const PROTECTED_NAMES = new Set(['keval v shah'])
const PROTECTED_EMAILS = new Set([
  'keval@swatiswitchgears.com',
])

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slugifyUsername = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60)

const findExistingUser = async ({ name, email }) => {
  const normalizedEmail = normalize(email)
  const normalizedName = normalize(name)

  return User.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') },
      { name: new RegExp(`^${escapeRegex(normalizedName).replace(/\s+/g, '\\s+')}$`, 'i') },
    ],
  }).lean()
}

const ensureUniqueUsername = async (baseUsername, existingId = null) => {
  const base = slugifyUsername(baseUsername) || `user-${Date.now()}`
  let candidate = base
  let counter = 1

  while (true) {
    const match = await User.findOne({ username: new RegExp(`^${escapeRegex(candidate)}$`, 'i') }).lean()
    if (!match || String(match._id) === String(existingId || '')) {
      return candidate
    }
    candidate = `${base}-${counter}`
    counter += 1
  }
}

const isProtectedUser = (user = {}) => (
  PROTECTED_NAMES.has(normalize(user.name))
  || PROTECTED_EMAILS.has(normalize(user.email))
)

const seedCrmImageUsers = async () => {
  await connectDatabase()

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0

  try {
    for (const crmUser of CRM_IMAGE_USERS) {
      if (isProtectedUser(crmUser)) {
        skippedCount += 1
        console.log(`Skipped protected user: ${crmUser.name}`)
        continue
      }

      const existing = await findExistingUser(crmUser)
      if (existing && isProtectedUser(existing)) {
        skippedCount += 1
        console.log(`Skipped protected existing user: ${existing.name || existing.email}`)
        continue
      }

      const passwordHash = await hashPassword(crmUser.password)
      const username = await ensureUniqueUsername(crmUser.email.split('@')[0], existing?._id)
      const now = new Date()

      if (existing) {
        await User.updateOne(
          { _id: existing._id },
          {
            $set: {
              username,
              name: crmUser.name,
              email: normalize(crmUser.email),
              ownerCode: crmUser.ownerCode,
              passwordHash,
              assignedPassword: crmUser.password,
              role: existing.role || 'user',
              canActAsUser: Boolean(crmUser.canActAsUser || existing.canActAsUser || existing.can_act_as_user),
              companyId: existing.companyId ?? existing.company_id ?? 1,
              status: 'approved',
              isApproved: true,
              updatedAt: now,
            },
          }
        )
        updatedCount += 1
        console.log(`Updated user: ${crmUser.name} <${crmUser.email}>`)
        continue
      }

      await User.create({
        legacyId: await getNextLegacyId('users'),
        username,
        name: crmUser.name,
        email: normalize(crmUser.email),
        ownerCode: crmUser.ownerCode,
        passwordHash,
        assignedPassword: crmUser.password,
        role: 'user',
        canActAsUser: Boolean(crmUser.canActAsUser),
        companyId: 1,
        status: 'approved',
        isApproved: true,
        isOnline: false,
        authTokenVersion: 0,
        createdAt: now,
        updatedAt: now,
      })
      createdCount += 1
      console.log(`Created user: ${crmUser.name} <${crmUser.email}>`)
    }

    console.log(`CRM image user seed complete. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`)
  } finally {
    await disconnectDatabase()
  }
}

seedCrmImageUsers().catch(async (error) => {
  console.error('CRM image user seed failed:', error)
  await disconnectDatabase().catch(() => {})
  process.exit(1)
})
