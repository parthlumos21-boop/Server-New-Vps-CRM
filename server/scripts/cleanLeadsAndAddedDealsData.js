const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanLeadsAndAddedDealsData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`[Script] Connecting to MongoDB: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')
    const Counter = getMongoModel('counters')

    // 1. Purge leads collection
    const leadsBefore = await Lead.countDocuments({})
    const leadsResult = await Lead.deleteMany({})
    console.log(`[Script] Leads collection: count before = ${leadsBefore}, removed = ${leadsResult.deletedCount || 0}`)

    // 2. Count deals before
    const dealsBefore = await Deal.countDocuments({})
    console.log(`[Script] Deals collection total before = ${dealsBefore}`)

    // 3. Remove added/test deal records if any exist with isTest or temporary flags
    const dealsDeleteResult = await Deal.deleteMany({
      $or: [
        { isTest: true },
        { isTemp: true },
        { dealNumber: { $regex: /^DL-TMP/i } }
      ]
    })
    console.log(`[Script] Deals test/temp records removed = ${dealsDeleteResult.deletedCount || 0}`)

    // 4. Resequence remaining valid deals cleanly in LIFO/chronological order
    const remainingDeals = await Deal.find({}).sort({ createdAt: 1 })
    console.log(`[Script] Resequencing ${remainingDeals.length} remaining deal records...`)

    for (let i = 0; i < remainingDeals.length; i++) {
      const seqNumber = `DL-${String(i + 1).padStart(3, '0')}`
      await Deal.updateOne(
        { _id: remainingDeals[i]._id },
        { $set: { dealNumber: seqNumber } }
      )
    }

    // 5. Reset deal sequence counter
    if (Counter) {
      await Counter.updateOne(
        { name: 'deals' },
        { $set: { seq: remainingDeals.length } },
        { upsert: true }
      )
      console.log(`[Script] Reset deal sequence counter to ${remainingDeals.length}`)
    }

    console.log(`[Script] Cleanup finished successfully. Total remaining deals: ${remainingDeals.length}`)
    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected cleanly.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] Error executing cleanup script:', err)
    process.exit(1)
  }
}

cleanLeadsAndAddedDealsData()
