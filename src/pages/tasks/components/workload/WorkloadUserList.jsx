import React, { useState, useMemo } from 'react'
import { FaSearch, FaFilter, FaUsers } from 'react-icons/fa'
import { WorkloadUserRow } from './WorkloadUserRow'

export const WorkloadUserList = ({
  users = [],
  selectedUser,
  onSelectUser,
  favorites = new Set(),
  onToggleFavorite,
  departments = [],
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('all')
  const [utilizationFilter, setUtilizationFilter] = useState('all')

  const filteredUsers = useMemo(() => {
    let list = [...users]

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (u) =>
          String(u.name || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q) ||
          String(u.role || '').toLowerCase().includes(q) ||
          String(u.department || '').toLowerCase().includes(q)
      )
    }

    if (selectedDept !== 'all') {
      list = list.filter(
        (u) => String(u.department || '').toLowerCase() === selectedDept.toLowerCase()
      )
    }

    if (utilizationFilter !== 'all') {
      list = list.filter((u) => u.utilizationStatus === utilizationFilter)
    }

    // Sort: favorites on top, then alphabetical by name
    return list.sort((a, b) => {
      const aFav = favorites.has(String(a.email || '').toLowerCase()) ? 1 : 0
      const bFav = favorites.has(String(b.email || '').toLowerCase()) ? 1 : 0
      if (aFav !== bFav) return bFav - aFav
      const nameA = String(a.name || a.email || '')
      const nameB = String(b.name || b.email || '')
      return nameA.localeCompare(nameB)
    })
  }, [users, searchTerm, selectedDept, utilizationFilter, favorites])

  return (
    <div
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 175px)',
        maxHeight: 'calc(100vh - 175px)',
        minHeight: '520px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '0.85rem 0.95rem 0.75rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          backgroundColor: '#fafbfc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FaUsers style={{ color: '#c60016', fontSize: '0.9rem' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b' }}>
              Users
            </span>
          </div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: '#c60016',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              padding: '0.12rem 0.45rem',
              borderRadius: '10px',
            }}
          >
            {users.length}
          </span>
        </div>

        {/* Search Bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FaSearch
            style={{
              position: 'absolute',
              left: '0.65rem',
              color: '#94a3b8',
              fontSize: '0.74rem',
            }}
          />
          <input
            type="text"
            placeholder="Search and select..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.38rem 0.65rem 0.38rem 1.85rem',
              fontSize: '0.78rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#c60016'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0'
            }}
          />
        </div>

        {/* Filters: Utilization */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={utilizationFilter}
            onChange={(e) => setUtilizationFilter(e.target.value)}
            style={{
              width: '100%',
              fontSize: '0.72rem',
              fontWeight: '600',
              padding: '0.3rem 0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#475569',
              outline: 'none',
            }}
          >
            <option value="all">All Loads</option>
            <option value="available">Available (&lt;50%)</option>
            <option value="optimal">Optimal (50-100%)</option>
            <option value="overloaded">Overloaded (&gt;100%)</option>
          </select>
        </div>
      </div>

      {/* User Scrollable List */}
      <div
        className="workload-user-scroll-list"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.55rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
        }}
      >
        {loading && users.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.78rem',
            }}
          >
            Loading team members...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.78rem',
            }}
          >
            No users match criteria.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const emailKey = String(user.email || '').toLowerCase()
            const isSelected =
              String(selectedUser?.email || '').toLowerCase() === emailKey
            const isFav = favorites.has(emailKey)

            return (
              <WorkloadUserRow
                key={emailKey || user.id || user.name}
                user={user}
                isSelected={isSelected}
                onSelect={onSelectUser}
                isFavorite={isFav}
                onToggleFavorite={onToggleFavorite}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export default WorkloadUserList
