const accountProjectService = require('../services/accountProjectService')

const searchSources = async (req, res, next) => {
  try {
    const data = await accountProjectService.searchSources(req.user, req.query || {})
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const createExistingSourceProject = async (req, res, next) => {
  try {
    const data = await accountProjectService.createExistingSourceProject(req.user, req.body || {})
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  searchSources,
  createExistingSourceProject,
}
