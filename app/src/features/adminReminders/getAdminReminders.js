import { customerService } from '../../services/customerService'
import { formatDateTime, formatShortDate } from '../../pages/admin/support-requests/SupportRequestShared'
import { getAccountsBoardData } from '../adminAccounts/selectors/getAccountsBoardData'
import { getCanonicalCrmUserName } from '../users/crmUserDirectory'
import { buildReminderStateId } from './reminderStorage'

const titleize = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const buildReminderRecord = (record, reminderStatesById = {}) => {
  const stateId = buildReminderStateId(record.sourceType, record.sourceId)
  const reminderState = reminderStatesById[stateId] || null
  const status = reminderState?.status === 'closed' ? 'closed' : 'active'

  return {
    ...record,
    id: stateId,
    status,
    closedOn: reminderState?.closedOn || '',
    closedByName: reminderState?.closedByName || '',
  }
}

const resolveReminderOwnerName = (value) => {
  const canonicalName = getCanonicalCrmUserName(value)
  return canonicalName || titleize(value || 'Unassigned')
}

const normalizeReminderOwnerName = (value) =>
  String(resolveReminderOwnerName(value) || '')
    .trim()
    .toLowerCase()

const resolveAccountStatusLabel = (account = {}) =>
  titleize(account.stageLabel || account.accountStatus || account.status || '') || '-'

export const getAdminReminders = ({
  accounts = [],
  deals = [],
  supportRequests = [],
  user = null,
  variantKey = 'active',
  reminderStatesById = {},
  isAdmin = false,
}) => {
  const accountReminders = getAccountsBoardData(accounts).records
    .filter((account) => account.reminderDate)
    .map((account) => buildReminderRecord({
      sourceType: 'account',
      sourceId: account.id,
      sourceLabel: 'Account',
      sourceNumber: account.accountNumber || '',
      name: account.name || account.accountNumber || 'Untitled Account',
      ownerName: resolveReminderOwnerName(account.accountOwner || account.addedBy || 'Unassigned'),
      reminderDate: account.reminderDate,
      reminderDateDisplay: formatShortDate(account.reminderDate),
      reminderMode: account.reminderMode || '-',
      accountStatus: resolveAccountStatusLabel(account),
      note: account.remark || account.latestRemark || '-',
      closedOnDisplay: '-',
    }, reminderStatesById))

  const dealReminders = deals
    .filter((deal) => deal.reminderDate)
    .map((deal) => buildReminderRecord({
      sourceType: 'deal',
      sourceId: deal.id,
      sourceLabel: 'Deal',
      sourceNumber: deal.dealNumber || '',
      name: deal.name || deal.dealNumber || 'Untitled Deal',
      ownerName: resolveReminderOwnerName(deal.dealOwner || deal.ownerName || 'Unassigned'),
      reminderDate: deal.reminderDate,
      reminderDateDisplay: formatShortDate(deal.reminderDate),
      reminderMode: titleize(deal.reminderMode || '') || '-',
      accountStatus: '-',
      note: deal.reminderNote || '-',
      closedOnDisplay: '-',
    }, reminderStatesById))

  const customerReminders = customerService
    .getCustomers()
    .filter((customer) => customer.reminderDate)
    .map((customer) => buildReminderRecord({
      sourceType: 'customer',
      sourceId: customer.id,
      sourceLabel: 'Customer',
      sourceNumber: customer.customerNumber || '',
      name: customer.customerName || customer.customerNumber || 'Untitled Customer',
      ownerName: resolveReminderOwnerName(customer.customerOwner || 'Unassigned'),
      reminderDate: customer.reminderDate,
      reminderDateDisplay: formatShortDate(customer.reminderDate),
      reminderMode: titleize(customer.reminderMode || '') || '-',
      accountStatus: '-',
      note: customer.remark || customer.description || '-',
      closedOnDisplay: '-',
    }, reminderStatesById))

  const supportRequestReminders = supportRequests
    .filter((supportRequest) => supportRequest.reminderDate || supportRequest.srDate)
    .map((supportRequest) => {
      const reminderDate = supportRequest.reminderDate || supportRequest.srDate

      return buildReminderRecord({
        sourceType: 'sr',
        sourceId: supportRequest.id,
        sourceLabel: 'SR',
        sourceNumber: supportRequest.srNumber || supportRequest.ticketNumber || '',
        name: supportRequest.title || supportRequest.customerName || supportRequest.srNumber || 'Untitled SR',
        ownerName: resolveReminderOwnerName(supportRequest.ownerName || supportRequest.addedByName || 'Unassigned'),
        reminderDate,
        reminderDateDisplay: formatShortDate(reminderDate),
        reminderMode: titleize(supportRequest.reminderMode || supportRequest.requestType || '') || '-',
        accountStatus: '-',
        note: supportRequest.reminderNote || supportRequest.notes || supportRequest.description || '-',
        closedOnDisplay: '-',
      }, reminderStatesById)
    })

  const allReminders = [
    ...accountReminders,
    ...dealReminders,
    ...customerReminders,
    ...supportRequestReminders,
  ].map((reminder) => ({
    ...reminder,
    closedOnDisplay: reminder.closedOn ? formatDateTime(reminder.closedOn) : '-',
  }))

  const filteredReminders = allReminders.filter((reminder) => {
    if (variantKey === 'my') {
      return isAdmin
        ? reminder.status === 'active'
        : normalizeReminderOwnerName(reminder.ownerName) === normalizeReminderOwnerName(user?.name || user?.username || '')
    }

    if (variantKey === 'closed') {
      return reminder.status === 'closed'
    }

    if (!isAdmin && normalizeReminderOwnerName(reminder.ownerName) !== normalizeReminderOwnerName(user?.name || user?.username || '')) {
      return false
    }

    return reminder.status === 'active'
  })

  return filteredReminders.sort((left, right) => {
    if (variantKey === 'closed') {
      return new Date(right.closedOn || 0).getTime() - new Date(left.closedOn || 0).getTime()
    }

    return new Date(left.reminderDate || 0).getTime() - new Date(right.reminderDate || 0).getTime()
  })
}
