const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanLeadsAndDealsCollections() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`[Script] Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')
    const Counter = getMongoModel('counters')
    const Sequence = getMongoModel('sequences')

    // 1. Purge leads collection
    const leadsBefore = await Lead.countDocuments({})
    const leadsResult = await Lead.deleteMany({})
    console.log(`[Script] Leads collection: count before = ${leadsBefore}, removed = ${leadsResult.deletedCount || 0}`)

    // 2. Purge deals collection
    const dealsBefore = await Deal.countDocuments({})
    const dealsResult = await Deal.deleteMany({})
    console.log(`[Script] Deals collection: count before = ${dealsBefore}, removed = ${dealsResult.deletedCount || 0}`)

    // 3. Reset counters for leads & deals
    if (Counter) {
      await Counter.updateOne({ name: 'leads' }, { $set: { seq: 0 } }, { upsert: true })
      await Counter.updateOne({ name: 'deals' }, { $set: { seq: 0 } }, { upsert: true })
      console.log('[Script] Sequence counters for leads and deals reset to 0.')
    }

    if (Sequence) {
      await Sequence.updateOne({ name: 'leads' }, { $set: { value: 0 } }, { upsert: true })
      await Sequence.updateOne({ name: 'deals' }, { $set: { value: 0 } }, { upsert: true })
      console.log('[Script] Legacy sequence values for leads and deals reset to 0.')
    }

    const leadsAfter = await Lead.countDocuments({})
    const dealsAfter = await Deal.countDocuments({})
    console.log(`[Script] Final Status -> Remaining Leads: ${leadsAfter}, Remaining Deals: ${dealsAfter}`)

    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected cleanly.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] Error executing cleanup:', err)
    process.exit(1)
  }
}

cleanLeadsAndDealsCollections()
