const leadService = require('../services/leadService')

const listLeads = async (req, res, next) => {
  try {
    const leads = await leadService.listLeads(req.user, req.query || {})
    res.json({
      success: true,
      data: leads,
    })
  } catch (error) {
    next(error)
  }
}

const getLeadById = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.user, req.params.id)
    res.json({
      success: true,
      data: lead,
    })
  } catch (error) {
    next(error)
  }
}

const createLead = async (req, res, next) => {
  try {
    const lead = await leadService.createLead(req.user, req.body || {})
    res.status(201).json({
      success: true,
      data: lead,
    })
  } catch (error) {
    next(error)
  }
}

const updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.user, req.params.id, req.body || {})
    res.json({
      success: true,
      data: lead,
    })
  } catch (error) {
    next(error)
  }
}

const deleteLead = async (req, res, next) => {
  try {
    const removed = await leadService.deleteLead(req.user, req.params.id)
    res.json({
      success: true,
      data: removed,
    })
  } catch (error) {
    next(error)
  }
}

const convertLeadToDeal = async (req, res, next) => {
  try {
    const result = await leadService.convertLeadToDeal(req.user, req.params.id)
    res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

const bulkAddRemark = async (req, res, next) => {
  try {
    const result = await leadService.bulkAddRemark(req.user, req.body || {})
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

const bulkReassign = async (req, res, next) => {
  try {
    const result = await leadService.bulkReassign(req.user, req.body || {})
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToDeal,
  bulkAddRemark,
  bulkReassign,
}
