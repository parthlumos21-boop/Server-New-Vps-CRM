const projectService = require('../services/projectService')

const listProjects = async (req, res, next) => {
  try {
    const data = await projectService.listProjects(req.user)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const getProjectById = async (req, res, next) => {
  try {
    const data = await projectService.getProjectById(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const createProject = async (req, res, next) => {
  try {
    const data = await projectService.createProject(req.user, req.body || {})
    res.status(201).json({ success: true, data })
  } catch (error) { next(error) }
}

const updateProject = async (req, res, next) => {
  try {
    const data = await projectService.updateProject(req.user, req.params.id, req.body || {})
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const deleteProject = async (req, res, next) => {
  try {
    const data = await projectService.deleteProject(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
}
