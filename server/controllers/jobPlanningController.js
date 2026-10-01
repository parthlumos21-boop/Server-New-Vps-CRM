const jobPlanningService = require('../services/jobPlanningService')

const createJobPlanning = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can create job planning records.' })
    }
    const jobPlanning = await jobPlanningService.create(req.body, req.user)
    res.status(201).json(jobPlanning)
  } catch (error) {
    next(error)
  }
}

const listJobPlannings = async (req, res, next) => {
  try {
    const filters = { ...req.query, companyId: req.user.companyId }
    // If not admin, restrict to their department based on the plan
    if (req.user.role !== 'admin' && req.user.departmentId) {
       // Allow seeing jobs they own or jobs for their department
       // In a full RBAC, we'd add complex filtering here
       // filters.departmentId = req.user.departmentId
    }
    const result = await jobPlanningService.list(filters)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

const updateJobPlanning = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can edit job planning records.' })
    }
    const jobPlanning = await jobPlanningService.update(req.params.id, req.body, req.user)
    res.json(jobPlanning)
  } catch (error) {
    next(error)
  }
}

const deleteJobPlanning = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete job planning records.' })
    }
    await jobPlanningService.remove(req.params.id, req.user)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createJobPlanning,
  listJobPlannings,
  updateJobPlanning,
  deleteJobPlanning,
}
