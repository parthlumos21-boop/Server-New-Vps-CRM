import React, { useEffect, useMemo, useState } from 'react'
import { FaBell, FaEnvelope, FaExternalLinkAlt } from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import AddReminderModal from '../../components/common/AddReminderModal'
import AddTaskModal from '../../components/common/AddTaskModal'
import {
  getStandaloneReminders,
  subscribeStandaloneReminders,
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
    addNotification,
    clearNotification,
  } = useData()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()


  const navigate = useNavigate()

  const [localReminders, setLocalReminders] = useState(() => getStandaloneReminders())
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setAddTaskOpen(true)
      searchParams.delete('add')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const [selectedTask, setSelectedTask] = useState(null)
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

  const handleEdit = (task) => {
    setSelectedTask(task)
    setAddTaskOpen(true)
  }

  const handleDelete = async (task) => {
    if (window.confirm(`Delete task "${task.title}"?`)) {
      await deleteTask(task.id)
      addNotification('success', 'Deleted', 'Task deleted successfully')
    }
  }

  const resetForm = () => {
    setSelectedTask(null)
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
            <Button onClick={() => { resetForm(); setAddTaskOpen(true); }}>
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

      <AddTaskModal
        isOpen={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        taskData={selectedTask}
      />

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
