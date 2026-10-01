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

export const filterAccountOwnerOptionsByVertical = (options, verticalName) => {
  if (!verticalName || typeof verticalName !== 'string') return options;
  const target = verticalName.toLowerCase().trim();
  
  if (target !== 'swati' && target !== 'lumos') return options;

  return options.filter((owner) => {
    const compStr = String(owner.company || owner.companyName || '').toLowerCase().trim();
    const emailStr = String(owner.email || '').toLowerCase().trim();
    if (target === 'lumos') {
      return compStr.includes('lumos') || Number(owner.companyId) === 2 || emailStr.includes('lumos');
    }
    return compStr.includes('swati') || Number(owner.companyId) === 1 || emailStr.includes('swati');
  });
};
