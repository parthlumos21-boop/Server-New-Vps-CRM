require('dotenv').config({ path: __dirname + '/.env' })
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const { EJSON } = require('bson')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
const BACKUP_DIR = path.join(__dirname, 'db-backups')

async function exportDatabase() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`)
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB successfully.')

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const db = mongoose.connection.db
    const collections = await db.listCollections().toArray()

    console.log(`Found ${collections.length} collections. Starting export...`)

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      console.log(`Exporting collection: ${collectionName}...`)

      const documents = await db.collection(collectionName).find({}).toArray()

      // Serialize using EJSON to preserve ObjectIds, Dates, etc.
      const serializedData = EJSON.stringify(documents, null, 2)

      const filePath = path.join(BACKUP_DIR, `${collectionName}.json`)
      fs.writeFileSync(filePath, serializedData, 'utf8')

      console.log(`  -> Saved ${documents.length} records to ${collectionName}.json`)
    }

    console.log('\n✅ Export completed successfully! All files are in server/db-backups/')
    process.exit(0)
  } catch (error) {
    console.error('Error during database export:', error)
    process.exit(1)
  }
}

exportDatabase()
