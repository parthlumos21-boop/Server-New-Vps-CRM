const userGroupRepository = require('../repositories/userGroupRepository')
const { AppError } = require('../utils/appError')

const createGroup = async (groupData, creatorUser) => {
  if (!groupData.groupName) {
    throw new AppError('Group name is required.', 400)
  }

  // Ensure createdBy is the actual authenticated user
  const createdGroup = await userGroupRepository.createGroup(groupData, creatorUser)

  return createdGroup
}

const listGroups = async (companyId) => {
  const groups = await userGroupRepository.listGroups(companyId)
  return groups
}

const listGroupMembers = async (groupId, companyId) => {
  return userGroupRepository.listGroupMembers(groupId, companyId)
}

const deleteGroup = async (groupId) => {
  await userGroupRepository.deleteGroup(groupId)
}

module.exports = {
  createGroup,
  listGroups,
  listGroupMembers,
  deleteGroup
}
