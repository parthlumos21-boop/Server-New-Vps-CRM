import React from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import './PageHeader.css'

const PageHeader = ({ title, onBack, children }) => {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {onBack && (
          <button type="button" className="page-header-back" onClick={onBack} aria-label="Go back">
            <FiArrowLeft />
          </button>
        )}
        <h1 className="page-header-title">{title}</h1>
      </div>
      {children && <div className="page-header-right">{children}</div>}
    </div>
  )
}

export default PageHeader
