import React, { useEffect, useMemo, useState } from 'react'
import { FaEnvelope, FaPaperPlane, FaRedo, FaSearch, FaSyncAlt } from 'react-icons/fa'
import Button from '../../components/common/Button'
import integrationApi from '../../services/integrationApi'
import './OutlookMailPage.css'

const FOLDERS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'sent', label: 'Sent' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'deleted', label: 'Deleted' },
]

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const OutlookMailPage = () => {
  const [folder, setFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(null)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [compose, setCompose] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    message: '',
  })

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) || messages[0] || null,
    [messages, selectedId]
  )

  const loadStatus = async () => {
    const result = await integrationApi.getStatus({ force: true })
    setStatus(result?.outlook || {})
  }

  const loadProfile = async () => {
    try {
      const result = await integrationApi.getOutlookProfile()
      setProfile(result)
    } catch {
      setProfile(null)
    }
  }

  const loadMessages = async (nextFolder = folder) => {
    setLoading(true)
    setError('')
    try {
      await loadStatus()
      await loadProfile()
      const result = await integrationApi.getOutlookMessages({
        folder: nextFolder,
        search,
        limit: 25,
      })
      const nextMessages = Array.isArray(result.messages) ? result.messages : []
      setMessages(nextMessages)
      setSelectedId(nextMessages[0]?.id || '')
    } catch (err) {
      setMessages([])
      setSelectedId('')
      setError(err?.response?.data?.message || 'Unable to load Outlook mail.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages(folder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder])

  const handleSend = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await integrationApi.sendOutlookEmail(compose)
      setCompose({ to: '', cc: '', bcc: '', subject: '', message: '' })
      setFolder('sent')
      await loadMessages('sent')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send Outlook email.')
    } finally {
      setSending(false)
    }
  }

  const connected = Boolean(status?.connected)

  return (
    <section className="outlook-mail-page">
      <header className="outlook-mail-header">
        <div className="outlook-mail-title">
          <span><FaEnvelope /></span>
          <div>
            <h1>Outlook Mail</h1>
            <p>{connected ? profile?.email || status?.email || 'Microsoft connected' : 'Microsoft Outlook is not connected'}</p>
          </div>
        </div>
        <div className={`outlook-mail-status${connected ? ' outlook-mail-status--connected' : ''}`}>
          {connected ? 'Outlook Connected' : 'Not Connected'}
        </div>
      </header>

      <div className="outlook-mail-meta">
        <div>
          <span>Microsoft Account</span>
          <strong>{profile?.displayName || status?.displayName || '-'}</strong>
        </div>
        <div>
          <span>Tenant ID</span>
          <strong>{profile?.tenantId || 'Configured'}</strong>
        </div>
        <div>
          <span>Token Status</span>
          <strong>{connected ? 'Active with auto refresh' : 'Waiting for login'}</strong>
        </div>
        <div>
          <span>Last Sync</span>
          <strong>{formatDateTime(profile?.lastSync || status?.updatedAt)}</strong>
        </div>
      </div>

      {error ? <div className="outlook-mail-error">{error}</div> : null}

      <div className="outlook-mail-layout">
        <aside className="outlook-mail-sidebar">
          <div className="outlook-folder-tabs">
            {FOLDERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={folder === item.key ? 'active' : ''}
                onClick={() => setFolder(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="outlook-search" onSubmit={(event) => { event.preventDefault(); loadMessages(folder) }}>
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mail" />
            <button type="submit" aria-label="Search"><FaRedo /></button>
          </form>

          <Button variant="outline" fullWidth icon={<FaSyncAlt />} onClick={() => loadMessages(folder)} loading={loading}>
            Refresh
          </Button>
        </aside>

        <main className="outlook-message-list">
          {loading ? <div className="outlook-empty">Loading mail...</div> : null}
          {!loading && messages.length === 0 ? <div className="outlook-empty">No messages found.</div> : null}
          {messages.map((message) => (
            <button
              key={message.id}
              type="button"
              className={`outlook-message-row${selectedMessage?.id === message.id ? ' active' : ''}`}
              onClick={() => setSelectedId(message.id)}
            >
              <strong>{message.subject}</strong>
              <span>{message.from?.name || message.from?.address || message.to?.[0]?.address || status?.email || '-'}</span>
              <p>{message.bodyPreview}</p>
              <small>{formatDateTime(message.receivedDateTime || message.sentDateTime)}</small>
            </button>
          ))}
        </main>

        <aside className="outlook-compose-panel">
          <form onSubmit={handleSend}>
            <h2>Compose</h2>
            <input value={compose.to} onChange={(event) => setCompose({ ...compose, to: event.target.value })} placeholder="To" required />
            <input value={compose.cc} onChange={(event) => setCompose({ ...compose, cc: event.target.value })} placeholder="CC" />
            <input value={compose.bcc} onChange={(event) => setCompose({ ...compose, bcc: event.target.value })} placeholder="BCC" />
            <input value={compose.subject} onChange={(event) => setCompose({ ...compose, subject: event.target.value })} placeholder="Subject" />
            <textarea value={compose.message} onChange={(event) => setCompose({ ...compose, message: event.target.value })} placeholder="Message" rows={8} />
            <Button type="submit" fullWidth icon={<FaPaperPlane />} loading={sending} disabled={!connected}>
              Send
            </Button>
          </form>
        </aside>
      </div>
    </section>
  )
}

export default OutlookMailPage
