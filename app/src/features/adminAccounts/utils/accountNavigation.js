import { buildAdminAccountsBoardUrl, getAdminAccountsBoardViewByQuery } from '../config/accountBoardViews'
import { buildAdminCustomViewUrl, getAdminCustomViewById } from '../customViews/customViewStorage'

const toSearchParams = (value) => (
  value instanceof URLSearchParams ? new URLSearchParams(value) : new URLSearchParams(value || '')
)

const toQueryString = (params) => {
  const query = params.toString()
  return query ? `?${query}` : ''
}

const isAdminAccountPath = () => (
  typeof window === 'undefined' || window.location.pathname.startsWith('/admin')
)

const toPortalAccountPath = (path) => {
  if (isAdminAccountPath()) return path
  return String(path || '').replace(/^\/admin\/accounts/u, '/accounts')
}

export const buildAdminAccountDetailUrl = (accountId, searchParams) => {
  const params = toSearchParams(searchParams)
  params.delete('accountId')

  return `${toPortalAccountPath('/admin/accounts/view')}/${encodeURIComponent(accountId)}${toQueryString(params)}`
}

export const buildAdminAccountActionUrl = (route, accountId, searchParams) => {
  const params = toSearchParams(searchParams)



  params.set('accountId', accountId)

  return `${toPortalAccountPath(route)}${toQueryString(params)}`
}

export const openAdminAccountActionPage = (route, accountId, searchParams) => {
  const url = buildAdminAccountActionUrl(route, accountId, searchParams)
  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (openedWindow) {
    openedWindow.opener = null
  }

  return url
}

export const buildAdminAccountBoardReturnUrl = (searchParams) => {
  const params = toSearchParams(searchParams)
  const customViewId = params.get('customViewId')

  if (customViewId) {
    const customView = getAdminCustomViewById(customViewId)
    const customViewParams = new URLSearchParams(params)
    customViewParams.delete('accountId')
    customViewParams.delete('customViewId')

    if (customView) {
      return toPortalAccountPath(buildAdminCustomViewUrl(customView.id, toQueryString(customViewParams)))
    }
  }

  const boardView = getAdminAccountsBoardViewByQuery(params.get('view'))
  const boardParams = new URLSearchParams(params)
  boardParams.delete('accountId')
  boardParams.delete('customViewId')

  if (!boardParams.get('view')) {
    boardParams.set('view', boardView.queryValue)
  }

  return toPortalAccountPath(buildAdminAccountsBoardUrl(boardView.key, toQueryString(boardParams)))
}

export const buildAdminAccountDrawerUrl = (searchParams, accountId) => {
  const params = toSearchParams(searchParams)

  if (accountId) {
    params.set('accountId', accountId)
  }

  return buildAdminAccountBoardReturnUrl(params)
}
