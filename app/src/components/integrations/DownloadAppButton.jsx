import React, { useEffect, useState } from 'react'
import { FaDownload, FaExternalLinkAlt, FaTimes } from 'react-icons/fa'
import integrationApi from '../../services/integrationApi'
import './DownloadAppButton.css'

const DownloadAppButton = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [downloads, setDownloads] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || downloads || isLoading) return

    setIsLoading(true)
    setError('')
    integrationApi
      .getDownloads()
      .then((data) => setDownloads(data))
      .catch(() => setError('Unable to load app download options.'))
      .finally(() => setIsLoading(false))
  }, [downloads, isLoading, isOpen])

  const handleOpenDownload = (option) => {
    if (!option.available || !option.url) return
    window.open(option.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <button
        type="button"
        className={`download-app-trigger ${compact ? 'download-app-trigger--compact' : ''}`}
        onClick={() => setIsOpen(true)}
        title="Download App"
      >
        <FaDownload />
        {!compact ? <span>Download App</span> : null}
      </button>

      {isOpen ? (
        <div className="download-app-modal-layer" onClick={() => setIsOpen(false)}>
          <section className="download-app-modal" onClick={(event) => event.stopPropagation()}>
            <header className="download-app-modal-header">
              <div>
                <h2>Download App</h2>
                <p>{downloads?.message || 'Choose a CRM app version.'}</p>
              </div>
              <button type="button" className="download-app-modal-close" onClick={() => setIsOpen(false)} aria-label="Close download dialog">
                <FaTimes />
              </button>
            </header>

            {isLoading ? <div className="download-app-state">Loading download options...</div> : null}
            {error ? <div className="download-app-state download-app-state--error">{error}</div> : null}

            {!isLoading && !error ? (
              <div className="download-app-options">
                {(downloads?.options || []).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="download-app-option"
                    disabled={!option.available}
                    onClick={() => handleOpenDownload(option)}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.available ? 'Available' : 'Coming soon'}</small>
                    </span>
                    <FaExternalLinkAlt />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  )
}

export default DownloadAppButton
