const path = require('path')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
const { getMongoModel } = require('../models/mongoModels')

async function cleanNitaBhavsarMyDealsData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`[Script] Connecting to MongoDB: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Deal = getMongoModel('deals')

    // Filter criteria for Nita Bhavsar deals to remove from My Deals
    const nitaDealsQuery = {
      $or: [
        { ownerName: /nita/i },
        { dealOwner: /nita/i },
        { assignedUserName: /nita/i },
        { createdByUserName: /nita/i },
        { ownerCode: 1001 },
        { ownerCode: '1001' },
        { accountOwnerCode: 1001 },
        { accountOwnerCode: '1001' },
        { ownerUserId: 1 },
        { ownerUserId: '1' },
        { ownerUserId: '6a70851e4de92afdc2419a31' },
        { userId: 1 },
        { userId: '1' },
        { userId: '6a70851e4de92afdc2419a31' },
        { assignedTo: 1 },
        { assignedTo: '1' },
        { assignedTo: '6a70851e4de92afdc2419a31' },
      ],
    }

    const ConvertedDeal = getMongoModel('converted_deals')

    const countBefore = await Deal.countDocuments({})
    const nitaCount = await Deal.countDocuments(nitaDealsQuery)
    console.log(`[Script] Total deals before cleanup: ${countBefore}`)
    console.log(`[Script] Found ${nitaCount} deal document(s) matching Nita Bhavsar in deals collection.`)

    if (nitaCount > 0) {
      const deleteResult = await Deal.deleteMany(nitaDealsQuery)
      console.log(`[Script] Successfully removed ${deleteResult.deletedCount} deal document(s) for Nita Bhavsar from deals collection.`)
    } else {
      console.log('[Script] No matching deal documents found for removal in deals collection.')
    }

    if (ConvertedDeal) {
      const nitaConvertedCount = await ConvertedDeal.countDocuments(nitaDealsQuery)
      console.log(`[Script] Found ${nitaConvertedCount} converted_deals document(s) matching Nita Bhavsar.`)
      if (nitaConvertedCount > 0) {
        const convertedDeleteResult = await ConvertedDeal.deleteMany(nitaDealsQuery)
        console.log(`[Script] Successfully removed ${convertedDeleteResult.deletedCount} converted_deals document(s) for Nita Bhavsar.`)
      }
    }

    const countAfter = await Deal.countDocuments({})
    console.log(`[Script] Total deals remaining after cleanup: ${countAfter}`)

    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected cleanly.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] Error cleaning Nita Bhavsar deals data:', err)
    process.exit(1)
  }
}

cleanNitaBhavsarMyDealsData()
