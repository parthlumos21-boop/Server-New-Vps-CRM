const { connectDatabase, disconnectDatabase, mongoose } = require('../config/db')
const { env } = require('../config/env')
const { getMongoModel } = require('../models/mongoModels')

const CORE_COLLECTIONS = [
  'users',
  'admins',
  'roles',
  'permissions',
  'companies',
  'accounts',
  'contacts',
  'customers',
  'leads',
  'deals',
  'converted_deals',
  'convertedDeals',
  'quotations',
  'products',
  'invoices',
  'payments',
  'tasks',
  'tickets',
  'appointments',
  'visitors',
  'visitorPasses',
  'qrCodes',
  'notes',
  'activities',
  'activity_timeline',
  'system_updates',
  'calendar_events',
  'projects',
  'emails',
  'whatsapp_messages',
  'whatsappMessages',
  'notifications',
  'messages',
  'documents',
  'attachments',
  'reports',
  'report_runs',
  'dashboardStats',
  'integrations',
  'app_settings',
  'microsoft_tokens',
  'user_sessions',
  'email_logs',
  'outlook_integrations',
  'settings',
  'custom_views',
  'bookmarks',
  'support_requests',
  'supportTickets',
  'import_batches',
  'user_types',
  'role_mapping',
  'remarks',
  'remark_reminders',
  'audit_log',
  'auditLogs',
  'loginHistory',
  'deviceSessions',
  'refreshTokens',
]

const main = async () => {
  try {
    await connectDatabase()
    await mongoose.connection.db.admin().ping()

    console.log(`Connected to MongoDB database "${env.mongo.dbName}".`)
    console.log('Synchronizing collection indexes...')

    for (const collectionName of CORE_COLLECTIONS) {
      const model = getMongoModel(collectionName)
      await model.syncIndexes()
      console.log(`- ${collectionName}`)
    }

    console.log('MongoDB collections and indexes are ready.')
  } catch (error) {
    console.error('Unable to initialize the MongoDB database.')
    console.error(error.message)
    console.log('\nChecks:')
    console.log('1. Make sure MongoDB is running.')
    console.log('2. Confirm server/.env has MONGODB_URI or MONGO_URI set correctly.')
    console.log(`3. Current target database: ${env.mongo.dbName}`)
    process.exitCode = 1
  } finally {
    await disconnectDatabase().catch(() => {})
  }
}

main()
