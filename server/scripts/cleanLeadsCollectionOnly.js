const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanLeadsCollectionOnly() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Lead = getMongoModel('leads')

    const countBefore = await Lead.countDocuments({})
    console.log(`Before cleanup -> Leads documents: ${countBefore}`)

    const result = await Lead.deleteMany({})
    console.log(`Cleanup complete -> Removed ${result.deletedCount || 0} documents from leads collection.`)

    const countAfter = await Lead.countDocuments({})
    console.log(`After cleanup -> Leads remaining: ${countAfter}`)

    await mongoose.disconnect()
    console.log('MongoDB disconnected successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to clean leads collection:', err)
    process.exit(1)
  }
}

cleanLeadsCollectionOnly()
