import { authService } from '../../services/authService'
import { getTeamViewGroups } from '../adminTeamView/teamViewData'

const WON_STATUSES = new Set(['won', 'closed won', 'converted'])
const LOST_STATUSES = new Set(['lost', 'closed lost', 'rejected'])
const SALES_TAB_GROUPS = {
  salesPerformanceA: 'Swati Sales-1',
  salesPerformanceB: 'Swati Sales-2',
}

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const buildScopeUserIds = (viewKey, user) => {
  if (viewKey === 'salesDashboard' || viewKey === 'myCrm') {
    return user?.id ? [user.id] : []
  }

  const matchingGroup = getTeamViewGroups(authService.getAvailableUsers())
    .find((entry) => entry.label === SALES_TAB_GROUPS[viewKey])

  return matchingGroup?.userIds || []
}

const filterByUserScope = (records, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return records
  }

  const userIdSet = new Set(userIds.map((value) => normalizeValue(value)))
  const scopedRecords = records.filter((record) => userIdSet.has(normalizeValue(record.userId)))

  return scopedRecords.length > 0 ? scopedRecords : records
}

const isWonDeal = (deal) => WON_STATUSES.has(normalizeValue(deal.status))
const isLostDeal = (deal) => LOST_STATUSES.has(normalizeValue(deal.status))
const isOpenDeal = (deal) => !isWonDeal(deal) && !isLostDeal(deal)

const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`

export const getDashboardScope = (viewKey, user) => {
  if (viewKey === 'salesDashboard') {
    return {
      title: `${user?.name || 'Demo User'} Sales Dashboard`,
      subtitleLabel: user?.name || 'Current user',
      userIds: buildScopeUserIds(viewKey, user),
    }
  }

  if (viewKey === 'myCrm') {
    return {
      title: `${user?.name || 'Demo User'} My CRM`,
      subtitleLabel: user?.name || 'Current user',
      userIds: buildScopeUserIds(viewKey, user),
    }
  }

  return {
    title: SALES_TAB_GROUPS[viewKey] || 'Sales Performance',
    subtitleLabel: SALES_TAB_GROUPS[viewKey] || 'Selected team',
    userIds: buildScopeUserIds(viewKey, user),
  }
}

export const buildMonthlyWonLostData = (deals, viewKey, user) => {
  const scope = getDashboardScope(viewKey, user)
  const scopedDeals = filterByUserScope(deals, scope.userIds)
  const currentMonth = new Date()
  const monthEntries = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (11 - index), 1)
    return {
      key: getMonthKey(date),
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', ' '),
      won: 0,
      lost: 0,
    }
  })

  const monthLookup = monthEntries.reduce((lookup, entry) => ({
    ...lookup,
    [entry.key]: entry,
  }), {})

  scopedDeals.forEach((deal) => {
    const sourceDate = deal.closeDate || deal.updatedAt || deal.createdAt
    const parsedDate = sourceDate ? new Date(sourceDate) : null
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return
    }

    const monthEntry = monthLookup[getMonthKey(parsedDate)]
    if (!monthEntry) {
      return
    }

    if (isWonDeal(deal)) {
      monthEntry.won += 1
    } else if (isLostDeal(deal)) {
      monthEntry.lost += 1
    }
  })

  return {
    scope,
    entries: monthEntries,
    scopedDeals,
  }
}

export const buildPerformanceSummary = (accounts, deals, viewKey, user) => {
  const scope = getDashboardScope(viewKey, user)
  const scopedDeals = filterByUserScope(deals, scope.userIds)
  const scopedAccounts = filterByUserScope(accounts, scope.userIds)

  const wonDeals = scopedDeals.filter(isWonDeal)
  const lostDeals = scopedDeals.filter(isLostDeal)
  const openDeals = scopedDeals.filter(isOpenDeal)
  const totalValue = scopedDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)

  return {
    scope,
    scopedDeals,
    scopedAccounts,
    cards: [
      { id: 'won', label: 'Won Deals', value: String(wonDeals.length), route: '/admin/deals/view', filterKey: 'won' },
      { id: 'open', label: 'Open Deals', value: String(openDeals.length), route: '/admin/deals/view', filterKey: 'open' },
      { id: 'accounts', label: 'Active Accounts', value: String(scopedAccounts.length), route: '/admin/accounts' },
      { id: 'pipeline', label: 'Pipeline Value', value: totalValue > 0 ? `Rs ${Math.round(totalValue).toLocaleString('en-IN')}` : 'Rs 0', route: '/admin/deals/view', filterKey: 'all' },
    ],
    meta: {
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
      openCount: openDeals.length,
      accountCount: scopedAccounts.length,
    },
  }
}
