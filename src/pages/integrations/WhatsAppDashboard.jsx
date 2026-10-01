import React, { useEffect, useState } from 'react'
import { FaWhatsapp, FaCircle, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { integrationApi } from '../../services/integrationApi'
import { useData } from '../../context/DataContext'
import './WhatsAppDashboard.css'

const WhatsAppDashboard = () => {
  const { addNotification } = useData()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState(null)
  const [stats, setStats] = useState({ todayMessages: 0, unreadMessages: 0, totalChats: 0 })
  const [manualAuth, setManualAuth] = useState({ phoneNumberId: '', accessToken: '' })

  const fetchStatus = async () => {
    try {
      const res = await integrationApi.getWhatsappCloudStatus()
      setStatus(res)
      if (res?.connected) {
        const chats = await integrationApi.getWhatsappCloudChats()
        setStats({
          totalChats: chats.length,
          unreadMessages: chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0),
          todayMessages: 0 // Mock for now
        })
      }
    } catch (error) {
      addNotification('error', 'Error', 'Failed to fetch WhatsApp status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = async () => {
    if (!manualAuth.phoneNumberId || !manualAuth.accessToken) {
      return addNotification('error', 'Validation Failed', 'Phone Number ID and Access Token are required.')
    }
    setConnecting(true)
    try {
      await integrationApi.connectWhatsappCloudManual({
        phoneNumberId: manualAuth.phoneNumberId,
        accessToken: manualAuth.accessToken
      })
      await fetchStatus()
      addNotification('success', 'Connected', 'WhatsApp connected successfully')
    } catch (error) {
      addNotification('error', 'Connection Failed', error.message || 'Failed to connect using provided credentials')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setConnecting(true)
    try {
      await integrationApi.disconnectWhatsappCloud()
      await fetchStatus()
      addNotification('success', 'Disconnected', 'WhatsApp Cloud API disconnected successfully')
    } catch (error) {
      addNotification('error', 'Error', 'Failed to disconnect')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="wa-dash-loading">
        <FaSpinner className="wa-dash-spinner" />
        <p>Loading WhatsApp Integration...</p>
      </div>
    )
  }

  const isConnected = status?.connected

  return (
    <div className="wa-dash-container">
      <div className="wa-dash-header">
        <h1>WhatsApp Integration</h1>
        <p>Powered by Official WhatsApp Business Cloud API</p>
      </div>

      <div className="wa-dash-content">
        <div className="wa-dash-card">
          <div className="wa-dash-card-header">
            <FaWhatsapp className="wa-dash-icon" />
            <h2>Connection Status</h2>
          </div>
          
          <div className="wa-dash-card-body">
            <div className={`wa-status-badge ${isConnected ? 'wa-status-connected' : 'wa-status-disconnected'}`}>
              <FaCircle className="wa-status-dot" />
              <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>

            {isConnected ? (
              <div className="wa-connected-details">
                <div className="wa-detail-row">
                  <span className="wa-detail-label">Business Name:</span>
                  <span className="wa-detail-value">{status.businessName}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="wa-detail-label">Phone Number:</span>
                  <span className="wa-detail-value">{status.phoneNumber}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="wa-detail-label">Connected Since:</span>
                  <span className="wa-detail-value">{new Date(status.connectedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="wa-disconnected-details" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <FaExclamationTriangle className="wa-warning-icon" />
                  <p style={{ margin: 0 }}>API Keys are required. Enter your Meta WhatsApp Business credentials below.</p>
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="wa-detail-row" style={{ alignItems: 'center' }}>
                    <span className="wa-detail-label">Phone Number ID:</span>
                    <input 
                      type="text" 
                      className="wa-message-input" 
                      style={{ flex: 1, border: '1px solid #e2e8f0' }}
                      value={manualAuth.phoneNumberId}
                      onChange={(e) => setManualAuth(p => ({ ...p, phoneNumberId: e.target.value }))}
                      placeholder="e.g. 1029384756"
                    />
                  </div>
                  <div className="wa-detail-row" style={{ alignItems: 'center' }}>
                    <span className="wa-detail-label">API Key (Access Token):</span>
                    <input 
                      type="password" 
                      className="wa-message-input" 
                      style={{ flex: 1, border: '1px solid #e2e8f0' }}
                      value={manualAuth.accessToken}
                      onChange={(e) => setManualAuth(p => ({ ...p, accessToken: e.target.value }))}
                      placeholder="EAAI..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="wa-dash-card-footer">
            {isConnected ? (
              <>
                <button 
                  className="wa-btn wa-btn-danger" 
                  onClick={handleDisconnect}
                  disabled={connecting}
                >
                  {connecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
                <button className="wa-btn wa-btn-primary" onClick={() => window.location.href = window.location.pathname + '/chat'}>
                  Open Chat
                </button>
              </>
            ) : (
              <button 
                className="wa-btn wa-btn-primary" 
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? 'Connecting to Meta...' : 'Connect WhatsApp'}
              </button>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="wa-dash-stats">
            <div className="wa-stat-card">
              <h3>Today's Messages</h3>
              <div className="wa-stat-value">{stats.todayMessages}</div>
            </div>
            <div className="wa-stat-card">
              <h3>Unread Messages</h3>
              <div className="wa-stat-value wa-stat-warning">{stats.unreadMessages}</div>
            </div>
            <div className="wa-stat-card">
              <h3>Total Chats</h3>
              <div className="wa-stat-value">{stats.totalChats}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WhatsAppDashboard
