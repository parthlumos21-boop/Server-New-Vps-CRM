const mongoose = require('mongoose')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')

const User = getMongoModel('users')
const Task = getMongoModel('tasks')
const WorkProject = getMongoModel('projects')
const Lead = getMongoModel('leads')
const Deal = getMongoModel('deals')
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

  // Concurrently query leads and deals for user workload matrix real counts
  const leadQuery = { companyId: companyId, frontendDeleted: { $ne: true } }
  const dealQuery = { companyId: companyId, frontendDeleted: { $ne: true } }
  const [leads, deals] = await Promise.all([
    Lead.find(leadQuery)
      .select({ _id: 1, legacyId: 1, accountOwner: 1, createdBy: 1, ownerCode: 1 })
      .lean(),
    Deal.find(dealQuery)
      .select({ _id: 1, legacyId: 1, dealOwner: 1, createdBy: 1, ownerCode: 1 })
      .lean(),
  ])

  // Time entries (Removed)
  const totalMinutesTracked = 0

  // Approvals count
  const approvalQuery = { companyId: companyId, status: 'pending' }
  if (!isAdmin) {
    approvalQuery.approverEmail = actorEmail
  }
  const pendingApprovalsCount = await WorkApproval.countDocuments(approvalQuery)

  // User-Wise Performance Summary Table (Level 2 Drill-down with real MongoDB counts)
  const userPerformanceSummary = users.map((u) => {
    const email = String(u.email || '').trim().toLowerCase()
    const userTasks = tasks.filter((t) => {
      const assigned = String(t.assignedTo || '').toLowerCase().trim()
      const assignedList = Array.isArray(t.assignedToUserEmails)
        ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
        : []
      return (
        assigned === email ||
        assignedList.includes(email) ||
        String(t.assignedTo) === String(u.legacyId || u.id)
      )
    })
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
      const pmEmail = String(p.projectManagerEmail || '').toLowerCase().trim()
      const members = (p.teamMemberEmails || []).map((m) => String(m).toLowerCase().trim())
      return pmEmail === email || members.includes(email)
    }).length

    const userLeadsCount = leads.filter((l) => {
      const creator = String(l.createdBy || '').toLowerCase().trim()
      const owner = String(l.accountOwner || '').toLowerCase().trim()
      const uName = String(u.name || '').toLowerCase().trim()
      const uOwnerCode = String(u.ownerCode || '').toLowerCase().trim()
      return (
        creator === email ||
        creator === String(u.legacyId || u.id) ||
        (uName && owner === uName) ||
        (uOwnerCode && String(l.ownerCode || '').toLowerCase().trim() === uOwnerCode)
      )
    }).length

    const userDealsCount = deals.filter((d) => {
      const creator = String(d.createdBy || '').toLowerCase().trim()
      const owner = String(d.dealOwner || '').toLowerCase().trim()
      const uName = String(u.name || '').toLowerCase().trim()
      const uOwnerCode = String(u.ownerCode || '').toLowerCase().trim()
      return (
        creator === email ||
        creator === String(d.legacyId || d.id) ||
        (uName && owner === uName) ||
        (uOwnerCode && String(d.ownerCode || '').toLowerCase().trim() === uOwnerCode)
      )
    }).length

    const activeTasksList = userTasks
      .filter((t) => !['completed', 'closed'].includes(String(t.status || '').toLowerCase()))
      .map((t) => ({
        id: t.legacyId || t.id || t._id,
        _id: t._id,
        title: t.title || 'Untitled Task',
        priority: t.priority || 'medium',
        dueDate: t.dueDate || null,
        status: t.status || 'open',
        estimatedMinutes: Number(t.estimatedMinutes) || 120,
        projectName: t.projectName || (t.projectId ? `Project ${t.projectId}` : null),
        dealName: t.dealName || (t.dealId ? `Deal ${t.dealId}` : null),
        accountName: t.accountName || (t.accountId ? `Account ${t.accountId}` : null),
      }))

    return {
      userId: u.legacyId || u.id,
      name: u.name || u.username || email,
      email,
      role: u.role || 'user',
      department: u.department || 'Operations',
      ownerCode: u.ownerCode || null,
      activeTasks: userTasks.length - userCompleted,
      completedTasks: userCompleted,
      overdueTasks: userOverdue,
      workloadPercent,
      estimatedHours: Math.round(userEstimatedHours),
      projectsCount: userProjectsCount,
      leadsCount: userLeadsCount,
      dealsCount: userDealsCount,
      slaComplianceRate: userTasks.length > 0 ? Math.round(((userTasks.length - userOverdue) / userTasks.length) * 100) : 100,
      tasks: activeTasksList,
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
  const WorkloadSetting = getMongoModel('team_workload_settings')
  const overview = await getOverviewData(actor)
  const settings = await WorkloadSetting.find({}).lean().catch(() => [])
  const settingsMap = new Map()
  settings.forEach((s) => {
    if (s.userId) settingsMap.set(String(s.userId), s)
    if (s.userEmail) settingsMap.set(String(s.userEmail).toLowerCase(), s)
  })

  const enrichedMembers = (overview.userPerformanceSummary || []).map((m) => {
    const s = settingsMap.get(String(m.userId)) || settingsMap.get(String(m.email).toLowerCase())
    const weeklyHours = s?.weeklyCapacityHours || 40
    const workloadPercent = Math.min(Math.round(((m.estimatedHours || 0) / weeklyHours) * 100), 200)
    const isOverloaded = workloadPercent > 100
    const isOptimal = workloadPercent >= 50 && workloadPercent <= 100
    return {
      ...m,
      weeklyCapacityHours: weeklyHours,
      workloadPercent,
      utilizationStatus: isOverloaded ? 'overloaded' : isOptimal ? 'optimal' : 'available',
      skills: s?.skills || [],
      isAvailable: s?.isAvailable !== false,
      notes: s?.notes || '',
    }
  })

  const departments = Array.from(new Set(enrichedMembers.map((m) => m.department).filter(Boolean)))

  return {
    members: enrichedMembers,
    departments,
    totalMembers: enrichedMembers.length,
    overloadedCount: enrichedMembers.filter((m) => m.utilizationStatus === 'overloaded').length,
    optimalCount: enrichedMembers.filter((m) => m.utilizationStatus === 'optimal').length,
    availableCount: enrichedMembers.filter((m) => m.utilizationStatus === 'available').length,
  }
}

