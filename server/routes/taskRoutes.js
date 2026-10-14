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
const AuditLog = getMongoModel('audit_log')
const TimeEntry = getMongoModel('time_entries')
const TaskTimelog = getMongoModel('tasks_timelog')
const User = getMongoModel('users')
const Attachment = getMongoModel('attachments')
const workManagementService = require('../services/workManagementService')

const extraRoutes = (router) => {
  // Multi-collection Express.js endpoint for tasks created by user (directly or via their leads/deals)
  router.get('/created-by-me', async (req, res, next) => {
    try {
      const actor = req.user || {}
      const actorEmail = String(actor.email || actor.username || '').trim().toLowerCase()
      const actorId = actor.legacyId || actor.id
      const actorName = String(actor.name || '').trim()
      const actorOwnerCode = String(actor.ownerCode || '').trim()

      // Concurrently query leads and deals created by this user from MongoDB
      const [userLeads, userDeals] = await Promise.all([
        Lead.find({
          companyId: actor.companyId || 1,
          frontendDeleted: { $ne: true },
          $or: [
            ...(actorEmail ? [{ createdBy: actorEmail }, { createdByEmail: actorEmail }] : []),
            ...(actorId ? [{ createdBy: actorId }, { createdBy: String(actorId) }] : []),
            ...(actorName ? [{ accountOwner: actorName }] : []),
            ...(actorOwnerCode ? [{ ownerCode: actorOwnerCode }] : []),
          ],
        })
          .select({ _id: 1, legacyId: 1, accountNumber: 1, accountNo: 1 })
          .lean(),

        Deal.find({
          companyId: actor.companyId || 1,
          frontendDeleted: { $ne: true },
          $or: [
            ...(actorEmail ? [{ createdBy: actorEmail }, { createdByEmail: actorEmail }] : []),
            ...(actorId ? [{ createdBy: actorId }, { createdBy: String(actorId) }] : []),
            ...(actorName ? [{ dealOwner: actorName }] : []),
            ...(actorOwnerCode ? [{ ownerCode: actorOwnerCode }] : []),
          ],
        })
          .select({ _id: 1, legacyId: 1, dealNumber: 1 })
          .lean(),
      ])

      const leadIdList = []
      userLeads.forEach((l) => {
        if (l.legacyId) leadIdList.push(String(l.legacyId), l.legacyId)
        if (l.accountNumber) leadIdList.push(String(l.accountNumber))
        if (l.accountNo) leadIdList.push(String(l.accountNo))
        if (l._id) leadIdList.push(String(l._id))
      })

      const dealIdList = []
      userDeals.forEach((d) => {
        if (d.legacyId) dealIdList.push(String(d.legacyId), d.legacyId)
        if (d.dealNumber) dealIdList.push(String(d.dealNumber))
        if (d._id) dealIdList.push(String(d._id))
      })

      // Query MongoDB tasks matching direct creation OR linked lead/deal creation
      const orClauses = [
        ...(actorEmail ? [{ createdBy: actorEmail }, { createdByEmail: actorEmail }] : []),
        ...(actorId ? [{ createdBy: actorId }, { createdBy: String(actorId) }] : []),
        ...(actorName ? [{ createdByName: actorName }] : []),
      ]
      if (leadIdList.length > 0) {
        orClauses.push({ accountId: { $in: leadIdList } }, { leadId: { $in: leadIdList } })
      }
      if (dealIdList.length > 0) {
        orClauses.push({ dealId: { $in: dealIdList } })
      }

      const taskQuery = {
        companyId: actor.companyId || 1,
        frontendDeleted: { $ne: true },
        $or: orClauses.length > 0 ? orClauses : [{ _id: null }],
      }

      const tasks = await Task.find(taskQuery).sort({ updatedAt: -1 }).lean()

      // Resolve creator names from MongoDB users collection for any numeric createdBy IDs (e.g. 16)
      const numericCreatorIds = [
        ...new Set(
          tasks
            .map((t) => t.createdBy)
            .filter((c) => c && (!isNaN(c) || mongoose.Types.ObjectId.isValid(c)))
        ),
      ]

      let userMap = {}
      if (numericCreatorIds.length > 0) {
        const matchedUsers = await User.find({
          $or: [
            { legacyId: { $in: numericCreatorIds.map(Number).filter((n) => !isNaN(n)) } },
            { id: { $in: numericCreatorIds } },
          ],
        })
          .select({ legacyId: 1, id: 1, name: 1, username: 1, email: 1 })
          .lean()

        matchedUsers.forEach((u) => {
          const name = u.name || u.username || u.email
          if (u.legacyId) userMap[String(u.legacyId)] = name
          if (u.id) userMap[String(u.id)] = name
        })
      }

      const enrichedTasks = tasks.map((t) => ({
        ...t,
        id: t.legacyId || t.id || t._id,
        createdByName: t.createdByName || userMap[String(t.createdBy)] || t.createdBy,
      }))

      res.json({ success: true, data: enrichedTasks })
    } catch (err) {
      next(err)
    }
  })

  // Task full details with MongoDB users creator name resolution
  router.get('/:id/details', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const task = await Task.findOne({
        $or: [
          { id: taskId },
          { legacyId: Number(taskId) || -1 },
          ...(isOid ? [{ _id: taskId }] : []),
        ],
      }).lean()

      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' })
      }

      let createdByName = task.createdByName
      if (!createdByName || !isNaN(createdByName)) {
        const creatorId = task.createdBy || createdByName
        if (creatorId) {
          const userDoc = await User.findOne({
            $or: [
              { legacyId: Number(creatorId) || -1 },
              { id: creatorId },
              ...(mongoose.Types.ObjectId.isValid(creatorId) ? [{ _id: creatorId }] : []),
            ],
          }).lean()
          if (userDoc) {
            createdByName = userDoc.name || userDoc.username || userDoc.email
          }
        }
      }

      res.json({
        success: true,
        data: {
          ...task,
          id: task.legacyId || task.id || task._id,
          createdByName: createdByName || task.createdBy || 'Admin',
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // Lightweight, fast CRM workflow linking lookup endpoint with complete cross-referencing
  router.get('/crm-workflow-links', async (req, res, next) => {
    try {
      const [leads, deals, quotations, taskLinks] = await Promise.all([
        Lead.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, accountNumber: 1, accountNo: 1, accountName: 1, customerName: 1, 'formData.accountName': 1, 'formData.accountNumber': 1 })
          .sort({ legacyId: -1 })
          .lean(),
        Deal.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, dealNumber: 1, title: 1, dealName: 1, name: 1, accountId: 1, customerId: 1, accountName: 1, customerName: 1, 'data.dealNumber': 1, 'data.accountId': 1, 'data.accountName': 1, 'data.dealName': 1, 'data.title': 1 })
          .sort({ legacyId: -1 })
          .lean(),
        Quotation.find({ frontendDeleted: { $ne: true } })
          .select({ legacyId: 1, quotationNumber: 1, quoteNumber: 1, title: 1, dealId: 1, accountId: 1, dealName: 1, accountName: 1, customerName: 1, 'data.dealId': 1, 'data.accountId': 1, 'data.dealName': 1, 'data.accountName': 1, 'data.quotationNumber': 1, 'data.quoteNumber': 1, 'data.title': 1 })
          .sort({ legacyId: -1 })
          .lean(),
        Task.find({
          $or: [
            { dealId: { $exists: true, $ne: null } },
            { projectId: { $exists: true, $ne: null } },
            { quotationNumber: { $exists: true, $ne: null } },
          ],
        })
          .select({ projectId: 1, projectName: 1, dealId: 1, dealName: 1, accountId: 1, accountName: 1, quotationId: 1, quotationNumber: 1 })
          .sort({ legacyId: -1 })
          .limit(100)
          .lean()
          .catch(() => []),
      ])

      const formattedLeads = leads.map((l) => {
        const id = l.legacyId || l._id
        const num = l.accountNumber || l.accountNo || l.formData?.accountNumber || l.formData?.accountNo || String(id)
        const name = l.accountName || l.customerName || l.formData?.accountName || 'Untitled Account'
        return { id: String(id), accountNumber: String(num), accountName: name }
      })

      const leadByNumOrId = new Map()
      formattedLeads.forEach((l) => {
        leadByNumOrId.set(String(l.id), l)
        leadByNumOrId.set(String(l.accountNumber).toLowerCase(), l)
      })

      const formattedDeals = deals.map((d) => {
        const id = d.legacyId || d._id
        const num = d.dealNumber || d.data?.dealNumber || `DL${id}`
        const name = d.title || d.dealName || d.name || d.data?.dealName || d.data?.title || 'Untitled Deal'
        const accId = d.accountId || d.data?.accountId || null
        const accName = d.accountName || d.customerName || d.data?.accountName || (accId ? leadByNumOrId.get(String(accId))?.accountName : null) || ''
        return {
          id: String(id),
          dealNumber: String(num),
          dealName: name,
          accountId: accId ? String(accId) : null,
          accountName: accName || null,
        }
      })

      const dealByNumOrId = new Map()
      formattedDeals.forEach((d) => {
        dealByNumOrId.set(String(d.id), d)
        dealByNumOrId.set(String(d.dealNumber).toLowerCase(), d)
      })

      const formattedQuotations = quotations.map((q) => {
        const id = q.legacyId || q._id
        const num = q.quotationNumber || q.quoteNumber || q.data?.quotationNumber || q.data?.quoteNumber || `QT-${id}`
        const title = q.title || q.data?.title || q.customerName || ''
        const dId = q.dealId || q.data?.dealId || null
        let accId = q.accountId || q.data?.accountId || null
        let matchedDeal = dId ? dealByNumOrId.get(String(dId).toLowerCase()) || dealByNumOrId.get(String(dId)) : null
        if (!accId && matchedDeal?.accountId) {
          accId = matchedDeal.accountId
        }
        const accName = q.accountName || q.data?.accountName || (accId ? leadByNumOrId.get(String(accId))?.accountName : null) || matchedDeal?.accountName || ''
        return {
          id: String(id),
          quotationNumber: String(num),
          title,
          dealId: dId ? String(dId) : null,
          dealName: matchedDeal?.dealName || q.dealName || q.data?.dealName || null,
          accountId: accId ? String(accId) : null,
          accountName: accName || null,
        }
      })

      const cleanTaskLinks = (taskLinks || []).map((tl) => ({
        projectId: tl.projectId ? String(tl.projectId) : null,
        projectName: tl.projectName || null,
        dealId: tl.dealId ? String(tl.dealId) : null,
        dealName: tl.dealName || null,
        accountId: tl.accountId ? String(tl.accountId) : null,
        accountName: tl.accountName || null,
        quotationId: tl.quotationId ? String(tl.quotationId) : null,
        quotationNumber: tl.quotationNumber || null,
      }))

      res.json({
        success: true,
        data: {
          accounts: formattedLeads,
          deals: formattedDeals,
          quotations: formattedQuotations,
          taskLinks: cleanTaskLinks,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // Task Comments API (MongoDB task_comments collection - zero companyId dependency)
  router.get('/:id/comments', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const numId = Number(taskId) || -1
      const isOid = mongoose.Types.ObjectId.isValid(taskId)

      const taskDoc = await Task.findOne({
        $or: [
          { id: taskId },
          { legacyId: numId },
          ...(isOid ? [{ _id: new mongoose.Types.ObjectId(taskId) }, { _id: taskId }] : []),
        ],
      }).lean().catch(() => null)

      const idQueries = [{ taskId }, { taskId: numId }]
      if (taskDoc) {
        idQueries.push({ taskId: taskDoc._id }, { taskId: String(taskDoc._id) })
        if (taskDoc.legacyId) idQueries.push({ taskId: taskDoc.legacyId }, { taskLegacyId: taskDoc.legacyId })
      }
      if (isOid) {
        idQueries.push({ taskId: new mongoose.Types.ObjectId(taskId) })
      }

      const comments = await TaskComment.find({
        $or: idQueries,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: 1 })
        .lean()

      res.json({
        success: true,
        data: comments.map((c) => ({
          id: c.legacyId || c._id,
          _id: c._id,
          taskId: c.taskId,
          taskLegacyId: c.taskLegacyId,
          comment: c.comment,
          userEmail: c.userEmail,
          userName: c.userName,
          userId: c.userId,
          parentCommentId: c.parentCommentId || null,
          isEdited: Boolean(c.isEdited),
          editedAt: c.editedAt || null,
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
      const { comment, parentCommentId } = req.body || {}
      const trimmed = String(comment || '').trim()
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'Comment text is required.' })
      }

      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const taskDoc = await Task.findOne({
        $or: [
          { id: taskId },
          { legacyId: Number(taskId) || -1 },
          ...(isOid ? [{ _id: new mongoose.Types.ObjectId(taskId) }, { _id: taskId }] : []),
        ],
      }).lean()

      if (!taskDoc) {
        return res.status(404).json({ success: false, message: 'Task not found.' })
      }

      const actor = req.user || {}
      const userEmail = String(actor.email || actor.username || req.body.userEmail || '').trim().toLowerCase()
      let userName = actor.name || actor.username || req.body.userName || (userEmail ? userEmail.split('@')[0] : 'User')
      const userId = actor.id || actor.legacyId || null

      if (userId || userEmail) {
        const commenterDoc = await User.findOne({
          $or: [
            ...(userId ? [{ id: userId }, { legacyId: Number(userId) || -1 }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        }).lean().catch(() => null)
        if (commenterDoc) {
          userName = commenterDoc.name || commenterDoc.username || commenterDoc.email || userName
        }
      }

      const doc = await TaskComment.create({
        taskId: taskDoc._id,
        taskLegacyId: taskDoc.legacyId || null,
        comment: trimmed,
        userEmail,
        userName,
        userId,
        parentCommentId: parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId) ? new mongoose.Types.ObjectId(parentCommentId) : null,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Log in AuditLog so it appears in task activity timeline
      try {
        const { getNextLegacyId } = require('../models/mongoModels')
        await AuditLog.create({
          legacyId: await getNextLegacyId('audit_log'),
          entityType: 'task',
          entityId: String(taskDoc._id),
          action: 'comment',
          actorId: userId,
          actorName: userName,
          changes: { after: { comment: trimmed } },
          createdAt: new Date(),
        })
      } catch (_) {}

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: {
          id: doc.legacyId || doc._id,
          _id: doc._id,
          taskId: doc.taskId,
          taskLegacyId: doc.taskLegacyId,
          comment: doc.comment,
          userEmail: doc.userEmail,
          userName: doc.userName,
          userId: doc.userId,
          parentCommentId: doc.parentCommentId || null,
          isEdited: false,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id/comments/:commentId', async (req, res, next) => {
    try {
      const { commentId } = req.params
      const { comment } = req.body || {}
      const trimmed = String(comment || '').trim()
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'Comment text is required.' })
      }

      const isOid = mongoose.Types.ObjectId.isValid(commentId)
      const existing = await TaskComment.findOne({
        $or: [
          { id: commentId },
          { legacyId: Number(commentId) || -1 },
          ...(isOid ? [{ _id: new mongoose.Types.ObjectId(commentId) }, { _id: commentId }] : []),
        ],
        isDeleted: { $ne: true },
      })

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Comment not found.' })
      }

      const actor = req.user || {}
      const actorEmail = String(actor.email || actor.username || '').toLowerCase()
      const actorId = String(actor.id || actor.legacyId || '')
      const isOwner = (existing.userEmail && existing.userEmail.toLowerCase() === actorEmail) || (existing.userId && String(existing.userId) === actorId)
      const isAdmin = ['admin', 'super_admin'].includes((actor.role || '').toLowerCase())

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You can only edit your own comments.' })
      }

      existing.comment = trimmed
      existing.isEdited = true
      existing.editedAt = new Date()
      existing.updatedAt = new Date()
      await existing.save()

      res.json({
        success: true,
        message: 'Comment updated successfully',
        data: {
          id: existing.legacyId || existing._id,
          _id: existing._id,
          taskId: existing.taskId,
          taskLegacyId: existing.taskLegacyId,
          comment: existing.comment,
          userEmail: existing.userEmail,
          userName: existing.userName,
          userId: existing.userId,
          isEdited: true,
          editedAt: existing.editedAt,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id/comments/:commentId', async (req, res, next) => {
    try {
      const { commentId } = req.params
      const isOid = mongoose.Types.ObjectId.isValid(commentId)
      const existing = await TaskComment.findOne({
        $or: [
          { id: commentId },
          { legacyId: Number(commentId) || -1 },
          ...(isOid ? [{ _id: new mongoose.Types.ObjectId(commentId) }, { _id: commentId }] : []),
        ],
      })

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Comment not found.' })
      }

      const actor = req.user || {}
      const actorEmail = String(actor.email || actor.username || '').toLowerCase()
      const actorId = String(actor.id || actor.legacyId || '')
      const isOwner = (existing.userEmail && existing.userEmail.toLowerCase() === actorEmail) || (existing.userId && String(existing.userId) === actorId)
      const isAdmin = ['admin', 'super_admin'].includes((actor.role || '').toLowerCase())

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You can only delete your own comments.' })
      }

      existing.isDeleted = true
      existing.deletedAt = new Date()
      existing.deletedBy = actor.id || actor.legacyId || actorEmail
      existing.updatedAt = new Date()
      await existing.save()

      res.json({ success: true, message: 'Comment deleted successfully.' })
    } catch (err) {
      next(err)
    }
  })

  // Atomic Task Update Handler (Supports ObjectId, Dates & AuditLog)
  const handleTaskUpdate = async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const numId = Number(taskId) || -1
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const query = {
        $or: [
          { id: taskId },
          { legacyId: numId },
          ...(isOid ? [{ _id: new mongoose.Types.ObjectId(taskId) }, { _id: taskId }] : []),
        ],
      }

      const taskDoc = await Task.findOne(query)
      if (!taskDoc) {
        return res.status(404).json({ success: false, message: 'Task not found.' })
      }

      const actor = req.user || {}
      const actorName = actor.name || actor.username || actor.email || 'Team Member'
      const beforeStartDate = taskDoc.startDate
      const beforeDueDate = taskDoc.dueDate

      const updateFields = { ...req.body, updatedAt: new Date() }
      delete updateFields._id
      delete updateFields.id

      if (req.body.startDate !== undefined) {
        updateFields.startDate = req.body.startDate ? new Date(req.body.startDate) : null
      }
      if (req.body.dueDate !== undefined) {
        updateFields.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null
      }

      const updated = await Task.findOneAndUpdate(
        query,
        { $set: updateFields },
        { new: true }
      ).lean()

      // Record AuditLog if dates changed
      const startDateChanged = req.body.startDate !== undefined && String(req.body.startDate) !== String(beforeStartDate)
      const dueDateChanged = req.body.dueDate !== undefined && String(req.body.dueDate) !== String(beforeDueDate)

      if (startDateChanged || dueDateChanged) {
        try {
          const { getNextLegacyId } = require('../models/mongoModels')
          await AuditLog.create({
            legacyId: await getNextLegacyId('audit_log'),
            entityType: 'task',
            entityId: String(taskDoc._id),
            action: 'update',
            actorId: actor.id || actor.legacyId,
            actorName,
            changes: {
              before: {
                startDate: beforeStartDate ? new Date(beforeStartDate).toISOString().slice(0, 10) : null,
                dueDate: beforeDueDate ? new Date(beforeDueDate).toISOString().slice(0, 10) : null,
              },
              after: {
                startDate: req.body.startDate ? new Date(req.body.startDate).toISOString().slice(0, 10) : null,
                dueDate: req.body.dueDate ? new Date(req.body.dueDate).toISOString().slice(0, 10) : null,
              },
            },
            createdAt: new Date(),
          })
        } catch (_) {}
      }

      res.json({
        success: true,
        data: {
          id: updated.legacyId || updated._id,
          ...updated,
        },
      })
    } catch (err) {
      next(err)
    }
  }

  router.put('/:id', handleTaskUpdate)
  router.patch('/:id', handleTaskUpdate)

  // Task Activity Timeline API (Synthesized from MongoDB audit_log, task_comments, and attachments)
  router.get('/:id/activity', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const numId = Number(taskId) || -1
      const isOid = mongoose.Types.ObjectId.isValid(taskId)

      // 1. Resolve task document first
      const taskDoc = await Task.findOne({
        $or: [{ id: taskId }, { legacyId: numId }, ...(isOid ? [{ _id: taskId }] : [])],
      }).lean().catch(() => null)

      // 2. Build complete list of ID variants for this task
      const idVariants = Array.from(
        new Set(
          [
            taskId,
            numId > 0 ? numId : null,
            taskDoc?._id,
            taskDoc?._id ? String(taskDoc._id) : null,
            taskDoc?.id,
            taskDoc?.legacyId,
          ].filter(Boolean)
        )
      )

      // 3. Resolve users from MongoDB users collection for author/actor mapping
      const users = await User.find({ status: { $ne: 'inactive' } })
        .select({ id: 1, legacyId: 1, name: 1, email: 1, username: 1, firstName: 1, lastName: 1, _id: 1 })
        .lean()
        .catch(() => [])

      const userMap = new Map()
      users.forEach((u) => {
        const fullName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim() || u.username || (u.email ? u.email.split('@')[0] : 'User')
        if (u.email) userMap.set(String(u.email).toLowerCase(), fullName)
        if (u.id) userMap.set(String(u.id), fullName)
        if (u.legacyId) userMap.set(String(u.legacyId), fullName)
        if (u._id) userMap.set(String(u._id), fullName)
      })

      const resolveActorName = (actorId, actorEmail, fallbackName) => {
        if (actorEmail && userMap.has(String(actorEmail).toLowerCase())) {
          return userMap.get(String(actorEmail).toLowerCase())
        }
        if (actorId && userMap.has(String(actorId))) {
          return userMap.get(String(actorId))
        }
        if (fallbackName && userMap.has(String(fallbackName).toLowerCase())) {
          return userMap.get(String(fallbackName).toLowerCase())
        }
        if (fallbackName && !fallbackName.includes('@') && isNaN(fallbackName)) {
          return fallbackName
        }
        if (actorEmail) {
          const prefix = actorEmail.split('@')[0]
          return prefix.charAt(0).toUpperCase() + prefix.slice(1)
        }
        return 'Team Member'
      }

      // 4. Query audit logs, task comments, and attachments using all ID variants
      const [auditEntries, commentEntries, attachmentEntries] = await Promise.all([
        AuditLog.find({
          entityType: 'task',
          $or: [
            { entityId: { $in: idVariants } },
            { 'changes.after.id': { $in: idVariants } },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
          .catch(() => []),
        TaskComment.find({
          $or: [
            { taskId: { $in: idVariants } },
            { taskLegacyId: { $in: idVariants } },
          ],
          isDeleted: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .catch(() => []),
        Attachment.find({
          entityType: 'task',
          entityId: { $in: idVariants.map(String) },
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .catch(() => []),
      ])

      const activities = []

      // Format audit log events
      auditEntries.forEach((entry) => {
        const actorName = resolveActorName(entry.actorId, entry.actorEmail, entry.actorName)
        const changes = entry.changes || {}
        const before = changes.before || {}
        const after = changes.after || {}

        if (entry.action === 'create') {
          activities.push({
            id: `audit-${entry.legacyId || entry._id}`,
            type: 'created',
            actorName,
            actionText: 'created this task',
            targetText: after.title || taskDoc?.title || 'Task',
            createdAt: entry.createdAt,
          })
        } else if (entry.action === 'update') {
          if (before.status !== after.status && after.status) {
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-status`,
              type: 'status',
              actorName,
              actionText: `updated status from "${before.status || 'open'}" to`,
              pill: after.status,
              pillType: 'status',
              createdAt: entry.createdAt,
            })
          }
          if (before.progress !== after.progress && after.progress !== undefined) {
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-progress`,
              type: 'progress',
              actorName,
              actionText: `updated progress from ${before.progress || 0}% to ${after.progress}%`,
              createdAt: entry.createdAt,
            })
          }
          if (before.startDate !== after.startDate && after.startDate) {
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-startdate`,
              type: 'date',
              actorName,
              actionText: `updated start date to "${after.startDate}"`,
              createdAt: entry.createdAt,
            })
          }
          if (before.dueDate !== after.dueDate && after.dueDate) {
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-duedate`,
              type: 'date',
              actorName,
              actionText: `updated due date to "${after.dueDate}"`,
              createdAt: entry.createdAt,
            })
          }
          const beforeAssignees = (before.assignedToUserEmails || []).join(',')
          const afterAssignees = (after.assignedToUserEmails || []).join(',')
          if (beforeAssignees !== afterAssignees && (after.assignedToUserEmails || []).length > 0) {
            const names = (after.assignedToUserEmails || []).map((em) => userMap.get(em.toLowerCase()) || em.split('@')[0])
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-assignee`,
              type: 'assignee',
              actorName,
              actionText: 'added assignee',
              chips: names,
              createdAt: entry.createdAt,
            })
          }
          if (!activities.some((a) => a.id.startsWith(`audit-${entry.legacyId || entry._id}`))) {
            activities.push({
              id: `audit-${entry.legacyId || entry._id}-general`,
              type: 'update',
              actorName,
              actionText: 'updated task details',
              createdAt: entry.createdAt,
            })
          }
        }
      })

      // Format comment events
      commentEntries.forEach((cm) => {
        const actorName = resolveActorName(cm.userId, cm.userEmail, cm.userName)
        activities.push({
          id: `cm-${cm.legacyId || cm._id}`,
          type: 'comment',
          actorName,
          actionText: 'added a comment',
          snippet: cm.comment,
          createdAt: cm.createdAt,
        })
      })

      // Format attachment events
      attachmentEntries.forEach((att) => {
        const actorName = resolveActorName(att.uploadedBy, null, null)
        activities.push({
          id: `att-${att.id || att._id}`,
          type: 'attachment',
          actorName,
          actionText: 'attached',
          targetText: att.fileName,
          createdAt: att.createdAt,
        })
      })

      // Fallback: If no activity exists yet, display initial creation from task document
      if (activities.length === 0 && taskDoc) {
        const creatorName = resolveActorName(taskDoc.createdBy, taskDoc.createdByEmail, taskDoc.createdByName)
        activities.push({
          id: `initial-create-${taskDoc.id || taskDoc._id}`,
          type: 'created',
          actorName: creatorName,
          actionText: 'created this task',
          targetText: taskDoc.title,
          createdAt: taskDoc.createdAt || new Date(),
        })
      }

      activities.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

      res.json({
        success: true,
        data: activities,
      })
    } catch (err) {
      next(err)
    }
  })

  // Task Time Entries API (Deduplicated with MongoDB TaskTimelog as single source of truth)
  router.get('/:id/time-entries', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const numId = Number(taskId) || -1
      const isOid = mongoose.Types.ObjectId.isValid(taskId)

      const taskDoc = await Task.findOne({
        $or: [{ id: taskId }, { legacyId: numId }, ...(isOid ? [{ _id: taskId }] : [])],
      }).lean().catch(() => null)

      const idVariants = Array.from(
        new Set(
          [
            taskId,
            numId > 0 ? numId : null,
            taskDoc?._id,
            taskDoc?._id ? String(taskDoc._id) : null,
            taskDoc?.id,
            taskDoc?.legacyId,
          ].filter(Boolean)
        )
      )

      const [timelogs, legacyEntries] = await Promise.all([
        TaskTimelog.find({ taskId: { $in: idVariants } })
          .sort({ createdAt: -1, date: -1 })
          .lean()
          .catch(() => []),
        TimeEntry.find({ taskId: { $in: idVariants } })
          .sort({ createdAt: -1, date: -1 })
          .lean()
          .catch(() => []),
      ])

      const seenSignatures = new Set()
      const combined = []

      timelogs.forEach((tl) => {
        const sig = `${tl.date || ''}_${tl.minutes}_${String(tl.description || '').trim()}`
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig)
          combined.push({
            id: tl.legacyId || tl.id || tl._id,
            taskId: tl.taskId,
            userId: tl.userId,
            userEmail: tl.userEmail,
            userName: tl.userName || (tl.userEmail ? tl.userEmail.split('@')[0] : 'User'),
            minutes: Number(tl.minutes || 0),
            description: tl.description || '',
            taskDetails: tl.taskDetails || null,
            date: tl.date || '',
            isBillable: Boolean(tl.isBillable ?? true),
            createdAt: tl.createdAt,
          })
        }
      })

      // Add legacy entries only if not already present from timelogs
      legacyEntries.forEach((e) => {
        const sig = `${e.date || ''}_${e.minutes}_${String(e.description || '').trim()}`
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig)
          combined.push({
            id: e.legacyId || e.id || e._id,
            taskId: e.taskId,
            userEmail: e.userEmail,
            userName: e.userEmail ? e.userEmail.split('@')[0] : 'User',
            minutes: Number(e.minutes || 0),
            description: e.description || '',
            date: e.date || '',
            isBillable: Boolean(e.isBillable ?? true),
            createdAt: e.createdAt,
          })
        }
      })

      res.json({
        success: true,
        data: combined,
      })
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/time-entries', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const numId = Number(taskId) || -1

      const actor = req.user || {}
      const actorEmail = String(actor.email || actor.username || req.body.userEmail || '').trim().toLowerCase()
      const actorId = actor.id || actor.legacyId || null

      const [taskDoc, userDoc] = await Promise.all([
        Task.findOne({
          $or: [{ id: taskId }, { legacyId: numId }, ...(isOid ? [{ _id: taskId }] : [])],
        }).lean().catch(() => null),
        User.findOne({
          $or: [
            ...(actorId ? [{ id: actorId }, { legacyId: Number(actorId) || -1 }] : []),
            ...(actorEmail ? [{ email: actorEmail }] : []),
          ],
        }).lean().catch(() => null),
      ])

      const resolvedUserName = userDoc?.name || userDoc?.username || actor.name || actor.username || (actorEmail ? actorEmail.split('@')[0] : 'User')
      const minutes = Number(req.body.minutes || 0)
      const description = String(req.body.description || req.body.work || '').trim()
      const date = req.body.date || new Date().toISOString().slice(0, 10)
      const isBillable = Boolean(req.body.isBillable ?? true)

      const taskDetails = taskDoc ? {
        id: taskDoc.id || taskDoc.legacyId || taskDoc._id,
        title: taskDoc.title,
        status: taskDoc.status,
        priority: taskDoc.priority,
        projectId: taskDoc.projectId,
        dealId: taskDoc.dealId,
        accountId: taskDoc.accountId,
      } : { id: taskId }

      const logDoc = await TaskTimelog.create({
        taskId,
        userId: actorId || userDoc?.id || null,
        userName: resolvedUserName,
        userEmail: actorEmail,
        minutes,
        description,
        taskDetails,
        date,
        isBillable,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Update actualMinutes on the task atomically in MongoDB without creating duplicate time entry
      if (taskDoc) {
        await Task.updateOne(
          { _id: taskDoc._id },
          { $inc: { actualMinutes: minutes } }
        ).catch(() => null)
      }

      res.status(201).json({
        success: true,
        data: {
          id: logDoc.legacyId || logDoc._id,
          taskId: logDoc.taskId,
          userId: logDoc.userId,
          userName: logDoc.userName,
          userEmail: logDoc.userEmail,
          minutes: logDoc.minutes,
          description: logDoc.description,
          taskDetails: logDoc.taskDetails,
          date: logDoc.date,
          isBillable: logDoc.isBillable,
          createdAt: logDoc.createdAt,
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // Task Read Receipts API ("Read by: (5/8) ▾" popover)
  router.get('/:id/readers', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      const taskDoc = await Task.findOne({
        $or: [{ id: taskId }, { legacyId: Number(taskId) || -1 }, ...(isOid ? [{ _id: taskId }] : [])],
      }).select({ readBy: 1, companyId: 1 }).lean()

      const readers = Array.isArray(taskDoc?.readBy) ? taskDoc.readBy : []
      const totalUsers = await User.countDocuments({ status: { $ne: 'inactive' } }).catch(() => 8)
      res.json({
        success: true,
        data: {
          readers,
          readCount: readers.length,
          totalCount: Math.max(readers.length, totalUsers || 8),
        },
      })
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/read', async (req, res, next) => {
    try {
      const taskId = String(req.params.id)
      const actor = req.user || {}
      const actorEmail = String(actor.email || actor.username || '').toLowerCase()
      const actorName = actor.name || actor.username || actorEmail.split('@')[0] || 'User'
      const isOid = mongoose.Types.ObjectId.isValid(taskId)
      if (!actorEmail) {
        return res.json({ success: true })
      }

      const readerEntry = {
        userId: actor.id || actor.legacyId || null,
        userEmail: actorEmail,
        userName: actorName,
        readAt: new Date(),
      }

      const query = {
        $or: [{ id: taskId }, { legacyId: Number(taskId) || -1 }, ...(isOid ? [{ _id: taskId }] : [])],
      }

      await Task.updateOne(query, { $pull: { readBy: { userEmail: actorEmail } } })
      await Task.updateOne(query, { $push: { readBy: readerEntry } })

      res.json({ success: true, data: readerEntry })
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
router.get('/work/workload/user-analytics', workController.getUserWorkloadAnalytics)
router.post('/work/workload/reassign', workController.reassignTask)
router.put('/work/workload/settings/:userId', workController.updateWorkloadSettings)
router.patch('/work/workload/settings/:userId', workController.updateWorkloadSettings)
router.get('/work/approvals', workController.listApprovals)
router.post('/work/approvals/:id/decide', workController.decideApproval)
router.get('/work/workflows', workController.listWorkflows)
router.post('/work/workflows', workController.createWorkflow)

module.exports = router

