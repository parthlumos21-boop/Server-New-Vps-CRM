const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
const { connectDatabase } = require('../config/db')
const { getMongoModel } = require('../models/mongoModels')

async function cleanHasmukhImportedAccounts() {
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`[Script] Starting cleanup process for hasmukh@swatiswitchgears.com (Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'})...`)

  try {
    await connectDatabase()
    const db = mongoose.connection.db
    console.log('[Script] MongoDB connected successfully.')

    // 1. Dynamically resolve user hasmukh@swatiswitchgears.com
    const user = await db.collection('users').findOne({ email: 'hasmukh@swatiswitchgears.com' })
    if (!user) {
      console.error('[Script] User hasmukh@swatiswitchgears.com not found in database! Aborting.')
      process.exit(1)
    }

    const userId = user.userId || user.id || user.legacyId
    const userNameRegex = new RegExp(user.name, 'i')
    const userEmailRegex = new RegExp(user.email, 'i')

    console.log(`[Script] Resolved User: ${user.name} (${user.email}) | ID: ${userId}`)

    // 2. Query definitions targeting ALL records belonging to hasmukh@swatiswitchgears.com
    const queries = {
      deals: {
        $or: [
          { dealOwner: userNameRegex },
          { ownerName: userNameRegex },
          { owner: userNameRegex },
          { assignedUserName: userNameRegex },
          { createdByUserName: userNameRegex },
          ...(userId ? [{ ownerUserId: userId }, { ownerUserId: String(userId) }, { assignedTo: userId }, { assignedTo: String(userId) }] : []),
          { 'data.dealOwner': userNameRegex },
          { 'data.ownerName': userNameRegex },
          { 'data.assignedUserName': userNameRegex },
          ...(userId ? [{ 'data.assignedTo': userId }, { 'data.assignedTo': String(userId) }, { 'data.ownerUserId': userId }, { 'data.ownerUserId': String(userId) }] : []),
          ...(user.ownerCode ? [{ ownerCode: user.ownerCode }, { accountOwnerCode: user.ownerCode }] : []),
        ],
      },
      accounts: {
        $or: [
          { accountOwner: userNameRegex },
          { ownerName: userNameRegex },
          { dealOwner: userNameRegex },
          { ownerUserId: userId },
          { assignedTo: userId },
          { email: userEmailRegex },
        ],
      },
      leads: {
        $or: [
          { accountOwner: userNameRegex },
          { ownerName: userNameRegex },
          { owner: userNameRegex },
          { 'formData.accountOwner': userNameRegex },
          { email: userEmailRegex },
        ],
      },
      customers: {
        $or: [
          { ownerName: userNameRegex },
          { owner: userNameRegex },
          { assignedToName: userNameRegex },
        ],
      },
      converted_deals: {
        $or: [
          { dealOwner: userNameRegex },
          { ownerName: userNameRegex },
          { owner: userNameRegex },
        ],
      },
      remarks: {
        $or: [
          { userName: userNameRegex },
          { createdByName: userNameRegex },
          { userId: userId },
        ],
      },
    }

    console.log('\n--- SCANNING RECORDS TO CLEAN ---')
    const toDelete = {}
    let totalTargetDocs = 0

    for (const [colName, query] of Object.entries(queries)) {
      const col = db.collection(colName)
      const matchingDocs = await col.find(query).toArray()
      const totalColDocs = await col.countDocuments()
      const otherUsersDocs = totalColDocs - matchingDocs.length

      toDelete[colName] = matchingDocs
      totalTargetDocs += matchingDocs.length

      console.log(`[Scan] "${colName}": ${matchingDocs.length} record(s) to remove | ${otherUsersDocs} other user record(s) (PROTECTED)`)
    }

    console.log(`\n[Scan] Total records to clean for Hasmukh: ${totalTargetDocs}`)

    if (isDryRun) {
      console.log(`\n[DRY-RUN COMPLETE] No database modifications were made.`)
      await mongoose.disconnect()
      process.exit(0)
    }

    // 3. Backup matching records before deletion
    const backupDir = path.join(__dirname, 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFilePath = path.join(backupDir, `hasmukh_all_data_backup_${timestamp}.json`)

    const backupData = {
      backupTimestamp: new Date().toISOString(),
      user: { name: user.name, email: user.email, userId: userId },
      records: toDelete,
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8')
    console.log(`\n[Backup] Successfully saved ${totalTargetDocs} records to:`)
    console.log(`[Backup] ${backupFilePath}`)

    // 4. Delete matching records collection by collection
    console.log('\n--- EXECUTING DELETIONS ---')
    for (const [colName, query] of Object.entries(queries)) {
      const col = db.collection(colName)
      const result = await col.deleteMany(query)
      console.log(`[Delete] Removed ${result.deletedCount} record(s) from "${colName}"`)
    }

    // 5. Post-cleanup verification
    console.log('\n--- POST-CLEANUP VERIFICATION ---')
    let allClean = true
    for (const [colName, query] of Object.entries(queries)) {
      const col = db.collection(colName)
      const remainingHasmukh = await col.countDocuments(query)
      const remainingTotal = await col.countDocuments()
      console.log(`[Verify] "${colName}": Hasmukh records = ${remainingHasmukh} (Expected: 0) | Total remaining = ${remainingTotal}`)
      if (remainingHasmukh !== 0) {
        allClean = false
      }
    }

    if (allClean) {
      console.log('\n[Script] SUCCESS: All data for hasmukh@swatiswitchgears.com has been cleanly removed.')
      console.log('[Script] Other users data remains 100% intact.')
    } else {
      console.warn('\n[Script] WARNING: Some records could not be fully removed. Review logs above.')
    }

    await mongoose.disconnect()
    console.log('[Script] MongoDB disconnected cleanly.')
    process.exit(0)
  } catch (err) {
    console.error('[Script] FATAL ERROR during cleanup:', err)
    process.exit(1)
  }
}

cleanHasmukhImportedAccounts()
