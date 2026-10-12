const mongoose = require('mongoose')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')

const User = getMongoModel('users')
const Task = getMongoModel('tasks')
const WorkProject = getMongoModel('projects')
const TimeEntry = getMongoModel('time_entries')
const WorkWorkflow = getMongoModel('work_workflows')
const WorkApproval = getMongoModel('work_approvals')

const getUserEmail = (actor) => String(actor?.email || actor?.username || '').trim().toLowerCase()
const isPrivileged = (actor) => ['admin', 'super_admin', 'manager'].includes(actor?.role)

const normalizeDateString = (dateVal) => {
  if (!dateVal) return null
  const d = new Date(dateVal)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * 1. Overview & Drill-down Metrics
 */
const getOverviewData = async (actor) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const isAdmin = isPrivileged(actor)

  // Fetch all active company users for collaboration & metrics
  const users = await User.find(
    { companyId: companyId, status: { $ne: 'inactive' } },
    { id: 1, legacyId: 1, name: 1, email: 1, username: 1, role: 1, ownerCode: 1, department: 1 }
  ).lean()

  const userMap = new Map()
  users.forEach((u) => {
    const email = String(u.email || '').trim().toLowerCase()
    if (email) {
      userMap.set(email, {
        id: u.legacyId || u.id,
        name: u.name || u.username || email,
        email,
        role: u.role || 'user',
        ownerCode: u.ownerCode || null,
        department: u.department || 'Operations',
      })
    }
  })

  // Query Tasks
  const taskQuery = { companyId: companyId, frontendDeleted: { $ne: true } }
  if (!isAdmin) {
    taskQuery.$or = [
      { assignedTo: actorEmail },
      { createdBy: actorEmail },
      { followers: actorEmail },
    ]
  }

  const tasks = await Task.find(taskQuery).sort({ updatedAt: -1 }).lean()
  const now = new Date()

  // Calculate Organization Level Metrics (Level 1)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => ['completed', 'closed'].includes(String(t.status || '').toLowerCase())).length
  const inProgressTasks = tasks.filter((t) => ['in_progress', 'open'].includes(String(t.status || '').toLowerCase())).length
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || ['completed', 'closed'].includes(String(t.status || '').toLowerCase())) return false
    return new Date(t.dueDate) < now
  }).length
  const slaBreached = tasks.filter((t) => String(t.slaStatus || '').toLowerCase() === 'breached').length

  // Query Projects
  const projectQuery = { companyId: companyId, frontendDeleted: { $ne: true } }
  if (!isAdmin) {
    projectQuery.$or = [
      { projectManagerEmail: actorEmail },
      { teamMemberEmails: actorEmail },
    ]
  }
  const projects = await WorkProject.find(projectQuery).sort({ updatedAt: -1 }).lean()

  // Time entries (Removed)
  const totalMinutesTracked = 0

  // Approvals count
  const approvalQuery = { companyId: companyId, status: 'pending' }
  if (!isAdmin) {
    approvalQuery.approverEmail = actorEmail
  }
  const pendingApprovalsCount = await WorkApproval.countDocuments(approvalQuery)

  // User-Wise Performance Summary Table (Level 2 Drill-down)
  const userPerformanceSummary = users.map((u) => {
    const email = String(u.email || '').trim().toLowerCase()
    const userTasks = tasks.filter((t) => String(t.assignedTo || '').toLowerCase() === email)
    const userCompleted = userTasks.filter((t) => ['completed', 'closed'].includes(String(t.status || '').toLowerCase())).length
    const userOverdue = userTasks.filter((t) => {
      if (!t.dueDate || ['completed', 'closed'].includes(String(t.status || '').toLowerCase())) return false
      return new Date(t.dueDate) < now
    }).length
    const userEstimatedHours = userTasks
      .filter((t) => !['completed', 'closed'].includes(String(t.status || '').toLowerCase()))
      .reduce((sum, t) => sum + ((Number(t.estimatedMinutes) || 120) / 60), 0)
    const weeklyCapacityHours = 40
    const workloadPercent = Math.min(Math.round((userEstimatedHours / weeklyCapacityHours) * 100), 200)

    const userProjectsCount = projects.filter((p) => {
      const pmEmail = String(p.projectManagerEmail || '').toLowerCase()
      const members = (p.teamMemberEmails || []).map((m) => String(m).toLowerCase())
      return pmEmail === email || members.includes(email)
    }).length

    return {
      userId: u.legacyId || u.id,
      name: u.name || u.username || email,
      email,
      role: u.role || 'user',
      department: u.department || 'Sales',
      ownerCode: u.ownerCode || null,
      activeTasks: userTasks.length - userCompleted,
      completedTasks: userCompleted,
      overdueTasks: userOverdue,
      workloadPercent,
      estimatedHours: Math.round(userEstimatedHours),
      projectsCount: userProjectsCount,
      slaComplianceRate: userTasks.length > 0 ? Math.round(((userTasks.length - userOverdue) / userTasks.length) * 100) : 100,
    }
  })

  // Project-Wise Summary Table (Level 3 Drill-down)
  const projectSummary = projects.map((p) => {
    const pm = userMap.get(String(p.projectManagerEmail || '').toLowerCase())
    return {
      id: p.legacyId || p.id || p._id,
      projectCode: p.projectCode || `PRJ-${p.legacyId || 101}`,
      name: p.name || 'Untitled Project',
      projectManager: pm ? pm.name : (p.projectManagerEmail || 'Unassigned'),
      projectManagerEmail: p.projectManagerEmail || '',
      status: p.status || 'active',
      progress: p.progress || 0,
      milestonesCount: Array.isArray(p.milestones) ? p.milestones.length : 0,
      milestonesCompleted: Array.isArray(p.milestones) ? p.milestones.filter((m) => m.status === 'completed').length : 0,
      dueDate: p.endDate || p.targetDate || null,
      openIssues: p.openIssuesCount || 0,
      slaComplianceRate: p.slaComplianceRate || 98,
      dealId: p.dealId || null,
      accountId: p.accountId || null,
    }
  })

  // Personal execution agenda for normal user
  const personalTodayTasks = tasks
    .filter((t) => {
      const isAssigned = String(t.assignedTo || '').toLowerCase() === actorEmail
      if (!isAssigned) return false
      return !['completed', 'closed'].includes(String(t.status || '').toLowerCase())
    })
    .slice(0, 15)

  return {
    kpis: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      slaBreached,
      activeProjects: projects.filter((p) => p.status !== 'completed').length,
      trackedHours: Math.round(totalMinutesTracked / 60),
      pendingApprovals: pendingApprovalsCount,
      teamWorkloadAverage: userPerformanceSummary.length > 0
        ? Math.round(userPerformanceSummary.reduce((acc, u) => acc + u.workloadPercent, 0) / userPerformanceSummary.length)
        : 0,
    },
    userPerformanceSummary,
    projectSummary,
    personalTodayTasks,
    teamMembers: Array.from(userMap.values()),
  }
}

