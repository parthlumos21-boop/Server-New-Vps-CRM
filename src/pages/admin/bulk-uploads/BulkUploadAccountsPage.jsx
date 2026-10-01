import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BulkUploadReviewPanel from './BulkUploadReviewPanel'
import { buildDefaultMapping, readBulkUploadFile, saveBulkUploadAttempt } from './bulkUploadWorkflow'
import './BulkUploadAccountsPage.css'

const ACCOUNT_FIELDS = [
  { key: 'accountNumber', label: 'Account No.' },
  { key: 'accountName', label: 'Account Name', required: true },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'contactMobile', label: 'Mobile Number' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'accountOwner', label: 'Account Owner' },
  { key: 'status', label: 'Status' },
  { key: 'remark', label: 'Remark' },
]

const BulkUploadAccountsPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [duplicateCheck, setDuplicateCheck] = useState({
    phone: false,
    email: false,
  })
  const [duplicateAction, setDuplicateAction] = useState('select')
  const [headers, setHeaders] = useState([])
  const [records, setRecords] = useState([])
  const [mappings, setMappings] = useState({})

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleDuplicateCheckChange = (field) => {
    setDuplicateCheck((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const handleNextStep = async () => {
    if (step === 1 && !file) {
      alert('Please select a file to continue')
      return
    }
    if (step === 1) {
      const parsed = await readBulkUploadFile(file)
      setHeaders(parsed.headers)
      setRecords(parsed.records)
      setMappings(buildDefaultMapping(parsed.headers, ACCOUNT_FIELDS))
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }

    saveBulkUploadAttempt({
      moduleName: 'Accounts',
      fileName: file?.name || '-',
      rowCount: records.length,
    })
    alert(`${records.length} account records verified for upload.`)
    navigate('/admin/bulk-uploads/history')
  }

  const handleMappingChange = (fieldKey, sourceColumn) => {
    setMappings((current) => ({ ...current, [fieldKey]: sourceColumn }))
  }

  return (
    <div className="bua-page">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bua-header">
        <div className="bua-header-content">
          <h1 className="bua-title">Accounts - Bulk Upload</h1>
        </div>
      </div>

      {/* â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bua-container">
        <div className="bua-card">
          {/* â”€â”€ Progress Steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bua-steps-inline">
            <div className={`bua-step-inline ${step >= 1 ? 'bua-step-inline--active' : ''}`}>
              <div className="bua-step-number">1</div>
              <span className="bua-step-text">Choose Data File</span>
            </div>
            <div className={`bua-step-inline ${step >= 2 ? 'bua-step-inline--active' : ''}`}>
              <div className="bua-step-number">2</div>
              <span className="bua-step-text">Select Fields</span>
            </div>
            <div className={`bua-step-inline ${step >= 3 ? 'bua-step-inline--active' : ''}`}>
              <div className="bua-step-number">3</div>
              <span className="bua-step-text">Verify</span>
            </div>
          </div>

          {/* â”€â”€ Form Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bua-form-content">
            {step === 1 && (
              <div className="bua-form-section">
                <div className="bua-form-group">
                  <label className="bua-label">Select data source file(CSV Format):</label>
                  <div className="bua-file-input-wrapper">
                    <input
                      type="file"
                      id="file-input"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="bua-file-input"
                    />
                    <label htmlFor="file-input" className="bua-file-button">
                      Choose file
                    </label>
                    {file && <span className="bua-file-name">{file.name}</span>}
                  </div>
                </div>

                <div className="bua-form-group">
                  <label className="bua-label">Check Duplicate On:</label>
                  <div className="bua-checkbox-group">
                    <label className="bua-checkbox">
                      <input
                        type="checkbox"
                        checked={duplicateCheck.phone}
                        onChange={() => handleDuplicateCheckChange('phone')}
                      />
                      <span>If <span className="bua-field-name">Phone</span> exist</span>
                    </label>
                    <span className="bua-or">(OR)</span>
                    <label className="bua-checkbox">
                      <input
                        type="checkbox"
                        checked={duplicateCheck.email}
                        onChange={() => handleDuplicateCheckChange('email')}
                      />
                      <span>If <span className="bua-field-name">Email</span> exist</span>
                    </label>
                  </div>
                </div>

                <div className="bua-form-group">
                  <label htmlFor="duplicate-action" className="bua-label">Duplicate check action:</label>
                  <select
                    id="duplicate-action"
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="bua-select"
                  >
                    <option value="select">Select</option>
                    <option value="reject">Reject Duplicate</option>
                    <option value="reminder">Add Reminder to current owner</option>
                    <option value="follow">Follow system configured actions</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bua-form-section">
                <BulkUploadReviewPanel
                  headers={headers}
                  records={records}
                  fields={ACCOUNT_FIELDS}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                />
              </div>
            )}

            {step === 3 && (
              <div className="bua-form-section">
                <BulkUploadReviewPanel
                  type="preview"
                  headers={headers}
                  records={records}
                  fields={ACCOUNT_FIELDS}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* â”€â”€ Footer Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bua-footer">
        <button
          type="button"
          className="bua-btn bua-btn--cancel"
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="bua-btn bua-btn--next"
          onClick={handleNextStep}
          disabled={step === 1 && !file}
        >
          {step === 3 ? 'Upload' : 'Next >'}
        </button>
      </div>
    </div>
  )
}

export default BulkUploadAccountsPage
