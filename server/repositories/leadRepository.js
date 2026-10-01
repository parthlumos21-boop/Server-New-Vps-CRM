const { getMongoModel } = require('../models/mongoModels')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'leads',
  ownerColumn: 'owner_user_id',
})

const Lead = getMongoModel('leads')
const visibleFilter = { frontendDeleted: { $ne: true } }

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const accountSearchFieldsByQueryKey = {
  accountNo: ['accountNo', 'accountNumber', 'ownerCode', 'formData.accountNo', 'formData.accountNumber', 'formData.ownerCode'],
  accountNumber: ['accountNo', 'accountNumber', 'ownerCode', 'formData.accountNo', 'formData.accountNumber', 'formData.ownerCode'],
  accountName: ['accountName', 'customerName', 'name', 'company', 'formData.accountName', 'formData.customerName', 'formData.name', 'formData.Account Name', 'data.accountName', 'data.customerName', 'data.name'],
  name: ['accountName', 'customerName', 'name', 'company', 'formData.accountName', 'formData.customerName', 'formData.name', 'formData.Account Name', 'data.accountName', 'data.customerName', 'data.name'],
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
  const mergedData = row.data && typeof row.data === 'object' ? row.data : {}
  const rawAccountNameCandidates = [
    row.accountName,
    row.customerName,
    row.name,
    mergedFormData.accountName,
    mergedFormData.customerName,
    mergedFormData.name,
    mergedFormData['Account Name'],
    mergedFormData['Customer Name'],
    mergedData.accountName,
    mergedData.customerName,
    mergedData.name,
    mergedData['Account Name'],
    row.company,
  ]
  const isCodePattern = (str) => typeof str === 'string' && /^[A-Z]{2,4}\d{4,8}$/i.test(str.trim())
  const validName = rawAccountNameCandidates.find((val) => typeof val === 'string' && val.trim() && !isCodePattern(val))
  const rawAccountName = validName ? validName.trim() : ''
  if (typeof rawAccountName === 'string' && /Report Filter/i.test(rawAccountName)) {
    return null
  }

  const resolvedAccountNo = row.accountNo || row.accountNumber || row['Account Number'] || row.ownerCode || mergedFormData.accountNumber || mergedFormData.accountNo || mergedFormData['Account Number'] || mergedFormData.ownerCode || null
  const resolvedOwnerName = row.accountOwnerName || row.accountOwner || row.ownerName || mergedFormData.accountOwnerName || mergedFormData.accountOwner || mergedFormData.ownerName || ''

  return {
    ...row,
    ...mergedFormData,
    id: row.id,
    name: rawAccountName,
    customerName: rawAccountName,
    accountName: rawAccountName,
    accountDate: row.accountDate || mergedFormData.accountDate || null,
    accountCategory: row.accountCategory || mergedFormData.accountCategory || null,
    contactPerson: row.contactPerson || mergedFormData.contactPerson || null,
    phone: row.phone || row.mobile || mergedFormData.phone || mergedFormData.alternatePhone || null,
    email: row.email || mergedFormData.email || mergedFormData.alternateEmail || '',
    alternatePhone: row.alternatePhone || mergedFormData.alternatePhone || null,
    alternateEmail: row.alternateEmail || mergedFormData.alternateEmail || null,
    customerType: row.customerType || mergedFormData.customerType || null,
    projectName: row.projectName || mergedFormData.projectName || row.company || '',
    productCategory: row.productCategory || mergedFormData.productCategory || null,
    state: row.state || mergedFormData.state || null,
    location: row.location || mergedFormData.location || null,
    industryType: row.industryType || mergedFormData.industryType || mergedFormData.industry || null,
    customerRefNo: row.customerRefNo || mergedFormData.customerRefNo || null,
    jobNo: row.jobNo || mergedFormData.jobNo || row.customerRefNo || mergedFormData.customerRefNo || null,
    consultantName: row.consultantName || mergedFormData.consultantName || null,
    poValue: row.poValue !== undefined ? row.poValue : (mergedFormData.poValue !== undefined ? mergedFormData.poValue : null),
    userGroup: row.userGroup || mergedFormData.userGroup || null,
    mobile: row.mobile || row.phone || mergedFormData.alternatePhone || mergedFormData.phone || '',
    company: row.company || row.projectName || mergedFormData.projectName || mergedFormData.company || '',
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
    createdByUserId: row.createdByUserId || mergedFormData.createdByUserId || row.createdBy || null,
    createdByUserName: row.createdByUserName || mergedFormData.createdByUserName || '',
    createdUserBy: row.createdUserBy || mergedFormData.createdUserBy || '',
    ownerCode: row.ownerCode || row.accountOwnerCode || mergedFormData.ownerCode || mergedFormData.accountOwnerCode || null,
    accountOwnerCode: row.accountOwnerCode || row.ownerCode || mergedFormData.accountOwnerCode || mergedFormData.ownerCode || null,
    employeeId: row.employeeId || mergedFormData.employeeId || '',
    department: row.department || mergedFormData.department || '',
    userEmail: row.userEmail || mergedFormData.userEmail || '',
    accountNo: resolvedAccountNo,
    accountNumber: resolvedAccountNo,
    accountOwner: resolvedOwnerName,
    accountOwnerName: resolvedOwnerName,
    accountState: mergedFormData.accountState || row.status || 'pending',
    ownerId: row.assignedTo || null,
    assignedUserId: row.assignedTo || null,
    userId: row.createdBy || null,
  }
}

