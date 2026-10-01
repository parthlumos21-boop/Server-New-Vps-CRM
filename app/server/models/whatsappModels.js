const { mongoose } = require('../config/db')
const { Schema } = mongoose

const WhatsAppSettingSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  companyId: { type: String },
  businessName: { type: String },
  phoneNumber: { type: String },
  phoneNumberId: { type: String },
  wabaId: { type: String },
  accessTokenEncrypted: { type: String },
  status: { type: String, default: 'DISCONNECTED' },
  connectedAt: { type: Date },
}, { timestamps: true })


const WhatsAppChatSchema = new Schema({
  userId: { type: String, required: true, index: true },
  chatId: { type: String, required: true }, // Usually the customer's phone number
  name: { type: String },
  unreadCount: { type: Number, default: 0 },
  timestamp: { type: Number },
  lastMessage: { type: Object },
}, { timestamps: true })

WhatsAppChatSchema.index({ userId: 1, chatId: 1 }, { unique: true })

const WhatsAppContactSchema = new Schema({
  userId: { type: String, required: true, index: true },
  contactId: { type: String, required: true }, // Phone number
  name: { type: String },
  pushname: { type: String },
  profilePic: { type: String },
}, { timestamps: true })

WhatsAppContactSchema.index({ userId: 1, contactId: 1 }, { unique: true })

const WhatsAppMessageSchema = new Schema({
  userId: { type: String, required: true, index: true },
  chatId: { type: String, required: true, index: true },
  customerId: { type: String },
  messageId: { type: String, required: true },
  sender: { type: String },
  receiver: { type: String },
  fromMe: { type: Boolean, default: false },
  message: { type: String },
  messageType: { type: String },
  hasMedia: { type: Boolean, default: false },
  mediaUrl: { type: String },
  status: { type: String }, // sent, delivered, read, failed
  timestamp: { type: Number },
}, { timestamps: true })

WhatsAppMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true })
WhatsAppMessageSchema.index({ userId: 1, chatId: 1, timestamp: -1 })

const WhatsAppSetting = mongoose.models.whatsapp_settings || mongoose.model('whatsapp_settings', WhatsAppSettingSchema)
const WhatsAppChat = mongoose.models.whatsapp_chats || mongoose.model('whatsapp_chats', WhatsAppChatSchema)
const WhatsAppContact = mongoose.models.whatsapp_contacts || mongoose.model('whatsapp_contacts', WhatsAppContactSchema)
const WhatsAppMessage = mongoose.models.whatsapp_messages || mongoose.model('whatsapp_messages', WhatsAppMessageSchema)

module.exports = {
  WhatsAppSetting,
  WhatsAppChat,
  WhatsAppContact,
  WhatsAppMessage,
}
