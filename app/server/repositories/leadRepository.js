const { getMongoModel } = require('../models/mongoModels')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'leads',
  ownerColumn: 'owner_user_id',
})

const Lead = getMongoModel('leads')

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const accountSearchFieldsByQueryKey = {
  accountNo: ['accountNo', 'accountNumber', 'formData.accountNo', 'formData.accountNumber'],
  accountNumber: ['accountNo', 'accountNumber', 'formData.accountNo', 'formData.accountNumber'],
  accountName: ['accountName', 'customerName', 'name', 'formData.accountName'],
  name: ['accountName', 'customerName', 'name', 'formData.accountName'],
  projectName: ['projectName', 'company', 'formData.projectName'],
  accountOwner: ['accountOwner', 'ownerName', 'formData.accountOwner', 'formData.ownerName'],
  accountCategory: ['accountCategory', 'customerType', 'industryType', 'formData.accountCategory'],
  consultantName: ['consultantName', 'formData.consultantName'],
  reasonForLost: ['reasonForLost', 'formData.reasonForLost'],
}

const buildAccountSearchFilter = (filters = {}) => {
  const conditions = Object.entries(accountSearchFieldsByQueryKey).flatMap(([queryKey, fields]) => {
    const value = String(filters[queryKey] || '').trim()
    if (!value) return []

    const pattern = new RegExp(escapeRegExp(value), 'i')
    return [{ $or: fields.map((field) => ({ [field]: pattern })) }]
  })

  return conditions.length > 0 ? { $and: conditions } : {}
}

const mapLeadRow = (record) => {
  const row = baseRepository.map(record)
  if (!row) {
    return null
  }

  const mergedFormData = row.formData && typeof row.formData === 'object' ? row.formData : {}
  const resolvedAccountNo = row.accountNo || mergedFormData.accountNumber || mergedFormData.accountNo || null
  const resolvedOwnerName = row.ownerName || mergedFormData.accountOwner || mergedFormData.ownerName || ''

  return {
    id: row.id,
    customerName: row.customerName || mergedFormData.customerName || mergedFormData.accountName || '',
    mobile: row.mobile || mergedFormData.alternatePhone || '',
    email: row.email || mergedFormData.alternateEmail || '',
    company: row.company || mergedFormData.projectName || '',
    status: row.status || mergedFormData.accountState || 'pending',
    companyId: row.companyId || 1,
    ownerUserId: row.ownerUserId || row.assignedTo || row.createdBy || null,
    projectId: row.projectId || null,
    workflowId: row.workflowId || null,
    assignedTo: row.assignedTo || null,
    createdBy: row.createdBy || null,
    ownerName: resolvedOwnerName,
    notes: row.notes || mergedFormData.remark || '',
    formType: row.formType || 'account',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...mergedFormData,
    createdByUserId: row.createdByUserId || mergedFormData.createdByUserId || row.createdBy || null,
    createdByUserName: row.createdByUserName || mergedFormData.createdByUserName || '',
    employeeId: row.employeeId || mergedFormData.employeeId || '',
    department: row.department || mergedFormData.department || '',
    userEmail: row.userEmail || mergedFormData.userEmail || '',
    accountNo: resolvedAccountNo,
    accountNumber: resolvedAccountNo,
    accountOwner: resolvedOwnerName,
    accountName: mergedFormData.accountName || row.customerName || '',
    alternatePhone: mergedFormData.alternatePhone || row.mobile || '',
    alternateEmail: mergedFormData.alternateEmail || row.email || '',
    projectName: row.projectName || mergedFormData.projectName || row.company || '',
    accountState: mergedFormData.accountState || row.status || 'pending',
    ownerId: row.assignedTo || null,
    assignedUserId: row.assignedTo || null,
    userId: row.createdBy || null,
  }
}

const listAllLeads = async () => {
  const records = await Lead.find({}).sort({ accountNo: 1, legacyId: 1 }).lean()
  return records.map(mapLeadRow)
}

const getLeadScopeOptions = ({ scopeUserIds = null, scopeOwnerCodes = [] } = {}) => ({
  scopeUserIds,
  additionalScopeGroups: scopeOwnerCodes.length
    ? [{ fields: ['accountNo', 'accountNumber', 'formData.accountNumber', 'formData.accountNo'], values: scopeOwnerCodes }]
    : [],
})

const buildLeadScopeFilter = (actor, { companyWide = false, scopeUserIds = null, scopeOwnerCodes = [] } = {}) => (
  buildScopedMongoFilter({
    actor,
    ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
    companyField: 'companyId',
    companyWide,
    ...getLeadScopeOptions({ scopeUserIds, scopeOwnerCodes }),
  })
)

const listLeadsForActor = async (actor, options = {}) => {
  const records = await Lead
    .find(mergeFilters(buildLeadScopeFilter(actor, options), buildAccountSearchFilter(options.filters || {})))
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow)
}

const listAssignedLeads = async (userId) => {
  const records = await Lead
    .find({ $or: [{ assignedTo: userId }, { createdBy: userId }] })
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow)
}

const listCreatedLeadsForActor = async (actor, filters = {}) => {
  const records = await Lead
    .find(mergeFilters(
      {
        companyId: actor.companyId,
        $or: [
          { createdBy: actor.id },
          { createdByUserId: actor.id },
          { 'formData.userId': actor.id },
          { 'formData.createdByUserId': actor.id },
        ],
      },
      buildAccountSearchFilter(filters)
    ))
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow)
}

const findLeadById = async (leadId) => {
  const record = await Lead.findOne(byLegacyId(leadId)).lean()
  return mapLeadRow(record)
}

const findLeadByIdForActor = async (leadId, actor, options = {}) => {
  const record = await Lead.findOne(mergeFilters(byLegacyId(leadId), buildLeadScopeFilter(actor, options))).lean()
  return mapLeadRow(record)
}

const createLead = async (payload) => {
  const created = await baseRepository.create(payload)
  if (!created.accountNo && !created.accountNumber) {
    const generatedAccountNo = `ACC${String(created.id).padStart(5, '0')}`
    await baseRepository.update(created.id, {
      accountNo: generatedAccountNo,
      accountNumber: generatedAccountNo,
      formData: {
        ...(created.formData && typeof created.formData === 'object' ? created.formData : {}),
        accountNo: generatedAccountNo,
        accountNumber: generatedAccountNo,
        account_no: generatedAccountNo,
      },
    })
  }
  return findLeadById(created.id)
}

const updateLead = async (leadId, updates = {}) => {
  const updated = await baseRepository.update(leadId, updates)
  return updated?.id ? findLeadById(updated.id) : null
}

const deleteLead = async (leadId) => {
  const result = await Lead.findOneAndDelete(byLegacyId(leadId)).lean()
  return Boolean(result)
}

module.exports = {
  listAllLeads,
  listLeadsForActor,
  listAssignedLeads,
  listCreatedLeadsForActor,
  findLeadById,
  findLeadByIdForActor,
  createLead,
  updateLead,
  deleteLead,
  mapLeadRow,
}
