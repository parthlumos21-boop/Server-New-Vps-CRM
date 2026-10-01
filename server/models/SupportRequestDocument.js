const mongoose = require('mongoose')

const supportRequestDocumentSchema = new mongoose.Schema(
  {
    supportRequestId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'SupportRequests',
      required: true,
      index: true,
    },
    srNumber: {
      type: String,
      required: true,
    },
    user: {
      userId: { type: mongoose.Schema.Types.Mixed },
      name: { type: String },
      email: { type: String },
    },
    companyId: {
      type: Number,
    },
    documentType: {
      type: String,
      enum: [
        'service_report',
        'invoice',
        'site_photo',
        'drawing',
        'warranty',
        'other',
      ],
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileExtension: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    storage: {
      provider: {
        type: String,
        default: 'local',
      },
      path: {
        type: String,
        required: true,
      },
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.Mixed },
      name: { type: String },
      email: { type: String },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: String,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('SupportRequestDocument', supportRequestDocumentSchema, 'support_request_documents')
