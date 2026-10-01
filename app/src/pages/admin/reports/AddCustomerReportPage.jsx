import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  CUSTOMER_REPORT_AGGREGATE_OPTIONS,
  CUSTOMER_REPORT_FIELD_OPTIONS,
  CUSTOMER_REPORT_FILTER_FIELD_OPTIONS,
  CUSTOMER_REPORT_FILTER_OPERATOR_OPTIONS,
  CUSTOMER_REPORT_GROUP_BY_OPTIONS,
  CUSTOMER_REPORT_ORDER_BY_OPTIONS,
  CUSTOMER_REPORT_VISIBILITY_OPTIONS,
} from '../../../features/adminReports/customerReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import { generateId } from '../../../utils/helpers'
import ReportOutputPreview from './ReportOutputPreview'
import './AddCustomerReportPage.css'

const buildFilterRow = () => ({
  id: generateId('FLT'),
  field: '',
  operator: 'equals',
  value: '',
})

const initialFormState = {
  entityType: 'Customer',
  runtimePeriodEnabled: false,
  reportName: '',
  visibility: 'Visible to Me Only',
  description: 'Customer Report Template',
  groupBy: '',
  orderBy: '',
  aggregate: '',
  filters: [buildFilterRow()],
  selectedFields: [],
}

const AddCustomerReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [formState, setFormState] = useState(initialFormState)
  const [selectedAvailableField, setSelectedAvailableField] = useState('')
  const [selectedChosenField, setSelectedChosenField] = useState('')
  const [pageError, setPageError] = useState('')

  const availableFields = useMemo(() => (
    CUSTOMER_REPORT_FIELD_OPTIONS.filter((field) => !formState.selectedFields.includes(field.label))
  ), [formState.selectedFields])

  const selectedFieldOptions = useMemo(() => (
    formState.selectedFields.map((label) => (
      CUSTOMER_REPORT_FIELD_OPTIONS.find((field) => field.label === label) || { key: label, label }
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
    <div className="customer-report-builder-page">
      <div className="customer-report-builder-topbar">
        <h1>Add Customer Report</h1>
        <div className="customer-report-builder-topbar-actions">
          <button
            type="button"
            className="customer-report-builder-btn customer-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="customer-report-builder-form"
            className="customer-report-builder-btn customer-report-builder-btn-save"
          >
            Add
          </button>
        </div>
      </div>

      <form id="customer-report-builder-form" className="customer-report-builder-form" onSubmit={handleSubmit}>
        <section className="customer-report-builder-panel">
          <label className="customer-report-builder-checkbox">
            <input
              type="checkbox"
              checked={formState.runtimePeriodEnabled}
              onChange={(event) => setFormState((currentValue) => ({
                ...currentValue,
                runtimePeriodEnabled: event.target.checked,
              }))}
            />
            <span>For a time period ?</span>
          </label>
        </section>

        <section className="customer-report-builder-panel">
          <div className="customer-report-builder-meta-grid">
            <div className="customer-report-builder-field">
              <label>Report Name</label>
              <input
                type="text"
                value={formState.reportName}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, reportName: event.target.value }))}
                placeholder="Enter Report Name"
              />
            </div>
            <div className="customer-report-builder-field">
              <label>Visibility</label>
              <select
                value={formState.visibility}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, visibility: event.target.value }))}
              >
                {CUSTOMER_REPORT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="customer-report-builder-field customer-report-builder-field-full">
              <label>Report Description</label>
              <textarea
                rows={3}
                value={formState.description}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, description: event.target.value }))}
              />
            </div>
            <div className="customer-report-builder-field">
              <label>Group By</label>
              <div className="customer-report-builder-inline-select">
                <select
                  value={formState.groupBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, groupBy: event.target.value }))}
                >
                  {CUSTOMER_REPORT_GROUP_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-group'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="customer-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="customer-report-builder-field">
              <label>Aggregate Sum</label>
              <div className="customer-report-builder-inline-select">
                <select
                  value={formState.aggregate}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, aggregate: event.target.value }))}
                >
                  {CUSTOMER_REPORT_AGGREGATE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-aggregate'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="customer-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="customer-report-builder-field">
              <label>Order By</label>
              <div className="customer-report-builder-inline-select">
                <select
                  value={formState.orderBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, orderBy: event.target.value }))}
                >
                  {CUSTOMER_REPORT_ORDER_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-order'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="customer-report-builder-plus-btn">+</button>
              </div>
            </div>
          </div>
        </section>

        <section className="customer-report-builder-section">
          <div className="customer-report-builder-section-title">Report Filters</div>
          <div className="customer-report-builder-section-body">
            <div className="customer-report-builder-subpanel-title">Configure Filters</div>
            <div className="customer-report-builder-filter-shell">
              <div className="customer-report-builder-filter-caption">Additional Filters</div>
              {formState.filters.map((filter) => (
                <div key={filter.id} className="customer-report-builder-filter-row">
                  <select
                    value={filter.field}
                    onChange={(event) => updateFilter(filter.id, { field: event.target.value })}
                  >
                    {CUSTOMER_REPORT_FILTER_FIELD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty-filter-field'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="customer-report-builder-filter-operator-label">is</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}
                  >
                    {CUSTOMER_REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
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
                  <button type="button" className="customer-report-builder-mini-btn" onClick={addFilterRow}>+</button>
                  <button type="button" className="customer-report-builder-mini-btn customer-report-builder-mini-btn-remove" onClick={() => removeFilterRow(filter.id)}>-</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="customer-report-builder-section">
          <div className="customer-report-builder-section-title">Report Fields</div>
          <div className="customer-report-builder-section-body customer-report-builder-fields-body">
            <div className="customer-report-builder-field-box">
              <div className="customer-report-builder-subpanel-title">Select Fields</div>
              <div className="customer-report-builder-field-list customer-report-builder-field-list-source">
                <div className="customer-report-builder-field-group-title">Customer Attributes</div>
                {availableFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`customer-report-builder-field-item${selectedAvailableField === field.label ? ' customer-report-builder-field-item-active' : ''}`}
                    onClick={() => setSelectedAvailableField(field.label)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="customer-report-builder-field-actions">
              <button type="button" className="customer-report-builder-transfer-btn" onClick={addSelectedField}>&rarr;</button>
              <button type="button" className="customer-report-builder-transfer-btn" onClick={removeSelectedField}>&larr;</button>
            </div>

            <div className="customer-report-builder-field-box">
              <div className="customer-report-builder-subpanel-title">Selected Fields</div>
              <div className="customer-report-builder-field-list">
                {selectedFieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`customer-report-builder-field-item${selectedChosenField === field.label ? ' customer-report-builder-field-item-active' : ''}`}
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
          reportName={formState.reportName || 'Customer Report'}
          selectedFields={formState.selectedFields}
        />

        {pageError && (
          <div className="customer-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default AddCustomerReportPage
