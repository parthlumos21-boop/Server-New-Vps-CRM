const { AppError } = require('../utils/appError')
const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const zod = tryRequire('zod')

const validate = (schemas = {}) => (req, _res, next) => {
  if (!zod) return next()

  try {
    if (schemas.body) {
      const parsed = schemas.body.parse(req.body || {})
      req.body = parsed
    }
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query || {})
      req.query = parsed
    }
    if (schemas.params) {
      const parsed = schemas.params.parse(req.params || {})
      req.params = parsed
    }
    next()
  } catch (error) {
    if (error?.issues) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
      return next(new AppError('Validation failed.', 400, details))
    }
    next(error)
  }
}

module.exports = { validate }
