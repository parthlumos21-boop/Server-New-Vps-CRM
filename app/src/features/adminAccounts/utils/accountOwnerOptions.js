import { authService } from '../../../services/authService'
import { userApi } from '../../../services/userApi'

const getOwnerOptionLabel = (user = {}) => (
  user.ownerDisplayName
  || user.name
  || user.username
  || user.email
  || ''
)

export const buildAccountOwnerOptions = (users = []) => {
  const uniqueUsers = new Map()

  users
    .map((user) => authService.normalizeUserRecord(user))
    .filter((user) => user.id && getOwnerOptionLabel(user))
    .forEach((user) => {
      const key = String(user.id || getOwnerOptionLabel(user)).trim().toLowerCase()
      uniqueUsers.set(key, user)
    })

  return Array.from(uniqueUsers.values())
    .sort((left, right) => getOwnerOptionLabel(left).localeCompare(getOwnerOptionLabel(right), undefined, { sensitivity: 'base' }))
}

export const getCachedAccountOwnerOptions = () => buildAccountOwnerOptions(authService.getAvailableUsers())

export const loadAccountOwnerOptions = async () => {
  const directoryUsers = await userApi.listDirectory()
  authService.saveAvailableUsers(directoryUsers)

  return buildAccountOwnerOptions([
    ...directoryUsers,
    ...authService.getAvailableUsers(),
  ])
}

export const getAccountOwnerOptionLabel = getOwnerOptionLabel
