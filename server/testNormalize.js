const { normalizeOwnerFields } = require('./services/crudServiceFactory')
const mongoose = require('mongoose')

async function testNormalize() {
  await mongoose.connect('mongodb://127.0.0.1:27017/crm')
  
  const payload = { assignedTo: "Atish Shah" }
  await normalizeOwnerFields(payload, { id: 16 })
  
  console.log("Resolved payload:", payload)
  process.exit(0)
}

testNormalize().catch(console.error)
