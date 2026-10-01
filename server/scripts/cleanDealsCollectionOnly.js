const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanDealsCollectionOnly() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`[Script] Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Deal = getMongoModel('deals')
    const Counter = getMongoModel('counters')
    const Sequence = getMongoModel('sequences')

    const countBefore = await Deal.countDocuments({})
    console.log(`[Script] Before cleanup -> Deals documents: ${countBefore}`)

    const result = await Deal.deleteMany({})
    console.log(`[Script] Cleanup complete -> Removed ${result.deletedCount || 0} documents from deals collection.`)

    const countAfter = await Deal.countDocuments({})
    console.log(`[Script] After cleanup -> Deals remaining: ${countAfter}`)

    // Reset sequence counter for deals
    if (Counter) {
      await Counter.updateOne({ name: 'deals' }, { $set: { seq: 0 } }, { upsert: true })
      console.log('[Script] Counter sequence for deals reset to 0.')
    }
    if (Sequence) {
      await Sequence.updateOne({ name: 'deals' }, { $set: { value: 0 } }, { upsert: true })
      console.log('[Script] Legacy sequence value for deals reset to 0.')
    }

    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected successfully.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] Failed to clean deals collection:', err)
    process.exit(1)
  }
}

cleanDealsCollectionOnly()
