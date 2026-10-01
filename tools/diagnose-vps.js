const fs = require('fs')
const path = require('path')

// Set CWD to server directory
const serverDir = path.resolve(__dirname, '..', 'server')
process.chdir(serverDir)

const { connectDatabase, mongoose } = require('./config/db')
const { env } = require('./config/env')
const { signJwt } = require('./utils/jwt')
const { getMongoModel } = require('./models/mongoModels')

async function run() {
  console.log('Connecting to database...')
  await connectDatabase()
  
  console.log('Finding an admin user...')
  const User = getMongoModel('users')
  const admin = await User.findOne({ role: 'admin' }).lean()
  if (!admin) {
    console.error('No admin user found in database!')
    process.exit(1)
  }
  console.log(`Found admin user: ${admin.username} (ID: ${admin.id || admin._id})`)
  
  console.log('Generating JWT token...')
  const token = signJwt({
    userId: admin.id || admin._id,
    username: admin.username,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    actualRole: admin.role,
    companyId: admin.companyId || 1,
    tokenVersion: admin.authTokenVersion || 0
  }, env.jwtSecret)
  
  console.log('Token generated successfully.')
  
  // Helper to make request
  const makeRequest = (method, apiPath, bodyData) => new Promise((resolve) => {
    const postData = bodyData ? JSON.stringify(bodyData) : '';
    const options = {
      hostname: '127.0.0.1',
      port: env.port || 5000,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    console.log(`\n--- Requesting ${method} ${apiPath} ---`)
    const req = require('http').request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`)
      console.log('Headers:', JSON.stringify(res.headers, null, 2))
      
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('Response Body:', data)
        resolve()
      })
    })
    
    req.on('error', (err) => {
      console.error('Request failed:', err.message)
      resolve()
    })
    
    if (postData) {
      req.write(postData)
    }
    req.end()
  })
  
  // Test GET /api/leads
  await makeRequest('GET', '/api/leads')
  
  // Test POST /api/audit/client
  await makeRequest('POST', '/api/audit/client', {
    eventType: 'test.event',
    route: '/test-route',
    metadata: { test: true }
  })
  
  console.log('\nDiagnostic complete! Closing database connection.')
  await mongoose.disconnect()
}

run().catch(console.error)
