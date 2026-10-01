const { connectDatabase } = require('../config/db')
const { getMongoModel } = require('../models/mongoModels')
const { getRuntimeState, isBackendReady, updateRuntimeState } = require('../config/runtimeState')
const logger = require('../utils/logger')

let initializationPromise = null

const CORE_COLLECTIONS = [
  'users',
  'leads',
  'deals',
  'converted_deals',
  'quotations',
  'tasks',
  'tickets',
  'customers',
  'projects',
  'notifications',
  'messages',
  'integrations',
  'app_settings',
  'microsoft_tokens',
  'user_sessions',
  'email_logs',
  'outlook_integrations',
  'settings',
  'custom_views',
  'attachments',
  'reports',
  'report_runs',
  'activity_timeline',
  'system_updates',
  'import_batches',
  'bookmarks',
  'calendar_events',
  'support_requests',
  'user_types',
  'role_mapping',
  'remarks',
  'remark_reminders',
  'audit_log',
]

const getPublicSetupStatus = () => {
  const state = getRuntimeState()

  return {
    ready: isBackendReady(),
    databaseReady: state.databaseReady,
    schemaReady: state.schemaReady,
    lastError: state.lastError ? 'MongoDB is not reachable at the configured connection string.' : '',
    lastCheckedAt: state.lastCheckedAt,
    storage: 'MongoDB',
    nextSteps: state.databaseReady && state.schemaReady
      ? ['System setup is ready.']
      : [
        'Start MongoDB locally, or set MONGODB_URI in server/.env to a MongoDB Atlas connection string.',
        'Run npm --prefix server run db:create after MongoDB is available.',
        'Run npm --prefix server run admin:create -- --email admin@yourcompany.com --password YourAdminPassword123 to create the admin login.',
        'Restart the app with npm run start.',
      ],
  }
}

const ensureDatabaseSetup = async () => {
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      await connectDatabase()
      await Promise.all(CORE_COLLECTIONS.map((collectionName) => getMongoModel(collectionName).syncIndexes()))

      updateRuntimeState({
        databaseReady: true,
        schemaReady: true,
        lastError: '',
      })

      logger.info('MongoDB connection and indexes are ready.')
      return true
    } catch (error) {
      updateRuntimeState({
        databaseReady: false,
        schemaReady: false,
        lastError: error.message || 'Unknown database setup error.',
      })

      logger.warn({ err: error }, 'Database setup is not ready yet.')
      return false
    } finally {
      initializationPromise = null
    }
  })()

  return initializationPromise
}

module.exports = {
  ensureDatabaseSetup,
  getPublicSetupStatus,
  isBackendReady,
}
