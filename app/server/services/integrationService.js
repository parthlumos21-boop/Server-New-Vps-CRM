const crypto = require('crypto')
const nodemailer = require('nodemailer')
const { env } = require('../config/env')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const settingsRepository = require('../repositories/settingsRepository')
const { AppError } = require('../utils/appError')
const { isPrivilegedRole } = require('../security/accessScope')

const CommunicationLog = getMongoModel('communication_logs')
const AppSetting = getMongoModel('app_settings')
const MicrosoftToken = getMongoModel('microsoft_tokens')
const UserSession = getMongoModel('user_sessions')
const EmailLog = getMongoModel('email_logs')
const OutlookIntegration = getMongoModel('outlook_integrations')

const GLOBAL_WHATSAPP_KEY = 'integrations.whatsapp'
const GLOBAL_OUTLOOK_KEY = 'integrations.outlook.shared'
const DOWNLOAD_KEY = 'integrations.downloads'
const outlookSettingKey = (userId) => `integrations.outlook.${userId}`
const m365SettingKey = (userId) => `integrations.microsoft365.${userId}`
const outlookQrSettingKey = (userId) => `integrations.outlook.qr.${userId}`
const outlookDeviceCodeSettingKey = (userId) => `integrations.outlook.device.${userId}`
const OUTLOOK_SCOPES = 'offline_access User.Read Mail.ReadWrite Mail.Send'
const PLACEHOLDER_PREFIXES = ['replace-with', 'your-', 'changeme', 'change-me']

const cleanConfiguredSecret = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = text.toLowerCase()
  if (PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return ''
  return text
}

const getM365SmtpHost = (email) => {
  const e = String(email || '').toLowerCase()
  if (e.endsWith('@outlook.com') || e.endsWith('@hotmail.com') || e.endsWith('@live.com') || e.endsWith('@msn.com')) {
    return 'smtp-mail.outlook.com'
  }
  return 'smtp.office365.com'
}

const isPersonalMicrosoftEmail = (email) => {
  const value = String(email || '').trim().toLowerCase()
  return ['@outlook.com', '@hotmail.com', '@live.com', '@msn.com'].some((suffix) => value.endsWith(suffix))
}

const maskSecret = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= 8) return 'configured'
  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '').trim()

const safeUrl = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch (_error) {
    return ''
  }
}

const createPkceVerifier = () => crypto.randomBytes(32).toString('base64url')

const createPkceChallenge = (verifier) => crypto
  .createHash('sha256')
  .update(verifier)
  .digest('base64url')

const getTokenEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY || env.jwtSecret)
  .digest()

const encryptSecret = (value) => {
  const text = String(value || '')
  if (!text) return ''

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'enc',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

const decryptSecret = (value) => {
  const text = String(value || '')
  if (!text) return ''
  if (!text.startsWith('enc:')) return text

  const [, ivValue, tagValue, encryptedValue] = text.split(':')
  if (!ivValue || !tagValue || !encryptedValue) return ''

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getTokenEncryptionKey(),
    Buffer.from(ivValue, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

const getSettingValue = async (scope, scopeId, key, fallback = {}) => {
  const setting = await settingsRepository.getOne(scope, scopeId, key)
  return setting?.value && typeof setting.value === 'object' ? setting.value : fallback
}

const hasOutlookToken = (setting = {}) => {
  const value = setting || {}
  return Boolean(
    value.accessTokenEncrypted
    || value.refreshTokenEncrypted
    || value.accessToken
    || value.refreshToken
  )
}

const saveCommunicationLog = async ({
  actor,
  channel,
  status,
  targetType,
  targetId,
  recipient,
  subject,
  summary,
  provider,
  metadata,
}) => {
  const now = new Date()
  const record = await CommunicationLog.create({
    legacyId: await getNextLegacyId('communication_logs'),
    companyId: actor.companyId || 1,
    ownerUserId: actor.id,
    createdBy: actor.id,
    createdByName: actor.name || actor.username || actor.email || '',
    channel,
    status,
    targetType: targetType || 'account',
    targetId: String(targetId || ''),
    recipient: String(recipient || ''),
    subject: String(subject || ''),
    summary: String(summary || ''),
    provider: String(provider || ''),
    metadata: metadata || {},
    createdAt: now,
    updatedAt: now,
  })

  return {
    id: record.legacyId ?? record.id,
    channel: record.channel,
    status: record.status,
    targetType: record.targetType,
    targetId: record.targetId,
    recipient: record.recipient,
    subject: record.subject,
    summary: record.summary,
    provider: record.provider,
    createdByName: record.createdByName,
    createdAt: record.createdAt,
  }
}

const buildDownloadMetadata = async () => {
  const saved = await getSettingValue('global', null, DOWNLOAD_KEY, {})
  const downloads = {
    windows: safeUrl(saved.windowsUrl) || safeUrl(process.env.APP_DOWNLOAD_WINDOWS_URL),
    android: safeUrl(saved.androidUrl) || safeUrl(process.env.APP_DOWNLOAD_ANDROID_URL),
    ios: safeUrl(saved.iosUrl) || safeUrl(process.env.APP_DOWNLOAD_IOS_URL),
    pwa: safeUrl(saved.pwaUrl) || safeUrl(process.env.APP_DOWNLOAD_PWA_URL || env.clientUrl),
  }

  const options = [
    { key: 'windows', label: 'Windows App', url: downloads.windows },
    { key: 'android', label: 'Android App', url: downloads.android },
    { key: 'ios', label: 'iOS App', url: downloads.ios },
    { key: 'pwa', label: 'Web App', url: downloads.pwa },
  ].map((option) => ({
    ...option,
    available: Boolean(option.url),
  }))

  return {
    options,
    hasDownloads: options.some((option) => option.available),
    message: options.some((option) => option.available)
      ? 'Choose a CRM app version to open or download.'
      : 'App downloads are not configured yet. Contact admin.',
  }
}

class IntegrationService {
  getOutlookScopes() {
    return OUTLOOK_SCOPES
  }

  async saveUserSessionMirror({ user = {}, session = {}, jwtHash = '', requestMeta = {} }) {
    if (!user.id || !session.id) return null
    return UserSession.findOneAndUpdate(
      { userId: String(user.id), sessionId: String(session.id) },
      {
        $set: {
          userId: String(user.id),
          sessionId: String(session.id),
          jwtHash,
          loginTime: session.loginTime || new Date(),
          lastActivity: session.lastActivity || new Date(),
          browser: session.browser || requestMeta.browser || '',
          device: session.deviceName || requestMeta.deviceName || '',
          ipAddress: session.ipAddress || requestMeta.ipAddress || '',
          portalRole: session.portalRole || user.role || '',
          expiresAt: session.expiresAt || null,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    ).lean()
  }

  async getStatus(actor) {
    const whatsapp = await this.getWhatsappStatus(actor)
    const outlook = await this.getOutlookStatus(actor)
    const microsoft365 = await this.getMicrosoft365Status(actor)
    const downloads = await buildDownloadMetadata()
    return { whatsapp, outlook, microsoft365, downloads }
  }

  async getDownloadMetadata() {
    return buildDownloadMetadata()
  }

  async getWhatsappStatus(actor) {
    const saved = await getSettingValue('global', null, GLOBAL_WHATSAPP_KEY, {})
    const enabled = saved.enabled !== undefined
      ? Boolean(saved.enabled)
      : true
    return {
      enabled,
      provider: saved.provider || process.env.WHATSAPP_PROVIDER || 'whatsapp_web_qr',
      mode: 'whatsapp_web_qr',
      webUrl: 'https://web.whatsapp.com/',
      businessPhoneNumber: saved.businessPhoneNumber || '',
      businessPhoneId: maskSecret(saved.businessPhoneId || process.env.WHATSAPP_BUSINESS_PHONE_ID),
      accessTokenConfigured: Boolean(saved.accessToken || process.env.WHATSAPP_ACCESS_TOKEN),
      templates: Array.isArray(saved.templates) ? saved.templates : [],
    }
  }

  async saveWhatsappSettings(actor, payload) {
    if (!isPrivilegedRole(actor.role)) throw new AppError('Only admins can change WhatsApp settings.', 403)
    const existing = await getSettingValue('global', null, GLOBAL_WHATSAPP_KEY, {})
    const value = {
      enabled: Boolean(payload.enabled),
      provider: String(payload.provider || existing.provider || 'whatsapp_link').trim(),
      businessPhoneNumber: normalizePhone(payload.businessPhoneNumber || existing.businessPhoneNumber),
      businessPhoneId: String(payload.businessPhoneId || existing.businessPhoneId || '').trim(),
      accessToken: String(payload.accessToken || existing.accessToken || '').trim(),
      verifyToken: String(payload.verifyToken || existing.verifyToken || '').trim(),
      templates: Array.isArray(payload.templates)
        ? payload.templates.map((entry) => String(entry || '').trim()).filter(Boolean)
        : (Array.isArray(existing.templates) ? existing.templates : []),
    }
    await settingsRepository.upsert('global', null, GLOBAL_WHATSAPP_KEY, value)
    return this.getWhatsappStatus(actor)
  }

  buildWhatsappUrl(phone, message = '') {
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone || normalizedPhone.length < 8) {
      throw new AppError('A valid phone number is required.', 400)
    }
    const cleanPhone = normalizedPhone.replace(/^\+/, '')
    const encodedMessage = encodeURIComponent(String(message || ''))
    return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
  }

  async sendWhatsapp(actor, payload) {
    const settings = await getSettingValue('global', null, GLOBAL_WHATSAPP_KEY, {})
    const phone = normalizePhone(payload.phone)
    const message = String(payload.message || '').trim()
    const webUrl = this.buildWhatsappUrl(phone, message)
    let status = 'pending'
    let provider = settings.provider || process.env.WHATSAPP_PROVIDER || 'whatsapp_link'
    let providerResponse = null

    const token = settings.accessToken || process.env.WHATSAPP_ACCESS_TOKEN
    const phoneId = settings.businessPhoneId || process.env.WHATSAPP_BUSINESS_PHONE_ID
    if (settings.enabled && token && phoneId && typeof fetch === 'function') {
      provider = 'whatsapp_business_api'
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/^\+/, ''),
          type: 'text',
          text: { body: message || 'Hello' },
        }),
      })
      providerResponse = await response.json().catch(() => null)
      status = response.ok ? 'sent' : 'failed'
    }

    const log = await saveCommunicationLog({
      actor,
      channel: 'whatsapp',
      status,
      targetType: payload.targetType,
      targetId: payload.targetId,
      recipient: phone,
      summary: message || 'Opened WhatsApp conversation',
      provider,
      metadata: { webUrl, providerResponse },
    })

    return { webUrl, status, log }
  }

  async getMicrosoft365Connection(actorOrUserId) {
    const userId = typeof actorOrUserId === 'object' ? actorOrUserId.id : actorOrUserId
    const setting = await getSettingValue('user', String(userId), m365SettingKey(userId), {})
    return {
      ...setting,
      appPassword: decryptSecret(setting.appPasswordEncrypted),
    }
  }

  async getMicrosoft365Status(actor) {
    const setting = await this.getMicrosoft365Connection(actor)
    return {
      configured: true,
      connected: Boolean(setting.appPassword),
      provider: 'microsoft365_smtp',
      mode: 'microsoft365_smtp',
      email: setting.email || '',
      connectedAt: setting.connectedAt || '',
    }
  }

  async connectMicrosoft365(actor, { email, appPassword }) {
    if (!email || !appPassword) throw new AppError('Email and App Password are required.', 400)
    
    const transporter = nodemailer.createTransport({
      host: getM365SmtpHost(email),
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { ciphers: 'SSLv3' },
      auth: { user: email, pass: appPassword },
    })

    try {
      await transporter.verify()
    } catch (error) {
      if (error.message && error.message.includes('5.7.3')) {
        throw new AppError('Legacy Microsoft 365 SMTP needs a 16-character app password. For normal Outlook connection, use Connect Outlook and complete Microsoft sign-in instead.', 400)
      }
      throw new AppError('Verification failed: ' + error.message, 400)
    }

    const value = {
      email,
      appPasswordEncrypted: encryptSecret(appPassword),
      connectedAt: new Date().toISOString(),
    }
    
    await settingsRepository.upsert('user', String(actor.id), m365SettingKey(actor.id), value)
    return { success: true }
  }

  async disconnectMicrosoft365(actor) {
    await settingsRepository.remove('user', String(actor.id), m365SettingKey(actor.id))
    return { success: true }
  }

  async testMicrosoft365Connection(actor) {
    const setting = await this.getMicrosoft365Connection(actor)
    if (!setting.appPassword) {
      throw new AppError('Connect Microsoft 365 before testing the connection.', 400)
    }

    const transporter = nodemailer.createTransport({
      host: getM365SmtpHost(setting.email),
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { ciphers: 'SSLv3' },
      auth: { user: setting.email, pass: setting.appPassword },
    })

    try {
      await transporter.verify()
      return { connected: true, email: setting.email, checkedAt: new Date().toISOString() }
    } catch (error) {
      if (error.message && error.message.includes('5.7.3')) {
        throw new AppError('Legacy Microsoft 365 SMTP needs an app password. For normal Outlook connection, use Connect Outlook and complete Microsoft sign-in instead.', 400)
      }
      throw new AppError('Connection failed: ' + error.message, 400)
    }
  }

  getOutlookConfig() {
    const tenantId = cleanConfiguredSecret(process.env.MICROSOFT_TENANT_ID) || 'common'
    const sharedEmail = cleanConfiguredSecret(
      process.env.MICROSOFT_SHARED_OUTLOOK_EMAIL
      || process.env.MICROSOFT_OUTLOOK_EMAIL
      || process.env.MICROSOFT_LOGIN_HINT
    )
    const authorityTenantId = cleanConfiguredSecret(process.env.MICROSOFT_AUTHORITY_TENANT_ID)
      || (isPersonalMicrosoftEmail(sharedEmail) ? 'common' : tenantId)

    return {
      clientId: cleanConfiguredSecret(process.env.MICROSOFT_CLIENT_ID),
      clientSecret: cleanConfiguredSecret(process.env.MICROSOFT_CLIENT_SECRET),
      tenantId,
      authorityTenantId,
      sharedEmail,
      redirectUri: cleanConfiguredSecret(process.env.MICROSOFT_REDIRECT_URI),
      loginRedirectUri: cleanConfiguredSecret(process.env.MICROSOFT_LOGIN_REDIRECT_URI),
    }
  }

  async getOutlookConnection(actorOrUserId) {
    const userId = typeof actorOrUserId === 'object' ? actorOrUserId.id : actorOrUserId
    const userSetting = await getSettingValue('user', String(userId), outlookSettingKey(userId), {})
    const sharedSetting = await this.getSharedOutlookConnection()
    const setting = hasOutlookToken(sharedSetting)
      ? { ...sharedSetting, shared: true }
      : userSetting
    return {
      ...setting,
      accessToken: decryptSecret(setting.accessTokenEncrypted || setting.accessToken),
      refreshToken: decryptSecret(setting.refreshTokenEncrypted || setting.refreshToken),
    }
  }

  async getSharedOutlookConnection() {
    const sharedSetting = await getSettingValue('global', null, GLOBAL_OUTLOOK_KEY, {})
    if (hasOutlookToken(sharedSetting)) return sharedSetting

    const existingUserSetting = await AppSetting.findOne({
      scope: 'user',
      key: /^integrations\.outlook\.[^.]+$/,
      $or: [
        { 'value.accessTokenEncrypted': { $exists: true, $ne: '' } },
        { 'value.refreshTokenEncrypted': { $exists: true, $ne: '' } },
        { 'value.accessToken': { $exists: true, $ne: '' } },
        { 'value.refreshToken': { $exists: true, $ne: '' } },
      ],
    }).sort({ updatedAt: -1 }).lean()

    const value = existingUserSetting?.value && typeof existingUserSetting.value === 'object'
      ? existingUserSetting.value
      : null
    if (!hasOutlookToken(value)) return {}

    const promotedValue = {
      ...value,
      shared: true,
      promotedFromUserId: existingUserSetting.scopeId || value.ownerUserId || '',
      updatedAt: new Date().toISOString(),
    }
    await settingsRepository.upsert('global', null, GLOBAL_OUTLOOK_KEY, promotedValue)
    return promotedValue
  }

  async getOutlookStatus(actor) {
    const setting = await this.getOutlookConnection(actor)
    const config = this.getOutlookConfig()
    const graphConfigured = Boolean(config.clientId && config.redirectUri)
    const connected = Boolean(setting.accessToken || setting.refreshToken)
    return {
      configured: graphConfigured,
      graphConfigured,
      authMode: config.clientSecret ? 'client_secret' : 'pkce',
      connected,
      active: connected || graphConfigured,
      tokenStatus: connected
        ? (setting.expiresAt && new Date(setting.expiresAt).getTime() <= Date.now() ? 'expired_refresh_available' : 'active')
        : 'missing',
      provider: 'microsoft_graph',
      mode: 'microsoft_graph',
      webUrl: 'https://outlook.office.com/mail/',
      email: setting.email || '',
      displayName: setting.displayName || '',
      connectedAt: setting.connectedAt || '',
      updatedAt: setting.updatedAt || '',
      expiresAt: setting.expiresAt || '',
      scopes: setting.scopes || [],
      shared: Boolean(setting.shared),
    }
  }

  buildOutlookAuthUrl(actor, returnUrl = '') {
    const config = this.getOutlookConfig()
    if (!config.clientId || !config.redirectUri) {
      throw new AppError('Microsoft Outlook is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_REDIRECT_URI in server/.env, then restart the backend.', 400)
    }
    const codeVerifier = config.clientSecret ? '' : createPkceVerifier()
    const state = Buffer.from(JSON.stringify({
      userId: actor.id,
      returnUrl: safeUrl(returnUrl),
      nonce: crypto.randomBytes(12).toString('hex'),
      codeVerifier,
    })).toString('base64url')
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      response_mode: 'query',
      scope: OUTLOOK_SCOPES,
      state,
    })
    if (config.sharedEmail) {
      params.set('login_hint', config.sharedEmail)
      if (isPersonalMicrosoftEmail(config.sharedEmail)) {
        params.set('domain_hint', 'consumers')
      }
    }
    if (codeVerifier) {
      params.set('code_challenge', createPkceChallenge(codeVerifier))
      params.set('code_challenge_method', 'S256')
    }
    return `https://login.microsoftonline.com/${config.authorityTenantId}/oauth2/v2.0/authorize?${params.toString()}`
  }

  async startOutlookDeviceCode(actor) {
    const config = this.getOutlookConfig()
    if (!config.clientId) {
      throw new AppError('Microsoft Outlook is not configured. Add MICROSOFT_CLIENT_ID in server/.env, then restart the backend.', 400)
    }

    const response = await fetch(`https://login.microsoftonline.com/${config.authorityTenantId}/oauth2/v2.0/devicecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        scope: OUTLOOK_SCOPES,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new AppError(payload.error_description || 'Microsoft device-code request failed.', 400)
    }

    const expiresAt = new Date(Date.now() + Number(payload.expires_in || 900) * 1000).toISOString()
    const value = {
      deviceCodeEncrypted: encryptSecret(payload.device_code),
      userCode: payload.user_code || '',
      verificationUri: payload.verification_uri || payload.verification_url || 'https://www.microsoft.com/link',
      verificationUriComplete: payload.verification_uri_complete || '',
      message: payload.message || '',
      interval: Math.max(5, Number(payload.interval || 5)),
      expiresAt,
      sharedEmail: config.sharedEmail || '',
      createdAt: new Date().toISOString(),
    }

    await settingsRepository.upsert('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id), value)
    return {
      userCode: value.userCode,
      verificationUri: value.verificationUri,
      verificationUriComplete: value.verificationUriComplete,
      message: value.message,
      interval: value.interval,
      expiresAt: value.expiresAt,
      sharedEmail: value.sharedEmail,
    }
  }

  async completeOutlookDeviceCode(actor) {
    const config = this.getOutlookConfig()
    const pending = await getSettingValue('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id), {})
    const deviceCode = decryptSecret(pending.deviceCodeEncrypted)
    if (!deviceCode) {
      throw new AppError('Start Outlook code sign-in first.', 400)
    }
    if (pending.expiresAt && new Date(pending.expiresAt).getTime() <= Date.now()) {
      await settingsRepository.remove('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id))
      throw new AppError('Microsoft sign-in code expired. Start Outlook code sign-in again.', 400)
    }

    const response = await fetch(`https://login.microsoftonline.com/${config.authorityTenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: config.clientId,
        device_code: deviceCode,
      }),
    })
    const tokenPayload = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (tokenPayload.error === 'authorization_pending') {
        return {
          connected: false,
          pending: true,
          message: 'Waiting for Microsoft approval.',
          interval: Math.max(5, Number(pending.interval || 5)),
          expiresAt: pending.expiresAt || '',
        }
      }
      if (tokenPayload.error === 'slow_down') {
        const nextInterval = Math.max(8, Number(pending.interval || 5) + 5)
        await settingsRepository.upsert('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id), {
          ...pending,
          interval: nextInterval,
        })
        return {
          connected: false,
          pending: true,
          message: 'Microsoft asked CRM to slow down. Still waiting for approval.',
          interval: nextInterval,
          expiresAt: pending.expiresAt || '',
        }
      }
      await settingsRepository.remove('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id))
      throw new AppError(tokenPayload.error_description || 'Microsoft device-code sign-in failed.', 400)
    }

    const profile = await this.fetchOutlookProfile(tokenPayload.access_token)
    const existingShared = await getSettingValue('global', null, GLOBAL_OUTLOOK_KEY, {})
    await this.saveOutlookTokenSet(actor.id, tokenPayload, profile)
    await this.saveOutlookTokenSet(actor.id, tokenPayload, profile, existingShared, { shared: true })
    await settingsRepository.remove('user', String(actor.id), outlookDeviceCodeSettingKey(actor.id))

    return {
      connected: true,
      shared: true,
      email: profile.email,
      displayName: profile.displayName,
      connectedAt: new Date().toISOString(),
    }
  }

  async getOutlookQr(actor, returnUrl = '') {
    const authUrl = this.buildOutlookAuthUrl(actor, returnUrl)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(authUrl)}`
    const value = {
      authUrl,
      qrImageUrl,
      provider: 'microsoft_graph',
      mode: 'microsoft_oauth_qr',
      createdAt: new Date().toISOString(),
      returnUrl: safeUrl(returnUrl),
    }

    await settingsRepository.upsert('user', String(actor.id), outlookQrSettingKey(actor.id), value)
    return value
  }

  async requestOutlookToken(params) {
    const config = this.getOutlookConfig()
    const body = params instanceof URLSearchParams
      ? params
      : new URLSearchParams(params || {})
    if (!body.get('client_id')) {
      body.set('client_id', config.clientId)
    }
    if (!body.get('client_id')) {
      throw new AppError('Microsoft OAuth client ID is missing on the server.', 400)
    }
    const response = await fetch(`https://login.microsoftonline.com/${config.authorityTenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const tokenPayload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new AppError(tokenPayload.error_description || 'Microsoft OAuth token request failed.', 400)
    }
    return tokenPayload
  }

  async fetchOutlookProfile(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const profile = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new AppError(profile.error?.message || 'Unable to read Outlook profile from Microsoft Graph.', 400)
    }
    return {
      id: profile.id || '',
      email: profile.mail || profile.userPrincipalName || '',
      displayName: profile.displayName || '',
      tenantId: profile.tenantId || '',
    }
  }

  async saveOutlookTokenSet(userId, tokenPayload, profile = {}, existing = {}, options = {}) {
    const refreshToken = tokenPayload.refresh_token || existing.refreshToken || ''
    const value = {
      accessTokenEncrypted: encryptSecret(tokenPayload.access_token),
      refreshTokenEncrypted: encryptSecret(refreshToken),
      expiresAt: new Date(Date.now() + Number(tokenPayload.expires_in || 0) * 1000).toISOString(),
      scopes: String(tokenPayload.scope || existing.scopes || OUTLOOK_SCOPES).split(' ').filter(Boolean),
      email: profile.email || existing.email || '',
      displayName: profile.displayName || existing.displayName || '',
      connectedAt: existing.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerUserId: existing.ownerUserId || userId,
    }
    if (options.shared) {
      value.shared = true
      await settingsRepository.upsert('global', null, GLOBAL_OUTLOOK_KEY, value)
    } else {
      await settingsRepository.upsert('user', String(userId), outlookSettingKey(userId), value)
    }

    await MicrosoftToken.findOneAndUpdate(
      {
        userId: String(options.shared ? 'shared' : userId),
        provider: 'microsoft_graph',
      },
      {
        $set: {
          userId: String(options.shared ? 'shared' : userId),
          ownerUserId: userId,
          provider: 'microsoft_graph',
          email: value.email,
          displayName: value.displayName,
          accessTokenEncrypted: value.accessTokenEncrypted,
          refreshTokenEncrypted: value.refreshTokenEncrypted,
          expiresAt: value.expiresAt,
          scope: value.scopes,
          tokenType: tokenPayload.token_type || existing.tokenType || 'Bearer',
          shared: Boolean(options.shared),
          connectedAt: value.connectedAt,
          updatedAt: value.updatedAt,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean()

    await OutlookIntegration.findOneAndUpdate(
      { userId: String(options.shared ? 'shared' : userId) },
      {
        $set: {
          userId: String(options.shared ? 'shared' : userId),
          ownerUserId: userId,
          microsoftUserId: profile.id || existing.microsoftUserId || '',
          email: value.email,
          displayName: value.displayName,
          accessToken: value.accessTokenEncrypted,
          refreshToken: value.refreshTokenEncrypted,
          accessTokenEncrypted: value.accessTokenEncrypted,
          refreshTokenEncrypted: value.refreshTokenEncrypted,
          expiresAt: value.expiresAt,
          connected: true,
          shared: Boolean(options.shared),
          connectedAt: value.connectedAt,
          updatedAt: value.updatedAt,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean()

    return {
      ...value,
      accessToken: tokenPayload.access_token,
      refreshToken,
    }
  }

  async handleOutlookCallback(query) {
    const config = this.getOutlookConfig()
    if (!config.clientId || !config.redirectUri) {
      throw new AppError('Microsoft Outlook is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_REDIRECT_URI in server/.env, then restart the backend.', 400)
    }
    if (!query.code || !query.state) throw new AppError('Missing Microsoft OAuth callback data.', 400)

    const state = JSON.parse(Buffer.from(String(query.state), 'base64url').toString('utf8'))
    const params = new URLSearchParams({
      client_id: config.clientId,
      code: String(query.code),
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      scope: OUTLOOK_SCOPES,
    })
    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret)
    } else if (state.codeVerifier) {
      params.set('code_verifier', state.codeVerifier)
    } else {
      throw new AppError('Microsoft Outlook PKCE verifier is missing. Start the Outlook connection again.', 400)
    }

    const tokenPayload = await this.requestOutlookToken(params)
    const profile = await this.fetchOutlookProfile(tokenPayload.access_token)
    const existingShared = await getSettingValue('global', null, GLOBAL_OUTLOOK_KEY, {})
    await this.saveOutlookTokenSet(state.userId, tokenPayload, profile)
    await this.saveOutlookTokenSet(state.userId, tokenPayload, profile, existingShared, { shared: true })
    return { success: true, returnUrl: safeUrl(state.returnUrl), email: profile.email, shared: true }
  }

  async disconnectOutlook(actor) {
    await settingsRepository.remove('user', String(actor.id), outlookSettingKey(actor.id))
    await MicrosoftToken.deleteOne({ userId: String(actor.id), provider: 'microsoft_graph' })
    await OutlookIntegration.findOneAndUpdate(
      { userId: String(actor.id) },
      { $set: { connected: false, updatedAt: new Date() } }
    )
    if (isPrivilegedRole(actor.role)) {
      await settingsRepository.remove('global', null, GLOBAL_OUTLOOK_KEY)
      await MicrosoftToken.deleteOne({ userId: 'shared', provider: 'microsoft_graph' })
      await OutlookIntegration.findOneAndUpdate(
        { userId: 'shared' },
        { $set: { connected: false, updatedAt: new Date() } }
      )
    }
    return this.getOutlookStatus(actor)
  }

  async sendOutlookEmail(actor, payload) {
    const status = await this.getOutlookStatus(actor)
    const setting = await this.getValidOutlookConnection(actor)
    const to = String(payload.to || '').trim()
    if (!to || !to.includes('@')) throw new AppError('A valid recipient email is required.', 400)
    if (!status.connected || !setting.accessToken) throw new AppError('Connect Outlook before sending email.', 400)

    let deliveryStatus = 'pending'
    let providerResponse = null
    const ccRecipients = String(payload.cc || '').split(',').map((address) => address.trim()).filter(Boolean)
    const bccRecipients = String(payload.bcc || '').split(',').map((address) => address.trim()).filter(Boolean)
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${setting.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: String(payload.subject || 'CRM message'),
          body: {
            contentType: 'Text',
            content: String(payload.message || ''),
          },
          toRecipients: [{ emailAddress: { address: to } }],
          ccRecipients: ccRecipients.map((address) => ({ emailAddress: { address } })),
          bccRecipients: bccRecipients.map((address) => ({ emailAddress: { address } })),
        },
        saveToSentItems: true,
      }),
    })
    providerResponse = response.ok ? { ok: true } : await response.json().catch(() => ({ ok: false }))
    deliveryStatus = response.ok ? 'sent' : 'failed'

    const log = await saveCommunicationLog({
      actor,
      channel: 'outlook',
      status: deliveryStatus,
      targetType: payload.targetType,
      targetId: payload.targetId,
      recipient: to,
      subject: payload.subject || 'CRM message',
      summary: payload.message || '',
      provider: 'microsoft_graph',
      metadata: {
        providerResponse,
        connected: status.connected,
        shared: Boolean(setting.shared),
        senderEmail: setting.email || status.email || '',
      },
    })
    await EmailLog.create({
      userId: String(actor.id),
      from: setting.email || status.email || '',
      to,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: payload.subject || 'CRM message',
      body: payload.message || '',
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      messageId: providerResponse?.messageId || '',
      deliveryStatus,
      sentDate: new Date(),
      provider: 'microsoft_graph',
      shared: Boolean(setting.shared),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return { status: deliveryStatus, log, connected: status.connected }
  }

  async listOutlookMessages(actor, query = {}) {
    const setting = await this.getValidOutlookConnection(actor)
    if (!setting.accessToken) throw new AppError('Connect Outlook before loading mail.', 400)

    const folderMap = {
      inbox: 'inbox',
      sent: 'sentitems',
      drafts: 'drafts',
      deleted: 'deleteditems',
    }
    const folder = folderMap[String(query.folder || 'inbox').toLowerCase()] || 'inbox'
    const top = Math.min(50, Math.max(1, Number(query.limit || 20)))
    const skip = Math.max(0, Number(query.skip || 0))
    const search = String(query.search || '').trim()
    const params = new URLSearchParams({
      $top: String(top),
      $skip: String(skip),
      $orderby: 'receivedDateTime desc',
      $select: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,bodyPreview,hasAttachments,isRead',
    })
    if (search) params.set('$search', `"${search.replace(/"/g, '')}"`)

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${setting.accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new AppError(payload.error?.message || 'Unable to load Outlook messages.', 400)
    }

    return {
      folder,
      email: setting.email || '',
      messages: (payload.value || []).map((message) => ({
        id: message.id,
        subject: message.subject || '(no subject)',
        from: message.from?.emailAddress || null,
        to: (message.toRecipients || []).map((entry) => entry.emailAddress).filter(Boolean),
        cc: (message.ccRecipients || []).map((entry) => entry.emailAddress).filter(Boolean),
        receivedDateTime: message.receivedDateTime || '',
        sentDateTime: message.sentDateTime || '',
        bodyPreview: message.bodyPreview || '',
        hasAttachments: Boolean(message.hasAttachments),
        isRead: Boolean(message.isRead),
      })),
      nextSkip: skip + (payload.value || []).length,
    }
  }

  async getOutlookProfile(actor) {
    const setting = await this.getValidOutlookConnection(actor)
    if (!setting.accessToken) throw new AppError('Connect Outlook before loading profile.', 400)
    const profile = await this.fetchOutlookProfile(setting.accessToken)
    return {
      ...profile,
      connected: true,
      shared: Boolean(setting.shared),
      expiresAt: setting.expiresAt || '',
      scopes: setting.scopes || [],
      lastSync: new Date().toISOString(),
    }
  }

  async sendMicrosoft365Email(actor, payload) {
    const setting = await this.getMicrosoft365Connection(actor)
    const to = String(payload.to || '').trim()
    if (!to || !to.includes('@')) throw new AppError('A valid recipient email is required.', 400)
    if (!setting.appPassword) throw new AppError('Connect Microsoft 365 before sending email.', 400)

    const transporter = nodemailer.createTransport({
      host: getM365SmtpHost(setting.email),
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { ciphers: 'SSLv3' },
      auth: { user: setting.email, pass: setting.appPassword },
    })

    let deliveryStatus = 'pending'
    let providerResponse = null
    
    try {
      const info = await transporter.sendMail({
        from: setting.email,
        to,
        subject: String(payload.subject || 'CRM message'),
        text: String(payload.message || ''),
      })
      providerResponse = { messageId: info.messageId, response: info.response }
      deliveryStatus = 'sent'
    } catch (error) {
      providerResponse = { error: error.message }
      deliveryStatus = 'failed'
    }

    const log = await saveCommunicationLog({
      actor,
      channel: 'microsoft365',
      status: deliveryStatus,
      targetType: payload.targetType,
      targetId: payload.targetId,
      recipient: to,
      subject: payload.subject || 'CRM message',
      summary: payload.message || '',
      provider: 'microsoft365_smtp',
      metadata: { providerResponse, connected: true },
    })
    
    return { status: deliveryStatus, log, connected: true }
  }

  async getValidOutlookConnection(actor) {
    const setting = await this.getOutlookConnection(actor)
    if (!setting.refreshToken && !setting.accessToken) return setting

    const expiresAt = setting.expiresAt ? new Date(setting.expiresAt).getTime() : 0
    const hasUsableAccessToken = setting.accessToken && expiresAt > Date.now() + 2 * 60 * 1000
    if (hasUsableAccessToken) return setting
    if (!setting.refreshToken) return setting

    const config = this.getOutlookConfig()
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      refresh_token: setting.refreshToken,
      grant_type: 'refresh_token',
      scope: OUTLOOK_SCOPES,
    })
    if (config.clientSecret) {
      tokenParams.set('client_secret', config.clientSecret)
    }

    const tokenPayload = await this.requestOutlookToken(tokenParams)
    return this.saveOutlookTokenSet(actor.id, tokenPayload, {
      email: setting.email,
      displayName: setting.displayName,
    }, setting, { shared: Boolean(setting.shared) })
  }

  async sendOutlookTestEmail(actor, payload = {}) {
    const status = await this.getOutlookStatus(actor)
    if (!status.connected) {
      const m365Status = await this.getMicrosoft365Status(actor)
      if (m365Status.connected) {
        return this.sendMicrosoft365Email(actor, {
          to: payload.to || m365Status.email || actor.email || '',
          subject: payload.subject || 'CRM Microsoft 365 test email',
          message: payload.message || 'This test email was sent from CRM using Microsoft 365 SMTP.',
          targetType: 'integration',
          targetId: 'microsoft365-test',
        })
      }
    }

    const setting = await this.getOutlookConnection(actor)
    const to = String(payload.to || setting.email || actor.email || '').trim()
    return this.sendOutlookEmail(actor, {
      to,
      subject: payload.subject || 'CRM Outlook test email',
      message: payload.message || 'This test email was sent from CRM using Microsoft Graph API.',
      targetType: 'integration',
      targetId: 'outlook-test',
    })
  }

  async testOutlookConnection(actor) {
    const setting = await this.getValidOutlookConnection(actor)
    if (!setting.accessToken) {
      throw new AppError('Connect Outlook before testing the connection.', 400)
    }

    const profile = await this.fetchOutlookProfile(setting.accessToken)
    return {
      connected: true,
      email: profile.email || setting.email || '',
      displayName: profile.displayName || setting.displayName || '',
      checkedAt: new Date().toISOString(),
    }
  }

  async listCommunicationLogs(actor, query = {}) {
    const filter = { companyId: actor.companyId || 1 }
    if (query.targetType) filter.targetType = String(query.targetType)
    if (query.targetId) filter.targetId = String(query.targetId)
    const records = await CommunicationLog.find(filter)
      .sort({ createdAt: -1, legacyId: -1 })
      .limit(Math.min(100, Math.max(1, Number(query.limit || 50))))
      .lean()

    return records.map((record) => ({
      id: record.legacyId ?? record.id,
      channel: record.channel,
      status: record.status,
      targetType: record.targetType,
      targetId: record.targetId,
      recipient: record.recipient,
      subject: record.subject,
      summary: record.summary,
      provider: record.provider,
      createdByName: record.createdByName,
      createdAt: record.createdAt,
    }))
  }
}

module.exports = new IntegrationService()
