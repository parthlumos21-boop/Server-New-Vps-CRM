const fs = require('fs')
const path = require('path')

const serverDir = '/root/app/crm/server'
process.chdir(serverDir)

const { connectDatabase, mongoose } = require(path.join(serverDir, 'config', 'db'))
const { getMongoModel } = require(path.join(serverDir, 'models', 'mongoModels'))

const normalizeName = (name) => {
  return String(name || '')
    .trim()
    .replace(/^\d{4,}\s*-\s*/u, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

async function run() {
  try {
    console.log('Connecting to database...')
    await connectDatabase()
    
    const User = getMongoModel('users')
    const Lead = getMongoModel('leads')
    
    // Target user to patch
    const targetUserName = 'Keval V Shah'
    
    console.log(`Searching for user "${targetUserName}" in user collection...`)
    const user = await User.findOne({
      $or: [
        { name: new RegExp('^' + targetUserName + '$', 'i') },
        { username: new RegExp('^' + targetUserName + '$', 'i') }
      ]
    }).lean()
    
    if (!user) {
      console.error(`Error: User "${targetUserName}" not found in the database!`)
      await mongoose.disconnect()
      process.exit(1)
    }
    
    let ownerCode = String(user.ownerCode || user.accountNo || '').trim()
    
    // If ownerCode is missing and it's Keval V Shah, dynamically assign 1015
    if (!ownerCode && normalizeName(user.name) === normalizeName('Keval V Shah')) {
      ownerCode = '1015'
      console.log(`User "${targetUserName}" had no ownerCode. Dynamically setting it to ${ownerCode} in the user collection...`)
      await User.updateOne({ _id: user._id }, { $set: { ownerCode: ownerCode } })
    }
    
    if (!ownerCode) {
      console.error(`Error: User "${targetUserName}" has no ownerCode or accountNo, and no fallback is set!`)
      await mongoose.disconnect()
      process.exit(1)
    }
    
    console.log(`Found user: ${user.name || user.username} with ownerCode: ${ownerCode}`)
    
    console.log(`Fetching accounts/leads owned by "${targetUserName}"...`)
    const leads = await Lead.find({
      $or: [
        { ownerName: new RegExp('^' + targetUserName + '$', 'i') },
        { accountOwner: new RegExp('^' + targetUserName + '$', 'i') },
        { 'formData.ownerName': new RegExp('^' + targetUserName + '$', 'i') },
        { 'formData.accountOwner': new RegExp('^' + targetUserName + '$', 'i') }
      ]
    }).lean()
    
    console.log(`Found ${leads.length} accounts owned by this user.`)
    
    let updateCount = 0
    for (const lead of leads) {
      const rawAccNo = String(
        lead.accountNo || 
        lead.accountNumber || 
        lead.formData?.accountNo || 
        lead.formData?.accountNumber || 
        ''
      ).trim()
      
      let cleanAccNo = rawAccNo
      
      // Skip if already formatted with the correct ownerCode prefix
      if (cleanAccNo.startsWith(ownerCode + '-')) {
        continue
      }
      
      // Construct new account number
      const finalAccNo = cleanAccNo ? `${ownerCode}-${cleanAccNo}` : ownerCode
      
      const updates = {
        accountNo: finalAccNo,
        accountNumber: finalAccNo,
        ownerCode: ownerCode,
      }
      
      if (lead.formData && typeof lead.formData === 'object') {
        updates.formData = {
          ...lead.formData,
          accountNo: finalAccNo,
          accountNumber: finalAccNo,
          account_no: finalAccNo,
          ownerCode: ownerCode,
        }
      }
      
      await Lead.updateOne({ _id: lead._id }, { $set: updates })
      updateCount++
    }
    
    console.log(`\nUpdate completed successfully. Modified ${updateCount} records for "${targetUserName}".`)
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error running update script:', error)
    process.exit(1)
  }
}

run()
