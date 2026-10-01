const request = require('supertest')
const express = require('express')

const ovrcRoutes = require('../routes/ovrcRoutes')

describe('OVRC routes', () => {
  test('POST /model returns 404 with consistent API error payload', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/ovrc', ovrcRoutes)

    // Minimal error handler integration for route-local test
    app.use((err, _req, res, __next) => {
      const status = err.statusCode || err.status || 500

      res.status(status).json({
        success: false,
        message: err.message,
        code: err.code || 'ERROR',
      })
    })

    const res = await request(app)
      .post('/api/ovrc/model')
      .send({ any: 'payload' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/not implemented/i)
  })
})