/**
 * 2. Projects Portfolio
 */
const getProjects = async (actor) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const isAdmin = isPrivileged(actor)

  const filter = { companyId: companyId, frontendDeleted: { $ne: true } }
  if (!isAdmin) {
    filter.$or = [
      { projectManagerEmail: actorEmail },
      { teamMemberEmails: actorEmail },
      { createdByEmail: actorEmail },
      { createdBy: actorEmail },
    ]
  }

  const projects = await WorkProject.find(filter).sort({ updatedAt: -1 }).lean()
  return projects.map((p) => ({
    id: p.legacyId || p.id || p._id,
    projectCode: p.projectCode || `PRJ-${p.legacyId || '001'}`,
    name: p.name,
    description: p.description || '',
    projectManagerEmail: p.projectManagerEmail || '',
    teamMemberEmails: Array.isArray(p.teamMemberEmails) ? p.teamMemberEmails : [],
    status: p.status || 'active',
    progress: p.progress || 0,
    startDate: p.startDate || null,
    endDate: p.endDate || null,
    estimatedHours: p.estimatedHours || 0,
    actualHours: p.actualHours || 0,
    milestones: Array.isArray(p.milestones) ? p.milestones : [],
    dealId: p.dealId || null,
    accountId: p.accountId || null,
    quotationId: p.quotationId || null,
    createdByEmail: p.createdByEmail || p.createdBy || '',
    createdByName: p.createdByName || '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
}

const createProject = async (actor, payload) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  let createdByName = actor?.name || ''
  if (!createdByName && actorEmail) {
    try {
      const userDoc = await User.findOne({ $or: [{ email: actorEmail }, { legacyId: Number(actor?.id) || -1 }] }).lean()
      if (userDoc) createdByName = userDoc.name || userDoc.username || actorEmail
    } catch (e) {}
  }
  if (!createdByName) createdByName = actorEmail.split('@')[0] || 'User'

  const legacyId = await getNextLegacyId('projects')

  const projectDoc = {
    legacyId,
    companyId,
    projectCode: payload.projectCode || `PRJ-${String(legacyId).padStart(4, '0')}`,
    name: payload.name || payload.projectName || 'New Project',
    description: payload.description || '',
    projectManagerEmail: payload.projectManagerEmail ? String(payload.projectManagerEmail).trim().toLowerCase() : actorEmail,
    teamMemberEmails: Array.isArray(payload.teamMemberEmails)
      ? payload.teamMemberEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : [actorEmail],
    status: payload.status || 'active',
    progress: payload.progress || 0,
    startDate: normalizeDateString(payload.startDate) || new Date().toISOString(),
    endDate: normalizeDateString(payload.endDate),
    estimatedHours: Number(payload.estimatedHours || 120),
    actualHours: 0,
    milestones: Array.isArray(payload.milestones) ? payload.milestones : [
      { id: 'ms-1', name: 'Planning & Specifications', order: 1, status: 'in_progress', progress: 50 },
      { id: 'ms-2', name: 'Engineering & Design', order: 2, status: 'pending', progress: 0 },
      { id: 'ms-3', name: 'Procurement & Fabrication', order: 3, status: 'pending', progress: 0 },
      { id: 'ms-4', name: 'Testing & Commissioning', order: 4, status: 'pending', progress: 0 },
    ],
    dealId: payload.dealId ? String(payload.dealId) : null,
    accountId: payload.accountId ? String(payload.accountId) : null,
    quotationId: payload.quotationId ? String(payload.quotationId) : null,
    customerId: payload.customerId ? String(payload.customerId) : null,
    createdBy: actorEmail,
    createdByEmail: actorEmail,
    createdByName,
  }

  const created = await WorkProject.create(projectDoc)
  return { id: created.legacyId || created._id, ...created.toObject() }
}

const updateProject = async (actor, projectId, payload) => {
  const companyId = actor?.companyId || 1
  const orConditions = [{ legacyId: Number(projectId) || -1 }, { id: projectId }]
  if (mongoose.isValidObjectId(projectId)) {
    orConditions.push({ _id: projectId })
  }
  const query = { companyId, $or: orConditions }

  const updateFields = { ...payload, updatedAt: new Date() }
  delete updateFields._id
  delete updateFields.legacyId

  if (Array.isArray(updateFields.teamMemberEmails)) {
    updateFields.teamMemberEmails = updateFields.teamMemberEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
  }

  if (Array.isArray(updateFields.milestones) && updateFields.milestones.length > 0) {
    const completedMs = updateFields.milestones.filter((m) => m.status === 'completed').length
    updateFields.progress = Math.round((completedMs / updateFields.milestones.length) * 100)
  }

  const updated = await WorkProject.findOneAndUpdate(query, { $set: updateFields }, { new: true }).lean()
  return updated
}

/**
 * 3. Time Tracking & Timers
 */
const getTimeEntries = async (actor, queryParams = {}) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const isAdmin = isPrivileged(actor)

  const filter = { companyId }
  if (!isAdmin || queryParams.myOnly === 'true') {
    filter.userEmail = actorEmail
  } else if (queryParams.userEmail) {
    filter.userEmail = String(queryParams.userEmail).trim().toLowerCase()
  }

  const entries = await TimeEntry.find(filter).sort({ date: -1, createdAt: -1 }).limit(200).lean()
  return entries.map((e) => ({
    id: e.legacyId || e.id || e._id,
    userEmail: e.userEmail,
    taskId: e.taskId || null,
    taskTitle: e.taskTitle || 'General Task',
    projectId: e.projectId || null,
    projectName: e.projectName || 'General',
    minutes: Number(e.minutes || 0),
    description: e.description || '',
    date: e.date || new Date().toISOString().slice(0, 10),
    isBillable: Boolean(e.isBillable ?? true),
    status: e.status || 'logged', // logged, submitted, approved
    createdAt: e.createdAt,
  }))
}

