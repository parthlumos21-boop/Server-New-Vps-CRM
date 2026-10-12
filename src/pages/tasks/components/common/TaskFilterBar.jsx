import React from 'react'
import { FaFilter, FaPlus, FaSearch, FaSyncAlt } from 'react-icons/fa'

export const TaskFilterBar = ({
  searchQuery,
  onSearchChange,
  selectedAssignee,
  onAssigneeChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  userList = [],
  onRefresh,
  onAddTask,
  isRefreshing = false,
  showAddButton = true,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', flex: '1 1 auto' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '200px', flex: '1 1 auto' }}>
          <FaSearch
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '0.8rem',
            }}
          />
          <input
            type="text"
            placeholder="Search tasks, deals, accounts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.1rem',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Assignee Email Dropdown (MongoDB users) */}
        {userList.length > 0 && (
          <select
            value={selectedAssignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              background: '#ffffff',
              color: '#1e293b',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Assignees</option>
            {userList.map((u) => {
              const email = String(u.email || '').trim().toLowerCase()
              return (
                <option key={email} value={email}>
                  {u.name || email} ({u.role || 'user'})
                </option>
              )
            })}
          </select>
        )}

        {/* Status Dropdown */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.82rem',
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Under Review</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Priority Dropdown */}
        <select
          value={selectedPriority}
          onChange={(e) => onPriorityChange(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.82rem',
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {onRefresh && (
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Tasks"
          >
            <FaSyncAlt className={isRefreshing ? 'fa-spin' : ''} />
            <span>Refresh</span>
          </button>
        )}

        {showAddButton && onAddTask && (
          <button
            type="button"
            className="ap-tab-add"
            onClick={onAddTask}
          >
            <FaPlus />
            <span>New Task</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default TaskFilterBar
