const crypto = require('crypto')
const fetch = require('node-fetch')
const { env } = require('../config/env')
const { AppError } = require('../utils/appError')
const { WhatsAppSetting, WhatsAppChat, WhatsAppContact, WhatsAppMessage } = require('../models/whatsappModels')

const encryptSecret = (text) => {
  if (!text) return text
  const key = Buffer.from(env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf-8')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

const decryptSecret = (text) => {
  if (!text || !text.includes(':')) return text
  try {
    const key = Buffer.from(env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf-8')
    const [ivHex, encryptedHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    return null
  }
}

class WhatsAppCloudService {
  getConfig() {
    return {
      clientId: process.env.META_CLIENT_ID || '',
      clientSecret: process.env.META_CLIENT_SECRET || '',
      redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:5000/api/integrations/whatsapp/callback',
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'crm_whatsapp_verify_token',
    }
  }

  buildAuthUrl(actor, returnUrl = '') {
    const config = this.getConfig()
    if (!config.clientId || !config.redirectUri) {
      throw new AppError('Meta App is not configured on the server (META_CLIENT_ID or META_REDIRECT_URI missing).', 400)
    }

    const state = Buffer.from(JSON.stringify({
      userId: actor.id,
      returnUrl: returnUrl || 'http://localhost:3000/admin/whatsapp',
      nonce: crypto.randomBytes(12).toString('hex'),
    })).toString('base64url')

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      config_id: process.env.META_CONFIG_ID || '', // WhatsApp Login Config ID if using embedded flow
      state,
      scope: 'whatsapp_business_messaging whatsapp_business_management',
    })

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  }

  async handleCallback(query) {
    const config = this.getConfig()
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new AppError('Meta App is not configured.', 400)
    }
    if (!query.code || !query.state) throw new AppError('Missing OAuth callback data.', 400)

    let stateObj = {}
    try {
      stateObj = JSON.parse(Buffer.from(String(query.state), 'base64url').toString('utf8'))
    } catch (e) {
      throw new AppError('Invalid state token.', 400)
    }

    const userId = stateObj.userId

    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: String(query.code),
      redirect_uri: config.redirectUri,
    })

    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`)
    const tokenPayload = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok) {
      throw new AppError(tokenPayload.error?.message || 'Meta OAuth token request failed.', 400)
    }

    const accessToken = tokenPayload.access_token

    // 2. Fetch WABA ID and Phone Numbers
    const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${config.clientId}|${config.clientSecret}`)
    const debugPayload = await debugRes.json().catch(() => ({}))
    const systemUserId = debugPayload.data?.user_id

    // Fetch Phone numbers attached to this access token (simplified flow)
    const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${systemUserId}/accounts?access_token=${accessToken}`)
    // This is a simplified Meta Business fetching flow. In a real embedded sign-up, you get shared_waba_id via webhook or the token directly gives access.
    // For this plan, we'll store what we have and assume they connect a specific number.
    // A robust flow queries /me/businesses -> /wabas -> /phone_numbers.
    // We'll mock the WABA ID retrieval for now as this is just the implementation framework.

    const setting = await WhatsAppSetting.findOneAndUpdate(
      { userId: String(userId) },
      {
        $set: {
          accessTokenEncrypted: encryptSecret(accessToken),
          status: 'CONNECTED',
          connectedAt: new Date(),
        }
      },
      { upsert: true, new: true }
    )

    return {
      returnUrl: stateObj.returnUrl,
      success: true
    }
  }

  async connectManual(actor, phoneNumberId, accessToken) {
    if (!phoneNumberId || !accessToken) {
      throw new AppError('Phone Number ID and Access Token are required', 400)
    }

    const setting = await WhatsAppSetting.findOneAndUpdate(
      { userId: String(actor.id) },
      {
        $set: {
          phoneNumberId: String(phoneNumberId),
          accessTokenEncrypted: encryptSecret(accessToken),
          status: 'CONNECTED',
          connectedAt: new Date(),
        }
      },
      { upsert: true, new: true }
    )

    return { success: true }
  }

  async getStatus(actor) {
    const setting = await WhatsAppSetting.findOne({ userId: String(actor.id) })
    if (!setting || !setting.accessTokenEncrypted) {
      return { connected: false }
    }
    return {
      connected: true,
      businessName: setting.businessName || 'WhatsApp Business',
      phoneNumber: setting.phoneNumber || '',
      connectedAt: setting.connectedAt,
    }
  }

  async disconnect(actor) {
    await WhatsAppSetting.findOneAndUpdate({ userId: String(actor.id) }, {
      $unset: { accessTokenEncrypted: 1 },
      $set: { status: 'DISCONNECTED' }
    })
    return { success: true }
  }

  async sendMessage(actor, { to, message }) {
    const setting = await WhatsAppSetting.findOne({ userId: String(actor.id) })
    if (!setting || !setting.accessTokenEncrypted || !setting.phoneNumberId) {
      throw new AppError('WhatsApp Cloud API is not connected.', 400)
    }

    const accessToken = decryptSecret(setting.accessTokenEncrypted)
    const url = `https://graph.facebook.com/v19.0/${setting.phoneNumberId}/messages`
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[^\d]/g, ''),
      type: 'text',
      text: { body: message }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new AppError(data.error?.message || 'Failed to send WhatsApp message.', 400)
    }

    // Store message in MongoDB
    const newMessage = await WhatsAppMessage.create({
      userId: String(actor.id),
      chatId: payload.to,
      messageId: data.messages[0].id,
      sender: setting.phoneNumber,
      receiver: payload.to,
      fromMe: true,
      message: message,
      messageType: 'text',
      status: 'sent',
      timestamp: Date.now()
    })

    return newMessage
  }

  async getChats(actor) {
    return await WhatsAppChat.find({ userId: String(actor.id) }).sort({ timestamp: -1 })
  }

  async getChatMessages(actor, chatId) {
    return await WhatsAppMessage.find({ userId: String(actor.id), chatId }).sort({ timestamp: 1 })
  }
}

module.exports = new WhatsAppCloudService()
