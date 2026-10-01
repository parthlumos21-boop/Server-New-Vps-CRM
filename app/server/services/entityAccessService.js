const leadService = require('./leadService')
const dealService = require('./dealService')
const taskService = require('./taskService')
const reminderService = require('./reminderService')
const quotationService = require('./quotationService')
const customerService = require('./customerService')
const supportRequestService = require('./supportRequestService')
const projectService = require('./projectService')
const calendarService = require('./calendarService')
const { AppError } = require('../utils/appError')

const normalizeEntityType = (entityType) => {
  const normalized = String(entityType || '').trim().toLowerCase()
  const aliases = {
    account: 'lead',
    accounts: 'lead',
    lead: 'lead',
    leads: 'lead',
    deal: 'deal',
    deals: 'deal',
    task: 'task',
    tasks: 'task',
    reminder: 'reminder',
    reminders: 'reminder',
    quotation: 'quotation',
    quotations: 'quotation',
    customer: 'customer',
    customers: 'customer',
    project: 'project',
    projects: 'project',
    'support-request': 'supportRequest',
    supportrequest: 'supportRequest',
    supportrequests: 'supportRequest',
    support_requests: 'supportRequest',
    calendar: 'calendarEvent',
    'calendar-event': 'calendarEvent',
    calendar_event: 'calendarEvent',
    calendarevent: 'calendarEvent',
  }

  return aliases[normalized] || normalized
}

const entityReaders = {
  lead: (actor, id) => leadService.getLeadById(actor, id),
  deal: (actor, id) => dealService.get(actor, id),
  task: (actor, id) => taskService.get(actor, id),
  reminder: (actor, id) => reminderService.get(actor, id),
  quotation: (actor, id) => quotationService.get(actor, id),
  customer: (actor, id) => customerService.get(actor, id),
  supportRequest: (actor, id) => supportRequestService.get(actor, id),
  project: (actor, id) => projectService.getProjectById(actor, id),
  calendarEvent: (actor, id) => calendarService.get(actor, id),
}

const assertEntityAccess = async (actor, entityType, entityId) => {
  const normalizedEntityType = normalizeEntityType(entityType)
  const readEntity = entityReaders[normalizedEntityType]

  if (!readEntity) {
    throw new AppError(`Unsupported attachment entity type "${entityType}".`, 400)
  }

  return readEntity(actor, entityId)
}

module.exports = {
  normalizeEntityType,
  assertEntityAccess,
}
