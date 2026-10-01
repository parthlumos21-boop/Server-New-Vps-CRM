const { connectDatabase, disconnectDatabase, mongoose } = require('../config/db')
const { env } = require('../config/env')
const { getMongoModel } = require('../models/mongoModels')

const User = getMongoModel('users')

const logSection = (title) => {
  console.log(`\n=== ${title} ===`)
}

const printLine = (label, value) => {
  console.log(`${label}: ${value}`)
}

const redactMongoUri = (uri = '') => {
  if (!uri) return '-'
  try {
    const parsed = new URL(uri)
    if (parsed.password) parsed.password = '***'
    if (parsed.username) parsed.username = parsed.username ? '***' : ''
    return parsed.toString()
  } catch (_error) {
    return uri.replace(/\/\/([^:@/]+):([^@/]+)@/u, '//***:***@')
  }
}

const countUsersByStatus = async () => {
  const rows = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ])

  return rows.reduce((counts, row) => {
    counts[row._id || 'unknown'] = row.count
    counts.total += row.count
    return counts
  }, { total: 0, pending: 0, approved: 0, disabled: 0 })
}

const main = async () => {
  logSection('Connection Target')
  printLine('Mongo URI', redactMongoUri(env.mongo.uri))
  printLine('Mongo database', env.mongo.dbName)

  try {
    await connectDatabase()
    await mongoose.connection.db.admin().ping()

    logSection('MongoDB')
    printLine('Connected', 'yes')
    printLine('Database', mongoose.connection.name)
    printLine('Host', mongoose.connection.host || '-')

    logSection('Collections')
    const collections = await mongoose.connection.db.listCollections().toArray()
    printLine('Count', collections.length)
    printLine('Users collection', collections.some((collection) => collection.name === 'users') ? 'present' : 'will be created on first write')

    logSection('Admin Account')
    const adminAccounts = await User
      .find({ role: 'admin' })
      .sort({ legacyId: 1, id: 1, createdAt: 1 })
      .lean()

    if (adminAccounts.length === 0) {
      printLine('Admin account', 'missing')
      logSection('Next Step')
      console.log('Create the fixed admin account with:')
      console.log('npm run admin:create -- --email admin@yourcompany.com --password YourAdminPassword123')
      return
    }

    adminAccounts.forEach((row, index) => {
      console.log(
        `Admin ${index + 1}: username=${row.username}, email=${row.email}, status=${row.status}, approved=${row.isApproved ?? row.is_approved}`
      )
    })

    if (adminAccounts.length > 1) {
      console.log('Warning: more than one admin account exists.')
    }

    const counts = await countUsersByStatus()
    logSection('Users')
    printLine('Total', counts.total || 0)
    printLine('Pending', counts.pending || 0)
    printLine('Approved', counts.approved || 0)
    printLine('Disabled', counts.disabled || 0)

    logSection('Result')
    console.log('Backend access prerequisites look ready for MongoDB.')
    console.log('Users must be created by admin and approved before login.')
  } catch (error) {
    logSection('Result')
    console.log('MongoDB check failed.')
    console.log(error.message)
    console.log('\nRecommended checks:')
    console.log(`1. Make sure MongoDB is running and reachable at ${redactMongoUri(env.mongo.uri)}.`)
    console.log('2. Confirm server/.env has MONGODB_URI or MONGO_URI set correctly.')
    console.log('3. Run npm run db:create to connect and sync collection indexes.')
    process.exitCode = 1
  } finally {
    await disconnectDatabase().catch(() => {})
  }
}

main()
