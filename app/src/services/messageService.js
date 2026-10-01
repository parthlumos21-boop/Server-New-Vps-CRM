import { authService } from './authService'

const STORAGE_KEY = 'crm_messages'
const SYSTEM_ADMINISTRATOR_NAME = 'System Administrator'

const BASE_GROUPS = [
  {
    id: 'all-users',
    name: 'All Users',
    selectRecipients: (users) => users,
  },
  {
    id: 'admin-users',
    name: 'Admin Users',
    selectRecipients: (users) => users.filter((user) => user.role === 'admin'),
  },
  {
    id: 'normal-users',
    name: 'Normal Users',
    selectRecipients: (users) => users.filter((user) => user.role === 'user'),
  },
]

const compareByName = (left, right) => left.name.localeCompare(right.name)

const getSafeMessages = () => {
  const rawMessages = localStorage.getItem(STORAGE_KEY)

  if (!rawMessages) {
    return []
  }

  try {
    const parsedMessages = JSON.parse(rawMessages)
    return Array.isArray(parsedMessages) ? parsedMessages : []
  } catch {
    return []
  }
}

const saveMessages = (messages) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

const sortMessages = (messages) => messages.sort((left, right) => (
  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
))

const upsertMessage = (message) => {
  if (!message?.id) {
    return []
  }

  const nextMessages = getSafeMessages()
  const existingIndex = nextMessages.findIndex((entry) => entry.id === message.id)

  if (existingIndex >= 0) {
    nextMessages[existingIndex] = {
      ...nextMessages[existingIndex],
      ...message,
    }
  } else {
    nextMessages.unshift(message)
  }

  saveMessages(nextMessages)
  return sortMessages(nextMessages)
}

export const messageService = {
  getRecipientUsers(currentUser = null) {
    const allUsers = authService
      .getAvailableUsers()
      .filter((user) => user.name)
      .sort(compareByName)

    const currentUserId = currentUser?.id || null

    if (currentUser?.role === 'admin') {
      return allUsers.filter((user) => user.id !== currentUserId)
    }

    return allUsers.filter((user) => (
      user.role === 'admin'
      && user.id !== currentUserId
      && user.name !== SYSTEM_ADMINISTRATOR_NAME
    ))
  },

  getUserGroups(users = this.getRecipientUsers()) {
    return BASE_GROUPS.map((group) => {
      const recipients = group.selectRecipients(users)

      return {
        id: group.id,
        name: group.name,
        recipients,
      }
    }).filter((group) => group.recipients.length > 0)
  },

  getMessages() {
    return sortMessages(getSafeMessages())
  },

  getMessagesForUser(user) {
    if (!user) {
      return []
    }

    const allMessages = this.getMessages()

    if (user.role === 'admin') {
      return allMessages
    }

    return allMessages.filter((message) => (
      message.senderId === user.id
      || message.recipientUserIds?.includes(user.id)
    ))
  },

  buildMessage({ sender, targetMode, selectedUserIds = [], selectedGroupIds = [], body }) {
    const trimmedBody = (body || '').trim()

    if (!trimmedBody) {
      return { success: false, message: 'Please enter a message before sending.' }
    }

    const users = this.getRecipientUsers(sender)
    const groups = this.getUserGroups(users)

    let recipients = []
    let targetIds = []
    let targetNames = []

    if (targetMode === 'groups') {
      const selectedGroups = groups.filter((group) => selectedGroupIds.includes(group.id))

      if (selectedGroups.length === 0) {
        return { success: false, message: 'Please select at least one user group.' }
      }

      targetIds = selectedGroups.map((group) => group.id)
      targetNames = selectedGroups.map((group) => group.name)
      recipients = selectedGroups.flatMap((group) => group.recipients)
    } else {
      recipients = users.filter((user) => selectedUserIds.includes(user.id))

      if (recipients.length === 0) {
        return { success: false, message: 'Please select at least one user.' }
      }

      targetIds = recipients.map((user) => user.id)
      targetNames = recipients.map((user) => user.name)
    }

    const uniqueRecipients = Array.from(
      new Map(recipients.map((recipient) => [recipient.id, recipient])).values()
    )

    const nextMessage = {
      id: `MSG-${Date.now()}`,
      senderId: sender?.id || '',
      senderName: sender?.name || 'Unknown User',
      targetMode: targetMode === 'groups' ? 'groups' : 'users',
      targetIds,
      targetNames,
      recipientUserIds: uniqueRecipients.map((recipient) => recipient.id),
      recipientUserNames: uniqueRecipients.map((recipient) => recipient.name),
      recipientCount: uniqueRecipients.length,
      body: trimmedBody,
      createdAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: nextMessage,
    }
  },

  saveMessage(message) {
    return upsertMessage(message)
  },

  sendMessage(payload) {
    const result = this.buildMessage(payload)

    if (!result.success) {
      return result
    }

    this.saveMessage(result.data)

    return result
  },
}
