const mongoose = require('mongoose')
const { createCrudRouter } = require('./crudRouteFactory')
const taskController = require('../controllers/taskController')
const workController = require('../controllers/workManagementController')
const { getMongoModel } = require('../models/mongoModels')

const TaskComment = getMongoModel('task_comments')
const Task = getMongoModel('tasks')
const Lead = getMongoModel('leads')
const Deal = getMongoModel('deals')
const Quotation = getMongoModel('quotations')
const Project = getMongoModel('projects')

const extraRoutes = (router) => {
  // Lightweight, fast CRM workflow linking lookup endpoint
  router.get('/crm-workflow-links', async (req, res, next) => {
    try {
      const [leads, deals, quotations] = await Promise.all([
        Lead.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, accountNumber: 1, accountNo: 1, accountName: 1, customerName: 1, 'formData.accountName': 1, 'formData.accountNumber': 1 })
          .sort({ legacyId: -1 })
          .lean(),
        Deal.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, dealNumber: 1, title: 1, dealName: 1, name: 1, accountId: 1, customerId: 1, 'data.dealNumber': 1, 'data.accountId': 1, 'data.dealName': 1, 'data.title': 1 })
          .sort({ legacyId: -1 })
          .lean(),
        Quotation.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, quotationNumber: 1, quoteNumber: 1, title: 1, dealId: 1, accountId: 1, customerName: 1, 'data.dealId': 1, 'data.accountId': 1, 'data.quotationNumber': 1, 'data.quoteNumber': 1, 'data.title': 1 })
          .sort({ legacyId: -1 })
          .lean(),
      ])

      const formattedLeads = leads.map((l) => {
        const id = l.legacyId || l._id
        const num = l.accountNumber || l.accountNo || l.formData?.accountNumber || l.formData?.accountNo || String(id)
        const name = l.accountName || l.customerName || l.formData?.accountName || 'Untitled Account'
        return { id: String(id), accountNumber: String(num), accountName: name }
      })

      const formattedDeals = deals.map((d) => {
        const id = d.legacyId || d._id
        const num = d.dealNumber || d.data?.dealNumber || `DL${id}`
        const name = d.title || d.dealName || d.name || d.data?.dealName || d.data?.title || 'Untitled Deal'
        const accId = d.accountId || d.data?.accountId || null
        return { id: String(id), dealNumber: String(num), dealName: name, accountId: accId ? String(accId) : null }
      })

      const formattedQuotations = quotations.map((q) => {
        const id = q.legacyId || q._id
        const num = q.quotationNumber || q.quoteNumber || q.data?.quotationNumber || q.data?.quoteNumber || `QT-${id}`
        const title = q.title || q.data?.title || q.customerName || ''
        const dId = q.dealId || q.data?.dealId || null
        const accId = q.accountId || q.data?.accountId || null
        return { id: String(id), quotationNumber: String(num), title, dealId: dId ? String(dId) : null, accountId: accId ? String(accId) : null }
      })

      res.json({
        success: true,
        data: {
          accounts: formattedLeads,
          deals: formattedDeals,
          quotations: formattedQuotations,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // Task Comments API (Jira ticket style MongoDB synchronized comments)
  router.get('/:id/comments', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const comments = await TaskComment.find({
        $or: [{ taskId }, { taskId: Number(taskId) || -1 }],
      })
        .sort({ createdAt: 1 })
        .lean()

      res.json({
        success: true,
        data: comments.map((c) => ({
          id: c.legacyId || c._id,
          taskId: c.taskId,
          projectId: c.projectId,
          comment: c.comment,
          userEmail: c.userEmail,
          userName: c.userName,
          userId: c.userId,
          taskDetails: c.taskDetails,
          leadDetails: c.leadDetails,
          dealDetails: c.dealDetails,
          projectDetails: c.projectDetails,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      })
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/comments', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const { comment, projectId, taskDetails: clientTaskDetails } = req.body || {}
      const trimmed = String(comment || '').trim()
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'Comment text is required.' })
      }
      const actor = req.user || {}
      const userEmail = String(actor.email || actor.username || req.body.userEmail || '').trim().toLowerCase()
      const userName = actor.name || actor.username || req.body.userName || (userEmail ? userEmail.split('@')[0] : 'User')
      const userId = actor.id || actor.legacyId || null

      // Query MongoDB tasks collection for this task
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const taskDoc = await Task.findOne({
        $or: [
          { id: taskId },
          { legacyId: Number(taskId) || -1 },
          ...(isOid ? [{ _id: taskId }] : []),
        ],
      }).lean()

      const mergedTaskDetails = taskDoc || clientTaskDetails || null

      const effectiveProjectId = projectId || mergedTaskDetails?.projectId || mergedTaskDetails?.data?.projectId || null
      const effectiveDealId = mergedTaskDetails?.dealId || mergedTaskDetails?.data?.dealId || null
      const effectiveAccountId = mergedTaskDetails?.accountId || mergedTaskDetails?.data?.accountId || mergedTaskDetails?.leadId || null

      // Concurrently query leads, deals, and projects from MongoDB
      const [leadDoc, dealDoc, projectDoc] = await Promise.all([
        effectiveAccountId ? Lead.findOne({
          $or: [
            { id: String(effectiveAccountId) },
            { legacyId: Number(effectiveAccountId) || -1 },
            { accountNumber: String(effectiveAccountId) },
            { accountNo: String(effectiveAccountId) },
            ...(mongoose.Types.ObjectId.isValid(effectiveAccountId) ? [{ _id: effectiveAccountId }] : []),
          ],
        }).lean() : null,
        effectiveDealId ? Deal.findOne({
          $or: [
            { id: String(effectiveDealId) },
            { legacyId: Number(effectiveDealId) || -1 },
            { dealNumber: String(effectiveDealId) },
            ...(mongoose.Types.ObjectId.isValid(effectiveDealId) ? [{ _id: effectiveDealId }] : []),
          ],
        }).lean() : null,
        effectiveProjectId ? Project.findOne({
          $or: [
            { id: String(effectiveProjectId) },
            { legacyId: Number(effectiveProjectId) || -1 },
            ...(mongoose.Types.ObjectId.isValid(effectiveProjectId) ? [{ _id: effectiveProjectId }] : []),
          ],
        }).lean() : null,
      ])

      const doc = await TaskComment.create({
        taskId,
        projectId: effectiveProjectId,
        comment: trimmed,
        userEmail,
        userName,
        userId,
        taskDetails: mergedTaskDetails || null,
        leadDetails: leadDoc || null,
        dealDetails: dealDoc || null,
        projectDetails: projectDoc || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      res.status(201).json({
        success: true,
        data: {
          id: doc.legacyId || doc._id,
          taskId: doc.taskId,
          projectId: doc.projectId,
          comment: doc.comment,
          userEmail: doc.userEmail,
          userName: doc.userName,
          userId: doc.userId,
          taskDetails: doc.taskDetails,
          leadDetails: doc.leadDetails,
          dealDetails: doc.dealDetails,
          projectDetails: doc.projectDetails,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      })
    } catch (err) {
      next(err)
    }
  })
}

const router = createCrudRouter(taskController, { extraRoutes })

// Enterprise Work & Task Management API Endpoints
router.get('/work/overview', workController.getOverview)
router.get('/work/projects', workController.listProjects)
router.post('/work/projects', workController.createProject)
router.put('/work/projects/:id', workController.updateProject)
router.patch('/work/projects/:id', workController.updateProject)
router.get('/work/workload', workController.getWorkload)
router.get('/work/approvals', workController.listApprovals)
router.post('/work/approvals/:id/decide', workController.decideApproval)
router.get('/work/workflows', workController.listWorkflows)
router.post('/work/workflows', workController.createWorkflow)

module.exports = router

