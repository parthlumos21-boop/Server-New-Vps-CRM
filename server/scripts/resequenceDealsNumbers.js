const path = require('path')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
const { getMongoModel } = require('../models/mongoModels')

async function resequenceDealsNumbers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`[Script] Connecting to MongoDB: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Deal = getMongoModel('deals')
    const Sequence = getMongoModel('sequences')

    // Fetch all deals sorted by creation time
    const deals = await Deal.find({}).sort({ createdAt: 1, _id: 1 })
    console.log(`[Script] Total deals found: ${deals.length}`)

    let updatedCount = 0
    for (let index = 0; index < deals.length; index++) {
      const deal = deals[index]
      const newDealNumber = `DL-${String(index + 1).padStart(3, '0')}`

      if (deal.dealNumber !== newDealNumber) {
        deal.dealNumber = newDealNumber
        await deal.save()
        updatedCount++
      }
    }

    console.log(`[Script] Successfully resequenced ${updatedCount} deal numbers (DL-001 to DL-${String(deals.length).padStart(3, '0')}).`)

    // Update sequences counter for next deal creation
    if (Sequence) {
      await Sequence.updateOne(
        { name: 'deals' },
        { $set: { value: deals.length } },
        { upsert: true }
      )
      console.log(`[Script] Reset deals sequence counter to ${deals.length}.`)
    }

    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected cleanly.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] Error resequencing deal numbers:', err)
    process.exit(1)
  }
}

resequenceDealsNumbers()
