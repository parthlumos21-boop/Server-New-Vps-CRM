const logger = require('../utils/logger')
const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const nodemailer = tryRequire('nodemailer')

let transporter = null

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)

const getTransporter = () => {
  if (transporter) return transporter
  if (!nodemailer) return null
  if (!isConfigured()) return null

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

const sendEmail = async ({ to, subject, html, text, from }) => {
  const tx = getTransporter()
  if (!tx) {
    logger.warn({ to, subject }, 'Email transport not configured — skipping send')
    return { skipped: true }
  }
  const info = await tx.sendMail({
    from: from || process.env.SMTP_FROM || 'no-reply@crm.local',
    to,
    subject,
    html,
    text: text || (html ? html.replace(/<[^>]+>/g, ' ') : ''),
  })
  logger.info({ messageId: info.messageId, to, subject }, 'Email sent')
  return info
}

module.exports = { sendEmail, isConfigured }
