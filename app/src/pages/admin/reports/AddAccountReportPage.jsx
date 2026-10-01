import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ACCOUNT_REPORT_AGGREGATE_OPTIONS,
  ACCOUNT_REPORT_CONTEXT_OPTIONS,
  ACCOUNT_REPORT_FIELD_OPTIONS,
  ACCOUNT_REPORT_FILTER_FIELD_OPTIONS,
  ACCOUNT_REPORT_FILTER_OPERATOR_OPTIONS,
  ACCOUNT_REPORT_GROUP_BY_OPTIONS,
  ACCOUNT_REPORT_ORDER_BY_OPTIONS,
  ACCOUNT_REPORT_VISIBILITY_OPTIONS,
} from '../../../features/adminReports/accountReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import { generateId } from '../../../utils/helpers'
import { useAuth } from '../../../context/AuthContext'
import ReportOutputPreview from './ReportOutputPreview'
import './AddAccountReportPage.css'

const buildFilterRow = () => ({
  id: generateId('FLT'),
  field: '',
  operator: 'equals',
  value: '',
})

const initialFormState = {
  entityType: 'Account',
  runtimePeriodEnabled: false,
  reportName: '',
  visibility: 'Visible to Me Only',
  description: 'Account Report Template',
  groupBy: '',
  orderBy: '',
  aggregate: '',
  filters: [buildFilterRow()],
  selectedFields: [],
}

const AddAccountReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [formState, setFormState] = useState(initialFormState)
  const [selectedAvailableField, setSelectedAvailableField] = useState('')
  const [selectedChosenField, setSelectedChosenField] = useState('')
  const [pageError, setPageError] = useState('')

  const availableFields = useMemo(() => (
    ACCOUNT_REPORT_FIELD_OPTIONS.filter((field) => !formState.selectedFields.includes(field.label))
  ), [formState.selectedFields])

  const selectedFieldOptions = useMemo(() => (
    formState.selectedFields.map((label) => (
      ACCOUNT_REPORT_FIELD_OPTIONS.find((field) => field.label === label) || { key: label, label }
    ))
  ), [formState.selectedFields])

  const updateFilter = (filterId, updates) => {
    setFormState((currentValue) => ({
      ...currentValue,
      filters: currentValue.filters.map((filter) => (
        filter.id === filterId ? { ...filter, ...updates } : filter
      )),
    }))
  }

  const addFilterRow = () => {
    setFormState((currentValue) => ({
      ...currentValue,
      filters: [...currentValue.filters, buildFilterRow()],
    }))
  }

  const removeFilterRow = (filterId) => {
    setFormState((currentValue) => {
      const nextFilters = currentValue.filters.filter((filter) => filter.id !== filterId)
      return {
        ...currentValue,
        filters: nextFilters.length > 0 ? nextFilters : [buildFilterRow()],
      }
    })
  }

  const addSelectedField = () => {
    if (!selectedAvailableField) return

    setFormState((currentValue) => ({
      ...currentValue,
      selectedFields: currentValue.selectedFields.includes(selectedAvailableField)
        ? currentValue.selectedFields
        : [...currentValue.selectedFields, selectedAvailableField],
    }))
    setSelectedAvailableField('')
  }

  const removeSelectedField = () => {
    if (!selectedChosenField) return

    setFormState((currentValue) => ({
      ...currentValue,
      selectedFields: currentValue.selectedFields.filter((field) => field !== selectedChosenField),
    }))
    setSelectedChosenField('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setPageError('')

    if (!formState.reportName.trim()) {
      setPageError('Report name is required.')
      return
    }

    if (formState.selectedFields.length === 0) {
      setPageError('Select at least one report field.')
      return
    }

    const cleanedFilters = formState.filters
      .map((filter) => ({
        ...filter,
        field: filter.field.trim(),
        operator: filter.operator.trim(),
        value: filter.value.trim(),
      }))
      .filter((filter) => filter.field)

    saveAdminReportTemplate({
      entityType: formState.entityType,
      reportName: formState.reportName.trim(),
      description: formState.description.trim(),
      visibility: formState.visibility,
      runtimePeriodEnabled: formState.runtimePeriodEnabled,
      groupBy: formState.groupBy,
      orderBy: formState.orderBy,
      aggregate: formState.aggregate,
      filters: cleanedFilters,
      selectedFields: formState.selectedFields,
      createdBy: user?.name || 'System Administrator',
      createdOn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    navigate(reportListPath)
  }

  return (
    <div className="account-report-builder-page">
      <div className="account-report-builder-topbar">
        <h1>Add Account Report</h1>
        <div className="account-report-builder-topbar-actions">
          <button
            type="button"
            className="account-report-builder-btn account-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="account-report-builder-form"
            className="account-report-builder-btn account-report-builder-btn-save"
          >
            Add
          </button>
        </div>
      </div>

      <form id="account-report-builder-form" className="account-report-builder-form" onSubmit={handleSubmit}>
        <section className="account-report-builder-panel">
          <div className="account-report-builder-row-inline">
            <label>Report Context</label>
            <select
              value={formState.entityType.toLowerCase()}
              onChange={(event) => setFormState((currentValue) => ({
                ...currentValue,
                entityType: event.target.value === 'account' ? 'Account' : currentValue.entityType,
              }))}
            >
              {ACCOUNT_REPORT_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="account-report-builder-panel">
          <label className="account-report-builder-checkbox">
            <input
              type="checkbox"
              checked={formState.runtimePeriodEnabled}
              onChange={(event) => setFormState((currentValue) => ({
                ...currentValue,
                runtimePeriodEnabled: event.target.checked,
              }))}
            />
            <span>Run at time period ?</span>
          </label>
        </section>

        <section className="account-report-builder-panel">
          <div className="account-report-builder-meta-grid">
            <div className="account-report-builder-field">
              <label>Report Name</label>
              <input
                type="text"
                value={formState.reportName}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, reportName: event.target.value }))}
                placeholder="Enter Report Name"
              />
            </div>
            <div className="account-report-builder-field">
              <label>Visibility</label>
              <select
                value={formState.visibility}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, visibility: event.target.value }))}
              >
                {ACCOUNT_REPORT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="account-report-builder-field account-report-builder-field-full">
              <label>Report Description</label>
              <textarea
                rows={3}
                value={formState.description}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, description: event.target.value }))}
              />
            </div>
            <div className="account-report-builder-field">
              <label>Group By</label>
              <div className="account-report-builder-inline-select">
                <select
                  value={formState.groupBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, groupBy: event.target.value }))}
                >
                  {ACCOUNT_REPORT_GROUP_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-group'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="account-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="account-report-builder-field">
              <label>Aggregate using</label>
              <div className="account-report-builder-inline-select">
                <select
                  value={formState.aggregate}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, aggregate: event.target.value }))}
                >
                  {ACCOUNT_REPORT_AGGREGATE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-aggregate'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="account-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="account-report-builder-field">
              <label>Order By</label>
              <div className="account-report-builder-inline-select">
                <select
                  value={formState.orderBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, orderBy: event.target.value }))}
                >
                  {ACCOUNT_REPORT_ORDER_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-order'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="account-report-builder-plus-btn">+</button>
              </div>
            </div>
          </div>
        </section>

        <section className="account-report-builder-section">
          <div className="account-report-builder-section-title">Report Filters</div>
          <div className="account-report-builder-section-body">
            <div className="account-report-builder-subpanel-title">Configure Filters</div>
            <div className="account-report-builder-filter-shell">
              <div className="account-report-builder-filter-caption">Additional Filters</div>
              {formState.filters.map((filter) => (
                <div key={filter.id} className="account-report-builder-filter-row">
                  <select
                    value={filter.field}
                    onChange={(event) => updateFilter(filter.id, { field: event.target.value })}
                  >
                    {ACCOUNT_REPORT_FILTER_FIELD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty-filter-field'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="account-report-builder-filter-operator-label">opt</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}
                  >
                    {ACCOUNT_REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
                    placeholder="Value"
                    disabled={filter.operator === 'is_empty' || filter.operator === 'is_not_empty'}
                  />
                  <button type="button" className="account-report-builder-mini-btn" onClick={addFilterRow}>+</button>
                  <button type="button" className="account-report-builder-mini-btn account-report-builder-mini-btn-remove" onClick={() => removeFilterRow(filter.id)}>-</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="account-report-builder-section">
          <div className="account-report-builder-section-title">Report Fields</div>
          <div className="account-report-builder-section-body account-report-builder-fields-body">
            <div className="account-report-builder-field-box">
              <div className="account-report-builder-subpanel-title">Select Fields</div>
              <div className="account-report-builder-field-list account-report-builder-field-list-source">
                {availableFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`account-report-builder-field-item${selectedAvailableField === field.label ? ' account-report-builder-field-item-active' : ''}`}
                    onClick={() => setSelectedAvailableField(field.label)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="account-report-builder-field-actions">
              <button type="button" className="account-report-builder-transfer-btn" onClick={addSelectedField}>&rarr;</button>
              <button type="button" className="account-report-builder-transfer-btn" onClick={removeSelectedField}>&larr;</button>
            </div>

            <div className="account-report-builder-field-box">
              <div className="account-report-builder-subpanel-title">Selected Fields</div>
              <div className="account-report-builder-field-list">
                {selectedFieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`account-report-builder-field-item${selectedChosenField === field.label ? ' account-report-builder-field-item-active' : ''}`}
                    onClick={() => setSelectedChosenField(field.label)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ReportOutputPreview
          reportName={formState.reportName || 'Account Report'}
          selectedFields={formState.selectedFields}
        />

        {pageError && (
          <div className="account-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default AddAccountReportPage
