const projectRepository = require('../repositories/projectRepository')
const { AppError } = require('../utils/appError')
const { normalizeId, ensureAccess } = require('./crudServiceFactory')
const auditLog = require('./auditLog')
const { applyOwnershipMetadata, isPrivilegedRole } = require('../security/accessScope')
const { projectCreate, projectUpdate } = require('../validation/schemas')
const { asOptionalNumber } = require('../utils/requestPayload')

const cleanString = (value) => String(value || '').trim()

const normalizeOptionalId = (value) => {
  if (value === null || value === undefined || value === '') return null
  return normalizeId(value, 'Project relation')
}

const buildProjectPayload = (payload = {}, actor, existingProject = null) => {
  const projectName = cleanString(payload.projectName || payload.project_name || existingProject?.projectName)
  if (!projectName) {
    throw new AppError('Project Name is required.', 400)
  }

  return applyOwnershipMetadata(actor, {
    projectCode: cleanString(payload.projectCode || payload.project_code || existingProject?.projectCode),
    projectName,
    projectDescription: cleanString(payload.projectDescription || payload.project_description || existingProject?.projectDescription),
    accountId: normalizeOptionalId(payload.accountId || payload.account_id || existingProject?.accountId),
    customerId: normalizeOptionalId(payload.customerId || payload.customer_id || existingProject?.customerId),
    consultantName: cleanString(payload.consultantName || payload.consultant_name || existingProject?.consultantName),
    architectName: cleanString(payload.architectName || payload.architect_name || existingProject?.architectName),
    pmcName: cleanString(payload.pmcName || payload.pmc_name || existingProject?.pmcName),
    projectType: cleanString(payload.projectType || payload.project_type || existingProject?.projectType),
    projectStatus: cleanString(payload.projectStatus || payload.project_status || existingProject?.projectStatus || 'Active'),
    projectLocation: cleanString(payload.projectLocation || payload.project_location || existingProject?.projectLocation),
    projectValue: asOptionalNumber(payload.projectValue ?? payload.project_value ?? existingProject?.projectValue),
    startDate: payload.startDate || payload.start_date || existingProject?.startDate || null,
    endDate: payload.endDate || payload.end_date || existingProject?.endDate || null,
    createdBy: existingProject?.createdBy || actor.id,
    updatedBy: actor.id,
  }, existingProject)
}

const listProjects = (actor) => (
  projectRepository.listProjectsForActor
    ? projectRepository.listProjectsForActor(actor, { companyWide: isPrivilegedRole(actor.role) })
    : isPrivilegedRole(actor.role)
      ? projectRepository.listAllProjects()
      : projectRepository.listProjectsForUser(actor.id)
)

const getProjectById = async (actor, projectId) => {
  const normalizedProjectId = normalizeId(projectId, 'Project')
  const project = projectRepository.findProjectByIdForActor
    ? await projectRepository.findProjectByIdForActor(normalizedProjectId, actor, { companyWide: isPrivilegedRole(actor.role) })
    : await projectRepository.findProjectById(normalizedProjectId)
  if (!project) throw new AppError('Project not found.', 404)
  ensureAccess(actor, project, 'project')
  return project
}

const createProject = async (actor, payload) => {
  const project = await projectRepository.createProject(buildProjectPayload(payload, actor))
  auditLog.record({ actor, action: 'create', entityType: 'project', entityId: project?.projectId, changes: { after: project } })
  return project
}

const updateProject = async (actor, projectId, payload) => {
  const existingProject = await getProjectById(actor, projectId)
  const project = await projectRepository.updateProject(
    normalizeId(projectId, 'Project'),
    buildProjectPayload(payload, actor, existingProject)
  )
  if (!project) throw new AppError('Project not found.', 404)
  auditLog.record({ actor, action: 'update', entityType: 'project', entityId: project?.projectId, changes: { before: existingProject, after: project } })
  return project
}

const deleteProject = async (actor, projectId) => {
  const existingProject = await getProjectById(actor, projectId)
  await projectRepository.deleteProject(normalizeId(projectId, 'Project'))
  auditLog.record({ actor, action: 'delete', entityType: 'project', entityId: existingProject?.projectId, changes: { before: existingProject } })
  return { id: existingProject.projectId }
}

module.exports = {
  validation: {
    create: projectCreate,
    update: projectUpdate,
  },
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
}
