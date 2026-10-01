const { AppError } = require('../utils/appError')
const { normalizeRole } = require('../security/accessScope')

const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    next(new AppError('Authentication is required.', 401))
    return
  }

  const allowedRoles = roles.map((role) => normalizeRole(role))
  if (!allowedRoles.includes(normalizeRole(req.user.role))) {
    next(new AppError('You do not have permission to access this resource.', 403))
    return
  }

  next()
}

const requireAdmin = requireRoles('admin', 'super_admin')

module.exports = {
  requireRoles,
  requireAdmin,
}
