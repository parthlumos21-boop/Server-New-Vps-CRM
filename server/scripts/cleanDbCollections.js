const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanCollections() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')

    const leadCountBefore = await Lead.countDocuments({})
    const dealCountBefore = await Deal.countDocuments({})

    console.log(`Before cleanup -> Leads: ${leadCountBefore}, Deals: ${dealCountBefore}`)

    const leadResult = await Lead.deleteMany({})
    const dealResult = await Deal.deleteMany({})

    console.log(`Cleanup complete -> Removed ${leadResult.deletedCount || 0} leads documents and ${dealResult.deletedCount || 0} deals documents.`)

    const leadCountAfter = await Lead.countDocuments({})
    const dealCountAfter = await Deal.countDocuments({})

    console.log(`After cleanup -> Leads remaining: ${leadCountAfter}, Deals remaining: ${dealCountAfter}`)

    await mongoose.disconnect()
    console.log('MongoDB disconnected successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to clean MongoDB collections:', err)
    process.exit(1)
  }
}

cleanCollections()
