import React, { useState, useMemo } from 'react'
import {
  FaSearch,
  FaFilter,
  FaExchangeAlt,
  FaCalendarAlt,
  FaFolder,
  FaTasks,
} from 'react-icons/fa'
import { TaskStatusBadge } from '../common/TaskStatusBadge'

export const WorkloadUserTaskList = ({
  tasks = [],
  allUsers = [],
  onReassignTask,
  currentUserEmail,
}) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [reassigningTaskId, setReassigningTaskId] = useState(null)
  const [targetEmail, setTargetEmail] = useState('')

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const titleMatch = String(t.title || '').toLowerCase().includes(q)
        const projMatch = String(t.projectName || '').toLowerCase().includes(q)
        if (!titleMatch && !projMatch) return false
      }
      if (statusFilter !== 'all') {
        const s = String(t.status || '').toLowerCase().replace(/[\s-]+/g, '_')
        if (s !== statusFilter) return false
      }
      if (priorityFilter !== 'all') {
        const p = String(t.priority || '').toLowerCase().trim()
        if (p !== priorityFilter) return false
      }
      return true
    })
  }, [tasks, search, statusFilter, priorityFilter])

  const handleExecuteReassign = (taskId) => {
    if (!taskId || !targetEmail) return
    onReassignTask(taskId, targetEmail)
    setReassigningTaskId(null)
    setTargetEmail('')
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.15rem 1.25rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        <div style={{ position: 'relative', width: '240px' }}>
          <FaSearch
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '0.74rem',
            }}
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.35rem 0.65rem 0.35rem 1.85rem',
              fontSize: '0.78rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: '600',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#475569',
              outline: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Pending / Open</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: '600',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#475569',
              outline: 'none',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Task Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
              <th style={{ padding: '0.65rem 0.85rem' }}>Task</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Priority</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>Project / Deal</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>Due Date</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Est. Hours</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Reassign</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No tasks found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => {
                const taskId = t.id || t._id
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !['completed', 'closed'].includes(t.status)
                const isBeingReassigned = reassigningTaskId === taskId

                return (
                  <tr
                    key={taskId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
                  >
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <FaTasks style={{ color: '#c60016', fontSize: '0.75rem', flexShrink: 0 }} />
                        <span>{t.title}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <TaskStatusBadge value={t.status} />
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <TaskStatusBadge value={t.priority} type="priority" />
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                      {t.projectName || t.dealName || <span style={{ color: '#cbd5e1' }}>General</span>}
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {t.dueDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOverdue ? '#dc2626' : '#64748b' }}>
                          <FaCalendarAlt style={{ fontSize: '0.7rem' }} />
                          <span style={{ fontWeight: isOverdue ? '800' : '500' }}>
                            {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>No deadline</span>
                      )}
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#475569' }}>
                      {Math.round((t.estimatedMinutes || 120) / 60)}h
                    </td>

                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                      {isBeingReassigned ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <select
                            value={targetEmail}
                            onChange={(e) => setTargetEmail(e.target.value)}
                            style={{
                              padding: '2px 4px',
                              fontSize: '0.7rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              outline: 'none',
                              maxWidth: '120px',
                            }}
                          >
                            <option value="">Select User</option>
                            {allUsers.map((u) => (
                              <option key={u.email} value={u.email}>
                                {u.name || u.email}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleExecuteReassign(taskId)}
                            disabled={!targetEmail}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#c60016',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              cursor: targetEmail ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setReassigningTaskId(null); setTargetEmail('') }}
                            style={{
                              padding: '2px 6px',
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setReassigningTaskId(taskId); setTargetEmail('') }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '3px 8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c60016'
                            e.currentTarget.style.color = '#c60016'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1'
                            e.currentTarget.style.color = '#475569'
                          }}
                        >
                          <FaExchangeAlt style={{ fontSize: '0.65rem' }} />
                          <span>Reassign</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkloadUserTaskList
