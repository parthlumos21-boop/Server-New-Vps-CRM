const { getMongoModel } = require('../models/mongoModels')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters } = require('./mongoQueryHelpers')
const { isPrivilegedRole } = require('../security/accessScope')
const userRepository = require('./userRepository')
const { getCrmGroupOwnerCodesForUser } = require('../features/crmUserDirectory')

const DashboardTab = getMongoModel('dashboard_tabs')
const tabRepository = createCrudRepository({
  table: 'dashboard_tabs',
  ownerColumn: 'user_id',
})

const collectionModels = {
  leads: getMongoModel('leads'),
  deals: getMongoModel('deals'),
  tasks: getMongoModel('tasks'),
  customers: getMongoModel('customers'),
  supportRequests: getMongoModel('support_requests'),
  quotations: getMongoModel('quotations'),
}

const resolveScope = async (actor) => {
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

  return {
    scopeOwnerCodes,
    scopeUserIds,
  }
}

const buildScopeFilter = (actor, { scopeUserIds = null, scopeOwnerCodes = [], includeOwnerCodeScope = false } = {}) => (
  buildScopedMongoFilter({
    actor,
    ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
    companyWide: isPrivilegedRole(actor.role),
    scopeUserIds: scopeUserIds || [actor.id],
    additionalScopeGroups: includeOwnerCodeScope && scopeOwnerCodes.length
      ? [{ fields: ['accountNo', 'accountNumber', 'formData.accountNumber', 'formData.accountNo'], values: scopeOwnerCodes }]
      : [],
  })
)

const safeCount = async (Model, filter) => {
  try {
    return Model.countDocuments(filter)
  } catch (_error) {
    return 0
  }
}

const getStats = async (actor) => {
  const { scopeUserIds, scopeOwnerCodes } = await resolveScope(actor)
  const commonScope = buildScopeFilter(actor, { scopeUserIds })
  const leadScope = buildScopeFilter(actor, { scopeUserIds, scopeOwnerCodes, includeOwnerCodeScope: true })

  const [leads, deals, tasks, customers, supportRequests, quotations, openTasks] = await Promise.all([
    safeCount(collectionModels.leads, leadScope),
    safeCount(collectionModels.deals, commonScope),
    safeCount(collectionModels.tasks, commonScope),
    safeCount(collectionModels.customers, commonScope),
    safeCount(collectionModels.supportRequests, commonScope),
    safeCount(collectionModels.quotations, commonScope),
    safeCount(collectionModels.tasks, mergeFilters({ status: 'open' }, commonScope)),
  ])

  return { leads, deals, tasks, customers, supportRequests, quotations, openTasks }
}

const getDealsByStage = async (actor) => {
  const filter = buildScopeFilter(actor, { scopeUserIds: [actor.id] })
  try {
    return collectionModels.deals.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          total: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          stage: { $ifNull: ['$_id', ''] },
          count: 1,
          total: 1,
        },
      },
    ])
  } catch (_error) {
    return []
  }
}

const getLeadsByStatus = async (actor) => {
  const filter = buildScopeFilter(actor, { scopeUserIds: [actor.id] })
  try {
    return collectionModels.leads.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          status: { $ifNull: ['$_id', ''] },
          count: 1,
        },
      },
    ])
  } catch (_error) {
    return []
  }
}

const listTabs = async (actor) => {
  const records = await DashboardTab
    .find({
      companyId: actor.companyId || 1,
      $or: [{ userId: actor.id }, { isShared: true }],
    })
    .sort({ position: 1, legacyId: 1 })
    .lean()

  return records.map(tabRepository.map)
}

const createTab = async ({ userId, companyId, name, layout, position, isShared }) => (
  tabRepository.create({
    userId,
    companyId: companyId || 1,
    name,
    layout: layout || {},
    position: position || 0,
    isShared: Boolean(isShared),
  })
)

const updateTab = async (id, actor, { name, layout, position, isShared }) => {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (layout !== undefined) updates.layout = layout
  if (position !== undefined) updates.position = position
  if (isShared !== undefined) updates.isShared = isShared

  const record = await DashboardTab.findOneAndUpdate(
    mergeFilters(
      byLegacyId(id),
      {
        companyId: actor.companyId || 1,
        $or: [{ userId: actor.id }, { isShared: true }],
      }
    ),
    { $set: updates },
    { new: true }
  ).lean()

  return tabRepository.map(record)
}

const deleteTab = async (id, actor) => {
  const record = await DashboardTab.findOneAndDelete({
    ...byLegacyId(id),
    userId: actor.id,
    companyId: actor.companyId || 1,
  }).lean()

  return record ? { id: record.legacyId ?? record.id } : null
}

module.exports = {
  getStats,
  getDealsByStage,
  getLeadsByStatus,
  listTabs,
  createTab,
  updateTab,
  deleteTab,
}
