const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')
const controller = require('../controllers/integrationController')

const router = express.Router()

// OAuth Callbacks (No auth middleware)
router.get('/outlook/callback', controller.outlookCallback)
router.post('/outlook/callback', controller.outlookCallback)
router.get('/whatsapp/callback', controller.whatsappCloudCallback)

// Webhooks
router.get('/whatsapp/webhook', controller.whatsappCloudWebhookVerify)
router.post('/whatsapp/webhook', controller.whatsappCloudWebhook)

router.use(requireAuth)
router.get('/status', controller.getStatus)
router.get('/downloads', controller.getDownloads)

// WhatsApp Cloud API
router.post('/whatsapp/connect', controller.connectWhatsappCloud)
router.post('/whatsapp/connect-manual', controller.connectWhatsappCloudManual)
router.post('/whatsapp/disconnect', controller.disconnectWhatsappCloud)
router.get('/whatsapp/status', controller.getWhatsappCloudStatus)
router.post('/whatsapp/send', controller.sendWhatsappCloud)
router.get('/whatsapp/chats', controller.getWhatsappCloudChats)
router.get('/whatsapp/chats/:chatId/messages', controller.getWhatsappCloudMessages)

// Outlook API
router.get('/outlook/status', controller.getOutlookStatus)
router.post('/outlook/connect', controller.connectOutlook)
router.post('/outlook/qr', controller.getOutlookQr)
router.post('/outlook/device-code/start', controller.startOutlookDeviceCode)
router.post('/outlook/device-code/complete', controller.completeOutlookDeviceCode)
router.post('/outlook/disconnect', controller.disconnectOutlook)
router.post('/outlook/send-email', controller.sendOutlookEmail)
router.post('/outlook/send-test', controller.sendOutlookTestEmail)
router.post('/outlook/send-test-email', controller.sendOutlookTestEmail)
router.post('/outlook/test-connection', controller.testOutlookConnection)
router.get('/outlook/messages', controller.listOutlookMessages)
router.get('/outlook/profile', controller.getOutlookProfile)

// Microsoft 365 API
router.post('/microsoft365/connect', controller.connectMicrosoft365)
router.post('/microsoft365/disconnect', controller.disconnectMicrosoft365)
router.post('/microsoft365/test', controller.testMicrosoft365Connection)
router.get('/communication-logs', controller.listCommunicationLogs)

module.exports = router
