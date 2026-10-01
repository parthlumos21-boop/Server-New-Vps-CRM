import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { FaCheckCircle, FaEnvelope, FaExternalLinkAlt, FaPlug, FaQrcode } from 'react-icons/fa'
import Button from '../../components/common/Button'
import integrationApi from '../../services/integrationApi'
import '../auth/Login.css'
import './IntegrationQrPage.css'

const INTEGRATIONS = [
  {
    key: 'outlook',
    name: 'Microsoft 365',
    mode: 'Microsoft 365',
    url: 'https://outlook.office.com/mail/',
    icon: FaEnvelope,
  },
]

const buildQrUrl = (value) => (
  `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(value)}`
)

const IntegrationQrPage = () => {
  const { channel } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const normalizedChannel = String(channel || '').toLowerCase()

  const [integrationStatus, setIntegrationStatus] = useState(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [outlookAuthUrl, setOutlookAuthUrl] = useState('')
  const [outlookGenerating, setOutlookGenerating] = useState(false)
  const [outlookError, setOutlookError] = useState('')

  const loadStatus = async ({ force = false } = {}) => {
    setIsLoadingStatus(true)
    try {
      const status = await integrationApi.getStatus({ force })
      setIntegrationStatus(status)
    } catch (error) {
      setOutlookError(error?.response?.data?.message || 'Unable to load Outlook status.')
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    loadStatus({ force: ['connected', 'error'].includes(searchParams.get('outlook')) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const outlookResult = searchParams.get('outlook')
    if (!['connected', 'error'].includes(outlookResult)) return

    if (outlookResult === 'error') {
      setOutlookError(searchParams.get('outlookError') || 'Microsoft Outlook authorization failed.')
    } else {
      setOutlookError('')
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('outlook')
    nextParams.delete('outlookEmail')
    nextParams.delete('outlookError')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const formatOutlookDateTime = (value) => {
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

  const handleOpenOutlookLink = async () => {
    if (outlookAuthUrl) {
      window.open(outlookAuthUrl, '_blank', 'noopener,noreferrer')
      return
    }

    await handleGenerateOutlookLink(true)
  }

  const handleGenerateOutlookLink = async (openAfterGenerate = false) => {
    setOutlookGenerating(true)
    setOutlookError('')
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`
      const result = await integrationApi.connectOutlook({ returnUrl })
      const nextAuthUrl = result.authUrl || ''
      setOutlookAuthUrl(nextAuthUrl)
      if (openAfterGenerate && nextAuthUrl) {
        window.open(nextAuthUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      setOutlookError(error?.response?.data?.message || 'Failed to generate Outlook link.')
    } finally {
      setOutlookGenerating(false)
    }
  }

  const isOutlook = normalizedChannel === 'outlook'
  const isAll = !isOutlook

  const selectedIntegration = INTEGRATIONS.find((integration) => integration.key === normalizedChannel)
  const cards = selectedIntegration ? [selectedIntegration] : INTEGRATIONS
  const pageTitle = isOutlook ? 'Microsoft 365 Integration' : 'Integrations'
  const outlookStatus = integrationStatus?.outlook || {}
  const outlookConnected = Boolean(outlookStatus.connected)
  const outlookConfigured = Boolean(outlookStatus.configured)

  return (
    <section className="integration-qr-page">
      <div className="integration-qr-header">
        <div className="integration-qr-header__icon">
          <FaQrcode />
        </div>
        <div>
          <span className="integration-qr-kicker">Active Integrations</span>
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className={`integration-qr-grid${selectedIntegration ? ' integration-qr-grid--single' : ''}`}>
        
        {isAll && cards.map((integration) => {
          const IntegrationIcon = integration.icon

          return (
            <article
              key={integration.key}
              className={`integration-qr-card integration-qr-card--${integration.key}`}
            >
              <div className="integration-qr-card__top">
                <span className="integration-qr-card__icon">
                  <IntegrationIcon />
                </span>
                <div>
                  <span className="integration-qr-card__status">Active</span>
                  <h2>{integration.name}</h2>
                  <p>{integration.mode}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="medium"
                fullWidth
                icon={<FaExternalLinkAlt />}
                onClick={() => {
                  window.location.href = `${window.location.pathname.replace(/\/integrations.*/, '')}/integrations/${integration.key}`
                }}
              >
                Configure {integration.name}
              </Button>
            </article>
          )
        })}

        {isOutlook && (
          <div className="integration-section" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
            <div className="integration-section-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <FaEnvelope className="integration-icon outlook-icon" style={{ fontSize: '24px', color: '#0078D4' }} />
              <h3 style={{ margin: 0, fontSize: '20px' }}>Microsoft 365 Connection</h3>
            </div>
            
            <div className="outlook-settings-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <style>
                {`
                  @media (min-width: 992px) {
                    .outlook-settings-layout {
                      flex-direction: row !important;
                    }
                    .outlook-qr-container {
                      flex: 1;
                    }
                    .outlook-settings-panel {
                      width: 350px;
                      flex-shrink: 0;
                    }
                  }
                `}
              </style>
              <div className="outlook-settings-panel" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', height: 'fit-content' }}>
                <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1e293b' }}>Connection Status</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: outlookConnected ? '#047857' : '#b45309', fontWeight: 700 }}>
                  {outlookConnected ? <FaCheckCircle /> : <FaPlug />}
                  <span>{isLoadingStatus ? 'Checking...' : outlookConnected ? 'Connected' : 'Not Connected'}</span>
                </div>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '18px', color: '#475569', fontSize: '14px' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Connected Outlook Email</strong>
                    <span>{outlookConnected ? outlookStatus.email || 'Connected' : '-'}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Microsoft Display Name</strong>
                    <span>{outlookConnected ? outlookStatus.displayName || '-' : '-'}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Last Connected Time</strong>
                    <span>{formatOutlookDateTime(outlookStatus.connectedAt || outlookStatus.updatedAt)}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Graph Setup</strong>
                    <span>{outlookConfigured ? 'Configured' : 'Missing environment variables'}</span>
                  </div>
                </div>
                <p style={{ marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
                  Admin Outlook connections are shared so users can send CRM email with the connected mailbox.
                </p>
                <Button 
                  variant="primary" 
                  onClick={handleOpenOutlookLink}
                  disabled={!outlookConfigured || outlookGenerating} 
                  fullWidth
                >
                  {outlookGenerating ? 'Generating...' : outlookConnected ? 'Reconnect Outlook' : 'Connect Outlook'}
                </Button>
                {outlookError && (
                  <div className="integration-message error" style={{ marginTop: '16px', padding: '8px', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                    {outlookError}
                  </div>
                )}
              </div>
              
              <div className="outlook-qr-container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px', backgroundColor: '#fff', minHeight: '350px' }}>
                {outlookAuthUrl ? (
                  <>
                    <h4 style={{ marginTop: 0, marginBottom: '24px', fontSize: '18px', color: '#1e293b' }}>Scan or Click to Connect</h4>
                    <img 
                      src={buildQrUrl(outlookAuthUrl)} 
                      alt="Microsoft 365 QR Code" 
                      style={{ width: '220px', height: '220px', marginBottom: '24px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }} 
                    />
                    <a 
                      href={outlookAuthUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', backgroundColor: '#0078D4', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 500 }}
                    >
                      Open Link <FaExternalLinkAlt style={{ fontSize: '14px' }} />
                    </a>
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px' }}>
                    {outlookConnected ? 'Outlook is connected. Use Reconnect Outlook only when you need to refresh the mailbox login.' : 'Click Connect Outlook to open the Microsoft login URL.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  )
}

export default IntegrationQrPage
