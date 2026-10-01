import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaTag,
  FaImages,
  FaDatabase,
  FaBook,
} from 'react-icons/fa'
import './DataManagerPage.css'

const DataManagerCard = ({ icon: Icon, title, description, onAction }) => {
  return (
    <div className="dm-card" onClick={onAction}>
      <div className="dm-card-header">
        <div className="dm-card-icon">
          <Icon />
        </div>
      </div>
      <div className="dm-card-body">
        <h3 className="dm-card-title">{title}</h3>
        <p className="dm-card-description">{description}</p>
      </div>
    </div>
  )
}

const DataManagerPage = () => {
  const navigate = useNavigate()

  return (
    <div className="dm-page">
      <div className="dm-header">
        <h1 className="dm-title">Data Manager</h1>
        <p className="dm-subtitle">Manage bulk uploads, media, documents, and knowledge base</p>
      </div>

      <div className="dm-container">
        <div className="dm-cards-grid">
          <DataManagerCard
            icon={FaTag}
            title="Bulk Upload"
            description="This action allows to bulk upload contexts."
            onAction={() => navigate('/admin/bulk-uploads')}
          />

          <DataManagerCard
            icon={FaImages}
            title="Image Gallery"
            description="This action allows to add images to system image gallery."
            onAction={() => navigate('/admin/data-manager/image-gallery')}
          />

          <DataManagerCard
            icon={FaDatabase}
            title="Document Base"
            description="This action allows to add documents & shows the bulk uploaded docs."
            onAction={() => navigate('/admin/data-manager/document-base')}
          />

          <DataManagerCard
            icon={FaBook}
            title="Knowledge Base"
            description="This action allows to add & view Knowledge Base."
            onAction={() => navigate('/admin/data-manager/knowledge-base')}
          />
        </div>
      </div>
    </div>
  )
}

export default DataManagerPage
