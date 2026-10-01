const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const pino = tryRequire('pino')

const noopChild = () => fallback
const fallback = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
  debug: (...args) => process.env.LOG_DEBUG && console.log('[debug]', ...args),
  child: noopChild,
}

const logger = pino
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
      base: { service: 'crm-server' },
      redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
    })
  : fallback

module.exports = logger
