import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck, FaKey, FaSyncAlt, FaTimes } from 'react-icons/fa'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { useAuth } from '../../../context/AuthContext'
import { passwordResetApi } from '../../../services/passwordResetApi'
import './PasswordResetRequestsPage.css'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getStatusLabel = (value) => {
  const normalizedStatus = String(value || '').toLowerCase()
  if (!normalizedStatus) return '-'
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
}

const PasswordResetRequestsPage = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState('all')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canApproveRequests = ['admin', 'super_admin'].includes(user?.role)
    || ['admin', 'super_admin'].includes(user?.actualRole)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await passwordResetApi.listRequests(status)
      setRequests(Array.isArray(response.data) ? response.data : [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load password reset requests.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests]
  )

  const handleApprove = async (request) => {
    if (!request?.id) return
    const confirmed = window.confirm(`Approve password reset for ${request.email}?`)
    if (!confirmed) return

    setActionId(`approve-${request.id}`)
    setError('')
    setMessage('')
    try {
      const response = await passwordResetApi.approveRequest(request.id)
      setMessage(response.message || 'Password reset approved.')
      await loadRequests()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to approve password reset request.')
    } finally {
      setActionId('')
    }
  }

  const handleReject = async (request) => {
    if (!request?.id) return
    const comment = window.prompt(`Reject password reset for ${request.email}? Add an optional comment:`, '')
    if (comment === null) return

    setActionId(`reject-${request.id}`)
    setError('')
    setMessage('')
    try {
      const response = await passwordResetApi.rejectRequest(request.id, comment)
      setMessage(response.message || 'Password reset request rejected.')
      await loadRequests()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reject password reset request.')
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="password-reset-requests-page">
      <div className="password-reset-requests-header">
        <div>
          <h1>Password Reset Requests</h1>
        </div>
        <div className="password-reset-requests-header-actions">
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter requests by status">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Button type="button" variant="secondary" icon={<FaSyncAlt />} onClick={loadRequests} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {!canApproveRequests ? (
        <Card className="password-reset-requests-card">
          <div className="password-reset-requests-state password-reset-requests-state--warning">
            Only admins can approve or reject password reset requests.
          </div>
        </Card>
      ) : null}

      {message ? <div className="password-reset-requests-message password-reset-requests-message--success">{message}</div> : null}
      {error ? <div className="password-reset-requests-message password-reset-requests-message--error">{error}</div> : null}

      <div className="password-reset-requests-list-header">
        <div>
          <strong>Requests</strong>
          <span>{requests.length} records shown. {pendingCount} pending.</span>
        </div>
      </div>

      {loading ? (
        <div className="password-reset-requests-empty">Loading requests...</div>
      ) : requests.length > 0 ? (
        <div className="password-reset-requests-grid">
          {requests.map((request) => {
            const normalizedStatus = String(request.status || '').toLowerCase()
            const isPending = normalizedStatus === 'pending'
            const adminAction = request.adminName
              ? `${request.adminName} at ${formatDateTime(request.adminActionAt)}`
              : '-'

            return (
              <article key={request.id} className="password-reset-request-card">
                <div className="password-reset-request-card-head">
                  <div className="password-reset-request-card-head-left">
                    <span className="password-reset-request-card-avatar" aria-hidden="true">
                      <FaKey />
                    </span>
                    <div className="password-reset-request-card-title">
                      <strong>{request.userName || request.email || 'Password Reset'}</strong>
                      <span>{request.email || '-'}</span>
                    </div>
                  </div>
                  <span className={`password-reset-status password-reset-status--${normalizedStatus}`}>
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <dl className="password-reset-request-card-fields">
                  <div className="password-reset-request-card-row">
                    <dt>Requested</dt>
                    <dd>{formatDateTime(request.createdAt)}</dd>
                  </div>
                  <div className="password-reset-request-card-row">
                    <dt>Admin Action</dt>
                    <dd>{adminAction}</dd>
                  </div>
                  <div className="password-reset-request-card-row">
                    <dt>Comment</dt>
                    <dd>{request.adminComment || '-'}</dd>
                  </div>
                </dl>

                <div className="password-reset-request-card-actions">
                  {isPending ? (
                    <>
                      <Button
                        type="button"
                        size="small"
                        className="btn-red-theme"
                        icon={<FaCheck />}
                        loading={actionId === `approve-${request.id}`}
                        disabled={!canApproveRequests || Boolean(actionId)}
                        onClick={() => handleApprove(request)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        icon={<FaTimes />}
                        loading={actionId === `reject-${request.id}`}
                        disabled={!canApproveRequests || Boolean(actionId)}
                        onClick={() => handleReject(request)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="password-reset-request-card-action-note">
                      {getStatusLabel(request.status)}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="password-reset-requests-empty">No password reset requests found.</div>
      )}
    </div>
  )
}

export default PasswordResetRequestsPage
