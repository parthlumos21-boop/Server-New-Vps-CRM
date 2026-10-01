const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'attachments',
  ownerColumn: 'owner_user_id',
})

const Attachment = getMongoModel('attachments')

const create = async ({ entityType, entityId, fileName, mimeType, sizeBytes, storagePath, uploadedBy, companyId, ownerUserId, projectId, workflowId }) => (
  baseRepository.create({
    entityType,
    entityId: String(entityId),
    fileName,
    mimeType: mimeType || null,
    sizeBytes: sizeBytes || 0,
    storagePath,
    uploadedBy: uploadedBy || null,
    companyId: companyId || 1,
    ownerUserId: ownerUserId || uploadedBy || null,
    projectId: projectId || null,
    workflowId: workflowId || null,
  })
)

const listForEntity = async (entityType, entityId) => {
  const records = await Attachment.find({ entityType, entityId: String(entityId) }).sort({ createdAt: -1, legacyId: -1 }).lean()
  return records.map(baseRepository.map)
}

const findById = async (id) => baseRepository.map(await Attachment.findOne(byLegacyId(id)).lean())

const remove = async (id) => {
  const record = await Attachment.findOneAndDelete(byLegacyId(id)).lean()
  return baseRepository.map(record)
}

module.exports = { create, listForEntity, findById, remove }
