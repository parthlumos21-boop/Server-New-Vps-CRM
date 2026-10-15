const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const { EJSON } = require('bson')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
const { connectDatabase } = require('../config/db')

async function backupDatabase() {
  const startTime = Date.now()
  console.log('====================================================')
  console.log('      STARTING FULL MONGODB DATABASE BACKUP         ')
  console.log('====================================================')

  try {
    await connectDatabase()
    const db = mongoose.connection.db
    const dbName = db.databaseName || 'crm'
    console.log(`[Backup] Connected to database: "${dbName}"`)

    // 1. Enumerate all collections dynamically
    const rawCollections = await db.listCollections().toArray()
    const collections = rawCollections
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'))
      .sort()

    console.log(`[Backup] Found ${collections.length} collection(s) to backup.`)

    // 2. Prepare backup folder
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupDir = path.join(__dirname, '../backups', `mongodb_full_backup_${timestamp}`)
    const collectionsDir = path.join(backupDir, 'collections')

    fs.mkdirSync(collectionsDir, { recursive: true })
    console.log(`[Backup] Destination folder: ${backupDir}`)

    const metadata = {
      backupTimestamp: now.toISOString(),
      databaseName: dbName,
      totalCollections: collections.length,
      totalDocuments: 0,
      collections: {},
    }

    // 3. Backup each collection with indexes and documents
    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i]
      const col = db.collection(colName)

      // Fetch index definitions
      try {
        const indexes = await col.indexes()
        const indexesFilePath = path.join(collectionsDir, `${colName}.indexes.json`)
        fs.writeFileSync(indexesFilePath, EJSON.stringify(indexes, { relaxed: false }, 2), 'utf-8')
      } catch (idxErr) {
        console.warn(`[Backup] Warning: Could not fetch indexes for "${colName}": ${idxErr.message}`)
      }

      // Stream documents as Canonical EJSON lines (NDJSON)
      const docCount = await col.countDocuments()
      const dataFilePath = path.join(collectionsDir, `${colName}.jsonl`)

      if (docCount === 0) {
        // Create an empty file so restore knows the collection exists
        fs.writeFileSync(dataFilePath, '', 'utf-8')
        metadata.collections[colName] = { documents: 0, sizeBytes: 0 }
        console.log(`[Backup] [${i + 1}/${collections.length}] "${colName}": 0 documents (empty)`)
        continue
      }

      const writeStream = fs.createWriteStream(dataFilePath, { encoding: 'utf-8' })
      const cursor = col.find({})
      let writtenCount = 0

      for await (const doc of cursor) {
        writeStream.write(EJSON.stringify(doc, { relaxed: false }) + '\n')
        writtenCount++
      }

      await new Promise((resolve, reject) => {
        writeStream.end(() => {
          resolve()
        })
        writeStream.on('error', reject)
      })

      const fileStats = fs.statSync(dataFilePath)
      metadata.collections[colName] = {
        documents: writtenCount,
        sizeBytes: fileStats.size,
      }
      metadata.totalDocuments += writtenCount

      const sizeFormatted = (fileStats.size / (1024 * 1024)).toFixed(2)
      console.log(`[Backup] [${i + 1}/${collections.length}] "${colName}": ${writtenCount} docs (${sizeFormatted} MB)`)
    }

    // 4. Save metadata.json
    const metadataPath = path.join(backupDir, 'metadata.json')
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n====================================================')
    console.log('            BACKUP COMPLETED SUCCESSFULLY           ')
    console.log('====================================================')
    console.log(`- Total Collections Backed Up: ${collections.length}`)
    console.log(`- Total Documents Backed Up:   ${metadata.totalDocuments}`)
    console.log(`- Destination:                 ${backupDir}`)
    console.log(`- Time Elapsed:                ${elapsed} seconds`)
    console.log('====================================================\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('\n[Backup] FATAL ERROR during backup:', err)
    process.exit(1)
  }
}

backupDatabase()