const reassignWorkloadTask = async (actor, payload) => {
  const { taskId, targetUserEmail, targetUserId } = payload
  if (!taskId || (!targetUserEmail && !targetUserId)) {
    throw new Error('Task ID and target user are required.')
  }

  const numId = Number(taskId) || -1
  const isOid = mongoose.Types.ObjectId.isValid(taskId)
  const taskQuery = {
    $or: [{ id: String(taskId) }, { legacyId: numId }, ...(isOid ? [{ _id: taskId }] : [])],
  }

  const existingTask = await Task.findOne(taskQuery)
  if (!existingTask) {
    throw new Error('Task not found')
  }

  const previousAssignee = existingTask.assignedTo || existingTask.assignedToUserEmails?.[0] || 'Unassigned'
  const newEmail = String(targetUserEmail || '').toLowerCase().trim()

  existingTask.assignedTo = newEmail || String(targetUserId)
  existingTask.assignedToUserEmails = newEmail ? [newEmail] : []
  existingTask.updatedAt = new Date()
  await existingTask.save()

  // Audit log
  try {
    const { getNextLegacyId } = require('../models/mongoModels')
    await AuditLog.create({
      legacyId: await getNextLegacyId('audit_log'),
      entityType: 'task',
      entityId: String(existingTask._id),
      action: 'reassign',
      actorId: actor?.id || actor?.legacyId,
      actorName: actor?.name || actor?.username || 'Admin',
      changes: {
        before: { assignedTo: previousAssignee },
        after: { assignedTo: newEmail || String(targetUserId) },
      },
      createdAt: new Date(),
    })
  } catch (_) {}

  return { success: true, task: existingTask }
}

