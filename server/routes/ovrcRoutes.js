const express = require('express')
const { AppError } = require('../utils/appError')

const ovrcRouter = express.Router()

// Safe catch-all for unknown OCRC/OVRC integration calls.
// This prevents confusing 404s and gives a consistent API error payload.
ovrcRouter.post('/model', (_req, res, next) => {
  next(
    new AppError(
      'Endpoint /ovrc/model is not implemented on this server build.',
      404,
      {
        hint: 'Check your frontend API baseURL and ensure the correct backend version is deployed.',
      }
    )
  )
})

module.exports = ovrcRouter

