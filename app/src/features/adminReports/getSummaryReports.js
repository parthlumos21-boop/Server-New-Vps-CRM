import { format } from 'date-fns'
import { getVisibleAccountStages } from '../adminAccounts/config/accountStages'
import { getCrmOwnerDisplay } from '../users/crmUserDirectory'

const titleize = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const toSortedUniqueValues = (values = []) => (
  Array.from(new Set(
    values
      .map((value) => getCrmOwnerDisplay(value) || String(value || '').trim())
      .filter(Boolean)
  )).sort((left, right) => left.localeCompare(right))
)

const joinSummaryValues = (values = [], fallback = 'Not configured') => {
  const uniqueValues = toSortedUniqueValues(values)
  return uniqueValues.length > 0 ? uniqueValues.join(', ') : fallback
}

const buildOwnerNames = (availableUsers = [], extraOwners = []) => (
  joinSummaryValues([
    ...availableUsers,
    ...extraOwners,
  ], 'No owners available')
)

const buildCustomerStatuses = (customers = []) => {
  const statuses = customers.map((customer) => titleize(customer.customerStatus || ''))
  return joinSummaryValues(
    statuses.length > 0 ? statuses : ['New', 'Follow Up', 'Closed'],
    'No customer statuses available'
  )
}

const buildDealStatuses = (deals = []) => {
  const statuses = deals.map((deal) => titleize(deal.status || ''))
  return joinSummaryValues(
    statuses.length > 0 ? statuses : ['New', 'Won', 'Lost', 'Closed'],
    'No deal statuses available'
  )
}

export const getSummaryReports = ({
  accounts = [],
  deals = [],
  customers = [],
  availableUsers = [],
  createdBy = 'System Administrator',
}) => {
  const createdOn = format(new Date(), 'dd-MM-yyyy HH:mm:ss')
  const accountStatuses = getVisibleAccountStages().map((stage) => stage.label)
  const accountOwners = buildOwnerNames(availableUsers, accounts.map((account) => (
    account.accountOwner || account.ownerName || account.addedBy || ''
  )))
  const customerOwners = buildOwnerNames(availableUsers, customers.map((customer) => customer.customerOwner || ''))
  const dealOwners = buildOwnerNames(availableUsers, deals.map((deal) => deal.dealOwner || deal.ownerName || ''))

  return [
    {
      id: 'summary-accounts-monthly-status',
      entityType: 'Accounts',
      title: 'Monthly Status',
      createdBy,
      createdOn,
      visibility: 'All',
      lines: [
        { key: 'filters', label: 'Filters', value: 'Added On This Month' },
        { key: 'countBy', label: 'Count By Account Status', value: joinSummaryValues(accountStatuses, 'No account stages available') },
        { key: 'compareBy', label: 'Compare By Account Owner', value: accountOwners },
      ],
    },
    {
      id: 'summary-customers-monthly-status',
      entityType: 'Customers',
      title: 'Monthly Customers',
      createdBy,
      createdOn,
      visibility: 'All',
      lines: [
        { key: 'filters', label: 'Filters', value: 'Added On This Month' },
        { key: 'countBy', label: 'Count By Customer Status', value: buildCustomerStatuses(customers) },
        { key: 'compareBy', label: 'Compare By Customer Owner', value: customerOwners },
      ],
    },
    {
      id: 'summary-deals-monthly-status',
      entityType: 'Deals',
      title: 'Monthly Deals',
      createdBy,
      createdOn,
      visibility: 'All',
      lines: [
        { key: 'filters', label: 'Filters', value: 'Added On This Month' },
        { key: 'countBy', label: 'Count By Deal Status', value: buildDealStatuses(deals) },
        { key: 'compareBy', label: 'Compare By Deal Owner', value: dealOwners },
      ],
    },
  ]
}
