const mongoose = require('mongoose')
const leadService = require('./services/leadService')
const { getMongoModel } = require('./models/mongoModels')
const notificationService = require('./services/notificationService')

async function testBackendFlow() {
  await mongoose.connect('mongodb://127.0.0.1:27017/crm')
  
  // Mock the getSocketServer
  jest = require('jest-mock')
  const socketModule = require('./socket/socketServer')
  socketModule.getSocketServer = jest.fn().mockReturnValue({
    emitToAdmins: () => {},
    emitToUser: () => {},
    pushActivity: () => {},
    getOnlineUsers: () => [{ id: 7 }], // Pretend user 7 is online
  })

  // Spy on notificationService
  const notifySpy = jest.spyOn(notificationService, 'notifyUsers')
  
  // Fake Actor
  const actor = { id: 16, name: 'Keval V Shah', role: 'admin', companyId: 1 }

  // Fake Web Payload
  const payload = {
    accountName: 'Test Push Account',
    accountOwner: 'Atish Shah', 
    contactEmail: 'test@example.com',
    industry: 'IT',
    status: 'pending',
    assignedTo: 'Atish Shah',
  }

  console.log("Creating lead...")
  const result = await leadService.createLead(actor, payload)
  console.log("Lead created:", result.id)

  console.log("Checking if notifyUsers was called...")
  if (notifySpy.mock.calls.length > 0) {
    console.log("YES! notifyUsers was called with:", JSON.stringify(notifySpy.mock.calls[0][0], null, 2))
  } else {
    console.log("NO! notifyUsers was NOT called.")
  }

  process.exit(0)
}

testBackendFlow().catch(console.error)
