const path = require('path')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config({ path: path.join(__dirname, '../.env') })
const { getMongoModel } = require('../models/mongoModels')

async function inspectDealsAndUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    await mongoose.connect(mongoUri)

    const User = getMongoModel('users')
    const Deal = getMongoModel('deals')

    const users = await User.find({
      $or: [
        { name: /nita/i },
        { username: /nita/i },
      ],
    })

    console.log('Nita Bhavsar User document(s):')
    console.log(JSON.stringify(users, null, 2))

    const sampleDeals = await Deal.find({}).limit(10)
    console.log('\nSample Deals (10):')
    sampleDeals.forEach((d) => {
      const obj = d.toObject()
      console.log({
        id: obj._id,
        dealNumber: obj.dealNumber,
        name: obj.name || obj.dealName,
        ownerName: obj.ownerName,
        dealOwner: obj.dealOwner,
        assignedUserName: obj.assignedUserName,
        createdByUserName: obj.createdByUserName,
        userId: obj.userId,
        ownerUserId: obj.ownerUserId,
        ownerCode: obj.ownerCode,
        accountOwnerCode: obj.accountOwnerCode,
      })
    })

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Inspect error:', err)
    process.exit(1)
  }
}

inspectDealsAndUsers()
