import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Badge from '../../../components/common/Badge'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Table from '../../../components/common/Table'
import {
  approveUser,
  disableUser,
  enableUser,
  fetchAllRegisteredUsers,
  rejectUser,
} from '../../../features/adminUsers/pendingApprovalsApi'
import './UserApprovalsPanel.css'

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'disabled', label: 'Disabled' },
]

const STATUS_VARIANT = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  disabled: 'default',
}

const UserApprovalsPanel = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAllRegisteredUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load registered users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return users.filter((u) => u.role !== 'admin' && u.status === activeTab)
  }, [users, activeTab])

  const counts = useMemo(() => {
    const map = { pending: 0, approved: 0, rejected: 0, disabled: 0 }
    users.forEach((u) => {
      if (u.role !== 'admin' && map[u.status] !== undefined) {
        map[u.status] += 1
      }
    })
    return map
  }, [users])

  const runAction = async (action, row) => {
    setBusyId(row.id)
    setError('')
    try {
      await action(row.id)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = (row) => {
    const isBusy = busyId === row.id
    if (row.status === 'pending') {
      return (
        <div className="user-approvals-actions">
          <Button size="small" variant="primary" disabled={isBusy} onClick={() => runAction(approveUser, row)}>
            Approve
          </Button>
          <Button size="small" variant="danger" disabled={isBusy} onClick={() => runAction(rejectUser, row)}>
            Reject
          </Button>
        </div>
      )
    }
    if (row.status === 'approved') {
      return (
        <div className="user-approvals-actions">
          <Button size="small" variant="outline" disabled={isBusy} onClick={() => runAction(disableUser, row)}>
            Disable
          </Button>
        </div>
      )
    }
    if (row.status === 'disabled') {
      return (
        <div className="user-approvals-actions">
          <Button size="small" variant="primary" disabled={isBusy} onClick={() => runAction(enableUser, row)}>
            Re-enable
          </Button>
        </div>
      )
    }
    if (row.status === 'rejected') {
      return (
        <div className="user-approvals-actions">
          <Button size="small" variant="primary" disabled={isBusy} onClick={() => runAction(approveUser, row)}>
            Approve
          </Button>
        </div>
      )
    }
    return null
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'isOnline',
      label: 'Presence',
      width: '110px',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>{value ? 'Online' : 'Offline'}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (value) => (
        <Badge variant={STATUS_VARIANT[value] || 'default'}>{value}</Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Registered',
      width: '160px',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '220px',
      render: (_, row) => renderActions(row),
    },
  ]

  return (
    <Card
      title="User Approvals"
      subtitle="Review newly registered users. Approve, reject, or disable accounts."
      actions={<Button size="small" variant="outline" onClick={load} disabled={loading}>Refresh</Button>}
    >
      <div className="user-approvals-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`user-approvals-tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="user-approvals-tab-count">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && <div className="user-approvals-error">{error}</div>}

      <Table
        columns={columns}
        data={filtered}
        emptyMessage={loading ? 'Loading users...' : 'No users in this status.'}
      />
    </Card>
  )
}

export default UserApprovalsPanel
