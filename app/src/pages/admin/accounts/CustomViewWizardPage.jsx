import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import {
  buildCustomViewColumns,
  buildDefaultCustomViewDraft,
  CUSTOM_VIEW_CLASSIFICATIONS,
  CUSTOM_VIEW_FIELD_OPTIONS,
  CUSTOM_VIEW_GROUP_BY_OPTIONS,
  CUSTOM_VIEW_STEPS,
  getCustomViewClassificationLabel,
  getCustomViewGroupByLabel,
  getDefaultVisibleColumns,
} from '../../../features/adminAccounts/customViews/customViewConfig'
import { buildAdminCustomViewUrl, saveAdminCustomView } from '../../../features/adminAccounts/customViews/customViewStorage'
import { getVisibleAccountStages } from '../../../features/adminAccounts/config/accountStages'
import { buildCustomViewGroups, getCustomViewRecords } from '../../../features/adminAccounts/selectors/getCustomViewRecords'
import { getAccountsBoardData } from '../../../features/adminAccounts/selectors/getAccountsBoardData'
import { generateId } from '../../../utils/helpers'
import './CustomAdminViews.css'

const uniqueSortedValues = (records, key) =>
  Array.from(
    new Set(
      records
        .map((record) => record[key])
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right)))

const CustomViewWizardPage = () => {
  const navigate = useNavigate()
  const { accounts } = useData()
  const { user } = useAuth()
  const [draft, setDraft] = useState(buildDefaultCustomViewDraft)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [errors, setErrors] = useState({})

  const allRecords = useMemo(() => getAccountsBoardData(accounts).records, [accounts])
  const previewRecords = useMemo(() => getCustomViewRecords(accounts, user, {
    classification: draft.classification,
    filters: draft.filters,
  }), [accounts, draft.classification, draft.filters, user])
  const previewGroups = useMemo(
    () => buildCustomViewGroups(previewRecords, draft.groupByField).slice(0, 5),
    [draft.groupByField, previewRecords]
  )
  const activePreviewGroup = previewGroups[0] || null

  const filterOptions = useMemo(() => ({
    stages: getVisibleAccountStages().map((stage) => ({ key: stage.key, label: stage.label })),
    accountSources: uniqueSortedValues(allRecords, 'accountSource'),
    accountStates: uniqueSortedValues(allRecords, 'accountState'),
    accountOwners: uniqueSortedValues(allRecords, 'accountOwner'),
    statuses: uniqueSortedValues(allRecords, 'status'),
  }), [allRecords])

  const currentStep = CUSTOM_VIEW_STEPS[currentStepIndex]
  const selectedColumns = useMemo(
    () => buildCustomViewColumns(draft.visibleColumns),
    [draft.visibleColumns]
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
    if (fieldKey === 'accountNumber') return

    setDraft((currentValue) => {
      const alreadySelected = currentValue.visibleColumns.includes(fieldKey)
      const nextColumns = alreadySelected
        ? currentValue.visibleColumns.filter((key) => key !== fieldKey)
        : [...currentValue.visibleColumns, fieldKey]

      return {
        ...currentValue,
        visibleColumns: Array.from(new Set(['accountNumber', ...nextColumns])),
      }
    })
  }

  const validateCurrentStep = () => {
    if (currentStep.key === 'context') {
      const viewName = draft.viewName.trim()
      if (!viewName) {
        setErrors({ viewName: 'Please provide View Name' })
        return false
      }
    }

    if (currentStep.key === 'classification' && !draft.groupByField) {
      setErrors({ groupByField: 'Please choose a group by field' })
      return false
    }

    setErrors({})
    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return
    }

    setCurrentStepIndex((currentValue) => Math.min(currentValue + 1, CUSTOM_VIEW_STEPS.length - 1))
  }

  const handleBack = () => {
    setCurrentStepIndex((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleViewTypeChange = (viewType) => {
    updateDraft({
      viewType,
      visibleColumns: getDefaultVisibleColumns(viewType),
    })
  }

  const handleSave = () => {
    if (!draft.viewName.trim()) {
      setCurrentStepIndex(0)
      setErrors({ viewName: 'Please provide View Name' })
      return
    }

    if (!draft.groupByField) {
      setCurrentStepIndex(1)
      setErrors({ groupByField: 'Please choose a group by field' })
      return
    }

    const timestamp = new Date().toISOString()
    const customView = saveAdminCustomView({
      id: generateId('CV'),
      name: draft.viewName.trim(),
      context: 'account',
      viewType: draft.viewType,
      classification: draft.classification,
      groupByField: draft.groupByField,
      filters: draft.filters,
      visibleColumns: Array.from(new Set(['accountNumber', ...draft.visibleColumns])),
      addToHomePage: draft.addToHomePage,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    navigate(buildAdminCustomViewUrl(customView.id))
  }

  return (
    <div className="custom-admin-wizard-page">
      <section className="custom-admin-wizard-card">
        <div className="custom-admin-wizard-header">
          <h1>Add Custom View</h1>
          <p>Create a saved custom account view without changing the built-in admin boards.</p>
        </div>

        <div className="custom-admin-wizard-steps">
          {CUSTOM_VIEW_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`custom-admin-wizard-step ${index === currentStepIndex ? 'custom-admin-wizard-step-active' : ''}`}
            >
              {step.label}
            </div>
          ))}
        </div>

        <div className="custom-admin-wizard-layout">
          <div className="custom-admin-wizard-form-panel">
            {currentStep.key === 'context' ? (
              <div className="custom-admin-wizard-section">
                <div className="custom-admin-wizard-field">
                  <label htmlFor="custom-view-name">View Name</label>
                  <input
                    id="custom-view-name"
                    type="text"
                    value={draft.viewName}
                    onChange={(event) => {
                      updateDraft({ viewName: event.target.value })
                      if (errors.viewName) {
                        setErrors({})
                      }
                    }}
                    className={`custom-admin-wizard-input ${errors.viewName ? 'custom-admin-wizard-input-error' : ''}`}
                    placeholder="Enter View Name"
                  />
                  {errors.viewName ? <span className="custom-admin-wizard-error">{errors.viewName}</span> : null}
                </div>

                <div className="custom-admin-wizard-section">
                  <h2>Choose the Context</h2>
                  <button type="button" className="custom-admin-wizard-fixed-pill">
                    Account
                  </button>
                </div>

                <div className="custom-admin-wizard-section">
                  <h2>Choose the View Type</h2>
                  <div className="custom-admin-wizard-view-type-grid">
                    {[
                      {
                        key: 'tabular',
                        title: 'Tabular View',
                        description: 'Single grouped table with compact search boxes and page-by-page browsing.',
                      },
                      {
                        key: 'grid',
                        title: 'Grid View',
                        description: 'Grouped cards rendered side by side from the same live account dataset.',
                      },
                    ].map((viewType) => (
                      <button
                        key={viewType.key}
                        type="button"
                        className={`custom-admin-wizard-view-type-card ${draft.viewType === viewType.key ? 'custom-admin-wizard-view-type-card-active' : ''}`}
                        onClick={() => handleViewTypeChange(viewType.key)}
                      >
                        <strong>{viewType.title}</strong>
                        <span>{viewType.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="custom-admin-wizard-section">
                  <label className="custom-admin-wizard-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.addToHomePage}
                      onChange={(event) => updateDraft({ addToHomePage: event.target.checked })}
                    />
                    <div>
                      <strong>Add to home page</strong>
                      <span>Saved as metadata only in v1.</span>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}

            {currentStep.key === 'classification' ? (
              <div className="custom-admin-wizard-section">
                <h2>Select the Base Classification</h2>
                <div className="custom-admin-wizard-options">
                  {CUSTOM_VIEW_CLASSIFICATIONS.map((option) => (
                    <label key={option.key} className="custom-admin-wizard-option">
                      <input
                        type="radio"
                        name="classification"
                        value={option.key}
                        checked={draft.classification === option.key}
                        onChange={() => updateDraft({ classification: option.key })}
                      />
                      <div>
                        <strong>{option.label}</strong>
                        <span>Use this as the base live dataset for the saved custom view.</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="custom-admin-wizard-section">
                  <h2>Group By</h2>
                  <div className="custom-admin-wizard-group-grid">
                    {CUSTOM_VIEW_GROUP_BY_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`custom-admin-wizard-group-option ${draft.groupByField === option.key ? 'custom-admin-wizard-group-option-active' : ''}`}
                        onClick={() => {
                          updateDraft({ groupByField: option.key })
                          if (errors.groupByField) {
                            setErrors({})
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.groupByField ? <span className="custom-admin-wizard-error">{errors.groupByField}</span> : null}
                </div>
              </div>
            ) : null}

            {currentStep.key === 'filters' ? (
              <div className="custom-admin-wizard-section">
                <h2>Additional Filters</h2>
                <div className="custom-admin-wizard-filter-grid">
                  <div className="custom-admin-wizard-filter-block">
                    <h3>Stages</h3>
                    <div className="custom-admin-wizard-checkbox-list">
                      {filterOptions.stages.map((stage) => (
                        <label key={stage.key}>
                          <input
                            type="checkbox"
                            checked={draft.filters.stageIn.includes(stage.key)}
                            onChange={() => toggleFilterValue('stageIn', stage.key)}
                          />
                          {stage.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="custom-admin-wizard-filter-block">
                    <h3>Account Source</h3>
                    <div className="custom-admin-wizard-checkbox-list">
                      {filterOptions.accountSources.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.accountSourceIn.includes(value)}
                            onChange={() => toggleFilterValue('accountSourceIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="custom-admin-wizard-filter-block">
                    <h3>Account State</h3>
                    <div className="custom-admin-wizard-checkbox-list">
                      {filterOptions.accountStates.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.accountStateIn.includes(value)}
                            onChange={() => toggleFilterValue('accountStateIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="custom-admin-wizard-filter-block">
                    <h3>Account Owner</h3>
                    <div className="custom-admin-wizard-checkbox-list">
                      {filterOptions.accountOwners.map((value) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            checked={draft.filters.accountOwnerIn.includes(value)}
                            onChange={() => toggleFilterValue('accountOwnerIn', value)}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="custom-admin-wizard-filter-block">
                    <h3>Status</h3>
                    <div className="custom-admin-wizard-checkbox-list">
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

                  <div className="custom-admin-wizard-filter-block">
                    <h3>Presence Rules</h3>
                    <div className="custom-admin-wizard-checkbox-list">
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasEmail}
                          onChange={(event) => updateFilter('hasEmail', event.target.checked)}
                        />
                        Has Email
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.filters.hasPhone}
                          onChange={(event) => updateFilter('hasPhone', event.target.checked)}
                        />
                        Has Phone
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep.key === 'fields' ? (
              <div className="custom-admin-wizard-section">
                <h2>View Fields</h2>
                <div className="custom-admin-wizard-fields-grid">
                  {CUSTOM_VIEW_FIELD_OPTIONS.map((field) => (
                    <label key={field.key} className="custom-admin-wizard-option">
                      <input
                        type="checkbox"
                        checked={draft.visibleColumns.includes(field.key)}
                        disabled={field.key === 'accountNumber'}
                        onChange={() => toggleVisibleField(field.key)}
                      />
                      <div>
                        <strong>{field.label}</strong>
                        <span>{field.key === 'accountNumber' ? 'Always included in every custom view.' : 'Toggle this field for the saved custom view.'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="custom-admin-wizard-preview-panel">
            <h2>{draft.viewType === 'grid' ? 'Grid View' : 'Tabular View'}</h2>
            <div className="custom-admin-wizard-preview-tile">
              <div className="custom-admin-wizard-preview-count">{previewRecords.length}</div>
              <div className="custom-admin-wizard-preview-label">Account</div>
              <div className="custom-admin-wizard-preview-meta">
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
                  <strong>{getCustomViewClassificationLabel(draft.classification)}</strong>
                </div>
                <div>
                  <span>Group By</span>
                  <strong>{getCustomViewGroupByLabel(draft.groupByField)}</strong>
                </div>
              </div>
            </div>

            <div className="custom-admin-wizard-preview-frame">
              {draft.viewType === 'grid' ? (
                <div className="custom-admin-wizard-grid-preview">
                  {previewGroups.length > 0 ? previewGroups.map((group) => (
                    <div key={group.key} className="custom-admin-wizard-grid-preview-column">
                      <div className="custom-admin-wizard-grid-preview-header">
                        <span>{group.label}</span>
                        <strong>({group.count})</strong>
                      </div>

                      <div className="custom-admin-wizard-grid-preview-stack">
                        {group.records.slice(0, 2).map((record) => (
                          <div key={record.id} className="custom-admin-wizard-grid-preview-card">
                            <div className="custom-admin-wizard-grid-preview-avatar">
                              {String(record.name || record.accountNumber || 'A').trim().charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="custom-admin-wizard-grid-preview-content">
                              <strong>{record.name || record.accountNumber}</strong>
                              {selectedColumns.slice(1, 4).map((column) => (
                                <span key={`${record.id}-${column.key}`}>{column.label}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="custom-admin-wizard-preview-empty">Live groups will appear here after records match this view.</div>
                  )}
                </div>
              ) : (
                <div className="custom-admin-wizard-tabular-preview">
                  <div className="custom-admin-wizard-tabular-preview-tabs">
                    {previewGroups.length > 0 ? previewGroups.slice(0, 4).map((group, index) => (
                      <button
                        key={group.key}
                        type="button"
                        className={`custom-admin-wizard-tabular-preview-tab ${index === 0 ? 'custom-admin-wizard-tabular-preview-tab-active' : ''}`}
                      >
                        {group.label}
                      </button>
                    )) : (
                      <button type="button" className="custom-admin-wizard-tabular-preview-tab custom-admin-wizard-tabular-preview-tab-active">
                        {getCustomViewGroupByLabel(draft.groupByField)}
                      </button>
                    )}
                  </div>

                  <div className="custom-admin-wizard-tabular-preview-shell">
                    <table className="custom-admin-wizard-tabular-preview-table">
                      <thead>
                        <tr>
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                        <tr className="custom-admin-wizard-tabular-preview-filter-row">
                          {selectedColumns.slice(0, 5).map((column) => (
                            <th key={`filter-${column.key}`}>
                              <div className="custom-admin-wizard-tabular-preview-filter-box" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(activePreviewGroup?.records || previewRecords).slice(0, 2).map((record) => (
                          <tr key={record.id}>
                            {selectedColumns.slice(0, 5).map((column) => (
                              <td key={`${record.id}-${column.key}`}>{String(record[column.key] || '-')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="custom-admin-wizard-actions">
          <Button variant="outline" onClick={() => navigate('/admin/accounts')}>
            Cancel
          </Button>

          <div className="custom-admin-wizard-actions-right">
            <Button
              variant="outline"
              disabled={currentStepIndex === 0}
              onClick={handleBack}
            >
              Back
            </Button>

            {currentStepIndex < CUSTOM_VIEW_STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave}>
                Save Custom View
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default CustomViewWizardPage
