const path = require('path')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config({ path: path.join(__dirname, '../.env') })
const { getMongoModel } = require('../models/mongoModels')

async function inspectAllDealsOwners() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    await mongoose.connect(mongoUri)

    const Deal = getMongoModel('deals')
    const allDeals = await Deal.find({})

    console.log(`Total deals: ${allDeals.length}`)

    const ownerCounts = {}
    const ownerUserIds = {}
    const ownerCodes = {}

    allDeals.forEach((d) => {
      const obj = d.toObject()
      const owner = obj.ownerName || obj.dealOwner || obj.assignedUserName || 'UNKNOWN'
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1

      const uid = String(obj.ownerUserId || obj.userId || obj.assignedTo || 'NONE')
      ownerUserIds[uid] = (ownerUserIds[uid] || 0) + 1

      const code = String(obj.ownerCode || obj.accountOwnerCode || 'NONE')
      ownerCodes[code] = (ownerCodes[code] || 0) + 1
    })

    console.log('\nOwner Names Breakdown:', ownerCounts)
    console.log('\nOwner User IDs Breakdown:', ownerUserIds)
    console.log('\nOwner Codes Breakdown:', ownerCodes)

    // Check if any deals match legacyId 1 or userId 1 or ownerUserId 1
    const matchingNitaUserId = allDeals.filter((d) => {
      const obj = d.toObject()
      return String(obj.ownerUserId) === '1' || String(obj.userId) === '1' || String(obj.assignedTo) === '1' || String(obj.ownerUserId) === '6a70851e4de92afdc2419a31'
    })

    console.log(`\nDeals matching Nita user ID (1 or 6a70851e4de92afdc2419a31): ${matchingNitaUserId.length}`)
    matchingNitaUserId.forEach((d) => {
      console.log(' - DealNo:', d.dealNumber, 'Title:', d.name || d.dealName, 'ownerUserId:', d.ownerUserId, 'ownerName:', d.ownerName)
    })

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Inspect error:', err)
    process.exit(1)
  }
}

inspectAllDealsOwners()
