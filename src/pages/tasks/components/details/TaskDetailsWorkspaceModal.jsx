import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaCompressAlt, FaExpandAlt } from 'react-icons/fa'
import TaskInfoLeftPanel from './TaskInfoLeftPanel'
import TaskActivityRightPanel from './TaskActivityRightPanel'
import { styles } from './taskDetailsStyles'
import taskApi from '../../../../services/taskApi'
import { userApi } from '../../../../services/userApi'

export default function TaskDetailsWorkspaceModal({
  isOpen = false,
  task = null,
  onClose,
  onUpdateTask,
  allTasks = [],
  currentUser = {},
  availableUsers = [],
  isAdmin = false,
  initialTab = 'comments',
}) {
  const [activeTask, setActiveTask] = useState(task)
  const [activeTab, setActiveTab] = useState(initialTab || 'comments')
  const [resolvedUsers, setResolvedUsers] = useState(availableUsers || [])

  useEffect(() => {
    if (Array.isArray(availableUsers) && availableUsers.length > 0) {
      setResolvedUsers(availableUsers)
    } else {
      userApi
        .listDirectory()
        .then((users) => {
          if (Array.isArray(users)) setResolvedUsers(users)
        })
        .catch(() => {})
    }
  }, [availableUsers])

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'comments')
    }
  }, [isOpen, initialTab])

  // Real data collections from MongoDB
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [activities, setActivities] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [readersData, setReadersData] = useState({ readers: [], readCount: 0, totalCount: 8 })

  // Operation loading states
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [isLoggingTime, setIsLoggingTime] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync active task when prop changes
  useEffect(() => {
    setActiveTask(task)
  }, [task])

  const taskId = activeTask?.id || activeTask?.legacyId || activeTask?._id

  // Fetch all MongoDB records for this task whenever taskId changes
  useEffect(() => {
    if (!isOpen || !taskId) return

    let isMounted = true

    const loadTaskDetailsData = async () => {
      try {
        // Mark as read in MongoDB
        taskApi.markAsRead(taskId).catch(() => {})

        const [commentsRes, attachRes, activityRes, timeRes, readersRes, freshDetails] = await Promise.all([
          taskApi.getComments(taskId).catch(() => []),
          taskApi.getAttachments(taskId).catch(() => []),
          taskApi.getActivity(taskId).catch(() => []),
          taskApi.getTimeEntries(taskId).catch(() => []),
          taskApi.getReaders(taskId).catch(() => ({ readers: [], readCount: 0, totalCount: 8 })),
          taskApi.getTaskDetails(taskId).catch(() => null),
        ])

        if (isMounted) {
          if (freshDetails && freshDetails.id) {
            setActiveTask((prev) => ({ ...prev, ...freshDetails }))
          }
          setComments(Array.isArray(commentsRes) ? commentsRes : [])
          setAttachments(Array.isArray(attachRes) ? attachRes : [])
          setActivities(Array.isArray(activityRes) ? activityRes : [])
          setTimeEntries(Array.isArray(timeRes) ? timeRes : [])
          setReadersData(readersRes || { readers: [], readCount: 0, totalCount: 8 })
        }
      } catch (err) {
        console.error('Failed to load task details from MongoDB:', err)
      }
    }

    loadTaskDetailsData()

    return () => {
      isMounted = false
    }
  }, [isOpen, taskId])

  // Keyboard shortcut listener (ESC to close)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !activeTask) return null

  // Task Navigation (< Prev, Next >)
  const currentIndex = allTasks.findIndex(
    (t) =>
      String(t.id || t.legacyId || t._id) === String(taskId) ||
      (t._id && String(t._id) === String(taskId))
  )

  const handlePrevTask = () => {
    if (currentIndex > 0) {
      const prev = allTasks[currentIndex - 1]
      setActiveTask(prev)
      onUpdateTask?.(prev)
    }
  }

  const handleNextTask = () => {
    if (currentIndex >= 0 && currentIndex < allTasks.length - 1) {
      const next = allTasks[currentIndex + 1]
      setActiveTask(next)
      onUpdateTask?.(next)
    }
  }

  // Generic Task Field Update with Optimistic UI + MongoDB Persistence (supports single or multi-field atomic update)
  const handleUpdateTaskField = async (fieldOrObject, value) => {
    const updates = typeof fieldOrObject === 'object' && fieldOrObject !== null
      ? fieldOrObject
      : { [fieldOrObject]: value }

    const previous = { ...activeTask }
    const updated = { ...activeTask, ...updates }

    // Optimistic UI update
    setActiveTask(updated)
    onUpdateTask?.(updated)

    try {
      await taskApi.updateTask(taskId, updates)
      // Refresh activity timeline and details from MongoDB
      const [freshActivity, freshDetails] = await Promise.all([
        taskApi.getActivity(taskId).catch(() => []),
        taskApi.getTaskDetails(taskId).catch(() => null),
      ])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
      if (freshDetails && (freshDetails.id || freshDetails._id)) {
        setActiveTask((prev) => ({ ...prev, ...freshDetails }))
      }
    } catch (err) {
      console.error('Failed to update task fields in MongoDB:', err)
      // Rollback
      setActiveTask(previous)
      onUpdateTask?.(previous)
    }
  }

  // Subtask Toggle with Optimistic Progress % recalculation
  const handleToggleSubtask = async (subtaskId) => {
    const rawSubtasks = Array.isArray(activeTask.subtasks) ? [...activeTask.subtasks] : []
    const updatedSubtasks = rawSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    const completedCount = updatedSubtasks.filter((s) => s.completed).length
    const newProgress = Math.round((completedCount / (updatedSubtasks.length || 1)) * 100)

    const previous = { ...activeTask }
    const updated = { ...activeTask, subtasks: updatedSubtasks, progress: newProgress }

    setActiveTask(updated)
    onUpdateTask?.(updated)

    try {
      await taskApi.updateTask(taskId, { subtasks: updatedSubtasks, progress: newProgress })
      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to toggle subtask in MongoDB:', err)
      setActiveTask(previous)
      onUpdateTask?.(previous)
    }
  }

  // Add Subtask
  const handleAddSubtask = async (newSubtask) => {
    const updatedSubtasks = [...(activeTask.subtasks || []), newSubtask]
    const completedCount = updatedSubtasks.filter((s) => s.completed).length
    const newProgress = Math.round((completedCount / (updatedSubtasks.length || 1)) * 100)

    const updated = { ...activeTask, subtasks: updatedSubtasks, progress: newProgress }
    setActiveTask(updated)
    onUpdateTask?.(updated)

    try {
      await taskApi.updateTask(taskId, { subtasks: updatedSubtasks, progress: newProgress })
      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to add subtask in MongoDB:', err)
    }
  }

  // Delete Subtask
  const handleDeleteSubtask = async (subtaskId) => {
    const updatedSubtasks = (activeTask.subtasks || []).filter((s) => s.id !== subtaskId)
    const completedCount = updatedSubtasks.filter((s) => s.completed).length
    const newProgress = updatedSubtasks.length ? Math.round((completedCount / updatedSubtasks.length) * 100) : 0

    const updated = { ...activeTask, subtasks: updatedSubtasks, progress: newProgress }
    setActiveTask(updated)
    onUpdateTask?.(updated)

    try {
      await taskApi.updateTask(taskId, { subtasks: updatedSubtasks, progress: newProgress })
    } catch (err) {
      console.error('Failed to delete subtask in MongoDB:', err)
    }
  }

  // Assignee Management (Multi-assignees)
  const handleAddAssignee = async (userEmail) => {
    const current = Array.isArray(activeTask.assignedToUserEmails) ? [...activeTask.assignedToUserEmails] : []
    if (!current.includes(userEmail)) {
      current.push(userEmail)
      const updated = { ...activeTask, assignedToUserEmails: current, assignedTo: current[0] }
      setActiveTask(updated)
      onUpdateTask?.(updated)
      try {
        await taskApi.updateTask(taskId, { assignedToUserEmails: current, assignedTo: current[0] })
        const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
        setActivities(Array.isArray(freshActivity) ? freshActivity : [])
      } catch (err) {
        console.error('Failed to add assignee in MongoDB:', err)
      }
    }
  }

  const handleRemoveAssignee = async (userEmail) => {
    const current = (activeTask.assignedToUserEmails || []).filter((e) => e !== userEmail)
    const updated = { ...activeTask, assignedToUserEmails: current, assignedTo: current[0] || null }
    setActiveTask(updated)
    onUpdateTask?.(updated)
    try {
      await taskApi.updateTask(taskId, { assignedToUserEmails: current, assignedTo: current[0] || null })
      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to remove assignee in MongoDB:', err)
    }
  }

  // Checklist Actions
  const handleAddChecklistItem = async (item) => {
    const updatedList = [...(activeTask.checklist || []), item]
    const updated = { ...activeTask, checklist: updatedList }
    setActiveTask(updated)
    onUpdateTask?.(updated)
    try {
      await taskApi.updateTask(taskId, { checklist: updatedList })
    } catch (err) {
      console.error('Failed to add checklist item in MongoDB:', err)
    }
  }

  const handleToggleChecklistItem = async (itemId) => {
    const updatedList = (activeTask.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    const updated = { ...activeTask, checklist: updatedList }
    setActiveTask(updated)
    onUpdateTask?.(updated)
    try {
      await taskApi.updateTask(taskId, { checklist: updatedList })
    } catch (err) {
      console.error('Failed to toggle checklist item in MongoDB:', err)
    }
  }

  const handleDeleteChecklistItem = async (itemId) => {
    const updatedList = (activeTask.checklist || []).filter((item) => item.id !== itemId)
    const updated = { ...activeTask, checklist: updatedList }
    setActiveTask(updated)
    onUpdateTask?.(updated)
    try {
      await taskApi.updateTask(taskId, { checklist: updatedList })
    } catch (err) {
      console.error('Failed to delete checklist item in MongoDB:', err)
    }
  }

  // Comment Posting with Optimistic Append
  const handleAddComment = async (text) => {
    if (!text || isPostingComment) return
    setIsPostingComment(true)

    const actorEmail = currentUser?.email || ''
    const actorName = currentUser?.name || currentUser?.username || actorEmail.split('@')[0] || 'User'

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      taskId,
      comment: text,
      userEmail: actorEmail,
      userName: actorName,
      createdAt: new Date().toISOString(),
    }

    setComments((prev) => [...prev, optimisticComment])

    try {
      const payload = {
        comment: text,
        projectId: activeTask.projectId || null,
        userEmail: actorEmail,
        userName: actorName,
      }
      const res = await taskApi.addComment(taskId, payload)
      const freshList = await taskApi.getComments(taskId)
      setComments(Array.isArray(freshList) ? freshList : [])

      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to save comment in MongoDB:', err)
      // Rollback
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
    } finally {
      setIsPostingComment(false)
    }
  }

  // Edit Comment in MongoDB task_comments
  const handleEditComment = async (commentId, newText) => {
    try {
      await taskApi.editComment(taskId, commentId, { comment: newText })
      const freshList = await taskApi.getComments(taskId)
      setComments(Array.isArray(freshList) ? freshList : [])

      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to edit comment in MongoDB:', err)
    }
  }

  // Delete Comment in MongoDB task_comments
  const handleDeleteComment = async (commentId) => {
    try {
      await taskApi.deleteComment(taskId, commentId)
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId))

      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to delete comment in MongoDB:', err)
    }
  }

  // File Upload to MongoDB Attachments
  const handleUploadFile = async (file) => {
    if (!file || isUploadingFile) return
    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', 'task')
      formData.append('entityId', String(taskId))

      await taskApi.uploadAttachment(formData)
      const freshAttachments = await taskApi.getAttachments(taskId)
      setAttachments(Array.isArray(freshAttachments) ? freshAttachments : [])

      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to upload document to MongoDB:', err)
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleDeleteFile = async (attachmentId) => {
    try {
      await taskApi.deleteAttachment(attachmentId)
      setAttachments((prev) => prev.filter((a) => (a.id || a.legacyId || a._id) !== attachmentId))
      const freshActivity = await taskApi.getActivity(taskId).catch(() => [])
      setActivities(Array.isArray(freshActivity) ? freshActivity : [])
    } catch (err) {
      console.error('Failed to delete attachment in MongoDB:', err)
    }
  }

  const handleDownloadFile = (file) => {
    const attId = file.id || file.legacyId || file._id
    if (attId) {
      window.open(`/api/attachments/${attId}/download`, '_blank')
    }
  }

  // Time Entry Logging to MongoDB time_entries
  const handleAddTimeEntry = async (entryData) => {
    setIsLoggingTime(true)
    try {
      await taskApi.addTimeEntry(taskId, entryData)
      const freshEntries = await taskApi.getTimeEntries(taskId)
      setTimeEntries(Array.isArray(freshEntries) ? freshEntries : [])
    } catch (err) {
      console.error('Failed to log time entry in MongoDB:', err)
    } finally {
      setIsLoggingTime(false)
    }
  }

  // Final Submit / Save Button
  const handleSubmitSave = async () => {
    setIsSaving(true)
    try {
      await taskApi.updateTask(taskId, {
        title: activeTask.title,
        description: activeTask.description,
        status: activeTask.status,
        progress: activeTask.progress,
        subtasks: activeTask.subtasks,
        checklist: activeTask.checklist,
      })
      onClose?.()
    } catch (err) {
      console.error('Failed to submit task save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
          title="Close Workspace"
        >
          <FaTimes style={{ fontSize: '0.82rem' }} />
        </button>

        {/* Left Panel (44% width - Task Info & Attributes) */}
        <div style={styles.leftPanel}>
          <TaskInfoLeftPanel
            task={activeTask}
            availableUsers={resolvedUsers}
            onUpdateTaskField={handleUpdateTaskField}
            onAddAssignee={handleAddAssignee}
            onRemoveAssignee={handleRemoveAssignee}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            attachments={attachments}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onDownloadFile={handleDownloadFile}
            isUploadingFile={isUploadingFile}
            onAddChecklistItem={handleAddChecklistItem}
            onToggleChecklistItem={handleToggleChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
            onPrevTask={handlePrevTask}
            onNextTask={handleNextTask}
            onSubmitSave={handleSubmitSave}
            isSaving={isSaving}
            isAdmin={isAdmin}
          />
        </div>

        {/* Middle Divider */}
        <div style={styles.middleDivider} />

        {/* Right Panel (56% width - Collaboration & History) */}
        <div style={styles.rightPanel}>
          <TaskActivityRightPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            comments={comments}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            attachments={attachments}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onDownloadFile={handleDownloadFile}
            activities={activities}
            timeEntries={timeEntries}
            onAddTimeEntry={handleAddTimeEntry}
            readersData={readersData}
            currentUser={currentUser}
            isPostingComment={isPostingComment}
            isUploadingFile={isUploadingFile}
            isLoggingTime={isLoggingTime}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
