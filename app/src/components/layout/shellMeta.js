const ACTION_LABELS = {
  active: 'Active',
  add: 'Add',
  closed: 'Closed',
  list: 'List',
  manage: 'Manage',
  my: 'My',
  new: 'New',
  search: 'Search',
  summary: 'Summary',
  view: 'View',
}

const DYNAMIC_SEGMENT_PATTERN = /^(?:\d+|[0-9a-f]{8,})$/i
const compactNumberFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const humanizeSegment = (value = '') => (
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
)

const getWorkingSegments = (pathname = '/', isAdmin = false) => {
  const segments = pathname.split('/').filter(Boolean)
  return isAdmin && segments[0] === 'admin'
    ? segments.slice(1)
    : segments
}

export const buildShellRouteLabel = (pathname = '/', isAdmin = false) => {
  const segments = getWorkingSegments(pathname, isAdmin)

  if (segments.length === 0) {
    return isAdmin ? 'Launchpad' : 'Dashboard'
  }

  const lastSegment = segments[segments.length - 1]
  const previousSegment = segments[segments.length - 2]

  if (ACTION_LABELS[lastSegment] && previousSegment) {
    return `${ACTION_LABELS[lastSegment]} ${humanizeSegment(previousSegment)}`
  }

  if (DYNAMIC_SEGMENT_PATTERN.test(lastSegment) && previousSegment) {
    return humanizeSegment(previousSegment)
  }

  return humanizeSegment(lastSegment)
}

export const buildShellRouteTrail = (pathname = '/', isAdmin = false) => {
  const segments = getWorkingSegments(pathname, isAdmin)
    .filter((segment) => !DYNAMIC_SEGMENT_PATTERN.test(segment))
    .slice(0, 3)
    .map((segment) => humanizeSegment(segment))

  if (segments.length === 0) {
    return [isAdmin ? 'Launchpad' : 'Dashboard']
  }

  return segments
}

export const formatCompactValue = (value) => compactNumberFormatter.format(
  Number.isFinite(value) ? value : 0
)
