const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')
const { toNumberOrNull } = require('../security/accessScope')

const UserGroup = getMongoModel('user_groups')
const UserGroupMember = getMongoModel('user_group_members')
const User = getMongoModel('users')

const normalizeNumber = toNumberOrNull

const toLegacyUserGroup = (record) => {
  if (!record) return null
  const id = record.legacyId ?? record.id

  return {
    id,
    mongoId: record._id?.toString?.() || '',
    groupName: record.groupName,
    companyId: record.companyId,
    companyName: record.companyName,
    role: record.role,
    designation: record.designation,
    state: record.state,
    city: record.city,
    description: record.description,
    createdBy: record.createdBy || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  }
}

const toLegacyUserGroupMember = (record) => {
  if (!record) return null

  return {
    id: record.legacyId ?? record.id ?? record._id?.toString?.(),
    mongoId: record._id?.toString?.() || '',
    groupId: record.groupId?.toString?.() || String(record.groupId || ''),
    userId: String(record.userId || ''),
    name: record.member?.name || record.name || '',
    email: record.member?.email || record.email || '',
    role: record.role || '',
    designation: record.designation || '',
    status: record.status || '',
    addedBy: record.addedBy || null,
    addedAt: record.addedAt || record.createdAt || '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

const sanitizeUserGroupRow = (row) => {
  return toLegacyUserGroup(row)
}

const createGroup = async (groupData, creatorUser) => {
  const legacyId = await getNextLegacyId('user_groups')
  
  const createdGroup = await UserGroup.create({
    legacyId,
    groupName: groupData.groupName,
    companyId: groupData.companyId || 1,
    companyName: groupData.companyName || 'Swati',
    role: groupData.role || 'user',
    designation: groupData.designation || '',
    state: groupData.state || '',
    city: groupData.city || '',
    description: groupData.description || '',
    createdBy: {
      userId: creatorUser.id || creatorUser._id || creatorUser.legacyId,
      name: creatorUser.name,
      email: creatorUser.email,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
  })

  if (Array.isArray(groupData.selectedUsers) && groupData.selectedUsers.length > 0) {
    const membersToInsert = []
    
    for (let i = 0; i < groupData.selectedUsers.length; i++) {
      const userId = groupData.selectedUsers[i]
      
      const byIdQuery = isNaN(userId) ? { _id: userId } : { legacyId: Number(userId) }
      const userDoc = await User.findOne(byIdQuery).lean()
      
      membersToInsert.push({
        legacyId: await getNextLegacyId('user_group_members'),
        groupId: createdGroup._id,
        userId: String(userId),
        member: userDoc ? {
          name: userDoc.name,
          email: userDoc.email,
        } : null,
        addedBy: {
          userId: creatorUser.id || creatorUser._id || creatorUser.legacyId,
          name: creatorUser.name,
          email: creatorUser.email,
        },
        addedAt: new Date(),
        status: 'active'
      })
    }

    await UserGroupMember.insertMany(membersToInsert)
  }

  return sanitizeUserGroupRow(createdGroup)
}

const listGroups = async (companyId = null) => {
  const filter = {}
  const normalizedCompanyId = normalizeNumber(companyId)
  if (normalizedCompanyId !== null) {
    filter.companyId = normalizedCompanyId
  }

  const records = await UserGroup.find(filter).sort({ createdAt: -1 }).lean()
  
  const objectIds = records.map(r => r._id)
  const stringIds = records.map(r => r._id.toString())
  
  // Fetch member counts and member array for each group
  const memberCounts = await UserGroupMember.aggregate([
    { $match: { groupId: { $in: [...objectIds, ...stringIds] } } },
    { $group: { _id: '$groupId', count: { $sum: 1 }, users: { $push: '$member' } } }
  ])
  
  const countMap = {}
  memberCounts.forEach(mc => {
    countMap[mc._id.toString()] = {
      count: mc.count,
      users: (mc.users || []).filter(Boolean)
    }
  })

  return records.map(record => {
    const legacy = sanitizeUserGroupRow(record)
    legacy.members = countMap[record._id.toString()]?.count || 0
    legacy.users = countMap[record._id.toString()]?.users || []
    return legacy
  })
}

const findGroupById = async (groupId) => {
  const normalizedGroupId = String(groupId || '').trim()
  if (!normalizedGroupId) return null

  const numericId = normalizeNumber(normalizedGroupId)
  const filters = []
  if (numericId !== null) {
    filters.push({ legacyId: numericId })
  }

  if (/^[a-f\d]{24}$/i.test(normalizedGroupId)) {
    filters.push({ _id: normalizedGroupId })
  }

  if (filters.length === 0) {
    return null
  }

  return UserGroup.findOne({ $or: filters }).lean()
}

const listGroupMembers = async (groupId, companyId = null) => {
  const group = await findGroupById(groupId)
  if (!group) return []

  const normalizedCompanyId = normalizeNumber(companyId)
  if (normalizedCompanyId !== null && normalizeNumber(group.companyId) !== normalizedCompanyId) {
    return []
  }

  const groupObjectId = group._id
  const groupStringId = group._id.toString()
  const records = await UserGroupMember
    .find({
      groupId: { $in: [groupObjectId, groupStringId] },
      status: { $ne: 'inactive' },
    })
    .sort({ addedAt: -1, createdAt: -1 })
    .lean()

  const missingMemberUserIds = records
    .filter((record) => !record.member?.name && record.userId)
    .map((record) => normalizeNumber(record.userId))
    .filter((value) => value !== null)

  const users = missingMemberUserIds.length > 0
    ? await User.find({ legacyId: { $in: missingMemberUserIds } }).lean()
    : []
  const userByLegacyId = users.reduce((lookup, user) => {
    lookup[String(user.legacyId)] = user
    return lookup
  }, {})

  return records.map((record) => {
    const fallbackUser = userByLegacyId[String(record.userId || '')] || null
    return toLegacyUserGroupMember({
      ...record,
      member: record.member || (fallbackUser ? { name: fallbackUser.name, email: fallbackUser.email } : null),
      role: record.role || fallbackUser?.role || '',
      designation: record.designation || fallbackUser?.designation || '',
    })
  })
}

const deleteGroup = async (groupId) => {
  const byIdQuery = isNaN(groupId) ? { _id: groupId } : { legacyId: Number(groupId) }
  const group = await UserGroup.findOne(byIdQuery)
  if (group) {
    await UserGroup.deleteOne({ legacyId: group.legacyId })
    await UserGroupMember.deleteMany({ groupId: { $in: [group._id, String(group._id)] } })
  }
}

module.exports = {
  createGroup,
  listGroups,
  listGroupMembers,
  deleteGroup,
  sanitizeUserGroupRow
}
