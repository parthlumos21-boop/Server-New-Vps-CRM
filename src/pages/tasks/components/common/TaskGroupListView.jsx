import React from 'react'
import {
  FaChevronDown,
  FaChevronRight,
  FaCheck,
  FaRegCommentDots,
  FaCodeBranch,
  FaSyncAlt,
  FaRegCheckSquare,
} from 'react-icons/fa'
import { TaskStatusPill } from './TaskStatusPill'

export const TaskGroupListView = ({
  groups = [],
  collapsedGroups = {},
  onToggleGroup,
  onToggleTaskDone,
  onOpenTask,
  onUpdateStatus,
  resolveAssigneeName,
  userNameMap = {},
}) => {
  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return ''
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return String(dateVal).slice(0, 10)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = d.getDate()
      const mon = months[d.getMonth()]
      const yr = String(d.getFullYear()).slice(-2)
      return `${day} ${mon}'${yr}`
    } catch {
      return String(dateVal).slice(0, 10)
    }
  }

  const getPriorityColor = (prio) => {
    const p = String(prio || 'medium').toLowerCase()
    if (p === 'urgent' || p === 'high') return '#ef4444' // red
    if (p === 'medium') return '#f59e0b' // amber
    if (p === 'low') return '#10b981' // green
    return '#3b82f6' // blue
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '0.75rem 1.25rem 1.5rem 1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Table Column Headers matching Image 1 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 3fr) 100px minmax(140px, 1.5fr) 90px 70px 110px',
          alignItems: 'center',
          padding: '0.6rem 0.75rem',
          borderBottom: '1.5px solid #f1f5f9',
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}
      >
        <div>Task Name</div>
        <div style={{ textAlign: 'left' }}>Due Date</div>
        <div style={{ textAlign: 'left' }}>Related</div>
        <div style={{ textAlign: 'center' }}>Assignee</div>
        <div style={{ textAlign: 'center' }}>Reporter</div>
        <div style={{ textAlign: 'right' }}>Status</div>
      </div>

      {groups.length === 0 || groups.every((g) => g.tasks.length === 0) ? (
        <div
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.88rem',
            background: '#f8fafc',
            borderRadius: '12px',
          }}
        >
          No tasks found matching current filters.
        </div>
      ) : (
        groups.map((group) => {
          if (group.tasks.length === 0) return null
          const isCollapsed = Boolean(collapsedGroups[group.key])

          return (
            <div key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Group Accordion Header */}
              <div
                onClick={() => onToggleGroup(group.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.5rem 0.25rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    color: '#64748b',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                </span>
                <span
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: '800',
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {group.label}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '0.12rem 0.52rem',
                    borderRadius: '999px',
                  }}
                >
                  {group.tasks.length}
                </span>
              </div>

              {/* Group Task Rows */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.tasks
                    .filter((task) => task && (task.id || task.legacyId || task._id) && String(task.title || '').trim().length > 0)
                    .map((task) => {
                    const isDone = ['completed', 'closed'].includes(
                      String(task.status || '').toLowerCase()
                    )
                    const prioColor = getPriorityColor(task.priority)

                    // Assignees resolution
                    const assignees =
                      Array.isArray(task.assignedToUserEmails) && task.assignedToUserEmails.length > 0
                        ? task.assignedToUserEmails
                        : task.assignedTo
                        ? [task.assignedTo]
                        : []

                    const primaryAssignee = assignees[0]
                    const primaryName = resolveAssigneeName(primaryAssignee)
                    const primaryInitial = (primaryName.charAt(0) || 'U').toUpperCase()

                    // Reporter resolution
                    const reporterName = resolveAssigneeName(task.createdBy)
                    const reporterInitial = (reporterName.charAt(0) || 'U').toUpperCase()

                    // Subtask / checklist counter
                    const subtaskCount = Array.isArray(task.subtasks) ? task.subtasks.length : 0
                    const completedSubtasks = Array.isArray(task.subtasks)
                      ? task.subtasks.filter((st) => st.completed).length
                      : 0

                    // Related deal / account
                    const relatedText =
                      task.dealName ||
                      task.accountName ||
                      task.projectName ||
                      (task.dealId ? `Deal #${String(task.dealId).slice(-4)}` : null) ||
                      (task.accountId ? `Account #${String(task.accountId).slice(-4)}` : null)

                    return (
                      <div
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(280px, 3fr) 100px minmax(140px, 1.5fr) 90px 70px 110px',
                          alignItems: 'center',
                          padding: '0.65rem 0.75rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isDone ? '#fafafa' : '#ffffff',
                          transition: 'background 0.12s ease',
                          borderRadius: '8px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDone ? '#fafafa' : '#ffffff'
                        }}
                      >
                        {/* 1. Task Name + Indicators */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            minWidth: 0,
                            paddingRight: '0.75rem',
                          }}
                        >
                          {/* Circular completion checkbox */}
                          <button
                            type="button"
                            onClick={(e) => onToggleTaskDone(task, e)}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isDone ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                              background: isDone ? '#16a34a' : 'transparent',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                              outline: 'none',
                            }}
                            title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                          >
                            {isDone && <FaCheck style={{ fontSize: '0.55rem' }} />}
                          </button>

                          {/* Priority colored square dot */}
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              background: prioColor,
                              flexShrink: 0,
                            }}
                            title={`Priority: ${task.priority || 'medium'}`}
                          />

                          {/* Assignee Avatar initial */}
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: '#334155',
                              fontSize: '0.7rem',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            title={`Assigned: ${primaryName}`}
                          >
                            {primaryInitial}
                          </div>

                          {/* Title */}
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              color: isDone ? '#94a3b8' : '#1e293b',
                              textDecoration: isDone ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: '0 1 auto',
                            }}
                          >
                            {task.title}
                          </span>

                          {/* Subtasks / Steps Tag (e.g. 2 🔀) */}
                          {subtaskCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                color: '#64748b',
                                background: '#f1f5f9',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '6px',
                                flexShrink: 0,
                              }}
                              title={`${completedSubtasks}/${subtaskCount} steps completed`}
                            >
                              <span>{subtaskCount}</span>
                              <FaCodeBranch style={{ fontSize: '0.6rem' }} />
                            </span>
                          )}

                          {/* Sync / Recurring Indicator */}
                          {task.recurring && (
                            <FaSyncAlt
                              style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}
                              title="Recurring task"
                            />
                          )}

                          {/* Comments Badge */}
                          {task.commentsCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.68rem',
                                color: '#94a3b8',
                                flexShrink: 0,
                              }}
                              title={`${task.commentsCount} comments`}
                            >
                              <FaRegCommentDots />
                              <span>{task.commentsCount}</span>
                            </span>
                          )}
                        </div>

                        {/* 2. Due Date */}
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: '500',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDisplayDate(task.dueDate)}
                        </div>

                        {/* 3. Related Project / Account */}
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#475569',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            paddingRight: '0.5rem',
                          }}
                          title={relatedText || ''}
                        >
                          {relatedText || '—'}
                        </div>

                        {/* 4. Assignee Avatar Cluster */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {assignees.slice(0, 2).map((aEmail, idx) => {
                              const aName = resolveAssigneeName(aEmail)
                              const aInitial = (aName.charAt(0) || 'U').toUpperCase()
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: idx === 0 ? '#3b82f6' : '#8b5cf6',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1.5px solid #ffffff',
                                    marginLeft: idx > 0 ? '-6px' : '0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                  }}
                                  title={aName}
                                >
                                  {aInitial}
                                </div>
                              )
                            })}
                            {assignees.length > 2 && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  color: '#64748b',
                                  marginLeft: '0.2rem',
                                }}
                              >
                                +{assignees.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 5. Reporter */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: '22px',
                              height: '22px',
                            }}
                          >
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e2e8f0',
                              }}
                              title={`Reporter: ${reporterName}`}
                            >
                              {reporterInitial}
                            </div>
                            {/* Online green indicator dot */}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '-1px',
                                right: '-1px',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                border: '1px solid #ffffff',
                              }}
                            />
                          </div>
                        </div>

                        {/* 6. Status Pill Dropdown */}
                        <div style={{ textAlign: 'right' }}>
                          <TaskStatusPill
                            status={task.status}
                            onStatusChange={(newStatus) => onUpdateStatus(task.id, newStatus)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default TaskGroupListView
