const workManagementService = require('../services/workManagementService')

const getOverview = async (req, res, next) => {
  try {
    const data = await workManagementService.getOverviewData(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const listProjects = async (req, res, next) => {
  try {
    const data = await workManagementService.getProjects(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const createProject = async (req, res, next) => {
  try {
    const data = await workManagementService.createProject(req.user, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const updateProject = async (req, res, next) => {
  try {
    const data = await workManagementService.updateProject(req.user, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getWorkload = async (req, res, next) => {
  try {
    const data = await workManagementService.getTeamWorkload(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getUserWorkloadAnalytics = async (req, res, next) => {
  try {
    const targetUserEmail = req.query.userEmail || req.query.email || req.user?.email
    const period = req.query.period || 'month'
    const customStartDate = req.query.startDate || req.query.from
    const customEndDate = req.query.endDate || req.query.to
    const data = await workManagementService.getUserWorkloadAnalytics(
      req.user,
      targetUserEmail,
      period,
      customStartDate,
      customEndDate
    )
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const reassignTask = async (req, res, next) => {
  try {
    const data = await workManagementService.reassignWorkloadTask(req.user, req.body)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const updateWorkloadSettings = async (req, res, next) => {
  try {
    const data = await workManagementService.updateWorkloadSetting(req.user, req.params.userId, req.body)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const listApprovals = async (req, res, next) => {
  try {
    const data = await workManagementService.getApprovals(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const decideApproval = async (req, res, next) => {
  try {
    const data = await workManagementService.decideApproval(
      req.user,
      req.params.id,
      req.body.decision,
      req.body.comments
    )
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const listWorkflows = async (req, res, next) => {
  try {
    const data = await workManagementService.getWorkflows(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const createWorkflow = async (req, res, next) => {
  try {
    const data = await workManagementService.createWorkflow(req.user, req.body)
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getOverview,
  listProjects,
  createProject,
  updateProject,
  getWorkload,
  getUserWorkloadAnalytics,
  reassignTask,
  updateWorkloadSettings,
  listApprovals,
  decideApproval,
  listWorkflows,
  createWorkflow,
}
