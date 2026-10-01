import React from 'react'
import { FaBook, FaChevronLeft } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import './KnowledgeBasePage.css'

const KnowledgeBasePage = ({ basePath = '/admin/data-manager' }) => {
  const navigate = useNavigate()

  return (
    <div className="kb-page">
      <div className="kb-header">
        <button type="button" className="kb-back-button" onClick={() => navigate(basePath)}>
          <FaChevronLeft className="kb-back-icon" />
          <span>Knowledge Base</span>
        </button>

        <button type="button" className="kb-add-new-button" onClick={() => navigate(`${basePath}/knowledge-base/add`)}>
          <FaBook className="kb-add-new-icon" />
          <span>Add New</span>
        </button>
      </div>

      <div className="kb-content">
        <p className="kb-empty-message">
          No knowledge base is available.
          <br />
          Click on the button below to add a new knowledge base.
        </p>

        <button type="button" className="kb-primary-button" onClick={() => navigate(`${basePath}/knowledge-base/add`)}>
          <FaBook className="kb-primary-button-icon" />
          <span>Add Knowledge Base</span>
        </button>
      </div>

      <div className="kb-footer-strip">
        <span>Your CRM account has expired. Kindly process the payment.</span>
        <button type="button" onClick={() => navigate(basePath.startsWith('/admin') ? '/admin/settings' : '/dashboard')}>
          Renew CRM Account
        </button>
      </div>
    </div>
  )
}

export default KnowledgeBasePage
