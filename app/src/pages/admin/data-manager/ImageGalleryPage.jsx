import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaTrash } from 'react-icons/fa'
import './ImageGalleryPage.css'

const IMAGE_STORAGE_KEY = 'crm_image_gallery'

const getStoredImages = () => {
  const rawImages = localStorage.getItem(IMAGE_STORAGE_KEY)

  if (!rawImages) {
    return []
  }

  try {
    const parsedImages = JSON.parse(rawImages)
    return Array.isArray(parsedImages) ? parsedImages : []
  } catch {
    return []
  }
}

const ImageGalleryPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [images, setImages] = useState(() => getStoredImages())
  const [selectedImages, setSelectedImages] = useState(new Set())
  const [allSelected, setAllSelected] = useState(false)
  const isAdmin = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname])
  const backPath = isAdmin ? '/admin/data-manager' : '/dashboard'

  useEffect(() => {
    localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images))
    setAllSelected(images.length > 0 && images.every((image) => selectedImages.has(image.id)))
  }, [images, selectedImages])

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile)
      return
    }
    alert('Please select a valid image file')
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    const droppedFile = event.dataTransfer.files?.[0] || null
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      return
    }
    alert('Please select a valid image file')
  }

  const handleUpload = () => {
    if (!file) {
      alert('Please select an image to upload')
      return
    }

    const newImage = {
      id: Date.now(),
      name: file.name,
      size: (file.size / 1024).toFixed(2),
      url: URL.createObjectURL(file),
    }

    setImages((currentImages) => [...currentImages, newImage])
    setFile(null)
  }

  const handleSelectImage = (id) => {
    const nextSelected = new Set(selectedImages)
    if (nextSelected.has(id)) {
      nextSelected.delete(id)
    } else {
      nextSelected.add(id)
    }
    setSelectedImages(nextSelected)
    setAllSelected(nextSelected.size === images.length && images.length > 0)
  }

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedImages(new Set())
      setAllSelected(false)
      return
    }

    setSelectedImages(new Set(images.map((image) => image.id)))
    setAllSelected(images.length > 0)
  }

  const handleDeleteSelected = () => {
    if (selectedImages.size === 0) {
      return
    }

    setImages((currentImages) => currentImages.filter((image) => !selectedImages.has(image.id)))
    setSelectedImages(new Set())
    setAllSelected(false)
  }

  return (
    <div className="ig-page">
      <div className="ig-header">
        <button type="button" className="ig-back-btn" onClick={() => navigate(backPath)}>
          <FaChevronLeft />
          Image Gallery
        </button>
      </div>

      <div className="ig-container">
        <div className="ig-layout">
          <section className="ig-column ig-column--upload">
            <h2 className="ig-section-title">Upload image</h2>

            <div
              className={`ig-dropzone ${dragging ? 'ig-dropzone--active' : ''} ${file ? 'ig-dropzone--has-file' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('image-file-input')?.click()}
            >
              <input
                id="image-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div className="ig-dropzone-content">
                <div className="ig-upload-icon">
                  <svg width="82" height="82" viewBox="0 0 60 60" fill="none">
                    <path d="M30 8L40 24H32V40H28V24H20L30 8Z" fill="#8f8f8f" />
                    <path d="M15 45H45V52H15V45Z" fill="#8f8f8f" />
                  </svg>
                </div>

                <p className="ig-upload-text">{file ? file.name : ''}</p>
              </div>
            </div>

            <div className="ig-upload-actions">
              <button type="button" className="ig-btn ig-btn--upload" onClick={handleUpload}>
                Upload
              </button>
            </div>
          </section>

          <section className="ig-column ig-column--gallery">
            <h2 className="ig-section-title">All images</h2>

            <div className="ig-gallery-header">
              <label className="ig-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={images.length === 0}
                />
                <span>Select all</span>
              </label>

              <button type="button" className="ig-trash-btn" onClick={handleDeleteSelected}>
                <FaTrash className="ig-trash-icon" />
                Trash
              </button>
            </div>

            {images.length === 0 ? (
              <div className="ig-empty-state" />
            ) : (
              <div className="ig-grid">
                {images.map((image) => (
                  <div key={image.id} className="ig-grid-item">
                    <div className="ig-image-wrapper">
                      <img src={image.url} alt={image.name} className="ig-image" />
                      <label className="ig-image-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedImages.has(image.id)}
                          onChange={() => handleSelectImage(image.id)}
                        />
                      </label>
                    </div>
                    <p className="ig-image-name">{image.name}</p>
                    <p className="ig-image-size">{image.size} KB</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="ig-footer-strip">
        <span>Your CRM account has expired. Kindly process the payment.</span>
        <button type="button" onClick={() => (isAdmin ? navigate('/admin/settings') : alert('Renewal module is not configured for user panel.'))}>
          Renew CRM Account
        </button>
      </div>
    </div>
  )
}

export default ImageGalleryPage
