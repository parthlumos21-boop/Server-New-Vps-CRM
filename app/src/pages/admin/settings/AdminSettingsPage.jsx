import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaCheckCircle, FaEnvelope, FaExternalLinkAlt, FaKey, FaQrcode, FaSyncAlt, FaTimesCircle } from 'react-icons/fa'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import integrationApi from '../../../services/integrationApi'
import './AdminSettingsPage.css'

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const AdminSettingsPage = () => {
  const { addNotification } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrationStatus, setIntegrationStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [error, setError] = useState('')
  const [deviceCode, setDeviceCode] = useState(null)

  const outlook = integrationStatus?.outlook || {}
  const connected = Boolean(outlook.connected)
  const configured = Boolean(outlook.configured)
  const shared = Boolean(outlook.shared)
  const qrUrl = authUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(authUrl)}`
    : ''

  const returnUrl = () => `${window.location.origin}${window.location.pathname}`

  const loadStatus = async ({ force = false } = {}) => {
    setIsLoading(true)
    try {
      const status = await integrationApi.getStatus({ force })
      setIntegrationStatus(status)
    } catch (_err) {
      addNotification('error', 'Outlook status unavailable', 'Unable to load Outlook connection status.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatus({ force: ['connected', 'error'].includes(searchParams.get('outlook')) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const result = searchParams.get('outlook')
    if (!['connected', 'error'].includes(result)) return

    if (result === 'connected') {
      const email = searchParams.get('outlookEmail') || ''
      setError('')
      addNotification('success', 'Outlook connected', email ? `CRM Outlook connected as ${email}.` : 'CRM Outlook connected.')
      loadStatus({ force: true })
    } else {
      const message = searchParams.get('outlookError') || 'Microsoft Outlook authorization failed.'
      setError(message)
      addNotification('error', 'Outlook connection failed', message)
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('outlook')
    nextParams.delete('outlookEmail')
    nextParams.delete('outlookError')
    setSearchParams(nextParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!deviceCode?.pending || connected) return undefined

    let stopped = false
    const intervalMs = Math.max(5, Number(deviceCode.interval || 5)) * 1000
    const timerId = window.setInterval(async () => {
      if (stopped) return
      try {
        const result = await integrationApi.completeOutlookDeviceCode()
        if (result.connected) {
          stopped = true
          window.clearInterval(timerId)
          setDeviceCode(null)
          await loadStatus({ force: true })
          addNotification('success', 'Outlook connected', `CRM Outlook connected as ${result.email || 'the selected mailbox'}.`)
          return
        }
        setDeviceCode((current) => current ? { ...current, ...result, pending: true } : current)
      } catch (err) {
        const message = err?.response?.data?.message || 'Microsoft code sign-in failed.'
        stopped = true
        window.clearInterval(timerId)
        setError(message)
        addNotification('error', 'Outlook connection failed', message)
      }
    }, intervalMs)

    return () => {
      stopped = true
      window.clearInterval(timerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, connected, deviceCode?.pending, deviceCode?.interval])

  const handleConnect = () => {
    setAction('connect')
    window.location.href = `/api/auth/microsoft/login?returnUrl=${encodeURIComponent(returnUrl())}`
  }

  const handleGenerateQr = async () => {
    setAction('qr')
    setError('')
    try {
      const result = await integrationApi.connectOutlook({ returnUrl: returnUrl() })
      setAuthUrl(result.authUrl || '')
      addNotification('success', 'Outlook QR ready', 'Scan the QR code to open Microsoft sign-in.')
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to create Outlook login QR.'
      setError(message)
      addNotification('error', 'QR unavailable', message)
    } finally {
      setAction('')
    }
  }

  const handleStartCode = async () => {
    setAction('code')
    setError('')
    try {
      const result = await integrationApi.startOutlookDeviceCode()
      setDeviceCode({ ...result, pending: true })
      const openUrl = result.verificationUriComplete || result.verificationUri
      if (openUrl) window.open(openUrl, '_blank', 'noopener,noreferrer')
      addNotification('success', 'Outlook code ready', `Enter code ${result.userCode} in Microsoft sign-in.`)
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to start Microsoft code sign-in.'
      setError(message)
      addNotification('error', 'Outlook code unavailable', message)
    } finally {
      setAction('')
    }
  }

  const handleDisconnect = async () => {
    setAction('disconnect')
    try {
      const status = await integrationApi.disconnectOutlook()
      setIntegrationStatus((current) => ({ ...(current || {}), outlook: status }))
      setAuthUrl('')
      setDeviceCode(null)
      addNotification('success', 'Outlook disconnected', 'The Outlook connection was removed.')
    } catch (_err) {
      addNotification('error', 'Outlook disconnect failed', 'Unable to disconnect Outlook.')
    } finally {
      setAction('')
    }
  }

  const handleTest = async () => {
    setAction('test')
    try {
      const result = await integrationApi.testOutlookConnection()
      await loadStatus({ force: true })
      addNotification('success', 'Outlook verified', `Microsoft Graph verified ${result.email || 'the connected account'}.`)
    } catch (err) {
      addNotification('error', 'Outlook test failed', err?.response?.data?.message || 'Unable to verify Outlook connection.')
    } finally {
      setAction('')
    }
  }

  const handleSendTest = async () => {
    setAction('email')
    try {
      const result = await integrationApi.sendOutlookTestEmail()
      addNotification(
        result.status === 'sent' ? 'success' : 'error',
        result.status === 'sent' ? 'Test email sent' : 'Test email failed',
        result.status === 'sent' ? 'Microsoft Graph sent the test email.' : 'Microsoft Graph did not confirm the email send.'
      )
    } catch (err) {
      addNotification('error', 'Test email failed', err?.response?.data?.message || 'Unable to send Outlook test email.')
    } finally {
      setAction('')
    }
  }

  return (
    <section className="outlook-admin-page">
      <header className="outlook-admin-hero">
        <div className="outlook-admin-hero__icon">
          <FaEnvelope />
        </div>
        <div>
          <span>Microsoft Graph API</span>
          <h1>Outlook Integration</h1>
          <p>Connect Outlook once with Microsoft OAuth. CRM stores encrypted tokens in MongoDB and uses Microsoft Graph for mail.</p>
        </div>
        <div className={`outlook-admin-state${connected ? ' outlook-admin-state--connected' : ''}`}>
          {connected ? <FaCheckCircle /> : <FaTimesCircle />}
          <strong>{isLoading ? 'Checking' : connected ? 'Connected' : 'Not Connected'}</strong>
        </div>
      </header>

      {error ? <div className="outlook-admin-error">{error}</div> : null}

      <div className="outlook-admin-layout">
        <div className="outlook-admin-panel outlook-admin-panel--main">
          <div className="outlook-admin-panel__head">
            <h2>Connection Details</h2>
            <Button variant="outline" icon={<FaSyncAlt />} onClick={() => loadStatus({ force: true })} loading={isLoading}>
              Refresh
            </Button>
          </div>

          <div className="outlook-admin-details">
            <div>
              <span>Outlook Email</span>
              <strong>{connected ? outlook.email || 'Connected' : '-'}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{connected ? 'Connected' : configured ? 'Ready to connect' : 'Missing server config'}</strong>
            </div>
            <div>
              <span>Connected Date</span>
              <strong>{formatDateTime(outlook.connectedAt || outlook.updatedAt)}</strong>
            </div>
            <div>
              <span>Microsoft Account</span>
              <strong>{connected ? outlook.displayName || '-' : '-'}</strong>
            </div>
            <div>
              <span>Token Status</span>
              <strong>{connected ? outlook.tokenStatus || 'Active' : '-'}</strong>
            </div>
            <div>
              <span>Availability</span>
              <strong>{connected ? (shared ? 'All users and admin' : 'Current user') : '-'}</strong>
            </div>
          </div>

          <div className="outlook-admin-actions">
            <Button onClick={handleConnect} disabled={!configured || action === 'connect'}>
              {action === 'connect' ? 'Connecting...' : connected ? 'Reconnect Outlook' : 'Connect Outlook'}
            </Button>
            <Button variant="outline" onClick={handleSendTest} disabled={!connected || action === 'email'}>
              Send Test Email
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={!connected || action === 'test'}>
              Test Connection
            </Button>
            <Button variant="outline" onClick={handleDisconnect} disabled={!connected || action === 'disconnect'}>
              Disconnect
            </Button>
          </div>
        </div>

        <aside className="outlook-admin-panel outlook-admin-panel--assist">
          <div className="outlook-helper">
            <FaKey />
            <div>
              <h3>Code Sign-In</h3>
              <p>Use this when the normal Microsoft login opens a long page or needs another device.</p>
            </div>
          </div>

          {deviceCode?.userCode ? (
            <div className="outlook-device-code-box">
              <span>Microsoft Code</span>
              <strong>{deviceCode.userCode}</strong>
              <small>{deviceCode.message || `Open ${deviceCode.verificationUri || 'https://www.microsoft.com/link'} and enter this code.`}</small>
              <Button
                variant="outline"
                icon={<FaExternalLinkAlt />}
                onClick={() => window.open(deviceCode.verificationUriComplete || deviceCode.verificationUri, '_blank', 'noopener,noreferrer')}
              >
                Open Microsoft
              </Button>
            </div>
          ) : (
            <Button variant="outline" fullWidth onClick={handleStartCode} disabled={!configured || action === 'code'}>
              {action === 'code' ? 'Preparing Code...' : 'Connect with Code'}
            </Button>
          )}

          <div className="outlook-helper outlook-helper--qr">
            <FaQrcode />
            <div>
              <h3>Login QR</h3>
              <p>Generate a QR that opens the same Microsoft OAuth login.</p>
            </div>
          </div>

          {qrUrl ? (
            <div className="outlook-qr-preview">
              <img src={qrUrl} alt="Outlook Microsoft sign-in QR code" />
              <Button variant="outline" icon={<FaExternalLinkAlt />} onClick={() => window.open(authUrl, '_blank', 'noopener,noreferrer')}>
                Open Login
              </Button>
            </div>
          ) : (
            <Button variant="outline" fullWidth onClick={handleGenerateQr} disabled={!configured || action === 'qr'}>
              {action === 'qr' ? 'Preparing QR...' : 'Generate QR'}
            </Button>
          )}
        </aside>
      </div>
    </section>
  )
}

export default AdminSettingsPage
