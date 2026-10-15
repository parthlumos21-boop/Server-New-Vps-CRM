const path = require('path')
const fs = require('fs')
const readline = require('readline')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const { EJSON } = require('bson')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
const { connectDatabase } = require('../config/db')

async function restoreDatabase() {
  const startTime = Date.now()
  const isDryRun = process.argv.includes('--dry-run')
  const shouldClean = process.argv.includes('--clean') || !process.argv.includes('--no-clean')

  console.log('====================================================')
  console.log(`  STARTING MONGODB DATABASE RESTORE (Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}) `)
  console.log('====================================================')

  try {
    // 1. Locate backup directory
    const backupsBaseDir = path.join(__dirname, '../backups')
    let backupDir = null

    const folderArgIndex = process.argv.indexOf('--folder')
    if (folderArgIndex !== -1 && process.argv[folderArgIndex + 1]) {
      backupDir = path.resolve(process.argv[folderArgIndex + 1])
    } else {
      // Find latest backup directory
      if (!fs.existsSync(backupsBaseDir)) {
        console.error(`[Restore] Error: Backups directory "${backupsBaseDir}" does not exist!`)
        process.exit(1)
      }

      const entries = fs.readdirSync(backupsBaseDir, { withFileTypes: true })
      const backupFolders = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('mongodb_full_backup_'))
        .map((e) => e.name)
        .sort()
        .reverse()

      if (backupFolders.length === 0) {
        console.error(`[Restore] Error: No backup folders starting with "mongodb_full_backup_" found in "${backupsBaseDir}"!`)
        process.exit(1)
      }

      backupDir = path.join(backupsBaseDir, backupFolders[0])
    }

    console.log(`[Restore] Selected backup folder: ${backupDir}`)

    // 2. Read and validate metadata.json
    const metadataPath = path.join(backupDir, 'metadata.json')
    if (!fs.existsSync(metadataPath)) {
      console.error(`[Restore] Error: metadata.json not found in "${backupDir}"!`)
      process.exit(1)
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    console.log(`[Restore] Backup Timestamp: ${metadata.backupTimestamp}`)
    console.log(`[Restore] Source Database:  ${metadata.databaseName}`)
    console.log(`[Restore] Total Collections: ${metadata.totalCollections}`)
    console.log(`[Restore] Total Documents:   ${metadata.totalDocuments}`)

    const collectionsDir = path.join(backupDir, 'collections')
    if (!fs.existsSync(collectionsDir)) {
      console.error(`[Restore] Error: collections directory not found in "${backupDir}"!`)
      process.exit(1)
    }

    await connectDatabase()
    const db = mongoose.connection.db
    console.log(`[Restore] Connected to target database: "${db.databaseName}"`)

    const files = fs.readdirSync(collectionsDir)
    const dataFiles = files.filter((f) => f.endsWith('.jsonl')).sort()

    console.log(`[Restore] Found ${dataFiles.length} collection data file(s) to process.\n`)

    let totalRestoredDocs = 0

    // 3. Process each collection file
    for (let i = 0; i < dataFiles.length; i++) {
      const dataFile = dataFiles[i]
      const colName = dataFile.replace(/\.jsonl$/, '')
      const filePath = path.join(collectionsDir, dataFile)
      const col = db.collection(colName)

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      })

      let count = 0
      let batch = []

      // If live and clean mode enabled, clear target collection first
      if (!isDryRun && shouldClean) {
        await col.deleteMany({})
      }

      for await (const line of rl) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const doc = EJSON.parse(trimmed)
        count++

        if (!isDryRun) {
          batch.push(doc)
          if (batch.length >= 1000) {
            await col.insertMany(batch, { ordered: false })
            batch = []
          }
        }
      }

      if (!isDryRun && batch.length > 0) {
        await col.insertMany(batch, { ordered: false })
        batch = []
      }

      // Re-create indexes if index definitions exist
      const indexesFilePath = path.join(collectionsDir, `${colName}.indexes.json`)
      if (!isDryRun && fs.existsSync(indexesFilePath)) {
        try {
          const rawIndexes = JSON.parse(fs.readFileSync(indexesFilePath, 'utf-8'))
          const parsedIndexes = EJSON.parse(JSON.stringify(rawIndexes))

          // Filter out standard _id_ index as it is created by default
          const customIndexes = parsedIndexes
            .filter((idx) => idx.name !== '_id_')
            .map((idx) => {
              const spec = { key: idx.key }
              if (idx.name) spec.name = idx.name
              if (idx.unique) spec.unique = idx.unique
              if (idx.sparse) spec.sparse = idx.sparse
              if (idx.expireAfterSeconds !== undefined) spec.expireAfterSeconds = idx.expireAfterSeconds
              return spec
            })

          if (customIndexes.length > 0) {
            await col.createIndexes(customIndexes)
          }
        } catch (idxErr) {
          console.warn(`[Restore] Notice: Index creation note for "${colName}": ${idxErr.message}`)
        }
      }

      totalRestoredDocs += count
      console.log(`[Restore] [${i + 1}/${dataFiles.length}] "${colName}": ${count} document(s) verified/restored`)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n====================================================')
    console.log(isDryRun ? '         DRY-RUN RESTORE VERIFIED CLEANLY          ' : '           RESTORE COMPLETED SUCCESSFULLY          ')
    console.log('====================================================')
    console.log(`- Total Collections Processed: ${dataFiles.length}`)
    console.log(`- Total Documents Processed:   ${totalRestoredDocs}`)
    console.log(`- Time Elapsed:                ${elapsed} seconds`)
    console.log('====================================================\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('\n[Restore] FATAL ERROR during restore:', err)
    process.exit(1)
  }
}

restoreDatabase()
