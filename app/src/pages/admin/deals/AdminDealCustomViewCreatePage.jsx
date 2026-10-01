import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHandshake, FaTable } from 'react-icons/fa'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import {
  buildAdminDealCustomViewUrl,
} from '../../../features/adminDeals/config/adminDealViews'
import {
  buildDealCustomViewColumns,
  buildDefaultDealCustomViewDraft,
  DEAL_CUSTOM_VIEW_CLASSIFICATIONS,
  DEAL_CUSTOM_VIEW_FIELD_OPTIONS,
  DEAL_CUSTOM_VIEW_STEPS,
  getDealCustomViewClassificationLabel,
  getDefaultDealVisibleFields,
} from '../../../features/adminDeals/customViews/dealCustomViewConfig'
import { getCustomViewDeals } from '../../../features/adminDeals/customViews/getCustomViewDeals'
import { saveAdminDealCustomView } from '../../../features/adminDeals/customViews/dealCustomViewStorage'
import '../../../pages/admin/accounts/CustomAdminViews.css'
import './AdminDealCustomViewCreatePage.css'

const uniqueSortedValues = (records, key) =>
  Array.from(
    new Set(
      records
        .map((record) => record[key])
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right)))

const AdminDealCustomViewCreatePage = () => {
  const navigate = useNavigate()
  const { deals } = useData()
  const [draft, setDraft] = useState(buildDefaultDealCustomViewDraft)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [errors, setErrors] = useState({})

  const currentStep = DEAL_CUSTOM_VIEW_STEPS[currentStepIndex]
  const previewRecords = useMemo(
    () => getCustomViewDeals(deals, draft),
    [deals, draft]
  )
  const selectedColumns = useMemo(
    () => buildDealCustomViewColumns(draft.visibleFields),
    [draft.visibleFields]
  )

  const filterOptions = useMemo(() => ({
    owners: uniqueSortedValues(deals, 'dealOwner'),
    cities: uniqueSortedValues(deals, 'city'),
    statuses: uniqueSortedValues(deals, 'status'),
    dealTypes: uniqueSortedValues(deals, 'dealType'),
  }), [deals])

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
    if (fieldKey === 'dealNumber') return

    setDraft((currentValue) => {
      const alreadySelected = currentValue.visibleFields.includes(fieldKey)
      const nextFields = alreadySelected
        ? currentValue.visibleFields.filter((key) => key !== fieldKey)
        : [...currentValue.visibleFields, fieldKey]

      return {
        ...currentValue,
        visibleFields: Array.from(new Set(['dealNumber', ...nextFields])),
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

    setCurrentStepIndex((currentValue) => Math.min(currentValue + 1, DEAL_CUSTOM_VIEW_STEPS.length - 1))
  }

  const handleBack = () => {
    if (currentStepIndex === 0) {
      navigate('/admin/deals/view')
      return
    }

    setCurrentStepIndex((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleViewTypeChange = (viewType) => {
    updateDraft({
      viewType,
      visibleFields: getDefaultDealVisibleFields(viewType),
    })
  }

  const handleSave = () => {
    if (!draft.viewName.trim()) {
      setCurrentStepIndex(0)
      setErrors({ viewName: 'Please provide View Name' })
      return
    }

    const savedView = saveAdminDealCustomView({
      name: draft.viewName.trim(),
      context: 'deal',
      viewType: draft.viewType,
      baseViewKey: draft.baseViewKey,
      filters: draft.filters,
      visibleFields: Array.from(new Set(['dealNumber', ...draft.visibleFields])),
      addToHomePage: draft.addToHomePage,
    })

    navigate(buildAdminDealCustomViewUrl(savedView.id))
  }

  const previewRows = previewRecords.slice(0, 3)

  return (
    <div className="deal-custom-wizard-page">
      <section className="deal-custom-wizard-card">
        <div className="deal-custom-wizard-header">
          <h1>Add Custom View</h1>
        </div>

        <div className="deal-custom-wizard-steps">
          {DEAL_CUSTOM_VIEW_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`deal-custom-wizard-step ${index === currentStepIndex ? 'deal-custom-wizard-step-active' : ''}`}
            >
              {step.label}
            </div>
          ))}
        </div>

        <div className="deal-custom-wizard-shell">
          <div className="deal-custom-wizard-form-panel">
            {currentStep.key === 'context' ? (
              <>
                <div className="deal-custom-wizard-section">
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
                    className={`deal-custom-wizard-input ${errors.viewName ? 'deal-custom-wizard-input-error' : ''}`}
                    placeholder="Enter View Name"
                  />
                  {errors.viewName ? <span className="deal-custom-wizard-error">{errors.viewName}</span> : null}
                </div>

                <div className="deal-custom-wizard-section">
                  <h2>Choose the Context</h2>
                  <button type="button" className="deal-custom-wizard-fixed-pill">
                    Deal
                  </button>
                </div>

                <div className="deal-custom-wizard-section">
                  <h2>Choose the View Type</h2>
                  <div className="deal-custom-wizard-view-type-stack">
                    {[
                      { key: 'grid', label: 'Grid' },
                      { key: 'tabular', label: 'Tabular' },
                    ].map((viewType) => (
                      <button
                        key={viewType.key}
                        type="button"
                        className={`deal-custom-wizard-view-type-button ${draft.viewType === viewType.key ? 'deal-custom-wizard-view-type-button-active' : ''}`}
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
              <div className="deal-custom-wizard-section">
                <h2>Select the Base Classification</h2>
                <div className="deal-custom-wizard-options">
                  {DEAL_CUSTOM_VIEW_CLASSIFICATIONS.map((option) => (
                    <label key={option.key} className="deal-custom-wizard-option">
                      <input
                        type="radio"
                        name="base-view"
                        value={option.key}
                        checked={draft.baseViewKey === option.key}
                        onChange={() => updateDraft({ baseViewKey: option.key })}
                      />
                      <div>
                        <strong>{option.label}</strong>
                        <span>Use this deal screen as the base live dataset for the saved custom view.</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {currentStep.key === 'filters' ? (
              <div className="deal-custom-wizard-section">
                <h2>Additional Filters</h2>
                <div className="deal-custom-wizard-filter-grid">
                  <div className="deal-custom-wizard-filter-block">
                    <h3>Deal Owner</h3>
                    <div className="deal-custom-wizard-checkbox-list">
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

                  <div className="deal-custom-wizard-filter-block">
                    <h3>City</h3>
                    <div className="deal-custom-wizard-checkbox-list">
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

                  <div className="deal-custom-wizard-filter-block">
                    <h3>Deal Status</h3>
                    <div className="deal-custom-wizard-checkbox-list">
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

                  <div className="deal-custom-wizard-filter-block">
                    <h3>Deal Type</h3>
                    <div className="deal-custom-wizard-checkbox-list">
                      {filterOptions.dealTypes.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.dealTypeIn.includes(value)}
                            onChange={() => toggleFilterValue('dealTypeIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="deal-custom-wizard-filter-block">
                    <h3>Text Rules</h3>
                    <div className="deal-custom-wizard-text-filters">
                      <input
                        type="text"
                        value={draft.filters.projectNameContains}
                        onChange={(event) => updateFilter('projectNameContains', event.target.value)}
                        className="deal-custom-wizard-input"
                        placeholder="Project Name contains"
                      />
                      <input
                        type="text"
                        value={draft.filters.jobNoContains}
                        onChange={(event) => updateFilter('jobNoContains', event.target.value)}
                        className="deal-custom-wizard-input"
                        placeholder="Job No contains"
                      />
                      <input
                        type="text"
                        value={draft.filters.reasonForLostContains}
                        onChange={(event) => updateFilter('reasonForLostContains', event.target.value)}
                        className="deal-custom-wizard-input"
                        placeholder="Reason For Lost contains"
                      />
                    </div>
                  </div>

                  <div className="deal-custom-wizard-filter-block">
                    <h3>Presence Rules</h3>
                    <div className="deal-custom-wizard-checkbox-list">
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasProjectName}
                          onChange={(event) => updateFilter('hasProjectName', event.target.checked)}
                        />
                        Has Project Name
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasPoValue}
                          onChange={(event) => updateFilter('hasPoValue', event.target.checked)}
                        />
                        Has PO Value
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep.key === 'fields' ? (
              <div className="deal-custom-wizard-section">
                <h2>View Fields</h2>
                <div className="deal-custom-wizard-fields-grid">
                  {DEAL_CUSTOM_VIEW_FIELD_OPTIONS.map((field) => (
                    <label key={field.key} className="deal-custom-wizard-option">
                      <input
                        type="checkbox"
                        checked={draft.visibleFields.includes(field.key)}
                        disabled={field.key === 'dealNumber'}
                        onChange={() => toggleVisibleField(field.key)}
                      />
                      <div>
                        <strong>{field.label}</strong>
                        <span>{field.key === 'dealNumber' ? 'Always included in every deal custom view.' : 'Toggle this field for the saved deal custom view.'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="deal-custom-wizard-preview-panel">
            <label className="deal-custom-wizard-home-toggle">
              <input
                type="checkbox"
                checked={draft.addToHomePage}
                onChange={(event) => updateDraft({ addToHomePage: event.target.checked })}
              />
              <span>Add to home page</span>
            </label>

            <div className="deal-custom-wizard-preview-title">Tile View</div>

            <div className="deal-custom-wizard-preview-tile">
              <div className="deal-custom-wizard-preview-count">{previewRecords.length}</div>
              <div className="deal-custom-wizard-preview-label">
                <FaHandshake />
                <span>Deal</span>
              </div>
            </div>

            <div className="deal-custom-wizard-preview-frame">
              {draft.viewType === 'tabular' ? (
                <div className="deal-custom-wizard-tabular-preview">
                  <div className="deal-custom-wizard-tabular-preview-shell">
                    <table className="deal-custom-wizard-tabular-preview-table">
                      <thead>
                        <tr>
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                        <tr className="deal-custom-wizard-tabular-preview-filter-row">
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={`filter-${column.key}`}>
                              <div className="deal-custom-wizard-tabular-preview-filter-box" />
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
                <div className="deal-custom-wizard-grid-preview">
                  {previewRows.length > 0 ? previewRows.map((record) => (
                    <div key={record.id} className="deal-custom-wizard-grid-preview-card">
                      <div className="deal-custom-wizard-grid-preview-icon">
                        <FaTable />
                      </div>
                      <div className="deal-custom-wizard-grid-preview-content">
                        <strong>{record.name || record.dealNumber}</strong>
                        <span>{record.customerName || record.projectName || 'No customer linked'}</span>
                        <span>{record.dealOwner || 'Unassigned'}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="deal-custom-wizard-preview-empty">
                      <FaTable />
                      <span>Choose View Type</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="deal-custom-wizard-preview-meta">
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
                <strong>{getDealCustomViewClassificationLabel(draft.baseViewKey)}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="deal-custom-wizard-actions">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>

          {currentStepIndex < DEAL_CUSTOM_VIEW_STEPS.length - 1 ? (
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

export default AdminDealCustomViewCreatePage
