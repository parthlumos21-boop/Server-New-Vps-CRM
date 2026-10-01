const { AppError } = require('../utils/appError')

const requirePermission = (...permissionKeys) => (req, _res, next) => {
  if (!req.user) {
    next(new AppError('Authentication is required.', 401))
    return
  }

  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    next()
    return
  }

  const permissions = req.user.permissions || {}
  const hasPermission = permissionKeys.some((key) => Boolean(permissions[key]))
  if (!hasPermission) {
    next(new AppError('You do not have permission to access this resource.', 403))
    return
  }

  next()
}

module.exports = {
  requirePermission,
}
