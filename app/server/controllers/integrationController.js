const integrationService = require('../services/integrationService')
const whatsappCloudService = require('../services/whatsappCloudService')

const safeOAuthReturnUrl = (stateValue) => {
  try {
    const state = JSON.parse(Buffer.from(String(stateValue || ''), 'base64url').toString('utf8'))
    const returnUrl = new URL(String(state.returnUrl || ''))
    if (['http:', 'https:'].includes(returnUrl.protocol)) return returnUrl
  } catch (_error) {
    return null
  }
  return null
}

class IntegrationController {
  async getStatus(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.getStatus(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async getDownloads(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.getDownloadMetadata() })
    } catch (error) {
      next(error)
    }
  }

  async getOutlookStatus(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.getOutlookStatus(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async saveWhatsappSettings(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.saveWhatsappSettings(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  // WhatsApp Cloud API Controllers
  async connectWhatsappCloud(req, res, next) {
    try {
      const returnUrl = req.body.returnUrl
      const url = whatsappCloudService.buildAuthUrl(req.user, returnUrl)
      res.json({ success: true, url })
    } catch (error) {
      next(error)
    }
  }

  async whatsappCloudCallback(req, res, next) {
    try {
      const result = await whatsappCloudService.handleCallback(req.query)
      if (result.returnUrl) {
        res.redirect(result.returnUrl)
      } else {
        res.json({ success: true })
      }
    } catch (error) {
      next(error)
    }
  }

  async getWhatsappCloudStatus(req, res, next) {
    try {
      res.json({ success: true, data: await whatsappCloudService.getStatus(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async connectWhatsappCloudManual(req, res, next) {
    try {
      const { phoneNumberId, accessToken } = req.body
      res.json({ success: true, data: await whatsappCloudService.connectManual(req.user, phoneNumberId, accessToken) })
    } catch (error) {
      next(error)
    }
  }

  async disconnectWhatsappCloud(req, res, next) {
    try {
      res.json({ success: true, data: await whatsappCloudService.disconnect(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async sendWhatsappCloud(req, res, next) {
    try {
      res.json({ success: true, data: await whatsappCloudService.sendMessage(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async getWhatsappCloudChats(req, res, next) {
    try {
      res.json({ success: true, data: await whatsappCloudService.getChats(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async getWhatsappCloudMessages(req, res, next) {
    try {
      const chatId = req.params.chatId
      res.json({ success: true, data: await whatsappCloudService.getChatMessages(req.user, chatId) })
    } catch (error) {
      next(error)
    }
  }

  // Webhook Endpoints
  async whatsappCloudWebhookVerify(req, res, next) {
    try {
      const mode = req.query['hub.mode']
      const token = req.query['hub.verify_token']
      const challenge = req.query['hub.challenge']

      const config = whatsappCloudService.getConfig()
      if (mode && token) {
        if (mode === 'subscribe' && token === config.webhookVerifyToken) {
          return res.status(200).send(challenge)
        } else {
          return res.sendStatus(403)
        }
      }
      res.sendStatus(400)
    } catch (error) {
      next(error)
    }
  }

  async whatsappCloudWebhook(req, res, next) {
    try {
      // In a real app, process incoming messages here
      // whatsappCloudService.handleWebhookData(req.body)
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  async logoutWhatsapp(req, res, next) {
    try {
      const userId = req.user.id || req.user._id
      await whatsappClientService.logout(userId)
      res.json({ success: true, data: 'Logged out' })
    } catch (error) {
      next(error)
    }
  }

  async connectOutlook(req, res, next) {
    try {
      res.json({ success: true, data: { authUrl: integrationService.buildOutlookAuthUrl(req.user, req.body?.returnUrl) } })
    } catch (error) {
      next(error)
    }
  }

  async getOutlookQr(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.getOutlookQr(req.user, req.body?.returnUrl) })
    } catch (error) {
      next(error)
    }
  }

  async startOutlookDeviceCode(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.startOutlookDeviceCode(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async completeOutlookDeviceCode(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.completeOutlookDeviceCode(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async outlookCallback(req, res, next) {
    try {
      const callbackData = {
        ...(req.query || {}),
        ...(req.body || {}),
      }
      if (callbackData.error) {
        throw new Error(callbackData.error_description || callbackData.error || 'Microsoft Outlook authorization failed.')
      }
      const result = await integrationService.handleOutlookCallback(callbackData)
      if (result.returnUrl) {
        const redirectUrl = new URL(result.returnUrl)
        redirectUrl.searchParams.set('outlook', 'connected')
        if (result.email) redirectUrl.searchParams.set('outlookEmail', result.email)
        res.redirect(redirectUrl.toString())
        return
      }
      res
        .status(200)
        .send('<!doctype html><title>Outlook connected</title><p>Outlook connected successfully. You can close this tab and return to CRM.</p>')
    } catch (error) {
      const callbackData = {
        ...(req.query || {}),
        ...(req.body || {}),
      }
      const redirectUrl = safeOAuthReturnUrl(callbackData.state)
      if (redirectUrl) {
        redirectUrl.searchParams.set('outlook', 'error')
        redirectUrl.searchParams.set('outlookError', error.message || 'Microsoft Outlook authorization failed.')
        res.redirect(redirectUrl.toString())
        return
      }
      next(error)
    }
  }

  async disconnectOutlook(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.disconnectOutlook(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async sendOutlookEmail(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await integrationService.sendOutlookEmail(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async sendOutlookTestEmail(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await integrationService.sendOutlookTestEmail(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async listOutlookMessages(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.listOutlookMessages(req.user, req.query) })
    } catch (error) {
      next(error)
    }
  }

  async getOutlookProfile(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.getOutlookProfile(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async testOutlookConnection(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.testOutlookConnection(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async connectMicrosoft365(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.connectMicrosoft365(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async disconnectMicrosoft365(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.disconnectMicrosoft365(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async testMicrosoft365Connection(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.testMicrosoft365Connection(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async listCommunicationLogs(req, res, next) {
    try {
      res.json({ success: true, data: await integrationService.listCommunicationLogs(req.user, req.query) })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new IntegrationController()