const logTimeEntry = async (actor, payload) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const legacyId = await getNextLegacyId('time_entries')

  const minutes = Number(payload.minutes || 0)
  const entryDoc = {
    legacyId,
    companyId,
    userEmail: actorEmail,
    taskId: payload.taskId ? String(payload.taskId) : null,
    taskTitle: payload.taskTitle || 'Task',
    projectId: payload.projectId ? String(payload.projectId) : null,
    projectName: payload.projectName || 'Project',
    minutes,
    description: payload.description || '',
    date: payload.date || new Date().toISOString().slice(0, 10),
    isBillable: Boolean(payload.isBillable ?? true),
    status: 'logged',
    createdAt: new Date(),
  }

  const created = await TimeEntry.create(entryDoc)

  // Increment actualMinutes on task if task is provided
  if (payload.taskId && minutes > 0) {
    await Task.updateOne(
      { companyId, $or: [{ legacyId: Number(payload.taskId) || -1 }, { _id: payload.taskId }, { id: payload.taskId }] },
      { $inc: { actualMinutes: minutes } }
    )
  }

  return { id: created.legacyId || created._id, ...created.toObject() }
}

/**
 * 4. Workload Capacity Matrix
 */
const getTeamWorkload = async (actor) => {
  const overview = await getOverviewData(actor)
  return {
    members: overview.userPerformanceSummary,
  }
}