const updateWorkloadSetting = async (actor, userId, settingPayload) => {
  const WorkloadSetting = getMongoModel('team_workload_settings')
  const { weeklyCapacityHours, isAvailable, skills, notes, userEmail } = settingPayload

  const updated = await WorkloadSetting.findOneAndUpdate(
    { $or: [{ userId: String(userId) }, { userEmail: String(userEmail || '').toLowerCase() }] },
    {
      $set: {
        userId: String(userId),
        userEmail: String(userEmail || '').toLowerCase(),
        weeklyCapacityHours: Number(weeklyCapacityHours) || 40,
        isAvailable: isAvailable !== false,
        skills: Array.isArray(skills) ? skills : [],
        notes: String(notes || ''),
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  return updated
}

/**
 * 4.1 Detailed User Workload & Performance Analytics
 */
const getUserWorkloadAnalytics = async (actor, targetUserEmail, period = 'month', customStart = null, customEnd = null) => {
  const companyId = actor?.companyId || 1
  const actorEmail = getUserEmail(actor)
  const isAdmin = isPrivileged(actor)

  let emailToInspect = targetUserEmail ? String(targetUserEmail).trim().toLowerCase() : actorEmail
  if (!isAdmin) {
    emailToInspect = actorEmail // non-admins can only view their own analytics
  }

  // Find user in users collection
  const userDoc = await User.findOne({
    $or: [
      { email: { $regex: new RegExp(`^${emailToInspect}$`, 'i') } },
      { username: emailToInspect },
    ],
  }).lean()

  const userName = userDoc?.name || userDoc?.username || emailToInspect
  const userRole = userDoc?.role || 'user'
  const userDept = userDoc?.department || 'Operations'
  const userLegacyId = userDoc?.legacyId || userDoc?.id

  // Date boundaries based on period
  const now = new Date()
  let periodStart = null
  let periodEnd = new Date()

  if (period === 'today') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  } else if (period === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    periodStart = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0)
    periodEnd = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999)
  } else if (period === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    periodStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999)
  } else if (period === 'month') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  } else if (period === 'custom' && customStart) {
    periodStart = new Date(customStart)
    periodStart.setHours(0, 0, 0, 0)
    periodEnd = customEnd ? new Date(customEnd) : new Date(customStart)
    periodEnd.setHours(23, 59, 59, 999)
  }

  const taskQuery = {
    companyId,
    frontendDeleted: { $ne: true },
    $or: [
      { assignedTo: { $regex: new RegExp(`^${emailToInspect}$`, 'i') } },
      { assignedToUserEmails: { $in: [emailToInspect] } },
      ...(userLegacyId ? [{ assignedTo: String(userLegacyId) }] : []),
    ],
  }

  const userTasks = await Task.find(taskQuery).sort({ dueDate: 1, updatedAt: -1 }).lean()

  const isCompletedStatus = (status) => ['completed', 'closed'].includes(String(status || '').toLowerCase().trim())

  // Dynamic filter function for tasks matching date period / custom range
  const isTaskInPeriod = (t) => {
    if (!periodStart) return true

    if (t.dueDate) {
      const d = new Date(t.dueDate)
      if (d >= periodStart && d <= periodEnd) return true
    }
    if (t.completedAt) {
      const c = new Date(t.completedAt)
      if (c >= periodStart && c <= periodEnd) return true
    }
    if (t.createdAt) {
      const cr = new Date(t.createdAt)
      if (cr >= periodStart && cr <= periodEnd) return true
    }
    if (t.updatedAt) {
      const u = new Date(t.updatedAt)
      if (u >= periodStart && u <= periodEnd) return true
    }
    if (!isCompletedStatus(t.status)) {
      const taskCreated = t.createdAt ? new Date(t.createdAt) : null
      if (!taskCreated || taskCreated <= periodEnd) {
        if (!t.dueDate) return true
        const d = new Date(t.dueDate)
        if (d >= periodStart) return true
      }
    }
    return false
  }

  // Filter tasks for period when custom or period is active
  const periodTasks = periodStart ? userTasks.filter(isTaskInPeriod) : userTasks

  // Completed in period
  const completedTasksList = periodTasks.filter((t) => isCompletedStatus(t.status))

  const incompleteTasksList = periodTasks.filter((t) => !isCompletedStatus(t.status))

  const overdueTasksList = incompleteTasksList.filter((t) => {
    if (!t.dueDate) return false
    return new Date(t.dueDate) < now
  })

  const totalTasksCount = periodTasks.length
  const completedTasksCount = completedTasksList.length
  const incompleteTasksCount = incompleteTasksList.length
  const overdueTasksCount = overdueTasksList.length

  // Priority Distribution
  let lowPriorityCount = 0
  let mediumPriorityCount = 0
  let highPriorityCount = 0

  periodTasks.forEach((t) => {
    const prio = String(t.priority || '').toLowerCase().trim()
    if (prio === 'low') lowPriorityCount++
    else if (prio === 'medium') mediumPriorityCount++
    else if (['high', 'urgent', 'critical'].includes(prio)) highPriorityCount++
    else mediumPriorityCount++
  })

  // Performance Analysis
  let beforeTimeCount = 0
  let onTrackCount = 0
  let delayedCount = 0

  periodTasks.forEach((t) => {
    const completed = isCompletedStatus(t.status)
    const dueDate = t.dueDate ? new Date(t.dueDate) : null
    const compDate = t.completedAt ? new Date(t.completedAt) : (t.updatedAt ? new Date(t.updatedAt) : null)

    if (completed) {
      if (!dueDate) {
        onTrackCount++
      } else if (compDate && compDate < dueDate) {
        beforeTimeCount++
      } else if (compDate && compDate.toDateString() === dueDate.toDateString()) {
        onTrackCount++
      } else {
        delayedCount++
      }
    } else {
      if (!dueDate) {
        onTrackCount++
      } else if (dueDate < now) {
        delayedCount++
      } else {
        onTrackCount++
      }
    }
  })

  const totalEvaluated = (beforeTimeCount + onTrackCount + delayedCount) || 1
  const onTrackPercent = Math.round((onTrackCount / totalEvaluated) * 100)
  const beforeTimePercent = Math.round((beforeTimeCount / totalEvaluated) * 100)
  const delayedPercent = Math.round((delayedCount / totalEvaluated) * 100)

  // Status Distribution for Incomplete Tasks
  const statusCounts = {}
  incompleteTasksList.forEach((t) => {
    let s = String(t.status || 'open').toLowerCase().replace(/[\s-]+/g, '_')
    let displayStatus = 'Pending'
    if (s === 'open' || s === 'pending') displayStatus = 'Pending'
    else if (s === 'in_progress' || s === 'processing') displayStatus = 'In Progress'
    else if (s === 'review' || s === 'need_approval') displayStatus = 'Need Approval'
    else if (s === 'client' || s === 'all_from_client') displayStatus = 'All From Client'
    else if (s === 'blocked') displayStatus = 'Blocked'
    else displayStatus = s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    statusCounts[displayStatus] = (statusCounts[displayStatus] || 0) + 1
  })

  const defaultStatusKeys = ['Pending', 'In Progress', 'Need Approval', 'Blocked']
  defaultStatusKeys.forEach((k) => {
    if (!statusCounts[k]) statusCounts[k] = 0
  })

  const statusDistribution = Object.keys(statusCounts).map((k) => ({
    status: k,
    count: statusCounts[k],
  }))

  // Project Distribution
  const projectCounts = {}
  incompleteTasksList.forEach((t) => {
    const pName = t.projectName || (t.projectId ? `Project ${t.projectId}` : 'General Tasks')
    projectCounts[pName] = (projectCounts[pName] || 0) + 1
  })
  const projectDistribution = Object.keys(projectCounts).map((p) => ({
    project: p,
    count: projectCounts[p],
  }))

  // Capacity calculation from team_workload_settings
  const WorkloadSetting = getMongoModel('team_workload_settings')
  const setting = await WorkloadSetting.findOne({
    $or: [{ userEmail: emailToInspect }, { userId: String(userLegacyId || -1) }],
  }).lean().catch(() => null)

  const weeklyCapacityHours = setting?.weeklyCapacityHours || 40
  const estimatedHours = Math.round(
    incompleteTasksList.reduce((sum, t) => sum + ((Number(t.estimatedMinutes) || 120) / 60), 0)
  )
  const actualHours = Math.round(
    periodTasks.reduce((sum, t) => sum + ((Number(t.actualMinutes) || 0) / 60), 0)
  )
  const utilizationPercent = Math.min(Math.round((estimatedHours / weeklyCapacityHours) * 100), 200)
  const remainingHours = Math.max(0, weeklyCapacityHours - estimatedHours)
  const isOverloaded = utilizationPercent > 100
  const isOptimal = utilizationPercent >= 50 && utilizationPercent <= 100
  const utilizationStatus = isOverloaded ? 'overloaded' : isOptimal ? 'optimal' : 'available'

  const formattedTasks = (periodStart ? periodTasks : userTasks).map((t) => ({
    id: t.legacyId || t.id || t._id,
    _id: t._id,
    title: t.title || 'Untitled Task',
    status: t.status || 'open',
    priority: t.priority || 'medium',
    dueDate: t.dueDate || null,
    completedAt: t.completedAt || null,
    estimatedMinutes: Number(t.estimatedMinutes) || 120,
    actualMinutes: Number(t.actualMinutes) || 0,
    projectName: t.projectName || (t.projectId ? `Project ${t.projectId}` : null),
    dealName: t.dealName || (t.dealId ? `Deal ${t.dealId}` : null),
    accountName: t.accountName || (t.accountId ? `Account ${t.accountId}` : null),
    assignedTo: t.assignedTo,
    assignedToUserEmails: t.assignedToUserEmails || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  return {
    user: {
      id: userLegacyId || userDoc?._id || emailToInspect,
      name: userName,
      email: emailToInspect,
      role: userRole,
      department: userDept,
      ownerCode: userDoc?.ownerCode || null,
      avatar: userDoc?.avatar || null,
      weeklyCapacityHours,
      slaComplianceRate: totalTasksCount > 0 ? Math.round(((totalTasksCount - overdueTasksCount) / totalTasksCount) * 100) : 100,
    },
    summary: {
      completedTasks: completedTasksCount,
      incompleteTasks: incompleteTasksCount,
      overdueTasks: overdueTasksCount,
      totalTasks: totalTasksCount,
    },
    priorityDistribution: {
      low: lowPriorityCount,
      medium: mediumPriorityCount,
      high: highPriorityCount,
      total: totalTasksCount,
    },
    performanceDistribution: {
      onTrack: { count: onTrackCount, percent: onTrackPercent },
      beforeTime: { count: beforeTimeCount, percent: beforeTimePercent },
      delayed: { count: delayedCount, percent: delayedPercent },
    },
    statusDistribution,
    projectDistribution,
    capacity: {
      weeklyCapacityHours,
      estimatedHours,
      actualHours,
      utilizationPercent,
      remainingHours,
      utilizationStatus,
    },
    tasks: formattedTasks,
    reportingPeriod: {
      period,
      from: periodStart ? periodStart.toISOString() : null,
      to: periodEnd ? periodEnd.toISOString() : null,
    },
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
  getUserWorkloadAnalytics,
  reassignWorkloadTask,
  updateWorkloadSetting,
  getApprovals,
  decideApproval,
  getWorkflows,
  createWorkflow,
}
