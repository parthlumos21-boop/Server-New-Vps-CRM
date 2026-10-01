import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaCheckCircle, FaFileExcel, FaSpinner } from 'react-icons/fa'
import { FiChevronDown } from 'react-icons/fi'
import './ExcelExportButton.css'

const SUCCESS_RESET_DELAY = 1800

const waitForUiPaint = () => new Promise((resolve) => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    resolve()
    return
  }

  window.requestAnimationFrame(() => resolve())
})

const toPromise = async (callback) => {
  if (typeof callback !== 'function') return
  const result = callback()
  if (result && typeof result.then === 'function') {
    await result
  }
}

const useSuccessReset = (value, reset) => {
  useEffect(() => {
    if (!value) return undefined
    const timeoutId = window.setTimeout(reset, SUCCESS_RESET_DELAY)
    return () => window.clearTimeout(timeoutId)
  }, [reset, value])
}

const ExportStatusIcon = ({ loading, success, className }) => {
  if (loading) return <FaSpinner className={`${className} ${className}__spinner`} aria-hidden="true" />
  if (success) return <FaCheckCircle className={className} aria-hidden="true" />
  return <FaFileExcel className={className} aria-hidden="true" />
}

export const ExcelExportActionButton = ({
  label = 'Export Excel',
  busyLabel = 'Generating...',
  successLabel = 'Downloaded',
  title,
  onClick,
  disabled = false,
  className = '',
  compact = false,
  fullWidth = false,
  responsiveHideLabel = false,
}) => {
  const [status, setStatus] = useState('idle')
  const resetSuccess = useCallback(() => setStatus('idle'), [])
  useSuccessReset(status === 'success', resetSuccess)

  const handleClick = useCallback(async () => {
    if (disabled || status === 'loading') return

    setStatus('loading')
    try {
      // Keep the download inside the original click gesture so browsers do not block it.
      await toPromise(onClick)
      setStatus('success')
    } catch (error) {
      setStatus('idle')
      throw error
    }
  }, [disabled, onClick, status])

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const resolvedLabel = isLoading ? busyLabel : isSuccess ? successLabel : label
  const buttonClassName = [
    'excel-export-button',
    compact ? 'excel-export-button--compact' : '',
    fullWidth ? 'excel-export-button--full' : '',
    isLoading ? 'excel-export-button--loading' : '',
    isSuccess ? 'excel-export-button--success' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={buttonClassName}
      title={title || label}
      aria-label={title || label}
      disabled={disabled || isLoading}
      onClick={handleClick}
    >
      <ExportStatusIcon
        loading={isLoading}
        success={isSuccess}
        className="excel-export-button__icon"
      />
      <span className={`excel-export-button__label${responsiveHideLabel ? ' excel-export-button__label--responsive-hide' : ''}`}>
        {resolvedLabel}
      </span>
    </button>
  )
}

const normalizeGroups = (groups = [], items = []) => {
  if (Array.isArray(groups) && groups.length > 0) return groups
  return [{ key: 'default', items }]
}

export const ExcelExportMenuButton = ({
  label = 'Export',
  busyLabel = 'Generating...',
  successLabel = 'Ready',
  title,
  groups = [],
  items = [],
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'right',
  compact = false,
  responsiveHideLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeKey, setActiveKey] = useState('')
  const [successKey, setSuccessKey] = useState('')
  const [menuPosition, setMenuPosition] = useState(null)
  const groupedItems = useMemo(() => normalizeGroups(groups, items), [groups, items])
  const menuRef = useRef(null)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const handlePointerDown = (event) => {
      const target = event.target
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition({
        top: rect.bottom + 8,
        right: align === 'left' ? undefined : Math.max(8, window.innerWidth - rect.right),
        left: align === 'left' ? rect.left : undefined,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, isOpen])

  const resetSuccess = useCallback(() => setSuccessKey(''), [])
  useSuccessReset(Boolean(successKey), resetSuccess)

  const runAction = useCallback(async (item) => {
    if (!item || item.disabled || activeKey) return
    setActiveKey(item.key)
    try {
      await waitForUiPaint()
      await toPromise(item.onClick)
      setSuccessKey(item.key)
      setIsOpen(false)
    } finally {
      setActiveKey('')
    }
  }, [activeKey])

  const triggerLabel = activeKey
    ? busyLabel
    : successKey
      ? successLabel
      : label

  return (
    <div className={`excel-export-control${className ? ` ${className}` : ''}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'excel-export-button',
          compact ? 'excel-export-button--compact' : '',
          isOpen ? 'excel-export-button--menu-open' : '',
          activeKey ? 'excel-export-button--loading' : '',
          !activeKey && successKey ? 'excel-export-button--success' : '',
          buttonClassName,
        ].filter(Boolean).join(' ')}
        title={title || label}
        aria-label={title || label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={disabled || Boolean(activeKey)}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <ExportStatusIcon
          loading={Boolean(activeKey)}
          success={!activeKey && Boolean(successKey)}
          className="excel-export-button__icon"
        />
        <span className={`excel-export-button__label${responsiveHideLabel ? ' excel-export-button__label--responsive-hide' : ''}`}>
          {triggerLabel}
        </span>
        <FiChevronDown className="excel-export-button__chevron" />
      </button>

      {isOpen && menuPosition && typeof document !== 'undefined' ? createPortal((
        <div
          ref={menuRef}
          className={`excel-export-menu excel-export-menu--${align} excel-export-menu--portal${menuClassName ? ` ${menuClassName}` : ''}`}
          style={{
            position: 'fixed',
            top: menuPosition.top,
            ...(menuPosition.right !== undefined ? { right: menuPosition.right } : {}),
            ...(menuPosition.left !== undefined ? { left: menuPosition.left } : {}),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {groupedItems.map((group, groupIndex) => (
            <div className="excel-export-menu-group" key={group.key || group.label || groupIndex}>
              {group.label ? <span className="excel-export-menu-group__label">{group.label}</span> : null}
              {(group.items || []).map((item) => {
                const isLoading = activeKey === item.key
                const isSuccess = successKey === item.key && !isLoading
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      'excel-export-menu-item',
                      isLoading ? 'excel-export-menu-item--loading' : '',
                      isSuccess ? 'excel-export-menu-item--success' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={disabled || item.disabled || Boolean(activeKey)}
                    onClick={() => runAction(item)}
                  >
                    <span className="excel-export-menu-item__main">
                      <ExportStatusIcon
                        loading={isLoading}
                        success={isSuccess}
                        className="excel-export-menu-item__icon"
                      />
                      <span className="excel-export-menu-item__label">
                        {isLoading ? (item.busyLabel || busyLabel) : isSuccess ? (item.successLabel || successLabel) : item.label}
                      </span>
                    </span>
                    <span className="excel-export-menu-item__meta">
                      {item.badge ? <span className="excel-export-menu-item__badge">{item.badge}</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ), document.body) : null}
    </div>
  )
}

export default ExcelExportMenuButton
