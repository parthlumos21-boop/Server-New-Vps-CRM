import React, { useMemo, useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Table from '../../../components/common/Table'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import './AdminMessagesPage.css'

const formatDateTime = (value) => {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  return parsedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const AdminMessagesPage = () => {
  const { user } = useAuth()
  const { messages, refreshMessages } = useData()
  const [, setRefreshTick] = useState(0)

  const handleRefresh = () => {
    refreshMessages()
    setRefreshTick((previous) => previous + 1)
  }

  const rows = useMemo(() => messages.map((entry) => ({
    ...entry,
    sentOn: formatDateTime(entry.createdAt),
    targetSummary: (entry.targetNames || entry.recipientUserNames || []).join(', '),
    recipientSummary: (entry.recipientUserNames || entry.targetNames || []).join(', '),
  })), [messages])

  const columns = [
    { key: 'sentOn', label: 'Sent On', width: '170px' },
    { key: 'senderName', label: 'From', width: '170px' },
    {
      key: 'targetSummary',
      label: 'To',
      width: '220px',
      render: (value) => <span title={value}>{value || '-'}</span>,
    },
    {
      key: 'recipientSummary',
      label: 'Recipients',
      render: (value, row) => (
        <div className="admin-messages-page-recipient-cell" title={value}>
          <div className="admin-messages-page-recipient-count">{row.recipientCount}</div>
          <div className="admin-messages-page-recipient-list">{value}</div>
        </div>
      ),
    },
    {
      key: 'body',
      label: 'Message',
      render: (value) => (
        <div className="admin-messages-page-body-cell" title={value}>
          {value}
        </div>
      ),
    },
  ]

  return (
    <div className="admin-messages-page">
      <Card
        title={user?.role === 'admin' ? 'Past Messages' : 'My Messages'}
        subtitle={user?.role === 'admin'
          ? 'Review sent messages, recipients, and delivery groups.'
          : 'Review your conversations and live admin responses.'}
        actions={(
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        )}
      >
        <Table
          columns={columns}
          data={rows}
          hoverable={false}
          emptyMessage="No past messages found"
        />
      </Card>
    </div>
  )
}

export default AdminMessagesPage
