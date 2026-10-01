const { Client, LocalAuth } = require('whatsapp-web.js')
const path = require('path')
const fs = require('fs')
const qrcode = require('qrcode')

class WhatsappClientService {
  constructor() {
    this.clients = new Map()
    this.status = new Map()
    // Explicitly configure a reliable Chrome executable path for Windows
    this.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }

  _emitStatus(userId) {
    const { getSocketServer } = require('../socket/socketServer')
    const socketServer = getSocketServer()
    if (socketServer) {
      socketServer.emitToUser(userId, 'whatsapp_status_update', this.getStatus(userId))
    }
  }

  _emitEvent(userId, eventName, payload) {
    const { getSocketServer } = require('../socket/socketServer')
    const socketServer = getSocketServer()
    if (socketServer) {
      socketServer.emitToUser(userId, eventName, payload)
    }
  }

  async initialize(userId) {
    if (this.clients.has(userId)) {
      return this.clients.get(userId)
    }

    try {
      // Clear any stale local auth locks to prevent "Browser already running" errors
      const authPath = path.join(process.cwd(), '.wwebjs_auth', `session-${userId}`)
      if (fs.existsSync(authPath)) {
        try {
          fs.rmSync(authPath, { recursive: true, force: true })
        } catch (e) {
          console.warn('Could not clear stale wwebjs auth folder:', e.message)
        }
      }
    } catch (err) {}

    console.log(`[WhatsApp] Initializing client for user ${userId}`)
    this.status.set(userId, { status: 'INITIALIZING', qr: null })
    this._emitStatus(userId)

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: {
        executablePath: fs.existsSync(this.executablePath) ? this.executablePath : undefined,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    })

    client.on('qr', (qr) => {
      console.log(`[WhatsApp] QR generated for user ${userId}`)
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
          this.status.set(userId, { status: 'QR_READY', qr: url })
          this._emitStatus(userId)
        }
      })
    })

    client.on('ready', () => {
      console.log(`[WhatsApp] Client is ready for user ${userId}`)
      this.status.set(userId, { status: 'READY', qr: null })
      this._emitStatus(userId)
      
      client.getChats().then(async (chats) => {
        try {
          const { WhatsAppChat } = require('../models/whatsappModels')
          for (let chat of chats) {
            await WhatsAppChat.findOneAndUpdate(
              { userId, chatId: chat.id._serialized },
              { name: chat.name, timestamp: chat.timestamp * 1000, unreadCount: chat.unreadCount },
              { upsert: true }
            )
          }
          this._emitEvent(userId, 'whatsapp_chats_synced', {})
        } catch (err) {
          console.error('[WhatsApp] Failed to save chats:', err)
        }
      })
    })

    client.on('message', async (msg) => {
      try {
        const { WhatsAppMessage, WhatsAppChat } = require('../models/whatsappModels')
        const chat = await msg.getChat()
        
        await WhatsAppChat.findOneAndUpdate(
          { userId, chatId: chat.id._serialized },
          { name: chat.name, timestamp: msg.timestamp * 1000 },
          { upsert: true }
        )

        let mediaUrl = null
        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia()
            if (media && media.data.length < 500000) {
               mediaUrl = `data:${media.mimetype};base64,${media.data}`
            }
          } catch (e) {
            console.warn('[WhatsApp] Failed to download media:', e.message)
          }
        }

        const newMsg = await WhatsAppMessage.create({
          userId,
          messageId: msg.id._serialized,
          chatId: chat.id._serialized,
          body: msg.body,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          hasMedia: msg.hasMedia,
          mediaUrl: mediaUrl,
          ack: msg.ack
        })
        
        this._emitEvent(userId, 'whatsapp_message', newMsg)
      } catch (err) {
        console.error('[WhatsApp] Message handling error:', err)
      }
    })

    client.on('message_ack', async (msg, ack) => {
      try {
        const { WhatsAppMessage } = require('../models/whatsappModels')
        await WhatsAppMessage.findOneAndUpdate(
          { messageId: msg.id._serialized },
          { ack }
        )
      } catch (err) {}
    })

    client.on('disconnected', (reason) => {
      console.log(`[WhatsApp] Client disconnected for user ${userId}:`, reason)
      this.status.set(userId, { status: 'DISCONNECTED', qr: null })
      this._emitStatus(userId)
      this.clients.delete(userId)
      client.destroy()
    })

    client.on('auth_failure', (msg) => {
      console.error(`[WhatsApp] Auth failure for user ${userId}:`, msg)
      this.status.set(userId, { status: 'AUTH_FAILED', qr: null })
      this._emitStatus(userId)
    })

    try {
      this.clients.set(userId, client)
      await client.initialize()
    } catch (error) {
      console.error(`[WhatsApp] Init error for user ${userId}:`, error)
      this.status.set(userId, { status: 'ERROR', error: error.message })
      this.clients.delete(userId)
    }

    return client
  }

  getStatus(userId) {
    return this.status.get(userId) || { status: 'DISCONNECTED', qr: null }
  }

  getClient(userId) {
    return this.clients.get(userId)
  }

  async logout(userId) {
    const client = this.clients.get(userId)
    if (client) {
      try {
        await client.logout()
      } catch (e) {
        console.warn(`[WhatsApp] Logout error for ${userId}:`, e)
      }
      try {
        await client.destroy()
      } catch (e) {}
      this.clients.delete(userId)
    }
    
    this.status.set(userId, { status: 'DISCONNECTED', qr: null })
    this._emitStatus(userId)
    
    // Clear session directory
    const authPath = path.join(process.cwd(), '.wwebjs_auth', `session-${userId}`)
    if (fs.existsSync(authPath)) {
      try {
         fs.rmSync(authPath, { recursive: true, force: true })
      } catch (e) {}
    }
    
    return true
  }
}

module.exports = new WhatsappClientService()
