const path = require('path')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config({ path: path.join(__dirname, '../.env') })

async function searchNitaInAllCollections() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    await mongoose.connect(mongoUri)
    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()

    console.log(`Found ${collections.length} collections in database. Searching for Nita Bhavsar records...`)

    for (const colInfo of collections) {
      const colName = colInfo.name
      const col = db.collection(colName)

      const nitaDocs = await col.find({
        $or: [
          { ownerName: /nita/i },
          { dealOwner: /nita/i },
          { accountOwner: /nita/i },
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
        ],
      }).toArray()

      if (nitaDocs.length > 0) {
        console.log(`\nCollection [${colName}]: ${nitaDocs.length} matching document(s)`)
        nitaDocs.slice(0, 5).forEach((doc) => {
          console.log({
            id: doc._id || doc.id,
            name: doc.name || doc.dealName || doc.customerName || doc.companyName || doc.title,
            ownerName: doc.ownerName || doc.dealOwner || doc.accountOwner,
            ownerCode: doc.ownerCode || doc.accountOwnerCode,
            ownerUserId: doc.ownerUserId || doc.userId || doc.assignedTo,
          })
        })
      }
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error searching collections:', err)
    process.exit(1)
  }
}

searchNitaInAllCollections()
