import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlay = true,
  showClose = true,
  footer,
  headerActions = null,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && closeOnOverlay) {
      onClose()
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-content modal-${size}`}>
        {(title || showClose || headerActions) && (
          <div className="modal-header">
            {title ? <h2 className="modal-title">{title}</h2> : <div />}
            <div className="modal-header-actions">
              {headerActions}
              {showClose ? (
                <button className="modal-close" onClick={onClose}>
                  ×
                </button>
              ) : null}
            </div>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer ? (
          <div className="modal-footer">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

export default Modal
