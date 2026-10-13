import React, { useState } from 'react'
import {
  FaRegCircle,
  FaCheckCircle,
  FaCalendarAlt,
  FaSyncAlt,
  FaFolder,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaBriefcase,
  FaBuilding,
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import TaskHeaderMeta from './TaskHeaderMeta'
import TaskAssigneePills from './TaskAssigneePills'
import TaskSubtasksSection from './TaskSubtasksSection'
import TaskAttachmentsMiniList from './TaskAttachmentsMiniList'
import TaskChecklistSection from './TaskChecklistSection'

export default function TaskInfoLeftPanel({
  task = {},
  availableUsers = [],
  onUpdateTaskField,
  onAddAssignee,
  onRemoveAssignee,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  attachments = [],
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  isUploadingFile = false,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onPrevTask,
  onNextTask,
  onSubmitSave,
  isSaving = false,
  isAdmin = false,
}) {
  const navigate = useNavigate()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title || '')
  const [descValue, setDescValue] = useState(task.description || '')

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdateTaskField('title', titleValue.trim())
    }
  }

  const handleDescBlur = () => {
    if (descValue !== task.description) {
      onUpdateTaskField('description', descValue)
    }
  }

  const toggleTaskCompletion = () => {
    const isCompleted = task.status === 'completed'
    onUpdateTaskField('status', isCompleted ? 'open' : 'completed')
  }

  // Format Dates
  const startDateStr = task.startDate
    ? new Date(task.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : '14 Dec\'21'
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : '18 Dec\'21'
  const dateRangeLabel = `${startDateStr} - ${dueDateStr}`

  const isCompleted = task.status === 'completed'

  const resolveCreatorName = (taskItem, usersList = []) => {
    if (!taskItem) return 'Admin'
    if (taskItem.createdByName && isNaN(taskItem.createdByName) && !taskItem.createdByName.includes('@')) {
      return taskItem.createdByName
    }
    const raw = String(taskItem.createdBy || taskItem.createdByName || taskItem.createdByEmail || '').trim()
    if (!raw) return 'Admin'

    const matched = (usersList || []).find((u) => {
      const uId = String(u.legacyId || u.id || u._id || '')
      const uEmail = String(u.email || '').toLowerCase().trim()
      const uUsername = String(u.username || '').toLowerCase().trim()
      const target = raw.toLowerCase()
      return uId === raw || uEmail === target || uUsername === target
    })

    if (matched) {
      return matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.username || matched.email
    }

    if (raw.includes('@')) {
      const prefix = raw.split('@')[0]
      return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }

    return taskItem.createdByName || raw
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header Meta */}
      <TaskHeaderMeta
        task={task}
        creatorName={resolveCreatorName(task, availableUsers)}
        progress={typeof task.progress === 'number' ? task.progress : 0}
        status={task.status || 'open'}
        priority={task.priority || 'medium'}
        onUpdateStatus={(st) => onUpdateTaskField('status', st)}
        onCopyLink={() => {
          navigator.clipboard?.writeText(window.location.href)
        }}
      />

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Title Row with Completion Circle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={toggleTaskCompletion}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              fontSize: '1.25rem',
              color: isCompleted ? '#10b981' : '#cbd5e1',
              flexShrink: 0,
            }}
            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
          >
            {isCompleted ? <FaCheckCircle /> : <FaRegCircle />}
          </button>

          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Enter Task Name..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '1.15rem',
              fontWeight: '800',
              color: isCompleted ? '#64748b' : '#0f172a',
              textDecoration: isCompleted ? 'line-through' : 'none',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Description Box */}
        <div>
          <textarea
            rows={3}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="The user interface (UI) is a critical part of any software product..."
            style={{
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              fontSize: '0.84rem',
              color: '#334155',
              backgroundColor: '#fafbfc',
              outline: 'none',
              resize: 'vertical',
              lineHeight: '1.5',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Dates & Recurrence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.76rem', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaCalendarAlt style={{ color: '#94a3b8' }} />
            <span style={{ fontWeight: '600' }}>{dateRangeLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb' }}>
            <FaSyncAlt style={{ fontSize: '0.7rem' }} />
            <span style={{ fontWeight: '600' }}>Yearly</span>
          </div>
        </div>

        {/* CRM Linked Records Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {task.projectId ? (
            <button
              type="button"
              onClick={() => navigate(isAdmin ? `/admin/tasks/projects` : `/tasks/projects`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #dbeafe',
                cursor: 'pointer',
              }}
            >
              <FaFolder style={{ fontSize: '0.7rem' }} />
              <span>Project #{task.projectId}</span>
            </button>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #e2e8f0',
              }}
            >
              <FaFolder style={{ fontSize: '0.7rem' }} />
              <span>General Task</span>
            </span>
          )}

          {task.dealId && (
            <button
              type="button"
              onClick={() => navigate(isAdmin ? `/admin/deals/view/${task.dealId}` : `/deals/view/${task.dealId}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <FaBriefcase style={{ fontSize: '0.7rem' }} />
              <span>Deal #{task.dealId}</span>
            </button>
          )}

          {task.accountId && (
            <button
              type="button"
              onClick={() => navigate(isAdmin ? `/admin/accounts/my-accounts?accountId=${task.accountId}` : `/accounts/my-accounts?accountId=${task.accountId}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#faf5ff',
                color: '#7c3aed',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #ede9fe',
                cursor: 'pointer',
              }}
            >
              <FaBuilding style={{ fontSize: '0.7rem' }} />
              <span>Account #{task.accountId}</span>
            </button>
          )}
        </div>

        {/* Assigned Team Members */}
        <TaskAssigneePills
          assignees={
            Array.isArray(task.assignedToUserEmails) && task.assignedToUserEmails.length > 0
              ? task.assignedToUserEmails
              : (task.assignedTo ? [task.assignedTo] : [])
          }
          availableUsers={availableUsers}
          onAddAssignee={onAddAssignee}
          onRemoveAssignee={onRemoveAssignee}
        />

        {/* Subtasks Section */}
        <TaskSubtasksSection
          subtasks={Array.isArray(task.subtasks) ? task.subtasks : []}
          onAddSubtask={onAddSubtask}
          onToggleSubtask={onToggleSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />

        {/* Attachments Section */}
        <TaskAttachmentsMiniList
          attachments={attachments}
          onUploadFile={onUploadFile}
          onDeleteFile={onDeleteFile}
          onDownloadFile={onDownloadFile}
          isUploading={isUploadingFile}
        />

        {/* Checklist Section */}
        <TaskChecklistSection
          checklist={Array.isArray(task.checklist) ? task.checklist : []}
          groupTitle="Client Subscription"
          isMandatory={true}
          onAddItem={onAddChecklistItem}
          onToggleItem={onToggleChecklistItem}
          onDeleteItem={onDeleteChecklistItem}
        />
      </div>

      {/* Footer Navigation & Submit Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onPrevTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <FaChevronLeft style={{ fontSize: '0.65rem' }} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={onNextTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#2563eb',
              cursor: 'pointer',
            }}
          >
            <span>Next</span>
            <FaChevronRight style={{ fontSize: '0.65rem' }} />
          </button>
        </div>

        <button
          type="button"
          onClick={onSubmitSave}
          disabled={isSaving}
          style={{
            padding: '0.5rem 1.4rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: '700',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
          }}
        >
          {isSaving ? 'Saving...' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
