import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  GEO_TRACKING_REPORT_AGGREGATE_OPTIONS,
  GEO_TRACKING_REPORT_CONTEXT_OPTIONS,
  GEO_TRACKING_REPORT_FIELD_GROUPS,
  GEO_TRACKING_REPORT_FIELD_OPTIONS,
  GEO_TRACKING_REPORT_FILTER_FIELD_OPTIONS,
  GEO_TRACKING_REPORT_FILTER_OPERATOR_OPTIONS,
  GEO_TRACKING_REPORT_GROUP_BY_OPTIONS,
  GEO_TRACKING_REPORT_ORDER_BY_OPTIONS,
  GEO_TRACKING_REPORT_VISIBILITY_OPTIONS,
} from '../../../features/adminReports/geoTrackingReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import { generateId } from '../../../utils/helpers'
import ReportOutputPreview from './ReportOutputPreview'
import './AddGeoTrackingReportPage.css'

const buildFilterRow = () => ({
  id: generateId('FLT'),
  field: '',
  operator: 'equals',
  value: '',
})

const initialFormState = {
  entityType: 'Geo Tracking',
  reportContext: GEO_TRACKING_REPORT_CONTEXT_OPTIONS[0]?.value || 'normal',
  runtimePeriodEnabled: false,
  reportName: '',
  visibility: 'Visible to Me Only',
  description: 'Geo Tracking Report Template',
  groupBy: '',
  orderBy: '',
  aggregate: '',
  filters: [buildFilterRow()],
  selectedFields: [],
}

const AddGeoTrackingReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [formState, setFormState] = useState(initialFormState)
  const [selectedAvailableField, setSelectedAvailableField] = useState('')
  const [selectedChosenField, setSelectedChosenField] = useState('')
  const [pageError, setPageError] = useState('')

  const availableFieldsByGroup = useMemo(() => (
    GEO_TRACKING_REPORT_FIELD_GROUPS.map((group) => ({
      ...group,
      fields: group.fields.filter((field) => !formState.selectedFields.includes(field.label)),
    })).filter((group) => group.fields.length > 0)
  ), [formState.selectedFields])

  const selectedFieldOptions = useMemo(() => (
    formState.selectedFields.map((label) => (
      GEO_TRACKING_REPORT_FIELD_OPTIONS.find((field) => field.label === label) || { key: label, label }
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

  const selectNextOption = (fieldKey, options) => {
    setFormState((currentValue) => {
      const selectableOptions = options.filter((option) => option.value)
      if (selectableOptions.length === 0) return currentValue

      const currentIndex = selectableOptions.findIndex((option) => option.value === currentValue[fieldKey])
      const nextOption = selectableOptions[(currentIndex + 1) % selectableOptions.length]

      return {
        ...currentValue,
        [fieldKey]: nextOption.value,
      }
    })
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
      setPageError('Select at least one geo tracking field.')
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
      entityType: 'Geo Tracking',
      typeLabel: 'Geo Tracking',
      categoryKey: 'geo_tracking',
      reportContext: formState.reportContext,
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
    <div className="geo-report-builder-page">
      <div className="geo-report-builder-topbar">
        <h1>Add Geo Tracking Report</h1>
        <div className="geo-report-builder-topbar-actions">
          <button
            type="button"
            className="geo-report-builder-btn geo-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="geo-report-builder-form"
            className="geo-report-builder-btn geo-report-builder-btn-save"
          >
            Add
          </button>
        </div>
      </div>

      <form id="geo-report-builder-form" className="geo-report-builder-form" onSubmit={handleSubmit}>
        <section className="geo-report-builder-panel">
          <div className="geo-report-builder-row-inline">
            <label htmlFor="geo-report-context">Report Context</label>
            <select
              id="geo-report-context"
              value={formState.reportContext}
              onChange={(event) => setFormState((currentValue) => ({
                ...currentValue,
                reportContext: event.target.value,
              }))}
            >
              {GEO_TRACKING_REPORT_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="geo-report-builder-panel">
          <label className="geo-report-builder-checkbox">
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

        <section className="geo-report-builder-panel">
          <div className="geo-report-builder-meta-grid">
            <div className="geo-report-builder-field">
              <label>Report Name</label>
              <input
                type="text"
                value={formState.reportName}
                onChange={(event) => setFormState((currentValue) => ({
                  ...currentValue,
                  reportName: event.target.value,
                }))}
                placeholder="Enter Report Name"
              />
            </div>
            <div className="geo-report-builder-field">
              <label>Visibility</label>
              <select
                value={formState.visibility}
                onChange={(event) => setFormState((currentValue) => ({
                  ...currentValue,
                  visibility: event.target.value,
                }))}
              >
                {GEO_TRACKING_REPORT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="geo-report-builder-field geo-report-builder-field-full">
              <label>Report Description</label>
              <textarea
                rows={3}
                value={formState.description}
                onChange={(event) => setFormState((currentValue) => ({
                  ...currentValue,
                  description: event.target.value,
                }))}
              />
            </div>
            <div className="geo-report-builder-field">
              <label>Group By</label>
              <div className="geo-report-builder-inline-select">
                <select
                  value={formState.groupBy}
                  onChange={(event) => setFormState((currentValue) => ({
                    ...currentValue,
                    groupBy: event.target.value,
                  }))}
                >
                  {GEO_TRACKING_REPORT_GROUP_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-group'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="geo-report-builder-plus-btn"
                  onClick={() => selectNextOption('groupBy', GEO_TRACKING_REPORT_GROUP_BY_OPTIONS)}
                  title="Select next group by field"
                >
                  +
                </button>
              </div>
            </div>
            <div className="geo-report-builder-field">
              <label>Aggregate Sum</label>
              <div className="geo-report-builder-inline-select">
                <select
                  value={formState.aggregate}
                  onChange={(event) => setFormState((currentValue) => ({
                    ...currentValue,
                    aggregate: event.target.value,
                  }))}
                >
                  {GEO_TRACKING_REPORT_AGGREGATE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-aggregate'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="geo-report-builder-plus-btn"
                  onClick={() => selectNextOption('aggregate', GEO_TRACKING_REPORT_AGGREGATE_OPTIONS)}
                  title="Select next aggregate field"
                >
                  +
                </button>
              </div>
            </div>
            <div className="geo-report-builder-field">
              <label>Order By</label>
              <div className="geo-report-builder-inline-select">
                <select
                  value={formState.orderBy}
                  onChange={(event) => setFormState((currentValue) => ({
                    ...currentValue,
                    orderBy: event.target.value,
                  }))}
                >
                  {GEO_TRACKING_REPORT_ORDER_BY_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-order'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="geo-report-builder-plus-btn"
                  onClick={() => selectNextOption('orderBy', GEO_TRACKING_REPORT_ORDER_BY_OPTIONS)}
                  title="Select next order by field"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="geo-report-builder-section">
          <div className="geo-report-builder-section-title">Report Filters</div>
          <div className="geo-report-builder-section-body">
            <div className="geo-report-builder-subpanel-title">Additional Filter</div>
            <div className="geo-report-builder-filter-shell">
              {formState.filters.map((filter) => (
                <div key={filter.id} className="geo-report-builder-filter-row">
                  <select
                    value={filter.field}
                    onChange={(event) => updateFilter(filter.id, { field: event.target.value })}
                  >
                    {GEO_TRACKING_REPORT_FILTER_FIELD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty-filter-field'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="geo-report-builder-filter-operator-label">is</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}
                  >
                    {GEO_TRACKING_REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
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
                  <button type="button" className="geo-report-builder-mini-btn" onClick={addFilterRow}>+</button>
                  <button
                    type="button"
                    className="geo-report-builder-mini-btn geo-report-builder-mini-btn-remove"
                    onClick={() => removeFilterRow(filter.id)}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="geo-report-builder-section">
          <div className="geo-report-builder-section-title">Geo Tracking Attributes</div>
          <div className="geo-report-builder-section-body geo-report-builder-fields-body">
            <div className="geo-report-builder-field-box">
              <div className="geo-report-builder-subpanel-title">Geo Tracking Attributes</div>
              <div className="geo-report-builder-field-list geo-report-builder-field-list-source">
                {availableFieldsByGroup.map((group) => (
                  <div key={group.title} className="geo-report-builder-field-group">
                    <div className="geo-report-builder-field-group-title">{group.title}</div>
                    {group.fields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className={`geo-report-builder-field-item${selectedAvailableField === field.label ? ' geo-report-builder-field-item-active' : ''}`}
                        onClick={() => setSelectedAvailableField(field.label)}
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="geo-report-builder-field-actions">
              <button type="button" className="geo-report-builder-transfer-btn" onClick={addSelectedField}>&rarr;</button>
              <button type="button" className="geo-report-builder-transfer-btn" onClick={removeSelectedField}>&larr;</button>
            </div>

            <div className="geo-report-builder-field-box">
              <div className="geo-report-builder-subpanel-title">Selected Fields</div>
              <div className="geo-report-builder-field-list">
                {selectedFieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`geo-report-builder-field-item${selectedChosenField === field.label ? ' geo-report-builder-field-item-active' : ''}`}
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
          reportName={formState.reportName || 'Geo Tracking Report'}
          selectedFields={formState.selectedFields}
        />

        {pageError && (
          <div className="geo-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default AddGeoTrackingReportPage