const listAllLeads = async () => {
  const records = await Lead.find(visibleFilter).sort({ accountNo: 1, legacyId: 1 }).lean()
  return records.map(mapLeadRow).filter(Boolean)
}

const getLeadScopeOptions = ({ scopeUserIds = null, scopeOwnerCodes = [] } = {}) => ({
  scopeUserIds,
  additionalScopeGroups: scopeOwnerCodes.length
    ? [{ fields: ['accountNo', 'accountNumber', 'ownerCode', 'accountOwnerCode', 'formData.accountNumber', 'formData.accountNo', 'formData.ownerCode', 'formData.accountOwnerCode'], values: scopeOwnerCodes }]
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
    .find(mergeFilters(buildLeadScopeFilter(actor, options), buildAccountSearchFilter(options.filters || {}), visibleFilter))
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow).filter(Boolean)
}

const listAssignedLeads = async (userId) => {
  const records = await Lead
    .find(mergeFilters({ $or: [{ assignedTo: userId }, { createdBy: userId }] }, visibleFilter))
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow).filter(Boolean)
}

const listCreatedLeadsForActor = async (actor, filters = {}) => {
  const ownerCodeStr = String(actor.ownerCode || actor.employeeId || '').trim()
  const actorName = String(actor.name || actor.username || '').trim()

  const records = await Lead
    .find(mergeFilters(
      {
        companyId: actor.companyId,
        $or: [
          { createdBy: actor.id },
          { createdByUserId: actor.id },
          { assignedTo: actor.id },
          { ownerUserId: actor.id },
          { 'formData.userId': actor.id },
          { 'formData.createdByUserId': actor.id },
          { 'formData.assignedTo': actor.id },
          { 'formData.ownerId': actor.id },
          ...(ownerCodeStr ? [
            { ownerCode: ownerCodeStr },
            { accountOwnerCode: ownerCodeStr },
            { accountNumber: ownerCodeStr },
            { accountNo: ownerCodeStr },
            { 'formData.ownerCode': ownerCodeStr },
            { 'formData.accountOwnerCode': ownerCodeStr },
          ] : []),
          ...(actorName ? [
            { accountOwner: actorName },
            { accountOwnerName: actorName },
            { ownerName: actorName },
            { 'formData.accountOwner': actorName },
            { 'formData.accountOwnerName': actorName },
            { 'formData.ownerName': actorName },
          ] : []),
        ],
      },
      buildAccountSearchFilter(filters),
      visibleFilter
    ))
    .sort({ accountNo: 1, legacyId: 1 })
    .lean()

  return records.map(mapLeadRow).filter(Boolean)
}

const findLeadById = async (leadId) => {
  const record = await Lead.findOne(mergeFilters(byLegacyId(leadId), visibleFilter)).lean()
  return mapLeadRow(record)
}

const findLeadByIdForActor = async (leadId, actor, options = {}) => {
  const record = await Lead.findOne(mergeFilters(byLegacyId(leadId), buildLeadScopeFilter(actor, options), visibleFilter)).lean()
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

const frontendDeleteLead = async (leadId, actor = {}) => {
  const deletedAt = new Date().toISOString()
  const record = await Lead.findOneAndUpdate(
    byLegacyId(leadId),
    {
      $set: {
        frontendDeleted: true,
        frontendDeletedAt: deletedAt,
        frontendDeletedBy: actor?.id || null,
      },
    },
    { new: true }
  ).lean()
  return mapLeadRow(record)
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
  frontendDeleteLead,
  mapLeadRow,
}
