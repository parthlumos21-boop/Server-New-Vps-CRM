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
    
    const ownerCode = String(user.ownerCode || user.accountNo || '').trim()
    if (!ownerCode) {
      console.error(`Error: User "${targetUserName}" has no ownerCode or accountNo in the database!`)
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
      const updates = {
        accountNo: ownerCode,
        accountNumber: ownerCode,
        ownerCode: ownerCode,
      }
      
      if (lead.formData && typeof lead.formData === 'object') {
        updates.formData = {
          ...lead.formData,
          accountNo: ownerCode,
          accountNumber: ownerCode,
          account_no: ownerCode,
          ownerCode: ownerCode,
        }
      }
      
      await Lead.updateOne({ _id: lead._id }, { $set: updates })
      updateCount++
    }
    
    console.log(`\nUpdate completed successfully. Set Account No. to "${ownerCode}" for ${updateCount} records belonging to "${targetUserName}".`)
    await mongoose.disconnect()
  } catch (error) {
    console.error('Error running update script:', error)
    process.exit(1)
  }
}

run()