/**
 * 5. Approvals Hub
 */
const getApprovals = async (actor) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const isAdmin = isPrivileged(actor)

  const query = { companyId }
  if (!isAdmin) {
    query.$or = [
      { approverEmail: actorEmail },
      { requestedByEmail: actorEmail },
    ]
  }

  const approvals = await WorkApproval.find(query).sort({ createdAt: -1 }).lean()
  return approvals.map((a) => ({
    id: a.legacyId || a.id || a._id,
    type: a.type || 'timesheet', // timesheet, project_milestone, discount, task_completion
    title: a.title,
    description: a.description || '',
    requestedByEmail: a.requestedByEmail,
    approverEmail: a.approverEmail,
    status: a.status || 'pending', // pending, approved, rejected
    metadata: a.metadata || {},
    decisionComments: a.decisionComments || '',
    decidedAt: a.decidedAt || null,
    createdAt: a.createdAt,
  }))
}

const decideApproval = async (actor, approvalId, decision, comments = '') => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)

  const updated = await WorkApproval.findOneAndUpdate(
    {
      companyId,
      $or: [{ legacyId: Number(approvalId) || -1 }, { _id: approvalId }],
    },
    {
      $set: {
        status: decision === 'approved' ? 'approved' : 'rejected',
        decisionComments: comments,
        decidedByEmail: actorEmail,
        decidedAt: new Date(),
      },
    },
    { new: true }
  ).lean()

  return updated
}

/**
 * 6. Workflows (Event-driven rules)
 */
const getWorkflows = async (actor) => {
  const companyId = actor?.companyId || 1
  const workflows = await WorkWorkflow.find({ companyId }).sort({ createdAt: -1 }).lean()

  if (workflows.length === 0) {
    // Seed default baseline workflows
    const defaults = [
      {
        legacyId: 1,
        companyId,
        title: 'Deal Won -> Auto Project Creation',
        triggerEvent: 'deal_won',
        targetAction: 'create_project',
        templateName: 'Standard Turnkey Switchgear Project',
        active: true,
      },
      {
        legacyId: 2,
        companyId,
        title: 'SLA 80% Countdown Alert',
        triggerEvent: 'sla_threshold_80',
        targetAction: 'send_lead_alert',
        active: true,
      },
      {
        legacyId: 3,
        companyId,
        title: 'Quotation Approved -> Generate Delivery Task',
        triggerEvent: 'quotation_approved',
        targetAction: 'create_task',
        active: true,
      },
    ]
    await WorkWorkflow.insertMany(defaults)
    return defaults
  }

  return workflows.map((w) => ({
    id: w.legacyId || w.id || w._id,
    title: w.title,
    triggerEvent: w.triggerEvent,
    targetAction: w.targetAction,
    templateName: w.templateName || '',
    active: Boolean(w.active),
    createdAt: w.createdAt,
  }))
}

const createWorkflow = async (actor, payload) => {
  const companyId = actor?.companyId || 1
  const legacyId = await getNextLegacyId('work_workflows')

  const doc = {
    legacyId,
    companyId,
    title: payload.title || 'Automation Rule',
    triggerEvent: payload.triggerEvent || 'deal_won',
    targetAction: payload.targetAction || 'create_project',
    templateName: payload.templateName || '',
    active: Boolean(payload.active ?? true),
    createdBy: getUserEmail(actor),
  }

  const created = await WorkWorkflow.create(doc)
  return { id: created.legacyId || created._id, ...created.toObject() }
}

module.exports = {
  getOverviewData,
  getProjects,
  createProject,
  updateProject,
  getTimeEntries,
  logTimeEntry,
  getTeamWorkload,
  getApprovals,
  decideApproval,
  getWorkflows,
  createWorkflow,
}
