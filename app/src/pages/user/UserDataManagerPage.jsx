import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBook,
  FaDatabase,
  FaImages,
} from 'react-icons/fa'
import '../admin/data-manager/DataManagerPage.css'

const DataManagerCard = ({ icon: Icon, title, description, onAction }) => (
  <button type="button" className="dm-card" onClick={onAction}>
    <div className="dm-card-header">
      <div className="dm-card-icon">
        <Icon />
      </div>
    </div>
    <div className="dm-card-body">
      <h3 className="dm-card-title">{title}</h3>
      <p className="dm-card-description">{description}</p>
    </div>
  </button>
)

const UserDataManagerPage = () => {
  const navigate = useNavigate()

  return (
    <div className="dm-page">
      <div className="dm-header">
        <h1 className="dm-title">Data Manager</h1>
        <p className="dm-subtitle">Manage your images, documents, and knowledge articles.</p>
      </div>

      <div className="dm-container">
        <div className="dm-cards-grid">
          <DataManagerCard
            icon={FaImages}
            title="Image Gallery"
            description="Upload and manage your image gallery content."
            onAction={() => navigate('/data-manager/image-gallery')}
          />
          <DataManagerCard
            icon={FaDatabase}
            title="Document Base"
            description="Store and organize important project and quotation documents."
            onAction={() => navigate('/data-manager/document-base')}
          />
          <DataManagerCard
            icon={FaBook}
            title="Knowledge Base"
            description="Create internal notes, guides, and reusable knowledge articles."
            onAction={() => navigate('/data-manager/knowledge-base')}
          />
        </div>
      </div>
    </div>
  )
}

export default UserDataManagerPage
