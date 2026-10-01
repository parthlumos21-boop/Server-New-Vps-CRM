describe('health smoke', () => {
  test('logger module loads', () => {
    const logger = require('../utils/logger')
    expect(typeof logger.info).toBe('function')
  })

  test('AppError has statusCode', () => {
    const { AppError } = require('../utils/appError')
    const err = new AppError('boom', 418)
    expect(err.statusCode).toBe(418)
    expect(err.message).toBe('boom')
  })

  test('validation middleware passes when no schema provided', () => {
    const { validate } = require('../middleware/validate')
    const mw = validate({})
    const next = jest.fn()
    mw({ body: {}, query: {}, params: {} }, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  test('ownership metadata cannot be moved to another tenant by a standard user', () => {
    const { applyOwnershipMetadata } = require('../security/accessScope')
    const actor = { id: 7, role: 'user', companyId: 3 }
    const payload = applyOwnershipMetadata(actor, {
      companyId: 99,
      createdBy: 42,
      title: 'Scoped record',
    })

    expect(payload.companyId).toBe(3)
    expect(payload.createdBy).toBe(7)
  })

  test('public setup status does not expose database connection details', () => {
    const { getPublicSetupStatus } = require('../services/runtimeSetupService')
    const status = getPublicSetupStatus()

    expect(status.connectionTarget).toBeUndefined()
    expect(status.lastError).not.toMatch(/password|connection string|database uri|database name/i)
  })

  test('crudRepositoryFactory snake/camel helpers', () => {
    const { camelToSnake, snakeToCamel } = require('../repositories/crudRepositoryFactory')
    expect(camelToSnake('helloWorld')).toBe('hello_world')
    expect(snakeToCamel('hello_world')).toBe('helloWorld')
  })

  test('crudRepositoryFactory falls back safely for malformed jsonb strings', () => {
    const { serializeJsonbValue } = require('../repositories/crudRepositoryFactory')
    expect(serializeJsonbValue('line_items', '{"bad"}')).toBe('[]')
    expect(serializeJsonbValue('data', '{"bad"}')).toBe('{}')
  })

  test('quotation schema rejects non-object line items', () => {
    const { quotation } = require('../validation/schemas')
    expect(() => quotation.parse({ lineItems: ['broken line item'] })).toThrow()
  })

  test('quotation service normalizes stringified line item objects', () => {
    const quotationService = require('../services/quotationService')
    const normalized = quotationService.normalizeLineItems([
      '{"description":"Fixture","quantity":"2","unit":"Nos","rate":"1500"}',
      { description: 'Second', quantity: 1, rate: 200 },
      'not-json',
    ])

    expect(normalized).toEqual([
      {
        id: 'line-item-1',
        description: 'Fixture',
        quantity: '2',
        unit: 'Nos',
        rate: '1500',
        amount: 3000,
      },
      {
        id: 'line-item-2',
        description: 'Second',
        quantity: '1',
        unit: 'Nos',
        rate: '200',
        amount: 200,
      },
    ])
  })

  test('jobQueue enqueues and runs handler', async () => {
    const jobQueue = require('../services/jobQueue')
    let received = null
    jobQueue.registerHandler('test:echo', (payload) => { received = payload })
    jobQueue.enqueue('test:echo', { x: 1 })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(received).toEqual({ x: 1 })
  })
})
