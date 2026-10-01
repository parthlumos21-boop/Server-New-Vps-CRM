import React, { useState, useEffect } from 'react'
import { BULK_UPLOAD_CUSTOMER_FIELD_OPTIONS } from '../../../../features/adminCustomers/bulkUpload/constants'
import { validateCustomerMappings } from '../../../../features/adminCustomers/bulkUpload/validators'
import Select from '../../../../components/common/Select'

const SelectFieldsStep = ({ csvHeaders, onMappingsChange, initialMappings, error, setError }) => {
  const [mappings, setMappings] = useState(initialMappings || {})

  useEffect(() => {
    const autoMappings = {}
    csvHeaders.forEach((header) => {
      const normalized = header.toLowerCase().replace(/\s+/g, '')
      const match = BULK_UPLOAD_CUSTOMER_FIELD_OPTIONS.find(
        (field) => field.value.toLowerCase() === normalized
      )
      if (match) {
        autoMappings[header] = match.value
      }
    })

    if (Object.keys(autoMappings).length > 0 && Object.keys(initialMappings || {}).length === 0) {
      setMappings(autoMappings)
      onMappingsChange(autoMappings)
    }
  }, [csvHeaders, initialMappings, onMappingsChange])

  const handleMappingChange = (csvHeader, fieldValue) => {
    const newMappings = { ...mappings }

    if (fieldValue) {
      newMappings[csvHeader] = fieldValue
    } else {
      delete newMappings[csvHeader]
    }

    setMappings(newMappings)

    const validation = validateCustomerMappings(newMappings, csvHeaders)
    if (!validation.isValid) {
      setError(validation.errors[0])
    } else {
      setError(null)
    }

    onMappingsChange(newMappings)
  }

  return (
    <div className="bulk-upload-step bulk-upload-step-select-fields">
      <h2 className="bulk-upload-step-title">Map your CSV columns to customer fields</h2>

      <div className="bulk-upload-mappings">
        {csvHeaders.map((header) => (
          <div key={header} className="bulk-upload-mapping-row">
            <label className="bulk-upload-mapping-label">{header}</label>
            <Select
              value={mappings[header] || ''}
              onChange={(e) => handleMappingChange(header, e.target.value)}
              className="bulk-upload-mapping-select"
            >
              <option value="">-- Skip this column --</option>
              {BULK_UPLOAD_CUSTOMER_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      {error && <div className="bulk-upload-error">{error}</div>}

      <div className="bulk-upload-mapping-info">
        <p>
          Mapped columns: <strong>{Object.keys(mappings).length} / {csvHeaders.length}</strong>
        </p>
      </div>
    </div>
  )
}

export default SelectFieldsStep
