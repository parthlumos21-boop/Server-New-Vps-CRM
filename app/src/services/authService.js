import {
  CRM_FILTER_USERS,
  getCanonicalCrmUserName,
  getCrmOwnerCode,
  getCrmOwnerDisplay,
  isHiddenFilterUser,
  normalizeCrmUserName,
} from '../features/users/crmUserDirectory'

class AuthService {
  constructor() {
    this.storageKey = 'crm_user'
    this.usersStorageKey = 'crm_users_directory'
  }

  normalizeUserRecord(user = {}) {
    const trimmedName = String(user.name || '').trim()
    const canonicalName = getCanonicalCrmUserName(trimmedName)
    const resolvedName = canonicalName || trimmedName

    return {
      ...user,
      id: user.id ?? '',
      username: String(user.username || '').trim().toLowerCase(),
      name: resolvedName,
      ownerCode: String(user.ownerCode || user.owner_code || getCrmOwnerCode(resolvedName) || '').trim(),
      ownerDisplayName: getCrmOwnerDisplay(resolvedName),
      email: String(user.email || '').trim().toLowerCase(),
      role: String(user.role || 'user').trim().toLowerCase() || 'user',
      companyId: user.companyId ?? user.company_id ?? null,
      status: String(user.status || '').trim().toLowerCase(),
      isApproved: Boolean(user.isApproved),
    }
  }

  logout() {
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.usersStorageKey)
  }

  getCurrentUser() {
    const userJson = localStorage.getItem(this.storageKey)
    if (!userJson) return null

    try {
      return this.normalizeUserRecord(JSON.parse(userJson))
    } catch {
      return null
    }
  }

  saveUser(user) {
    localStorage.setItem(this.storageKey, JSON.stringify(this.normalizeUserRecord(user)))
  }

  getAvailableUsers() {
    const usersJson = localStorage.getItem(this.usersStorageKey)
    let parsedUsers = []

    try {
      parsedUsers = usersJson ? JSON.parse(usersJson) : []
    } catch {
      parsedUsers = []
    }

    const normalizedUsers = Array.isArray(parsedUsers)
      ? parsedUsers.map((user) => this.normalizeUserRecord(user)).filter((user) => user.id)
      : []

    const currentUser = this.getCurrentUser()
    if (currentUser && !isHiddenFilterUser(currentUser) && !normalizedUsers.some((user) => user.id === currentUser.id)) {
      normalizedUsers.unshift(currentUser)
    }

    const usersByName = new Map()

    normalizedUsers
      .filter((user) => !isHiddenFilterUser(user))
      .forEach((user) => {
        const nameKey = normalizeCrmUserName(user.name || user.username || user.email)
        if (nameKey) {
          usersByName.set(nameKey, user)
        }
      })

    CRM_FILTER_USERS.forEach((crmUser) => {
      const key = normalizeCrmUserName(crmUser.name)
      const existingUser = usersByName.get(key)
      usersByName.set(
        key,
        existingUser
          ? this.normalizeUserRecord({ ...crmUser, ...existingUser, name: crmUser.name })
          : this.normalizeUserRecord(crmUser)
      )
    })

    const uniqueUsers = new Map()

    Array.from(usersByName.values())
      .filter((user) => user.id && !isHiddenFilterUser(user))
      .forEach((user) => {
        const ownerKey = user.ownerCode
          ? `code:${user.ownerCode}`
          : `name:${normalizeCrmUserName(user.ownerDisplayName || user.name || user.username || user.email)}`
        const existingUser = uniqueUsers.get(ownerKey)
        if (!existingUser || String(existingUser.id || '').startsWith('crm-')) {
          uniqueUsers.set(ownerKey, user)
        }
      })

    return Array.from(uniqueUsers.values())
      .sort((left, right) => String(left.ownerDisplayName || left.name || '').localeCompare(String(right.ownerDisplayName || right.name || '')))
  }

  saveAvailableUsers(users = []) {
    const safeUsers = Array.isArray(users)
      ? users.map((user) => this.normalizeUserRecord(user)).filter((user) => user.id)
      : []

    localStorage.setItem(this.usersStorageKey, JSON.stringify(safeUsers))
  }
}

export const authService = new AuthService()
