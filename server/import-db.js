require('dotenv').config({ path: __dirname + '/.env' })
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const { EJSON } = require('bson')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
const BACKUP_DIR = path.join(__dirname, 'db-backups')

async function importDatabase() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error(`Error: Backup directory not found at ${BACKUP_DIR}`)
      process.exit(1)
    }

    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`)
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB successfully.')

    const db = mongoose.connection.db
    const files = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.json'))

    if (files.length === 0) {
      console.log('No backup files found in the directory.')
      process.exit(0)
    }

    console.log(`Found ${files.length} backup files. Starting import...`)

    for (const file of files) {
      const collectionName = path.parse(file).name
      console.log(`\nImporting collection: ${collectionName}...`)

      const filePath = path.join(BACKUP_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf8')

      // Parse using EJSON to restore ObjectIds, Dates, etc.
      const documents = EJSON.parse(fileContent)

      if (documents.length === 0) {
        console.log(`  -> Skipping ${collectionName} (0 records)`)
        continue
      }

      // Drop the existing collection if it exists to avoid duplicate key errors
      const collections = await db.listCollections({ name: collectionName }).toArray()
      if (collections.length > 0) {
        console.log(`  -> Dropping existing collection ${collectionName}...`)
        await db.collection(collectionName).drop()
      }

      // Insert all documents
      const result = await db.collection(collectionName).insertMany(documents)
      console.log(`  -> Successfully imported ${result.insertedCount} records into ${collectionName}.`)
    }

    console.log('\n✅ Import completed successfully! Your database has been restored.')
    process.exit(0)
  } catch (error) {
    console.error('Error during database import:', error)
    process.exit(1)
  }
}

importDatabase()
