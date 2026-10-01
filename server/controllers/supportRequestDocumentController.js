const fs = require('fs')
const path = require('path')
const SupportRequestDocument = require('../models/SupportRequestDocument')
const { getMongoModel } = require('../models/mongoModels')
const storageService = require('../services/storageService')
const { AppError } = require('../utils/appError')

const upload = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400)

    const { supportRequestId, srNumber, documentType, title, description } = req.body

    if (!supportRequestId || !srNumber || !documentType) {
      // Clean up uploaded file if validation fails
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      throw new AppError('supportRequestId, srNumber, and documentType are required.', 400)
    }

    const mongoose = require('mongoose')
    const SupportRequest = getMongoModel('support_requests')
    
    let supportRequest
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(supportRequestId))
    if (isObjectId) {
      supportRequest = await SupportRequest.findById(supportRequestId)
    }
    if (!supportRequest && !isNaN(supportRequestId)) {
      supportRequest = await SupportRequest.findOne({ legacyId: Number(supportRequestId) })
    }
    if (!supportRequest) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      throw new AppError('Support Request not found.', 404)
    }

    const uploaderId = req.user.id || req.user._id
    const uploaderName = req.user.name || 'Unknown'
    const uploaderEmail = req.user.email || ''

    const userId = supportRequest.ownerId || supportRequest.assignedUserId || supportRequest.createdBy || uploaderId
    
    // Create directory path: users/{userId}/support-requests/{srNumber}/{documentType}/
    const relativePath = path.join('users', String(userId), 'support-requests', String(srNumber), String(documentType))
    const absoluteDir = path.join(storageService.getUploadsDir(), relativePath)
    
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true })
    }

    const fileExtension = path.extname(req.file.originalname)
    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const finalRelativePath = path.join(relativePath, fileName).replace(/\\/g, '/')
    const finalAbsolutePath = path.join(absoluteDir, fileName)

    // Move file from multer temp path to final path
    fs.renameSync(req.file.path, finalAbsolutePath)

    const document = await SupportRequestDocument.create({
      supportRequestId: supportRequest._id,
      srNumber,
      companyId: supportRequest.companyId || req.user.companyId,
      user: {
        userId,
        name: supportRequest.ownerName || '',
        email: '',
      },
      documentType,
      originalFileName: req.file.originalname,
      fileName,
      fileExtension,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storage: {
        provider: 'local',
        path: finalRelativePath,
      },
      title: title || req.file.originalname,
      description: description || '',
      uploadedBy: {
        userId: uploaderId,
        name: uploaderName,
        email: uploaderEmail,
      },
    })

    res.status(201).json({ success: true, data: document })
  } catch (error) {
    require('fs').writeFileSync('C:\\\\Users\\\\DELL\\\\.gemini\\\\antigravity-ide\\\\brain\\\\0cbc5d93-b420-42b1-9fe3-c55fe3b97688\\\\scratch\\\\error.txt', error.stack || error.message)
    next(error)
  }
}

const list = async (req, res, next) => {
  try {
    const documents = await SupportRequestDocument.find({ isDeleted: false }).sort({ createdAt: -1 }).lean()
    const SupportRequest = getMongoModel('support_requests')
    const supportRequestIds = documents.map((document) => document.supportRequestId).filter(Boolean)
    const srNumbers = documents.map((document) => document.srNumber).filter(Boolean)
    const supportRequests = await SupportRequest.find({
      $or: [
        { _id: { $in: supportRequestIds } },
        { srNumber: { $in: srNumbers } },
        { 'data.srNumber': { $in: srNumbers } },
      ],
    }).lean()
    const supportRequestById = new Map(supportRequests.map((supportRequest) => [String(supportRequest._id), supportRequest]))
    const supportRequestBySrNumber = new Map(
      supportRequests
        .map((supportRequest) => [supportRequest.srNumber || supportRequest.data?.srNumber, supportRequest])
        .filter(([srNumber]) => srNumber)
    )
    const enrichedDocuments = documents.map((document) => {
      const supportRequest = supportRequestById.get(String(document.supportRequestId))
        || supportRequestBySrNumber.get(document.srNumber)
        || {}
      const supportRequestData = supportRequest.data && typeof supportRequest.data === 'object' ? supportRequest.data : {}

      return {
        ...document,
        customerName: supportRequest.customerName || supportRequestData.customerName || '',
        requestType: supportRequest.requestType || supportRequestData.requestType || '',
      }
    })

    res.json({ success: true, data: enrichedDocuments })
  } catch (error) {
    next(error)
  }
}

const download = async (req, res, next) => {
  try {
    const document = await SupportRequestDocument.findById(req.params.id)
    if (!document || document.isDeleted) throw new AppError('Document not found.', 404)

    const fullPath = path.join(storageService.getUploadsDir(), document.storage.path)
    if (!fs.existsSync(fullPath)) throw new AppError('File missing on disk.', 410)

    res.download(fullPath, document.originalFileName)
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    const document = await SupportRequestDocument.findById(req.params.id)
    if (!document) throw new AppError('Document not found.', 404)

    // Soft delete
    document.isDeleted = true
    document.deletedAt = new Date()
    document.deletedBy = String(req.user.id || req.user._id)
    await document.save()

    res.json({ success: true, data: { id: document._id } })
  } catch (error) {
    next(error)
  }
}

module.exports = { upload, list, download, remove }
