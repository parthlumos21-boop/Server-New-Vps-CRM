const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')

async function cleanNitaBhavsarLeadsJobNoStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm'
    console.log(`Connecting to MongoDB at: ${mongoUri}`)
    await mongoose.connect(mongoUri)

    const Lead = getMongoModel('leads')

    // Match leads belonging to Nita Bhavsar
    const nitaQuery = {
      $or: [
        { ownerName: /nita/i },
        { accountOwner: /nita/i },
        { createdByUserName: /nita/i },
        { ownerCode: 1001 },
        { ownerCode: '1001' },
        { accountOwnerCode: 1001 },
        { accountOwnerCode: '1001' },
      ],
    }

    const nitaLeads = await Lead.find(nitaQuery)
    console.log(`Found ${nitaLeads.length} lead documents for Nita Bhavsar.`)

    let updatedCount = 0

    for (const lead of nitaLeads) {
      let modified = false

      // 1. Clean jobNo if placeholder 'Email'
      const rawJobNo = String(lead.jobNo || lead.formData?.['Job No'] || lead.formData?.jobNo || '').trim()
      if (rawJobNo.toLowerCase() === 'email') {
        lead.jobNo = ''
        if (lead.formData) {
          if (lead.formData['Job No'] !== undefined) lead.formData['Job No'] = ''
          if (lead.formData.jobNo !== undefined) lead.formData.jobNo = ''
        }
        modified = true
      }

      // 2. Clean default accountStatus/status if generic placeholder 'pending'
      const rawStatus = String(lead.status || lead.accountStatus || '').trim()
      if (rawStatus.toLowerCase() === 'pending' && lead.isExcelImport) {
        lead.accountStatus = ''
        if (lead.formData) {
          if (lead.formData.accountStatus !== undefined) lead.formData.accountStatus = ''
          if (lead.formData.status !== undefined) lead.formData.status = ''
        }
        modified = true
      }

      if (modified) {
        lead.markModified('formData')
        await lead.save()
        updatedCount++
      }
    }

    console.log(`Successfully cleaned Job No & Account Status for ${updatedCount} Nita Bhavsar lead documents.`)

    await mongoose.disconnect()
    console.log('MongoDB disconnected successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to clean Nita Bhavsar leads:', err)
    process.exit(1)
  }
}

cleanNitaBhavsarLeadsJobNoStatus()
