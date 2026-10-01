const { getMongoModel } = require('../models/mongoModels')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'projects',
  ownerColumn: 'owner_user_id',
})

const Project = getMongoModel('projects')
const Lead = getMongoModel('leads')
const Customer = getMongoModel('customers')

const resolveRelatedNames = async (project = {}) => {
  const [account, customer] = await Promise.all([
    project.accountId ? Lead.findOne(byLegacyId(project.accountId)).lean() : null,
    project.customerId ? Customer.findOne(byLegacyId(project.customerId)).lean() : null,
  ])

  const accountFormData = account?.formData && typeof account.formData === 'object' ? account.formData : {}
  return {
    accountName: accountFormData.accountName || account?.customerName || account?.company || '',
    customerName: customer?.name || customer?.customerName || '',
  }
}

const mapProjectRow = async (record) => {
  const mapped = baseRepository.map(record)
  if (!mapped) return null

  const names = await resolveRelatedNames(mapped)
  const projectId = mapped.projectId || mapped.id

  return {
    ...mapped,
    id: projectId,
    projectId,
    accountName: mapped.accountName || names.accountName,
    customerName: mapped.customerName || names.customerName,
    companyId: mapped.companyId || 1,
    ownerUserId: mapped.ownerUserId || mapped.updatedBy || mapped.createdBy || null,
  }
}

const mapProjects = async (records = []) => Promise.all(records.map(mapProjectRow))

const projectIdentityFilter = (projectId) => {
  const legacyFilter = byLegacyId(projectId)
  const clauses = [{ projectId }]

  if (legacyFilter.$or) {
    clauses.push(...legacyFilter.$or)
  } else {
    clauses.push(legacyFilter)
  }

  return { $or: clauses }
}

const buildProjectScopeFilter = (actor, { companyWide = false } = {}) => (
  buildScopedMongoFilter({
    actor,
    ownerFields: ['ownerUserId', 'createdBy', 'updatedBy', 'owner_user_id', 'created_by', 'updated_by'],
    companyWide,
  })
)

const listAllProjects = async () => {
  const records = await Project.find({}).sort({ updatedAt: -1, projectId: -1, legacyId: -1 }).lean()
  return mapProjects(records)
}

const listProjectsForActor = async (actor, options = {}) => {
  const records = await Project.find(buildProjectScopeFilter(actor, options)).sort({ updatedAt: -1, projectId: -1, legacyId: -1 }).lean()
  return mapProjects(records)
}

const listProjectsForUser = async (userId) => {
  const records = await Project
    .find({ $or: [{ createdBy: userId }, { updatedBy: userId }, { ownerUserId: userId }] })
    .sort({ updatedAt: -1, projectId: -1, legacyId: -1 })
    .lean()

  return mapProjects(records)
}

const findProjectById = async (projectId) => {
  const record = await Project.findOne(projectIdentityFilter(projectId)).lean()
  return mapProjectRow(record)
}

const findProjectByIdForActor = async (projectId, actor, options = {}) => {
  const record = await Project.findOne(mergeFilters(
    projectIdentityFilter(projectId),
    buildProjectScopeFilter(actor, options)
  )).lean()
  return mapProjectRow(record)
}

const createProject = async (payload) => {
  const created = await baseRepository.create(payload)
  if (!created.projectId) {
    await Project.updateOne(byLegacyId(created.id), { $set: { projectId: created.id } })
  }
  return findProjectById(created.projectId || created.id)
}

const updateProject = async (projectId, payload) => {
  const existing = await findProjectById(projectId)
  if (!existing) return null

  await Project.findOneAndUpdate(
    byLegacyId(existing.legacyId || existing.id),
    { $set: payload },
    { new: true, runValidators: true }
  ).lean()

  return findProjectById(projectId)
}

const deleteProject = async (projectId) => {
  const existing = await findProjectById(projectId)
  if (!existing) return null

  await Project.findOneAndDelete(byLegacyId(existing.legacyId || existing.id))
  return { projectId: existing.projectId || existing.id }
}

module.exports = {
  listAllProjects,
  listProjectsForActor,
  listProjectsForUser,
  findProjectById,
  findProjectByIdForActor,
  createProject,
  updateProject,
  deleteProject,
}
