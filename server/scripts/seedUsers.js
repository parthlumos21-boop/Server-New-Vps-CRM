const mongoose = require('mongoose')
require('dotenv').config()
const { hashPassword } = require('../utils/password')
const { createLooseSchema } = require('../models/mongoModels')

const PDF_USERS = [
  { username: 'swatisales', email: 'swatisales@swatiswitchgears.com', departmentId: 'Marketing' },
  { username: 'swatisales2', email: 'swatisales2@swatiswitchgears.com', departmentId: 'Marketing' },
  { username: 'mktadmin', email: 'mktadmin@swatiswitchgears.com', departmentId: 'Marketing', role: 'admin' },
  
  { username: 'swatidesign', email: 'swatidesign@swatiswitchgears.com', departmentId: 'Electrical Design' },
  { username: 'swatidesign2', email: 'swatidesign2@swatiswitchgears.com', departmentId: 'Electrical Design' },
  { username: 'designadmin', email: 'designadmin@swatiswitchgears.com', departmentId: 'Electrical Design', role: 'admin' },
  
  { username: 'mechdesign1', email: 'mechdesign1@swatiswitchgears.com', departmentId: 'Mechanical Design' },
  { username: 'mechdesign2', email: 'mechdesign2@swatiswitchgears.com', departmentId: 'Mechanical Design' },
  { username: 'machinedesign', email: 'machinedesign@swatiswitchgears.com', departmentId: 'Mechanical Design' },
  
  { username: 'swatipurchase', email: 'swatipurchase@swatiswitchgears.com', departmentId: 'Procurement' },
  { username: 'swatipurchase2', email: 'swatipurchase2@swatiswitchgears.com', departmentId: 'Procurement' },
  { username: 'purchaseadmin', email: 'purchaseadmin@swatiswitchgears.com', departmentId: 'Procurement', role: 'admin' },
  
  { username: 'swatiproduction', email: 'swatiproduction@swatiswitchgears.com', departmentId: 'Production' },
  { username: 'swatiqc', email: 'swatiqc@swatiswitchgears.com', departmentId: 'Quality Control' },
  { username: 'prodadmin', email: 'prodadmin@swatiswitchgears.com', departmentId: 'Production', role: 'admin' }, // Assuming admin covers all three but mapping to Production for now
]

const DEFAULT_PASSWORD = 'Welcome@123'

async function seedUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job-planning-db'
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB.')

    const User = mongoose.connection.collection('users')

    let addedCount = 0
    let skippedCount = 0

    for (const u of PDF_USERS) {
      const existing = await User.findOne({ email: u.email })
      if (!existing) {
        const hashedPassword = await hashPassword(DEFAULT_PASSWORD)
        await User.insertOne({
          username: u.username,
          email: u.email,
          password: hashedPassword,
          role: u.role || 'user',
          departmentId: u.departmentId,
          status: 'active',
          companyId: 1, // default company
          createdAt: new Date(),
          updatedAt: new Date()
        })
        addedCount++
        console.log(`Added user: ${u.username}`)
      } else {
        skippedCount++
        console.log(`Skipped existing user: ${u.username}`)
      }
    }

    console.log(`\nSeeding complete. Added: ${addedCount}, Skipped: ${skippedCount}`)
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seedUsers()
