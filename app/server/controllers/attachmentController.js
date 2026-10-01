const fs = require('fs')
const attachmentRepository = require('../repositories/attachmentRepository')
const storageService = require('../services/storageService')
const { AppError } = require('../utils/appError')
const { assertEntityAccess, normalizeEntityType } = require('../services/entityAccessService')
const { isPrivilegedRole } = require('../security/accessScope')

const upload = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400)
    const { entityType, entityId } = req.body || {}
    if (!entityType || !entityId) {
      throw new AppError('entityType and entityId are required.', 400)
    }
    const parentRecord = await assertEntityAccess(req.user, entityType, entityId)
    const record = await attachmentRepository.create({
      entityType: normalizeEntityType(entityType),
      entityId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storagePath: req.file.filename,
      uploadedBy: req.user.id,
      companyId: parentRecord.companyId ?? req.user.companyId,
      ownerUserId: parentRecord.ownerUserId ?? req.user.id,
      projectId: parentRecord.projectId ?? null,
      workflowId: parentRecord.workflowId ?? null,
    })
    res.status(201).json({ success: true, data: record })
  } catch (error) { next(error) }
}

const list = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query
    if (!entityType || !entityId) throw new AppError('entityType and entityId required.', 400)
    await assertEntityAccess(req.user, entityType, entityId)
    const data = await attachmentRepository.listForEntity(normalizeEntityType(entityType), entityId)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const download = async (req, res, next) => {
  try {
    const attachment = await attachmentRepository.findById(Number(req.params.id))
    if (!attachment) throw new AppError('Attachment not found.', 404)
    await assertEntityAccess(req.user, attachment.entityType, attachment.entityId)
    const fullPath = storageService.resolveStoredPath(attachment.storagePath)
    if (!fullPath) throw new AppError('File path is invalid.', 400)
    if (!fs.existsSync(fullPath)) throw new AppError('File missing on disk.', 410)
    res.download(fullPath, attachment.fileName)
  } catch (error) { next(error) }
}

const remove = async (req, res, next) => {
  try {
    const attachment = await attachmentRepository.findById(Number(req.params.id))
    if (!attachment) throw new AppError('Attachment not found.', 404)
    await assertEntityAccess(req.user, attachment.entityType, attachment.entityId)
    if (!isPrivilegedRole(req.user.role) && attachment.uploadedBy !== req.user.id) {
      throw new AppError('Permission denied.', 403)
    }
    storageService.removeFile(attachment.storagePath)
    await attachmentRepository.remove(attachment.id)
    res.json({ success: true, data: { id: attachment.id } })
  } catch (error) { next(error) }
}

module.exports = { upload, list, download, remove }
