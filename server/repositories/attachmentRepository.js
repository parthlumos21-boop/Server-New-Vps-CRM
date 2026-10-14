const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'attachments',
  ownerColumn: 'owner_user_id',
})

const Attachment = getMongoModel('attachments')

const User = getMongoModel('users')

const create = async ({ entityType, entityId, fileName, mimeType, sizeBytes, storagePath, uploadedBy, companyId, ownerUserId, projectId, workflowId, uploadedByName, uploadByMail, uploadedByMail }) => {
  let resolvedName = uploadedByName || ''
  let resolvedMail = uploadByMail || uploadedByMail || ''

  if ((!resolvedName || !resolvedMail) && uploadedBy) {
    const userDoc = await User.findOne({
      $or: [
        { id: uploadedBy },
        { legacyId: Number(uploadedBy) || -1 },
      ],
    }).lean().catch(() => null)
    if (userDoc) {
      if (!resolvedName) resolvedName = userDoc.name || userDoc.username || userDoc.email
      if (!resolvedMail) resolvedMail = userDoc.email || ''
    }
  }

  return baseRepository.create({
    entityType,
    entityId: String(entityId),
    fileName,
    mimeType: mimeType || null,
    sizeBytes: sizeBytes || 0,
    storagePath,
    uploadedBy: uploadedBy || null,
    uploadedByName: resolvedName || 'User',
    uploadByMail: resolvedMail || '',
    uploadedByMail: resolvedMail || '',
    companyId: companyId || 1,
    ownerUserId: ownerUserId || uploadedBy || null,
    projectId: projectId || null,
    workflowId: workflowId || null,
  })
}

const listForEntity = async (entityType, entityId) => {
  const records = await Attachment.find({ entityType, entityId: String(entityId) }).sort({ createdAt: -1, legacyId: -1 }).lean()
  if (!records || records.length === 0) return []

  const uploaderIds = Array.from(new Set(records.map((r) => r.uploadedBy).filter(Boolean)))
  let userMap = new Map()
  if (uploaderIds.length > 0) {
    const users = await User.find({
      $or: [
        { id: { $in: uploaderIds } },
        { legacyId: { $in: uploaderIds.map((id) => Number(id)).filter((n) => !isNaN(n)) } },
      ],
    }).lean().catch(() => [])

    users.forEach((u) => {
      const name = u.name || u.username || u.email || 'User'
      const mail = u.email || ''
      if (u.id) userMap.set(String(u.id), { name, mail })
      if (u.legacyId) userMap.set(String(u.legacyId), { name, mail })
    })
  }

  return records.map((rec) => {
    const mapped = baseRepository.map(rec)
    const userInfo = userMap.get(String(rec.uploadedBy))
    const uploadedByName = rec.uploadedByName || userInfo?.name || 'User'
    const uploadByMail = rec.uploadByMail || rec.uploadedByMail || userInfo?.mail || ''
    return {
      ...mapped,
      uploadedByName,
      uploadByMail,
      uploadedByMail: uploadByMail,
    }
  })
}

const findById = async (id) => baseRepository.map(await Attachment.findOne(byLegacyId(id)).lean())

const remove = async (id) => {
  const record = await Attachment.findOneAndDelete(byLegacyId(id)).lean()
  return baseRepository.map(record)
}

module.exports = { create, listForEntity, findById, remove }
