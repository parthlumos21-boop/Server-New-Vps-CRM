const { AppError } = require('../utils/appError')
const { ensureDatabaseSetup, getPublicSetupStatus, isBackendReady } = require('../services/runtimeSetupService')

const requireBackendReady = async (_req, _res, next) => {
  try {
    if (!isBackendReady()) {
      await ensureDatabaseSetup()
    }

    if (!isBackendReady()) {
      next(new AppError(
        'MongoDB is not ready. Start MongoDB or set MONGODB_URI, then review /api/setup-status.',
        503,
        getPublicSetupStatus()
      ))
      return
    }

    next()
  } catch (error) {
    next(new AppError(
      'Backend setup verification failed. Review /api/setup-status.',
      503,
      {
        ...getPublicSetupStatus(),
        cause: error.message,
      }
    ))
  }
}

module.exports = {
  requireBackendReady,
}
