import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  SUPPORT_REQUEST_REPORT_AGGREGATE_OPTIONS,
  SUPPORT_REQUEST_REPORT_FIELD_GROUPS,
  SUPPORT_REQUEST_REPORT_FIELD_OPTIONS,
  SUPPORT_REQUEST_REPORT_FILTER_FIELD_OPTIONS,
  SUPPORT_REQUEST_REPORT_FILTER_OPERATOR_OPTIONS,
  SUPPORT_REQUEST_REPORT_GROUP_BY_OPTIONS,
  SUPPORT_REQUEST_REPORT_ORDER_BY_OPTIONS,
  SUPPORT_REQUEST_REPORT_VISIBILITY_OPTIONS,
} from '../../../features/adminReports/supportRequestReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import { generateId } from '../../../utils/helpers'
import ReportOutputPreview from './ReportOutputPreview'
import './AddSupportRequestReportPage.css'

const buildFilterRow = (overrides = {}) => ({
  id: generateId('FLT'),
  field: '',
  operator: 'equals',
  value: '',
  ...overrides,
})

const buildInitialState = ({
  entityType,
  defaultDescription,
  defaultFilters,
  defaultOrderBy,
}) => ({
  entityType,
  runtimePeriodEnabled: false,
  reportName: '',
  visibility: 'Visible to Me Only',
  description: defaultDescription,
  groupBy: '',
  orderBy: defaultOrderBy,
  aggregate: '',
  filters: defaultFilters.length > 0 ? defaultFilters.map((filter) => buildFilterRow(filter)) : [buildFilterRow()],
  selectedFields: [],
})

