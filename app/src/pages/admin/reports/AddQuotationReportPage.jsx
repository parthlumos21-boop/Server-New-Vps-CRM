import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  QUOTATION_REPORT_AGGREGATE_OPTIONS,
  QUOTATION_REPORT_CONTEXT_OPTIONS,
  QUOTATION_REPORT_FILTER_OPERATOR_OPTIONS,
  getQuotationReportFieldGroups,
  getQuotationReportFieldOptions,
  getQuotationReportFilterFieldOptions,
  getQuotationReportGroupByOptions,
  getQuotationReportOrderByOptions,
} from '../../../features/adminReports/quotationReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import { generateId } from '../../../utils/helpers'
import ReportOutputPreview from './ReportOutputPreview'
import './AddQuotationReportPage.css'

const buildFilterRow = () => ({
  id: generateId('FLT'),
  field: '',
  operator: 'equals',
  value: '',
})

const initialFormState = {
  reportContext: '',
  saveAsTemplate: false,
  runtimePeriodEnabled: false,
  groupBy: '',
  orderBy: '',
  aggregate: '',
  filters: [buildFilterRow()],
  selectedFields: [],
}

const AddQuotationReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [formState, setFormState] = useState(initialFormState)
  const [selectedAvailableField, setSelectedAvailableField] = useState('')
  const [selectedChosenField, setSelectedChosenField] = useState('')
  const [pageError, setPageError] = useState('')

  const selectedContext = useMemo(() => (
    QUOTATION_REPORT_CONTEXT_OPTIONS.find((option) => option.value === formState.reportContext) || null
  ), [formState.reportContext])

  // Field groups and option lists depend on the chosen context (Account vs Deal).
  const contextValue = formState.reportContext || 'account'
  const fieldGroups = useMemo(() => getQuotationReportFieldGroups(contextValue), [contextValue])
  const fieldOptions = useMemo(() => getQuotationReportFieldOptions(contextValue), [contextValue])
  const filterFieldOptions = useMemo(() => getQuotationReportFilterFieldOptions(contextValue), [contextValue])
  const groupByOptions = useMemo(() => getQuotationReportGroupByOptions(contextValue), [contextValue])
  const orderByOptions = useMemo(() => getQuotationReportOrderByOptions(contextValue), [contextValue])

  const availableFieldsByGroup = useMemo(() => (
    fieldGroups.map((group) => ({
      ...group,
      fields: group.fields.filter((field) => !formState.selectedFields.includes(field.label)),
    })).filter((group) => group.fields.length > 0)
  ), [fieldGroups, formState.selectedFields])

  const selectedFieldOptions = useMemo(() => (
    formState.selectedFields.map((label) => (
      fieldOptions.find((field) => field.label === label) || { key: label, label }
    ))
  ), [fieldOptions, formState.selectedFields])

  const handleContextChange = (nextContext) => {
    setSelectedAvailableField('')
    setSelectedChosenField('')
    setFormState((currentValue) => ({
      ...currentValue,
      reportContext: nextContext,
      groupBy: '',
      orderBy: '',
      selectedFields: [],
      filters: [buildFilterRow()],
    }))
  }

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

    if (!selectedContext) {
      setPageError('Select the report context.')
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
      entityType: 'Quotation',
      typeLabel: 'Quotation',
      categoryKey: 'quotation',
      reportContext: selectedContext.value,
      reportName: selectedContext.reportName,
      description: selectedContext.description,
      visibility: formState.saveAsTemplate ? 'All' : 'Visible to Me Only',
      isTemplate: formState.saveAsTemplate,
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
    <div className="quotation-report-builder-page">
      <div className="quotation-report-builder-topbar">
        <h1>Generate Quotation Report</h1>
        <div className="quotation-report-builder-topbar-actions">
          <button
            type="button"
            className="quotation-report-builder-btn quotation-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="quotation-report-builder-form"
            className="quotation-report-builder-btn quotation-report-builder-btn-save"
          >
            Generate
          </button>
        </div>
      </div>

      <form id="quotation-report-builder-form" className="quotation-report-builder-form" onSubmit={handleSubmit}>
        <label className="quotation-report-builder-save-template">
          <input
            type="checkbox"
            checked={formState.saveAsTemplate}
            onChange={(event) => setFormState((currentValue) => ({ ...currentValue, saveAsTemplate: event.target.checked }))}
          />
          <span>Save as Template</span>
        </label>

        <section className="quotation-report-builder-panel">
          <div className="quotation-report-builder-row-inline">
            <label htmlFor="quotation-report-context">Report Context</label>
            <select
              id="quotation-report-context"
              value={formState.reportContext}
              onChange={(event) => handleContextChange(event.target.value)}
            >
              <option value="">Select</option>
              {QUOTATION_REPORT_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="quotation-report-builder-panel">
          <div className="quotation-report-builder-row-inline">
            <label>For a time period ?</label>
            <button
              type="button"
              className={`quotation-report-builder-toggle${formState.runtimePeriodEnabled ? ' quotation-report-builder-toggle-on' : ''}`}
              onClick={() => setFormState((currentValue) => ({ ...currentValue, runtimePeriodEnabled: !currentValue.runtimePeriodEnabled }))}
              aria-pressed={formState.runtimePeriodEnabled}
            >
              {formState.runtimePeriodEnabled ? 'YES' : 'NO'}
            </button>
          </div>
        </section>

        <section className="quotation-report-builder-section">
          <div className="quotation-report-builder-section-title">Report Filters</div>
          <div className="quotation-report-builder-section-body">
            <div className="quotation-report-builder-subpanel-title">Configure Filters</div>
            <div className="quotation-report-builder-filter-shell">
              <div className="quotation-report-builder-filter-caption">Additional Filters</div>
              {formState.filters.map((filter) => (
                <div key={filter.id} className="quotation-report-builder-filter-row">
                  <span className="quotation-report-builder-filter-operator-label">If</span>
                  <select
                    value={filter.field}
                    onChange={(event) => updateFilter(filter.id, { field: event.target.value })}
                  >
                    {filterFieldOptions.map((option) => (
                      <option key={option.value || 'empty-filter-field'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="quotation-report-builder-filter-operator-label">is</span>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}
                  >
                    {QUOTATION_REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
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
                  <button type="button" className="quotation-report-builder-mini-btn" onClick={addFilterRow}>+</button>
                  <button
                    type="button"
                    className="quotation-report-builder-mini-btn quotation-report-builder-mini-btn-remove"
                    onClick={() => removeFilterRow(filter.id)}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>

            <div className="quotation-report-builder-meta-grid">
              <div className="quotation-report-builder-field">
                <label>Group By</label>
                <div className="quotation-report-builder-inline-select">
                  <select
                    value={formState.groupBy}
                    onChange={(event) => setFormState((currentValue) => ({ ...currentValue, groupBy: event.target.value }))}
                  >
                    {groupByOptions.map((option) => (
                      <option key={option.value || 'empty-group'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" className="quotation-report-builder-plus-btn">+</button>
                </div>
              </div>
              <div className="quotation-report-builder-field">
                <label>Aggregate Sum</label>
                <div className="quotation-report-builder-inline-select">
                  <select
                    value={formState.aggregate}
                    onChange={(event) => setFormState((currentValue) => ({ ...currentValue, aggregate: event.target.value }))}
                  >
                    {QUOTATION_REPORT_AGGREGATE_OPTIONS.map((option) => (
                      <option key={option.value || 'empty-aggregate'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" className="quotation-report-builder-plus-btn">+</button>
                </div>
              </div>
              <div className="quotation-report-builder-field">
                <label>Order By</label>
                <div className="quotation-report-builder-inline-select">
                  <select
                    value={formState.orderBy}
                    onChange={(event) => setFormState((currentValue) => ({ ...currentValue, orderBy: event.target.value }))}
                  >
                    {orderByOptions.map((option) => (
                      <option key={option.value || 'empty-order'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" className="quotation-report-builder-plus-btn">+</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="quotation-report-builder-section">
          <div className="quotation-report-builder-section-title">Report Fields</div>
          <div className="quotation-report-builder-section-body quotation-report-builder-fields-body">
            <div className="quotation-report-builder-field-box">
              <div className="quotation-report-builder-subpanel-title">Quotation Attributes</div>
              <div className="quotation-report-builder-field-list quotation-report-builder-field-list-source">
                {availableFieldsByGroup.map((group) => (
                  <div key={group.title} className="quotation-report-builder-field-group">
                    <div className="quotation-report-builder-field-group-title">{group.title}</div>
                    {group.fields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className={`quotation-report-builder-field-item${selectedAvailableField === field.label ? ' quotation-report-builder-field-item-active' : ''}`}
                        onClick={() => setSelectedAvailableField(field.label)}
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="quotation-report-builder-field-actions">
              <button type="button" className="quotation-report-builder-transfer-btn" onClick={addSelectedField}>&rarr;</button>
              <button type="button" className="quotation-report-builder-transfer-btn" onClick={removeSelectedField}>&larr;</button>
            </div>

            <div className="quotation-report-builder-field-box">
              <div className="quotation-report-builder-subpanel-title">Selected Fields</div>
              <div className="quotation-report-builder-field-list">
                {selectedFieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`quotation-report-builder-field-item${selectedChosenField === field.label ? ' quotation-report-builder-field-item-active' : ''}`}
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
          reportName={formState.reportName || 'Quotation Report'}
          selectedFields={formState.selectedFields}
        />

        {pageError && (
          <div className="quotation-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default AddQuotationReportPage
