const mongoose = require('mongoose')
const { env } = require('./env')

let connectionPromise = null

const assertMongoUriReady = () => {
  if (!env.mongo.uri) {
    throw new Error('Set MONGODB_URI in server/.env before starting the server.')
  }

  if (env.mongo.uri.includes('<db_password>')) {
    throw new Error('Replace <db_password> in server/.env with your real MongoDB Atlas database password.')
  }
}

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  assertMongoUriReady()

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongo.uri, {
      dbName: env.mongo.dbName,
      serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMS,
      maxPoolSize: env.mongo.maxPoolSize,
    })
  }

  await connectionPromise
  return mongoose.connection
}

const disconnectDatabase = async () => {
  connectionPromise = null
  await mongoose.disconnect()
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose,
}
