import React, { useMemo, useState } from 'react'
import {
  FaChevronLeft,
  FaFolder,
  FaInfoCircle,
  FaPlus,
  FaTimes,
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import './DocumentBasePage.css'

const DEFAULT_FOLDER_OPTION = 'Document'

const DOCUMENT_TYPE_OPTIONS = [
  'Select a document type',
  'General',
  'GENERAL',
  'Invoice',
  'LR Details',
  'Project Document',
  'Purchase Order',
  'Quotation',
]

const VISIBLE_TO_OPTIONS = [
  'Only Me',
  'My Group',
  'All Users',
]

const AddFolderModal = ({
  folderName,
  onFolderNameChange,
  onClose,
  onAdd,
}) => (
  <div className="db-modal-overlay" onClick={onClose}>
    <div className="db-modal db-modal--small" onClick={(event) => event.stopPropagation()}>
      <div className="db-modal-header">
        <h2 className="db-modal-title">Add Folder</h2>
        <button type="button" className="db-modal-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="db-modal-body">
        <div className="db-modal-panel">
          <div className="db-form-row db-form-row--folder">
            <label className="db-form-label" htmlFor="db-folder-name">
              <span>Folder</span>
              <FaInfoCircle className="db-form-info-icon" />
            </label>

            <input
              id="db-folder-name"
              type="text"
              value={folderName}
              onChange={(event) => onFolderNameChange(event.target.value)}
              className="db-text-input"
            />
          </div>
        </div>
      </div>

      <div className="db-modal-footer">
        <button type="button" className="db-action-button db-action-button--close" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="db-action-button db-action-button--add"
          onClick={onAdd}
        >
          Add
        </button>
      </div>
    </div>
  </div>
)

const AddDocumentModal = ({
  folders,
  form,
  onChange,
  onFileChange,
  onClose,
  onAdd,
  errors,
}) => (
  <div className="db-modal-overlay" onClick={onClose}>
    <div className="db-modal db-modal--large" onClick={(event) => event.stopPropagation()}>
      <div className="db-modal-header">
        <h2 className="db-modal-title">Add Document</h2>
        <button type="button" className="db-modal-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="db-modal-body">
        <div className="db-info-box">
          <div className="db-info-box-top">
            <FaInfoCircle className="db-info-box-icon" />
            <span>
              Note: Max file size is 5 MB
            </span>
            <button type="button" className="db-info-box-close" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          <p className="db-info-box-text">
            File in Word (.doc/.docx), Text (.txt), Outlook (.msg), Excel (.xls/.xlsx),
            PPT (.ppt/.pptx), ZIP (.zip/.rar), Image (.jpg/.png), PDF (.pdf) or Drawing
            (.dwg) format can be uploaded.
          </p>
          <p className="db-info-box-text">Document storage available: 937 MB.</p>
        </div>

        <div className="db-modal-panel">
          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-document-type">Document Type</label>
            <div>
              <select
                id="db-document-type"
                value={form.documentType}
                onChange={(event) => onChange('documentType', event.target.value)}
                className="db-select-input"
              >
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors?.documentType && <div style={{ color: 'red', fontSize: '0.85rem', marginTop: '4px' }}>{errors.documentType}</div>}
            </div>
          </div>

          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-document-folder">
              <span>Folder</span>
              <FaInfoCircle className="db-form-info-icon" />
            </label>
            <div>
              <select
                id="db-document-folder"
                value={form.folder}
                onChange={(event) => onChange('folder', event.target.value)}
                className="db-select-input"
              >
                <option value="">Select Folder</option>
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
              {errors?.folder && <div style={{ color: 'red', fontSize: '0.85rem', marginTop: '4px' }}>{errors.folder}</div>}
            </div>
          </div>

          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-document-name">Document Name</label>
            <div>
              <input
                id="db-document-name"
                type="text"
                value={form.documentName}
                onChange={(event) => onChange('documentName', event.target.value)}
                className="db-text-input"
                placeholder="Enter Document Name"
              />
              {errors?.documentName && <div style={{ color: 'red', fontSize: '0.85rem', marginTop: '4px' }}>{errors.documentName}</div>}
            </div>
          </div>

          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-visible-to">Visible To</label>
            <select
              id="db-visible-to"
              value={form.visibleTo}
              onChange={(event) => onChange('visibleTo', event.target.value)}
              className="db-select-input"
            >
              {VISIBLE_TO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="db-form-row db-form-row--stacked">
            <label className="db-form-label" htmlFor="db-keywords">Keywords</label>
            <div className="db-form-field-block">
              <input
                id="db-keywords"
                type="text"
                value={form.keywords}
                onChange={(event) => onChange('keywords', event.target.value)}
                className="db-text-input"
                placeholder="Enter Keywords"
              />
              <p className="db-note-text">Note: Enter Keywords as coma separated</p>
            </div>
          </div>

          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-description">File Description</label>
            <textarea
              id="db-description"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              className="db-textarea-input"
              placeholder="Add description here..."
              rows={4}
            />
          </div>

          <div className="db-form-row">
            <label className="db-form-label" htmlFor="db-file-input">File</label>
            <div>
              <div className="db-file-picker">
                <div className="db-file-display">{form.file ? form.file.name : 'No file chosen'}</div>
                <label className="db-file-button" htmlFor="db-file-input">
                  Choose file
                </label>
                <input
                  id="db-file-input"
                  type="file"
                  onChange={(event) => onFileChange(event.target.files?.[0] || null)}
                  className="db-file-input"
                />
              </div>
              {errors?.file && <div style={{ color: 'red', fontSize: '0.85rem', marginTop: '4px' }}>{errors.file}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="db-modal-footer">
        <button type="button" className="db-action-button db-action-button--close" onClick={onClose}>
          Close
        </button>
        <button type="button" className="db-action-button db-action-button--add" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  </div>
)

const DocumentBasePage = ({ basePath = '/admin/data-manager' }) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [folders, setFolders] = useState([DEFAULT_FOLDER_OPTION])
  const [activeFolder, setActiveFolder] = useState(DEFAULT_FOLDER_OPTION)
  const [documents, setDocuments] = useState([])
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [documentForm, setDocumentForm] = useState({
    documentType: 'Select a document type',
    folder: DEFAULT_FOLDER_OPTION,
    documentName: '',
    visibleTo: 'Only Me',
    keywords: '',
    description: '',
    file: null,
  })
  const [formErrors, setFormErrors] = useState({})

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesFolder = document.folder === activeFolder
      const haystack = [
        document.documentName,
        document.keywords,
        document.documentType,
      ].join(' ').toLowerCase()
      const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase())
      return matchesFolder && matchesSearch
    })
  }, [activeFolder, documents, searchTerm])

  const orderedFolders = useMemo(() => {
    return [
      DEFAULT_FOLDER_OPTION,
      ...folders.filter((folder) => folder !== DEFAULT_FOLDER_OPTION),
    ]
  }, [folders])

  const resetDocumentForm = () => {
    setDocumentForm({
      documentType: 'Select a document type',
      folder: DEFAULT_FOLDER_OPTION,
      documentName: '',
      visibleTo: 'Only Me',
      keywords: '',
      description: '',
      file: null,
    })
    setFormErrors({})
  }

  const handleOpenFolderModal = () => {
    setNewFolderName('')
    setFolderModalOpen(true)
  }

  const handleAddFolder = () => {
    const normalizedFolder = newFolderName.trim()
    if (!normalizedFolder) {
      return
    }
    if (!folders.includes(normalizedFolder)) {
      setFolders((currentFolders) => [
        DEFAULT_FOLDER_OPTION,
        ...currentFolders.filter((folder) => folder !== DEFAULT_FOLDER_OPTION),
        normalizedFolder,
      ])
    }
    setActiveFolder(normalizedFolder)
    setDocumentForm((currentForm) => ({
      ...currentForm,
      folder: normalizedFolder,
    }))
    setFolderModalOpen(false)
  }

  const handleOpenDocumentModal = () => {
    resetDocumentForm()
    setDocumentModalOpen(true)
  }

  const handleDocumentFieldChange = (field, value) => {
    setDocumentForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleAddDocument = () => {
    const errors = {}
    if (documentForm.documentType === 'Select a document type') {
      errors.documentType = 'Please select document type'
    }
    if (!documentForm.folder) {
      errors.folder = 'Please enter the folder name'
    }
    if (!documentForm.documentName.trim()) {
      errors.documentName = 'Please provide document name'
    }
    if (!documentForm.file) {
      errors.file = 'Please select a file to upload'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setDocuments((currentDocuments) => ([
      ...currentDocuments,
      {
        id: Date.now(),
        documentType: documentForm.documentType,
        folder: documentForm.folder,
        documentName: documentForm.documentName.trim(),
        visibleTo: documentForm.visibleTo,
        keywords: documentForm.keywords.trim(),
        description: documentForm.description.trim(),
        fileName: documentForm.file.name,
      },
    ]))
    setActiveFolder(documentForm.folder)
    setDocumentModalOpen(false)
    resetDocumentForm()
  }

  return (
    <div className="db-page">
      <div className="db-header">
        <button type="button" className="db-back-button" onClick={() => navigate(basePath)}>
          <FaChevronLeft className="db-back-icon" />
          <span>Document Base</span>
        </button>
      </div>

      <div className="db-layout">
        <aside className="db-sidebar">
          <div className="db-sidebar-header">
            <div className="db-sidebar-title">
              <FaFolder className="db-folder-icon" />
              <span>Folders</span>
            </div>
            <button type="button" className="db-mini-add-button" aria-label="Add folder" onClick={handleOpenFolderModal}>
              <FaPlus />
            </button>
          </div>

          <div className="db-folder-list">
            {orderedFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                className={`db-folder-button ${activeFolder === folder ? 'db-folder-button--active' : ''}`}
                onClick={() => setActiveFolder(folder)}
              >
                {folder}
              </button>
            ))}
          </div>
        </aside>

        <section className="db-content">
          <div className="db-toolbar">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="db-search-input"
              placeholder="Search for document..."
            />

            <button type="button" className="db-mini-add-button" aria-label="Add document" onClick={handleOpenDocumentModal}>
              <FaPlus />
            </button>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="db-empty-state">No documents available</div>
          ) : (
            <div className="db-document-list">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="db-document-card">
                  <strong>{document.documentName}</strong>
                  <span>{document.documentType}</span>
                  <span>{document.fileName}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="db-footer-strip">
        <span>Your CRM account has expired. Kindly process the payment.</span>
        <button type="button" onClick={() => navigate(basePath.startsWith('/admin') ? '/admin/settings' : '/dashboard')}>
          Renew CRM Account
        </button>
      </div>

      {folderModalOpen ? (
        <AddFolderModal
          folderName={newFolderName}
          onFolderNameChange={setNewFolderName}
          onClose={() => setFolderModalOpen(false)}
          onAdd={handleAddFolder}
        />
      ) : null}

      {documentModalOpen ? (
        <AddDocumentModal
          folders={orderedFolders}
          form={documentForm}
          errors={formErrors}
          onChange={handleDocumentFieldChange}
          onFileChange={(file) => handleDocumentFieldChange('file', file)}
          onClose={() => setDocumentModalOpen(false)}
          onAdd={handleAddDocument}
        />
      ) : null}
    </div>
  )
}

export default DocumentBasePage
