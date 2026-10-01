const { getMongoModel } = require('../models/mongoModels')
const { mapMongoDocument } = require('../utils/mongoRecordMapper')
const { buildScopedMongoFilter, mergeFilters, regexSearch } = require('../repositories/mongoQueryHelpers')
const { isPrivilegedRole } = require('../security/accessScope')
const userRepository = require('../repositories/userRepository')
const { getCrmGroupOwnerCodesForUser } = require('../features/crmUserDirectory')

const models = {
  leads: getMongoModel('leads'),
  deals: getMongoModel('deals'),
  customers: getMongoModel('customers'),
  tasks: getMongoModel('tasks'),
  supportRequests: getMongoModel('support_requests'),
  quotations: getMongoModel('quotations'),
  projects: getMongoModel('projects'),
}

const searchCollection = async (Model, searchFilter, scopeFilter, mapper) => {
  try {
    const records = await Model
      .find(mergeFilters(searchFilter, scopeFilter))
      .sort({ updatedAt: -1, createdAt: -1, legacyId: -1 })
      .limit(20)
      .lean()

    return records.map(mapper)
  } catch (_error) {
    return []
  }
}

const globalSearch = async (actor, term) => {
  const q = String(term || '').trim()
  if (!q) return { leads: [], deals: [], customers: [], tasks: [], supportRequests: [], quotations: [], projects: [] }

  const pattern = regexSearch(q)
  const scopeOwnerCodes = !isPrivilegedRole(actor.role)
    ? getCrmGroupOwnerCodesForUser(actor)
    : []
  const groupUsers = scopeOwnerCodes.length
    ? await userRepository.findUsersByOwnerCodes(scopeOwnerCodes, actor.companyId)
    : []
  const scopeUserIds = Array.from(new Set([
    actor.id,
    ...groupUsers.map((entry) => entry.id),
  ].filter(Boolean)))

  const buildScope = ({ includeOwnerCodeScope = false, ownerFields = ['ownerUserId', 'assignedTo', 'createdBy'] } = {}) => (
    buildScopedMongoFilter({
      actor,
      ownerFields,
      companyWide: isPrivilegedRole(actor.role),
      scopeUserIds,
      additionalScopeGroups: includeOwnerCodeScope && scopeOwnerCodes.length
        ? [{ fields: ['accountNo', 'accountNumber', 'formData.accountNumber', 'formData.accountNo'], values: scopeOwnerCodes }]
        : [],
    })
  )

  const commonScope = buildScope()
  const leadScope = buildScope({ includeOwnerCodeScope: true })
  const projectScope = buildScope({ ownerFields: ['ownerUserId', 'createdBy', 'updatedBy'] })

  const [leads, deals, customers, tasks, supportRequests, quotations, projects] = await Promise.all([
    searchCollection(
      models.leads,
      { $or: [{ customerName: pattern }, { email: pattern }, { company: pattern }, { projectName: pattern }, { 'formData.accountName': pattern }] },
      leadScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return {
          id: mapped.id,
          name: mapped.customerName || mapped.formData?.accountName || '',
          email: mapped.email || '',
          company: mapped.company || '',
          projectName: mapped.projectName || mapped.formData?.projectName || '',
        }
      }
    ),
    searchCollection(
      models.deals,
      { $or: [{ title: pattern }, { customerName: pattern }, { dealNumber: pattern }, { 'data.dealNumber': pattern }] },
      commonScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return { id: mapped.id, name: mapped.title || '', subtitle: mapped.customerName || '', stage: mapped.stage || '' }
      }
    ),
    searchCollection(
      models.customers,
      { $or: [{ name: pattern }, { customerName: pattern }, { email: pattern }, { company: pattern }] },
      commonScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return { id: mapped.id, name: mapped.name || mapped.customerName || '', email: mapped.email || '', company: mapped.company || '' }
      }
    ),
    searchCollection(
      models.tasks,
      { $or: [{ title: pattern }, { description: pattern }] },
      commonScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return { id: mapped.id, name: mapped.title || '', status: mapped.status || '' }
      }
    ),
    searchCollection(
      models.supportRequests,
      { $or: [{ subject: pattern }, { description: pattern }] },
      commonScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return { id: mapped.id, name: mapped.subject || '', status: mapped.status || '' }
      }
    ),
    searchCollection(
      models.quotations,
      { $or: [{ title: pattern }, { quoteNumber: pattern }, { quotationNumber: pattern }, { customerName: pattern }] },
      commonScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return { id: mapped.id, name: mapped.title || '', quoteNumber: mapped.quoteNumber || mapped.quotationNumber || '', status: mapped.status || '' }
      }
    ),
    searchCollection(
      models.projects,
      { $or: [{ projectName: pattern }, { projectCode: pattern }, { consultantName: pattern }, { architectName: pattern }, { pmcName: pattern }, { projectLocation: pattern }] },
      projectScope,
      (record) => {
        const mapped = mapMongoDocument(record)
        return {
          projectId: mapped.projectId || mapped.id,
          projectCode: mapped.projectCode || '',
          projectName: mapped.projectName || '',
          consultantName: mapped.consultantName || '',
          architectName: mapped.architectName || '',
          pmcName: mapped.pmcName || '',
          projectStatus: mapped.projectStatus || '',
          projectLocation: mapped.projectLocation || '',
          accountName: mapped.accountName || '',
          customerName: mapped.customerName || '',
        }
      }
    ),
  ])

  return { leads, deals, customers, tasks, supportRequests, quotations, projects }
}

module.exports = { globalSearch }
