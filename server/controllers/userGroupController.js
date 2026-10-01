const userGroupService = require('../services/userGroupService')

const createGroup = async (req, res, next) => {
  try {
    const creatorUser = req.user
    const groupData = req.body || {}
    
    // Inject companyId from token if it exists (for safety)
    if (creatorUser.companyId && !groupData.companyId) {
      groupData.companyId = creatorUser.companyId
    }

    const createdGroup = await userGroupService.createGroup(groupData, creatorUser)

    res.status(201).json({
      success: true,
      message: 'User group created successfully',
      data: createdGroup,
    })
  } catch (error) {
    next(error)
  }
}

const listGroups = async (req, res, next) => {
  try {
    const role = String(req.user?.actualRole || req.user?.role || '').toLowerCase()
    const isAdmin = ['admin', 'owner', 'super_admin'].includes(role)
    const companyId = isAdmin ? null : (req.user.companyId || null)
    const groups = await userGroupService.listGroups(companyId)

    res.json({
      success: true,
      data: groups,
    })
  } catch (error) {
    next(error)
  }
}

const listGroupMembers = async (req, res, next) => {
  try {
    const role = String(req.user?.actualRole || req.user?.role || '').toLowerCase()
    const isAdmin = ['admin', 'owner', 'super_admin'].includes(role)
    const companyId = isAdmin ? null : (req.user.companyId || null)
    const members = await userGroupService.listGroupMembers(req.params.id, companyId)

    res.json({
      success: true,
      data: members,
    })
  } catch (error) {
    next(error)
  }
}

const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params
    await userGroupService.deleteGroup(id)
    res.json({
      success: true,
      message: 'User group deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createGroup,
  listGroups,
  listGroupMembers,
  deleteGroup
}
