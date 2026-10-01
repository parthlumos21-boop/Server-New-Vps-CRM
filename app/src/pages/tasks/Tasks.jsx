import React, { useEffect, useMemo, useState } from 'react'
import { FaBell, FaCheck, FaEnvelope, FaExternalLinkAlt, FaRedo, FaTimes } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useModal } from '../../hooks'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import AddReminderModal from '../../components/common/AddReminderModal'
import {
  getStandaloneReminders,
  subscribeStandaloneReminders,
  closeStandaloneReminder,
  reopenStandaloneReminder,
  deleteStandaloneReminder,
} from '../../features/standaloneReminders/standaloneReminderStorage'
import { exportExcelWorkbook } from '../../utils/excelExport'
import { formatDate, getPriorityColor } from '../../utils/helpers'
import { TASK_STATUS, PRIORITY_LEVELS } from '../../utils/constants'
import './Tasks.css'

const Tasks = () => {
  const {
    tasks,
    reminders: mongoReminders,
    notifications,
    messages,
    createTask,
    updateTask,
    deleteTask,
    updateReminder,
    deleteReminder,
    addNotification,
    clearNotification,
  } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isOpen, data, open, close } = useModal()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: ''
  })

  const [localReminders, setLocalReminders] = useState(() => getStandaloneReminders())
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [dismissedMessageIds, setDismissedMessageIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('crm_todo_dismissed_message_ids') || '[]')
    } catch (error) {
      return []
    }
  })

  useEffect(() => subscribeStandaloneReminders(setLocalReminders), [])

  const userTasks = tasks
  const normalizedUserName = String(user?.name || user?.username || user?.email || '').trim().toLowerCase()
  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin'
  const mappedMongoReminders = (mongoReminders || []).map((reminder) => ({
    ...reminder,
    sourceKind: 'mongo',
    title: reminder.title || 'Reminder',
    note: reminder.note || reminder.message || '',
    reminderDate: reminder.reminderDate || String(reminder.remindAt || '').slice(0, 10),
    reminderTime: reminder.reminderTime || String(reminder.remindAt || '').slice(11, 16) || '09:00',
    reminderMode: reminder.reminderMode || 'Follow Up',
    status: reminder.status === 'closed' ? 'closed' : 'active',
  }))
  const mappedLocalReminders = localReminders.map((reminder) => ({
    ...reminder,
    sourceKind: 'local',
  }))
  const personalReminders = [...mappedMongoReminders, ...mappedLocalReminders].filter((reminder) => {
    if (isAdminUser) return true
    if (reminder.sourceKind === 'mongo') {
      return String(reminder.assignedTo || reminder.createdBy || '') === String(user?.id || '')
    }
    const reminderOwner = String(reminder.createdBy || '').trim().toLowerCase()
    return !reminderOwner || reminderOwner === normalizedUserName
  })
  const visibleReminders = [...personalReminders].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'active' ? -1 : 1
    return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
  })
  const activeReminderCount = personalReminders.filter((reminder) => reminder.status === 'active').length
  const visibleMessages = useMemo(() => (
    messages.filter((message) => !dismissedMessageIds.includes(String(message.id)))
  ), [dismissedMessageIds, messages])
  const communicationItems = useMemo(() => ([
    ...notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      recordId: notification.id,
      type: 'notification',
      title: notification.title || 'Notification',
      body: notification.message || '-',
      timestamp: notification.timestamp || notification.createdAt,
      route: isAdminUser ? '/admin/reminders/my' : '/reminders/my',
    })),
    ...visibleMessages.map((message) => ({
      id: `message-${message.id}`,
      recordId: message.id,
      type: 'message',
      title: message.senderName ? `Message from ${message.senderName}` : 'Message',
      body: message.body || '-',
      timestamp: message.createdAt,
      route: isAdminUser ? '/admin/messages' : '/messages',
    })),
  ].sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))), [isAdminUser, notifications, visibleMessages])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = data 
      ? await updateTask(data.id, formData)
      : await createTask(formData)

    if (result.success) {
      addNotification('success', 'Success', `Task ${data ? 'updated' : 'created'} successfully`)
      close()
      resetForm()
    }
  }

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || ''
    })
    open(task)
  }

  const handleDelete = async (task) => {
    if (window.confirm(`Delete task "${task.title}"?`)) {
      await deleteTask(task.id)
      addNotification('success', 'Deleted', 'Task deleted successfully')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dueDate: ''
    })
  }

  const handleCloseReminder = async (reminder) => {
    if (reminder.sourceKind === 'mongo') {
      const result = await updateReminder(reminder.id, { status: 'closed' })
      if (!result.success) {
        addNotification('error', 'Close reminder', result.message || 'Unable to close reminder.')
        return
      }
    } else {
      closeStandaloneReminder(reminder.id, user?.name || '')
    }
    addNotification('success', 'Reminder closed', 'Reminder moved to closed list.')
  }

  const handleReopenReminder = async (reminder) => {
    if (reminder.sourceKind === 'mongo') {
      const result = await updateReminder(reminder.id, { status: 'scheduled' })
      if (!result.success) {
        addNotification('error', 'Reopen reminder', result.message || 'Unable to reopen reminder.')
        return
      }
    } else {
      reopenStandaloneReminder(reminder.id)
    }
    addNotification('info', 'Reminder active', 'Reminder reopened in your to-do list.')
  }

  const handleDeleteReminder = async (reminder) => {
    if (window.confirm('Delete this reminder?')) {
      if (reminder.sourceKind === 'mongo') {
        const result = await deleteReminder(reminder.id)
        if (!result.success) {
          addNotification('error', 'Delete reminder', result.message || 'Unable to delete reminder.')
          return
        }
      } else {
        deleteStandaloneReminder(reminder.id)
      }
      addNotification('success', 'Reminder deleted', 'Reminder removed from your to-do list.')
    }
  }

  const rememberDismissedMessage = (id) => {
    const nextIds = Array.from(new Set([String(id), ...dismissedMessageIds])).slice(0, 300)
    setDismissedMessageIds(nextIds)
    localStorage.setItem('crm_todo_dismissed_message_ids', JSON.stringify(nextIds))
  }

  const handleCompleteCommunicationItem = (item) => {
    if (item.type === 'notification') {
      clearNotification(item.recordId)
      addNotification('success', 'Notification done', 'Notification removed from your to-do list.')
      return
    }

    rememberDismissedMessage(item.recordId)
    addNotification('success', 'Message done', 'Message removed from your to-do list.')
  }

  const handleCloseCommunicationItem = (item) => {
    if (item.type === 'notification') {
      clearNotification(item.recordId)
      return
    }

    rememberDismissedMessage(item.recordId)
  }

  const formatReminderDate = (dateStr, time) => {
    if (!dateStr) return '–'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    return time ? `${formatted} ${time}` : formatted
  }

  const columns = [
    { key: 'title', label: 'Task' },
    { 
      key: 'priority', 
      label: 'Priority',
      width: '120px',
      render: (value) => (
        <Badge variant={getPriorityColor(value)}>{value}</Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      width: '120px',
      render: (value) => (
        <Badge variant={value === 'completed' ? 'success' : 'warning'}>{value}</Badge>
      )
    },
    { 
      key: 'dueDate', 
      label: 'Due Date',
      width: '150px',
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '180px',
      render: (_, row) => (
        <div className="table-actions">
          <Button size="small" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="tasks-page">
      {/* ── Linked Reminders Panel ── */}
      <div className="tasks-reminders-section tasks-communications-section">
        <div className="tasks-reminders-header">
          <div className="tasks-reminders-title">
            <FaEnvelope />
            Notifications & Messages
            <span className="tasks-reminders-badge">
              {communicationItems.length} open
            </span>
          </div>
        </div>

        <div className="tasks-reminders-list">
          {communicationItems.length === 0 ? (
            <p className="tasks-reminders-empty">
              No notifications or messages in your to-do list.
            </p>
          ) : (
            communicationItems.map((item) => (
              <div key={item.id} className="tasks-reminder-card tasks-communication-card">
                {item.type === 'message' ? (
                  <FaEnvelope className="tasks-reminder-icon tasks-communication-icon" />
                ) : (
                  <FaBell className="tasks-reminder-icon tasks-communication-icon" />
                )}
                <button
                  type="button"
                  className="tasks-communication-main"
                  onClick={() => navigate(item.route)}
                  title="Open linked page"
                >
                  <div className="tasks-reminder-title">
                    {item.title}
                    <span className={`tasks-reminder-mode tasks-communication-mode tasks-communication-mode--${item.type}`}>
                      {item.type === 'message' ? 'Message' : 'Notification'}
                    </span>
                  </div>
                  <div className="tasks-reminder-meta tasks-communication-body">
                    {item.body}
                  </div>
                </button>
                <div className="tasks-reminder-actions">
                  <button
                    type="button"
                    className="tasks-reminder-btn tasks-reminder-btn--close"
                    onClick={() => handleCompleteCommunicationItem(item)}
                    title="Mark as done"
                    aria-label="Mark as done"
                  >
                    <FaCheck />
                  </button>
                  <button
                    type="button"
                    className="tasks-reminder-btn tasks-reminder-btn--open"
                    onClick={() => navigate(item.route)}
                    title="Open linked page"
                    aria-label="Open linked page"
                  >
                    <FaExternalLinkAlt />
                  </button>
                  <button
                    type="button"
                    className="tasks-reminder-btn tasks-reminder-btn--delete"
                    onClick={() => handleCloseCommunicationItem(item)}
                    title="Close"
                    aria-label="Close"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="tasks-reminders-section">
        <div className="tasks-reminders-header">
          <div className="tasks-reminders-title">
            <FaBell />
            Linked Reminders
            <span className="tasks-reminders-badge">
              {activeReminderCount} active
            </span>
          </div>
          <button
            type="button"
            className="tasks-reminders-add-btn"
            onClick={() => setAddReminderOpen(true)}
          >
            <FaBell />
            + Add Reminder
          </button>
        </div>

        <div className="tasks-reminders-list">
          {visibleReminders.length === 0 ? (
            <p className="tasks-reminders-empty">
              No reminders yet. Click "+ Add Reminder" to create one - it will also appear on the Calendar.
            </p>
          ) : (
            visibleReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`tasks-reminder-card${reminder.status === 'closed' ? ' tasks-reminder-card--closed' : ''}`}
              >
                <FaBell className="tasks-reminder-icon" />
                <div className="tasks-reminder-main">
                  <div className="tasks-reminder-title">
                    {reminder.title}
                    <span className="tasks-reminder-mode">{reminder.reminderMode}</span>
                  </div>
                  <div className="tasks-reminder-meta">
                    {formatReminderDate(reminder.reminderDate, reminder.reminderTime)}
                    {reminder.note ? ` · ${reminder.note}` : ''}
                    {reminder.status === 'closed' && ' · Closed'}
                  </div>
                </div>
                <div className="tasks-reminder-actions">
                  {reminder.status === 'active' ? (
                    <button
                      type="button"
                      className="tasks-reminder-btn tasks-reminder-btn--close"
                      onClick={() => handleCloseReminder(reminder)}
                      title="Close reminder"
                      aria-label="Close reminder"
                    >
                      <FaCheck />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tasks-reminder-btn tasks-reminder-btn--reopen"
                      onClick={() => handleReopenReminder(reminder)}
                      title="Reopen reminder"
                      aria-label="Reopen reminder"
                    >
                      <FaRedo />
                    </button>
                  )}
                  <button
                    type="button"
                    className="tasks-reminder-btn tasks-reminder-btn--delete"
                    onClick={() => handleDeleteReminder(reminder)}
                    title="Delete reminder"
                    aria-label="Delete reminder"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Card
        title="Tasks"
        subtitle={`${userTasks.length} tasks`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              onClick={() => {
                if (userTasks.length === 0) {
                  addNotification('error', 'Export Failed', 'No tasks to export.')
                  return
                }
                const exportRows = userTasks.map(task => ({
                  Title: task.title,
                  Description: task.description,
                  Status: task.status,
                  Priority: task.priority,
                  'Due Date': task.dueDate,
                }))
                exportExcelWorkbook({
                  filename: 'Tasks_Export.xlsx',
                  title: 'Tasks',
                  columns: [
                    { key: 'Title', label: 'Title' },
                    { key: 'Description', label: 'Description' },
                    { key: 'Status', label: 'Status' },
                    { key: 'Priority', label: 'Priority' },
                    { key: 'Due Date', label: 'Due Date', type: 'date' },
                  ],
                  rows: exportRows
                })
              }}
            >
              Export
            </Button>
            <Button onClick={() => { resetForm(); open(); }}>
              + Add Task
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          data={userTasks}
          emptyMessage="No tasks found"
        />
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={data ? 'Edit Task' : 'Add New Task'}
      >
        <form onSubmit={handleSubmit} className="task-form">
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
          />

          <Select
            label="Priority *"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={PRIORITY_LEVELS}
            required
            fullWidth
          />

          <Select
            label="Status *"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={TASK_STATUS}
            required
            fullWidth
          />

          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            fullWidth
          />

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {data ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </form>
      </Modal>

      <AddReminderModal
        isOpen={addReminderOpen}
        onClose={() => setAddReminderOpen(false)}
        createdBy={user?.name || ''}
        onSaved={() => addNotification('success', 'Reminder added', 'Reminder added to your to-do list.')}
      />
    </div>
  )
}

export default Tasks
