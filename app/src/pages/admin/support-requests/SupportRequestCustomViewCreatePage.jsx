import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHeadset, FaTable } from 'react-icons/fa'
import Button from '../../../components/common/Button'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import {
  buildDefaultSupportRequestCustomViewDraft,
  buildSupportRequestCustomViewColumns,
  getDefaultSupportRequestVisibleFields,
  getSupportRequestCustomViewClassificationLabel,
  SUPPORT_REQUEST_CUSTOM_VIEW_CLASSIFICATIONS,
  SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_OPTIONS,
  SUPPORT_REQUEST_CUSTOM_VIEW_STEPS,
} from '../../../features/adminSupportRequests/customViews/supportRequestCustomViewConfig'
import { getCustomViewSupportRequests, getSupportRequestCustomViewFilterOptions } from '../../../features/adminSupportRequests/customViews/getCustomViewSupportRequests'
import { buildAdminSupportRequestCustomViewUrl, saveAdminSupportRequestCustomView } from '../../../features/adminSupportRequests/customViews/supportRequestCustomViewStorage'
import './SupportRequestCustomViewCreatePage.css'

const SupportRequestCustomViewCreatePage = () => {
  const navigate = useNavigate()
  const { supportRequests } = useData()
  const { user } = useAuth()
  const [draft, setDraft] = useState(buildDefaultSupportRequestCustomViewDraft)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [errors, setErrors] = useState({})

  const currentStep = SUPPORT_REQUEST_CUSTOM_VIEW_STEPS[currentStepIndex]
  const previewRecords = useMemo(
    () => getCustomViewSupportRequests(supportRequests, user, draft),
    [draft, supportRequests, user]
  )
  const selectedColumns = useMemo(
    () => buildSupportRequestCustomViewColumns(draft.visibleFields),
    [draft.visibleFields]
  )
  const filterOptions = useMemo(
    () => getSupportRequestCustomViewFilterOptions(supportRequests),
    [supportRequests]
  )

  const updateDraft = (updates) => {
    setDraft((currentValue) => ({
      ...currentValue,
      ...updates,
    }))
  }

  const updateFilter = (key, value) => {
    setDraft((currentValue) => ({
      ...currentValue,
      filters: {
        ...currentValue.filters,
        [key]: value,
      },
    }))
  }

  const toggleFilterValue = (key, value) => {
    setDraft((currentValue) => {
      const currentValues = currentValue.filters[key] || []
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value]

      return {
        ...currentValue,
        filters: {
          ...currentValue.filters,
          [key]: nextValues,
        },
      }
    })
  }

  const toggleVisibleField = (fieldKey) => {
    if (fieldKey === 'srNumber') return

    setDraft((currentValue) => {
      const alreadySelected = currentValue.visibleFields.includes(fieldKey)
      const nextFields = alreadySelected
        ? currentValue.visibleFields.filter((key) => key !== fieldKey)
        : [...currentValue.visibleFields, fieldKey]

      return {
        ...currentValue,
        visibleFields: Array.from(new Set(['srNumber', ...nextFields])),
      }
    })
  }

  const validateCurrentStep = () => {
    if (currentStep.key === 'context' && !draft.viewName.trim()) {
      setErrors({ viewName: 'Please provide View Name' })
      return false
    }

    setErrors({})
    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return
    }

    setCurrentStepIndex((currentValue) => Math.min(currentValue + 1, SUPPORT_REQUEST_CUSTOM_VIEW_STEPS.length - 1))
  }

  const handleBack = () => {
    if (currentStepIndex === 0) {
      navigate('/admin/support-requests/view')
      return
    }

    setCurrentStepIndex((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleViewTypeChange = (viewType) => {
    updateDraft({
      viewType,
      visibleFields: getDefaultSupportRequestVisibleFields(viewType),
    })
  }

  const handleSave = () => {
    if (!draft.viewName.trim()) {
      setCurrentStepIndex(0)
      setErrors({ viewName: 'Please provide View Name' })
      return
    }

    const savedView = saveAdminSupportRequestCustomView({
      name: draft.viewName.trim(),
      context: 'supportRequest',
      viewType: draft.viewType,
      classification: draft.classification,
      filters: draft.filters,
      visibleFields: Array.from(new Set(['srNumber', ...draft.visibleFields])),
      addToHomePage: draft.addToHomePage,
    })

    navigate(buildAdminSupportRequestCustomViewUrl(savedView.id))
  }

  const previewRows = previewRecords.slice(0, 3)

  return (
    <div className="support-request-custom-wizard-page">
      <section className="support-request-custom-wizard-card">
        <div className="support-request-custom-wizard-header">
          <h1>Add Custom View</h1>
        </div>

        <div className="support-request-custom-wizard-steps">
          {SUPPORT_REQUEST_CUSTOM_VIEW_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`support-request-custom-wizard-step ${index === currentStepIndex ? 'support-request-custom-wizard-step-active' : ''}`}
            >
              {step.label}
            </div>
          ))}
        </div>

        <div className="support-request-custom-wizard-shell">
          <div className="support-request-custom-wizard-form-panel">
            {currentStep.key === 'context' ? (
              <>
                <div className="support-request-custom-wizard-section">
                  <h2>View Name</h2>
                  <input
                    type="text"
                    value={draft.viewName}
                    onChange={(event) => {
                      updateDraft({ viewName: event.target.value })
                      if (errors.viewName) {
                        setErrors({})
                      }
                    }}
                    className={`support-request-custom-wizard-input ${errors.viewName ? 'support-request-custom-wizard-input-error' : ''}`}
                    placeholder="Enter View Name"
                  />
                  {errors.viewName ? <span className="support-request-custom-wizard-error">{errors.viewName}</span> : null}
                </div>

                <div className="support-request-custom-wizard-section">
                  <h2>Choose the Context</h2>
                  <button type="button" className="support-request-custom-wizard-fixed-pill">
                    SR
                  </button>
                </div>

                <div className="support-request-custom-wizard-section">
                  <h2>Choose the View Type</h2>
                  <div className="support-request-custom-wizard-view-type-stack">
                    {[
                      { key: 'grid', label: 'Grid' },
                      { key: 'tabular', label: 'Tabular' },
                    ].map((viewType) => (
                      <button
                        key={viewType.key}
                        type="button"
                        className={`support-request-custom-wizard-view-type-button ${draft.viewType === viewType.key ? 'support-request-custom-wizard-view-type-button-active' : ''}`}
                        onClick={() => handleViewTypeChange(viewType.key)}
                      >
                        {viewType.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {currentStep.key === 'classification' ? (
              <div className="support-request-custom-wizard-section">
                <h2>Select the Base Classification</h2>
                <div className="support-request-custom-wizard-options">
                  {SUPPORT_REQUEST_CUSTOM_VIEW_CLASSIFICATIONS.map((option) => (
                    <label key={option.key} className="support-request-custom-wizard-option">
                      <input
                        type="radio"
                        name="support-request-classification"
                        value={option.key}
                        checked={draft.classification === option.key}
                        onChange={() => updateDraft({ classification: option.key })}
                      />
                      <div>
                        <strong>{option.label}</strong>
                        <span>Use this support-request dataset as the base for the saved custom view.</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {currentStep.key === 'filters' ? (
              <div className="support-request-custom-wizard-section">
                <h2>Additional Filters</h2>
                <div className="support-request-custom-wizard-filter-grid">
                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Owner</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.owners.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.ownerIn.includes(value)}
                            onChange={() => toggleFilterValue('ownerIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Status</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.statuses.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.statusIn.includes(value)}
                            onChange={() => toggleFilterValue('statusIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Priority</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.priorities.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.priorityIn.includes(value)}
                            onChange={() => toggleFilterValue('priorityIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Request Type</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.requestTypes.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.requestTypeIn.includes(value)}
                            onChange={() => toggleFilterValue('requestTypeIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>City</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.cities.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.cityIn.includes(value)}
                            onChange={() => toggleFilterValue('cityIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>State</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.states.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.stateIn.includes(value)}
                            onChange={() => toggleFilterValue('stateIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Added By</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      {filterOptions.addedByUsers.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.addedByIn.includes(value)}
                            onChange={() => toggleFilterValue('addedByIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block">
                    <h3>Presence Rules</h3>
                    <div className="support-request-custom-wizard-checkbox-list">
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasContactEmail}
                          onChange={(event) => updateFilter('hasContactEmail', event.target.checked)}
                        />
                        Has Contact Email
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasContactMobile}
                          onChange={(event) => updateFilter('hasContactMobile', event.target.checked)}
                        />
                        Has Contact Mobile
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasOnSiteRequirements}
                          onChange={(event) => updateFilter('hasOnSiteRequirements', event.target.checked)}
                        />
                        Has OnSite Requirements
                      </label>
                    </div>
                  </div>

                  <div className="support-request-custom-wizard-filter-block support-request-custom-wizard-filter-block-wide">
                    <h3>Text Rules</h3>
                    <div className="support-request-custom-wizard-text-filters">
                      <input
                        type="text"
                        value={draft.filters.customerNameContains}
                        onChange={(event) => updateFilter('customerNameContains', event.target.value)}
                        className="support-request-custom-wizard-input"
                        placeholder="Customer Name contains"
                      />
                      <input
                        type="text"
                        value={draft.filters.titleContains}
                        onChange={(event) => updateFilter('titleContains', event.target.value)}
                        className="support-request-custom-wizard-input"
                        placeholder="Title contains"
                      />
                      <input
                        type="text"
                        value={draft.filters.contactPersonContains}
                        onChange={(event) => updateFilter('contactPersonContains', event.target.value)}
                        className="support-request-custom-wizard-input"
                        placeholder="Contact Person contains"
                      />
                      <input
                        type="text"
                        value={draft.filters.referenceNumberContains}
                        onChange={(event) => updateFilter('referenceNumberContains', event.target.value)}
                        className="support-request-custom-wizard-input"
                        placeholder="Reference Number contains"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep.key === 'fields' ? (
              <div className="support-request-custom-wizard-section">
                <h2>View Fields</h2>
                <div className="support-request-custom-wizard-fields-grid">
                  {SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_OPTIONS.map((field) => (
                    <label key={field.key} className="support-request-custom-wizard-option">
                      <input
                        type="checkbox"
                        checked={draft.visibleFields.includes(field.key)}
                        disabled={field.key === 'srNumber'}
                        onChange={() => toggleVisibleField(field.key)}
                      />
                      <div>
                        <strong>{field.label}</strong>
                        <span>{field.key === 'srNumber' ? 'Always included in every support-request custom view.' : 'Toggle this field for the saved custom view.'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="support-request-custom-wizard-preview-panel">
            <label className="support-request-custom-wizard-home-toggle">
              <input
                type="checkbox"
                checked={draft.addToHomePage}
                onChange={(event) => updateDraft({ addToHomePage: event.target.checked })}
              />
              <span>Add to home page</span>
            </label>

            <div className="support-request-custom-wizard-preview-title">Tile View</div>

            <div className="support-request-custom-wizard-preview-tile">
              <div className="support-request-custom-wizard-preview-count">{previewRecords.length}</div>
              <div className="support-request-custom-wizard-preview-label">
                <FaHeadset />
                <span>Support Request</span>
              </div>
            </div>

            <div className="support-request-custom-wizard-preview-frame">
              {draft.viewType === 'tabular' ? (
                <div className="support-request-custom-wizard-tabular-preview">
                  <div className="support-request-custom-wizard-tabular-preview-shell">
                    <table className="support-request-custom-wizard-tabular-preview-table">
                      <thead>
                        <tr>
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                        <tr className="support-request-custom-wizard-tabular-preview-filter-row">
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={`filter-${column.key}`}>
                              <div className="support-request-custom-wizard-tabular-preview-filter-box" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.length > 0 ? previewRows.map((record) => (
                          <tr key={record.id}>
                            {selectedColumns.slice(0, 5).map((column) => (
                              <td key={`${record.id}-${column.key}`}>{String(record[column.key] || '-')}</td>
                            ))}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={Math.max(selectedColumns.slice(0, 5).length, 1)}>Choose View Type</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="support-request-custom-wizard-grid-preview">
                  {previewRows.length > 0 ? previewRows.map((record) => (
                    <div key={record.id} className="support-request-custom-wizard-grid-preview-card">
                      <div className="support-request-custom-wizard-grid-preview-icon">
                        <FaTable />
                      </div>
                      <div className="support-request-custom-wizard-grid-preview-content">
                        <strong>{record.title || record.srNumber}</strong>
                        <span>{record.customerName || 'No customer linked'}</span>
                        <span>{record.ownerName || 'Unassigned'}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="support-request-custom-wizard-preview-empty">
                      <FaTable />
                      <span>Choose View Type</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="support-request-custom-wizard-preview-meta">
              <div>
                <span>Name</span>
                <strong>{draft.viewName.trim() || 'Untitled View'}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{draft.viewType === 'grid' ? 'Grid' : 'Tabular'}</strong>
              </div>
              <div>
                <span>Classification</span>
                <strong>{getSupportRequestCustomViewClassificationLabel(draft.classification)}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="support-request-custom-wizard-actions">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>

          {currentStepIndex < SUPPORT_REQUEST_CUSTOM_VIEW_STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave}>
              Save Custom View
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

export default SupportRequestCustomViewCreatePage
