const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return values

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return values

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      values[key] = value
      return values
    }, {})
}

const deriveDbName = (uri) => {
  try {
    const parsed = new URL(uri)
    const dbName = parsed.pathname.replace(/^\/+/, '').split('/')[0]
    return dbName || 'crm'
  } catch {
    return 'crm'
  }
}

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeName = (value) => String(value || '')
  .trim()
  .replace(/^\d{3,}\s*[-:]\s*/u, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

const getArgValue = (name) => {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length).trim()

  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return String(process.argv[index + 1] || '').trim()
  return ''
}

const buildMongoConfig = () => {
  const env = {
    ...parseEnvFile(path.join(rootDir, '.env')),
    ...parseEnvFile(path.join(serverDir, '.env')),
    ...process.env,
  }
  const uri = env.MONGODB_URI || env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm'
  const dbName = env.MONGODB_DB || env.MONGO_DB || deriveDbName(uri)
  return { uri, dbName }
}

const buildUserQuery = ({ name, email, username }) => {
  const clauses = []
  if (email) clauses.push({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') })
  if (username) clauses.push({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') })
  if (name) {
    clauses.push(
      { name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      { username: new RegExp(`^${escapeRegex(name)}$`, 'i') },
    )
  }
  return clauses.length > 0 ? { $or: clauses } : {}
}

const buildOwnerQuery = ({ user, ownerCode }) => {
  const ownerNames = Array.from(new Set([
    user.name,
    user.username,
    user.email,
  ].map(normalizeName).filter(Boolean)))

  const ownerNameRegexes = ownerNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'))
  const ownerCodeString = String(ownerCode || '').trim()
  const userIdString = String(user._id || user.id || user.legacyId || '').trim()

  const clauses = [
    ...ownerNameRegexes.flatMap((regex) => ([
      { accountOwner: regex },
      { ownerName: regex },
      { accountOwnerName: regex },
      { accountOwnerDisplay: regex },
      { addedBy: regex },
      { 'formData.accountOwner': regex },
      { 'formData.ownerName': regex },
    ])),
  ]

  if (ownerCodeString) {
    clauses.push(
      { ownerCode: ownerCodeString },
      { ownerCode: Number(ownerCodeString) },
      { accountOwnerCode: ownerCodeString },
      { accountOwnerCode: Number(ownerCodeString) },
      { employeeId: ownerCodeString },
      { 'formData.ownerCode': ownerCodeString },
      { 'formData.accountOwnerCode': ownerCodeString },
    )
  }

  if (userIdString) {
    clauses.push(
      { ownerUserId: userIdString },
      { assignedTo: userIdString },
      { createdBy: userIdString },
      { createdByUserId: userIdString },
    )
  }

  return clauses.length > 0 ? { $or: clauses } : {}
}

const printSampleRows = (rows, label) => {
  if (!rows.length) {
    console.log(`${label} sample: none`)
    return
  }

  console.log(`${label} sample:`)
  rows.slice(0, 5).forEach((row, index) => {
    console.log(`  ${index + 1}. owner=${row.accountOwner || row.ownerName || row.formData?.accountOwner || '-'} accountNo=${row.accountNo || row.accountNumber || row.formData?.accountNo || '-'}`)
  })
}

const main = async () => {
  const name = getArgValue('name')
  const email = getArgValue('email')
  const username = getArgValue('username')

  if (!name && !email && !username) {
    console.error('Usage: node tools/check-my-accounts-owner-code.cjs --name "Keval V Shah"')
    console.error('   or: node tools/check-my-accounts-owner-code.cjs --email user@example.com')
    process.exit(1)
  }

  const { uri, dbName } = buildMongoConfig()
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })

  try {
    await client.connect()
    const db = client.db(dbName)
    const users = db.collection('users')
    const leads = db.collection('leads')
    const accounts = db.collection('accounts')

    const user = await users.findOne(buildUserQuery({ name, email, username }))
    if (!user) {
      console.error('No matching user found in users collection.')
      process.exitCode = 1
      return
    }

    const ownerCode = String(user.ownerCode || user.owner_code || user.accountNo || '').trim()

    console.log('My Accounts owner-code check')
    console.log('Mode: DRY RUN - no database updates will be made.')
    console.log('')
    console.log(`Database: ${dbName}`)
    console.log(`User: ${user.name || '-'} (${user.email || user.username || '-'})`)
    console.log(`ownerCode: ${user.ownerCode ?? '-'}`)
    console.log(`owner_code: ${user.owner_code ?? '-'}`)
    console.log(`accountNo: ${user.accountNo ?? '-'}`)
    console.log(`Resolved owner code for My Accounts display: ${ownerCode || 'MISSING'}`)

    if (!ownerCode) {
      console.log('')
      console.log('Result: owner code is missing. Add ownerCode to this user before changing My Accounts display.')
      return
    }

    const ownerQuery = buildOwnerQuery({ user, ownerCode })
    const [leadCount, accountCount, leadSamples, accountSamples] = await Promise.all([
      leads.countDocuments(ownerQuery),
      accounts.countDocuments(ownerQuery),
      leads.find(ownerQuery).project({ accountOwner: 1, ownerName: 1, accountNo: 1, accountNumber: 1, formData: 1 }).limit(5).toArray(),
      accounts.find(ownerQuery).project({ accountOwner: 1, ownerName: 1, accountNo: 1, accountNumber: 1, formData: 1 }).limit(5).toArray(),
    ])

    console.log('')
    console.log(`Matching leads for My Accounts scope: ${leadCount}`)
    console.log(`Matching accounts for My Accounts scope: ${accountCount}`)
    printSampleRows(leadSamples, 'Lead')
    printSampleRows(accountSamples, 'Account')
    console.log('')
    console.log('Frontend rule to implement after review: only on variantKey === "myAccounts", display this resolved owner code in the Account No. column.')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error('Owner-code check failed:', error)
  process.exit(1)
})
