import React, { useRef } from 'react'
import { validateFile } from '../../../../features/adminAccounts/bulkUpload/validators'
import { readFileAsText, parseCSV } from '../../../../features/adminAccounts/bulkUpload/csvParser'

const ChooseDataFileStep = ({ onFileSelected, selectedFile, error, setError }) => {
  const fileInputRef = useRef(null)

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0]
    
    if (!file) return

    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    try {
      setError(null)
      
      // Read and parse CSV
      const csvContent = await readFileAsText(file)
      const { headers, records } = parseCSV(csvContent)
      
      onFileSelected({
        file,
        headers,
        records,
        fileName: file.name,
      })
    } catch (err) {
      setError(err.message || 'Failed to parse CSV file')
    }
  }

  const handleChooseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bulk-upload-step bulk-upload-step-choose-file">
      <h2 className="bulk-upload-step-title">Select data source file (CSV Format)</h2>
      
      <div className="bulk-upload-file-input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        
        {selectedFile ? (
          <div className="bulk-upload-file-selected">
            <div className="bulk-upload-file-name">
              <svg className="bulk-upload-file-icon" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
              </svg>
              <span>{selectedFile.fileName}</span>
            </div>
            <button
              type="button"
              onClick={handleChooseClick}
              className="bulk-upload-change-btn"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleChooseClick}
            className="bulk-upload-choose-btn"
          >
            Choose file
          </button>
        )}
      </div>

      {error && <div className="bulk-upload-error">{error}</div>}

      {selectedFile && (
        <div className="bulk-upload-file-info">
          <p>
            <strong>Rows:</strong> {selectedFile.records.length}
          </p>
          <p>
            <strong>Columns:</strong> {selectedFile.headers.length}
          </p>
        </div>
      )}
    </div>
  )
}

export default ChooseDataFileStep