const SupportRequestReportBuilder = ({
  title,
  entityType = 'SR',
  typeLabel = 'SR',
  categoryKey = 'sr',
  templateVariant = 'open',
  defaultDescription = 'Support Request Report Template',
  defaultFilters = [],
  defaultOrderBy = '',
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [formState, setFormState] = useState(() => buildInitialState({
    entityType,
    defaultDescription,
    defaultFilters,
    defaultOrderBy,
  }))
  const [selectedAvailableField, setSelectedAvailableField] = useState('')
  const [selectedChosenField, setSelectedChosenField] = useState('')
  const [pageError, setPageError] = useState('')

  const availableFieldsByGroup = useMemo(() => (
    SUPPORT_REQUEST_REPORT_FIELD_GROUPS.map((group) => ({
      ...group,
      fields: group.fields.filter((field) => !formState.selectedFields.includes(field.label)),
    })).filter((group) => group.fields.length > 0)
  ), [formState.selectedFields])

  const selectedFieldOptions = useMemo(() => (
    formState.selectedFields.map((label) => (
      SUPPORT_REQUEST_REPORT_FIELD_OPTIONS.find((field) => field.label === label) || { key: label, label }
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
    if (!selectedAvailableField) {
      return
    }

    setFormState((currentValue) => ({
      ...currentValue,
      selectedFields: currentValue.selectedFields.includes(selectedAvailableField)
        ? currentValue.selectedFields
        : [...currentValue.selectedFields, selectedAvailableField],
    }))
    setSelectedAvailableField('')
  }

  const removeSelectedField = () => {
    if (!selectedChosenField) {
      return
    }

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
      typeLabel,
      categoryKey,
      templateVariant,
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
    <div className="support-request-report-builder-page">
      <div className="support-request-report-builder-topbar">
        <h1>{title}</h1>
        <div className="support-request-report-builder-topbar-actions">
          <button
            type="button"
            className="support-request-report-builder-btn support-request-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="support-request-report-builder-form"
            className="support-request-report-builder-btn support-request-report-builder-btn-save"
          >
            Add
          </button>
        </div>
      </div>

      <form
        id="support-request-report-builder-form"
        className="support-request-report-builder-form"
        onSubmit={handleSubmit}
      >
        <section className="support-request-report-builder-panel">
          <div className="support-request-report-builder-meta-grid">
            <div className="support-request-report-builder-field">
              <label>Report Name</label>
              <input
                type="text"
                value={formState.reportName}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, reportName: event.target.value }))}
                placeholder="Enter Report Name"
              />
            </div>
            <div className="support-request-report-builder-field">
              <label>Visibility</label>
              <select
                value={formState.visibility}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, visibility: event.target.value }))}
              >
                {SUPPORT_REQUEST_REPORT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="support-request-report-builder-field support-request-report-builder-field-full">
              <label>Report Description</label>
              <textarea
                rows={3}
                value={formState.description}
                onChange={(event) => setFormState((currentValue) => ({ ...currentValue, description: event.target.value }))}
              />
            </div>
            <div className="support-request-report-builder-field">
              <label>Group By</label>
              <div className="support-request-report-builder-inline-select">
                <select
                  value={formState.groupBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, groupBy: event.target.value }))}
                >
                  {SUPPORT_REQUEST_REPORT_GROUP_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-group'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="support-request-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="support-request-report-builder-field">
              <label>Aggregate Sum</label>
              <div className="support-request-report-builder-inline-select">
                <select
                  value={formState.aggregate}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, aggregate: event.target.value }))}
                >
                  {SUPPORT_REQUEST_REPORT_AGGREGATE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-aggregate'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="support-request-report-builder-plus-btn">+</button>
              </div>
            </div>
            <div className="support-request-report-builder-field">
              <label>Order By</label>
              <div className="support-request-report-builder-inline-select">
                <select
                  value={formState.orderBy}
                  onChange={(event) => setFormState((currentValue) => ({ ...currentValue, orderBy: event.target.value }))}
                >
                  {SUPPORT_REQUEST_REPORT_ORDER_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-order'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" className="support-request-report-builder-plus-btn">+</button>
              </div>
            </div>
          </div>
        </section>

        <section className="support-request-report-builder-section">
          <div className="support-request-report-builder-section-title">Report Filters</div>
          <div className="support-request-report-builder-section-body">
            <div className="support-request-report-builder-subpanel-title">Configure Filters</div>
            <div className="support-request-report-builder-filter-shell">
              <div className="support-request-report-builder-filter-caption">Additional Filters</div>
              {formState.filters.map((filter) => (
                <div key={filter.id} className="support-request-report-builder-filter-row">
                  <select
                    value={filter.field}
                    onChange={(event) => updateFilter(filter.id, { field: event.target.value })}
                  >
                    {SUPPORT_REQUEST_REPORT_FILTER_FIELD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty-filter-field'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="support-request-report-builder-filter-operator-label">is</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}
                  >
                    {SUPPORT_REQUEST_REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
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
                  <button type="button" className="support-request-report-builder-mini-btn" onClick={addFilterRow}>+</button>
                  <button
                    type="button"
                    className="support-request-report-builder-mini-btn support-request-report-builder-mini-btn-remove"
                    onClick={() => removeFilterRow(filter.id)}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="support-request-report-builder-section">
          <div className="support-request-report-builder-section-title">Report Fields</div>
          <div className="support-request-report-builder-section-body support-request-report-builder-fields-body">
            <div className="support-request-report-builder-field-box">
              <div className="support-request-report-builder-subpanel-title">Select Fields</div>
              <div className="support-request-report-builder-field-list support-request-report-builder-field-list-source">
                {availableFieldsByGroup.map((group) => (
                  <div key={group.title} className="support-request-report-builder-field-group">
                    <div className="support-request-report-builder-field-group-title">{group.title}</div>
                    {group.fields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className={`support-request-report-builder-field-item${selectedAvailableField === field.label ? ' support-request-report-builder-field-item-active' : ''}`}
                        onClick={() => setSelectedAvailableField(field.label)}
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="support-request-report-builder-field-actions">
              <button type="button" className="support-request-report-builder-transfer-btn" onClick={addSelectedField}>&rarr;</button>
              <button type="button" className="support-request-report-builder-transfer-btn" onClick={removeSelectedField}>&larr;</button>
            </div>

            <div className="support-request-report-builder-field-box">
              <div className="support-request-report-builder-subpanel-title">Selected Fields</div>
              <div className="support-request-report-builder-field-list">
                {selectedFieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`support-request-report-builder-field-item${selectedChosenField === field.label ? ' support-request-report-builder-field-item-active' : ''}`}
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
          reportName={formState.reportName || title}
          selectedFields={formState.selectedFields}
        />

        {pageError && (
          <div className="support-request-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default SupportRequestReportBuilder
